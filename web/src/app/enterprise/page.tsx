'use client';

import { useState } from 'react';
import { DeepAnalysisResult } from '@/engine/types';

export default function EnterpriseJiraDemo() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DeepAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<'product' | 'tech' | 'exec' | 'compliance'>('product');
  const [postedToJira, setPostedToJira] = useState(false);
  const [publishedToConfluence, setPublishedToConfluence] = useState(false);
  const [broadcastedToSlack, setBroadcastedToSlack] = useState(false);

  // Sample real-world enterprise Pull Request payload linked to Jira
  const samplePR = {
    id: 'PR-892',
    title: 'PROJ-1042: Implement OAuth2 Session Revocation & Passkey Auth',
    description: 'Upgrades auth cluster to support RFC 7009 token revocation and WebAuthn FIDO2 passkeys.',
    sourceBranch: 'feature/PROJ-1042-oauth2-revocation',
    targetBranch: 'main',
    author: 'alex.chen@enterprise.io',
    jiraIssueKey: 'PROJ-1042',
    commits: [
      {
        hash: 'a9f82c1e84729103948572019283746592817263',
        message: 'feat(auth): add RFC 7009 token revocation endpoint for OAuth2 sessions',
        author: 'Alex Chen',
        timestamp: '2026-08-23T18:30:00Z',
        filesChanged: ['src/services/auth.service.ts', 'src/controllers/token.controller.ts']
      },
      {
        hash: 'b1e73d4c92817462019384756201928374659102',
        message: 'feat(security): integrate WebAuthn FIDO2 biometric passkey registration',
        author: 'Alex Chen',
        timestamp: '2026-08-23T19:15:00Z',
        filesChanged: ['src/lib/webauthn.ts', 'src/models/user-credential.model.ts']
      },
      {
        hash: 'c4d81e9f02938475610293847561029384756102',
        message: 'test(auth): add unit test matrix for revoked bearer tokens across multi-region Redis cluster',
        author: 'Alex Chen',
        timestamp: '2026-08-23T20:00:00Z',
        filesChanged: ['tests/auth/revocation.test.ts']
      }
    ],
    rawDiff: `diff --git a/src/services/auth.service.ts b/src/services/auth.service.ts
+ export async function revokeOAuth2Token(token: string): Promise<boolean> {
+   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
+   await redisCluster.sadd('revoked_tokens', tokenHash);
+   return true;
+ }`
  };

  const handleRunDeepAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/enterprise/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePR)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Enterprise Analysis Failed');
      }
      setAnalysis(data);
    } catch (err: any) {
      console.error('Enterprise Analysis Failed:', err);
      setError(err.message || 'Error running 4-Stage Deep Pipeline.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSlackDispatch = async () => {
    if (!analysis) return;
    try {
      // In a real app, you would prompt for or fetch the webhook URL from settings.
      // We will send a mock one just to show the API flow.
      await fetch('/api/enterprise/dispatch-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: 'https://hooks.slack.com/services/MOCK/URL',
          blockKitPayload: analysis.multiChannelFormats.slackBlockKitJson
        })
      });
      setBroadcastedToSlack(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadSOC2 = async () => {
    if (!analysis) return;
    try {
      const res = await fetch('/api/enterprise/export-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis })
      });
      const data = await res.json();
      
      if (res.ok && data.soc2Report) {
        // Trigger file download
        const blob = new Blob([JSON.stringify(data.soc2Report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soc2-traceability-${analysis.pullRequest.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
                Atlassian Forge Enterprise Suite
              </span>
              <span className="text-xs font-mono text-zinc-500">v2.0.0-enterprise</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">
              Jira Change Intelligence & "Virtual PM" Platform
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Automated Code Review, Plain-English Multi-Persona Translation, and SOC 2 Audit Traceability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a href="/" className="text-xs font-mono text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
              ← Back to Web App
            </a>
            <a href="/dashboard" className="text-xs font-mono text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
              Dashboard
            </a>
            <button
              onClick={handleRunDeepAnalysis}
              disabled={analyzing}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-5 py-2 rounded-lg text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-emerald-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Running 4-Stage Reasoning Pipeline...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span>Simulate GitHub PR Ingestion</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-300">Live GitHub Ingestion Ready</h4>
            <p className="text-xs text-blue-400/80 mt-1">Configure your GitHub repository webhook to point to: <code className="bg-blue-950 px-1.5 py-0.5 rounded text-blue-200">https://your-domain.com/api/webhooks/github</code> with your HMAC secret. The new AST boundary analyzer will automatically chunk diffs and strip lockfiles.</p>
          </div>
        </div>

        {/* Main Grid: Mock Jira Issue View + ShipIt AI Forge Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (8 Cols): Jira Issue Details */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Jira Issue Mock Card */}
            <div className="border border-zinc-800 bg-[#121215] rounded-xl p-6 shadow-xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-900/30 text-blue-400 border border-blue-800 font-mono text-xs px-2 py-0.5 rounded font-semibold">
                    PROJ-1042
                  </span>
                  <span className="text-zinc-400 text-sm font-medium">/ Software Development Board</span>
                </div>
                <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded font-mono">
                  Status: IN CODE REVIEW
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  {samplePR.title}
                </h2>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  {samplePR.description}
                </p>
              </div>

              {/* Linked GitHub Commits Sub-section */}
              <div className="space-y-3 bg-darkBg/60 border border-zinc-800/80 rounded-lg p-4 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
                    Linked Pull Request: {samplePR.id} ({samplePR.commits.length} commits)
                  </span>
                  <span className="text-zinc-500">Branch: {samplePR.sourceBranch}</span>
                </div>

                <div className="space-y-2 pt-2">
                  {samplePR.commits.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-zinc-400 bg-zinc-900/80 p-2 rounded border border-zinc-800">
                      <span className="text-emerald-400 font-bold">{c.hash.slice(0, 7)}</span>
                      <span className="text-zinc-200">{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jira Activity Comments Stream */}
              {postedToJira && (
                <div className="border-t border-zinc-800 pt-4 space-y-3 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                      ShipIt AI Bot (Automated Change Summary)
                    </span>
                    <span>Just now</span>
                  </div>
                  <div className="bg-[#18181b] border border-zinc-700 rounded-lg p-4 font-mono text-xs whitespace-pre-wrap text-zinc-300">
                    {analysis?.multiChannelFormats.jiraCommentMarkdown}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Column (5 Cols): The Atlassian Forge ShipIt AI Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border border-emerald-900/60 bg-[#121215] rounded-xl overflow-hidden shadow-2xl">
              
              {/* Forge Panel Title Header */}
              <div className="bg-gradient-to-r from-emerald-950/80 to-zinc-900 px-5 py-4 border-b border-emerald-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="font-bold text-sm text-white tracking-tight">
                    ShipIt AI Change Intelligence
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400 bg-darkBg px-2 py-0.5 rounded border border-zinc-800">
                  Jira Forge Panel
                </span>
              </div>

              {!analysis && !analyzing && !error && (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <p className="text-zinc-300 font-medium text-sm">No analysis run yet</p>
                  <p className="text-zinc-500 text-xs">
                    Click "Simulate GitHub PR Ingestion" to run the 4-Stage Deep Reasoning Pipeline.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-6 text-center space-y-3 bg-red-950/20 border-t border-red-900/40 font-mono text-xs">
                  <div className="text-red-400 font-bold flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Pipeline Error
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed font-sans">{error}</p>
                </div>
              )}

              {analyzing && (
                <div className="p-8 text-center space-y-4 font-mono text-xs">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
                  <div className="text-zinc-400 space-y-1">
                    <p className="text-emerald-400 font-bold">Analyzing AST Diffs & Commit Standards...</p>
                    <p className="text-zinc-500">Sanitizing Secrets ➔ Scoring Health ➔ Synthesizing Views</p>
                  </div>
                </div>
              )}

              {analysis && (
                <div className="p-5 space-y-5">
                  
                  {/* Quality & Risk Score Badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-darkBg border border-zinc-800 p-3 rounded-lg">
                      <div className="text-[11px] font-mono text-zinc-500 uppercase">PR Quality Score</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                        {analysis.qualityScore.overallScore} / 100
                        <span className="text-xs font-normal text-zinc-400">({analysis.qualityScore.clarityRating})</span>
                      </div>
                    </div>

                    <div className="bg-darkBg border border-zinc-800 p-3 rounded-lg">
                      <div className="text-[11px] font-mono text-zinc-500 uppercase">Blast Radius Risk</div>
                      <div className={`text-xl font-bold mt-1 ${analysis.riskAssessment.riskLevel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {analysis.riskAssessment.riskLevel}
                      </div>
                    </div>
                  </div>

                  {/* Persona Selector Tabs */}
                  <div className="flex border-b border-zinc-800 bg-darkBg/50 p-1 rounded-lg gap-1">
                    {[
                      { id: 'product', label: 'Product & CS' },
                      { id: 'tech', label: 'Architecture' },
                      { id: 'exec', label: 'Executive' },
                      { id: 'compliance', label: 'SOC2 Audit' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePersona(tab.id as any)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${activePersona === tab.id ? 'bg-zinc-800 text-emerald-400 font-bold shadow' : 'text-zinc-400 hover:text-white'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Persona Content Area */}
                  <div className="bg-darkBg border border-zinc-800/80 rounded-lg p-4 space-y-3 text-xs leading-relaxed">
                    {activePersona === 'product' && (
                      <div className="space-y-2">
                        <div className="font-bold text-zinc-200 text-sm">{analysis.synthesis.productSummary.headline}</div>
                        <p className="text-zinc-400">{analysis.synthesis.productSummary.customerValueNarrative}</p>
                        <div className="pt-2">
                          <span className="text-zinc-500 font-mono text-[11px] uppercase">Key Customer Value:</span>
                          <ul className="list-disc list-inside text-zinc-300 space-y-1 mt-1">
                            {analysis.synthesis.productSummary.keyBenefits.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {activePersona === 'tech' && (
                      <div className="space-y-2">
                        <div className="font-bold text-zinc-200">Architectural Note:</div>
                        <p className="text-zinc-400">{analysis.synthesis.technicalSummary.architecturalImpact}</p>
                        <div className="pt-2 font-mono text-[11px]">
                          <span className="text-zinc-500 uppercase">Changed Components:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {analysis.synthesis.technicalSummary.changedComponents.map((c, i) => (
                              <span key={i} className="bg-zinc-800 text-emerald-300 px-2 py-0.5 rounded border border-zinc-700">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activePersona === 'exec' && (
                      <div className="space-y-2">
                        <div className="font-bold text-zinc-200">Executive Briefing:</div>
                        <p className="text-zinc-300 italic">"{analysis.synthesis.executiveBrief.oneLiner}"</p>
                        <div className="pt-2">
                          <span className="text-zinc-500 font-mono text-[11px] uppercase">Business Objective:</span>
                          <p className="text-emerald-400 font-medium mt-0.5">{analysis.synthesis.executiveBrief.businessObjective}</p>
                        </div>
                      </div>
                    )}

                    {activePersona === 'compliance' && (
                      <div className="space-y-2 font-mono text-[11px]">
                        <div className="flex justify-between border-b border-zinc-800 pb-1">
                          <span className="text-zinc-500">Change Type:</span>
                          <span className="text-emerald-400 font-bold">{analysis.synthesis.complianceAuditLog.changeType}</span>
                        </div>
                        <div className="space-y-1 pt-1">
                          <span className="text-zinc-500">Audit Justification:</span>
                          <p className="text-zinc-300 font-sans text-xs">{analysis.synthesis.complianceAuditLog.justification}</p>
                        </div>
                        <div className="space-y-1 pt-2">
                          <span className="text-zinc-500">Tamper-Proof SHA-256 Hash:</span>
                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800 text-[10px] text-zinc-400 break-all select-all">
                            {analysis.synthesis.complianceAuditLog.tamperProofHash}
                          </div>
                        </div>
                        <div className="pt-3">
                          <button onClick={handleDownloadSOC2} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-1.5 rounded border border-zinc-700 text-xs transition-colors">
                            Download SOC2 Traceability Record (JSON)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 1-Click Multi-Channel Enterprise Actions */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <span className="font-mono text-[11px] text-zinc-500 uppercase">1-Click Enterprise Broadcast</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPostedToJira(true)}
                        className={`py-2 px-3 rounded text-xs font-semibold border transition-all ${postedToJira ? 'bg-blue-900/40 text-blue-300 border-blue-700' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'}`}
                      >
                        {postedToJira ? '✓ Posted to Jira' : 'Post to Jira'}
                      </button>

                      <button
                        onClick={() => setPublishedToConfluence(true)}
                        className={`py-2 px-3 rounded text-xs font-semibold border transition-all ${publishedToConfluence ? 'bg-purple-900/40 text-purple-300 border-purple-700' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'}`}
                      >
                        {publishedToConfluence ? '✓ In Confluence' : 'To Confluence'}
                      </button>

                      <button
                        onClick={handleSlackDispatch}
                        className={`py-2 px-3 rounded text-xs font-semibold border transition-all ${broadcastedToSlack ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'}`}
                      >
                        {broadcastedToSlack ? '✓ In #slack' : 'Push to Slack'}
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
