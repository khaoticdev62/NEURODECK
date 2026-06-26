import { FEATURE_CATALOG } from '@shared/features/featureCatalog'

export interface NavigationDestination {
  id: string
  label: string
  path: string
}

/**
 * Primary Navigation Rail destinations, in order (wireframe §6.2).
 * Derived from `FEATURE_CATALOG` (Epic X1 Feature Registry) rather than a
 * second hand-maintained list — `FeatureRegistry.list()`'s real visibility
 * computation is what `NavigationRail` now filters against.
 */
export const NAVIGATION_DESTINATIONS: NavigationDestination[] = FEATURE_CATALOG.map(
  (descriptor) => ({ id: descriptor.id, label: descriptor.name, path: descriptor.route })
)
