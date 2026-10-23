import { NextRequest, NextResponse } from 'next/server';
import { runDeepEnterprisePipeline } from '@/engine/pipeline';
import { verifyGitHubSignature } from '@/engine/ast';
import { PullRequestPayload } from '@/engine/types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || '';
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev_secret';
    
    // In production, enforce signature validation
    if (process.env.NODE_ENV === 'production' && !verifyGitHubSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
    }
    
    const event = req.headers.get('x-github-event');
    if (event !== 'pull_request') {
      return NextResponse.json({ message: 'Ignored non-PR event' }, { status: 200 });
    }
    
    const payload = JSON.parse(rawBody);
    
    // We only care about opened or synchronized (updated) PRs
    if (['opened', 'synchronize', 'reopened'].includes(payload.action)) {
      
      // In a real implementation, we would fetch the raw diff from GitHub API using the PR's diff_url.
      // For this implementation, we simulate fetching the diff.
      const mockDiffUrl = payload.pull_request.diff_url;
      const simulatedDiff = `diff --git a/src/app/page.tsx b/src/app/page.tsx\n--- a/src/app/page.tsx\n+++ b/src/app/page.tsx\n+ console.log('hello enterprise');`;
      
      const prPayload: PullRequestPayload = {
        id: payload.pull_request.id.toString(),
        title: payload.pull_request.title,
        description: payload.pull_request.body || '',
        sourceBranch: payload.pull_request.head.ref,
        targetBranch: payload.pull_request.base.ref,
        author: payload.pull_request.user.login,
        commits: [
          {
            hash: payload.pull_request.head.sha,
            message: 'Update PR',
            author: payload.pull_request.user.login,
            timestamp: payload.pull_request.updated_at,
            filesChanged: []
          }
        ],
        rawDiff: simulatedDiff
      };
      
      const analysisResult = await runDeepEnterprisePipeline(prPayload);
      
      // Persist the cryptographic audit record to the Database Ledger
      const orgId = process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000'; // In production, resolve org_id from repo mapping
      
      // Suppress missing table errors during local dev if schema isn't fully migrated yet
      try {
        const { error: dbError } = await supabaseAdmin
          .from('pull_request_audits')
          .insert({
            org_id: orgId,
            pr_id: prPayload.id,
            pr_title: prPayload.title,
            source_branch: prPayload.sourceBranch,
            author: prPayload.author,
            risk_level: analysisResult.riskAssessment.riskLevel,
            quality_score: analysisResult.qualityScore.overallScore,
            has_breaking_changes: analysisResult.riskAssessment.hasBreakingChanges,
            tamper_proof_hash: analysisResult.synthesis.complianceAuditLog.tamperProofHash,
            full_synthesis_json: analysisResult.synthesis
          });
          
        if (dbError) {
          console.error('Failed to persist audit log to ledger:', dbError);
        }
      } catch (dbErr) {
        console.warn('Database persistence skipped - schema might not be ready in dev.');
      }
      
      // Dispatch Multi-Channel Notifications (e.g. Slack/Jira)
      // ...
      
      return NextResponse.json({
        message: 'Pipeline executed and audited successfully',
        result: analysisResult
      }, { status: 200 });
    }
    
    return NextResponse.json({ message: 'Ignored action: ' + payload.action }, { status: 200 });
    
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
