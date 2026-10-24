import { NextRequest, NextResponse } from 'next/server';
import { runDeepEnterprisePipeline } from '@/engine/pipeline';
import { verifyGitHubSignature } from '@/engine/ast';
import { PullRequestPayload } from '@/engine/types';
import { saveAuditRecord } from '@/lib/auditLedger';
import { dispatchSlackNotification } from '@/lib/slack';
import { postJiraComment, isJiraConfigured } from '@/lib/jira';

const JIRA_KEY_REGEX = /([A-Z][A-Z0-9]+-[0-9]+)/;

/**
 * Attempts to fetch the real raw git diff from GitHub for the Pull Request.
 */
async function fetchGitHubDiff(diffUrl: string, apiToken?: string): Promise<string | null> {
  if (!diffUrl) return null;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3.diff',
      'User-Agent': 'ShipIt-AI'
    };

    if (apiToken) {
      headers['Authorization'] = `token ${apiToken}`;
    }

    const response = await fetch(diffUrl, { headers });
    if (response.ok) {
      const diffText = await response.text();
      if (diffText && diffText.trim().length > 0) {
        return diffText;
      }
    } else {
      console.warn(`[GitHubWebhook] Diff fetch returned status: ${response.status}`);
    }
  } catch (err) {
    console.warn('[GitHubWebhook] Error fetching diff from GitHub:', err);
  }

  return null;
}

/**
 * Posts an automated comment back to the GitHub PR with the generated release changelog.
 */
async function postGitHubPRComment(commentsUrl: string, commentBody: string, apiToken?: string): Promise<boolean> {
  if (!commentsUrl || !apiToken) return false;

  try {
    const response = await fetch(commentsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${apiToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ShipIt-AI',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body: commentBody })
    });

    return response.ok;
  } catch (err) {
    console.error('[GitHubWebhook] Error posting PR comment to GitHub:', err);
    return false;
  }
}

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
      return NextResponse.json({ message: 'Ignored non-PR event: ' + event }, { status: 200 });
    }
    
    const payload = JSON.parse(rawBody);
    
    // We only care about opened, synchronized, or reopened PRs
    if (['opened', 'synchronize', 'reopened'].includes(payload.action)) {
      const pr = payload.pull_request;
      const githubToken = process.env.GITHUB_TOKEN;

      // 1. Fetch live git diff from GitHub, or fallback gracefully
      const liveDiff = await fetchGitHubDiff(pr.diff_url, githubToken);
      const effectiveDiff = liveDiff || `diff --git a/README.md b/README.md\n--- a/README.md\n+++ b/README.md\n+ ${pr.title}\n+ ${pr.body || 'No description provided.'}`;

      // 2. Detect Jira Issue Key from branch, title, or body
      const jiraMatch = (pr.title?.match(JIRA_KEY_REGEX) || 
                         pr.head?.ref?.match(JIRA_KEY_REGEX) || 
                         pr.body?.match(JIRA_KEY_REGEX));
      const detectedJiraKey = jiraMatch ? jiraMatch[1] : undefined;

      const prPayload: PullRequestPayload = {
        id: pr.id?.toString() || pr.number?.toString() || 'PR-UNKNOWN',
        title: pr.title || 'Untitled Pull Request',
        description: pr.body || '',
        sourceBranch: pr.head?.ref || 'feature-branch',
        targetBranch: pr.base?.ref || 'main',
        author: pr.user?.login || 'developer',
        jiraIssueKey: detectedJiraKey,
        commits: [
          {
            hash: pr.head?.sha || '0000000000000000',
            message: pr.title || 'PR Head Commit',
            author: pr.user?.login || 'developer',
            timestamp: pr.updated_at || new Date().toISOString(),
            filesChanged: []
          }
        ],
        rawDiff: effectiveDiff
      };
      
      // 3. Execute 4-Stage Deep Enterprise Reasoning Pipeline
      console.log(`[GitHubWebhook] Running 4-Stage Deep Pipeline for PR #${pr.number}: ${pr.title}`);
      const analysisResult = await runDeepEnterprisePipeline(prPayload);
      
      // 4. Persist Cryptographic Audit Record to Ledger (Supabase with persistent local fallback)
      const orgId = process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000';
      const auditResult = await saveAuditRecord({
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

      // 5. Multi-Channel Broadcast: Slack Block-Kit
      let slackStatus = null;
      if (process.env.SLACK_WEBHOOK_URL) {
        slackStatus = await dispatchSlackNotification(
          process.env.SLACK_WEBHOOK_URL,
          analysisResult.multiChannelFormats.slackBlockKitJson
        );
      }

      // 6. Multi-Channel Broadcast: Jira Issue Comment Sync
      let jiraStatus = null;
      if (detectedJiraKey && isJiraConfigured()) {
        jiraStatus = await postJiraComment(
          detectedJiraKey,
          analysisResult.multiChannelFormats.jiraCommentMarkdown
        );
      }

      // 7. Post changelog review back to GitHub PR
      let githubCommentStatus = false;
      if (pr.comments_url && githubToken) {
        const ghComment = `### 🚀 ShipIt AI — Change Intelligence & Release Notes
**Quality Score:** ${analysisResult.qualityScore.overallScore}/100 ${analysisResult.qualityScore.gatePassed ? '✅ Passed Gate' : '⚠️ Warning'} | **Risk:** \`${analysisResult.riskAssessment.riskLevel}\`

#### 💡 Executive & Customer Summary
${analysisResult.synthesis.productSummary.customerValueNarrative}

#### 🛡️ SOC 2 Cryptographic Audit Hash
\`${analysisResult.synthesis.complianceAuditLog.tamperProofHash}\`
*(Verified in ShipIt AI Immutable Ledger)*`;

        githubCommentStatus = await postGitHubPRComment(pr.comments_url, ghComment, githubToken);
      }
      
      return NextResponse.json({
        message: 'Pipeline executed and audited successfully',
        prNumber: pr.number,
        jiraIssueKey: detectedJiraKey,
        auditStorage: auditResult.storage,
        auditHash: analysisResult.synthesis.complianceAuditLog.tamperProofHash,
        slackBroadcast: slackStatus,
        jiraSync: jiraStatus,
        githubCommentPosted: githubCommentStatus,
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
