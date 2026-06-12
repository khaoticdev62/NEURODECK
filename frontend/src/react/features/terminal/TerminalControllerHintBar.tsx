import { TERMINAL_CONTROLLER_ACTIONS } from "../../../../../src/shared/terminal/terminalControllerMap";

type Props = {
  activeMode: "input" | "palette" | "assistant" | "search" | "confirm";
  onOpenPalette: () => void;
  onOpenAssistant: () => void;
  onOpenSearch: () => void;
  onOpenSessions: () => void;
};

export function TerminalControllerHintBar({ activeMode, onOpenPalette, onOpenAssistant, onOpenSearch, onOpenSessions }: Props) {
  const hints = [
    `A ${TERMINAL_CONTROLLER_ACTIONS.A}`,
    `B ${TERMINAL_CONTROLLER_ACTIONS.B}`,
    `X ${TERMINAL_CONTROLLER_ACTIONS.X}`,
    `Y ${TERMINAL_CONTROLLER_ACTIONS.Y}`,
    `L1/R1 tabs`,
    `L4 assistant`,
    `R4 paste/accept`,
    `View sessions`,
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nd-text-muted/15 bg-nd-surface/20 px-4 py-2 text-[11px] text-nd-text-muted">
      <div className="flex flex-wrap gap-2">
        {hints.map((hint) => (
          <span key={hint} className="rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1">
            {hint}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onOpenPalette} className="rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1">
          Palette
        </button>
        <button type="button" onClick={onOpenAssistant} className="rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1">
          Assistant
        </button>
        <button type="button" onClick={onOpenSearch} className="rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1">
          Search
        </button>
        <button type="button" onClick={onOpenSessions} className="rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1">
          Sessions
        </button>
      </div>
      <div className="w-full text-right text-[10px] uppercase tracking-[0.24em] text-nd-text-muted/70">
        Mode: {activeMode}
      </div>
    </div>
  );
}

