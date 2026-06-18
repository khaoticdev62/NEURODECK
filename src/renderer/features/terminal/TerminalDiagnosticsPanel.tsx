import type {
  TerminalDiagnosticsReport,
  TerminalEnvironmentReport,
} from "../../../shared/terminal/terminalDiagnosticsTypes";
import type { TerminalSession } from "../../../shared/terminal/terminalContracts";

type PaneRuntime = TerminalSession & {
  sessionId: string;
  output: string[];
  stateMessage?: string;
  lastExitReason?: string;
  lastErrorMessage?: string;
  startedAt?: string;
  lastActivityAt?: string;
  recoveryCount: number;
  commandCount: number;
  active: boolean;
};

type Props = {
  diagnostics: TerminalDiagnosticsReport | null;
  environment: TerminalEnvironmentReport | null;
  activePane: PaneRuntime | undefined;
};

export function TerminalDiagnosticsPanel({ diagnostics, environment, activePane }: Props) {
  return (
    <section
      className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3"
      tabIndex={0}
      aria-label="Terminal diagnostics"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
          Diagnostics
        </p>
        <h3 className="text-sm font-semibold text-nd-text-primary">
          Environment and session state
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-nd-text-muted">
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
          <div className="font-semibold text-nd-text-primary">Active sessions</div>
          <div className="mt-1">{diagnostics?.activeSessionCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
          <div className="font-semibold text-nd-text-primary">Platform</div>
          <div className="mt-1">{environment?.platform ?? "unknown"}</div>
        </div>
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
          <div className="font-semibold text-nd-text-primary">Shell</div>
          <div className="mt-1">{activePane?.shell ?? environment?.shell ?? "unknown"}</div>
        </div>
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
          <div className="font-semibold text-nd-text-primary">Warnings</div>
          <div className="mt-1">
            {diagnostics?.warnings?.length ? diagnostics.warnings[0] : "none"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-xs text-nd-text-muted">
        <div className="font-semibold text-nd-text-primary">Tool probes</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(environment?.probes ?? []).slice(0, 8).map((probe) => (
            <div
              key={probe.name}
              className="rounded-xl border border-nd-text-muted/15 bg-nd-bg/40 p-2"
            >
              <div className="font-semibold text-nd-text-primary">{probe.name}</div>
              <div className="mt-1">{probe.status}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
