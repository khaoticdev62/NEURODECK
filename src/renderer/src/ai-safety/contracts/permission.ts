/**
 * Permission capabilities (mega-prompt §16). Only the subset reachable by a
 * tool that genuinely exists today is registered in the broker — the rest
 * of the spec's list (files.*, terminal.*, git.*, remote.*, ...) becomes
 * real once the epics that own those tools (5, 6, 9, 10) land.
 */
export type PermissionCapability =
  | 'files.read'
  | 'files.write'
  | 'files.delete'
  | 'terminal.execute'
  | 'terminal.privileged'
  | 'network.request'
  | 'secrets.use'
  | 'git.commit'
  | 'git.push'
  | 'git.forcePush'
  | 'packages.install'
  | 'remote.connect'
  | 'remote.execute'
  | 'system.readMetrics'
  | 'system.changeSettings'
  | 'external.send'
  | 'browser.download'
  | 'browser.upload'
  | 'tutorial.acknowledge'

/** Permission scope (mega-prompt §16.1). "Current task/workflow run" are omitted — no task or workflow runtime exists yet (Epic 8). */
export type PermissionScope = 'once' | 'session' | 'workspace' | 'persistent'

export interface PermissionRequest {
  capability: PermissionCapability
  reason: string
  scope: PermissionScope
}

export interface PermissionGrant {
  capability: PermissionCapability
  scope: PermissionScope
  grantedAt: number
}
