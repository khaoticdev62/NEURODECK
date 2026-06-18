import * as React from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-select-css")) {
  const s = document.createElement("style");
  s.id = "nd-select-css";
  s.textContent = `
  .nd-select{display:flex;flex-direction:column;gap:6px;font-family:var(--nd-font-ui);min-width:0;}
  .nd-select__label{font-family:var(--nd-font-hud);text-transform:uppercase;letter-spacing:0.14em;
    font-size:10px;font-weight:600;color:var(--nd-text-muted);}
  .nd-select__wrap{position:relative;display:flex;align-items:center;min-width:0;}
  .nd-select__field{appearance:none;width:100%;min-width:0;background:var(--nd-surface-input);color:var(--nd-text-primary);
    border:1px solid var(--nd-border-default);border-radius:var(--nd-radius-md);height:40px;padding:0 36px 0 12px;
    font-family:var(--nd-font-ui);font-size:14px;outline:none;cursor:pointer;
    transition:border-color var(--nd-motion-fast) var(--nd-ease-standard),box-shadow var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-select__field:focus-visible{border-color:var(--nd-accent-primary);box-shadow:var(--nd-elevation-focus);}
  .nd-select__field:disabled{opacity:0.5;cursor:not-allowed;}
  .nd-select__field--error{border-color:var(--nd-accent-error);}
  .nd-select__caret{position:absolute;right:12px;pointer-events:none;color:var(--nd-text-muted);font-size:11px;}
  .nd-select__msg{font-size:11px;color:var(--nd-accent-error);}
  @media (prefers-reduced-motion: reduce){.nd-select__field{transition:none;}}`;
  document.head.appendChild(s);
}

let ndSelectSeq = 0;

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Choose from a constrained list. Wraps a native <select> for reliable
 * keyboard/controller behaviour.
 */
export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  label?: string;
  /** Controlled value. */
  value: string;
  onChange?: (value: string) => void;
  /** Options as strings or {value,label,disabled}. */
  options: Array<string | SelectOption>;
  /** Disabled leading placeholder option. */
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  disabled = false,
  className = "",
  ...rest
}: SelectProps): React.ReactNode {
  const id = React.useMemo(() => `nd-select-${++ndSelectSeq}`, []);
  return (
    <div className={["nd-select", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="nd-select__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="nd-select__wrap">
        <select
          id={id}
          className={["nd-select__field", error ? "nd-select__field--error" : ""]
            .filter(Boolean)
            .join(" ")}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange && onChange(e.target.value)}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            );
          })}
        </select>
        <span className="nd-select__caret" aria-hidden="true">
          ▾
        </span>
      </div>
      {error ? <span className="nd-select__msg">{error}</span> : null}
    </div>
  );
}
