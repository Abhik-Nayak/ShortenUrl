# ShortenUrl — CI/CD Automated Deployment Guide

## Architecture

```
GitHub (push to main)
   |
GitHub Actions
   |
   +-- Build Docker Images
   +-- Push to Amazon ECR
   +-- SSH into EC2 → Pull & Restart
   +-- Create AMI
   +-- Update Launch Template
   +-- ASG Instance Refresh
   |
   v
Internet
   |
ALB (port 80) --- ALB-SG
   |
Target Group (/api/health)
   |
+----------+  +----------+
|  EC2-1   |  |  EC2-2   |  --- EC2-SG (Auto Scaling: min 2, max 4)
|  Docker  |  |  Docker  |
+-----+----+  +-----+----+
      +--------+----+
               |
        RDS PostgreSQL --- DB-SG
```

## Prerequisites

- AWS Account with CLI configured
- GitHub repository
- Docker installed locally
- SSH key pair (.pem file)

## One-Time Setup

### Step 1 — Create ECR Repositories

```bash
aws ecr create-repository --repository-name shortenurl-server --region ap-south-1
aws ecr create-repository --repository-name shortenurl-client --region ap-south-1
```

### Step 2 — Create IAM User for GitHub Actions

```bash
aws iam create-user --user-name github-actions-deployer

aws iam attach-user-policy --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-user-policy --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AutoScalingFullAccess

aws iam attach-user-policy --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam create-access-key --user-name github-actions-deployer
```

Save the Access Key ID and Secret Access Key.

### Step 3 — Add GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret Name              | Value                              |
|--------------------------|------------------------------------|
| `AWS_ACCESS_KEY_ID`      | IAM user access key ID             |
| `AWS_SECRET_ACCESS_KEY`  | IAM user secret access key         |
| `EC2_SSH_KEY`            | Contents of your .pem file         |
| `DATABASE_URL`           | RDS PostgreSQL connection string   |
| `JWT_SECRET`             | Your JWT secret key                |

### Step 4 — Create Security Groups

```bash
# ALB-SG: HTTP/HTTPS from internet
aws ec2 create-security-group --group-name ALB-SG \
  --description "ALB Security Group" --vpc-id <vpc-id> --region ap-south-1

aws ec2 authorize-security-group-ingress --group-id <alb-sg-id> --region ap-south-1 \
  --ip-permissions \
    "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]" \
    "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]"

# EC2-SG: traffic from ALB + SSH from your IP
aws ec2 create-security-group --group-name EC2-SG \
  --description "EC2 Security Group" --vpc-id <vpc-id> --region ap-south-1

aws ec2 authorize-security-group-ingress --group-id <ec2-sg-id> --region ap-south-1 \
  --ip-permissions \
    "IpProtocol=tcp,FromPort=80,ToPort=80,UserIdGroupPairs=[{GroupId=<alb-sg-id>}]" \
    "IpProtocol=tcp,FromPort=5000,ToPort=5000,UserIdGroupPairs=[{GroupId=<alb-sg-id>}]" \
    "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=<your-ip>/32}]"

# DB-SG: PostgreSQL from EC2 only
aws ec2 create-security-group --group-name DB-SG \
  --description "DB Security Group" --vpc-id <vpc-id> --region ap-south-1

aws ec2 authorize-security-group-ingress --group-id <db-sg-id> --region ap-south-1 \
  --ip-permissions \
    "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=<ec2-sg-id>}]"
```

### Step 5 — Create RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier shortenurl-db \
  --db-instance-class db.t3.micro \
  --engine postgres --engine-version 15 \
  --master-username postgres --master-user-password <password> \
  --allocated-storage 20 --storage-type gp2 \
  --vpc-security-group-ids <db-sg-id> \
  --no-multi-az --no-publicly-accessible \
  --backup-retention-period 1 \
  --region ap-south-1

# Wait and get endpoint
aws rds wait db-instance-available --db-instance-identifier shortenurl-db --region ap-south-1
aws rds describe-db-instances --db-instance-identifier shortenurl-db \
  --query "DBInstances[0].Endpoint.Address" --output text --region ap-south-1
```

### Step 6 — Create EC2 Instance and Install Dependencies

```bash
# Launch instance
aws ec2 run-instances \
  --image-id <ubuntu-24.04-ami> \
  --instance-type t2.micro \
  --key-name <key-pair> \
  --security-group-ids <ec2-sg-id> \
  --subnet-id <subnet-id> \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=ShortenUrl-Server}]" \
  --region ap-south-1

# SSH in and setup
ssh -i <key>.pem ubuntu@<ec2-ip>
```

Run on EC2:
```bash
# System update + swap
sudo apt update && sudo apt upgrade -y
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Git + AWS CLI
sudo apt install -y git awscli
```

### Step 7 — Deploy App with Docker

```bash
git clone <repo-url> ~/ShortenUrl
cd ~/ShortenUrl

