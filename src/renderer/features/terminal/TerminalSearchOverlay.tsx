import { X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { TextInput } from "../../components/primitives/TextInput";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";

export type TerminalSearchOverlayProps = {
  open: boolean;
  query: string;
  results: { paneId: string; line: string }[];
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onClear: () => void;
};

export function TerminalSearchOverlay({
  open,
  query,
  results,
  onQueryChange,
  onClose,
  onClear,
}: TerminalSearchOverlayProps) {
  if (!open) return null;

  return (
    <FocusTrapContainer
      active={open}
      onEscape={onClose}
      className="fixed inset-x-4 bottom-4 z-[var(--z-modal)] rounded-2xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-nd-elevation-card"
      role="dialog"
      aria-label="Terminal output search"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            Search
          </div>
          <div className="text-sm font-semibold text-nd-text-primary">Terminal output</div>
        </div>
        <IconButton aria-label="Close search" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <TextInput
          id="terminal-search-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search output or session id..."
          label="Search"
          aria-label="Search terminal output"
          fullWidth
        />
        <Button size="sm" variant="ghost" className="min-h-touch" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="mt-3 max-h-56 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/20 p-3 text-xs text-nd-text-muted">
        {results.length === 0 ? (
          <div>No matches.</div>
        ) : (
          results.slice(-50).map((entry, index) => (
            <div
              key={`${entry.paneId}-${index}`}
              className="mb-2 rounded-xl border border-nd-text-muted/15 bg-nd-bg/40 p-2"
            >
              <div className="font-semibold text-nd-text-primary">{entry.paneId}</div>
              <div className="mt-1 font-mono text-[11px] text-nd-text-muted">{entry.line}</div>
            </div>
          ))
        )}
      </div>
    </FocusTrapContainer>
  );
}
