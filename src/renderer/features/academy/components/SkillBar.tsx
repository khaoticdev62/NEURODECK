interface SkillBarProps {
  label: string;
  score: number; // 0–100
  target?: number; // optional requirement marker
  compact?: boolean;
}

export function SkillBar({ label, score, target, compact = false }: SkillBarProps) {
  const pct = Math.min(100, Math.max(0, score));
  const targetPct = target != null ? Math.min(100, Math.max(0, target)) : undefined;
  const meetsTarget = targetPct == null || pct >= targetPct;

  const tone = !meetsTarget
    ? "bg-nd-accent-warning"
    : pct >= 80
      ? "bg-nd-accent-success"
      : pct >= 50
        ? "bg-nd-accent-primary"
        : pct > 0
          ? "bg-nd-accent-warning"
          : "bg-nd-text-muted/20";

  return (
    <div className={`flex-1 ${compact ? "space-y-0.5" : "space-y-1.5"}`}>
      <div className="flex items-center justify-between">
        <span
          className={`${compact ? "text-[11px]" : "text-xs"} font-medium text-nd-text-secondary`}
        >
          {label}
        </span>
        <span
          className={`${compact ? "text-[11px]" : "text-xs"} font-mono font-semibold text-nd-text-primary`}
        >
          {pct}
        </span>
      </div>
      <div
        className={`relative ${compact ? "h-1" : "h-1.5"} overflow-hidden rounded-full bg-nd-surface-tertiary/60`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${tone} ${pct >= 80 && meetsTarget ? "shadow-[0_0_8px_rgba(var(--nd-green-rgb),0.35)]" : ""}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}${targetPct != null ? ` (required: ${targetPct})` : ""}%`}
        />
        {targetPct != null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-nd-text-primary/40"
            style={{ left: `${targetPct}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
