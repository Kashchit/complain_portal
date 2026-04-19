# Online Complaint Registration Portal

## 1. Project Title and Description
The **Online Complaint Registration Portal** is a full-stack web application for students and citizens to submit complaints, track progress, and allow administrators to resolve issues quickly. It solves fragmented complaint handling by providing structured submission, reference-based tracking, and an operational dashboard.  
This project is built as a **university DevSecOps CI/CD assignment** and demonstrates secure coding, infrastructure automation, continuous security testing, and **blue-green deployment** to minimize downtime during releases.

### Security evidence (ZAP, Burp, Wireshark, before/after fixes)
Course submission checklist, screenshot requirements, and a **remediation table** template: see **[`docs/SECURITY_EVIDENCE.md`](docs/SECURITY_EVIDENCE.md)**. Store exports under `docs/evidence/` (see that file for the recommended layout).

## 2. Live Architecture Diagram (ASCII)
```text
Developer
    |
    v
GitHub Repo
    |
    v
Jenkins CI/CD Pipeline
┌─────────────────────────────────────────────┐
│ 1.Checkout → 2.Build → 3.Test → 4.ZAP Scan │
│ → 5.Deploy Green → 6.Verify → 7.Switch ALB │
└─────────────────────────────────────────────┘
    |                         |
    v                         v
Terraform                  Ansible
(Infra)               (Config + Deploy)
    |                         |
    v                         v
┌─────────────────────────────────────┐
│           AWS Cloud                 │
│  ALB ──→ Blue EC2  (t2.micro)       │
│      └──→ Green EC2 (t2.micro)      │
│  CloudWatch Logs + Dashboard        │
└─────────────────────────────────────┘
                  |
┌─────────────────────────────────────┐
│         Security Layer              │
│  OWASP ZAP | Burp Suite | Wireshark │
└─────────────────────────────────────┘
```

## 3. Tech Stack Table
| Tool/Technology | Purpose |
|---|---|
| React.js | UI rendering |
| Vite | Fast frontend build/dev server |
| React Hook Form | Form state management |
| Zod | Frontend validation schema |
| Tailwind CSS | Utility-first responsive styling |
| Axios | HTTP client for API integration |
| Node.js | JavaScript runtime |
| Express.js | REST API backend |
| Neon DB (PostgreSQL) | Serverless database |
| Helmet.js | Security headers and hardening |
| express-rate-limit | API abuse prevention |
| express-validator | Input validation + sanitization |
| hpp | HTTP parameter pollution protection |
| cors | Controlled cross-origin access |
| Terraform | AWS infrastructure provisioning |
| Ansible | Server provisioning and deployment |
| Jenkins | CI/CD orchestration |
| Docker | Container runtime for ZAP scan |
| OWASP ZAP | Automated web vulnerability scanning |
| Burp Suite | Manual penetration testing |
| Wireshark | Network packet analysis |
| AWS EC2 | Application hosts |
| AWS ALB | Traffic routing + blue-green switch |
| AWS CloudWatch | Logs and observability dashboard |
| PM2 | Node process management |

