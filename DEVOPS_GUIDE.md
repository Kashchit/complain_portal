# Hybrid DevOps Guide — Complain Portal

This guide provides the **exact commands and steps** to maintain your hybrid architecture: **Render (Backend) + Cloudflare (Frontend) + Dedicated Monitoring VM.**

---

## 🏗️ Architecture Overview

Your system is optimized for speed and self-hosting where it matters:
1.  **Backend (Render)**: Managed hosting for the API.
2.  **Frontend (Cloudflare)**: Fast, global delivery of the React app.
3.  **Monitoring (VM)**: A custom Prometheus/Grafana stack running on your dedicated server.
4.  **Security (CI/CD)**: Integrated vulnerability scanning with Trivy.

---

## 📋 Integration Steps (How to make it work)

### Step 1: Configure GitHub Secrets
To link your services, go to **Settings > Secrets and variables > Actions** and add:

- **`RENDER_DEPLOY_HOOK`**: [Get from Render Dashboard]
- **`CLOUDFLARE_API_TOKEN`**: [Generate from Cloudflare API Tokens]
- **`CLOUDFLARE_ACCOUNT_ID`**: [Found in Cloudflare Dashboard]
- **`SERVER_IP`**: The public IP of your Monitoring VM.
- **`SSH_PRIVATE_KEY`**: Your private SSH key for the Monitoring VM.
- **`DATABASE_URL`**: Your production DB URL (used by Render).
- **`SESSION_SECRET`**: A secure string for authentication.

### Step 2: Trigger Deployment
Every time you push to the `main` branch:
1.  **Build**: GitHub Actions builds your Docker image and scans it with **Trivy**.
2.  **Backend**: GitHub sends a "Deploy Hook" to **Render** to update the API.
3.  **Frontend**: GitHub deploys the built React app to **Cloudflare Pages**.
4.  **Monitoring**: GitHub connects to your **VM** via SSH and restarts the Prometheus stack.

---

## 📊 Security & Monitoring

### Viewing Security Reports
- After every push, go to the **Actions** tab in GitHub.
- Click on the latest build → **trivy-security-report** artifact.
- Review any "CRITICAL" vulnerabilities in your packages.

### Accessing Dashboards
Access your self-hosted monitoring tools at:
- **Grafana**: `http://<YOUR_SERVER_IP>:3000` (User: `admin` / Pass: `admin`)
- **Prometheus**: `http://<YOUR_SERVER_IP>:9090`

### Checking Health
The monitoring VM is configured to scrape the Render API every 15 seconds. You can check the "Targets" page in Prometheus to ensure `https://complain-portal-api.onrender.com/api/health` is returning a `200 OK` status.

---

## 🛠️ Troubleshooting Commands

### Restart Monitoring Stack (SSH into VM)
```bash
ssh ubuntu@<YOUR_SERVER_IP>
cd ~/monitoring
docker-compose -f docker-compose.monitoring.yml restart
```

### Check Logs on VM
```bash
docker logs -f prometheus
docker logs -f grafana
```

---
*Hybrid DevOps Stack • 2026*
