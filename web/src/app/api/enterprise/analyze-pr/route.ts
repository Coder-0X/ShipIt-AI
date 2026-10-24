import { NextResponse } from 'next/server';
import { runDeepEnterprisePipeline } from '@/engine/pipeline';
import { PullRequestPayload } from '@/engine/types';
import { saveAuditRecord } from '@/lib/auditLedger';

export async function POST(req: Request) {
  try {
    const payload: PullRequestPayload = await req.json();

    if (!payload.title || !payload.commits || payload.commits.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: PR title and at least one commit are required.' },
        { status: 400 }
      );
    }

    console.log(`[Enterprise Engine] Running 4-Stage Deep Analysis on PR: "${payload.title}" (${payload.commits.length} commits)...`);
    const analysisResult = await runDeepEnterprisePipeline(payload);
    console.log(`[Enterprise Engine] Analysis complete. Quality Score: ${analysisResult.qualityScore.overallScore}/100, Risk: ${analysisResult.riskAssessment.riskLevel}`);

    // Persist automatically to immutable audit ledger
    try {
      await saveAuditRecord({
        org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
        pr_id: payload.id || 'PR-LOCAL',
        pr_title: payload.title,
        source_branch: payload.sourceBranch || 'feature',
        author: payload.author || 'Developer',
        risk_level: analysisResult.riskAssessment.riskLevel,
        quality_score: analysisResult.qualityScore.overallScore,
        has_breaking_changes: analysisResult.riskAssessment.hasBreakingChanges,
        tamper_proof_hash: analysisResult.synthesis.complianceAuditLog.tamperProofHash,
        full_synthesis_json: analysisResult.synthesis
      });
    } catch (auditErr) {
      console.warn('[Enterprise Engine] Audit ledger persist warning:', auditErr);
    }

    return NextResponse.json(analysisResult);
  } catch (error: any) {
    console.error('[Enterprise Engine] Error running pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Internal enterprise analysis error', details: error.stack },
      { status: 500 }
    );
  }
}
