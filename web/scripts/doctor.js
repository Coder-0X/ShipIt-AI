#!/usr/bin/env node

/**
 * ShipIt AI Self-Hosted Environment Diagnostics (Doctor)
 * Validates your local setup and verifies configuration for all live integrations.
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.example');

console.log('\n🚀 \x1b[1m\x1b[36mShipIt AI — Self-Hosted Environment Doctor\x1b[0m');
console.log('='.repeat(55));

// 1. Check Node.js version
const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
if (major >= 18) {
  console.log(`\x1b[32m✔ Node.js runtime:\x1b[0m ${nodeVersion} (Supported)`);
} else {
  console.log(`\x1b[31m✖ Node.js runtime:\x1b[0m ${nodeVersion} (Requires Node v18+)`);
}

// 2. Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.log(`\n\x1b[31m✖ Missing .env.local configuration file!\x1b[0m`);
  console.log(`  Run: \x1b[33mcp .env.example .env.local\x1b[0m and populate your keys.\n`);
  process.exit(1);
}

console.log(`\x1b[32m✔ Configuration file:\x1b[0m .env.local found`);

// Parse .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
});

console.log('\n\x1b[1m--- Integration Status ---\x1b[0m');

// Helper check
function checkKey(name, label, isRequired = false) {
  const val = env[name];
  const isSet = Boolean(val && !val.includes('your_') && !val.includes('mock') && val !== '');
  if (isSet) {
    console.log(`\x1b[32m✔ [LIVE]\x1b[0m ${label} (${name}): Configured`);
    return true;
  } else if (isRequired) {
    console.log(`\x1b[31m✖ [REQUIRED]\x1b[0m ${label} (${name}): Missing or placeholder`);
    return false;
  } else {
    console.log(`\x1b[33m⚠ [SIMULATED]\x1b[0m ${label} (${name}): Not set (Graceful fallback active)`);
    return false;
  }
}

// 3. Gemini Core Engine (Required)
const hasGemini = checkKey('GEMINI_API_KEY', 'Google Gemini AI Engine', true);

// 4. GitHub Ingestion
const hasGhSecret = checkKey('GITHUB_WEBHOOK_SECRET', 'GitHub Webhook HMAC');
const hasGhToken = checkKey('GITHUB_TOKEN', 'GitHub PR Commenter Token');

// 5. Atlassian Jira Cloud
const hasJiraHost = Boolean(env.JIRA_HOST && !env.JIRA_HOST.includes('yourcompany'));
const hasJiraEmail = Boolean(env.JIRA_EMAIL && !env.JIRA_EMAIL.includes('yourcompany'));
const hasJiraToken = Boolean(env.JIRA_API_TOKEN && !env.JIRA_API_TOKEN.includes('your_'));
if (hasJiraHost && hasJiraEmail && hasJiraToken) {
  console.log(`\x1b[32m✔ [LIVE]\x1b[0m Jira Cloud & Release Hubs: Configured (${env.JIRA_HOST})`);
} else {
  console.log(`\x1b[33m⚠ [SIMULATED]\x1b[0m Jira Cloud & Release Hubs: Not set (Simulated responses active)`);
}

// 6. Slack Block-Kit
const hasSlack = checkKey('SLACK_WEBHOOK_URL', 'Slack Incoming Webhook');

// 7. Supabase Audit Ledger
const hasSupabaseUrl = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.includes('mock') && !env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project'));
const hasSupabaseKey = Boolean(env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_ROLE_KEY.includes('mock') && !env.SUPABASE_SERVICE_ROLE_KEY.includes('your_'));
if (hasSupabaseUrl && hasSupabaseKey) {
  console.log(`\x1b[32m✔ [LIVE]\x1b[0m Supabase Cryptographic Ledger: Configured (${env.NEXT_PUBLIC_SUPABASE_URL})`);
} else {
  console.log(`\x1b[33m⚠ [LOCAL LEDGER]\x1b[0m Supabase Ledger: Not set (Local persistent JSON fallback active)`);
}

console.log('='.repeat(55));

if (!hasGemini) {
  console.log(`\n\x1b[31mAction Required:\x1b[0m GEMINI_API_KEY is required to run the reasoning engine.`);
  console.log(`Get a free key at: \x1b[34mhttps://aistudio.google.com/\x1b[0m\n`);
  process.exit(1);
} else {
  console.log(`\n\x1b[32m✔ Ready to run!\x1b[0m Start your server with: \x1b[36mnpm run dev\x1b[0m\n`);
}
