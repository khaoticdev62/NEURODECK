import { type SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

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
  { label, error, hint, options, placeholder, fullWidth = false, className = "", id, ...rest },
  ref
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-nd-text-muted">
          {label}
          {rest.required && (
            <span className="ml-1 text-nd-warning" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={[
            "w-full appearance-none rounded-xl border bg-nd-bg/50 px-3 pr-10 text-sm text-nd-text",
            "min-h-touch",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-nd-accent/40",
            error
              ? "border-nd-danger/50 focus:ring-nd-danger/40"
              : "border-nd-text-muted/20 hover:border-nd-text-muted/35",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
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
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nd-text-muted"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p id={`${selectId}-error`} role="alert" className="mt-1 text-xs text-nd-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${selectId}-hint`} className="mt-1 text-xs text-nd-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
