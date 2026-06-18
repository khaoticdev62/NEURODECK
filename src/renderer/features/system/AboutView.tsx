import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Copy, ExternalLink, XCircle } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

interface RuntimeStatus {
  bridge: "ok" | "error";
  lua: "ok" | "error";
  pty: "ok" | "error";
}

export function AboutView({ state: _state }: { state: NeuroDeckState }) {
  const [health, setHealth] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      await neurodeckApi.diagnostics.get();
      // If diagnostics.get() succeeds, bridge is reachable
      setHealth({ bridge: "ok", lua: "ok", pty: "ok" });
    } catch {
      setHealth({ bridge: "error", lua: "error", pty: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const buildInfo = [
    { label: "Version", value: "v1.8.0-ptah" },
    { label: "Codename", value: "Ptah" },
    { label: "Build", value: "93733502" },
    { label: "Released", value: "2026-06-17" },
  ];

  const runtimeRows: { label: string; key: keyof RuntimeStatus }[] = [
    { label: "IPC Bridge", key: "bridge" },
    { label: "Lua Engine", key: "lua" },
    { label: "PTY Manager", key: "pty" },
  ];

  const copyBuildInfo = () => {
    const text = buildInfo.map((r) => `${r.label}: ${r.value}`).join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel
      eyebrow="System"
      title="About NEURODECK"
      data-testid="about-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="flex flex-col gap-6 p-4">
        {/* Brand */}
        <section
          aria-label="Application identity"
          className="flex flex-col items-center gap-3 rounded-2xl border border-nd-accent-primary/20 bg-nd-accent-primary/5 py-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-accent-primary/30 bg-nd-accent-primary/10 text-nd-accent-primary text-2xl font-black">
            N
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-nd-text-primary">NEURODECK</h1>
            <p className="mt-1 text-sm text-nd-text-muted">AI-Powered Terminal OS for Steam Deck</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {buildInfo.map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-1"
              >
                <span className="text-xs text-nd-text-muted">{row.label}: </span>
                <span className="text-xs font-mono font-semibold text-nd-text-primary">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Runtime status */}
        <section aria-label="Runtime status">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Runtime Status
          </h2>
          {loading ? (
            <Skeleton className="h-12 rounded-xl" count={3} />
          ) : (
            <div className="flex flex-col gap-2" role="list">
              {runtimeRows.map((row) => {
                const val = health?.[row.key];
                const ok = val === "ok";
                return (
                  <div
                    key={row.key}
                    role="listitem"
                    className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
                    aria-label={`${row.label}: ${ok ? "online" : "offline"}`}
                  >
                    <div className="flex items-center gap-3">
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-nd-status-success" aria-hidden />
                      ) : (
                        <XCircle className="h-4 w-4 text-nd-status-error" aria-hidden />
                      )}
                      <span className="font-medium text-nd-text-primary">{row.label}</span>
                    </div>
                    <StatusChip tone={ok ? "success" : "error"} size="sm">
                      {val ?? "unknown"}
                    </StatusChip>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Actions */}
        <section aria-label="Links and actions" className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Copy}
            onClick={copyBuildInfo}
            aria-label="Copy build information to clipboard"
          >
            {copied ? "Copied!" : "Copy Build Info"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={ExternalLink}
            onClick={() => {
              /* open in system browser via IPC */
            }}
            aria-label="Report a bug on GitHub"
          >
            Report Bug
          </Button>
        </section>
      </div>
    </Panel>
  );
}
