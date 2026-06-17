import { useCallback, useEffect, useState } from "react";
import { Lock, Server, Save, Trash2, Plug } from "lucide-react";
import { EmptyState } from "../../components/primitives/EmptyState";
import { neurodeckApi } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { TextInput } from "../../components/primitives/TextInput";
import { ErrorState } from "../../components/primitives/ErrorState";
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
    } catch (e) {
      setError(`Failed to load saved credential: ${String(e)}`);
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

  return (
    <div className="ssh-container flex h-full flex-col overflow-hidden">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Lock className="h-5 w-5 text-nd-accent-primary" />
        </div>
        <div className="flex-1">
          <div className="ssh-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            SSH
          </div>
          <h2 className="text-lg font-semibold text-nd-text-primary">SSH</h2>
          <p className="text-xs text-nd-text-muted">Secure shell connections</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-3 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-6">
        <div className="flex gap-2">
          <TextInput
            id="ssh-host-input"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Host"
            label="Host"
            aria-label="SSH host"
            fullWidth
            className="flex-1"
          />
          <TextInput
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port"
            label="Port"
            aria-label="SSH port"
            className="w-20"
          />
        </div>

        <TextInput
          id="ssh-user-input"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Username"
          label="Username"
          aria-label="SSH username"
          fullWidth
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant={authType === "password" ? "primary" : "secondary"}
            onClick={() => setAuthType("password")}
            aria-pressed={authType === "password"}
            className="min-h-touch flex-1"
          >
            Password
          </Button>
          <Button
            type="button"
            variant={authType === "key" ? "primary" : "secondary"}
            onClick={() => setAuthType("key")}
            aria-pressed={authType === "key"}
            className="min-h-touch flex-1"
          >
            SSH Key
          </Button>
        </div>

        {authType === "password" ? (
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            label="Password"
            aria-label="SSH password"
            fullWidth
          />
        ) : (
          <TextInput
            type="text"
            value={keyPath}
            onChange={(e) => setKeyPath(e.target.value)}
            placeholder="~/.ssh/id_rsa"
            label="Key path"
            aria-label="SSH key path"
            fullWidth
          />
        )}

        {error && (
          <ErrorState
            title="SSH error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <div className="flex gap-2 pt-2">
          <Button
            id="ssh-connect-btn"
            variant="primary"
            icon={Plug}
            className="min-h-touch flex-1"
            onClick={connect}
          >
            Connect
          </Button>
          <Button
            variant="secondary"
            icon={Save}
            className="min-h-touch flex-1"
            onClick={() => void saveCredential()}
          >
            {saved ? "Saved!" : "Save Profile"}
          </Button>
          <IconButton aria-label="Clear SSH credentials" variant="ghost" size="touch" onClick={clearForm}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {connectedConfig ? (
          <SSHTerminal config={connectedConfig} onClose={disconnect} />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
            <EmptyState
              icon={Server}
              title="Ready to connect"
              description="Enter host, user, and credentials above, then click Connect to open a secure shell session."
              variant="deck"
            />
          </div>
        )}
      </div>
    </div>
  );
}
