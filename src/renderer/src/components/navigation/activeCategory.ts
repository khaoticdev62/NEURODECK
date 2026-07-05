import { FEATURE_CATALOG } from '@shared/features/featureCatalog'
import {
  NAVIGATION_CATEGORIES,
  type NavigationCategory
} from '@shared/features/navigationCategories'

/** Prefix-matches a route the same way `NavLink`'s default (non-`end`) matching does, except `/` only matches exactly. */
export function matchesRoute(pathname: string, route: string): boolean {
  if (route === '/') return pathname === '/'
  return pathname === route || pathname.startsWith(`${route}/`)
}

export interface ActiveCategory {
  category: NavigationCategory
  activeFeatureId: string
}

/**
 * Resolves which `NavigationCategory` (if any) owns the current pathname,
 * and which of its members matched — a category stays "active" while on
 * any member's route, not just its primary one (e.g. `/extensions` still
 * belongs to the "IDE" category even though IDE's rail icon points at
 * `/build`). Shared by `NavigationRailItem` (rail active-state) and
 * `CategoryTabStrip` (Sprint 2 in-category tabs) so both agree on the
 * same answer.
 */
export function findActiveCategory(pathname: string): ActiveCategory | undefined {
  for (const category of NAVIGATION_CATEGORIES) {
    for (const featureId of category.memberFeatureIds) {
      const feature = FEATURE_CATALOG.find((candidate) => candidate.id === featureId)
      if (feature && matchesRoute(pathname, feature.route)) {
        return { category, activeFeatureId: featureId }
      }
    }
  }
  return undefined
}

/** Whether a rail destination (pinned or category) should render as active for the current pathname. */
export function isDestinationActive(
  pathname: string,
  destination: { id: string; path: string }
): boolean {
  const category = NAVIGATION_CATEGORIES.find((candidate) => candidate.id === destination.id)
  if (!category) return matchesRoute(pathname, destination.path)
  return category.memberFeatureIds.some((featureId) => {
    const feature = FEATURE_CATALOG.find((candidate) => candidate.id === featureId)
    return feature !== undefined && matchesRoute(pathname, feature.route)
  })
}
