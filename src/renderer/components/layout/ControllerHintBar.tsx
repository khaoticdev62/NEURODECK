import { DeckButtonHint } from "../primitives/DeckButtonHint";
import { getActionHint } from "../../input/controller/steamInputHints";
import { useController } from "../../input/controller/ControllerProvider";

const HINTS: Array<{ action: Parameters<typeof getActionHint>[0]; label: string }> = [
  { action: "confirm", label: "Confirm" },
  { action: "cancel", label: "Back" },
  { action: "reload", label: "Reload" },
  { action: "openSearch", label: "Search" },
  { action: "previousTab", label: "Prev tab" },
  { action: "nextTab", label: "Next tab" },
  { action: "openMainMenu", label: "Menu" },
];

export function ControllerHintBar() {
  const { runtime } = useController();
  const kind = runtime.devices[0]?.kind ?? "steam_deck";

  return (
    <div
      role="complementary"
      aria-label="Controller hints"
      className="flex h-touch shrink-0 items-center justify-center gap-6 border-t border-[var(--nd-border-subtle)] bg-[var(--nd-surface-app)]/80 px-4 text-[var(--nd-text-secondary)] backdrop-blur-sm"
    >
      {HINTS.map(({ action, label }) => (
        <DeckButtonHint key={action} button={getActionHint(action, kind)} label={label} />
      ))}
    </div>
  );
}
