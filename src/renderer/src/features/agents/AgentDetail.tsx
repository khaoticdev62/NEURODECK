import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AgentDefinition, AgentRun } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
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

/**
 * ND-017 Agent Detail, scoped to a real Overview + Timeline + Output —
 * Agent Runtime can now submit strict model-emitted tool calls through the
 * renderer-owned ActionQueue bridge, but the spec's Files/Tools/Permissions/
 * Logs tabs still need a dedicated per-run data model/UI. Run state is pushed live from the main process
 * via `agentRun.update` (the same pattern terminal data/exit events use),
 * not polled.
 */
export function AgentDetail(): React.JSX.Element {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspaces()
  const [agent, setAgent] = useState<AgentDefinition | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [objective, setObjective] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

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
    const result = await startAgentRun({ agentId, objective: objective.trim() })
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

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Overview</p>
        <p className="text-meta text-text-secondary">Goal: {agent.goal}</p>
        <p className="text-meta text-text-secondary">
          Tool allowlist:{' '}
          {agent.toolAllowlist.length ? agent.toolAllowlist.join(', ') : 'none (plan only)'}
        </p>
        <p className="text-meta text-text-secondary">
          Resource limits: {agent.resourceLimits.maxTokens} max tokens ·{' '}
          {agent.resourceLimits.timeoutMs}ms timeout · {agent.resourceLimits.maxToolCalls} max tool
          calls
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
        {!agent.enabled && <p className="text-meta text-status-warning">This agent is disabled.</p>}
        <ControllerButton
          variant="primary"
          disabled={starting || !agent.enabled || !objective.trim()}
          onClick={() => void handleStart()}
        >
          {starting ? 'Starting…' : 'Start run'}
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
                onCancel={() => void handleCancel(run.id)}
                onPause={() => void handlePause(run.id)}
                onResume={() => void handleResume(run.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RunRow({
  run,
  onCancel,
  onPause,
  onResume
}: {
  run: AgentRun
  onCancel: () => void
  onPause: () => void
  onResume: () => void
}): React.JSX.Element {
  const cancellable = !['cancelled', 'failed', 'completed', 'rolled-back'].includes(run.state)
  const pausable = cancellable && run.state !== 'paused' && run.state !== 'cancelling'
  const resumable = run.state === 'paused'

  return (
    <li className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <span className="text-meta font-semibold text-text-primary">{run.objective}</span>
        <span className="text-meta text-text-secondary">{run.state}</span>
      </div>
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
