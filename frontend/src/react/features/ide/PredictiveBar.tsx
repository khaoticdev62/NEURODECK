import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, Zap, Terminal, Code2, Puzzle } from 'lucide-react';
import type { PredictionResult } from '../../../shared/ide/ideContracts';

interface PredictiveBarProps {
  predictions: PredictionResult[];
  languageId: string | null;
  onAccept: (prediction: PredictionResult) => void;
  onDismiss: () => void;
  visible: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  lsp_completion: <Zap className="h-3 w-3 shrink-0" aria-hidden="true" />,
  snippet:        <Puzzle className="h-3 w-3 shrink-0" aria-hidden="true" />,
  command:        <Terminal className="h-3 w-3 shrink-0" aria-hidden="true" />,
  diagnostic_fix: <Code2 className="h-3 w-3 shrink-0" aria-hidden="true" />,
};

const TYPE_COLORS: Record<string, string> = {
  lsp_completion: 'text-nd-accent',
  snippet:        'text-nd-success',
  command:        'text-nd-warning',
  diagnostic_fix: 'text-nd-danger',
};

const SAFETY_BADGE: Record<string, string> = {
  safe:      'bg-nd-success/10 text-nd-success',
  confirm:   'bg-nd-warning/10 text-nd-warning',
  dangerous: 'bg-nd-danger/10 text-nd-danger',
  blocked:   'bg-nd-danger/20 text-nd-danger',
};

export function PredictiveBar({ predictions, languageId, onAccept, onDismiss, visible }: PredictiveBarProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset index when predictions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [predictions]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible || predictions.length === 0) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % predictions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + predictions.length) % predictions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (predictions[selectedIndex]) onAccept(predictions[selectedIndex]);
      } else if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [visible, predictions, selectedIndex, onAccept, onDismiss]);

  if (!visible || predictions.length === 0) {
    return (
      <div className="flex h-14 shrink-0 items-center gap-2 border-t border-nd-text-muted/10 bg-nd-surface/40 px-3">
        <Zap className="h-3.5 w-3.5 text-nd-text-muted/30" aria-hidden="true" />
        <span className="text-[11px] text-nd-text-muted/40">
          {languageId ? `No predictions for ${languageId}` : 'Open a file to see predictions'}
        </span>
      </div>
    );
  }

  const top = predictions[selectedIndex];

  return (
    <div
      className="flex h-14 shrink-0 flex-col border-t border-nd-text-muted/10 bg-nd-surface/60"
      role="listbox"
      aria-label="Predictive completions"
      aria-activedescendant={`pred-item-${selectedIndex}`}
    >
      {/* Top row: selected item detail */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <span className={`shrink-0 ${TYPE_COLORS[top.type] ?? 'text-nd-text-muted'}`}>
          {TYPE_ICONS[top.type] ?? <Code2 className="h-3 w-3" aria-hidden="true" />}
        </span>
        <span className="truncate text-xs font-mono font-semibold text-nd-text">{top.label}</span>
        {top.detail && (
          <span className="truncate text-[11px] text-nd-text-muted/60">{top.detail}</span>
        )}
        {top.safety && top.safety !== 'safe' && (
          <span className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${SAFETY_BADGE[top.safety]}`}>
            {top.safety}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] text-nd-text-muted/50">
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
          <span>{selectedIndex + 1}/{predictions.length}</span>
        </span>
      </div>

      {/* Bottom row: scrollable chips for quick preview */}
      <div
        ref={listRef}
        className="flex gap-1.5 overflow-x-auto px-3 pb-1.5 scrollbar-none"
        aria-hidden="true"
      >
        {predictions.slice(0, 8).map((p, i) => (
          <button
            key={p.id}
            id={`pred-item-${i}`}
            type="button"
            role="option"
            aria-selected={i === selectedIndex}
            onClick={() => { setSelectedIndex(i); onAccept(p); }}
            className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/50 ${
              i === selectedIndex
                ? 'border-nd-accent/40 bg-nd-accent/10 text-nd-accent'
                : 'border-nd-text-muted/15 bg-nd-surface/30 text-nd-text-muted hover:border-nd-accent/20 hover:text-nd-text'
            }`}
          >
            {TYPE_ICONS[p.type]}
            <span className="max-w-[80px] truncate">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
