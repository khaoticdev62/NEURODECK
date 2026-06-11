import type { ReactNode } from 'react';

export function Panel({ title, eyebrow, action, children, className = '' }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass-panel rounded-2xl ${className}`}>
      {(title || eyebrow || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-nd-text-muted/15 px-4 py-3">
          <div>
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-accent/80">{eyebrow}</p>}
            {title && <h3 className="mt-1 text-sm font-semibold text-nd-text">{title}</h3>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
