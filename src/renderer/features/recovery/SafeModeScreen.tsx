import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/primitives/Button";

interface SafeModeScreenProps {
  reason?: string;
  errors?: string[];
  onDisablePlugins?: () => void;
  onContinue?: () => void;
  onFactoryReset?: () => void;
}

export function SafeModeScreen({
  reason = "An error was detected during startup.",
  errors = [],
  onDisablePlugins,
  onContinue,
  onFactoryReset,
}: SafeModeScreenProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="fixed inset-0 z-toast-peak flex items-center justify-center bg-nd-bg"
      role="alertdialog"
      aria-modal="true"
      aria-label="NEURODECK Safe Mode"
      aria-live="assertive"
    >
      <div className="mx-auto w-full max-w-lg space-y-6 p-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-warning/40 bg-nd-warning/10">
            <ShieldAlert className="h-8 w-8 text-nd-warning" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-nd-text-primary">SAFE MODE</h1>
            <p className="mt-1 text-nd-text-muted">NEURODECK started with limited functionality.</p>
          </div>
        </div>

        {/* Reason */}
        <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-nd-warning">
            Why Safe Mode?
          </p>
          <p className="mt-2 text-sm text-nd-text-secondary">{reason}</p>
          {errors.length > 0 && (
            <ul className="mt-2 space-y-1" role="list">
              {errors.map((err, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nd-status-error" aria-hidden />
                  <span className="text-nd-status-error">{err}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Available features */}
        <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
            Available in Safe Mode
          </p>
          <div className="mt-2 grid gap-1">
            {[
              { available: true, label: "Terminal (no plugins)" },
              { available: true, label: "Settings (disable plugins)" },
              { available: true, label: "Diagnostics and Logs" },
              { available: false, label: "AI Chat — plugin-dependent" },
              { available: false, label: "Agent, Models, Memory" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={row.available ? "text-nd-status-success" : "text-nd-status-error"}
                  aria-hidden
                >
                  {row.available ? "✓" : "✗"}
                </span>
                <span className={row.available ? "text-nd-text-secondary" : "text-nd-text-muted"}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error details toggle */}
        {errors.length > 0 && (
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-nd-border-subtle px-4 py-3 text-sm text-nd-text-muted hover:text-nd-text-secondary"
            aria-expanded={showDetails}
          >
            View Error Details
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        {showDetails && (
          <pre className="max-h-40 overflow-y-auto rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 text-xs text-nd-status-error">
            {errors.join("\n")}
          </pre>
        )}

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="primary"
            icon={RotateCcw}
            onClick={onDisablePlugins}
            fullWidth
          >
            Disable Plugins & Restart
          </Button>
          <Button variant="secondary" onClick={onContinue} fullWidth>
            Continue in Safe Mode
          </Button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onFactoryReset}
            className="text-xs text-nd-status-error/70 underline hover:text-nd-status-error"
          >
            Factory Reset…
          </button>
        </div>
      </div>
    </div>
  );
}