# Create server .env
cat > server/.env << 'EOF'
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<rds-endpoint>:5432/postgres
JWT_SECRET=<your-secret>
CLIENT_URL=http://<ec2-ip>
EOF

# Build and run
docker compose up -d --build

# Create database tables
docker compose exec server node src/config/init-db.js
```

### Step 8 — Create AMI

```bash
aws ec2 create-image \
  --instance-id <instance-id> \
  --name "ShortenUrl-AMI-v1" \
  --no-reboot --region ap-south-1

aws ec2 wait image-available --image-ids <ami-id> --region ap-south-1
```

### Step 9 — Create Launch Template

```bash
aws ec2 create-launch-template \
  --launch-template-name ShortenUrl-LT \
  --launch-template-data '{
    "ImageId": "<ami-id>",
    "InstanceType": "t2.micro",
    "KeyName": "<key-pair>",
    "SecurityGroupIds": ["<ec2-sg-id>"]
  }' --region ap-south-1
```

### Step 10 — Create Target Group

```bash
aws elbv2 create-target-group \
  --name ShortenUrl-TG \
  --protocol HTTP --port 80 \
  --vpc-id <vpc-id> \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --target-type instance \
  --region ap-south-1
```

### Step 11 — Create ALB + Listener

```bash
# ALB across 2 AZs
aws elbv2 create-load-balancer \
  --name ShortenUrl-ALB \
  --subnets <subnet-1a> <subnet-1b> \
  --security-groups <alb-sg-id> \
  --scheme internet-facing --type application \
  --region ap-south-1

# Listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=<tg-arn> \
  --region ap-south-1
```

### Step 12 — Create Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name ShortenUrl-ASG \
  --launch-template LaunchTemplateName=ShortenUrl-LT,Version='$Latest' \
  --min-size 2 --max-size 4 --desired-capacity 2 \
  --vpc-zone-identifier "<subnet-1a>,<subnet-1b>" \
  --target-group-arns <tg-arn> \
  --health-check-type ELB \
  --health-check-grace-period 120 \
  --region ap-south-1

# CPU scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name ShortenUrl-ASG \
  --policy-name cpu-scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
    "TargetValue": 70.0
  }' --region ap-south-1
```

### Step 13 — Fix CORS (Update .env with ALB DNS)

```bash
ssh -i <key>.pem ubuntu@<instance-ip>
cd ~/ShortenUrl

cat > server/.env << 'EOF'
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<rds-endpoint>:5432/postgres
JWT_SECRET=<your-secret>
CLIENT_URL=http://<alb-dns-name>
EOF

cat > client/.env.production << 'EOF'
VITE_API_URL=http://<alb-dns-name>
EOF

docker compose down && docker compose up -d --build
```

### Step 14 — Create Final AMI + Update Launch Template

```bash
# New AMI
aws ec2 create-image --instance-id <instance-id> --name "ShortenUrl-AMI-final" \
  --no-reboot --region ap-south-1
aws ec2 wait image-available --image-ids <new-ami-id> --region ap-south-1

# Update launch template
aws ec2 create-launch-template-version \
  --launch-template-name ShortenUrl-LT \
  --source-version '$Latest' \
  --launch-template-data '{"ImageId":"<new-ami-id>"}' --region ap-south-1

aws ec2 modify-launch-template --launch-template-name ShortenUrl-LT \
  --default-version <new-version> --region ap-south-1

# Rolling replace
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name ShortenUrl-ASG \
  --preferences '{"MinHealthyPercentage":50}' --region ap-south-1
```

App is now live at `http://<alb-dns-name>`

---

## CI/CD Pipeline (GitHub Actions)

### Step 15 — Add Production Docker Compose

Create `docker-compose.prod.yml` in project root:

```yaml
services:
  server:
    image: ${ECR_REGISTRY}/shortenurl-server:latest
    env_file: ./server/.env
    restart: always
    networks:
      - app-net

  client:
    image: ${ECR_REGISTRY}/shortenurl-client:latest
    restart: always
    networks:
      - app-net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - server
      - client
    restart: always
    networks:
      - app-net

networks:
  app-net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.28.0.0/16
        - subnet: fd00:db8::/64
```

