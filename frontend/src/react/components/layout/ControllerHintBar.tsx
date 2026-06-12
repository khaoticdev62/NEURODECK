import { DeckButtonHint } from '../primitives/DeckButtonHint';
import { getActionHint } from '../../input/controller/steamInputHints';
import { useController } from '../../input/controller/ControllerProvider';

const HINTS: Array<{ action: Parameters<typeof getActionHint>[0]; label: string }> = [
  { action: 'confirm', label: 'Confirm' },
  { action: 'cancel', label: 'Back' },
  { action: 'reload', label: 'Reload' },
  { action: 'openSearch', label: 'Search' },
  { action: 'previousTab', label: 'Prev tab' },
  { action: 'nextTab', label: 'Next tab' },
  { action: 'openMainMenu', label: 'Menu' },
];

export function ControllerHintBar() {
  const { runtime } = useController();
  const kind = runtime.devices[0]?.kind ?? 'steam_deck';

  return (
    <div
      role="complementary"
      aria-label="Controller hints"
      className="flex h-7 shrink-0 items-center justify-center gap-4 border-t border-nd-text-muted/10 bg-nd-bg/60 px-4 backdrop-blur-sm"
    >
      {HINTS.map(({ action, label }) => (
        <DeckButtonHint key={action} button={getActionHint(action, kind)} label={label} />
      ))}
    </div>
  );
}
