import type { ReactNode } from 'react';

const toneClasses = {
  neutral: 'border-nd-text-muted/15 bg-nd-surface/50 text-nd-text-primary/80',
  accent: 'border-nd-accent-primary/30 bg-nd-accent-primary/10 text-nd-accent-primary',
  success: 'border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success',
  warning: 'border-nd-accent-warning/30 bg-nd-accent-warning/10 text-nd-accent-warning',
  danger: 'border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error'
};

const toneOutlineClasses = {
  neutral: 'border-nd-text-muted/25 text-nd-text-primary/80',
  accent: 'border-nd-accent-primary/40 text-nd-accent-primary',
  success: 'border-nd-accent-success/40 text-nd-accent-success',
  warning: 'border-nd-accent-warning/40 text-nd-accent-warning',
  danger: 'border-nd-accent-error/40 text-nd-accent-error'
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
      {dot && <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tone === 'accent' ? 'bg-nd-accent-primary' : tone === 'success' ? 'bg-nd-accent-success' : tone === 'warning' ? 'bg-nd-accent-warning' : tone === 'danger' ? 'bg-nd-accent-error' : 'bg-nd-text-muted'}`} />}
      {children}
    </span>
  );
}
