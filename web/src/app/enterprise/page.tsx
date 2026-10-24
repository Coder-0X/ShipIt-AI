'use client';

import { useState, useEffect } from 'react';
import { DeepAnalysisResult } from '@/engine/types';

interface AuditItem {
  id: string;
  pr_id: string;
  pr_title: string;
  source_branch: string;
  author: string;
  risk_level: string;
  quality_score: number;
  tamper_proof_hash: string;
  created_at: string;
}

export default function EnterpriseJiraDemo() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DeepAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<'product' | 'tech' | 'exec' | 'compliance'>('product');
  
  // Jira Actions
  const [postingToJira, setPostingToJira] = useState(false);
  const [jiraResult, setJiraResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // Slack Actions
  const [customSlackUrl, setCustomSlackUrl] = useState('');
  const [broadcastingSlack, setBroadcastingSlack] = useState(false);
  const [slackResult, setSlackResult] = useState<{ success: boolean; message: string; simulated?: boolean } | null>(null);

  // Jira Release Hub State
  const [releaseProjectKey, setReleaseProjectKey] = useState('PROJ');
  const [releaseVersionName, setReleaseVersionName] = useState('v2.4.0');
  const [releaseCustomNotes, setReleaseCustomNotes] = useState('Includes OAuth2 RFC 7009 revocation, FIDO2 WebAuthn passkeys, and multi-region Redis cluster failover.');
  const [generatingReleaseHub, setGeneratingReleaseHub] = useState(false);
  const [releaseHubResult, setReleaseHubResult] = useState<any | null>(null);

  // Audit Ledger & Hash Verification State
  const [recentAudits, setRecentAudits] = useState<AuditItem[]>([]);
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [verifyingHash, setVerifyingHash] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  // Active view section
  const [activeView, setActiveView] = useState<'pr-inspector' | 'release-hub' | 'audit-ledger'>('pr-inspector');

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

  const fetchRecentAudits = async () => {
    try {
      const res = await fetch('/api/enterprise/audits');
      if (res.ok) {
        const data = await res.json();
        setRecentAudits(data.records || []);
      }
    } catch (e) {
      console.warn('Failed fetching recent audits:', e);
    }
  };

  useEffect(() => {
    fetchRecentAudits();
  }, []);

  const handleRunDeepAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    setJiraResult(null);
    setSlackResult(null);
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
      fetchRecentAudits();
    } catch (err: any) {
      console.error('Enterprise Analysis Failed:', err);
      setError(err.message || 'Error running 4-Stage Deep Pipeline.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePostToJira = async () => {
    if (!analysis) return;
    setPostingToJira(true);
    setJiraResult(null);
    try {
      const res = await fetch('/api/enterprise/jira/post-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueKey: analysis.pullRequest.jiraIssueKey || 'PROJ-1042',
          commentMarkdown: analysis.multiChannelFormats.jiraCommentMarkdown
        })
      });
      const data = await res.json();
      setJiraResult({
        success: res.ok,
        message: data.message || 'Comment posted',
        url: data.url
      });
    } catch (err: any) {
      setJiraResult({
        success: false,
        message: err.message || 'Failed to communicate with Jira API'
      });
    } finally {
      setPostingToJira(false);
    }
  };

  const handleSlackDispatch = async () => {
    if (!analysis) return;
    setBroadcastingSlack(true);
    setSlackResult(null);
    try {
      const res = await fetch('/api/enterprise/dispatch-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: customSlackUrl.trim() || undefined,
          blockKitPayload: analysis.multiChannelFormats.slackBlockKitJson
        })
      });
      const data = await res.json();
      setSlackResult({
        success: res.ok,
        message: data.message || 'Slack broadcast processed',
        simulated: data.simulated
      });
    } catch (err: any) {
      setSlackResult({
        success: false,
        message: err.message || 'Network error reaching Slack'
      });
    } finally {
      setBroadcastingSlack(false);
    }
  };

  const handleGenerateReleaseHub = async () => {
    setGeneratingReleaseHub(true);
    setReleaseHubResult(null);
    try {
      const res = await fetch('/api/enterprise/jira/release-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectKey: releaseProjectKey,
          versionName: releaseVersionName,
          customNotes: releaseCustomNotes,
          items: [
            {
              key: 'PROJ-1042',
              title: 'Implement OAuth2 Session Revocation & Passkey Auth',
              author: 'Alex Chen',
              details: 'RFC 7009 revocation, FIDO2 biometric authentication'
            },
            {
              key: 'PROJ-1043',
              title: 'Multi-Region Redis Cluster Session Failover',
              author: 'Sarah Lin',
              details: 'Zero-downtime Redis failover with active-active replication'
            }
          ]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed generating release hub pack');
      setReleaseHubResult(data);
      fetchRecentAudits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingReleaseHub(false);
    }
  };

  const handleVerifyHash = async (hashToVerify?: string) => {
    const target = hashToVerify || verifyHashInput;
    if (!target) return;
    setVerifyingHash(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/enterprise/verify-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: target.trim() })
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setVerificationResult({ verified: false, message: err.message });
    } finally {
      setVerifyingHash(false);
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
                Enterprise Integration Engine
              </span>
              <span className="text-xs font-mono text-zinc-500">v2.4.0-orchestrated</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">
              ShipIt AI Release Orchestrator
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Live GitHub PR Ingestion, Atlassian Jira Release Hubs, Slack Block-Kit Broadcasts & Cryptographic Audit Ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="/" className="text-xs font-mono text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
              ← Home
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
                  <span>Ingest & Analyze PR</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-zinc-800 gap-2">
          <button
            onClick={() => setActiveView('pr-inspector')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === 'pr-inspector' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            PR Intelligence & Jira Comment
          </button>
          <button
            onClick={() => setActiveView('release-hub')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === 'release-hub' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Jira Release Hub Studio
          </button>
          <button
            onClick={() => setActiveView('audit-ledger')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeView === 'audit-ledger' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Audit Ledger & Hash Verifier
          </button>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: PR INSPECTOR & MULTI-CHANNEL SYNC */}
        {/* ======================================================== */}
        {activeView === 'pr-inspector' && (
          <div className="space-y-6">
            
            {/* Live Webhook Info Banner */}
            <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 className="text-sm font-semibold text-blue-300">Live GitHub Ingestion Endpoint Active</h4>
                  <p className="text-xs text-blue-400/80 mt-1">
                    Route: <code className="bg-blue-950 px-1.5 py-0.5 rounded text-blue-200 font-mono">POST /api/webhooks/github</code>. Automatically fetches raw diffs, parses Jira keys, validates conventional commits, and persists to the cryptographic ledger.
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 shrink-0">
                Target Issue: <span className="text-emerald-400 font-bold">{samplePR.jiraIssueKey}</span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-950/30 border border-red-900 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Grid Layout: PR Metadata on Left, AI Forge Panel on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (7 Cols): Mock Jira Card + Diff preview */}
              <div className="lg:col-span-7 space-y-6">
                <div className="border border-zinc-800 bg-[#121215] rounded-xl p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/30 text-blue-400 border border-blue-800 font-mono text-xs px-2.5 py-1 rounded font-semibold">
                        {samplePR.jiraIssueKey}
                      </span>
                      <span className="text-zinc-400 text-sm font-medium">/ Auth Platform Board</span>
                    </div>
                    <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded font-mono">
                      Status: IN CODE REVIEW
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white">{samplePR.title}</h2>
                    <p className="text-sm text-zinc-400 mt-1">{samplePR.description}</p>
                  </div>

                  {/* Commits List */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Included Commits (3)</span>
                    <div className="space-y-1.5">
                      {samplePR.commits.map(c => (
                        <div key={c.hash} className="text-xs font-mono bg-zinc-900 border border-zinc-800/80 rounded p-2 flex items-center justify-between">
                          <span className="text-zinc-300 truncate">{c.message}</span>
                          <span className="text-zinc-600 shrink-0 ml-2">{c.hash.slice(0, 7)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code Diff Preview */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Sanitized Diff Snapshot</span>
                    <pre className="text-xs font-mono bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-emerald-400/90 overflow-x-auto">
                      {samplePR.rawDiff}
                    </pre>
                  </div>
                </div>

                {/* Slack Dispatch Settings Box */}
                <div className="border border-zinc-800 bg-[#121215] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <h3 className="text-sm font-bold text-zinc-200">Slack Block-Kit Automated Broadcast</h3>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">Interactive Webhook</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Custom Slack Incoming Webhook URL (or leave blank to use server .env)"
                      value={customSlackUrl}
                      onChange={(e) => setCustomSlackUrl(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 px-3 py-2 rounded-lg flex-1 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSlackDispatch}
                      disabled={!analysis || broadcastingSlack}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {broadcastingSlack ? 'Broadcasting...' : 'Broadcast to Slack'}
                    </button>
                  </div>

                  {slackResult && (
                    <div className={`p-3 rounded-lg text-xs font-mono border ${slackResult.success ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                      {slackResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (5 Cols): AI Synthesis & Multi-Persona Output */}
              <div className="lg:col-span-5 space-y-6">
                <div className="border border-zinc-800 bg-[#121215] rounded-xl p-6 shadow-xl space-y-6">
                  
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      ShipIt AI Intelligence
                    </span>
                    {analysis && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono px-2 py-0.5 rounded">
                        Score: {analysis.qualityScore.overallScore}/100
                      </span>
                    )}
                  </div>

                  {!analysis && !analyzing && (
                    <div className="text-center py-16 text-zinc-500 text-sm space-y-3">
                      <svg className="w-10 h-10 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <p>Click <strong>"Ingest & Analyze PR"</strong> to trigger the 4-stage Gemini reasoning engine.</p>
                    </div>
                  )}

                  {analyzing && (
                    <div className="text-center py-16 space-y-3">
                      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-xs font-mono text-zinc-400">Classifying AST diffs & synthesizing 4 personas...</p>
                    </div>
                  )}

                  {analysis && (
                    <div className="space-y-5 text-sm">
                      
                      {/* Risk & Health Metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Blast Radius Risk</span>
                          <div className={`text-base font-bold mt-1 ${analysis.riskAssessment.riskLevel === 'CRITICAL' ? 'text-red-400' : analysis.riskAssessment.riskLevel === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {analysis.riskAssessment.riskLevel}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">{analysis.riskAssessment.blastRadius}</span>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Breaking Changes</span>
                          <div className={`text-base font-bold mt-1 ${analysis.riskAssessment.hasBreakingChanges ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {analysis.riskAssessment.hasBreakingChanges ? 'YES' : 'NONE'}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">Gate: {analysis.qualityScore.gatePassed ? 'PASSED' : 'HOLD'}</span>
                        </div>
                      </div>

                      {/* Multi-Persona Tabs */}
                      <div className="border border-zinc-800 rounded-lg p-1 bg-zinc-900 flex text-xs">
                        {(['product', 'tech', 'exec', 'compliance'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActivePersona(tab)}
                            className={`flex-1 py-1.5 rounded capitalize font-medium transition-all ${activePersona === tab ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Persona Output Display */}
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 text-xs space-y-3">
                        {activePersona === 'product' && (
                          <div className="space-y-2">
                            <h4 className="font-bold text-white text-sm">{analysis.synthesis.productSummary.headline}</h4>
                            <p className="text-zinc-300 leading-relaxed">{analysis.synthesis.productSummary.customerValueNarrative}</p>
                            <div className="pt-2">
                              <span className="text-[11px] font-mono text-zinc-500 uppercase">Key User Benefits:</span>
                              <ul className="list-disc list-inside text-zinc-400 mt-1 space-y-1">
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
                            <p className="text-zinc-400 leading-relaxed">{analysis.synthesis.technicalSummary.architecturalImpact}</p>
                            <div className="pt-2 font-mono text-[11px]">
                              <span className="text-zinc-500 uppercase">Modified Components:</span>
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
                            <p className="text-zinc-300 italic text-sm">"{analysis.synthesis.executiveBrief.oneLiner}"</p>
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
                              <div className="bg-zinc-950 p-2 rounded border border-zinc-800 text-[10px] text-emerald-400 break-all select-all font-mono">
                                {analysis.synthesis.complianceAuditLog.tamperProofHash}
                              </div>
                            </div>
                            <div className="pt-2">
                              <button onClick={handleDownloadSOC2} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 rounded border border-zinc-700 text-xs transition-colors">
                                Download SOC 2 Traceability JSON
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 1-Click Outbound Actions */}
                      <div className="space-y-3 pt-2 border-t border-zinc-800">
                        <span className="font-mono text-[11px] text-zinc-500 uppercase">Outbound Multi-Surface Sync</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handlePostToJira}
                            disabled={postingToJira}
                            className="py-2.5 px-3 rounded text-xs font-semibold border border-blue-800 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 transition-all flex items-center justify-center gap-1.5"
                          >
                            {postingToJira ? 'Posting...' : `Sync to Jira (${analysis.pullRequest.jiraIssueKey || 'Issue'})`}
                          </button>

                          <button
                            onClick={handleSlackDispatch}
                            disabled={broadcastingSlack}
                            className="py-2.5 px-3 rounded text-xs font-semibold border border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 transition-all flex items-center justify-center gap-1.5"
                          >
                            {broadcastingSlack ? 'Broadcasting...' : 'Broadcast to #slack'}
                          </button>
                        </div>

                        {jiraResult && (
                          <div className={`p-3 rounded-lg text-xs font-mono border ${jiraResult.success ? 'bg-blue-950/30 border-blue-800 text-blue-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                            {jiraResult.message}
                            {jiraResult.url && (
                              <div className="mt-1">
                                <a href={jiraResult.url} target="_blank" rel="noreferrer" className="underline hover:text-white">
                                  View in Jira →
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: JIRA RELEASE HUB STUDIO */}
        {/* ======================================================== */}
        {activeView === 'release-hub' && (
          <div className="space-y-6">
            <div className="border border-zinc-800 bg-[#121215] rounded-xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-blue-400">🔷</span>
                  Jira Release Hub Version Pack Orchestration
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Aggregates multiple completed tickets and PRs into an executive-ready Release Hub version note package and syncs directly to Atlassian Jira Cloud.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Jira Project Key</label>
                  <input
                    type="text"
                    value={releaseProjectKey}
                    onChange={(e) => setReleaseProjectKey(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Target FixVersion / Release Name</label>
                  <input
                    type="text"
                    value={releaseVersionName}
                    onChange={(e) => setReleaseVersionName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Sprint Context & Additional Change Notes</label>
                <textarea
                  rows={3}
                  value={releaseCustomNotes}
                  onChange={(e) => setReleaseCustomNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateReleaseHub}
                  disabled={generatingReleaseHub}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center gap-2"
                >
                  {generatingReleaseHub ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Synthesizing Release Pack...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate & Sync to Jira Release Hub</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>

              {releaseHubResult && (
                <div className="mt-6 border-t border-zinc-800 pt-6 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-blue-950/20 border border-blue-900 p-4 rounded-xl">
                    <div>
                      <div className="text-xs font-mono text-blue-400 uppercase font-semibold">Jira Release Hub Sync Status</div>
                      <div className="text-sm text-white font-medium mt-0.5">{releaseHubResult.jiraSync?.message}</div>
                    </div>
                    {releaseHubResult.jiraSync?.releaseNotesUrl && (
                      <a
                        href={releaseHubResult.jiraSync.releaseNotesUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 text-white font-semibold text-xs px-3.5 py-2 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap self-start md:self-auto"
                      >
                        Open in Jira Release Hub ↗
                      </a>
                    )}
                  </div>

                  <div className="space-y-4 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800">
                    <div>
                      <span className="text-xs font-mono text-zinc-500 uppercase">Executive Milestone Summary</span>
                      <p className="text-zinc-200 mt-1 text-sm leading-relaxed">{releaseHubResult.synthesis?.executiveSummary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase">Feature Highlights</span>
                        <ul className="list-disc list-inside text-zinc-300 text-xs mt-1.5 space-y-1">
                          {releaseHubResult.synthesis?.highlights?.map((h: string, i: number) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs font-mono text-zinc-500 uppercase">Security & QA Verification</span>
                        <p className="text-zinc-300 text-xs mt-1.5 leading-relaxed">{releaseHubResult.synthesis?.qaVerification}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800">
                      <span className="text-xs font-mono text-zinc-500 uppercase">Immutable Release Ledger Hash</span>
                      <div className="bg-zinc-950 p-2.5 rounded font-mono text-xs text-emerald-400 select-all break-all mt-1 border border-zinc-800">
                        {releaseHubResult.releaseHash}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: CRYPTOGRAPHIC AUDIT LEDGER & HASH VERIFIER */}
        {/* ======================================================== */}
        {activeView === 'audit-ledger' && (
          <div className="space-y-6">
            
            {/* Hash Verification Tool */}
            <div className="border border-zinc-800 bg-[#121215] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">🛡️</span>
                <h3 className="text-lg font-bold text-white">Cryptographic Tamper-Proof Audit Verifier</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Enter any SHA-256 tamper-proof audit hash to independently verify its authenticity against the immutable ledger (Supabase/Persistent storage).
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Paste SHA-256 Hash (e.g. 5a1b3c...)"
                  value={verifyHashInput}
                  onChange={(e) => setVerifyHashInput(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 px-3.5 py-2.5 rounded-lg flex-1 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={() => handleVerifyHash()}
                  disabled={!verifyHashInput.trim() || verifyingHash}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {verifyingHash ? 'Verifying...' : 'Verify Cryptographic Hash'}
                </button>
              </div>

              {verificationResult && (
                <div className={`p-4 rounded-xl text-xs font-mono border mt-3 ${verificationResult.verified ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                  <div className="font-bold text-sm mb-1">
                    {verificationResult.verified ? '✅ Cryptographic Verification PASSED' : '❌ Verification FAILED'}
                  </div>
                  <p>{verificationResult.message}</p>
                  {verificationResult.verifiedRecord && (
                    <div className="mt-3 pt-3 border-t border-emerald-900/60 space-y-1 text-zinc-300">
                      <div><strong>PR / Release:</strong> {verificationResult.verifiedRecord.pullRequestInfo?.title} ({verificationResult.verifiedRecord.pullRequestInfo?.id})</div>
                      <div><strong>Author:</strong> {verificationResult.verifiedRecord.pullRequestInfo?.author}</div>
                      <div><strong>Risk Level:</strong> {verificationResult.verifiedRecord.riskMetrics?.riskLevel} | <strong>Score:</strong> {verificationResult.verifiedRecord.riskMetrics?.qualityScore}/100</div>
                      <div><strong>Audit Justification:</strong> {verificationResult.verifiedRecord.auditJustification}</div>
                      <div><strong>Timestamp:</strong> {verificationResult.verifiedRecord.timestamp}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Audit Records Table */}
            <div className="border border-zinc-800 bg-[#121215] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Immutable Ledger History</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Recent pull request change management records</p>
                </div>
                <button
                  onClick={fetchRecentAudits}
                  className="text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800"
                >
                  Refresh
                </button>
              </div>

              {recentAudits.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                  No audit records logged yet. Run a PR analysis or receive a GitHub webhook to record the first ledger entry.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-3">PR / Entity</th>
                        <th className="py-2.5 px-3">Author</th>
                        <th className="py-2.5 px-3">Risk</th>
                        <th className="py-2.5 px-3">Quality</th>
                        <th className="py-2.5 px-3">Tamper-Proof Hash</th>
                        <th className="py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {recentAudits.map((item) => (
                        <tr key={item.tamper_proof_hash} className="hover:bg-zinc-900/40">
                          <td className="py-3 px-3 text-white font-medium font-sans">
                            {item.pr_title}
                            <span className="block text-[11px] text-zinc-500 font-mono">{item.pr_id}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-400">{item.author}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.risk_level === 'CRITICAL' || item.risk_level === 'HIGH' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                              {item.risk_level}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-zinc-300">{item.quality_score}/100</td>
                          <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                            {item.tamper_proof_hash.slice(0, 14)}...
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => {
                                setVerifyHashInput(item.tamper_proof_hash);
                                handleVerifyHash(item.tamper_proof_hash);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold underline"
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
