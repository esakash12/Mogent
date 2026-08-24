# 🤖 Mogent - Enterprise AI Customer Support & Automation SaaS

Mogent is an enterprise-grade, high-scale AI-powered Customer Support & Sales Automation Platform designed for Facebook Messenger, Instagram, and web chat.

---

## 🏛️ 3-Tier Distributed Architecture

```text
[1. Frontend (Vercel)] 
        │
        │ (Next.js 15 Dashboard & Live Inbox)
        ▼
[2. Core Backend (Vultr VPS - :4000)] ──▶ [PostgreSQL DB + Redis Queue]
        │
        │ (Communicates via Master API Key: "shohag_ai_master_secret_2026")
        ▼
[3. Dedicated AI Gateway / Proxy (Separate Server/Worker - :5000)]
        │
        ├── 🔄 Atomic Round-Robin Key Rotator (8x Gemini Keys)
        ├── 🛡️ Redis-backed Persistent Rate-Limit & 429 Failover (TTL Auto-Expiry)
        │
        ├───▶ Gemini API Key #1 (Account 1)
        ├───▶ Gemini API Key #2 (Account 2)
        ├───▶ Gemini API Key #3 (Account 3)
        ├───▶ ...
        └───▶ Gemini API Key #8 (Account 8)
```

---

## 📂 Monorepo Structure

```text
Mogent/
├── apps/
│   ├── ai-proxy/         # 🧠 Standalone AI Gateway (8x Gemini Key Rotator + Redis TTL Cooldown)
│   ├── server/           # ⚡ Hono + BullMQ (Node.js Webhook & Worker Server on Vultr)
│   └── web/              # 🌐 Next.js 15 App Router + Tailwind + Shadcn UI (on Vercel)
│       ├── src/app/
│       │   ├── page.tsx        # 📊 Overview Analytics & Metrics
│       │   ├── inbox/          # 💬 Live Customer Inbox & 1-Click Human Takeover
│       │   ├── pages/          # 📄 Facebook Page Manager & AI Mode Switcher
│       │   ├── knowledge/      # 📚 Knowledge Base (Products, FAQs, Policies)
│       │   ├── leads/          # 👥 CRM Leads & Auto-extracted Phone Numbers
│       │   └── settings/       # ⚙️ Telegram Alerts & Webhook Config
├── packages/
│   ├── database/         # 🗄️ Prisma Schema & PostgreSQL PgBouncer Client
│   └── shared/           # 🔐 Zod Schemas, TypeScript Types, AES-256 Crypto
├── docker/               # 🐳 Vultr VPS Deployment Configs
│   ├── docker-compose.yml# Redis 7 + Server + AI-Proxy + Caddy SSL (Zero Public Port Leak)
│   ├── Dockerfile.server # Production build for Server
│   ├── Dockerfile.ai-proxy # Production build for AI-Proxy
│   └── Caddyfile         # Automatic HTTPS & Reverse Proxy config
├── .env.example          # Master Environment Configuration
├── package.json          # Root npm Workspaces & Turbo Scripts
├── turbo.json            # ⚡ Turborepo Fast Caching & Task Pipeline
├── .gitignore            
└── README.md
```

---

## 💻 Running the Platform Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database & Push Schema
```bash
cp .env.example .env
npm run db:generate
npm run db:push
```

### 3. Start All Services with Turborepo
```bash
npm run dev
```

Or start individually:
```bash
npm run dev:ai      # AI Proxy Gateway (Port 5000)
npm run dev:server  # Webhook Server & BullMQ Worker (Port 4000)
npm run dev:web     # Next.js Dashboard UI (Port 3000)
```
