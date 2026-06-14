import { forwardRef } from 'react';
import '../../../design-system/components/core/Toggle';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, label, disabled = false },
  ref,
) {
  return (
    <span className="nd-toggle">
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={['nd-toggle__track', checked ? 'nd-toggle__track--on' : ''].filter(Boolean).join(' ')}
      >
        <span className="nd-toggle__knob" />
      </button>
    </span>
  );
});
