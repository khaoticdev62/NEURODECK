import type { ReactNode } from 'react';

export function Panel({ title, eyebrow, action, children, className = '' }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass-panel rounded-2xl ${className}`}>
      {(title || eyebrow || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neuro/80">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-sm font-semibold text-slate-100">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
