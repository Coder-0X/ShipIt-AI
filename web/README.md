# 🌐 ShipIt AI — Web Application & Ingestion Gateway

> Full-stack Next.js 16 application providing the Enterprise Dashboard, GitHub Webhook Ingestion Gateway, Atlassian Jira Release Hub integration, Slack Block-Kit broadcaster, and Supabase Audit Ledger.

---

## ⚡ Quickstart (Self-Hosted)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (or pnpm / yarn)
- **Google Gemini API Key**: [Get a free key here](https://aistudio.google.com/)

### 2. Setup & Installation

```bash
# Install dependencies
npm install

# Create private configuration
cp .env.example .env.local

# Run configuration doctor
npm run doctor

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the main console or [http://localhost:3000/enterprise](http://localhost:3000/enterprise) for the Enterprise Jira & Release Hub studio.

---

## 🩺 Diagnostic Tools

* **CLI Diagnostic Doctor:**
  ```bash
  npm run doctor
  ```
* **API Health & Integrations Check:**
  ```bash
  curl http://localhost:3000/api/health
  ```
* **Run Automated Tests:**
  ```bash
  npm test
  ```

---

## 🐳 Docker Deployment

Build and run in production mode with Docker Compose:

```bash
# Ensure .env.local has your GEMINI_API_KEY
docker compose up -d --build
```

---

## 📖 Complete Documentation

For step-by-step instructions on setting up live GitHub webhooks, Jira Cloud credentials, Slack webhooks, and Supabase PostgreSQL tables, see the [Self-Hosting Guide](../docs/self_hosting_guide.md).
