Here's a concise step-by-step guide for deploying a **Dockerized PERN (PostgreSQL, Express, React, Node.js)** application on **AWS EC2 + RDS + ALB + Auto Scaling**.

### 1. Develop the Application

* Build and test your PERN application locally.
* Connect it to the Amazon RDS PostgreSQL database.
* Store credentials in a `.env` file.

⬇️

### 2. Dockerize the Application

* Create a `Dockerfile`.
* (Optional) Create `docker-compose.yml` for local development.
* Build and test the Docker image locally.

⬇️

### 3. Push Code to GitHub

* Commit your code.
* Push the repository to GitHub.

⬇️

### 4. Launch an EC2 Instance

* Create an EC2 instance.
* Configure the Security Group (SSH, HTTP, HTTPS).

⬇️

### 5. Install Required Software

Install:

* Docker
* Docker Compose (optional)
* Git
* Nginx

⬇️

### 6. Deploy the Application

* Clone the GitHub repository.
* Build the Docker image.
* Run the Docker container.
* Verify the application is running.

⬇️

### 7. Configure Nginx

* Configure Nginx as a reverse proxy.
* Forward traffic to the Docker container.
* Restart Nginx.

⬇️

### 8. Connect to Amazon RDS

* Update environment variables with the RDS endpoint.
* Ensure the EC2 Security Group can access the RDS Security Group.
* Test database connectivity.

⬇️

### 9. Test the Application

* Access the app via the EC2 public IP.
* Verify API endpoints.
* Confirm database read/write operations.

⬇️

### 10. Create an AMI

* Create an Amazon Machine Image (AMI) from the configured EC2 instance.

⬇️

### 11. Create a Launch Template

* Use the AMI.
* Select the instance type.
* Attach the Security Group and IAM role.

⬇️

### 12. Create an Auto Scaling Group

* Create an ASG using the Launch Template.
* Set the minimum, desired, and maximum instance count.
* Configure scaling policies.

⬇️

### 13. Create an Application Load Balancer

* Create an ALB.
* Create a Target Group.
* Register the Auto Scaling Group with the Target Group.
* Configure Health Checks.

⬇️

### 14. Verify High Availability

* Access the application through the ALB DNS.
* Confirm requests are routed to healthy EC2 instances.
* Test Auto Scaling by increasing application load.

### Final Architecture

```text
Developer (PERN)
        │
        ▼
Develop & Test Locally
        │
        ▼
Dockerize Application
        │
        ▼
Push Code → GitHub
        │
        ▼
Launch EC2
        │
        ▼
Install Docker, Git & Nginx
        │
        ▼
Clone Repository
        │
        ▼
Build & Run Docker Container
        │
        ▼
Configure Nginx
        │
        ▼
Connect to Amazon RDS
        │
        ▼
Test Application
        │
        ▼
Create AMI
        │
        ▼
Create Launch Template
        │
        ▼
Create Auto Scaling Group
        │
        ▼
Attach to Application Load Balancer
        │
        ▼
Users → ALB → Healthy EC2 Instances
        │
        ▼
Docker Container
        │
        ▼
Node.js Backend
        │
        ▼
Amazon RDS PostgreSQL
```

This sequence follows the order typically used in production deployments on AWS.
