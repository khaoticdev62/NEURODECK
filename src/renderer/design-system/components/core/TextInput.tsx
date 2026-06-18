import * as React from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-textinput-css")) {
  const s = document.createElement("style");
  s.id = "nd-textinput-css";
  s.textContent = `
  .nd-field{display:flex;flex-direction:column;gap:6px;font-family:var(--nd-font-ui);}
  .nd-field__label{font-family:var(--nd-font-hud);text-transform:uppercase;letter-spacing:0.14em;
    font-size:10px;font-weight:600;color:var(--nd-text-muted);}
  .nd-field__wrap{display:flex;align-items:center;gap:8px;background:var(--nd-surface-input);
    border:1px solid var(--nd-border-default);border-radius:var(--nd-radius-md);padding:0 12px;height:40px;
    transition:border-color var(--nd-motion-fast) var(--nd-ease-standard),box-shadow var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-field__wrap:focus-within{border-color:var(--nd-accent-primary);box-shadow:var(--nd-elevation-focus);}
  .nd-field__wrap--error{border-color:var(--nd-accent-error);}
  .nd-field__wrap--error:focus-within{box-shadow:0 0 0 2px var(--nd-accent-error),0 0 24px rgba(var(--nd-red-rgb),0.18);}
  .nd-field__wrap--disabled{opacity:0.5;pointer-events:none;}
  .nd-field__input{flex:1;background:transparent;border:none;outline:none;color:var(--nd-text-primary);
    font-family:var(--nd-font-ui);font-size:15px;min-width:0;}
  .nd-field__input::placeholder{color:var(--nd-text-muted);}
  .nd-field__icon{color:var(--nd-text-muted);display:flex;}
  .nd-field__msg{font-size:11px;line-height:15px;}
  .nd-field__msg--hint{color:var(--nd-text-muted);}
  .nd-field__msg--error{color:var(--nd-accent-error);}
  @media (prefers-reduced-motion: reduce){.nd-field__wrap{transition:none;}}`;
  document.head.appendChild(s);
}

let ndFieldSeq = 0;

/**
 * Single-line text entry with label, hint, error, and optional leading icon.
 */
export interface TextInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  /** Uppercase HUD label above the field. */
  label?: string;
  /** Controlled value. */
  value: string;
  /** Change handler — receives the raw string. */
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Error message — sets invalid styling + aria-invalid. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  disabled?: boolean;
  /** Leading icon node. */
  icon?: React.ReactNode;
  /** @default 'text' */
  type?: string;
  /** Fired on Enter. */
  onSubmit?: () => void;
  className?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  disabled = false,
  icon = null,
  type = "text",
  onSubmit,
  className = "",
  ...rest
}: TextInputProps): React.ReactNode {
  const id = React.useMemo(() => `nd-field-${++ndFieldSeq}`, []);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={["nd-field", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="nd-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div
        className={[
          "nd-field__wrap",
          error ? "nd-field__wrap--error" : "",
          disabled ? "nd-field__wrap--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {icon ? (
          <span className="nd-field__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          className="nd-field__input"
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) onSubmit();
          }}
          {...rest}
        />
      </div>
      {error ? (
        <span id={errorId} className="nd-field__msg nd-field__msg--error">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} className="nd-field__msg nd-field__msg--hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
