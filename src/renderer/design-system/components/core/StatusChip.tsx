import * as React from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-statuschip-css")) {
  const s = document.createElement("style");
  s.id = "nd-statuschip-css";
  s.textContent = `
  .nd-chip{display:inline-flex;align-items:center;gap:7px;font-family:var(--nd-font-ui);
    font-weight:600;border:1px solid;border-radius:var(--nd-radius-full);line-height:1;white-space:nowrap;}
  .nd-chip--sm{height:22px;padding:0 9px;font-size:11px;}
  .nd-chip--md{height:26px;padding:0 11px;font-size:12px;}
  .nd-chip__glyph{font-family:var(--nd-font-mono);font-weight:700;}
  .nd-chip__icon{display:flex;align-items:center;justify-content:center;}
  .nd-chip__icon svg{width:14px;height:14px;}
  .nd-chip--sm .nd-chip__icon svg{width:12px;height:12px;}
  .nd-chip__dot{width:7px;height:7px;border-radius:50%;background:currentColor;}
  .nd-chip__dot--pulse{animation:nd-chip-pulse 1.4s var(--nd-ease-standard) infinite;}
  @keyframes nd-chip-pulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
  .nd-chip--info{color:var(--nd-accent-info);border-color:rgba(var(--nd-blue-rgb),0.3);background:rgba(var(--nd-blue-rgb),0.1);}
  .nd-chip--success{color:var(--nd-accent-success);border-color:rgba(var(--nd-green-rgb),0.3);background:rgba(var(--nd-green-rgb),0.1);}
  .nd-chip--warning{color:var(--nd-accent-warning);border-color:rgba(var(--nd-yellow-rgb),0.3);background:rgba(var(--nd-yellow-rgb),0.1);}
  .nd-chip--error{color:var(--nd-accent-error);border-color:rgba(var(--nd-red-rgb),0.3);background:rgba(var(--nd-red-rgb),0.1);}
  @media (prefers-reduced-motion: reduce){.nd-chip__dot--pulse{animation:none;}}`;
  document.head.appendChild(s);
}

const GLYPHS = { info: "…", success: "✓", warning: "!", error: "×" };

export type StatusTone = "info" | "success" | "warning" | "error";

/**
 * Status indicator following NEURODECK's icon + label + color rule. Renders a
 * mono status glyph (or a pulsing dot) plus a label.
 */
export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default 'info' */
  tone?: StatusTone;
  /** @default 'md' */
  size?: "sm" | "md";
  /** Use a pulsing dot instead of a glyph (e.g. live "running"). @default false */
  pulse?: boolean;
  /** Override the default glyph for the tone. */
  glyph?: string;
  /** Optional icon node rendered in place of the glyph/dot. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function StatusChip({
  tone = "info",
  size = "md",
  pulse = false,
  glyph,
  icon,
  children,
  className = "",
  ...rest
}: StatusChipProps): React.ReactNode {
  const cls = ["nd-chip", `nd-chip--${tone}`, `nd-chip--${size}`, className]
    .filter(Boolean)
    .join(" ");
  const mark = glyph ?? GLYPHS[tone];
  return (
    <span className={cls} {...rest}>
      {icon ? (
        <span className="nd-chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : pulse ? (
        <span className="nd-chip__dot nd-chip__dot--pulse" aria-hidden="true" />
      ) : (
        <span className="nd-chip__glyph" aria-hidden="true">
          {mark}
        </span>
      )}
      {children}
    </span>
  );
}
