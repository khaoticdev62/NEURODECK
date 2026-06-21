import { useId, type HTMLAttributes, type ReactNode } from "react";
import "../../design-system/components/core/Panel";

type PanelVariant = "glass" | "flat" | "elevated" | "surface";
type PanelEmphasis = "default" | "raised" | "active" | "critical";
type PanelDepth = "surface" | "float" | "sunken";

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
  /** Visual depth. "float" adds strong drop-shadow with inset highlight. @default "surface" */
  depth?: PanelDepth;
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
  depth = "surface",
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
    depth === "float" ? "nd-panel--float" : "",
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
          // flex-1/min-h-0 are no-ops unless the <section> above is itself a flex
          // container (e.g. callers passing className="flex h-full flex-col
          // overflow-hidden" to render their own internal scroll area) — applying
          // them unconditionally lets that pattern actually fill height and scroll
          // instead of silently overflowing past the section's `overflow:hidden`
          // with no scrollbar. Harmless for the common non-flex Panel usage.
          `nd-panel__body nd-panel__body--normal flex-1 min-h-0 ${scrollable ? "overflow-y-auto" : ""}`
        }
      >
        {children}
      </div>
    </section>
  );
}
