import { NavigationRailItem } from './NavigationRailItem'
import { NAVIGATION_DESTINATIONS } from './navigationDestinations'
import { useFeatureVisibility } from './useFeatureVisibility'

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
 *
 * Epic X1: filters against the real `FeatureRegistry` ("Do not leave dead
 * routes" — supplemental §34). Every current destination resolves
 * `visible` today (none of the 12 core screens is hardware/profile-gated
 * yet), so this has no observable effect right now — it's the real
 * mechanism Phase B's gated features (Bluetooth Center, Voice Assistant)
 * extend, not a no-op placeholder. Fails open (shows the destination) if
 * the Feature Registry hasn't responded yet, so a slow/unavailable IPC
 * round-trip never blanks primary navigation.
 */
export function NavigationRail({
  hidden = false,
  expanded = false
}: NavigationRailProps): React.JSX.Element | null {
  const featureStates = useFeatureVisibility()
  if (hidden) return null

  const destinations = NAVIGATION_DESTINATIONS.filter(
    (destination) => featureStates.get(destination.id)?.visibility !== 'hidden'
  )

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col gap-1 overflow-y-auto border-r border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-activitybar-bg)] px-1 py-2"
      style={{
        width: expanded
          ? 'var(--ndx-rail-primary-expanded)'
          : 'var(--ndx-workbench-activitybar-width)',
        zIndex: 'var(--ndx-z-rail)'
      }}
    >
      {destinations.map((destination) => (
        <NavigationRailItem key={destination.id} destination={destination} expanded={expanded} />
      ))}
    </nav>
  )
}
