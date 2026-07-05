import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RoutingProfileId } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { NdxEditorShell } from '../../components/workbench'
import { createAgent, listAgents, startAgentRun } from '../../services/ipc/agentClient'
import { WorkspaceRequiredState } from '../workspaces/WorkspaceRequiredState'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { requestPlanPreview, type PlanPreview } from './planPreview'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'
import { useEffect } from 'react'

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
 * ND-013 AI Command Canvas, scoped to a real Intent -> Plan preview -> Run
 * flow. The Plan pane is a genuine model-generated preview (via the real
 * `ModelRouter.complete()`), not fabricated steps, but it is a review
 * artifact rather than a deterministic execution script.
 */
export function AICommandCanvas(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return <WorkspaceRequiredState purpose="turn an intent into a plan" />
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
  
  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

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

  useEffect(() => {
    setPrimary('Intent & Control', 'Command Canvas', (
      <div className="flex flex-col gap-3">
        {error && <ErrorState title="Command Canvas error" description={error} />}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-meta font-semibold uppercase tracking-wide text-text-tertiary">
              Intent
            </p>
            <p className="mt-1 text-meta text-text-secondary">
              Describe the job, generate a reviewable plan, then approve a real agent run.
            </p>
          </div>
          <ControllerButton variant="ghost" onClick={() => navigate('/ai/chat')}>
            Open Chat
          </ControllerButton>
        </div>
        <textarea
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          placeholder="Describe what you want done..."
          rows={7}
          className="ndx-input resize-none p-3 text-body w-full"
        />
        <select
          value={profileId}
          onChange={(event) => setProfileId(event.target.value as RoutingProfileId)}
          className="ndx-input px-3 text-meta w-full"
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
          {generating ? 'Generating plan...' : 'Generate plan'}
        </ControllerButton>
      </div>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [error, intent, profileId, generating, navigate, setPrimary])

  useEffect(() => {
    setSecondary(
      <div className="p-3">
        <ImpactPanel
          plan={plan}
          profileId={profileId}
          starting={starting}
          onCancel={() => {
            setPlan(null)
            setIntent('')
            setError(null)
          }}
          onApprove={() => void handleApproveAndRun()}
        />
      </div>
    )
    return () => setSecondary(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, profileId, starting, setSecondary])

  return (
    <div className="h-full bg-[var(--ndx-workbench-editor-bg)]">
      <NdxEditorShell title="Plan Preview">
        <div className="flex min-h-full min-w-0 flex-col gap-3 p-3">
          <p className="text-meta font-semibold uppercase tracking-wide text-text-tertiary">
            Plan
          </p>
          {plan ? (
            <>
              <p className="text-body text-text-primary">{plan.goal}</p>
              <ol className="flex flex-col gap-1">
                {plan.steps.map((step, index) => (
                  <li
                    key={`${index}-${step}`}
                    className="ndx-workbench-row flex items-start justify-between gap-2 p-2 text-meta text-text-secondary"
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
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
              <p className="text-meta text-text-tertiary">
                This is a preview for review, not a fixed script. The run re-plans from your
                intent independently.
              </p>
            </>
          ) : (
            <p className="text-meta text-text-secondary">
              Generate a plan to see a real model-produced preview before running anything.
            </p>
          )}
        </div>
      </NdxEditorShell>
    </div>
  )
}

function ImpactPanel({
  plan,
  profileId,
  starting,
  onCancel,
  onApprove
}: {
  plan: PlanPreview | null
  profileId: RoutingProfileId
  starting: boolean
  onCancel: () => void
  onApprove: () => void
}): React.JSX.Element {
  return (
    <>
      <p className="text-meta font-semibold uppercase tracking-wide text-text-tertiary">Impact</p>
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

      <div className="mt-auto flex justify-end gap-2 border-t border-[var(--ndx-workbench-border)] pt-3">
        <ControllerButton variant="ghost" onClick={onCancel}>
          Cancel
        </ControllerButton>
        <ControllerButton variant="primary" disabled={!plan || starting} onClick={onApprove}>
          {starting ? 'Starting...' : 'Approve and run'}
        </ControllerButton>
      </div>
    </>
  )
}
