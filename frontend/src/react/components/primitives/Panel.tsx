import type { ReactNode } from 'react';

type PanelVariant = 'glass' | 'flat' | 'elevated' | 'surface';

const variantClasses: Record<PanelVariant, string> = {
  glass:    'glass-panel',
  elevated: 'glass-panel-elevated',
  flat:     'glass-panel-flat',
  surface:  'bg-nd-surface border border-nd-border-subtle',
};

export function Panel({
  title,
  eyebrow,
  action,
  variant = 'glass',
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  variant?: PanelVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl ${variantClasses[variant]} ${className}`}>
      {(title || eyebrow || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-nd-text-muted/15 px-4 py-3">
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-accent/80">
                {eyebrow}
              </p>
            )}
            {title && (
              <h3 className="mt-1 text-sm font-semibold text-nd-text">
                {title}
              </h3>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
