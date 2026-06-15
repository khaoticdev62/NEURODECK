import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Panel } from "../../primitives/Panel";
import { StatusChip } from "../../primitives/StatusChip";
import type { SetupWarning, SetupError } from "../../../types/onboarding";
import type { NeurodeckTheme } from "../../../../shared/theme/themeContracts";
import type { AIProvider } from "../../../types/neurodeck";

interface StepFinishProps {
  availableThemes: NeurodeckTheme[];
  themeId: string;
  fontScale: number;
  providerType: AIProvider | "skip";
  diagnosticsErrors: SetupError[];
  diagnosticsWarnings: SetupWarning[];
}

export function StepFinish({
  availableThemes,
  themeId,
  fontScale,
  providerType,
  diagnosticsErrors,
  diagnosticsWarnings,
}: StepFinishProps) {
  const healthy = diagnosticsErrors.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">Setup Finalization</h2>
        <p className="text-xs text-[var(--nd-text-muted)]">
          Review configuration settings before entering the workspace.
        </p>
      </div>

      <Panel variant="surface" className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--nd-green-rgb),0.2)] bg-[rgba(var(--nd-green-rgb),0.1)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--nd-accent-success)]" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--nd-text-primary)]">
              Configuration Verified
            </h4>
            <p className="text-xs text-[var(--nd-text-muted)]">
              System parameters written to configuration files successfully.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-2.5 border-t border-[var(--nd-border-subtle)] pt-4 text-xs sm:grid-cols-2">
          <div className="flex justify-between py-0.5">
            <span className="text-[var(--nd-text-muted)]">Active Theme:</span>
            <span className="font-semibold text-[var(--nd-text-primary)]">
              {availableThemes.find((t) => t.id === themeId)?.name || "Blacksite"}
            </span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-[var(--nd-text-muted)]">AI Provider:</span>
            <span className="font-semibold capitalize text-[var(--nd-text-primary)]">
              {providerType === "skip" ? "Offline Planner" : providerType}
            </span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-[var(--nd-text-muted)]">Text Scaling:</span>
            <span className="font-semibold text-[var(--nd-text-primary)]">{fontScale}%</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span className="text-[var(--nd-text-muted)]">Subsystem Diagnostics:</span>
            <StatusChip tone={healthy ? "success" : "error"} size="sm">
              {healthy ? "Healthy" : "Degraded"}
            </StatusChip>
          </div>
        </div>
      </Panel>

      <div className="rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-cyan-rgb),0.2)] bg-[var(--nd-accent-soft)] px-3 py-2 text-xs text-[var(--nd-text-muted)]">
        Steam Deck text entry: focus a field with A or Y, then use Steam + X to open the on-screen
        keyboard.
      </div>

      {diagnosticsWarnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-yellow-rgb),0.2)] bg-[rgba(var(--nd-yellow-rgb),0.05)] p-3 text-xs leading-5 text-[var(--nd-accent-warning)]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-[var(--nd-text-primary)]">
              Warnings Pending Verification:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--nd-text-muted)]">
              {diagnosticsWarnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
