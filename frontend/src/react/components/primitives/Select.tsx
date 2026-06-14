import { type SelectHTMLAttributes, forwardRef } from 'react';
import '../../../design-system/components/core/Select';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, fullWidth = false, className = '', id, ...rest },
  ref,
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={['nd-select', fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={selectId} className="nd-select__label">
          {label}
          {rest.required && (
            <span className="ml-1 text-nd-warning" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="nd-select__wrap">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={['nd-select__field', error ? 'nd-select__field--error' : ''].filter(Boolean).join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="nd-select__caret" aria-hidden="true">
          ▾
        </span>
      </div>
      {error && (
        <p id={`${selectId}-error`} role="alert" className="nd-select__msg">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${selectId}-hint`} className="nd-select__msg text-nd-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
