import type { ReactNode } from 'react';

const toneClasses = {
  neutral: 'border-nd-text-muted/15 bg-nd-surface/50 text-nd-text/80',
  accent: 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent',
  success: 'border-nd-success/30 bg-nd-success/10 text-nd-success',
  warning: 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning',
  danger: 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger'
};

const toneOutlineClasses = {
  neutral: 'border-nd-text-muted/25 text-nd-text/80',
  accent: 'border-nd-accent/40 text-nd-accent',
  success: 'border-nd-success/40 text-nd-success',
  warning: 'border-nd-warning/40 text-nd-warning',
  danger: 'border-nd-danger/40 text-nd-danger'
};

export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  variant = 'fill',
  dot = false,
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  size?: 'sm' | 'md';
  variant?: 'fill' | 'outline';
  dot?: boolean;
  className?: string;
}) {
  const sizeCls = size === 'sm'
    ? 'px-2 py-0.5 text-2xs tracking-[0.18em]'
    : 'px-2.5 py-1 text-xs tracking-[0.14em]';

  const variantCls = variant === 'fill' ? toneClasses[tone] : toneOutlineClasses[tone];

  return (
    <span className={`inline-flex items-center rounded-full border ${sizeCls} ${variantCls} ${className}`}>
      {dot && <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tone === 'accent' ? 'bg-nd-accent' : tone === 'success' ? 'bg-nd-success' : tone === 'warning' ? 'bg-nd-warning' : tone === 'danger' ? 'bg-nd-danger' : 'bg-nd-text-muted'}`} />}
      {children}
    </span>
  );
}