## 4. Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (ships with Node.js)
- Git ([Download](https://git-scm.com/downloads))
- AWS CLI v2 configured (`aws configure`) ([Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- Terraform 1.5+ ([Install](https://developer.hashicorp.com/terraform/downloads))
- Ansible 2.14+ ([Install](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html))
- Docker ([Install](https://docs.docker.com/get-docker/))
- Jenkins LTS with Pipeline, SSH Agent, HTML Publisher plugins ([Install](https://www.jenkins.io/download/))
- Java 11+ for Jenkins ([Install](https://adoptium.net/))
- Neon DB account free tier ([Sign up](https://neon.tech))

## 5. Environment Variables
| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Backend listen port | `3000` |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:password@host/dbname?sslmode=require` |
| `ADMIN_KEY` | API key for `/api/admin/*` routes | `your-secret-admin-key-change-this` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `NODE_ENV` | Runtime mode | `development` |
| `SMTP_HOST` | Outbound mail server (Gmail example: `smtp.gmail.com`) | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 TLS / 465 SSL) | `587` |
| `SMTP_USER` | SMTP username (usually your Gmail address) | `you@gmail.com` |
| `SMTP_PASS` | Gmail App Password (16 characters, no spaces) | *(set locally only — never commit)* |
| `SMTP_FROM` | From header shown to recipients | `Complaint Portal <you@gmail.com>` |
| `VITE_ADMIN_KEY` | Same value as `ADMIN_KEY`, in `client/.env` for browser admin API + live stream | `your-secret-admin-key-change-this` |

## 6. Local Development Setup
```bash
git clone https://github.com/your-org/complaint-portal.git
cd complaint-portal
npm install
cd client && npm install
cd ..
cp .env.example .env
# Update DATABASE_URL from Neon dashboard
# Copy client/.env.example to client/.env and set VITE_ADMIN_KEY to match ADMIN_KEY
# Add SMTP_* variables to root .env for registration OTP (one-time) and complaint emails (Gmail: use an App Password). Customers then sign in with email + password.
npm run dev
```
- Frontend: `http://localhost:5173`
- Health API: `http://localhost:3000/api/health`

How to get `DATABASE_URL`:
1. Login to Neon dashboard.
2. Open your project.
3. Go to **Connection Details**.
4. Copy the PostgreSQL URI.
5. Ensure it ends with `?sslmode=require`.
6. Paste into `.env`.

## 7. Neon DB Setup
1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a project and database.
3. Copy connection string into `DATABASE_URL`.
4. Start backend once; table auto-creates on boot.
5. View records in Neon Console under **Tables** > `complaints`.

## 8. Terraform Deployment Guide
```bash
cd terraform
terraform init
terraform plan \
  -var="key_name=your-keypair-name" \
  -var="vpc_id=vpc-xxxxxxxx" \
  -var='subnet_ids=["subnet-aaaa","subnet-bbbb"]'
terraform apply \
  -var="key_name=your-keypair-name" \
  -var="vpc_id=vpc-xxxxxxxx" \
  -var='subnet_ids=["subnet-aaaa","subnet-bbbb"]'
```
- VPC ID: AWS Console → **VPC** → **Your VPCs** → copy `vpc-*`.
- Subnet IDs: AWS Console → **VPC** → **Subnets**, select two in different AZs (required for ALB HA).
- Use outputs for EC2 IPs, TG ARNs, listener ARN, ALB DNS in Ansible/Jenkins.
- Estimated cost: ALB ~`$0.50/day`; EC2 in free tier if eligible.
- Cleanup:
```bash
terraform destroy \
  -var="key_name=your-keypair-name" \
  -var="vpc_id=vpc-xxxxxxxx" \
  -var='subnet_ids=["subnet-aaaa","subnet-bbbb"]' \
  -auto-approve
```

## 9. Ansible Guide
- Update `ansible/inventory.ini` with Terraform output IPs.
- Install base stack:
```bash
ansible-playbook -i ansible/inventory.ini ansible/install_apache.yml -u ec2-user --private-key ~/.ssh/your-key.pem
```
- Deploy to green:
```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml -e target=green -u ec2-user --private-key ~/.ssh/your-key.pem
```
- Verify Apache:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@GREEN_IP "sudo systemctl status httpd"
curl http://GREEN_IP/api/health
```
- PM2 status:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@GREEN_IP "pm2 status"
```

## 10. Jenkins Pipeline Setup
Install Jenkins (Docker):
```bash
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts
```
Setup:
1. Open `http://localhost:8080`.
2. Unlock Jenkins with initial admin password from container logs.
3. Install plugins: Pipeline, SSH Agent, HTML Publisher, Credentials Binding, Git.
4. Add credentials at Manage Jenkins → Credentials → System → Global:
   - Secret Text IDs: `GREEN_EC2_IP`, `BLUE_EC2_IP`, `GREEN_TG_ARN`, `BLUE_TG_ARN`, `ALB_LISTENER_ARN`
   - SSH Username with private key ID: `ec2-ssh-key`
5. Create Pipeline job and point to repository `Jenkinsfile`.
6. Run build and view ZAP report in Build → Artifacts → `zap-reports/zap-report.html`.

## 11. Blue-Green Deployment — Full Explanation
Blue-green deployment uses two identical environments:
- **Blue** = currently live app.
- **Green** = newly deployed version.

Why zero downtime:
- Users stay on blue until green is validated.
- ALB listener forwards to green only after health checks pass.

Switch command in pipeline:
```bash
aws elbv2 modify-listener --listener-arn LISTENER_ARN --default-actions Type=forward,TargetGroupArn=GREEN_TG_ARN --region us-east-1
```

Rollback trigger:
- If verify stage fails, `post.failure` switches listener back to blue TG.

Manual rollback:
```bash
aws elbv2 modify-listener --listener-arn LISTENER_ARN --default-actions Type=forward,TargetGroupArn=BLUE_TG_ARN --region us-east-1
```

Screenshot location:
- AWS Console → EC2 → Load Balancers → Listeners tab.

## 12. Security Implementation — DETAILED (Most Important Section)

### 12a. OWASP ZAP — Automated Security Scanning
OWASP ZAP is an industry-standard open-source scanner that identifies common web risks (XSS, SQLi patterns, missing headers, misconfigurations, disclosure issues, clickjacking gaps).  
Integrated in Jenkins **Stage 4** and runs on each deployment.

Manual run:
```bash
docker run --rm -v $(pwd)/zap-reports:/zap/wrk owasp/zap2docker-stable \
  zap-baseline.py -t http://GREEN_EC2_IP \
  -r zap-report.html -x zap-report.xml -J zap-report.json -l WARN
```
- `-t`: target URL
- `-r`: HTML report
- `-x`: XML report
- `-J`: JSON report
- `-l`: alert threshold

Reading report:
- `FAIL`: high risk, immediate fix
- `WARN`: medium risk, should fix
- `INFO`: informational

Expected pre-fix alerts include missing anti-clickjacking header, MIME-sniffing controls, and server version disclosure.  
Post-fix report should show fewer WARNs and resolved header findings.

Artifacts path in Jenkins: Build → Artifacts → `zap-reports/zap-report.html`.

### 12b. Burp Suite — Manual Penetration Testing
Burp Suite is a standard manual penetration testing suite.
- Download: [Burp Community](https://portswigger.net/burp/communitydownload)

Setup:
1. Open Burp, verify proxy `127.0.0.1:8080`.
2. Configure browser proxy or use built-in Burp browser.
3. Turn Intercept ON.

XSS test:
1. Submit complaint through Burp proxy.
2. Intercept `POST /api/complaints`.
3. Send to Repeater.
4. Replace `description` with `<script>alert('XSS-TEST')</script>`.
5. Send and inspect blocked/sanitized response.

SQLi test:
1. Replace email with `test'OR'1'='1`.
2. Send and confirm validation failure.

Parameter tampering:
1. Intercept `GET /api/admin/stats`.
2. Remove/alter `X-Admin-Key`.
3. Confirm `401 Unauthorized`.

Required screenshots (5):
1. Intercepted complaint POST
2. Repeater request with XSS payload
3. Repeater response showing rejection/sanitization
4. SQLi payload attempt and validation error
5. Admin request without key returning 401

### 12c. Wireshark — Network Traffic Analysis
Wireshark is a packet analyzer used to validate whether traffic is encrypted.
- Download: [wireshark.org](https://www.wireshark.org/download.html)

Capture steps:
1. Open Wireshark as admin.
2. Select active interface (`Wi-Fi`, `Ethernet`, or `en0`).
3. Use capture filter `tcp port 80`.
4. Start capture.
5. Submit form on `http://GREEN_EC2_IP`.
6. Stop capture.
7. Display filter: `http && ip.addr == GREEN_EC2_IP`.
8. Open packet `POST /api/complaints HTTP/1.1`.
9. Expand HTTP and form payload.
10. Screenshot plain-text fields.

Meaning:
- HTTP exposes complaint data to network sniffing.
- Fix: attach TLS certificate to ALB and redirect HTTP to HTTPS.

Export pcap:
- File → Export Specified Packets → save `.pcap`.

Submission proof:
- One screenshot + `.pcap` file.

### 12d. Security Headers Table
| Header | Value Set | Threat Prevented | Implemented By |
|---|---|---|---|
| X-Frame-Options | SAMEORIGIN | Clickjacking / UI Redressing | Helmet + Apache |
| X-XSS-Protection | 1; mode=block | Reflected XSS in older browsers | Helmet + Apache |
| X-Content-Type-Options | nosniff | MIME sniffing attacks | Helmet + Apache |
| Content-Security-Policy | default-src 'self' | XSS, data injection | Helmet (CSP) |
| Referrer-Policy | strict-origin-when-cross-origin | Information leakage | Helmet + Apache |
| Strict-Transport-Security | max-age=31536000 | SSL stripping / downgrade | Helmet (HSTS) |
| Server | (removed) | Server fingerprinting | ServerTokens Prod in Apache |
| X-Powered-By | (removed) | Technology fingerprinting | app.disable() in Express |

### 12e. Vulnerability Fix Log
| Vulnerability | Severity | Detected By | Fix Applied | Before | After |
|---|---|---|---|---|---|
| Missing X-Frame-Options header | Medium | OWASP ZAP | `helmet.frameguard()` + Apache headers | ZAP WARN | ZAP PASS |
| Missing X-Content-Type-Options | Low | OWASP ZAP | `helmet()` default secure headers | ZAP WARN | ZAP PASS |
| Server version disclosed in headers | Low | ZAP + Wireshark | `ServerTokens Prod` + `app.disable('x-powered-by')` | ZAP WARN | ZAP PASS |
| No rate limiting on form submission | High | Manual review | `express-rate-limit` 5 req/hour on submit route | Unlimited | 429 after 5 |
| Form data sent over HTTP | High | Wireshark | ALB HTTPS recommendation and migration plan | Plain text | Encrypted on HTTPS |
| XSS via unsanitized input | High | Burp + ZAP | `escape()` + CSP | Reflected risk | Blocked/sanitized |

## 13. Submission Checklist
- [ ] `terraform/main.tf` — complete and working
- [ ] `terraform/variables.tf`
- [ ] `terraform/outputs.tf`
- [ ] Terraform apply screenshot showing all output values
- [ ] EC2 Blue and Green instances showing running state
- [ ] ALB created and visible in AWS Console
- [ ] ALB listener shows Blue TG before switch
- [ ] ALB listener shows Green TG after switch
- [ ] `ansible/install_apache.yml` — complete
- [ ] `ansible/deploy.yml` — complete
- [ ] `ansible/inventory.ini` updated with real IPs
- [ ] Ansible run screenshot showing tasks OK
- [ ] `Jenkinsfile` with all 7 stages
- [ ] Jenkins stage view screenshot with green stages
- [ ] Jenkins rollback proof with `ROLLBACK COMPLETE`
- [ ] OWASP ZAP before-fix report
- [ ] OWASP ZAP after-fix report
- [ ] ZAP report in Jenkins artifacts
- [ ] Burp screenshot: intercepted POST
- [ ] Burp screenshot: XSS payload in Repeater
- [ ] Burp screenshot: 401 without `X-Admin-Key`
- [ ] Wireshark screenshot showing plain-text POST payload
- [ ] Wireshark `.pcap` exported
- [ ] Written vulnerability analysis and fixes

## 14. Screenshot Guide (In Order)
1. Terraform apply output with all output values  
2. AWS EC2 instances (Blue/Green running)  
3. AWS ALB list with `complaint-portal-alb`  
4. AWS target groups (blue-tg, green-tg)  
5. ALB listener forwarding to blue-tg (before)  
6. Jenkins pipeline job configuration page  
7. Jenkins stage view showing all 7 stages  
8. Jenkins artifacts showing `zap-reports`  
9. ALB listener forwarding to green-tg (after)  
10. Jenkins failed build with rollback logs  
11. ZAP before-fix report with WARNs  
12. ZAP after-fix report with reduced alerts  
13. Burp Proxy history showing intercepted POST  
14. Burp Repeater with XSS payload  
15. Wireshark POST packet with visible form data  
16. Neon table records in dashboard  
17. Admin dashboard table with badges  
18. CloudWatch log group entries

## 15. Cost Management
- Free/low-cost: EC2 t2.micro free-tier hours, IAM, SGs, Neon free tier (0.5GB), basic CloudWatch.
- Paid: ALB around `$0.50/day` (~`$15/month`), unattached Elastic IPs.
- Cost strategy: provision, capture evidence, destroy quickly.
- Demo budget target: under `$2` if destroyed within a few hours.
- Destroy command:
```bash
terraform destroy -var="key_name=..." -var="vpc_id=..." -var='subnet_ids=["...","..."]' -auto-approve
```

## 16. Common Errors and Fixes
1. **SSH Permission denied (publickey)**  
   Cause: wrong key path in inventory.  
   Fix: set correct `ansible_ssh_private_key_file`.
2. **Ansible UNREACHABLE**  
   Cause: SG missing port 22 ingress.  
   Fix: allow SSH inbound and verify correct public IP.
3. **ZAP image pull fails**  
   Cause: Docker daemon down/no network.  
   Fix: start Docker and retry `docker pull`.
4. **Jenkins credential not found**  
   Cause: ID mismatch in Jenkinsfile vs credentials store.  
   Fix: match IDs exactly.
5. **ALB health check failing**  
   Cause: app/httpd not running on expected port/path.  
   Fix: restart services and verify `/api/health`.
6. **Neon connection refused**  
   Cause: invalid DB URL or no SSL mode.  
   Fix: correct URI and include `?sslmode=require`.
7. **React build fails in Jenkins**  
   Cause: dependencies missing before build.  
   Fix: run `npm install` before `npm run build`.

## 17. License
MIT License
# complain_portal
