import type { LucideIcon } from 'lucide-react';

export function PlaceholderView({
  title,
  description,
  icon: Icon,
  children
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Icon className="h-5 w-5 text-nd-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-nd-text">{title}</h2>
          <p className="text-xs text-nd-text0">{description}</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-6">
        {children ?? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50">
              <Icon className="h-8 w-8 text-nd-text-muted/70" />
            </div>
            <h3 className="text-sm font-medium text-nd-text-muted">{title}</h3>
            <p className="mt-1 max-w-xs text-xs text-nd-text-muted/70">
              This view is being integrated from the legacy UI. Full functionality coming in the next build.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
