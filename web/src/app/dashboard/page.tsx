'use client';
import { useState, useEffect } from 'react';

type ApiKey = {
  key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

export default function DashboardPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchKeys();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      
      if (res.ok) {
        const data = await res.json();
        setKeys([data.apiKey, ...keys]);
        setNewKeyName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (key: string) => {
    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.key !== key));
        showToast('API Key revoked.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('API Key copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-zinc-100 font-sans">

      {/* Toast */}
      <div className={`fixed bottom-4 right-4 bg-zinc-800 text-white px-4 py-3 rounded-lg shadow-xl z-50 font-mono text-sm border border-zinc-700 flex items-center gap-2 transition-all duration-300 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        {toast}
      </div>

      {/* Navigation Header */}
      <header className="border-b border-zinc-800 bg-darkBg/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="font-bold text-xl tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            ShipIt AI
          </a>
          <div className="flex items-center gap-4">
            <a href="/enterprise" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Enterprise</a>
            <a href="/dashboard" className="text-sm font-medium text-emerald-400">Dashboard</a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-8 md:p-16 space-y-12">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Developer Dashboard
          </h1>
          <p className="text-zinc-400 mt-2">Manage your API keys for the Chrome Extension and Workspace Add-ons.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
          <h2 className="text-xl font-semibold">Generate New Key</h2>
          <form onSubmit={handleGenerateKey} className="flex space-x-4">
            <input 
              type="text" 
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Chrome Extension Laptop" 
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-4 py-2 focus:outline-none focus:border-emerald-500"
              required
            />
            <button 
              type="submit" 
              disabled={generating}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-6 py-2 rounded transition-colors"
            >
              {generating ? 'Generating...' : 'Create Key'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Active Keys</h2>
          
          {loading ? (
            <p className="text-zinc-500">Loading keys...</p>
          ) : keys.length === 0 ? (
            <div className="border border-zinc-800 border-dashed p-8 rounded-xl text-center text-zinc-500">
              No API keys generated yet.
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.key} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-200">{k.name}</h3>
                    <div className="text-xs text-zinc-500 mt-1 space-x-4">
                      <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                      <span>Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded font-mono text-xs text-emerald-400 select-all">
                      {k.key.substring(0, 12)}••••••••••••
                    </div>
                    <button 
                      onClick={() => copyToClipboard(k.key)}
                      className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                    <button 
                      onClick={() => handleRevokeKey(k.key)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
