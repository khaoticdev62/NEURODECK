import { FEATURE_CATALOG } from '@shared/features/featureCatalog'
import { NAVIGATION_CATEGORIES, PINNED_FEATURE_IDS } from '@shared/features/navigationCategories'

export interface NavigationDestination {
  id: string
  label: string
  path: string
}

function findFeature(featureId: string): (typeof FEATURE_CATALOG)[number] {
  const feature = FEATURE_CATALOG.find((descriptor) => descriptor.id === featureId)
  if (!feature) {
    throw new Error(`Navigation category references unknown feature id "${featureId}"`)
  }
  return feature
}

/**
 * Primary Navigation Rail destinations, in order (wireframe §6.2). Built
 * from `PINNED_FEATURE_IDS` (Home/Search, unchanged 1:1 from
 * `FEATURE_CATALOG`) plus one destination per `NAVIGATION_CATEGORIES`
 * entry — the category's icon/route come from its `primaryFeatureId`,
 * rather than one destination per `FEATURE_CATALOG` entry as before.
 * Every catalog entry (grouped or not) stays real and fully reachable via
 * Search/Command Palette, which read `FEATURE_CATALOG` directly.
 */
export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  ...PINNED_FEATURE_IDS.map((featureId) => {
    const feature = findFeature(featureId)
    return { id: feature.id, label: feature.name, path: feature.route }
  }),
  ...NAVIGATION_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    path: findFeature(category.primaryFeatureId).route
  }))
]
