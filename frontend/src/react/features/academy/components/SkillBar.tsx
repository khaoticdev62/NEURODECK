interface SkillBarProps {
  label: string;
  score: number; // 0–100
  compact?: boolean;
}

export function SkillBar({ label, score, compact = false }: SkillBarProps) {
  const pct = Math.min(100, Math.max(0, score));
  const tone =
    pct >= 80 ? 'bg-nd-success' : pct >= 50 ? 'bg-nd-accent' : pct > 0 ? 'bg-nd-warning' : 'bg-nd-text-muted/20';

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <div className="flex items-center justify-between">
        <span className={`${compact ? 'text-[11px]' : 'text-xs'} text-nd-text-muted`}>{label}</span>
        <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-mono text-nd-text/70`}>{pct}</span>
      </div>
      <div className={`${compact ? 'h-1' : 'h-1.5'} overflow-hidden rounded-full bg-nd-surface/60`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
    </div>
  );
}
