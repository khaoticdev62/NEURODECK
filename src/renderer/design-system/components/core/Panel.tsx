import * as React from "react";

if (typeof document !== "undefined" && !document.getElementById("nd-panel-css")) {
  const s = document.createElement("style");
  s.id = "nd-panel-css";
  s.textContent = `
  .nd-panel{background:var(--nd-surface-secondary);
    border:1px solid var(--nd-border-subtle);border-radius:var(--nd-radius-xl);
    box-shadow:var(--nd-elevation-card);overflow:hidden;
    font-family:var(--nd-font-ui);color:var(--nd-text-primary);}
  .nd-panel--raised{box-shadow:var(--nd-elevation-card),0 0 0 1px var(--nd-border-subtle);}
  .nd-panel--active{border-color:rgba(var(--nd-cyan-rgb),0.4);box-shadow:var(--nd-elevation-card),0 0 24px rgba(var(--nd-cyan-rgb),0.14);}
  .nd-panel--critical{border-color:rgba(var(--nd-red-rgb),0.4);box-shadow:var(--nd-elevation-card),0 0 24px rgba(var(--nd-red-rgb),0.14);}
  .nd-panel--float{box-shadow:0 4px 0 rgba(0,0,0,0.4),0 16px 40px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06);}
  .nd-panel__head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;
    padding:12px 16px;border-bottom:1px solid var(--nd-border-subtle);background:rgba(5,7,10,0.2);}
  .nd-panel__titles{display:flex;flex-direction:column;gap:2px;min-width:0;}
  .nd-panel__title{font-size:16px;font-weight:650;line-height:22px;color:var(--nd-text-primary);}
  .nd-panel__eyebrow{font-family:var(--nd-font-mono);font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--nd-accent-primary);line-height:16px;}
  .nd-panel__desc{font-size:13px;color:var(--nd-text-muted);line-height:18px;}
  .nd-panel__actions{display:flex;align-items:center;gap:6px;flex:none;}
  .nd-panel__body{}
  .nd-panel__body--compact{padding:12px;}
  .nd-panel__body--normal{padding:16px;}
  .nd-panel__body--spacious{padding:20px;}
  @media(prefers-reduced-motion:reduce){.nd-panel{transition:none;}}`;
  document.head.appendChild(s);
}

export type PanelEmphasis = "default" | "raised" | "active" | "critical";
export type PanelDensity = "compact" | "normal" | "spacious";

/**
 * Reusable tactical-glass content surface with an optional titled header,
 * actions slot, density, and emphasis states.
 */
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  description?: string;
  /** Right-aligned header actions (IconButtons, Buttons, Badges). */
  actions?: React.ReactNode;
  /** Border/glow emphasis. @default 'default' */
  emphasis?: PanelEmphasis;
  /** Body padding. @default 'normal' */
  density?: PanelDensity;
  children: React.ReactNode;
}

export function Panel({
  title,
  eyebrow,
  description,
  actions,
  emphasis = "default",
  density = "normal",
  children,
  className = "",
  ...rest
}: PanelProps): React.ReactNode {
  const cls = ["nd-panel", emphasis !== "default" ? `nd-panel--${emphasis}` : "", className]
    .filter(Boolean)
    .join(" ");
  const hasHeader = title || eyebrow || description || actions;
  return (
    <section className={cls} {...rest}>
      {hasHeader ? (
        <header className="nd-panel__head">
          <div className="nd-panel__titles">
            {eyebrow ? <p className="nd-panel__eyebrow">{eyebrow}</p> : null}
            {title ? <h3 className="nd-panel__title">{title}</h3> : null}
            {description ? <p className="nd-panel__desc">{description}</p> : null}
          </div>
          {actions ? <div className="nd-panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`nd-panel__body nd-panel__body--${density}`}>{children}</div>
    </section>
  );
}
