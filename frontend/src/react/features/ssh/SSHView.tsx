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
    <div className="ssh-container flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Lock className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="ssh-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">SSH</div>
          <h2 className="text-lg font-semibold text-nd-text">SSH</h2>
          <p className="text-xs text-nd-text-muted">Secure shell connections</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-3 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-6">
        <div className="flex gap-2">
          <input
            id="ssh-host-input"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Host"
            aria-label="SSH host"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port"
            aria-label="SSH port"
            className="w-20 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
        </div>

        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Username"
          aria-label="SSH username"
          className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuthType('password')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${authType === 'password' ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 text-nd-text-muted'}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setAuthType('key')}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${authType === 'key' ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 text-nd-text-muted'}`}
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
            className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
        ) : (
          <input
            type="text"
            value={keyPath}
            onChange={(e) => setKeyPath(e.target.value)}
            placeholder="~/.ssh/id_rsa"
            className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={saveCredential} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20">
            <Save className="h-4 w-4" /> {saved ? 'Saved!' : 'Save Profile'}
          </button>
          <button type="button" onClick={() => { setHost(''); setUser(''); setPassword(''); setKeyPath(''); }} className="rounded-xl border border-nd-text-muted/15 px-4 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
        <p className="text-sm text-nd-text-muted/70">Full SSH terminal integration coming in next build.</p>
      </div>
    </div>
  );
}
