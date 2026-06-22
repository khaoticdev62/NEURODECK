import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WorkflowDefinition } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { listWorkflows, removeWorkflow } from '../../services/ipc/workflowClient'
import { useWorkflowRunner } from '../../workflows/useWorkflowRunner'
import { useWorkspaces } from '../workspaces/useWorkspaces'

/**
 * ND-032 Workflow Library. Real: workflows are persisted definitions
 * (Epic 8), run through the real `WorkflowEngine`/`ActionQueue` pipeline.
 * Categories (Development/System/Git/Security/Media/Learning/Remote/
 * User-created) are deferred — with zero workflows pre-shipped, there's
 * nothing real to categorize yet; a flat list is the honest
 * representation until real workflow templates exist.
 */
export function WorkflowLibrary(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace to see its workflows."
      />
    )
  }

  return <WorkflowLibraryWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function WorkflowLibraryWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const navigate = useNavigate()
  const { startRun } = useWorkflowRunner()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listWorkflows({ workspaceId }).then((result) => {
      if (!active) return
      if (result.ok) {
        setWorkflows(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [workspaceId])

  async function handleRemove(workflowId: string): Promise<void> {
    const result = await removeWorkflow({ workspaceId, workflowId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setWorkflows((current) => current.filter((workflow) => workflow.id !== workflowId))
  }

  async function handleRun(workflow: WorkflowDefinition): Promise<void> {
    const run = await startRun(workspaceId, workflow)
    if (run) navigate(`/automations/runs/${run.id}`)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Workflow Library</p>
        <ControllerButton variant="primary" onClick={() => navigate('/automations/forge')}>
          New workflow
        </ControllerButton>
      </div>

      {error && <ErrorState title="Workflow error" description={error} />}

      {workflows.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No workflows yet"
          description="Create a workflow to automate a sequence of real tool actions."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onOpen={() => navigate(`/automations/forge/${workflow.id}`)}
              onRun={() => void handleRun(workflow)}
              onRemove={() => void handleRemove(workflow.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function WorkflowCard({
  workflow,
  onOpen,
  onRun,
  onRemove
}: {
  workflow: WorkflowDefinition
  onOpen: () => void
  onRun: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `workflow-card:${workflow.id}`,
    groupId: 'workflow-library',
    onActivate: onOpen
  })

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={`rounded-lg border p-4 ${isFocused ? 'border-border-focus' : 'border-border'} bg-surface`}
    >
      <p className="text-body font-semibold text-text-primary">{workflow.name}</p>
      <p className="text-meta text-text-secondary">
        {workflow.steps.length} step{workflow.steps.length === 1 ? '' : 's'} · v{workflow.version}
      </p>
      {workflow.description && (
        <p className="text-meta text-text-tertiary">{workflow.description}</p>
      )}
      <div className="mt-3 flex gap-2">
        <ControllerButton variant="primary" onClick={onRun} disabled={workflow.steps.length === 0}>
          Run
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={onOpen}>
          Open
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={onRemove}>
          Remove
        </ControllerButton>
      </div>
    </li>
  )
}
