import { useState, useCallback } from "react";
import { CheckCircle2, Download, RefreshCcw } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { Toggle } from "../../components/primitives/Toggle";
import type { NeuroDeckState } from "../../types/neurodeck";

type UpdateStatus = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "error";

const VERSION_HISTORY = [
  { version: "v1.8.0-ptah", date: "2026-06-17", summary: "AAAA hardening, 77-screen wireframes" },
  { version: "v1.7.0-sekhmet", date: "2026-05-22", summary: "React 18 migration, TypeScript strict" },
  { version: "v1.6.0-sobek", date: "2026-04-15", summary: "Rust bridge refactor, axum server" },
];

export function UpdateCenterView({ state: _state }: { state: NeuroDeckState }) {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [autoCheck, setAutoCheck] = useState(true);
  const [autoInstall, setAutoInstall] = useState(false);
  const [channel, setChannel] = useState<"stable" | "beta" | "nightly">("stable");

  const handleCheck = useCallback(async () => {
    setStatus("checking");
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("up-to-date");
  }, []);

  return (
    <Panel
      eyebrow="System"
      title="Update Center"
      data-testid="update-center-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="flex flex-col gap-6 p-4">
        {/* Current version */}
        <section
          aria-label="Current version"
          className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
            Installed
          </p>
          <p className="mt-1 text-xl font-black text-nd-text-primary">v1.8.0-ptah</p>
          <p className="text-sm text-nd-text-muted">
            Codename: Ptah · Released 2026-06-17 · Build 93733502
          </p>
        </section>

        {/* Update status */}
        <section aria-label="Update status">
          {status === "up-to-date" && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl border border-nd-status-success/30 bg-nd-status-success/5 p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-nd-status-success" aria-hidden />
              <p className="font-medium text-nd-text-primary">You are up to date.</p>
            </div>
          )}
          {status === "available" && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center justify-between gap-3 rounded-2xl border border-nd-accent-primary/30 bg-nd-accent-primary/5 p-4"
            >
              <div>
                <p className="font-bold text-nd-text-primary">Update available</p>
                <p className="text-sm text-nd-text-muted">A newer version is ready to install.</p>
              </div>
              <Button variant="primary" size="sm" icon={Download}>
                Install Update
              </Button>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCcw}
              loading={status === "checking"}
              onClick={() => void handleCheck()}
              aria-label="Check for updates"
            >
              {status === "checking" ? "Checking…" : "Check for Updates"}
            </Button>
          </div>
        </section>

        {/* Settings */}
        <section aria-label="Update settings">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Update Settings
          </h2>
          <div className="flex flex-col gap-3">
            <SettingRow
              label="Auto-check for updates"
              description="Periodically check for new versions"
              checked={autoCheck}
              onChange={() => setAutoCheck((v) => !v)}
            />
            <SettingRow
              label="Auto-install updates"
              description="Install updates automatically when available (requires restart)"
              checked={autoInstall}
              onChange={() => setAutoInstall((v) => !v)}
            />
            <div className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3">
              <div>
                <p className="font-medium text-nd-text-primary">Update channel</p>
                <p className="text-sm text-nd-text-muted">Choose release stability</p>
              </div>
              <div className="flex gap-1">
                {(["stable", "beta", "nightly"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      channel === ch
                        ? "bg-nd-accent-primary/20 text-nd-accent-primary"
                        : "text-nd-text-muted hover:text-nd-text-secondary"
                    }`}
                    aria-pressed={channel === ch}
                  >
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Update history */}
        <section aria-label="Update history">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Update History
          </h2>
          <div className="flex flex-col gap-2" role="list">
            {VERSION_HISTORY.map((v) => (
              <div
                key={v.version}
                role="listitem"
                className="flex items-start justify-between gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-nd-text-primary">{v.version}</p>
                  <p className="text-xs text-nd-text-muted">
                    {v.date} — {v.summary}
                  </p>
                </div>
                <StatusChip tone="success" size="sm">
                  Installed
                </StatusChip>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3">
      <div>
        <p className="font-medium text-nd-text-primary">{label}</p>
        <p className="text-sm text-nd-text-muted">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
