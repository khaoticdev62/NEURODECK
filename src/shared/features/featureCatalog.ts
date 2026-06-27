import type { FeatureDescriptor } from '../contracts/feature'

/**
 * Epic X1 Feature Registry catalog — the single source of truth for the
 * primary Navigation Rail's destinations (`navigationDestinations.ts`
 * derives `NAVIGATION_DESTINATIONS` from this rather than duplicating the
 * same 12 entries), and what `FeatureRegistry.list()` computes real
 * visibility against. Every entry below has zero capability/profile/
 * extension dependencies — the honest truth today, since no Phase A
 * screen is hardware- or profile-gated. Phase B epics that add a
 * genuinely gated feature (Bluetooth Center needing `bluetooth`, Voice
 * Assistant needing `microphone`) append real entries here with a real
 * `capabilityDependencies` array, not a placeholder.
 */
export const FEATURE_CATALOG: FeatureDescriptor[] = [
  {
    id: 'home',
    route: '/',
    name: 'Home',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'search',
    route: '/search',
    name: 'Search',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'ai',
    route: '/ai',
    name: 'AI',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'workspaces',
    route: '/workspaces',
    name: 'Workspaces',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'build',
    route: '/build',
    name: 'Build',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'files',
    route: '/files',
    name: 'Files',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'terminal',
    route: '/terminal',
    name: 'Terminal',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'browser',
    route: '/browser',
    name: 'Browser',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'automations',
    route: '/automations',
    name: 'Automations',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'models',
    route: '/models',
    name: 'Models',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'extensions',
    route: '/extensions',
    name: 'Extensions',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'learn',
    route: '/learn',
    name: 'Learn',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  },
  {
    id: 'system',
    route: '/system',
    name: 'System',
    capabilityDependencies: [],
    permissionRequirements: [],
    profileVisibility: []
  }
]
