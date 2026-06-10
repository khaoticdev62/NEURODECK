import type { ReactNode } from 'react';

const toneClasses = {
  neutral: 'border-nd-text-muted/15 bg-nd-surface/50 text-nd-text/80',
  accent: 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent',
  success: 'border-nd-success/30 bg-nd-success/10 text-nd-success',
  warning: 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning',
  danger: 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger'
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof toneClasses }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium uppercase tracking-[0.18em] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
