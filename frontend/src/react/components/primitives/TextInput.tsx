import { type InputHTMLAttributes, forwardRef } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, hint, fullWidth = false, className = '', id, ...rest },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-nd-text-muted">
          {label}
          {rest.required && <span className="ml-1 text-nd-warning" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={[
          'w-full rounded-xl border bg-nd-bg/50 px-3 py-2 text-sm text-nd-text',
          'placeholder:text-nd-text-muted/50',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-nd-accent/40',
          error
            ? 'border-nd-danger/50 focus:ring-nd-danger/40'
            : 'border-nd-text-muted/20 hover:border-nd-text-muted/35',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-nd-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-nd-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
