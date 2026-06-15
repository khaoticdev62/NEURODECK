import { useCallback, useEffect, useState } from "react";
import { Lock, Server, Save, Trash2, Plug, AlertTriangle } from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import { SSHTerminal, type SSHConnectionConfig } from "./SSHTerminal";

export function SSHView() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [keyPath, setKeyPath] = useState("");
  const [authType, setAuthType] = useState<"password" | "key">("password");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedConfig, setConnectedConfig] = useState<SSHConnectionConfig | null>(null);

  const saveCredential = async () => {
    if (!host.trim() || !user.trim()) return;
    setError(null);
    try {
      await neurodeckApi.ssh.saveCredential(
        host.trim(),
        user.trim(),
        authType === "password" ? password : undefined,
        authType === "key" ? keyPath.trim() : undefined
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
    }
  };

  const loadSavedCredential = useCallback(async () => {
    const h = host.trim();
    if (!h) return;
    try {
      const cred = await neurodeckApi.ssh.getCredential(h);
      if (cred.user && !user) setUser(cred.user);
      if (cred.key_path && !keyPath) {
        setKeyPath(cred.key_path);
        setAuthType("key");
      }
    } catch (_) {
      // No saved credential is fine.
    }
  }, [host, user, keyPath]);

  useEffect(() => {
    const t = setTimeout(() => void loadSavedCredential(), 300);
    return () => clearTimeout(t);
  }, [loadSavedCredential]);

  const connect = () => {
    const h = host.trim();
    const u = user.trim();
    const p = parseInt(port, 10);
    if (!h || !u || Number.isNaN(p)) {
      setError("Host, user, and port are required.");
      return;
    }
    setError(null);
    setConnectedConfig({
      host: h,
      port: p,
      user: u,
      authType,
      password: authType === "password" ? password : undefined,
      keyPath: authType === "key" ? keyPath.trim() : undefined,
    });
  };

  const disconnect = () => {
    setConnectedConfig(null);
  };

  const clearForm = () => {
    setHost("");
    setPort("22");
    setUser("");
    setPassword("");
    setKeyPath("");
    setAuthType("password");
    setError(null);
  };

  const inputClass =
    "w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40";

  return (
    <div className="ssh-container flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Lock className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="ssh-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            SSH
          </div>
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
            className={`${inputClass} flex-1`}
          />
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port"
            aria-label="SSH port"
            className={`${inputClass} w-20`}
          />
        </div>

        <input
          id="ssh-user-input"
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Username"
          aria-label="SSH username"
          className={inputClass}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuthType("password")}
            aria-pressed={authType === "password"}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${authType === "password" ? "border-nd-accent/30 bg-nd-accent/10 text-nd-accent" : "border-nd-text-muted/15 text-nd-text-muted"}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setAuthType("key")}
            aria-pressed={authType === "key"}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${authType === "key" ? "border-nd-accent/30 bg-nd-accent/10 text-nd-accent" : "border-nd-text-muted/15 text-nd-text-muted"}`}
          >
            SSH Key
          </button>
        </div>

        {authType === "password" ? (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="SSH password"
            className={inputClass}
          />
        ) : (
          <input
            type="text"
            value={keyPath}
            onChange={(e) => setKeyPath(e.target.value)}
            placeholder="~/.ssh/id_rsa"
            aria-label="SSH key path"
            className={inputClass}
          />
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2 text-xs text-nd-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            id="ssh-connect-btn"
            type="button"
            onClick={connect}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2 text-sm font-medium text-nd-accent hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <Plug className="h-4 w-4" aria-hidden="true" /> Connect
          </button>
          <button
            type="button"
            onClick={saveCredential}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-success/40"
          >
            <Save className="h-4 w-4" aria-hidden="true" /> {saved ? "Saved!" : "Save Profile"}
          </button>
          <button
            type="button"
            onClick={clearForm}
            aria-label="Clear SSH credentials"
            className="rounded-xl border border-nd-text-muted/15 px-4 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {connectedConfig ? (
          <SSHTerminal config={connectedConfig} onClose={disconnect} />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
            <div className="text-center">
              <Server className="mx-auto h-8 w-8 text-nd-text-muted/40" aria-hidden="true" />
              <p className="mt-2 text-sm text-nd-text-muted/70">
                Enter connection details and click Connect.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
