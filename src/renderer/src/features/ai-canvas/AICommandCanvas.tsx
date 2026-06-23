import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RoutingProfileId } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { createAgent, listAgents, startAgentRun } from '../../services/ipc/agentClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { requestPlanPreview, type PlanPreview } from './planPreview'

const QUICK_COMMAND_AGENT_NAME = 'Quick Command'
const ROUTING_PROFILES: RoutingProfileId[] = [
  'balanced',
  'local-first',
  'offline',
  'battery-saver',
  'maximum-quality',
  'fast-coding',
  'private-workspace',
  'low-cost'
]

/**
 * ND-013 AI Command Canvas, scoped to a real Intent → Plan preview → Run
 * flow. The Plan pane is a genuine model-generated preview (via the real
 * `ModelRouter.complete()`), not fabricated steps — but it is a review
 * artifact, not a deterministic execution script: Approve & Run hands the
 * raw intent to the real `AgentRuntime` (the same iterative tool-call loop
 * Agent Operations Center uses), which plans and executes independently.
 * The wireframe's richer plan-editing controls (reorder steps, per-step
 * model assignment, hard file-count/network restriction enforcement,
 * "require test success before completion", timeout/compute budget, Git
 * branch creation) need real per-step execution semantics this runtime
 * doesn't have — they are not implemented, not hidden behind fake controls.
 * The auto-created "Quick Command" agent starts with zero tool access by
 * design (no unreviewed destructive execution) — granting real tool access
 * requires editing it in Agent Operations Center.
 */
export function AICommandCanvas(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace to turn an intent into a plan."
      />
    )
  }

  return <CommandCanvasWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function CommandCanvasWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const navigate = useNavigate()
  const [intent, setIntent] = useState('')
  const [profileId, setProfileId] = useState<RoutingProfileId>('balanced')
  const [plan, setPlan] = useState<PlanPreview | null>(null)
  const [generating, setGenerating] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGeneratePlan(): Promise<void> {
    if (!intent.trim()) return
    setGenerating(true)
    setError(null)
    const result = await requestPlanPreview(intent.trim(), profileId)
    setGenerating(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPlan(result.data)
  }

  function handleRemoveStep(index: number): void {
    if (!plan) return
    setPlan({ ...plan, steps: plan.steps.filter((_, i) => i !== index) })
  }

  async function handleApproveAndRun(): Promise<void> {
    setStarting(true)
    setError(null)
    const existing = await listAgents({ workspaceId })
    if (!existing.ok) {
      setStarting(false)
      setError(existing.error.userMessage)
      return
    }
    let agent = existing.data.find((candidate) => candidate.name === QUICK_COMMAND_AGENT_NAME)
    if (!agent) {
      const created = await createAgent({
        name: QUICK_COMMAND_AGENT_NAME,
        role: 'Ad-hoc assistant',
        goal: 'Carry out one-off intents submitted through the AI Command Canvas.',
        workspaceId,
        modelProfile: profileId,
        toolAllowlist: [],
        permissionCeiling: [],
        resourceLimits: { maxTokens: 2048, timeoutMs: 60000, maxToolCalls: 0 },
        childAgentPolicy: { allowChildAgents: false, maxChildrenPerRun: 0, maxDepth: 0 },
        enabled: true
      })
      if (!created.ok) {
        setStarting(false)
        setError(created.error.userMessage)
        return
      }
      agent = created.data
    }

    const run = await startAgentRun({ agentId: agent.id, objective: intent.trim(), dryRun: false })
    setStarting(false)
    if (!run.ok) {
      setError(run.error.userMessage)
      return
    }
    navigate(`/agents/${agent.id}`)
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <p className="text-title font-semibold text-text-primary">AI Command Canvas</p>

      {error && <ErrorState title="Command Canvas error" description={error} />}

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_2fr_1fr] gap-3 overflow-hidden">
        <section className="flex flex-col gap-2 overflow-auto border border-border bg-surface p-3">
          <p className="text-meta font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Intent
          </p>
          <textarea
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="Describe what you want done…"
            rows={6}
            className="resize-none rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
          <select
            value={profileId}
            onChange={(event) => setProfileId(event.target.value as RoutingProfileId)}
            className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
          >
            {ROUTING_PROFILES.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <ControllerButton
            variant="primary"
            disabled={!intent.trim() || generating}
            onClick={() => void handleGeneratePlan()}
          >
            {generating ? 'Generating plan…' : 'Generate plan'}
          </ControllerButton>
        </section>

        <section className="flex flex-col gap-2 overflow-auto border border-border bg-surface p-3">
          <p className="text-meta font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Plan
          </p>
          {plan ? (
            <>
              <p className="text-body text-text-primary">{plan.goal}</p>
              <ol className="flex flex-col gap-1">
                {plan.steps.map((step, index) => (
                  <li
                    key={`${index}-${step}`}
                    className="flex items-start justify-between gap-2 border border-border/60 p-2 text-meta text-text-secondary"
                  >
                    <span>
                      {index + 1}. {step}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="text-text-tertiary hover:text-status-error"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
              <p className="text-meta text-text-tertiary">
                This is a preview for review, not a fixed script — the run below re-plans from your
                intent independently rather than executing these exact steps in order.
              </p>
            </>
          ) : (
            <p className="text-meta text-text-secondary">
              Generate a plan to see a real model-produced preview before running anything.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 overflow-auto border border-border bg-surface p-3">
          <p className="text-meta font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Impact
          </p>
          {plan ? (
            <div className="flex flex-col gap-2">
              <StatusBadge
                tone={
                  plan.riskLevel === 'high'
                    ? 'error'
                    : plan.riskLevel === 'medium'
                      ? 'warning'
                      : 'success'
                }
                label={`Risk: ${plan.riskLevel}`}
              />
              <p className="text-meta text-text-secondary">Files: {plan.filesEstimate}</p>
              <p className="text-meta text-text-secondary">
                Network: {plan.networkRequired ? 'Required' : 'Not required'}
              </p>
              <p className="text-meta text-text-secondary">
                Reversible: {plan.reversible ? 'Yes' : 'No'}
              </p>
              <p className="text-meta text-text-tertiary">Model profile: {profileId}</p>
            </div>
          ) : (
            <p className="text-meta text-text-secondary">No plan yet.</p>
          )}
        </section>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <ControllerButton
          variant="ghost"
          onClick={() => {
            setPlan(null)
            setIntent('')
            setError(null)
          }}
        >
          Cancel
        </ControllerButton>
        <ControllerButton
          variant="primary"
          disabled={!plan || starting}
          onClick={() => void handleApproveAndRun()}
        >
          {starting ? 'Starting…' : 'Approve & run'}
        </ControllerButton>
      </div>
    </div>
  )
}
