import type { HTMLAttributes, ReactNode } from "react";
import "../../../design-system/components/core/Panel";

type PanelVariant = "glass" | "flat" | "elevated" | "surface";
type PanelEmphasis = "default" | "raised" | "active" | "critical";

const emphasisMap: Record<PanelVariant, PanelEmphasis> = {
  glass: "default",
  flat: "default",
  elevated: "raised",
  surface: "default",
};

const variantLegacyClasses: Record<PanelVariant, string> = {
  glass: "glass-panel",
  flat: "glass-panel-flat",
  elevated: "glass-panel-elevated",
  surface: "bg-nd-surface-base border border-nd-border-subtle",
};

interface PanelOwnProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  variant?: PanelVariant;
  children: ReactNode;
  className?: string;
}

export function Panel({
  title,
  eyebrow,
  action,
  variant = "glass",
  children,
  className = "",
  ...rest
}: PanelOwnProps & Omit<HTMLAttributes<HTMLElement>, keyof PanelOwnProps | "children">) {
  const emphasis = emphasisMap[variant];
  const cls = [
    "nd-panel",
    emphasis !== "default" ? `nd-panel--${emphasis}` : "",
    variantLegacyClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} {...rest}>
      {(title || eyebrow || action) && (
        <header className="nd-panel__head">
          <div className="nd-panel__titles">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-accent-primary/80">
                {eyebrow}
              </p>
            )}
            {title && <h3 className="nd-panel__title">{title}</h3>}
          </div>
          {action && <div className="nd-panel__actions">{action}</div>}
        </header>
      )}
      <div className="nd-panel__body nd-panel__body--normal">{children}</div>
    </section>
  );
}
