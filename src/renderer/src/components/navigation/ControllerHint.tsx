import { cn } from '../primitives/cn'

export interface ControllerHintProps {
  glyph: string
  /** Hints use verbs, not vague nouns (spec §6.3) — e.g. "Open", not "Item". */
  label: string
  className?: string
}

export function ControllerHint({
  glyph,
  label,
  className
}: ControllerHintProps): React.JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-meta text-text-secondary', className)}
    >
      <span className="inline-flex min-w-6 items-center justify-center rounded-sm border border-border-strong bg-surface-raised px-1.5 py-0.5 text-text-primary">
        {glyph}
      </span>
      {label}
    </span>
  )
}
