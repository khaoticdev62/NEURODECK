import { Loader2, Terminal, ShieldCheck, Check, ShieldAlert } from 'lucide-react';
import { Panel } from '../../primitives/Panel';
import { StatusChip } from '../../primitives/StatusChip';

interface StepWelcomeProps {
  appVersion: string;
  isSteamDeck: boolean;
  precheckPassed: boolean;
  prechecking: boolean;
}

export function StepWelcome({ appVersion, isSteamDeck, precheckPassed, prechecking }: StepWelcomeProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--nd-text-primary)]">Welcome to NEURODECK</h2>
        <p className="text-sm text-[var(--nd-text-muted)]">Turn your device into a focused local-first AI workstation.</p>
      </div>

      <Panel title="System Environment Detected" variant="surface">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-tertiary)] p-3">
            <Terminal className="h-5 w-5 shrink-0 text-[var(--nd-accent-primary)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]">Device Class</p>
              <p className="truncate text-sm font-semibold text-[var(--nd-text-primary)]">
                {isSteamDeck ? 'Steam Deck Console' : 'Standard PC Workstation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-tertiary)] p-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--nd-accent-primary)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]">App Release</p>
              <p className="truncate text-sm font-semibold text-[var(--nd-text-primary)]">v{appVersion}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[var(--nd-text-secondary)]">
          This wizard will verify your local diagnostic environment, configure connection variables to local/remote models, select themes, and check active Lua automation scripts.
        </p>
      </Panel>

      <div className="flex items-center gap-3 rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] p-3">
        {prechecking ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--nd-accent-primary)] motion-reduce:animate-none" aria-hidden="true" />
            <span className="text-xs text-[var(--nd-text-muted)]">Pre-checking system environment...</span>
          </>
        ) : precheckPassed ? (
          <>
            <Check className="h-4 w-4 shrink-0 text-[var(--nd-accent-success)]" aria-hidden="true" />
            <StatusChip tone="success" size="sm">Basic diagnostic requirements passing. You can safely skip setup.</StatusChip>
          </>
        ) : (
          <>
            <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--nd-accent-warning)]" aria-hidden="true" />
            <StatusChip tone="warning" size="sm">Initial environment issue detected. Setup recommended before launching.</StatusChip>
          </>
        )}
      </div>
    </div>
  );
}
