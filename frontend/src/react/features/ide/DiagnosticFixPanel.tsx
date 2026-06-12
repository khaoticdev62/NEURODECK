import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronUp, X } from 'lucide-react';

export interface DiagnosticFix {
  id: string;
  title: string;
  kind?: string;
}

interface DiagnosticFixPanelProps {
  fixes: DiagnosticFix[];
  diagnosticMessage: string;
  onApply: (fix: DiagnosticFix) => void;
  onClose: () => void;
  visible: boolean;
}

export function DiagnosticFixPanel({ fixes, diagnosticMessage, onApply, onClose, visible }: DiagnosticFixPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [fixes]);

  useEffect(() => {
    if (!visible || fixes.length === 0) return;
    panelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % fixes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + fixes.length) % fixes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (fixes[selectedIndex]) onApply(fixes[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [visible, fixes, selectedIndex, onApply, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-nd-text-muted/20 bg-nd-bg shadow-2xl outline-none"
      role="listbox"
      aria-label="Diagnostic code actions"
    >
      <div className="flex items-center gap-2 border-b border-nd-text-muted/10 px-4 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-nd-danger" aria-hidden="true" />
        <span className="flex-1 truncate text-xs text-nd-text">{diagnosticMessage}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close code actions"
          className="rounded p-1 text-nd-text-muted hover:bg-nd-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {fixes.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-nd-text-muted/60">
          No code actions available for this diagnostic
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
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${
                i === selectedIndex
                  ? 'bg-nd-accent/10 text-nd-accent'
                  : 'text-nd-text hover:bg-nd-surface/40'
              }`}
            >
              <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
              <span className="flex-1">{fix.title}</span>
              {fix.kind && (
                <span className="text-[10px] text-nd-text-muted/50">{fix.kind}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
