import { useMemo, useState } from "react";
import { Command } from "lucide-react";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";

type ActionItem = {
  id: string;
  label: string;
  action: () => void;
};

type Props = {
  open: boolean;
  actions: ActionItem[];
  onClose: () => void;
  onRun: (action: ActionItem) => void;
};

export function TerminalCommandPalette({ open, actions, onClose, onRun }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase())),
    [actions, query]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <FocusTrapContainer
        active={open}
        onEscape={onClose}
        className="mt-24 w-full max-w-xl overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-bg/98 shadow-panel-elevated"
        role="dialog"
        aria-label="Terminal command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-nd-text-muted/15 px-4 py-3">
          <Command className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-nd-text-primary">Terminal Command Palette</div>
            <div className="text-xs text-nd-text-muted">Execute real terminal actions only.</div>
          </div>
        </div>
        <div className="border-b border-nd-text-muted/15 px-4 py-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terminal actions..."
            className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text-primary outline-none"
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-nd-text-muted">No actions match your query.</div>
          ) : (
            filtered.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onRun(action)}
                className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-nd-accent-primary/20 hover:bg-nd-accent-primary/[0.06]"
              >
                <span className="text-sm text-nd-text-primary">{action.label}</span>
                <span className="text-[11px] text-nd-text-muted">Enter</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-nd-text-muted/15 px-4 py-3 text-xs text-nd-text-muted">
          <span>Esc closes</span>
          <button type="button" onClick={onClose} className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-1.5 text-xs text-nd-text-muted">
            Close
          </button>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

