# 🚀 Vultr Cloud VPS Deployment Guide (1-Click Docker Hosting)

This guide walks you through deploying the complete Mogent platform on a **Vultr Cloud Compute VPS (Ubuntu 22.04 / 24.04)**.

---

## ⚡ Recommended Vultr Specs:
* **Server Type:** Cloud Compute (Shared or High Performance NVMe)
* **OS:** Ubuntu 24.04 LTS x64
* **RAM:** 2 GB or 4 GB (Recommended for running Postgres + Redis + 2 Next.js Apps + AI Proxy)
* **Location:** Singapore or Tokyo (Fastest latency to Bangladesh)

---

## 🛠️ Step 1: Install Docker & Git on your Vultr VPS

SSH into your Vultr server:
```bash
ssh root@YOUR_VULTR_SERVER_IP
```

Run the following 1-line script to install Docker & Docker Compose:
```bash
curl -fsSL https://get.docker.com | sh
apt update && apt install -y git
```

---

## 📥 Step 2: Clone the Mogent Repository

```bash
git clone https://github.com/your-username/Mogent.git /root/mogent
cd /root/mogent/docker
```

---

## ⚙️ Step 3: Configure Environment (.env)

Copy the production template:
```bash
cp .env.production.example .env
nano .env
```

Set your actual values:
1. **`DOMAIN`**: `yourdomain.com` (Ensure your DNS A records point to your Vultr IP: `@`, `admin`, `api`)
2. **`GEMINI_API_KEYS`**: Put your free Gemini API keys (comma-separated).
3. **`FACEBOOK_APP_ID` & `FACEBOOK_APP_SECRET`**: Your Facebook Developer App credentials.

---

## 🚀 Step 4: Launch the Entire Stack!

From inside `/root/mogent/docker`:
```bash
docker compose up -d --build
```

### What Docker will automatically start:
1. 🗄️ **`mogent-postgres`**: Native PostgreSQL with persistent NVMe storage.
2. ⚡ **`mogent-redis`**: High-speed in-memory queue and session cache (<0.2ms latency).
3. 🤖 **`mogent-ai-proxy`**: Standalone Gemini key rotator.
4. 🚀 **`mogent-server`**: Express/Hono backend and BullMQ message workers.
5. 🌐 **`mogent-web`**: Next.js 15 Client Portal.
6. 🛡️ **`mogent-admin`**: Next.js 15 Super Admin Panel.
7. 🔒 **`mogent-caddy`**: Automatic HTTPS / SSL certificates for all 3 subdomains!

---

## 🧹 Step 5: Initialize the Database (Push Schema)

To create the clean production database tables:
```bash
docker exec -it mogent-server npx prisma db push
```

*(Optional: If you want to seed with initial starter data)*:
```bash
docker exec -it mogent-server npx tsx packages/database/prisma/seed.ts
```

---

## 📊 Useful Management Commands:

* **View live logs of all services:**
  ```bash
  docker compose logs -f
  ```
* **Restart everything:**
  ```bash
  docker compose restart
  ```
* **Update to latest code:**
  ```bash
  git pull && docker compose up -d --build
  ```
