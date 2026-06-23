export interface NavigationDestination {
  id: string
  label: string
  path: string
}

/** Primary Navigation Rail destinations, in order (wireframe §6.2). */
export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'search', label: 'Search', path: '/search' },
  { id: 'ai', label: 'AI', path: '/ai' },
  { id: 'workspaces', label: 'Workspaces', path: '/workspaces' },
  { id: 'build', label: 'Build', path: '/build' },
  { id: 'files', label: 'Files', path: '/files' },
  { id: 'terminal', label: 'Terminal', path: '/terminal' },
  { id: 'browser', label: 'Browser', path: '/browser' },
  { id: 'automations', label: 'Automations', path: '/automations' },
  { id: 'models', label: 'Models', path: '/models' },
  { id: 'learn', label: 'Learn', path: '/learn' },
  { id: 'system', label: 'System', path: '/system' }
]
