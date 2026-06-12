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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-nd-border-subtle bg-nd-surface-base shadow-panel">
        <Icon className="h-7 w-7 text-nd-accent-primary/70" />
      </div>
      <h3 className="text-base font-semibold text-nd-text-primary">{title}</h3>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-nd-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
