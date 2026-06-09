import type { ReactNode } from 'react';

const toneClasses = {
  neutral: 'border-white/10 bg-white/[0.04] text-slate-300',
  accent: 'border-neuro/30 bg-neuro/10 text-neuro',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger'
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof toneClasses }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
