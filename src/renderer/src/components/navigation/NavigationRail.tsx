import { NavigationRailItem } from './NavigationRailItem'
import { NAVIGATION_DESTINATIONS } from './navigationDestinations'

export interface NavigationRailProps {
  /** Focus mode collapses navigation entirely (wireframe §3.3) — render nothing rather than a hidden husk. */
  hidden?: boolean
  expanded?: boolean
}

/**
 * Primary Navigation Rail (wireframe §6.2). Each destination registers as a
 * real Spatial Focus Engine node (Epic 2) via `NavigationRailItem`. `X` quick
 * actions and `L3` pin/unpin still have no consumer (no per-destination
 * quick-action menu exists yet) and are deferred to the epics that add one.
 */
export function NavigationRail({
  hidden = false,
  expanded = false
}: NavigationRailProps): React.JSX.Element | null {
  if (hidden) return null

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col gap-1 overflow-y-auto border-r border-border bg-surface py-3"
      style={{
        width: expanded ? 'var(--ndx-rail-primary-expanded)' : 'var(--ndx-rail-primary-collapsed)',
        zIndex: 'var(--ndx-z-rail)'
      }}
    >
      {NAVIGATION_DESTINATIONS.map((destination) => (
        <NavigationRailItem key={destination.id} destination={destination} expanded={expanded} />
      ))}
    </nav>
  )
}
