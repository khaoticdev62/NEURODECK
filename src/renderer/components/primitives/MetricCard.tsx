import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 transition-[border-color,background-color,transform,box-shadow] duration-fast hover:-translate-y-px hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/[0.055] hover:shadow-[0_4px_16px_rgba(0,0,0,0.24)] ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xs uppercase tracking-[0.24em] text-nd-text-muted">{label}</p>
        <Icon className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-nd-text-primary">{value}</p>
      <p className="mt-1 text-xs text-nd-text-muted">{hint}</p>
    </div>
  );
}
