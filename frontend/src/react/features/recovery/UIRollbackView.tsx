import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { NeuroDeckState } from "../../types/neurodeck";

interface FrontendBundle {
  version: string;
  codename: string;
  date: string;
  current: boolean;
  apiCompatible: boolean;
}

const MOCK_BUNDLES: FrontendBundle[] = [
  {
    version: "v1.8.0",
    codename: "ptah",
    date: "2026-06-17",
    current: true,
    apiCompatible: true,
  },
  {
    version: "v1.7.0",
    codename: "sekhmet",
    date: "2026-05-22",
    current: false,
    apiCompatible: true,
  },
  {
    version: "v1.6.0",
    codename: "sobek",
    date: "2026-04-15",
    current: false,
    apiCompatible: false,
  },
];

export function UIRollbackView({ state: _state }: { state: NeuroDeckState }) {
  const [target, setTarget] = useState<FrontendBundle | null>(null);
  const [rolling, setRolling] = useState(false);
  const [done, setDone] = useState(false);

  const handleRollback = useCallback(async () => {
    if (!target) return;
    setRolling(true);
    await new Promise((r) => setTimeout(r, 1500));
    setRolling(false);
    setDone(true);
    setTarget(null);
  }, [target]);

  return (
    <Panel
      eyebrow="Recovery"
      title="UI Rollback"
      data-testid="ui-rollback-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="flex flex-col gap-6 p-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-nd-status-warning/30 bg-nd-status-warning/5 p-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-nd-status-warning"
            aria-hidden
          />
          <div>
            <p className="font-bold text-nd-text-primary">Frontend Bundle Rollback</p>
            <p className="mt-1 text-sm text-nd-text-muted">
              Reverts the Electron renderer bundle to an archived version. The Rust sidecar is
              unaffected. Only roll back if the UI is broken — verify API compatibility first.
            </p>
          </div>
        </div>

        {done && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-2xl border border-nd-status-success/30 bg-nd-status-success/5 px-4 py-3 text-nd-status-success"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            Rollback complete. Restart NEURODECK to load the previous UI.
          </div>
        )}

        {/* Bundle list */}
        <section aria-label="Available frontend bundles">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Archived Bundles
          </h2>
          <div className="flex flex-col gap-2" role="list">
            {MOCK_BUNDLES.map((bundle) => (
              <div
                key={bundle.version}
                role="listitem"
                className="flex items-center justify-between gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-nd-text-primary">
                      {bundle.version}-{bundle.codename}
                    </span>
                    {bundle.current && (
                      <StatusChip tone="success" size="sm">
                        Current
                      </StatusChip>
                    )}
                    {!bundle.apiCompatible && (
                      <StatusChip tone="error" size="sm">
                        API Mismatch
                      </StatusChip>
                    )}
                  </div>
                  <p className="text-xs text-nd-text-muted">{bundle.date}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  disabled={bundle.current || !bundle.apiCompatible || rolling}
                  onClick={() => setTarget(bundle)}
                  aria-label={`Rollback to ${bundle.version}`}
                  aria-disabled={bundle.current || !bundle.apiCompatible}
                >
                  {rolling && target?.version === bundle.version ? "Rolling back…" : "Rollback"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={target !== null}
        title={`Rollback to ${target?.version ?? ""}?`}
        message={`The UI will be downgraded to ${target?.version ?? ""}-${target?.codename ?? ""}. The sidecar stays on the current version. Restart required after rollback.`}
        confirmLabel="Rollback"
        destructive
        onConfirm={() => void handleRollback()}
        onCancel={() => setTarget(null)}
      />
    </Panel>
  );
}
