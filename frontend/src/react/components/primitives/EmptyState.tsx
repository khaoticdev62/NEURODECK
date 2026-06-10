import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50">
        <Icon className="h-6 w-6 text-nd-text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-nd-text/80">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-nd-text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
