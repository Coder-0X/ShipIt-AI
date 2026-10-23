import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import {
  PullRequestPayload,
  SecurityAndRiskAssessment,
  MultiPersonaSynthesis,
  DeepAnalysisResult
} from './types';
import { sanitizeDiff } from './sanitizer';
import { scoreCommitsAndPR } from './scorer';
import { formatJiraComment, formatConfluenceXhtml, formatSlackBlockKit } from './formatters';
import { parseAndChunkDiff } from './ast';
import { withRetry } from '../lib/withRetry';

// Only disable TLS verification in local development (e.g., behind a corporate proxy)
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function runDeepEnterprisePipeline(
  payload: PullRequestPayload
): Promise<DeepAnalysisResult> {
  const startTime = new Date().toISOString();

  // Step 0: AST Boundary Analyzer & Security Perimeter
  const astFilteredDiff = parseAndChunkDiff(payload.rawDiff || '');
  const sanitizedDiff = sanitizeDiff(astFilteredDiff);
  const commitListStr = payload.commits.map(c => `- [${c.hash.slice(0, 7)}] ${c.message}`).join('\n');

  // Step 1: Deterministic & Rule-based Scoring
  const qualityScore = scoreCommitsAndPR(payload.commits, payload.sourceBranch, payload.title);

  // =========================================================================
  // STAGE 1: Semantic Intent, Security & Blast-Radius Risk Classifier
  // =========================================================================
  const stage1Prompt = `You are a Principal Security & Software Architect conducting an enterprise change review.
Analyze the following Pull Request metadata and sanitized diff.

PR Title: ${payload.title}
PR Description: ${payload.description}
Branch: ${payload.sourceBranch} -> ${payload.targetBranch}
Commits:
${commitListStr}

Sanitized Diff Preview (truncated):
${sanitizedDiff.sanitizedContent.slice(0, 4000)}

Evaluate and return a strict JSON object with no markdown backticks:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "blastRadius": "UI_ONLY" | "APPLICATION_LOGIC" | "DATABASE_SCHEMA" | "SECURITY_AUTH" | "INFRASTRUCTURE",
  "hasBreakingChanges": boolean,
  "breakingChangeDetails": string[],
  "securitySensitiveFiles": string[],
  "detectedVulnerabilities": string[]
}`;

function cleanJson(text: string): string {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  return match ? match[1] : text.replace(/```json\n?|```/g, '');
}

  const stage1Response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: stage1Prompt,
    config: { temperature: 0.1, responseMimeType: "application/json" }
  }));
  const riskAssessment: SecurityAndRiskAssessment = JSON.parse(cleanJson(stage1Response.text || "{}"));


  // =========================================================================
  // STAGE 2 & 3: Multi-Persona Synthesis (Product, Tech, Exec, Compliance)
  // =========================================================================
  const stage3Prompt = `You are an elite Enterprise Release Management AI for Jira and Atlassian Cloud.
Translate this technical change into 4 specialized stakeholder personas.

Context:
PR Title: ${payload.title}
Risk Level: ${riskAssessment.riskLevel}
Blast Radius: ${riskAssessment.blastRadius}
Breaking Changes: ${riskAssessment.hasBreakingChanges}
Commits:
${commitListStr}

Generate a raw JSON object with no markdown wrapping:
{
  "productSummary": {
    "headline": "Short punchy user-facing headline",
    "customerValueNarrative": "2-3 sentences explaining in plain English what customers can now do or what annoying issue was fixed. Zero technical jargon.",
    "keyBenefits": ["Benefit 1", "Benefit 2"],
    "affectedUserPersonas": ["End Users", "Workspace Admins", "etc"]
  },
  "technicalSummary": {
    "architecturalImpact": "Concise explanation of internal architectural changes, component refactors, or database alterations.",
    "changedComponents": ["e.g. Auth Service", "Billing API"],
    "migrationStepsRequired": boolean,
    "migrationNotes": "Any environment variable or migration commands needed",
    "deprecations": []
  },
  "executiveBrief": {
    "oneLiner": "One sentence summary for Directors and VP of Engineering.",
    "businessObjective": "Primary business goal (e.g. Reduce Churn, Unblock Enterprise Deal, Scale Throughput)"
  },
  "complianceAuditLog": {
    "changeType": "FEATURE" | "BUGFIX" | "SECURITY_PATCH" | "MAINTENANCE",
    "justification": "Clear compliance rationale explaining why this change was merged to production.",
    "affectedSystems": ["Systems affected"],
    "riskMitigation": "Controls or testing in place to ensure system stability."
  }
}`;

  const stage3Response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: stage3Prompt,
    config: { temperature: 0.3, responseMimeType: "application/json" }
  }));
  const rawSynthesis = JSON.parse(cleanJson(stage3Response.text || "{}"));


  // =========================================================================
  // STAGE 4: Anti-Hallucination Critic & Integrity Verifier
  // =========================================================================
  const stage4Prompt = `You are a strict QA Compliance Critic.
Cross-reference the generated stakeholder summaries against the raw commits to ensure:
1. No fabricated/hallucinated features were claimed that are missing in the commits.
2. Tone is professional, clear, and devoid of AI clichés (e.g. "delve", "supercharge", "testament").

Commits:
${commitListStr}

Draft Synthesis:
${JSON.stringify(rawSynthesis)}

Return the final refined JSON object matching the exact structure of the draft with any inaccuracies or fluff removed.`;

  const stage4Response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: stage4Prompt,
    config: { temperature: 0.2, responseMimeType: "application/json" }
  }));
  const verifiedSynthesis = JSON.parse(cleanJson(stage4Response.text || JSON.stringify(rawSynthesis)));

  // Generate SHA-256 Tamper-Proof Audit Hash
  const hashPayload = `${payload.id}-${payload.title}-${JSON.stringify(verifiedSynthesis.complianceAuditLog)}-${startTime}`;
  const tamperProofHash = crypto.createHash('sha256').update(hashPayload).digest('hex');
  verifiedSynthesis.complianceAuditLog.tamperProofHash = tamperProofHash;

  const synthesis: MultiPersonaSynthesis = verifiedSynthesis;

  // Format Multi-Channel Outputs
  const jiraCommentMarkdown = formatJiraComment(payload, qualityScore, riskAssessment, synthesis);
  const confluenceStorageXhtml = formatConfluenceXhtml(payload.title, 'Sprint Release', synthesis, riskAssessment);
  const slackBlockKitJson = formatSlackBlockKit(payload, qualityScore, synthesis);

  return {
    pullRequest: payload,
    riskAssessment,
    qualityScore,
    synthesis,
    multiChannelFormats: {
      jiraCommentMarkdown,
      confluenceStorageXhtml,
      slackBlockKitJson,
      emailHtml: `<div style="font-family: sans-serif;"><h2>${synthesis.executiveBrief.oneLiner}</h2><p>${synthesis.productSummary.customerValueNarrative}</p></div>`
    },
    processingTimestamp: startTime,
    engineVersion: '2.0.0-enterprise'
  };
}
