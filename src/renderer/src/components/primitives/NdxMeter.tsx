import { cn } from './cn'

export type NdxMeterTone = 'accent' | 'secondary' | 'warning' | 'error'

export interface NdxMeterProps {
  label: string
  /** Real measured percentage (0-100) — never a placeholder or estimated value. */
  percent: number
  /** Overrides the default `NN.N%` readout, e.g. `"24GB / 32GB"`. */
  displayValue?: string
  /** Defaults to a real usage-derived tone (>=90% error, >=75% warning) rather than a fixed color. */
  tone?: NdxMeterTone
  className?: string
}

const TONE_CLASSES: Record<NdxMeterTone, string> = {
  accent: 'bg-[var(--ndx-accent)] shadow-[0_0_8px_0_rgb(var(--ndx-accent-rgb)/0.65)]',
  secondary: 'bg-[var(--color-secondary)] shadow-[0_0_8px_0_rgb(77_214_253/0.65)]',
  warning: 'bg-status-warning shadow-[0_0_8px_0_rgb(244_201_93/0.65)]',
  error: 'bg-status-error shadow-[0_0_8px_0_rgb(255_180_171/0.65)]'
}

function defaultTone(percent: number): NdxMeterTone {
  if (percent >= 90) return 'error'
  if (percent >= 75) return 'warning'
  return 'accent'
}

/**
 * NeuroSpatial Workbench "System Health" meter (RAM/Storage bars in the
 * Command Center reference). Tone reflects the real measured percentage by
 * default so a critically full disk or overheated CPU reads as risk, not
 * just another neutral stat line.
 */
export function NdxMeter({
  label,
  percent,
  displayValue,
  tone,
  className
}: NdxMeterProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, percent))
  const resolvedTone = tone ?? defaultTone(clamped)

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-2 text-meta">
        <span className="truncate text-text-secondary">{label}</span>
        <span className="shrink-0 tabular-nums text-text-primary">
          {displayValue ?? `${clamped.toFixed(1)}%`}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ndx-workbench-control-bg)]"
      >
        <div
          className={cn('h-full rounded-full', TONE_CLASSES[resolvedTone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
