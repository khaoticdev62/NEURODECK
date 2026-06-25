import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AgentDefinition, AgentRun, AgentToolExecutionRecord } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { ErrorState } from '../../components/feedback/UXState'
import type { AuditEntry } from '../../ai-safety/AuditLog'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import {
  cancelAgentRun,
  getAgentRun,
  listAgentRuns,
  listAgents,
  onAgentRunUpdate,
  pauseAgentRun,
  resumeAgentRun,
  startAgentRun
} from '../../services/ipc/agentClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

type Tab = 'overview' | 'tools' | 'logs' | 'files' | 'permissions'

const EXECUTION_TONE: Record<AgentToolExecutionRecord['status'], StatusTone> = {
  requested: 'neutral',
  'pending-approval': 'approval',
  passed: 'success',
  failed: 'error',
  denied: 'error',
  cancelled: 'neutral'
}

/**
 * ND-017 Agent Detail. Overview/Start-a-run/Runs are the original real
 * content (unchanged); Tools/Logs/Files/Permissions are real tabs reading
 * `run.toolExecutions` (persisted by `AgentRuntime.submitToolCall()`/
 * `resolveToolResult()`) and the real, live `AuditLog` filtered by this
 * agent/run's id (threaded through `ActionQueue.submit()`'s `agentContext`
 * param). Run state is pushed live from the main process via
 * `agentRun.update` (the same pattern terminal data/exit events use), not
 * polled.
 */
