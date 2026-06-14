import type { LucideIcon } from 'lucide-react';
import '../../../design-system/components/core/StatusChip';

type StatusTone = 'info' | 'success' | 'warning' | 'error';
type StatusSize = 'sm' | 'md';

const toneClasses: Record<StatusTone, string> = {
  info: 'border-nd-accent-info/30 bg-nd-accent-info/10 text-nd-accent-info',
  success: 'border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success',
  warning: 'border-nd-accent-warning/30 bg-nd-accent-warning/10 text-nd-accent-warning',
  error: 'border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error',
};

const sizeClasses: Record<StatusSize, string> = {
  sm: 'h-5 gap-1 px-1.5 text-2xs',
  md: 'h-6 gap-1.5 px-2 text-xs',
};

export function StatusChip({
  tone = 'info',
  size = 'md',
  icon: Icon,
  pulse = false,
  children,
  className = '',
}: {
  tone?: StatusTone;
  size?: StatusSize;
  icon?: LucideIcon;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = ['nd-chip', `nd-chip--${tone}`, `nd-chip--${size}`, toneClasses[tone], sizeClasses[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls}>
      {Icon ? (
        <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
      ) : (
        <span
          className={[
            'nd-chip__dot',
            pulse ? 'nd-chip__dot--pulse animate-pulse' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
