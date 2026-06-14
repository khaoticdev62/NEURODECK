import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const rootClass = [
    'flex flex-col items-center justify-center text-center',
    compact ? 'px-3 py-6' : 'px-4 py-12',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <div
        className={`mb-4 flex items-center justify-center border border-nd-text-muted/15 bg-nd-surface/40 shadow-panel ${
          compact ? 'h-10 w-10 rounded-xl' : 'h-14 w-14 rounded-2xl'
        }`}
      >
        <Icon className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} text-nd-accent`} aria-hidden="true" />
      </div>
      <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-nd-text`}>{title}</h3>
      <p className={`${compact ? 'max-w-[14rem] text-xs' : 'max-w-xs text-sm'} mt-1 leading-relaxed text-nd-text-muted`}>
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
