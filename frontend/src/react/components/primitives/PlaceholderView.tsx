import type { LucideIcon } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}

export function PlaceholderView({
  title,
  description,
  icon: Icon,
  children,
}: PlaceholderViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Icon className="h-5 w-5 text-nd-accent-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-nd-text-primary">{title}</h2>
          {description && <p className="text-xs text-nd-text-muted">{description}</p>}
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-6">
        {children ?? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/50">
              <Icon className="h-8 w-8 text-nd-text-muted" />
            </div>
            <h3 className="text-sm font-medium text-nd-text-muted">{title}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
