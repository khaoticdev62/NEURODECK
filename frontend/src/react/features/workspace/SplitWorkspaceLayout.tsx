import { useCallback, useRef, useState } from "react";
import type { Dispatch } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Select } from "../../components/primitives/Select";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckSelectors, NeuroDeckState } from "../../types/neurodeck";

type SecondaryPanel = "terminal" | "browser" | "memory" | "diagnostics" | "ide";

const SECONDARY_OPTIONS: { value: SecondaryPanel; label: string }[] = [
  { value: "terminal", label: "Terminal" },
  { value: "browser", label: "Browser" },
  { value: "memory", label: "Memory" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "ide", label: "IDE" },
];

const MIN_PCT = 20;
const MAX_PCT = 80;

interface SplitWorkspaceLayoutProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  selectors: NeuroDeckSelectors;
  actions: NeuroDeckAppActions;
  primaryPanel: React.ReactNode;
  onClose: () => void;
}

export function SplitWorkspaceLayout({
  dispatch,
  primaryPanel,
  onClose,
}: SplitWorkspaceLayoutProps) {
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanel>("terminal");
  const [splitPct, setSplitPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(pct))));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Lazy import of secondary panel content — keep it simple with a div dispatch bridge
  const SecondaryContent = useCallback(() => {
    const handleNav = () => dispatch({ type: "set-view", view: secondaryPanel });
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-nd-text-muted">
        <p className="text-sm font-medium">
          {SECONDARY_OPTIONS.find((o) => o.value === secondaryPanel)?.label} panel
        </p>
        <Button variant="secondary" size="sm" onClick={handleNav}>
          Open Full View
        </Button>
      </div>
    );
  }, [secondaryPanel, dispatch]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Split selector bar */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-nd-border-subtle bg-nd-surface-secondary/40 px-3">
        <span className="text-xs font-semibold text-nd-text-muted uppercase tracking-widest">
          Split
        </span>
        <div className="w-40">
          <Select
            label=""
            value={secondaryPanel}
            onChange={(e) => setSecondaryPanel(e.target.value as SecondaryPanel)}
            options={SECONDARY_OPTIONS}
            aria-label="Secondary panel"
          />
        </div>
        <button
          className="ml-1 rounded-md px-2 py-0.5 text-xs text-nd-text-muted hover:text-nd-text-primary transition"
          onClick={() => setSplitPct(50)}
          aria-label="Reset split to 50/50"
        >
          50/50
        </button>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close split view">
            Close Split
          </Button>
        </div>
      </div>

      {/* Split panels */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 overflow-hidden"
        role="region"
        aria-label="Split workspace"
      >
        {/* Left panel */}
        <div
          className="min-h-0 overflow-hidden"
          style={{ width: `${splitPct}%` }}
          aria-label="Primary panel"
        >
          {primaryPanel}
        </div>

        {/* Drag handle */}
        <div
          className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-nd-border-subtle hover:bg-nd-accent-primary/50 active:bg-nd-accent-primary transition"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          aria-valuenow={splitPct}
          aria-valuemin={MIN_PCT}
          aria-valuemax={MAX_PCT}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft")
              setSplitPct((p) => Math.max(MIN_PCT, p - 5));
            if (e.key === "ArrowRight")
              setSplitPct((p) => Math.min(MAX_PCT, p + 5));
          }}
        >
          <div className="h-12 w-1 rounded-full bg-nd-border-subtle group-hover:bg-nd-accent-primary/70 transition" aria-hidden />
        </div>

        {/* Right panel */}
        <div
          className="min-h-0 flex-1 overflow-hidden border-l border-nd-border-subtle"
          aria-label={`Secondary panel: ${SECONDARY_OPTIONS.find((o) => o.value === secondaryPanel)?.label}`}
        >
          <SecondaryContent />
        </div>
      </div>
    </div>
  );
}