export function AgentDetail(): React.JSX.Element {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspaces()
  const { audit } = useAiSafety()
  const [agent, setAgent] = useState<AgentDefinition | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [objective, setObjective] = useState('')
  const [dryRun, setDryRun] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(audit.list())

  useEffect(() => audit.onChange(() => setAuditEntries(audit.list())), [audit])

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null

  useEffect(() => {
    if (!agentId || !activeWorkspace) return
    let active = true
    void Promise.all([
      listAgents({ workspaceId: activeWorkspace.id }),
      listAgentRuns({ agentId })
    ]).then(([agentsResult, runsResult]) => {
      if (!active) return
      setLoading(false)
      if (agentsResult.ok) {
        const found = agentsResult.data.find((candidate) => candidate.id === agentId) ?? null
        setAgent(found)
        if (!found) setError('That agent no longer exists.')
      } else {
        setError(agentsResult.error.userMessage)
      }
      if (runsResult.ok) setRuns(runsResult.data)
    })
    return () => {
      active = false
    }
  }, [agentId, activeWorkspace])

  useEffect(() => {
    return onAgentRunUpdate((run) => {
      if (run.agentId !== agentId) return
      setRuns((current) => {
        const exists = current.some((item) => item.id === run.id)
        return exists ? current.map((item) => (item.id === run.id ? run : item)) : [run, ...current]
      })
    })
  }, [agentId])

  async function handleStart(): Promise<void> {
    if (!agentId || !objective.trim()) return
    setStarting(true)
    const result = await startAgentRun({ agentId, objective: objective.trim(), dryRun })
    setStarting(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    setObjective('')
    setRuns((current) => [result.data, ...current])
  }

  async function handleCancel(runId: string): Promise<void> {
    const result = await cancelAgentRun({ runId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    const refreshed = await getAgentRun({ runId })
    if (refreshed.ok) {
      setRuns((current) => current.map((item) => (item.id === runId ? refreshed.data : item)))
    }
  }

  async function handlePause(runId: string): Promise<void> {
    const result = await pauseAgentRun({ runId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setRuns((current) => current.map((item) => (item.id === runId ? result.data : item)))
  }

  async function handleResume(runId: string): Promise<void> {
    const result = await resumeAgentRun({ runId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setRuns((current) => current.map((item) => (item.id === runId ? result.data : item)))
  }

  if (loading) return <p className="p-4 text-meta text-text-secondary">Loading…</p>
  if (!agent) return <ErrorState title="Agent not found" description={error ?? 'Unknown agent.'} />

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-title font-semibold text-text-primary">{agent.name}</p>
          <p className="text-meta text-text-secondary">
            {agent.role} · {agent.modelProfile} · {agent.enabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <ControllerButton variant="ghost" onClick={() => navigate('/agents')}>
          Back
        </ControllerButton>
      </div>

      {error && <ErrorState title="Agent run error" description={error} />}

      <div className="flex gap-2">
        {(['overview', 'tools', 'logs', 'files', 'permissions'] as Tab[]).map((candidate) => (
          <ControllerButton
            key={candidate}
            variant={tab === candidate ? 'primary' : 'secondary'}
            onClick={() => setTab(candidate)}
          >
            {candidate[0].toUpperCase() + candidate.slice(1)}
          </ControllerButton>
        ))}
      </div>

      {tab === 'overview' ? (
        <>
          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Overview</p>
            <p className="text-meta text-text-secondary">Goal: {agent.goal}</p>
            <p className="text-meta text-text-secondary">
              Tool allowlist:{' '}
              {agent.toolAllowlist.length ? agent.toolAllowlist.join(', ') : 'none (plan only)'}
            </p>
            <p className="text-meta text-text-secondary">
              Resource limits: {agent.resourceLimits.maxTokens} max tokens ·{' '}
              {agent.resourceLimits.timeoutMs}ms timeout · {agent.resourceLimits.maxToolCalls} max
              tool calls
            </p>
            <p className="text-meta text-text-secondary">
              Child agent policy:{' '}
              {agent.childAgentPolicy.allowChildAgents
                ? `${agent.childAgentPolicy.maxChildrenPerRun} max · depth ${agent.childAgentPolicy.maxDepth}`
                : 'disabled'}
            </p>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Start a run</p>
            <input
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Objective for this run"
              disabled={!agent.enabled}
              className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
            />
            {!agent.enabled && (
              <p className="text-meta text-status-warning">This agent is disabled.</p>
            )}
            <label className="flex items-center gap-2 text-meta text-text-secondary">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(event) => setDryRun(event.target.checked)}
              />
              Dry run — plan with a real model completion, but never submit any tool call to
              ActionQueue
            </label>
            <ControllerButton
              variant="primary"
              disabled={starting || !agent.enabled || !objective.trim()}
              onClick={() => void handleStart()}
            >
              {starting ? 'Starting…' : dryRun ? 'Start dry run' : 'Start run'}
            </ControllerButton>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Runs</p>
            {runs.length === 0 ? (
              <p className="text-meta text-text-tertiary">No runs yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {runs.map((run) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    selected={run.id === selectedRun?.id}
                    onSelect={() => setSelectedRunId(run.id)}
                    onCancel={() => void handleCancel(run.id)}
                    onPause={() => void handlePause(run.id)}
                    onResume={() => void handleResume(run.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : tab === 'tools' ? (
        <ToolsTab run={selectedRun} />
      ) : tab === 'logs' ? (
        <LogsTab agentId={agent.id} runId={selectedRun?.id} entries={auditEntries} />
      ) : tab === 'files' ? (
        <FilesTab run={selectedRun} />
      ) : (
        <PermissionsTab agent={agent} run={selectedRun} />
      )}
    </div>
  )
}

function ToolsTab({ run }: { run: AgentRun | null }): React.JSX.Element {
  if (!run) {
    return (
      <ErrorState
        title="No run selected"
        description="Select a run in Overview to see its tool calls."
      />
    )
  }
  if (run.toolExecutions.length === 0) {
    return (
      <section className="border border-border bg-surface p-3">
        <p className="text-meta text-text-tertiary">
          This run has not submitted any tool calls yet.
        </p>
      </section>
    )
  }
  return (
    <section className="flex flex-col gap-2 border border-border bg-surface p-3">
      <p className="text-body font-semibold text-text-primary">Tool calls — {run.objective}</p>
      <ul className="flex flex-col gap-2">
        {run.toolExecutions.map((execution) => (
          <li
            key={execution.requestId}
            className="border-t border-border pt-2 first:border-t-0 first:pt-0"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-meta text-text-primary">{execution.toolId}</span>
              <StatusBadge tone={EXECUTION_TONE[execution.status]} label={execution.status} />
            </div>
            <p className="text-meta text-text-tertiary">{JSON.stringify(execution.arguments)}</p>
            {execution.message && (
              <p className="text-meta text-text-secondary">{execution.message}</p>
            )}
            <p className="text-meta text-text-tertiary">
              Requested {new Date(execution.requestedAt).toLocaleTimeString()}
              {execution.resolvedAt
                ? ` · resolved ${new Date(execution.resolvedAt).toLocaleTimeString()}`
                : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LogsTab({
  agentId,
  runId,
  entries
}: {
  agentId: string
  runId?: string
  entries: AuditEntry[]
}): React.JSX.Element {
  const filtered = entries.filter(
    (entry) => entry.agentId === agentId && (!runId || entry.runId === runId)
  )
  return (
    <section className="flex flex-col gap-2 border border-border bg-surface p-3">
      <p className="text-body font-semibold text-text-primary">Audit log for this run</p>
      {filtered.length === 0 ? (
        <p className="text-meta text-text-tertiary">
          No audited actions for this agent/run yet — past access stays here once anything runs.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {filtered
            .slice()
            .reverse()
            .map((entry) => (
              <li key={entry.id} className="text-meta text-text-secondary">
                {new Date(entry.timestamp).toLocaleTimeString()} · {entry.tool} · {entry.capability}{' '}
                · <span className="text-text-primary">{entry.outcome}</span>
                {entry.detail ? ` — ${entry.detail}` : ''}
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}

function FilesTab({ run }: { run: AgentRun | null }): React.JSX.Element {
  const fileExecutions = (run?.toolExecutions ?? []).filter(
    (execution) => execution.toolId === 'files-write' || execution.toolId === 'files-delete'
  )
  return (
    <section className="flex flex-col gap-2 border border-border bg-surface p-3">
      <p className="text-body font-semibold text-text-primary">Files touched by this run</p>
      <p className="text-meta text-text-tertiary">
        File content diffs are not shown here — that needs Recovery Service checkpoint data this tab
        doesn&apos;t reach into; see Recovery Timeline for the actual before/after content.
      </p>
      {!run ? (
        <p className="text-meta text-text-tertiary">No run selected.</p>
      ) : fileExecutions.length === 0 ? (
        <p className="text-meta text-text-tertiary">
          This run has not written or deleted any files.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {fileExecutions.map((execution) => (
            <li key={execution.requestId} className="flex items-center justify-between text-meta">
              <span className="font-mono text-text-primary">
                {String(execution.arguments.relativePath ?? '(unknown path)')}
              </span>
              <span className="text-text-secondary">
                {execution.toolId === 'files-write' ? 'write' : 'delete'} ·{' '}
                <StatusBadge tone={EXECUTION_TONE[execution.status]} label={execution.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PermissionsTab({
  agent,
  run
}: {
  agent: AgentDefinition
  run: AgentRun | null
}): React.JSX.Element {
  const denied = (run?.toolExecutions ?? []).filter((execution) => execution.status === 'denied')
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Permission ceiling</p>
        {agent.permissionCeiling.length === 0 ? (
          <p className="text-meta text-text-tertiary">No capabilities granted to this agent.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {agent.permissionCeiling.map((capability) => (
              <li key={capability}>
                <StatusBadge tone="neutral" label={capability} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Denied tool calls this run</p>
        {!run ? (
          <p className="text-meta text-text-tertiary">No run selected.</p>
        ) : denied.length === 0 ? (
          <p className="text-meta text-text-tertiary">No tool calls were denied for this run.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {denied.map((execution) => (
              <li key={execution.requestId} className="text-meta text-text-secondary">
                {execution.toolId} — {execution.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RunRow({
  run,
  selected,
  onSelect,
  onCancel,
  onPause,
  onResume
}: {
  run: AgentRun
  selected: boolean
  onSelect: () => void
  onCancel: () => void
  onPause: () => void
  onResume: () => void
}): React.JSX.Element {
  const cancellable = !['cancelled', 'failed', 'completed', 'rolled-back'].includes(run.state)
  const pausable = cancellable && run.state !== 'paused' && run.state !== 'cancelling'
  const resumable = run.state === 'paused'

  return (
    <li
      className={`border-t border-border pt-3 first:border-t-0 first:pt-0 ${selected ? 'bg-surface-raised/40' : ''}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-meta font-semibold text-text-primary">
          {run.dryRun && <span className="text-status-warning">[Dry run] </span>}
          {run.objective}
        </span>
        <span className="text-meta text-text-secondary">{run.state}</span>
      </button>
      <ul className="mt-1 flex flex-col gap-1">
        {run.timeline.map((event) => (
          <li key={event.id} className="text-meta text-text-tertiary">
            {new Date(event.at).toLocaleTimeString()} · {event.state} — {event.message}
          </li>
        ))}
      </ul>
      {run.output && (
        <p className="mt-1 whitespace-pre-wrap text-meta text-text-secondary">{run.output}</p>
      )}
      {run.error && <p className="mt-1 text-meta text-status-error">{run.error}</p>}
      {(run.promptTokens !== undefined || run.completionTokens !== undefined) && (
        <p className="mt-1 text-meta text-text-tertiary">
          Tokens: {run.promptTokens ?? 0} prompt · {run.completionTokens ?? 0} completion
        </p>
      )}
      {cancellable && (
        <div className="mt-2 flex gap-2">
          {pausable && (
            <ControllerButton variant="ghost" onClick={onPause}>
              Pause
            </ControllerButton>
          )}
          {resumable && (
            <ControllerButton variant="secondary" onClick={onResume}>
              Resume
            </ControllerButton>
          )}
          <ControllerButton variant="ghost" onClick={onCancel}>
            Cancel
          </ControllerButton>
        </div>
      )}
    </li>
  )
}
