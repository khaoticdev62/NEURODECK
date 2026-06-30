import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ConditionOperator, WorkflowStep, WorkflowStepKind } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { listWorkflows, saveWorkflow } from '../../services/ipc/workflowClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

const STEP_KIND_LABEL: Record<WorkflowStepKind, string> = {
  'tool-action': 'Tool action',
  condition: 'Condition (stops the run if not met)',
  'ai-decision': 'AI decision (fails the run if the model says stop)',
  'user-approval': 'User approval',
  delay: 'Delay',
  validator: 'Validator (fails the run if not met)',
  output: 'Output'
}

const OPERATOR_LABEL: Record<ConditionOperator, string> = {
  equals: 'equals',
  'not-equals': 'does not equal',
  contains: 'contains',
  'greater-than': 'is greater than',
  'less-than': 'is less than'
}

let stepSequence = 0

function makeStep(kind: WorkflowStepKind): WorkflowStep {
  const id = `step-${Date.now()}-${++stepSequence}`
  switch (kind) {
    case 'tool-action':
      return { id, kind, title: 'New tool action', toolId: '', args: {} }
    case 'condition':
      return {
        id,
        kind,
        title: 'New condition',
        expression: { variable: '', operator: 'equals', value: '' }
      }
    case 'ai-decision':
      return { id, kind, title: 'New AI decision', prompt: '' }
    case 'user-approval':
      return { id, kind, title: 'New approval', prompt: 'Proceed?' }
    case 'delay':
      return { id, kind, title: 'New delay', milliseconds: 1000 }
    case 'validator':
      return {
        id,
        kind,
        title: 'New validator',
        expression: { variable: '', operator: 'equals', value: '' }
      }
    case 'output':
      return { id, kind, title: 'New output', variable: '' }
  }
}

/**
 * ND-033 Workflow Forge, built as a controller-friendly ordered step list
 * rather than a free-form pan/zoom node canvas. Every workflow saved here is a
 * genuine runnable `WorkflowDefinition`.
 */
export function WorkflowForge(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const { workflowId } = useParams<{ workflowId?: string }>()

  if (!activeWorkspace) {
    return (
      <EmptyState title="No active workspace" description="Open a workspace to build a workflow." />
    )
  }

  return (
    <WorkflowForgeWorkspace
      key={`${activeWorkspace.id}:${workflowId ?? 'new'}`}
      workspaceId={activeWorkspace.id}
      workflowId={workflowId}
    />
  )
}

