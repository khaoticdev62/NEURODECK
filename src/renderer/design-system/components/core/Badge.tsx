import * as React from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-badge-css")) {
  const s = document.createElement("style");
  s.id = "nd-badge-css";
  s.textContent = `
  .nd-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--nd-font-hud);
    font-weight:600;text-transform:uppercase;border:1px solid;border-radius:var(--nd-radius-full);
    line-height:1;white-space:nowrap;}
  .nd-badge--sm{padding:3px 8px;font-size:10px;letter-spacing:0.16em;}
  .nd-badge--md{padding:5px 10px;font-size:11px;letter-spacing:0.12em;}
  .nd-badge__dot{width:6px;height:6px;border-radius:50%;background:currentColor;}
  .nd-badge--neutral{color:var(--nd-text-secondary);border-color:var(--nd-border-default);background:rgba(141,161,179,0.08);}
  .nd-badge--info{color:var(--nd-accent-info);border-color:rgba(var(--nd-blue-rgb),0.3);background:rgba(var(--nd-blue-rgb),0.1);}
  .nd-badge--success{color:var(--nd-accent-success);border-color:rgba(var(--nd-green-rgb),0.3);background:rgba(var(--nd-green-rgb),0.1);}
  .nd-badge--warning{color:var(--nd-accent-warning);border-color:rgba(var(--nd-yellow-rgb),0.3);background:rgba(var(--nd-yellow-rgb),0.1);}
  .nd-badge--error{color:var(--nd-accent-error);border-color:rgba(var(--nd-red-rgb),0.3);background:rgba(var(--nd-red-rgb),0.1);}
  .nd-badge--agent{color:var(--nd-accent-agent);border-color:rgba(var(--nd-purple-rgb),0.3);background:rgba(var(--nd-purple-rgb),0.1);}
  .nd-badge--outline{background:transparent;}`;
  document.head.appendChild(s);
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error" | "agent";

/**
 * Compact status/metadata label. Status badges must carry text, not color alone.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone. @default 'neutral' */
  tone?: BadgeTone;
  /** @default 'sm' */
  size?: "sm" | "md";
  /** Fill (tinted) or outline. @default 'fill' */
  variant?: "fill" | "outline";
  /** Show a leading status dot. @default false */
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  variant = "fill",
  dot = false,
  className = "",
  ...rest
}: BadgeProps): React.ReactNode {
  const cls = [
    "nd-badge",
    `nd-badge--${tone}`,
    `nd-badge--${size}`,
    variant === "outline" ? "nd-badge--outline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot ? <span className="nd-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
