import { forwardRef } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}

/**
 * Accessible toggle switch. Uses role="switch" + aria-checked.
 * The visual track stays compact while the hit target meets the
 * 40 px minimum required for Steam Deck/gamepad interaction.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, label, disabled = false },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative flex items-center justify-center rounded-full transition-colors duration-fast',
        'min-h-touch min-w-18',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-nd-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        checked ? 'bg-nd-accent' : 'bg-nd-text-muted/20',
      ].join(' ')}
    >
      <span className="relative h-7 w-12">
        <span
          aria-hidden="true"
          className={[
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-nd-bg shadow transition-transform duration-fast',
            checked ? 'translate-x-5' : 'translate-x-0',
            'motion-reduce:transition-none',
          ].join(' ')}
        />
      </span>
    </button>
  );
});
