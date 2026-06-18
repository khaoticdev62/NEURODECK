import { type InputHTMLAttributes, forwardRef } from "react";
import "../../design-system/components/core/TextInput";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, hint, fullWidth = false, className = "", id, ...rest },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={["nd-field", fullWidth ? "w-full" : "", className].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={inputId} className="nd-field__label">
          {label}
          {rest.required && (
            <span className="ml-1 text-nd-accent-warning" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div
        className={[
          "nd-field__wrap",
          error ? "nd-field__wrap--error" : "",
          rest.disabled ? "nd-field__wrap--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className="nd-field__input"
          {...rest}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="nd-field__msg nd-field__msg--error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="nd-field__msg text-nd-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
