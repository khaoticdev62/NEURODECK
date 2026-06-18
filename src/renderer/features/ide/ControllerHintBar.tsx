import { DeckButtonHint } from "../../components/primitives/DeckButtonHint";
import type { IdeMode } from "../../shared/ide/ideContracts";

interface HintEntry {
  button: string;
  label: string;
}

const MODE_HINTS: Record<IdeMode, HintEntry[]> = {
  IDE_NAVIGATION: [
    { button: "A", label: "Open" },
    { button: "B", label: "Back" },
    { button: "Y", label: "Commands" },
    { button: "X", label: "Completions" },
    { button: "L1/R1", label: "Tabs" },
    { button: "▶ Start", label: "Edit mode" },
  ],
  IDE_EDIT: [
    { button: "A", label: "Accept" },
    { button: "B", label: "Cancel" },
    { button: "Y", label: "Cmd wheel" },
    { button: "X", label: "Pred bar" },
    { button: "L5", label: "Format" },
    { button: "R5", label: "Run" },
  ],
  IDE_PREDICTION: [
    { button: "A", label: "Accept" },
    { button: "B", label: "Dismiss" },
    { button: "↑/↓", label: "Navigate" },
    { button: "L1/R1", label: "Category" },
  ],
  IDE_COMMAND: [
    { button: "A", label: "Run" },
    { button: "B", label: "Cancel" },
    { button: "↑/↓", label: "Select" },
  ],
  IDE_SNIPPET: [
    { button: "A", label: "Insert" },
    { button: "B", label: "Cancel" },
    { button: "L1/R1", label: "Next/Prev" },
    { button: "↑/↓", label: "Select" },
  ],
};

interface ControllerHintBarProps {
  ideMode: IdeMode;
  visible: boolean;
}

export function ControllerHintBar({ ideMode, visible }: ControllerHintBarProps) {
  if (!visible) return null;

  const hints = MODE_HINTS[ideMode] ?? MODE_HINTS.IDE_NAVIGATION;

  return (
    <div
      className="flex h-9 shrink-0 items-center gap-5 border-b border-border-subtle bg-surface-primary px-3 overflow-x-auto"
      role="status"
      aria-label={`Controller hints for ${ideMode} mode`}
    >
      {hints.map((h) => (
        <DeckButtonHint key={h.button} button={h.button} label={h.label} />
      ))}
    </div>
  );
}
