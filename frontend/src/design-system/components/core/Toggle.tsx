import * as React from "react";
import { forwardRef } from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-toggle-css")) {
  const s = document.createElement("style");
  s.id = "nd-toggle-css";
  s.textContent = `
  .nd-toggle{display:inline-flex;align-items:center;gap:10px;font-family:var(--nd-font-ui);cursor:pointer;
    color:var(--nd-text-primary);font-size:14px;user-select:none;}
  .nd-toggle--disabled{opacity:0.5;}
  .nd-toggle__track{position:relative;width:38px;height:22px;border-radius:var(--nd-radius-full);
    background:var(--nd-surface-tertiary);border:1px solid var(--nd-border-default);flex:none;outline:none;
    padding:0;cursor:pointer;
    transition:background var(--nd-motion-fast) var(--nd-ease-standard),border-color var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-toggle__track:focus-visible{box-shadow:var(--nd-elevation-focus);border-color:var(--nd-accent-primary);}
  .nd-toggle__track--on{background:rgba(var(--nd-cyan-rgb),0.22);border-color:rgba(var(--nd-cyan-rgb),0.5);}
  .nd-toggle__knob{position:absolute;top:50%;left:2px;transform:translateY(-50%);width:16px;height:16px;
    border-radius:50%;background:var(--nd-text-muted);
    transition:left var(--nd-motion-fast) var(--nd-ease-standard),background var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-toggle__track--on .nd-toggle__knob{left:18px;background:var(--nd-accent-primary);box-shadow:0 0 10px rgba(var(--nd-cyan-rgb),0.5);}
  @media (prefers-reduced-motion: reduce){.nd-toggle__track,.nd-toggle__knob{transition:none;}}`;
  document.head.appendChild(s);
}

/**
 * On/off switch. Controller A / keyboard Space toggles. Render a label for
 * accessibility (or pass aria-label via rest props).
 */
export interface ToggleProps {
  /** Controlled on/off state. @default false */
  checked?: boolean;
  /** Receives the next boolean state. */
  onChange?: (checked: boolean) => void;
  /** Inline label to the right of the switch. */
  label?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked = false, onChange, label, disabled = false, className = "", "aria-label": ariaLabel },
  ref
): React.ReactNode {
  const toggle = () => {
    if (!disabled && onChange) onChange(!checked);
  };
  return (
    <label
      className={["nd-toggle", disabled ? "nd-toggle--disabled" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ? undefined : ariaLabel}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        className={["nd-toggle__track", checked ? "nd-toggle__track--on" : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span className="nd-toggle__knob" />
      </button>
      {label ? <span onClick={toggle}>{label}</span> : null}
    </label>
  );
});
