# ShortenUrl — AWS Deployment Guide

## Architecture

```
Internet
   |
ALB (port 80) --- ALB-SG (80, 443 from 0.0.0.0/0)
   |
Target Group (/api/health)
   |
+----------+  +----------+
|  EC2-1   |  |  EC2-2   |  --- EC2-SG (80 from ALB-SG, 5000 from ALB-SG, 22 from your IP)
|  Docker  |  |  Docker  |      Auto Scaling: min 2, max 4
+-----+----+  +-----+----+
      +--------+----+
               |
        RDS PostgreSQL --- DB-SG (5432 from EC2-SG)
```

## Tech Stack

- **Frontend:** React (Vite) — served via Nginx container
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL (AWS RDS)
- **Containerization:** Docker Compose (3 containers: server, client, nginx)
- **Infra:** AWS (EC2, RDS, ALB, ASG, Security Groups)

## Step-by-Step Deployment

### Step 1 — Create app and run locally

```bash
# Server
cd server && npm install && npm run dev

# Client
cd client && npm install && npm run dev
```

App runs at http://localhost:5173

### Step 2 — Create 3 Security Groups (ap-south-1)

| SG Name | Inbound Rules |
|---------|---------------|
| ALB-SG  | Port 80, 443 from 0.0.0.0/0 |
| EC2-SG  | Port 80 from ALB-SG, Port 5000 from ALB-SG, Port 22 from your IP |
| DB-SG   | Port 5432 from EC2-SG |

```bash
aws ec2 create-security-group --group-name ALB-SG --description "ALB Security Group" --vpc-id <vpc-id> --region ap-south-1
aws ec2 create-security-group --group-name EC2-SG --description "EC2 Security Group" --vpc-id <vpc-id> --region ap-south-1
aws ec2 create-security-group --group-name DB-SG --description "DB Security Group" --vpc-id <vpc-id> --region ap-south-1
# Add inbound rules for each SG
```

### Step 3 — Create RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier shortenurl-db \
  --db-instance-class db.t3.micro \
  --engine postgres --engine-version 15 \
  --master-username postgres --master-user-password <password> \
  --allocated-storage 20 --storage-type gp2 \
  --vpc-security-group-ids <db-sg-id> \
  --no-multi-az --no-publicly-accessible \
  --region ap-south-1
```

Save the RDS endpoint after creation.

### Step 4 — Create EC2 Ubuntu instance

```bash
aws ec2 run-instances \
  --image-id <latest-ubuntu-24.04-ami> \
  --instance-type t2.micro \
  --key-name <key-pair-name> \
  --security-group-ids <ec2-sg-id> \
  --subnet-id <subnet-id> \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=ShortenUrl-Server}]" \
  --region ap-south-1
```

### Step 5 — SSH into EC2 and install dependencies

```bash
ssh -i <key>.pem ubuntu@<ec2-public-ip>

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

# Install Git
sudo apt install -y git
```

### Step 6 — Clone code, configure .env, and run with Docker

```bash
git clone <repo-url> ~/ShortenUrl
cd ~/ShortenUrl

# Create server .env
cat > server/.env << 'EOF'
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<rds-endpoint>:5432/postgres
JWT_SECRET=<your-secret>
CLIENT_URL=http://<ec2-public-ip>
EOF

# Create client .env.production
cat > client/.env.production << 'EOF'
VITE_API_URL=http://<ec2-public-ip>
EOF

# Build and run
docker compose up -d --build

# Create database tables
docker compose exec server node src/config/init-db.js
```

Verify at http://\<ec2-public-ip\>

### Step 7 — Create AMI from EC2

```bash
aws ec2 create-image \
  --instance-id <instance-id> \
  --name "ShortenUrl-AMI-$(date +%Y%m%d)" \
  --no-reboot --region ap-south-1

