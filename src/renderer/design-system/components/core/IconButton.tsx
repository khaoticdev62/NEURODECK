import * as React from "react";
import { forwardRef } from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-iconbtn-css")) {
  const s = document.createElement("style");
  s.id = "nd-iconbtn-css";
  s.textContent = `
  .nd-iconbtn{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
    border:1px solid transparent;border-radius:var(--nd-radius-sm);background:transparent;
    color:var(--nd-text-muted);outline:none;position:relative;
    transition:background var(--nd-motion-fast) var(--nd-ease-standard),color var(--nd-motion-fast) var(--nd-ease-standard),transform var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-iconbtn:hover{background:var(--nd-surface-tertiary);color:var(--nd-text-primary);}
  .nd-iconbtn:active{transform:scale(0.92);}
  .nd-iconbtn:focus-visible{box-shadow:var(--nd-elevation-focus);border-color:var(--nd-accent-primary);}
  .nd-iconbtn:focus-visible::before,.nd-iconbtn:focus-visible::after{content:"";position:absolute;width:9px;height:9px;pointer-events:none;}
  .nd-iconbtn:focus-visible::before{top:-5px;left:-5px;border-top:2px solid var(--nd-cyan-400);border-left:2px solid var(--nd-cyan-400);}
  .nd-iconbtn:focus-visible::after{bottom:-5px;right:-5px;border-bottom:2px solid var(--nd-cyan-400);border-right:2px solid var(--nd-cyan-400);}
  .nd-iconbtn:disabled{pointer-events:none;opacity:0.4;}
  .nd-iconbtn--sm{min-width:var(--nd-target-min,44px);min-height:var(--nd-target-min,44px);width:28px;height:28px;}
  .nd-iconbtn--md{min-width:var(--nd-target-min,44px);min-height:var(--nd-target-min,44px);width:36px;height:36px;}
  .nd-iconbtn--lg{min-width:var(--nd-target-min,44px);min-height:var(--nd-target-min,44px);width:44px;height:44px;}
  .nd-iconbtn--primary{color:var(--nd-accent-primary);}
  .nd-iconbtn--primary:hover{background:rgba(var(--nd-cyan-rgb),0.12);color:var(--nd-accent-primary);}
  .nd-iconbtn--danger{color:var(--nd-accent-error);}
  .nd-iconbtn--danger:hover{background:rgba(var(--nd-red-rgb),0.12);color:var(--nd-accent-error);}
  .nd-iconbtn--subtle{background:var(--nd-surface-secondary);border-color:var(--nd-border-subtle);color:var(--nd-text-primary);}
  .nd-iconbtn--subtle:hover{border-color:rgba(var(--nd-cyan-rgb),0.4);background:rgba(var(--nd-cyan-rgb),0.1);color:var(--nd-accent-primary);}
  .nd-iconbtn--outline{background:transparent;border-color:var(--nd-border-subtle);color:var(--nd-text-primary);}
  .nd-iconbtn--outline:hover{border-color:rgba(var(--nd-cyan-rgb),0.4);color:var(--nd-accent-primary);}
  .nd-iconbtn--ghost{background:transparent;border-color:transparent;color:var(--nd-text-muted);}
  .nd-iconbtn--ghost:hover{background:var(--nd-surface-tertiary);color:var(--nd-text-primary);}
  .nd-iconbtn__tip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
    background:var(--nd-surface-tertiary);color:var(--nd-text-primary);font-family:var(--nd-font-ui);
    font-size:11px;padding:4px 8px;border-radius:var(--nd-radius-sm);border:1px solid var(--nd-border-subtle);
    white-space:nowrap;opacity:0;pointer-events:none;box-shadow:var(--nd-elevation-card);z-index:var(--nd-z-tooltip,5000);display:none;}
  .nd-iconbtn:hover .nd-iconbtn__tip,.nd-iconbtn:focus-visible .nd-iconbtn__tip{opacity:1;display:block;}
  @media (prefers-reduced-motion: reduce){.nd-iconbtn,.nd-iconbtn__tip{transition:none;}}`;
  document.head.appendChild(s);
}

export type IconButtonVariant = "default" | "primary" | "danger" | "subtle" | "outline" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";

/**
 * Compact icon-only button. Always requires an accessible `label`, exposed as
 * aria-label and a hover/focus tooltip.
 */
export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  /** Accessible label — also rendered as the tooltip and aria-label. */
  label?: string;
  /** Icon node (e.g. a Lucide icon element). */
  icon: React.ReactNode;
  /** @default 'default' */
  variant?: IconButtonVariant;
  /** @default 'md' */
  size?: IconButtonSize;
  /** Render the hover/focus tooltip. @default true */
  showTooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    variant = "default",
    size = "md",
    disabled = false,
    showTooltip = true,
    className = "",
    ...rest
  },
  ref
): React.ReactNode {
  const cls = ["nd-iconbtn", `nd-iconbtn--${variant}`, `nd-iconbtn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      ref={ref}
      className={cls}
      aria-label={label}
      title={showTooltip ? undefined : label}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {showTooltip && label ? (
        <span className="nd-iconbtn__tip" role="tooltip">
          {label}
        </span>
      ) : null}
    </button>
  );
});
