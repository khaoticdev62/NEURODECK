import { useEffect, useMemo, useState } from 'react'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { Modal } from '../../components/overlays/Modal'
import {
  NAVIGATION_DESTINATIONS,
  type NavigationDestination
} from '../../components/navigation/navigationDestinations'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { listAgents } from '../../services/ipc/agentClient'
import { listFiles } from '../../services/ipc/fileClient'
import { listWorkflows } from '../../services/ipc/workflowClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { CommandPaletteResultRow } from './CommandPaletteResultRow'
import { CommandPaletteToolRow } from './CommandPaletteToolRow'

interface PaletteDomainResult extends NavigationDestination {
  subtitle: string
}

interface PaletteDomain {
  id: string
  label: string
  results: PaletteDomainResult[]
}

interface LoadedDomainState {
  files: PaletteDomainResult[]
  workspaces: PaletteDomainResult[]
  workflows: PaletteDomainResult[]
  agents: PaletteDomainResult[]
  errors: string[]
}

const EMPTY_LOADED_STATE: LoadedDomainState = {
  files: [],
  workspaces: [],
  workflows: [],
  agents: [],
  errors: []
}

const SECONDARY_SCREENS: PaletteDomainResult[] = [
  { id: 'global-search', label: 'Global Search', path: '/search', subtitle: 'ND-010 - Epic 3' },
  {
    id: 'ai-timeline',
    label: 'AI Execution Timeline',
    path: '/ai/timeline',
    subtitle: 'ND-014 - Epic 4'
  },
  {
    id: 'ai-approvals',
    label: 'Approval Queue',
    path: '/ai/approvals',
    subtitle: 'ND-015 - Epic 4'
  },
  {
    id: 'terminal-command-builder',
    label: 'Command Builder',
    path: '/terminal/builder',
    subtitle: 'ND-029 - Epic 6'
  },
  {
    id: 'automations-forge-new',
    label: 'Workflow Forge',
    path: '/automations/forge',
    subtitle: 'ND-033 - Epic 8'
  },
  { id: 'agents', label: 'Agent Operations Center', path: '/agents', subtitle: 'ND-016 - Epic 8' },
  {
    id: 'model-routing-profiles',
    label: 'Routing Profiles',
    path: '/models/routing-profiles',
    subtitle: 'ND-037 - Epic 9'
  },
  {
    id: 'profiles-identity',
    label: 'Profiles and Identity',
    path: '/profiles',
    subtitle: 'ND-X042 - Epic X10'
  },
  {
    id: 'continuity-offline',
    label: 'Continuity and Offline',
    path: '/continuity',
    subtitle: 'ND-X044 - Epic X11'
  },
  { id: 'remote-systems', label: 'Remote Systems', path: '/remote', subtitle: 'ND-040 - Epic 10' },
  { id: 'lan-share', label: 'LAN Share', path: '/lan-share', subtitle: 'ND-LAN-001 - LAN-8' },
  {
    id: 'lan-share-peers',
    label: 'LAN Share Nearby Devices',
    path: '/lan-share/peers',
    subtitle: 'ND-LAN-002 - LAN-8'
  },
  {
    id: 'lan-share-send',
    label: 'Send Files with LAN Share',
    path: '/lan-share/send',
    subtitle: 'ND-LAN-004 - LAN-8'
  },
  {
    id: 'lan-share-transfers',
    label: 'LAN Share Transfers',
    path: '/lan-share/transfers',
    subtitle: 'ND-LAN-007 - LAN-8'
  },
  {
    id: 'help',
    label: 'Help Hub',
    path: '/help',
    subtitle: 'ND-X046 - Epic X13'
  },
  {
    id: 'platform-health',
    label: 'Platform Health Overview',
    path: '/platform-health',
    subtitle: 'ND-X070 - Epic X15'
  },
  {
    id: 'screenshot-center',
    label: 'Screenshot Center',
    path: '/screenshots',
    subtitle: 'ND-X058 - Epic X14'
  },
  {
    id: 'voice-notes',
    label: 'Voice Notes',
    path: '/voice-notes',
    subtitle: 'ND-X059 - Epic X14'
  }
]

