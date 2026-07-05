/**
 * Primary Navigation Rail category grouping — a pure presentation-layer
 * concern kept separate from `FeatureDescriptor`/`FeatureRegistry`
 * (grouping-for-the-rail is a UI decision, not a capability/permission
 * one, so the registry's real visibility computation stays untouched).
 * `navigationDestinations.ts` builds the rail's destination list from
 * `PINNED_FEATURE_IDS` plus one destination per category here, rather than
 * one destination per `FEATURE_CATALOG` entry — every catalog entry stays
 * fully reachable via Search/Command Palette regardless of rail grouping.
 */
export interface NavigationCategory {
  id: string
  label: string
  /** The `FEATURE_CATALOG` id the rail icon navigates to and derives its route/visibility from. */
  primaryFeatureId: string
  /** Every `FEATURE_CATALOG` id this category represents — used for active-state matching today, and for Sprint 2's in-category tabs. */
  memberFeatureIds: string[]
}

export const NAVIGATION_CATEGORIES: NavigationCategory[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    primaryFeatureId: 'workspaces',
    memberFeatureIds: ['workspaces', 'files']
  },
  {
    id: 'ide',
    label: 'IDE',
    primaryFeatureId: 'build',
    memberFeatureIds: ['build', 'extensions']
  },
  {
    id: 'terminal',
    label: 'Terminal',
    primaryFeatureId: 'terminal',
    memberFeatureIds: ['terminal']
  },
  {
    id: 'ai',
    label: 'AI',
    primaryFeatureId: 'ai',
    memberFeatureIds: ['ai', 'ai-chat', 'automations', 'models']
  },
  {
    id: 'browser',
    label: 'Browser',
    primaryFeatureId: 'browser',
    memberFeatureIds: ['browser']
  },
  {
    id: 'system',
    label: 'System',
    primaryFeatureId: 'system',
    memberFeatureIds: ['system']
  }
]

/** Rail items that stay pinned as individual, ungrouped destinations. */
export const PINNED_FEATURE_IDS = ['home', 'search']
