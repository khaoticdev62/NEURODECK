import { ControllerHint, type ControllerHintProps } from './ControllerHint'
import { DEFAULT_PRIMARY_HINTS } from './defaultControllerHints'

export interface BottomControllerRailProps {
  primaryHints?: ControllerHintProps[]
  secondaryHints?: ControllerHintProps[]
}

/**
 * Bottom Controller Rail (wireframe §6.3). Hints are static defaults until
 * Epic 2's focus engine drives them per-focused-element (spec requires a
 * <100ms update on focus change — there is no focus engine yet to update from).
 * Caps at 6 total hints per the spec's maximum.
 */
export function BottomControllerRail({
  primaryHints = DEFAULT_PRIMARY_HINTS,
  secondaryHints = []
}: BottomControllerRailProps): React.JSX.Element {
  const visibleSecondary = secondaryHints.slice(0, Math.max(0, 6 - primaryHints.length))

  return (
    <footer
      role="contentinfo"
      className="flex items-center justify-between border-t border-border bg-surface px-[var(--ndx-safe-inset)]"
      style={{ height: 'var(--ndx-rail-bottom-height)', zIndex: 'var(--ndx-z-rail)' }}
    >
      <div className="flex items-center gap-4">
        {primaryHints.map((hint) => (
          <ControllerHint key={hint.glyph} {...hint} />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {visibleSecondary.map((hint) => (
          <ControllerHint key={hint.glyph} {...hint} />
        ))}
      </div>
    </footer>
  )
}
