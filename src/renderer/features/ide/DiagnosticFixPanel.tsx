import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronUp, Loader2, X } from "lucide-react";
import { IconButton } from "../../components/primitives/IconButton";
import type { LspTextEdit } from "../../services/bridgeAdapter";

export interface DiagnosticFix {
  id: string;
  title: string;
  kind?: string;
  isPreferred?: boolean;
  edits: LspTextEdit[];
}

interface DiagnosticFixPanelProps {
  fixes: DiagnosticFix[];
  diagnosticMessage: string;
  loading?: boolean;
  onApply: (fix: DiagnosticFix) => void;
  onClose: () => void;
  visible: boolean;
}

export function DiagnosticFixPanel({
  fixes,
  diagnosticMessage,
  loading = false,
  onApply,
  onClose,
  visible,
}: DiagnosticFixPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [fixes]);

  useEffect(() => {
    if (!visible || fixes.length === 0) return;
    panelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % fixes.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + fixes.length) % fixes.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (fixes[selectedIndex]) onApply(fixes[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey, { capture: true });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  }, [visible, fixes, selectedIndex, onApply, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-nd-border-subtle bg-nd-surface-primary shadow-nd-elevation-overlay outline-none"
      role="listbox"
      aria-label="Diagnostic code actions"
      aria-busy={loading}
    >
      <div className="flex items-center gap-2 border-b border-nd-border-subtle px-4 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-nd-accent-error" aria-hidden="true" />
        <span className="flex-1 truncate text-xs text-nd-text-primary">{diagnosticMessage}</span>
        {loading && (
          <Loader2
            className="h-3.5 w-3.5 shrink-0 animate-spin text-nd-text-muted"
            aria-label="Fetching code actions…"
          />
        )}
        <IconButton aria-label="Close code actions" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
      </div>

      {loading ? (
        <div className="px-4 py-5 text-center text-xs text-nd-text-muted">
          Fetching code actions from language server…
        </div>
      ) : fixes.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-nd-text-muted">
          No code actions available — start an LSP server or place your cursor on a diagnostic.
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto py-1">
          {fixes.map((fix, i) => (
            <button
              key={fix.id}
              id={`fix-item-${i}`}
              type="button"
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => onApply(fix)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 ${
                i === selectedIndex
                  ? "bg-nd-accent-primary/10 text-nd-accent-primary"
                  : "text-nd-text-primary hover:bg-nd-surface-secondary"
              }`}
            >
              <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
              <span className="flex-1">{fix.title}</span>
              <div className="ml-auto flex items-center gap-1.5">
                {fix.isPreferred && (
                  <span className="rounded border border-nd-accent-primary/30 bg-nd-accent-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-nd-accent-primary">
                    preferred
                  </span>
                )}
                {fix.kind && (
                  <span className="text-[10px] text-nd-text-muted">{fix.kind}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
