import { NextResponse } from 'next/server';
import { runDeepEnterprisePipeline } from '@/engine/pipeline';
import { PullRequestPayload } from '@/engine/types';

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

    return NextResponse.json(analysisResult);
  } catch (error: any) {
    console.error('[Enterprise Engine] Error running pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Internal enterprise analysis error', details: error.stack },
      { status: 500 }
    );
  }
}
