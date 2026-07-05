import { useLocation, useNavigate } from 'react-router-dom'
import { FEATURE_CATALOG } from '@shared/features/featureCatalog'
import { NdxTvTabBar } from '../tvos'
import { findActiveCategory } from './activeCategory'

/**
 * In-category subwindow tabs (Navigation Rail Sprint 2): when the current
 * route belongs to a multi-member category (e.g. IDE = Build + Extensions),
 * shows the rest of that category's members as real, controller-focusable
 * tabs above the route content, so they're reachable without returning to
 * the rail. Renders nothing for single-member categories (Terminal,
 * Browser, System) or ungrouped destinations (Home, Search) — a one-tab
 * strip would be noise. This is `NdxTvTabBar`'s first real production use;
 * clicking a tab just navigates to that member's real, unchanged route,
 * the same way the rail itself already works one level up.
 */
export function CategoryTabStrip(): React.JSX.Element | null {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = findActiveCategory(pathname)
  if (!active || active.category.memberFeatureIds.length < 2) return null

  const tabs = active.category.memberFeatureIds
    .map((featureId) => FEATURE_CATALOG.find((feature) => feature.id === featureId))
    .filter((feature): feature is NonNullable<typeof feature> => feature !== undefined)
    .map((feature) => ({ id: feature.id, label: feature.name }))

  return (
    <NdxTvTabBar
      groupId={`category-tabs:${active.category.id}`}
      tabs={tabs}
      activeId={active.activeFeatureId}
      onSelect={(featureId) => {
        const feature = FEATURE_CATALOG.find((candidate) => candidate.id === featureId)
        if (feature) navigate(feature.route)
      }}
    />
  )
}