const SETTINGS_RESULTS: PaletteDomainResult[] = [
  { id: 'system', label: 'System Dashboard', path: '/system', subtitle: 'ND-042 - Epic 11' },
  {
    id: 'controller-settings',
    label: 'Controller Settings',
    path: '/settings/controller',
    subtitle: 'ND-043 - Epic 11'
  },
  {
    id: 'display-theme-settings',
    label: 'Display and Theme Settings',
    path: '/settings/display',
    subtitle: 'ND-044 - Epic 11'
  },
  {
    id: 'network-vpn',
    label: 'Network and VPN',
    path: '/settings/network',
    subtitle: 'ND-045 - Epic 11'
  },
  {
    id: 'privacy-permissions',
    label: 'Privacy and Permissions',
    path: '/settings/privacy',
    subtitle: 'ND-046 - Epic 11'
  },
  { id: 'storage', label: 'Storage and Recovery', path: '/storage', subtitle: 'ND-047 - Epic 11' },
  {
    id: 'integrations',
    label: 'Integrations',
    path: '/integrations',
    subtitle: 'ND-048 - Epic 11'
  },
  { id: 'updates', label: 'Updates', path: '/settings/updates', subtitle: 'ND-049 - Epic 11' },
  { id: 'power', label: 'Power Menu', path: '/power', subtitle: 'ND-051 - Epic 11' },
  { id: 'recovery', label: 'Recovery Timeline', path: '/recovery', subtitle: 'ND-052 - Epic 11' },
  {
    id: 'error-recovery',
    label: 'Error Recovery',
    path: '/error-recovery',
    subtitle: 'ND-055 - Epic 11'
  },
  { id: 'about', label: 'About and Diagnostics', path: '/about', subtitle: 'ND-056 - Epic 11' }
]

const ALL_SCREENS: PaletteDomainResult[] = [
  ...NAVIGATION_DESTINATIONS.map((destination) => ({
    ...destination,
    subtitle: 'Primary destination'
  })),
  ...SECONDARY_SCREENS
]

function matches(result: PaletteDomainResult, normalized: string): boolean {
  if (!normalized) return true
  return (
    result.label.toLowerCase().includes(normalized) ||
    result.subtitle.toLowerCase().includes(normalized)
  )
}

/**
 * ND-009 Universal Command Palette, opened with `Menu`/`commands`.
 * Real sources are wired for screens, files, workspaces, workflows, agents,
 * settings, and tools. Symbols and recent actions remain separate future
 * slices; this component does not fabricate those domains.
 */
