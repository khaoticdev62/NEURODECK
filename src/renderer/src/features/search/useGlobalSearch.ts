import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Workspace } from '@shared/contracts'
import { NAVIGATION_DESTINATIONS } from '../../components/navigation/navigationDestinations'
import { listBrowserTabs } from '../../services/ipc/browserClient'
import { listFiles } from '../../services/ipc/fileClient'
import { getGitLog, getGitStatus } from '../../services/ipc/gitClient'
import { listModelProviders } from '../../services/ipc/modelClient'
import { listRecoveryCheckpoints } from '../../services/ipc/recoveryClient'
import { listRemoteHosts } from '../../services/ipc/remoteClient'
import { listAgents, listAgentRuns } from '../../services/ipc/agentClient'
import { listTerminalSessions } from '../../services/ipc/terminalClient'
import { listWorkflows, listWorkflowRuns } from '../../services/ipc/workflowClient'
import { listWorkspaces } from '../../services/ipc/workspaceClient'
import { listLanSharePeers, listLanShareTransferJobs } from '../../services/ipc/lanShareClient'

export type SearchCategory =
  | 'everywhere'
  | 'currentWorkspace'
  | 'files'
  | 'code'
  | 'tasks'
  | 'logs'
  | 'browser'
  | 'remote'

export type SearchResultSource =
  | 'route'
  | 'workspace'
  | 'file'
  | 'git-change'
  | 'git-commit'
  | 'terminal'
  | 'workflow'
  | 'workflow-run'
  | 'agent'
  | 'agent-run'
  | 'model'
  | 'recovery'
  | 'browser-tab'
  | 'remote-host'
  | 'lan-share-peer'
  | 'lan-share-transfer'

export interface SearchResult {
  id: string
  source: SearchResultSource
  title: string
  subtitle: string
  workspaceId?: string
  path?: string
  modifiedAt?: Date
  action: { kind: 'navigate'; to: string } | { kind: 'callback'; run: () => void }
}

interface SourceError {
  source: SearchResultSource
  message: string
}

export interface UseGlobalSearchState {
  query: string
  setQuery: (value: string) => void
  category: SearchCategory
  setCategory: (value: SearchCategory) => void
  results: SearchResult[]
  loading: boolean
  errors: SourceError[]
}

const DEBOUNCE_MS = 200

function matchesQuery(result: SearchResult, query: string): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  return (
    result.title.toLowerCase().includes(needle) || result.subtitle.toLowerCase().includes(needle)
  )
}

function resultId(
  source: SearchResultSource,
  workspaceId: string | undefined,
  localId: string
): string {
  return workspaceId ? `${source}:${workspaceId}:${localId}` : `${source}:${localId}`
}

function isWorkspaceScoped(category: SearchCategory): boolean {
  return category !== 'remote'
}

function sourceEnabled(source: SearchResultSource, category: SearchCategory): boolean {
  switch (category) {
    case 'everywhere':
      return true
    case 'currentWorkspace':
      return source !== 'remote-host' && source !== 'model' && source !== 'route'
    case 'files':
      return source === 'file' || source === 'workspace'
    case 'code':
      return source === 'file' || source === 'git-change' || source === 'git-commit'
    case 'tasks':
      return (
        source === 'workflow' ||
        source === 'workflow-run' ||
        source === 'agent' ||
        source === 'agent-run' ||
        source === 'lan-share-transfer'
      )
    case 'logs':
      return (
        source === 'terminal' ||
        source === 'recovery' ||
        source === 'agent-run' ||
        source === 'lan-share-transfer'
      )
    case 'browser':
      return source === 'browser-tab'
    case 'remote':
      return source === 'remote-host' || source === 'lan-share-peer'
    default:
      return true
  }
}

