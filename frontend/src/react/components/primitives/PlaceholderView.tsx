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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Icon className="h-5 w-5 text-neuro" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        {children ?? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Icon className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            <p className="mt-1 max-w-xs text-xs text-slate-600">
              This view is being integrated from the legacy UI. Full functionality coming in the next build.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