aws ec2 wait image-available --image-ids <ami-id> --region ap-south-1
```

### Step 8 — Create Launch Template using AMI

```bash
aws ec2 create-launch-template \
  --launch-template-name ShortenUrl-LT \
  --launch-template-data '{
    "ImageId": "<ami-id>",
    "InstanceType": "t2.micro",
    "KeyName": "<key-pair-name>",
    "SecurityGroupIds": ["<ec2-sg-id>"]
  }' --region ap-south-1
```

### Step 9 — Create Target Group

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

Save the Target Group ARN.

### Step 10 — Create ALB and Listener

```bash
# Create ALB (use 2 subnets in different AZs)
aws elbv2 create-load-balancer \
  --name ShortenUrl-ALB \
  --subnets <subnet-1a> <subnet-1b> \
  --security-groups <alb-sg-id> \
  --scheme internet-facing --type application \
  --region ap-south-1

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=<tg-arn> \
  --region ap-south-1
```

Save the ALB DNS name.

### Step 11 — Create Auto Scaling Group

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

# Optional: CPU-based scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name ShortenUrl-ASG \
  --policy-name cpu-scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
    "TargetValue": 70.0
  }' --region ap-south-1
```

App is now live at http://\<alb-dns-name\>

### Step 12 — Fix CORS for ALB

App shows CORS errors because `CLIENT_URL` in .env still points to the old EC2 IP.

### Step 13 — Update .env with ALB DNS on one instance

```bash
ssh -i <key>.pem ubuntu@<any-instance-ip>
cd ~/ShortenUrl

# Update server .env
cat > server/.env << 'EOF'
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<rds-endpoint>:5432/postgres
JWT_SECRET=<your-secret>
CLIENT_URL=http://<alb-dns-name>
EOF

# Update client .env.production
cat > client/.env.production << 'EOF'
VITE_API_URL=http://<alb-dns-name>
EOF

# Rebuild
docker compose down && docker compose up -d --build
```

### Step 14 — Create new AMI from updated instance

```bash
aws ec2 create-image \
  --instance-id <updated-instance-id> \
  --name "ShortenUrl-AMI-v2" \
  --no-reboot --region ap-south-1

aws ec2 wait image-available --image-ids <new-ami-id> --region ap-south-1
```

### Step 15 — Update Launch Template and refresh ASG

```bash
# New launch template version
aws ec2 create-launch-template-version \
  --launch-template-name ShortenUrl-LT \
  --source-version '$Latest' \
  --launch-template-data '{"ImageId":"<new-ami-id>"}' \
  --region ap-south-1

# Set as default
aws ec2 modify-launch-template \
  --launch-template-name ShortenUrl-LT \
  --default-version <new-version-number> \
  --region ap-south-1

# Rolling replace all instances
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name ShortenUrl-ASG \
  --preferences '{"MinHealthyPercentage":50}' \
  --region ap-south-1
```

ASG will replace all instances with the new AMI. No manual updates needed.

## Tear Down (to save costs)

Delete in this order:

```bash
# 1. ASG (terminates all instances)
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name ShortenUrl-ASG --force-delete --region ap-south-1

# 2. ALB
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn> --region ap-south-1

# 3. Target Group (after ALB is deleted)
aws elbv2 delete-target-group --target-group-arn <tg-arn> --region ap-south-1

# 4. Launch Template
aws ec2 delete-launch-template --launch-template-name ShortenUrl-LT --region ap-south-1

# 5. AMI
aws ec2 deregister-image --image-id <ami-id> --region ap-south-1

# 6. RDS
aws rds delete-db-instance --db-instance-identifier shortenurl-db --skip-final-snapshot --region ap-south-1

# 7. EC2 (if any standalone instances remain)
aws ec2 terminate-instances --instance-ids <instance-id> --region ap-south-1
```

Security Groups are free — keep them for next time.

## Docker Containers

| Container | Role | Port |
|-----------|------|------|
| server    | Express API | 5000 |
| client    | React (Nginx) | 80 |
| nginx     | Reverse proxy | 80 (exposed) |

## Useful Commands

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f server

# Rebuild after code changes
docker compose down && docker compose up -d --build

# Create tables
docker compose exec server node src/config/init-db.js
```
