'use client';

import { useState } from 'react';

export default function Home() {
  const [commits, setCommits] = useState('');
  const [tone, setTone] = useState('hype');
  const [customTone, setCustomTone] = useState('');
  const [activeTab, setActiveTab] = useState('twitter');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEmpty, setShowEmpty] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const [diffLines, setDiffLines] = useState<{type: 'removed'|'added', text: string}[]>([]);
  const [outputData, setOutputData] = useState({ twitter: '', linkedin: '', changelog: '', email: '' });
  
  const [showToast, setShowToast] = useState(false);
  
  // Mock User State (Phase 2 - will come from Supabase)
  const isProUser = false; 

  const startGeneration = async () => {
    if (!commits.trim()) return;

    setIsGenerating(true);
    setShowEmpty(false);
    setShowOutput(false);
    setShowLoading(true);
    setDiffLines([]);

    try {
      const finalTone = tone === 'custom' ? customTone : tone;
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk_dev_bypass_123'
        },
        body: JSON.stringify({ commits, tone: finalTone })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Sequence the animation
      const oldLines = commits.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
      
      const getStr = (val: any) => Array.isArray(val) ? val.join('\\n') : (typeof val === 'string' ? val : JSON.stringify(val || ''));
      const newLines = getStr(data.twitter).split('\n').filter((l: string) => l.trim().length > 0).slice(0, 3);

      let delay = 500;
      
      oldLines.forEach((line: string) => {
        setTimeout(() => {
          setDiffLines(prev => [...prev, { type: 'removed', text: line }]);
        }, delay);
        delay += 400;
      });

      delay += 600;

      newLines.forEach((line: string) => {
        setTimeout(() => {
          setDiffLines(prev => [...prev, { type: 'added', text: line }]);
        }, delay);
        delay += 500;
      });

      delay += 800;
      
      setTimeout(() => {
        const normalizedData = {
          twitter: getStr(data.twitter),
          linkedin: getStr(data.linkedin),
          changelog: getStr(data.changelog),
          email: getStr(data.email)
        };
        setOutputData(normalizedData);
        setShowLoading(false);
        setShowOutput(true);
        setIsGenerating(false);
      }, delay);

    } catch (error: any) {
      console.error(error);
      setDiffLines([{ type: 'removed', text: error.message || 'Error connecting to AI.' }]);
      setTimeout(() => {
        setIsGenerating(false);
        setShowLoading(false);
        setShowEmpty(true);
      }, 4000);
    }
  };

  const copyToClipboard = async () => {
    const text = outputData[activeTab as keyof typeof outputData];
    if (!text) return;
    
    await navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const tryExample = () => {
    setCommits("feat(auth): implement magic link login\nfix(api): resolve race condition in webhook processing\nrefactor: migrate dashboard to React Server Components\nchore: drop support for IE11");
  };

  const handleCustomToneClick = () => {
    if (!isProUser) {
      setShowPricingModal(true);
    } else {
      setTone('custom');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-zinc-100 bg-darkBg">
      
      {/* Toast Notification */}
      <div className={`fixed bottom-4 right-4 bg-zinc-800 text-white px-4 py-3 rounded-lg shadow-xl z-50 font-mono text-sm border border-zinc-700 flex items-center gap-2 transition-all duration-300 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        Copied to clipboard!
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800 bg-darkBg/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            ShipIt AI
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Dashboard</a>
            <a href="/enterprise" className="text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Enterprise Jira Suite
            </a>
            <button onClick={() => setShowPricingModal(true)} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Pricing</button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto px-6 py-12 w-full flex flex-col gap-12">
        
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Turn Git Commits into Viral Product Updates.</h1>
          <p className="text-zinc-400 text-lg">Stop agonizing over marketing copy. Paste your messy technical notes, and let AI write your Twitter thread, changelog, and email update in seconds.</p>
        </section>

        {/* App Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative">
          
          {/* Left Side: Input */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="block font-mono text-sm text-zinc-400">Your messy notes/commits:</label>
              <button onClick={tryExample} className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                Try an example
              </button>
            </div>
            
            <textarea 
              rows={8} 
              value={commits}
              onChange={e => setCommits(e.target.value)}
              className="w-full bg-darkCard border border-zinc-700 rounded-xl p-4 font-mono text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-y shadow-inner" 
              placeholder="feat: add dark mode support..."
            />

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <span className="font-mono text-xs text-zinc-500 whitespace-nowrap">Tone:</span>
              {['hype', 'pro', 'tech', 'minimal'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTone(t)}
                  className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${tone === t ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30' : 'border-zinc-700 text-zinc-400 hover:text-white bg-darkBg'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
              
              {/* Custom Brand Voice Button */}
              <button 
                onClick={handleCustomToneClick}
                className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap flex items-center gap-1 ${tone === 'custom' ? 'border-amber-500 text-amber-400 bg-amber-950/30' : isProUser ? 'border-zinc-700 text-zinc-400 hover:text-white bg-darkBg' : 'opacity-50 border-dashed border-zinc-700 text-zinc-400 hover:text-white'}`}
              >
                Custom Voice
                {!isProUser && <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>}
              </button>
            </div>

            {/* Custom Tone Input (Only visible if Pro user selects Custom) */}
            {tone === 'custom' && isProUser && (
              <input 
                type="text" 
                value={customTone}
                onChange={e => setCustomTone(e.target.value)}
                placeholder="e.g. Snarky Gen-Z founder..."
                className="w-full bg-darkCard border border-amber-900 rounded-lg p-3 font-mono text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
              />
            )}

            <button 
              onClick={startGeneration}
              disabled={isGenerating || !commits.trim()}
              className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              <span>{isGenerating ? 'Generating...' : 'Generate Release Assets'}</span>
            </button>
          </div>

          {/* Right Side: Output */}
          <div className="flex flex-col gap-4">
            <div className="relative min-h-[400px] border border-zinc-800 rounded-xl bg-darkCard/50 overflow-hidden flex flex-col shadow-2xl">
              
              {showEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                  <p className="text-zinc-400 font-medium">Paste your commits above.</p>
                </div>
              )}

              {showLoading && (
                <div className="absolute inset-0 bg-darkCard z-20 flex flex-col p-6 font-mono text-sm overflow-hidden">
                  <div className="text-zinc-500 mb-4 animate-pulse">Running semantic analysis...</div>
                  <div className="space-y-2">
                    {diffLines.map((line, i) => (
                      <div key={i} className={`diff-line ${line.type === 'removed' ? 'removed' : 'added'}`}>
                        <span className="diff-line-number">{i + 1}</span>
                        <span className="diff-sign">{line.type === 'removed' ? '-' : '+'}</span>
                        <span className="truncate">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showOutput && (
                <div className="flex flex-col h-full animate-in fade-in duration-500">
                  <div className="flex border-b border-zinc-800 bg-zinc-900/80 px-2 overflow-x-auto scrollbar-hide">
                    {['twitter', 'linkedin', 'changelog', 'email'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`font-mono text-xs px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'text-emerald-400 border-emerald-400 bg-emerald-950/10' : 'text-zinc-500 border-transparent hover:text-white'}`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex-grow relative bg-[#0d0d0f] min-h-[300px]">
                    <textarea 
                      readOnly
                      value={outputData[activeTab as keyof typeof outputData] || ''}
                      className="w-full h-full absolute inset-0 bg-transparent resize-none font-sans text-[15px] leading-relaxed text-zinc-200 focus:outline-none p-4"
                    />
                  </div>
                </div>
              )}
            </div>

            {showOutput && (
              <div className="flex justify-end items-center gap-4 px-2 animate-in fade-in">
                <button onClick={startGeneration} className="text-zinc-400 hover:text-white p-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
                <button onClick={copyToClipboard} className="bg-zinc-800 text-white px-5 py-2 rounded flex items-center gap-2 text-sm font-medium">
                  Copy text
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-darkCard border border-zinc-700 rounded-2xl max-w-2xl w-full p-8 relative shadow-2xl">
            <button onClick={() => setShowPricingModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Ship faster. Grow your audience.</h2>
              <p className="text-zinc-400 mt-2">Choose the plan that fits your workflow.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Tier */}
              <div className="border border-zinc-800 bg-darkBg rounded-xl p-6 relative">
                <h3 className="font-mono text-zinc-300 mb-1">Starter</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-white">$15</span>
                  <span className="text-zinc-500 text-sm">/mo</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm text-zinc-400">
                  <li className="flex gap-2">✓ 50 Generations / month</li>
                  <li className="flex gap-2">✓ 4 Output Formats</li>
                  <li className="flex gap-2">✓ Standard Tones</li>
                </ul>
                <button className="w-full bg-zinc-800 text-white font-medium py-2 rounded-lg hover:bg-zinc-700 transition">Get Started</button>
              </div>

              {/* Pro Tier */}
              <div className="border border-emerald-900/50 bg-emerald-950/10 rounded-xl p-6 relative shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-emerald-950 text-xs font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">Popular</div>
                <h3 className="font-mono text-emerald-400 mb-1">Pro Developer</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-white">$29</span>
                  <span className="text-zinc-500 text-sm">/mo</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm text-zinc-300">
                  <li className="flex gap-2 text-emerald-400">✓ Unlimited Generations (Fair Use)</li>
                  <li className="flex gap-2 text-emerald-400">✓ <b>Custom Brand Voice</b></li>
                  <li className="flex gap-2 opacity-70">✓ GitHub Integration (Soon)</li>
                </ul>
                
                <button className="w-full bg-emerald-500 text-emerald-950 font-bold py-2 rounded-lg hover:bg-emerald-400 transition mb-3">
                  Upgrade to Pro
                </button>
                <button className="w-full bg-[#24292e]/50 border border-zinc-700 text-zinc-500 font-medium py-2 rounded-lg cursor-not-allowed">
                  Connect GitHub (Pro)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
