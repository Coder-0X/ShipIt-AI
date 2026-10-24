# 🚀 ShipIt AI — Self-Hosting & Team Deployment Guide

> **Model A: Self-Hosted / Individual Team Deployment**  
> Complete operational manual for running your own private instance of ShipIt AI with full GitHub PR ingestion, Atlassian Jira Release Hub sync, Slack Block-Kit broadcasts, and cryptographic audit ledgers.

---

## 📌 Architecture Overview

When self-hosting ShipIt AI, all code diff analysis, AST sanitization, and release note syntheses execute within **your own infrastructure perimeter**. Secrets are never shared across organizations, and data persistence remains under your direct control.

```
       GitHub / VCS
            │ (Webhook HMAC / Live Diff)
            ▼
┌────────────────────────────────────────┐
│  Your Self-Hosted ShipIt AI Instance   │
│                                        │
│  ├── 4-Stage Gemini Reasoning Engine   │
│  ├── AST Boundary & Secret Redactor    │
│  └── Multi-Channel Orchestration       │
└───────┬──────────────┬──────────────┬──┘
        │              │              │
        ▼              ▼              ▼
  Atlassian Jira     Slack       Supabase / Local
  (Release Hub)   (#releases)    (Audit Ledger)
```

---

## ⚡ Quickstart Deployment Options

### Option 1: Native Node.js Deployment

**Prerequisites:** Node.js v18.0.0+ and npm.

```bash
# 1. Clone your repository
git clone https://github.com/Coder-0X/ShipIt-AI.git
cd ShipIt-AI/web

# 2. Install dependencies
npm install

# 3. Create your private configuration
cp .env.example .env.local

# 4. Run environment diagnostics
npm run doctor

# 5. Launch development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/enterprise](http://localhost:3000/enterprise).

---

### Option 2: Docker & Docker Compose

Run ShipIt AI with a single command:

```bash
cd ShipIt-AI/web

# Ensure your .env.local file is configured
cp .env.example .env.local

# Build and launch container in background
docker compose up -d --build
```

Verify container status:
```bash
docker compose ps
curl http://localhost:3000/api/health
```

---

### Option 3: 1-Click Cloud Deployment (Vercel / Railway / Render)

You can deploy the Next.js application directly to Vercel or Railway:
1. Connect your GitHub repository to Vercel or Railway.
2. Set the **Root Directory** to `web`.
3. Add the environment variables from `.env.example` in your provider's project settings dashboard.
4. Deploy!

---

## 🛠️ Step-by-Step Integration Setup

### 1. Google Gemini AI Engine (Required)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Create API Key**.
3. In `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```

---

### 2. GitHub Webhook & PR Review Commenter
1. Go to your GitHub repository -> **Settings** -> **Webhooks** -> **Add webhook**.
2. **Payload URL**: `https://your-domain.com/api/webhooks/github` (or your ngrok URL for local dev).
3. **Content type**: `application/json`.
4. **Secret**: Set a random secret string (e.g. `openssl rand -hex 20`).
5. **Which events**: Select **Let me select individual events** -> check **Pull requests**.
6. (Optional) Create a GitHub Personal Access Token (PAT) with `repo` scope to enable ShipIt AI to fetch diffs for private repositories and post comments back to PRs.
7. In `.env.local`:
   ```env
   GITHUB_WEBHOOK_SECRET=your_random_secret_string
   GITHUB_TOKEN=ghp_your_github_personal_access_token
   ```

---

### 3. Atlassian Jira Cloud & Jira Release Hubs
1. **Jira Host**: Your Atlassian Cloud URL (e.g. `https://mycompany.atlassian.net`).
2. **Jira Email**: The email address of the developer or bot account.
3. **Jira API Token**: Generate one at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
4. In `.env.local`:
   ```env
   JIRA_HOST=https://mycompany.atlassian.net
   JIRA_EMAIL=dev@mycompany.com
   JIRA_API_TOKEN=your_atlassian_api_token
   DEFAULT_JIRA_PROJECT=PROJ
   ```
*ShipIt AI will automatically detect Jira issue keys like `PROJ-1042` from PR branch names and post formatted release changelogs to Jira tickets and Jira Release Hub versions.*

---

### 4. Slack Block-Kit Broadcasts
1. In Slack, go to **Manage Apps** -> **Custom Integrations** -> **Incoming WebHooks** (or create a Slack App with an Incoming Webhook).
2. Choose your target announcements channel (e.g. `#releases` or `#dev-team`).
3. Copy the Webhook URL.
4. In `.env.local`:
   ```env
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T0000/B0000/XXXXX
   ```

---

### 5. Supabase Audit Ledger (Optional — Persistent Local Ledger Active by Default)
By default, ShipIt AI stores cryptographic audit records in a local persistent JSON ledger (`.data/audit_ledger.json`). To upgrade to cloud-hosted PostgreSQL with Row Level Security (RLS):
1. Create a free project at [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the entire contents of [`web/schema.sql`](../web/schema.sql).
4. Go to **Project Settings** -> **API**:
   - Copy **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role secret** -> `SUPABASE_SERVICE_ROLE_KEY`
5. In `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

---

## 🩺 Verification & Diagnostics

At any point, verify the status of your self-hosted instance:

### Terminal CLI Doctor:
```bash
npm run doctor
```

### JSON Health Endpoint:
```bash
curl http://localhost:3000/api/health
```
Example response:
```json
{
  "status": "healthy",
  "version": "2.4.0-self-hosted",
  "deploymentMode": "self-hosted",
  "integrations": {
    "geminiEngine": { "active": true, "model": "gemini-3.1-flash-lite" },
    "github": { "webhookConfigured": true, "prCommenterConfigured": true },
    "jiraCloud": { "active": true, "host": "https://mycompany.atlassian.net", "mode": "live" },
    "slack": { "active": true, "mode": "live" },
    "auditLedger": { "active": true, "backend": "supabase", "tamperProofSha256": true }
  }
}
```

---

## 🛡️ Security & Privacy Notice
* Diff contents are processed through an AST Boundary & Entropy-based PII Redactor before reaching Gemini.
* No raw source code is persisted to external databases; only synthesized release metadata and cryptographic SHA-256 hashes are recorded.
