import { NextResponse } from 'next/server';
import { isJiraConfigured } from '@/lib/jira';

/**
 * Health Check & Self-Hosted Configuration Diagnostic Endpoint.
 * Used by Docker, Kubernetes, Cloud Run, and developers to verify
 * container readiness and active live integration capabilities.
 */
export async function GET() {
  const isSupabaseLive = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('mock')
  );

  const isSlackLive = Boolean(
    process.env.SLACK_WEBHOOK_URL &&
    !process.env.SLACK_WEBHOOK_URL.includes('MOCK/URL') &&
    !process.env.SLACK_WEBHOOK_URL.includes('YOUR_SECRET_TOKEN')
  );

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.4.0-self-hosted',
    uptime: process.uptime(),
    deploymentMode: 'self-hosted',
    integrations: {
      geminiEngine: {
        active: Boolean(process.env.GEMINI_API_KEY),
        model: 'gemini-3.1-flash-lite'
      },
      github: {
        webhookConfigured: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
        prCommenterConfigured: Boolean(process.env.GITHUB_TOKEN)
      },
      jiraCloud: {
        active: isJiraConfigured(),
        host: process.env.JIRA_HOST || null,
        mode: isJiraConfigured() ? 'live' : 'simulated'
      },
      slack: {
        active: isSlackLive,
        mode: isSlackLive ? 'live' : 'simulated'
      },
      auditLedger: {
        active: true,
        backend: isSupabaseLive ? 'supabase' : 'local-persistent-file',
        tamperProofSha256: true
      }
    }
  }, { status: 200 });
}
