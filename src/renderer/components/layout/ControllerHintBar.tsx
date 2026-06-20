import { DeckButtonHint } from "../primitives/DeckButtonHint";
import { getActionHint } from "../../input/controller/steamInputHints";
import { useController } from "../../input/controller/ControllerProvider";
import { Gamepad2 } from "lucide-react";

export type HintItem = {
  action: Parameters<typeof getActionHint>[0];
  label: string;
};

const DEFAULT_HINTS: HintItem[] = [
  { action: "confirm", label: "Confirm" },
  { action: "cancel", label: "Back" },
  { action: "reload", label: "Reload" },
  { action: "openSearch", label: "Search" },
  { action: "previousTab", label: "Prev tab" },
  { action: "nextTab", label: "Next tab" },
  { action: "openMainMenu", label: "Menu" },
];

export function ControllerHintBar({ hints = DEFAULT_HINTS }: { hints?: HintItem[] }) {
  const { runtime } = useController();
  const kind = runtime.devices[0]?.kind ?? "steam_deck";

  return (
    <div
      role="complementary"
      aria-label="Controller hints"
      className="flex min-h-12 shrink-0 items-center gap-4 border-t border-[var(--nd-border-subtle)] bg-[var(--nd-surface-sidebar)] px-4 text-[var(--nd-text-secondary)]"
    >
      <span className="mr-auto inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nd-text-muted)]">
        <Gamepad2 className="h-4 w-4 text-[var(--nd-accent-primary)]" aria-hidden="true" />
        Controller ready
      </span>
      <div className="flex items-center justify-end gap-4">
        {hints.map(({ action, label }) => (
          <DeckButtonHint key={action} button={getActionHint(action, kind)} label={label} />
        ))}
      </div>
    </div>
  );
}
