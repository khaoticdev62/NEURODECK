import { useState } from "react";
import type { Dispatch } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

export function RecoveryView({
  state,
  dispatch,
  actions,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}) {
  const hasError = !!state.lastError;
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto scrollbar-thin">
        {/* Active Error */}
        <Panel eyebrow="Recovery" title="Current Error State">
          <div className="p-4">
            {hasError ? (
              <div className="rounded-2xl border border-accent-error/25 bg-accent-error/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent-error"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">{state.lastError!.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                      {state.lastError!.message}
                    </p>
                    {state.lastError!.action && (
                      <p className="mt-2 rounded-lg bg-accent-error/10 px-3 py-2 text-xs text-accent-error/90">
                        {state.lastError!.action}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => dispatch({ type: "set-error", error: null })}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={RefreshCcw}
                    onClick={() => void actions.refreshDiagnostics()}
                  >
                    Run Diagnostics
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No active errors"
                description="All systems are operating normally."
                compact
              />
            )}
          </div>
        </Panel>

        {/* Recovery Actions */}
        <Panel eyebrow="Actions" title="Recovery Options">
          <div className="space-y-2 p-4">
            <RecoveryAction
              icon={RefreshCcw}
              label="Reload Diagnostics"
              description="Refresh all runtime health data and IPC event logs."
              badge="Safe"
              badgeTone="success"
              onClick={() => void actions.refreshDiagnostics()}
            />
            <RecoveryAction
              icon={RotateCcw}
              label="Check AI Health"
              description="Re-probe all configured AI providers for availability."
              badge="Safe"
              badgeTone="success"
              onClick={() => void actions.checkAiHealth()}
            />
            <RecoveryAction
              icon={History}
              label="Refresh Recovery Events"
              description="Load the latest self-healing event log from the bridge."
              badge="Safe"
              badgeTone="success"
              onClick={() => void actions.refreshRecoveryEvents()}
            />
            <RecoveryAction
              icon={Trash2}
              label="Clear Local State"
              description="Wipe all session history, memories, and preferences. OS keychain keys are preserved."
              badge="Destructive"
              badgeTone="danger"
              onClick={() => setConfirmReset(true)}
            />
          </div>
        </Panel>
      </div>

      {/* Recovery Event Log */}
      <Panel eyebrow="Event Log" title="Self-Healing Events" className="min-h-0 overflow-hidden">
        <div
          role="log"
          aria-live="polite"
          aria-label="Self-healing recovery events"
          className="h-full overflow-y-auto p-4 scrollbar-thin"
        >
          {state.recoveryEvents.length > 0 ? (
            <ul role="list" className="space-y-2">
              {state.recoveryEvents
                .slice()
                .reverse()
                .map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-border-subtle bg-surface-secondary/40 px-3 py-2 transition duration-fast hover:bg-surface-tertiary/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={event.allowed ? "success" : "danger"}>
                        {event.allowed ? "allowed" : "blocked"}
                      </Badge>
                      <span className="text-2xs text-text-muted">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-text-primary">
                      {event.action} · {event.runtimeId}
                      {event.modelId && ` · ${event.modelId}`}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-text-secondary">{event.reason}</p>
                    <p className="mt-0.5 text-2xs uppercase tracking-wide text-text-muted/70">
                      state: {event.state}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No recovery events logged yet"
              description="Events will appear here when the self-healing engine activates."
              compact
            />
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void actions.resetLocalState();
        }}
        title="Clear all local state?"
        message="This will permanently remove all session history, memories, and preferences. Keys stored in the OS keychain are preserved. This action cannot be undone."
        confirmLabel="Clear State"
        cancelLabel="Cancel"
        destructive
      />
    </div>
  );
}

function RecoveryAction({
  icon: Icon,
  label,
  description,
  badge,
  badgeTone,
  onClick,
}: {
  icon: typeof RefreshCcw;
  label: string;
  description: string;
  badge: string;
  badgeTone: "success" | "danger" | "warning" | "neutral";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-border-subtle bg-surface-secondary/40 px-3 py-3 text-left transition duration-fast hover:border-accent-primary/30 hover:bg-surface-tertiary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
      <Badge tone={badgeTone}>{badge}</Badge>
    </button>
  );
}
