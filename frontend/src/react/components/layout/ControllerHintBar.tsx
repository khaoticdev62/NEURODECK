import { DeckButtonHint } from '../primitives/DeckButtonHint';

const HINTS: Array<{ button: string; label: string }> = [
  { button: 'A', label: 'Confirm' },
  { button: 'B', label: 'Back' },
  { button: 'X', label: 'Commands' },
  { button: 'Y', label: 'Search' },
  { button: 'LB', label: 'Prev tab' },
  { button: 'RB', label: 'Next tab' },
  { button: '≡', label: 'App menu' },
];

export function ControllerHintBar() {
  return (
    <div
      role="complementary"
      aria-label="Controller hints"
      className="flex h-7 shrink-0 items-center justify-center gap-4 border-t border-nd-text-muted/10 bg-nd-bg/60 px-4 backdrop-blur-sm"
    >
      {HINTS.map(({ button, label }) => (
        <DeckButtonHint key={button} button={button} label={label} />
      ))}
    </div>
  );
}
