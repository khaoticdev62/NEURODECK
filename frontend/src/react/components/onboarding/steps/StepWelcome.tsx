import { Loader2, Terminal, ShieldCheck, Check, ShieldAlert } from 'lucide-react';

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
        <h2 className="text-2xl font-bold tracking-tight text-nd-text">Welcome to NEURODECK</h2>
        <p className="text-sm text-nd-text-muted">Turn your device into a focused local-first AI workstation.</p>
      </div>

      <div className="rounded-2xl border border-nd-accent/15 bg-nd-accent/[0.03] p-5 space-y-4">
        <h3 className="font-semibold text-nd-text text-sm">System Environment Detected</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/40 p-3 flex items-center gap-3">
            <Terminal className="h-5 w-5 text-nd-accent" aria-hidden="true" />
            <div>
              <p className="text-xs text-nd-text-muted">Device Class</p>
              <p className="text-sm font-semibold text-nd-text mt-0.5">
                {isSteamDeck ? 'Steam Deck Console' : 'Standard PC Workstation'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/40 p-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-nd-accent" aria-hidden="true" />
            <div>
              <p className="text-xs text-nd-text-muted">App Release</p>
              <p className="text-sm font-semibold text-nd-text mt-0.5">v{appVersion}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-nd-text-muted/85 leading-relaxed">
          This wizard will verify your local diagnostic environment, configure connection variables to local/remote models, select themes, and check active Lua automation scripts.
        </p>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/20">
        {prechecking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-nd-accent" aria-hidden="true" />
            <span className="text-xs text-nd-text-muted">Pre-checking system environment...</span>
          </>
        ) : precheckPassed ? (
          <>
            <Check className="h-4 w-4 text-nd-success" aria-hidden="true" />
            <span className="text-xs text-nd-success font-medium">Basic diagnostic requirements passing. You can safely skip setup.</span>
          </>
        ) : (
          <>
            <ShieldAlert className="h-4 w-4 text-nd-warning" aria-hidden="true" />
            <span className="text-xs text-nd-text-muted">Initial environment issue detected. Setup recommended before launching.</span>
          </>
        )}
      </div>
    </div>
  );
}