function WorkflowForgeWorkspace({
  workspaceId,
  workflowId
}: {
  workspaceId: string
  workflowId?: string
}): React.JSX.Element {
  const navigate = useNavigate()
  const { registry } = useAiSafety()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [newStepKind, setNewStepKind] = useState<WorkflowStepKind>('tool-action')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!workflowId) return
    void listWorkflows({ workspaceId }).then((result) => {
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      const existing = result.data.find((workflow) => workflow.id === workflowId)
      if (existing) {
        setName(existing.name)
        setDescription(existing.description)
        setSteps(existing.steps)
      }
    })
  }, [workspaceId, workflowId])

  function updateStep(id: string, next: WorkflowStep): void {
    setSteps((current) => current.map((step) => (step.id === id ? next : step)))
  }

  function removeStep(id: string): void {
    setSteps((current) => current.filter((step) => step.id !== id))
  }

  function moveStep(id: string, direction: -1 | 1): void {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === id)
      const target = index + direction
      if (index === -1 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    const result = await saveWorkflow({
      workspaceId,
      id: workflowId,
      name: name.trim() || 'Untitled workflow',
      description,
      steps
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setError(null)
    navigate('/automations')
  }

  const registeredTools = registry.list()

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)_19rem]">
      <NdxToolWindow title="Workflow Tools" subtitle={`${registeredTools.length} registered`}>
        <div className="flex flex-col gap-2">
          <select
            value={newStepKind}
            onChange={(event) => setNewStepKind(event.target.value as WorkflowStepKind)}
            className="rounded-md border border-border bg-surface p-2 text-body text-text-primary"
          >
            {Object.entries(STEP_KIND_LABEL).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
          <ControllerButton
            variant="secondary"
            onClick={() => setSteps((current) => [...current, makeStep(newStepKind)])}
          >
            Add step
          </ControllerButton>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Workflow Forge">
        <div className="flex h-full min-h-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">Workflow Forge</p>

          {error && <ErrorState title="Couldn't save workflow" description={error} />}

          <div className="flex flex-col gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workflow name"
              className="rounded-md border border-border bg-surface p-2 text-body text-text-primary"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              rows={2}
              className="rounded-md border border-border bg-surface p-2 text-body text-text-primary"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
            {steps.length === 0 ? (
              <EmptyState
                title="No steps yet"
                description="Add a step from the Workflow Tools panel to build this workflow."
              />
            ) : (
              <ol className="flex flex-col gap-2">
                {steps.map((step, index) => (
                  <StepEditor
                    key={step.id}
                    step={step}
                    index={index}
                    total={steps.length}
                    registeredTools={registeredTools.map((tool) => tool.id)}
                    onChange={(next) => updateStep(step.id, next)}
                    onRemove={() => removeStep(step.id)}
                    onMove={(direction) => moveStep(step.id, direction)}
                  />
                ))}
              </ol>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <ControllerButton
              variant="primary"
              className="ml-auto"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving...' : 'Save workflow'}
            </ControllerButton>
          </div>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Run Safety" subtitle={`${steps.length} steps`} side="right">
        <p className="text-meta text-text-secondary">
          Saved definitions remain real runnable workflows. Tool execution still flows through the
          shared AI safety registry and Action Queue.
        </p>
      </NdxToolWindow>
    </div>
  )
}

function StepEditor({
  step,
  index,
  total,
  registeredTools,
  onChange,
  onRemove,
  onMove
}: {
  step: WorkflowStep
  index: number
  total: number
  registeredTools: string[]
  onChange: (step: WorkflowStep) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}): React.JSX.Element {
  return (
    <li className="flex flex-col gap-2 border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-tool-bg)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-meta uppercase tracking-[0.12em] text-text-tertiary">
          {index + 1}. {STEP_KIND_LABEL[step.kind]}
        </span>
        <div className="flex gap-1">
          <ControllerButton variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}>
            Up
          </ControllerButton>
          <ControllerButton
            variant="ghost"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            Down
          </ControllerButton>
          <ControllerButton variant="ghost" onClick={onRemove}>
            Remove
          </ControllerButton>
        </div>
      </div>

      <input
        value={step.title}
        onChange={(event) => onChange({ ...step, title: event.target.value })}
        placeholder="Step title"
        className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
      />

      {step.kind === 'tool-action' && (
        <div className="flex flex-col gap-1">
          <select
            value={step.toolId}
            onChange={(event) => onChange({ ...step, toolId: event.target.value })}
            className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
          >
            <option value="">Select a registered tool...</option>
            {registeredTools.map((toolId) => (
              <option key={toolId} value={toolId}>
                {toolId}
              </option>
            ))}
          </select>
          <textarea
            value={JSON.stringify(step.args)}
            onChange={(event) => {
              try {
                onChange({ ...step, args: JSON.parse(event.target.value) })
              } catch {
                // Invalid JSON while typing; ignore until it parses again.
              }
            }}
            placeholder="Tool arguments (JSON)"
            rows={2}
            className="rounded-md border border-border bg-canvas p-2 font-mono text-meta text-text-primary"
          />
        </div>
      )}

      {(step.kind === 'condition' || step.kind === 'validator') && (
        <div className="flex gap-2">
          <input
            value={step.expression.variable}
            onChange={(event) =>
              onChange({
                ...step,
                expression: { ...step.expression, variable: event.target.value }
              })
            }
            placeholder="Variable"
            className="flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
          />
          <select
            value={step.expression.operator}
            onChange={(event) =>
              onChange({
                ...step,
                expression: {
                  ...step.expression,
                  operator: event.target.value as ConditionOperator
                }
              })
            }
            className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
          >
            {Object.entries(OPERATOR_LABEL).map(([operator, label]) => (
              <option key={operator} value={operator}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={step.expression.value}
            onChange={(event) =>
              onChange({ ...step, expression: { ...step.expression, value: event.target.value } })
            }
            placeholder="Value"
            className="flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
          />
        </div>
      )}

      {step.kind === 'ai-decision' && (
        <textarea
          value={step.prompt}
          onChange={(event) => onChange({ ...step, prompt: event.target.value })}
          placeholder="What should the model decide? (it sees current context variables and must answer proceed/stop)"
          rows={2}
          className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
        />
      )}

      {step.kind === 'user-approval' && (
        <input
          value={step.prompt}
          onChange={(event) => onChange({ ...step, prompt: event.target.value })}
          placeholder="Approval prompt"
          className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
        />
      )}

      {step.kind === 'delay' && (
        <input
          type="number"
          value={step.milliseconds}
          onChange={(event) => onChange({ ...step, milliseconds: Number(event.target.value) })}
          placeholder="Milliseconds"
          className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
        />
      )}

      {step.kind === 'output' && (
        <input
          value={step.variable}
          onChange={(event) => onChange({ ...step, variable: event.target.value })}
          placeholder="Context variable to record"
          className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
        />
      )}
    </li>
  )
}
