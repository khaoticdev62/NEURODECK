import { forwardRef } from 'react';
import { Toggle as DSToggle } from '../../../design-system/components/core/Toggle';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, label, disabled = false, className = '' },
  ref,
) {
  return (
    <DSToggle
      ref={ref}
      checked={checked}
      onChange={() => onChange()}
      label={label}
      disabled={disabled}
      className={className}
    />
  );
});
