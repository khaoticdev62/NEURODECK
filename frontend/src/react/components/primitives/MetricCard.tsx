import type { LucideIcon } from 'lucide-react';

export function MetricCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-neuro/30 hover:bg-neuro/[0.055]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-neuro" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
