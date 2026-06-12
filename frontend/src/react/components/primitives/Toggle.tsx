interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}

/**
 * Accessible toggle switch. Uses role="switch" + aria-checked.
 */
export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-nd-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        checked ? 'bg-nd-accent' : 'bg-nd-text-muted/20',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-nd-bg shadow transition-transform duration-150 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
        style={{ left: '2px' }}
      />
    </button>
  );
}
