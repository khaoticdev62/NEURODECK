import { useId, type HTMLAttributes, type ReactNode } from "react";
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
  bodyClassName?: string;
  /** Make the panel a flex column and the body scrollable. Use when the panel fills a fixed viewport. */
  scrollable?: boolean;
}

export function Panel({
  title,
  eyebrow,
  action,
  variant = "glass",
  children,
  className = "",
  bodyClassName,
  scrollable = false,
  ...rest
}: PanelOwnProps & Omit<HTMLAttributes<HTMLElement>, keyof PanelOwnProps | "children">) {
  const headerId = useId();
  const emphasis = emphasisMap[variant];
  const cls = [
    "nd-panel",
    emphasis !== "default" ? `nd-panel--${emphasis}` : "",
    variantLegacyClasses[variant],
    scrollable ? "flex h-full flex-col overflow-hidden" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={cls}
      aria-labelledby={title ? headerId : undefined}
      {...rest}
    >
      {(title || eyebrow || action) && (
        <header id={headerId} className="nd-panel__head">
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
      <div
        className={
          bodyClassName ??
          `nd-panel__body nd-panel__body--normal ${scrollable ? "flex-1 min-h-0 overflow-y-auto" : ""}`
        }
      >
        {children}
      </div>
    </section>
  );
}