export function CommandPalette(): React.JSX.Element {
  const { registry: focusRegistry, subscribe } = useFocusEngine()
  const { registry: toolRegistry } = useAiSafety()
  const { activeWorkspace, workspaces, setActive } = useWorkspaces()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState<LoadedDomainState>(EMPTY_LOADED_STATE)

  useEffect(() => subscribe('commands', () => setOpen((current) => !current)), [subscribe])

  useEffect(() => {
    if (!open) return
    focusRegistry.pushTrap(['command-palette'])
    return () => focusRegistry.popTrap()
  }, [open, focusRegistry])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const workspaceResults: PaletteDomainResult[] = workspaces.map((workspace) => ({
      id: `workspace:${workspace.id}`,
      label: workspace.name,
      path: '/workspaces/detail',
      subtitle: workspace.rootPath
    }))

    const workspaceFetches = workspaces.map(async (workspace) => {
      const [workflowResult, agentResult] = await Promise.all([
        listWorkflows({ workspaceId: workspace.id }),
        listAgents({ workspaceId: workspace.id })
      ])

      const errors: string[] = []
      const workflows: PaletteDomainResult[] = []
      const agents: PaletteDomainResult[] = []

      if (workflowResult.ok) {
        for (const workflow of workflowResult.data) {
          workflows.push({
            id: `workflow:${workflow.id}`,
            label: workflow.name,
            path: `/automations/forge/${workflow.id}`,
            subtitle: `Workflow - ${workspace.name} - ${workflow.steps.length} steps`
          })
        }
      } else {
        errors.push(`Workflows: ${workflowResult.error.userMessage}`)
      }

      if (agentResult.ok) {
        for (const agent of agentResult.data) {
          agents.push({
            id: `agent:${agent.id}`,
            label: agent.name,
            path: `/agents/${agent.id}`,
            subtitle: `Agent - ${workspace.name} - ${agent.enabled ? 'enabled' : 'disabled'}`
          })
        }
      } else {
        errors.push(`Agents: ${agentResult.error.userMessage}`)
      }

      return { workflows, agents, errors }
    })

    const fileFetch = activeWorkspace
      ? listFiles({ workspaceId: activeWorkspace.id, relativePath: '' }).then((result) => {
          if (!result.ok) return { files: [], errors: [`Files: ${result.error.userMessage}`] }
          return {
            files: result.data.map((entry) => ({
              id: `file:${activeWorkspace.id}:${entry.path}`,
              label: entry.name,
              path: '/files',
              subtitle: `${entry.isDirectory ? 'Folder' : 'File'} - ${activeWorkspace.name} - ${entry.path}`
            })),
            errors: []
          }
        })
      : Promise.resolve({ files: [], errors: [] })

    void Promise.all([fileFetch, ...workspaceFetches])
      .then(([fileResult, ...entityResults]) => {
        if (cancelled) return
        setLoaded({
          files: fileResult.files,
          workspaces: workspaceResults,
          workflows: entityResults.flatMap((result) => result.workflows),
          agents: entityResults.flatMap((result) => result.agents),
          errors: [...fileResult.errors, ...entityResults.flatMap((result) => result.errors)].slice(
            0,
            4
          )
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoaded({
          ...EMPTY_LOADED_STATE,
          workspaces: workspaceResults,
          errors: [error instanceof Error ? error.message : 'Could not load command sources.']
        })
      })

    return () => {
      cancelled = true
    }
  }, [open, activeWorkspace, workspaces])

  const normalized = query.trim().toLowerCase()

  const screenResults = useMemo(
    () => ALL_SCREENS.filter((screen) => matches(screen, normalized)),
    [normalized]
  )
  const settingsResults = useMemo(
    () => SETTINGS_RESULTS.filter((setting) => matches(setting, normalized)),
    [normalized]
  )
  const workspaceResults = useMemo(
    () => loaded.workspaces.filter((workspace) => matches(workspace, normalized)),
    [loaded.workspaces, normalized]
  )
  const fileResults = useMemo(
    () => loaded.files.filter((file) => matches(file, normalized)),
    [loaded.files, normalized]
  )
  const workflowResults = useMemo(
    () => loaded.workflows.filter((workflow) => matches(workflow, normalized)),
    [loaded.workflows, normalized]
  )
  const agentResults = useMemo(
    () => loaded.agents.filter((agent) => matches(agent, normalized)),
    [loaded.agents, normalized]
  )

  const toolResults = toolRegistry
    .list()
    .filter((tool) => tool.title.toLowerCase().includes(normalized))

  const { ref: searchRef } = useFocusable<HTMLInputElement>({
    id: 'command-palette:search',
    groupId: 'command-palette',
    role: 'field',
    priority: 1000,
    onActivate: () => {
      const topResult = [
        ...screenResults,
        ...workspaceResults,
        ...fileResults,
        ...workflowResults,
        ...agentResults,
        ...settingsResults
      ][0]
      const topId = topResult
        ? `command:${topResult.id}`
        : toolResults[0]
          ? `tool:${toolResults[0].id}`
          : null
      if (topId) {
        focusRegistry.focus(topId)
        focusRegistry.activate()
      }
    }
  })

  function handleClose(): void {
    setOpen(false)
    setQuery('')
  }

  const domains: PaletteDomain[] = [
    { id: 'screens', label: 'Screens', results: screenResults },
    { id: 'workspaces', label: 'Workspaces', results: workspaceResults },
    {
      id: 'files',
      label: activeWorkspace ? `Files - ${activeWorkspace.name}` : 'Files',
      results: fileResults
    },
    { id: 'workflows', label: 'Workflows', results: workflowResults },
    { id: 'agents', label: 'Agents', results: agentResults },
    { id: 'settings', label: 'Settings', results: settingsResults }
  ]

  return (
    <Modal open={open} onClose={handleClose} title="Command Palette">
      <input
        ref={searchRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search commands, files, workspaces, and actions..."
        className="rounded-sm border border-border bg-surface-raised px-3 py-2 text-body text-text-primary outline-none focus-visible:border-border-focus"
      />
      <div className="flex flex-col gap-3">
        {loaded.errors.length > 0 && (
          <div className="rounded-sm border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-meta text-status-warning">
            {loaded.errors.join(' - ')}
          </div>
        )}
        {domains.map((domain, domainIndex) => (
          <div key={domain.id}>
            <p className="px-3 text-meta uppercase tracking-wide text-text-tertiary">
              {domain.label}
            </p>
            {domain.results.length === 0 ? (
              <p className="px-3 py-2 text-meta text-text-secondary">
                No matching {domain.label.toLowerCase()}.
              </p>
            ) : (
              domain.results.map((destination, index) => (
                <CommandPaletteResultRow
                  key={destination.id}
                  destination={destination}
                  priority={domain.results.length - index + (domains.length - domainIndex) * 100}
                  subtitle={destination.subtitle}
                  onBeforeRun={() => {
                    if (destination.id.startsWith('workspace:')) {
                      setActive(destination.id.replace(/^workspace:/, ''))
                    }
                  }}
                  onRun={handleClose}
                />
              ))
            )}
          </div>
        ))}
        {toolResults.length > 0 && (
          <div>
            <p className="px-3 text-meta uppercase tracking-wide text-text-tertiary">Tools</p>
            {toolResults.map((tool, index) => (
              <CommandPaletteToolRow
                key={tool.id}
                tool={tool}
                priority={toolResults.length - index}
                onRun={handleClose}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