### Step 16 — Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: ap-south-1
  ECR_REGISTRY: 786174827428.dkr.ecr.ap-south-1.amazonaws.com
  ASG_NAME: ShortenURL-ASG
  LAUNCH_TEMPLATE: ShortenUrl-LT

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        run: |
          aws ecr get-login-password | docker login \
            --username AWS --password-stdin ${{ env.ECR_REGISTRY }}

      - name: Build and push server image
        run: |
          docker build -t ${{ env.ECR_REGISTRY }}/shortenurl-server:latest \
            -t ${{ env.ECR_REGISTRY }}/shortenurl-server:${{ github.sha }} ./server
          docker push ${{ env.ECR_REGISTRY }}/shortenurl-server --all-tags

      - name: Build and push client image
        run: |
          docker build -t ${{ env.ECR_REGISTRY }}/shortenurl-client:latest \
            -t ${{ env.ECR_REGISTRY }}/shortenurl-client:${{ github.sha }} ./client
          docker push ${{ env.ECR_REGISTRY }}/shortenurl-client --all-tags

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Get one running instance IP
        id: ec2
        run: |
          IP=$(aws ec2 describe-instances \
            --filters "Name=tag:aws:autoscaling:groupName,Values=${{ env.ASG_NAME }}" \
                      "Name=instance-state-name,Values=running" \
            --query "Reservations[0].Instances[0].PublicIpAddress" \
            --output text)
          echo "ip=$IP" >> $GITHUB_OUTPUT

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ steps.ec2.outputs.ip }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            aws ecr get-login-password --region ap-south-1 | \
              docker login --username AWS --password-stdin ${{ env.ECR_REGISTRY }}
            cd ~/ShortenUrl
            ECR_REGISTRY=${{ env.ECR_REGISTRY }} docker compose -f docker-compose.prod.yml pull
            ECR_REGISTRY=${{ env.ECR_REGISTRY }} docker compose -f docker-compose.prod.yml up -d

      - name: Create new AMI
        id: ami
        run: |
          INSTANCE_ID=$(aws ec2 describe-instances \
            --filters "Name=ip-address,Values=${{ steps.ec2.outputs.ip }}" \
            --query "Reservations[0].Instances[0].InstanceId" --output text)

          AMI_ID=$(aws ec2 create-image \
            --instance-id $INSTANCE_ID \
            --name "ShortenUrl-${{ github.sha }}" \
            --no-reboot --query ImageId --output text)

          echo "ami_id=$AMI_ID" >> $GITHUB_OUTPUT
          aws ec2 wait image-available --image-ids $AMI_ID

      - name: Update Launch Template and refresh ASG
        run: |
          VERSION=$(aws ec2 create-launch-template-version \
            --launch-template-name ${{ env.LAUNCH_TEMPLATE }} \
            --source-version '$Latest' \
            --launch-template-data '{"ImageId":"${{ steps.ami.outputs.ami_id }}"}' \
            --query "LaunchTemplateVersion.VersionNumber" --output text)

          aws ec2 modify-launch-template \
            --launch-template-name ${{ env.LAUNCH_TEMPLATE }} \
            --default-version $VERSION

          aws autoscaling start-instance-refresh \
            --auto-scaling-group-name ${{ env.ASG_NAME }} \
            --preferences '{"MinHealthyPercentage":50}'

          echo "Deployment complete. ASG is rolling out new instances."
```

---

## What Happens on Every `git push main`

```
1. GitHub Actions triggers
2. Builds server & client Docker images
3. Pushes images to Amazon ECR (tagged with commit SHA + latest)
4. SSHs into one running EC2 instance
5. Pulls new images from ECR and restarts containers
6. Creates new AMI from updated instance
7. Updates Launch Template with new AMI
8. Triggers ASG instance refresh
9. ASG rolling-replaces all instances with new AMI
10. Zero-downtime deployment complete
```

---

## Tear Down (To Save Costs)

Delete in this order:

```bash
# 1. ASG (terminates all instances)
aws autoscaling delete-auto-scaling-group \
  --auto-scaling-group-name ShortenUrl-ASG --force-delete --region ap-south-1

# 2. ALB
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn> --region ap-south-1

# 3. Wait for ALB to delete, then Target Group
aws elbv2 delete-target-group --target-group-arn <tg-arn> --region ap-south-1

# 4. Launch Template
aws ec2 delete-launch-template --launch-template-name ShortenUrl-LT --region ap-south-1

# 5. Deregister AMIs
aws ec2 deregister-image --image-id <ami-id> --region ap-south-1

# 6. RDS
aws rds delete-db-instance --db-instance-identifier shortenurl-db \
  --skip-final-snapshot --region ap-south-1

# 7. Any standalone EC2 instances
aws ec2 terminate-instances --instance-ids <id> --region ap-south-1

# 8. ECR repositories (optional)
aws ecr delete-repository --repository-name shortenurl-server --force --region ap-south-1
aws ecr delete-repository --repository-name shortenurl-client --force --region ap-south-1
```

Security Groups are free — keep them for next deployment.

---

## Useful Commands

```bash
# Check ASG instances
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names ShortenUrl-ASG \
  --query "AutoScalingGroups[0].Instances[*].[InstanceId,HealthStatus]" \
  --output table --region ap-south-1

# Check target health
aws elbv2 describe-target-health --target-group-arn <tg-arn> \
  --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]" \
  --output table --region ap-south-1

# Docker logs on EC2
docker compose logs -f server

# Rebuild on EC2
docker compose down && docker compose up -d --build

# Create tables
docker compose exec server node src/config/init-db.js
```