export function useGlobalSearch(activeWorkspace: Workspace | null): UseGlobalSearchState {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SearchCategory>('everywhere')
  const [rawResults, setRawResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<SourceError[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async () => {
    if (!query.trim()) {
      setRawResults([])
      setErrors([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrors([])

    const nextResults: SearchResult[] = []
    const nextErrors: SourceError[] = []

    const workspacesResult = await listWorkspaces()
    const workspaces = workspacesResult.ok ? workspacesResult.data : []
    if (!workspacesResult.ok) {
      nextErrors.push({ source: 'workspace', message: workspacesResult.error.userMessage })
    }

    const scopedWorkspaces: Workspace[] =
      category === 'currentWorkspace' && activeWorkspace
        ? [activeWorkspace]
        : isWorkspaceScoped(category)
          ? workspaces
          : []

    if (sourceEnabled('route', category)) {
      for (const dest of NAVIGATION_DESTINATIONS) {
        nextResults.push({
          id: resultId('route', undefined, dest.id),
          source: 'route',
          title: dest.label,
          subtitle: 'Navigation',
          action: { kind: 'navigate', to: dest.path }
        })
      }
    }

    if (sourceEnabled('workspace', category)) {
      for (const workspace of workspaces) {
        nextResults.push({
          id: resultId('workspace', undefined, workspace.id),
          source: 'workspace',
          title: workspace.name,
          subtitle: workspace.rootPath,
          action: { kind: 'navigate', to: '/workspaces' }
        })
      }
    }

    if (sourceEnabled('model', category)) {
      const result = await listModelProviders()
      if (result.ok) {
        for (const provider of result.data) {
          nextResults.push({
            id: resultId('model', undefined, provider.id),
            source: 'model',
            title: provider.name,
            subtitle: `${provider.kind} · ${provider.baseUrl ?? ''}`,
            action: { kind: 'navigate', to: `/models/${provider.id}` }
          })
        }
      } else {
        nextErrors.push({ source: 'model', message: result.error.userMessage })
      }
    }

    if (sourceEnabled('remote-host', category)) {
      const result = await listRemoteHosts()
      if (result.ok) {
        for (const host of result.data) {
          nextResults.push({
            id: resultId('remote-host', undefined, host.id),
            source: 'remote-host',
            title: host.name || host.hostname,
            subtitle: `Remote · ${host.hostname}`,
            action: { kind: 'navigate', to: `/remote/${host.id}` }
          })
        }
      } else {
        nextErrors.push({ source: 'remote-host', message: result.error.userMessage })
      }
    }

    if (sourceEnabled('lan-share-peer', category)) {
      const result = await listLanSharePeers()
      if (result.ok) {
        for (const peer of result.data) {
          nextResults.push({
            id: resultId('lan-share-peer', undefined, peer.id),
            source: 'lan-share-peer',
            title: peer.displayName,
            subtitle: `LAN Share peer - ${peer.status} - ${peer.trustState}`,
            action: { kind: 'navigate', to: `/lan-share/peers/${peer.id}` }
          })
        }
      } else {
        nextErrors.push({ source: 'lan-share-peer', message: result.error.userMessage })
      }
    }

    if (sourceEnabled('lan-share-transfer', category)) {
      const result = await listLanShareTransferJobs()
      if (result.ok) {
        for (const job of result.data) {
          nextResults.push({
            id: resultId('lan-share-transfer', undefined, job.id),
            source: 'lan-share-transfer',
            title: job.displayName,
            subtitle: `LAN Share transfer - ${job.direction} - ${job.status}`,
            modifiedAt: job.completedAt
              ? new Date(job.completedAt)
              : job.startedAt
                ? new Date(job.startedAt)
                : new Date(job.createdAt),
            action: { kind: 'navigate', to: `/lan-share/transfers/${job.id}` }
          })
        }
      } else {
        nextErrors.push({ source: 'lan-share-transfer', message: result.error.userMessage })
      }
    }

    for (const workspace of scopedWorkspaces) {
      if (sourceEnabled('file', category)) {
        const result = await listFiles({ workspaceId: workspace.id, relativePath: '' })
        if (result.ok) {
          for (const entry of result.data) {
            nextResults.push({
              id: resultId('file', workspace.id, entry.path),
              source: 'file',
              title: entry.name,
              subtitle: `Files · ${workspace.name}`,
              workspaceId: workspace.id,
              path: entry.path,
              modifiedAt: entry.modifiedAt ? new Date(entry.modifiedAt) : undefined,
              action: { kind: 'navigate', to: '/files' }
            })
          }
        } else {
          nextErrors.push({ source: 'file', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('git-change', category)) {
        const result = await getGitStatus({ workspaceId: workspace.id })
        if (result.ok) {
          for (const change of result.data.changes) {
            nextResults.push({
              id: resultId('git-change', workspace.id, change.path),
              source: 'git-change',
              title: change.path,
              subtitle: `Git · ${workspace.name}`,
              workspaceId: workspace.id,
              path: change.path,
              action: { kind: 'navigate', to: '/git' }
            })
          }
        } else {
          nextErrors.push({ source: 'git-change', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('git-commit', category)) {
        const result = await getGitLog({ workspaceId: workspace.id })
        if (result.ok) {
          for (const commit of result.data.slice(0, 20)) {
            nextResults.push({
              id: resultId('git-commit', workspace.id, commit.hash),
              source: 'git-commit',
              title: commit.message.split('\n')[0],
              subtitle: `Git commit · ${commit.hash.slice(0, 7)} · ${workspace.name}`,
              workspaceId: workspace.id,
              modifiedAt: commit.date ? new Date(commit.date) : undefined,
              action: { kind: 'navigate', to: '/git' }
            })
          }
        } else {
          nextErrors.push({ source: 'git-commit', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('terminal', category)) {
        const result = await listTerminalSessions({ workspaceId: workspace.id })
        if (result.ok) {
          for (const session of result.data) {
            nextResults.push({
              id: resultId('terminal', workspace.id, session.id),
              source: 'terminal',
              title: session.id,
              subtitle: `Terminal · ${workspace.name}`,
              workspaceId: workspace.id,
              action: { kind: 'navigate', to: '/terminal' }
            })
          }
        } else {
          nextErrors.push({ source: 'terminal', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('workflow', category)) {
        const result = await listWorkflows({ workspaceId: workspace.id })
        if (result.ok) {
          for (const workflow of result.data) {
            nextResults.push({
              id: resultId('workflow', workspace.id, workflow.id),
              source: 'workflow',
              title: workflow.name,
              subtitle: `Workflow · ${workspace.name}`,
              workspaceId: workspace.id,
              action: { kind: 'navigate', to: '/automations' }
            })
          }
        } else {
          nextErrors.push({ source: 'workflow', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('workflow-run', category)) {
        const result = await listWorkflowRuns({ workspaceId: workspace.id })
        if (result.ok) {
          for (const run of result.data) {
            nextResults.push({
              id: resultId('workflow-run', workspace.id, run.id),
              source: 'workflow-run',
              title: run.id,
              subtitle: `Workflow run · ${run.status} · ${workspace.name}`,
              workspaceId: workspace.id,
              modifiedAt: run.finishedAt ? new Date(run.finishedAt) : new Date(run.startedAt),
              action: { kind: 'navigate', to: `/automations/runs/${run.id}` }
            })
          }
        } else {
          nextErrors.push({ source: 'workflow-run', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('agent', category)) {
        const result = await listAgents({ workspaceId: workspace.id })
        if (result.ok) {
          for (const agent of result.data) {
            nextResults.push({
              id: resultId('agent', workspace.id, agent.id),
              source: 'agent',
              title: agent.name,
              subtitle: `Agent · ${workspace.name}`,
              workspaceId: workspace.id,
              action: { kind: 'navigate', to: `/agents/${agent.id}` }
            })
          }
        } else {
          nextErrors.push({ source: 'agent', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('agent-run', category)) {
        const result = await listAgentRuns({})
        if (result.ok) {
          for (const run of result.data.filter((run) => run.workspaceId === workspace.id)) {
            nextResults.push({
              id: resultId('agent-run', workspace.id, run.id),
              source: 'agent-run',
              title: run.id,
              subtitle: `Agent run · ${run.state} · ${workspace.name}`,
              workspaceId: workspace.id,
              modifiedAt: run.updatedAt ? new Date(run.updatedAt) : undefined,
              action: { kind: 'navigate', to: '/agents' }
            })
          }
        } else {
          nextErrors.push({ source: 'agent-run', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('recovery', category)) {
        const result = await listRecoveryCheckpoints({ workspaceId: workspace.id })
        if (result.ok) {
          for (const checkpoint of result.data) {
            nextResults.push({
              id: resultId('recovery', workspace.id, checkpoint.id),
              source: 'recovery',
              title: checkpoint.id,
              subtitle: `Recovery · ${workspace.name}`,
              workspaceId: workspace.id,
              modifiedAt: checkpoint.createdAt ? new Date(checkpoint.createdAt) : undefined,
              action: { kind: 'navigate', to: '/recovery' }
            })
          }
        } else {
          nextErrors.push({ source: 'recovery', message: result.error.userMessage })
        }
      }

      if (sourceEnabled('browser-tab', category)) {
        const result = await listBrowserTabs({ workspaceId: workspace.id })
        if (result.ok) {
          for (const tab of result.data) {
            nextResults.push({
              id: resultId('browser-tab', workspace.id, tab.id),
              source: 'browser-tab',
              title: tab.title || tab.url,
              subtitle: `Browser · ${workspace.name}`,
              workspaceId: workspace.id,
              action: { kind: 'navigate', to: `/browser/${tab.id}` }
            })
          }
        } else {
          nextErrors.push({ source: 'browser-tab', message: result.error.userMessage })
        }
      }
    }

    setRawResults(nextResults)
    setErrors(nextErrors)
    setLoading(false)
  }, [query, category, activeWorkspace])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runSearch()
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, category, activeWorkspace, runSearch])

  const results = useMemo(() => {
    if (!query.trim()) return []
    return rawResults.filter((result) => matchesQuery(result, query))
  }, [rawResults, query])

  return {
    query,
    setQuery,
    category,
    setCategory,
    results,
    loading,
    errors
  }
}
