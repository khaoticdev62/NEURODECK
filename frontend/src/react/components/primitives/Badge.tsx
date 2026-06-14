import type { ReactNode } from 'react';
import { Badge as DSBadge } from '../../../design-system/components/core/Badge';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const toneMap: Record<BadgeTone, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
  neutral: 'neutral',
  accent: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-nd-text-muted/15 bg-nd-surface/50 text-nd-text/80',
  accent: 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent',
  success: 'border-nd-success/30 bg-nd-success/10 text-nd-success',
  warning: 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning',
  danger: 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger',
};

const toneOutlineClasses: Record<BadgeTone, string> = {
  neutral: 'border-nd-text-muted/25 text-nd-text/80',
  accent: 'border-nd-accent/40 text-nd-accent',
  success: 'border-nd-success/40 text-nd-success',
  warning: 'border-nd-warning/40 text-nd-warning',
  danger: 'border-nd-danger/40 text-nd-danger',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-2xs tracking-[0.18em]',
  md: 'px-2.5 py-1 text-xs tracking-[0.14em]',
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
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  variant?: 'fill' | 'outline';
  dot?: boolean;
  className?: string;
}) {
  const extra = [
    sizeClasses[size],
    variant === 'fill' ? toneClasses[tone] : toneOutlineClasses[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <DSBadge tone={toneMap[tone]} size={size} variant={variant} dot={dot} className={extra}>
      {children}
    </DSBadge>
  );
}
