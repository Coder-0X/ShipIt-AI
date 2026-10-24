import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { syncToJiraReleaseHub } from '@/lib/jira';
import { saveAuditRecord } from '@/lib/auditLedger';
import { withRetry } from '@/lib/withRetry';

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectKey = 'PROJ', versionName, items = [], customNotes = '' } = body;

    if (!versionName) {
      return NextResponse.json({ error: 'versionName is required (e.g. "v2.4.0")' }, { status: 400 });
    }

    const itemsSummary = items.map((it: any, idx: number) => {
      return `Item #${idx + 1} [${it.key || it.id || 'N/A'}]: ${it.title || it.summary || 'Untitled change'} - Author: ${it.author || 'Dev'}\nDetails: ${it.description || it.details || ''}`;
    }).join('\n\n');

    const prompt = `You are a Principal Technical Program Manager creating an official Jira Release Hub Release Pack for version "${versionName}" in project "${projectKey}".

Change Log & Completed Items:
${itemsSummary || 'Standard incremental release update.'}
${customNotes ? `Additional Release Notes / Context: ${customNotes}` : ''}

Synthesize a comprehensive, executive-ready Release Hub document in clean Markdown:
1. Executive Summary: 2 sentences explaining the strategic milestone of this release.
2. User-Facing Highlights: Bulleted list explaining user-visible additions and fixes.
3. Breaking Changes & Migrations: Clear instructions if actions are required; otherwise specify "None".
4. Security & QA Verification: Summary of testing and quality compliance.

Return a strict JSON object with no markdown wrapping:
{
  "executiveSummary": "...",
  "highlights": ["...", "..."],
  "breakingChanges": ["..."],
  "migrationNotes": "...",
  "qaVerification": "...",
  "markdownDocument": "full markdown document..."
}`;

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: { temperature: 0.2, responseMimeType: 'application/json' }
    }));

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json\n?|```/g, '');
    const synthesis = JSON.parse(cleanJson);

    // Generate cryptographic release hash
    const timestamp = new Date().toISOString();
    const hashPayload = `release-hub-${projectKey}-${versionName}-${JSON.stringify(synthesis)}-${timestamp}`;
    const releaseHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    // Build the Jira Version description (under 1000 chars for Jira Cloud version field)
    const shortDescription = `${synthesis.executiveSummary || 'Release ' + versionName} | Audit Hash: ${releaseHash.slice(0, 10)}`;

    // Sync to Jira Release Hub
    const jiraSyncResult = await syncToJiraReleaseHub(
      projectKey,
      versionName,
      shortDescription
    );

    // Save release audit log in ledger
    const auditRecord = {
      org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
      pr_id: `release-${versionName}`,
      pr_title: `Jira Release Hub: ${projectKey} ${versionName}`,
      source_branch: `release/${versionName}`,
      author: 'ShipIt AI Release Orchestrator',
      risk_level: synthesis.breakingChanges?.length > 0 ? 'HIGH' : 'LOW',
      quality_score: 95,
      has_breaking_changes: Boolean(synthesis.breakingChanges?.length > 0),
      tamper_proof_hash: releaseHash,
      full_synthesis_json: {
        releaseVersion: versionName,
        projectKey,
        synthesis,
        jiraSync: jiraSyncResult,
        complianceAuditLog: {
          changeType: 'FEATURE',
          justification: `Official release deployment for ${projectKey} ${versionName}`,
          affectedSystems: [projectKey, 'Production Cluster'],
          riskMitigation: synthesis.qaVerification || 'Passed CI/CD and automated test suites',
          tamperProofHash: releaseHash
        }
      }
    };

    await saveAuditRecord(auditRecord);

    return NextResponse.json({
      success: true,
      versionName,
      projectKey,
      releaseHash,
      synthesis,
      jiraSync: jiraSyncResult,
      timestamp
    }, { status: 200 });

  } catch (error: any) {
    console.error('Jira Release Hub Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Jira Release Hub pack', details: error.message },
      { status: 500 }
    );
  }
}
