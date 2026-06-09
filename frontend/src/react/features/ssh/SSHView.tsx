import { useState } from 'react';
import { Lock, Server, Save, Trash2 } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

export function SSHView() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [saved, setSaved] = useState(false);

  const saveCredential = async () => {
    if (!host.trim() || !user.trim()) return;
    try {
      await neurodeckApi.ssh.saveCredential(
        host.trim(),
        user.trim(),
        authType === 'password' ? password.trim() : undefined,
        authType === 'key' ? keyPath.trim() : undefined
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) { /* ignore */ }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Lock className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">SSH</h2>
          <p className="text-xs text-slate-500">Secure shell connections</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Host"
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
          />
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port"
            className="w-20 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
          />
        </div>

        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Username"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuthType('password')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${authType === 'password' ? 'border-neuro/30 bg-neuro/10 text-neuro' : 'border-white/10 text-slate-400'}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setAuthType('key')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${authType === 'key' ? 'border-neuro/30 bg-neuro/10 text-neuro' : 'border-white/10 text-slate-400'}`}
          >
            SSH Key
          </button>
        </div>

        {authType === 'password' ? (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
          />
        ) : (
          <input
            type="text"
            value={keyPath}
            onChange={(e) => setKeyPath(e.target.value)}
            placeholder="~/.ssh/id_rsa"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
          />
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={saveCredential} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20">
            <Save className="h-4 w-4" /> {saved ? 'Saved!' : 'Save Profile'}
          </button>
          <button type="button" onClick={() => { setHost(''); setUser(''); setPassword(''); setKeyPath(''); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.04]">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-slate-600">Full SSH terminal integration coming in next build.</p>
      </div>
    </div>
  );
}
