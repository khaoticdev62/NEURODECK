import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AgentRun, WorkflowDefinition, WorkflowRun, Workspace } from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusable } from '../../controller/focus/useFocusable'
import { listAgents, listAgentRuns } from '../../services/ipc/agentClient'
import { listWorkflows, listWorkflowRuns } from '../../services/ipc/workflowClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

interface HomeSummary {
  workflows: WorkflowDefinition[]
  workflowRuns: WorkflowRun[]
  agentRuns: AgentRun[]
  agentCount: number
  errors: string[]
}

const EMPTY_SUMMARY: HomeSummary = {
  workflows: [],
  workflowRuns: [],
  agentRuns: [],
  agentCount: 0,
  errors: []
}

function isRunningWorkflow(run: WorkflowRun): boolean {
  return run.status === 'running' || run.status === 'paused'
}

function isRunningAgent(run: AgentRun): boolean {
  return ['planning', 'waiting-for-approval', 'queued', 'running', 'paused'].includes(run.state)
}

/**
 * ND-008 Home Command Center. Empty state remains honest when no workspace
 * exists; once real workspace/services exist, this screen now composes real
 * workspace, workflow, and agent state instead of staying as an onboarding
 * placeholder.
 */
export function HomeCommandCenter(): React.JSX.Element {
  const navigate = useNavigate()
  const { workspaces, activeWorkspace, loading, error, setActive } = useWorkspaces()
  const targetWorkspace = activeWorkspace ?? workspaces[0] ?? null
  const [summary, setSummary] = useState<HomeSummary>(EMPTY_SUMMARY)

  useEffect(() => {
    if (!targetWorkspace) {
      return
    }

    let cancelled = false
    void Promise.all([
      listWorkflows({ workspaceId: targetWorkspace.id }),
      listWorkflowRuns({ workspaceId: targetWorkspace.id }),
      listAgents({ workspaceId: targetWorkspace.id }),
      listAgentRuns({})
    ])
      .then(([workflowsResult, workflowRunsResult, agentsResult, agentRunsResult]) => {
        if (cancelled) return
        const errors: string[] = []
        const workflows = workflowsResult.ok ? workflowsResult.data : []
        const workflowRuns = workflowRunsResult.ok ? workflowRunsResult.data : []
        const agents = agentsResult.ok ? agentsResult.data : []
        const agentRuns = agentRunsResult.ok
          ? agentRunsResult.data.filter((run) => run.workspaceId === targetWorkspace.id)
          : []

        if (!workflowsResult.ok) errors.push(workflowsResult.error.userMessage)
        if (!workflowRunsResult.ok) errors.push(workflowRunsResult.error.userMessage)
        if (!agentsResult.ok) errors.push(agentsResult.error.userMessage)
        if (!agentRunsResult.ok) errors.push(agentRunsResult.error.userMessage)

        setSummary({
          workflows,
          workflowRuns,
          agentRuns,
          agentCount: agents.length,
          errors
        })
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setSummary({
          ...EMPTY_SUMMARY,
          errors: [
            loadError instanceof Error ? loadError.message : 'Could not load home workspace state.'
          ]
        })
      })

    return () => {
      cancelled = true
    }
  }, [targetWorkspace])

  const { ref: continueRef, isFocused: continueFocused } = useFocusable<HTMLButtonElement>({
    id: 'home:continue-workspace',
    groupId: 'home',
    priority: 100,
    initialFocus: true,
    hidden: !targetWorkspace,
    onActivate: () => {
      if (!targetWorkspace) return
      setActive(targetWorkspace.id)
      navigate('/workspaces/detail')
    }
  })

  const runningWorkflows = summary.workflowRuns.filter(isRunningWorkflow)
  const runningAgents = summary.agentRuns.filter(isRunningAgent)

  if (loading) {
    return (
      <div className="flex h-full flex-col p-4">
        <p className="text-title font-semibold text-text-primary">Home</p>
        <EmptyState
          className="flex-1"
          title="Loading workspace state"
          description="Reading the real workspace registry."
        />
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex h-full flex-col p-4">
        <p className="text-title font-semibold text-text-primary">Home</p>
        {error && <ErrorState title="Workspace state degraded" description={error} />}
        <EmptyState
          className="flex-1"
          title="Create or discover a workspace"
          description="Open a folder, clone a Git repository, connect a remote host, or try the sample learning lab to get started."
          action={
            <div className="flex flex-wrap gap-2">
              <ControllerButton variant="primary" onClick={() => navigate('/workspaces')}>
                Open folder
              </ControllerButton>
              <ControllerButton variant="secondary" onClick={() => navigate('/workspaces')}>
                Clone Git repository
              </ControllerButton>
              <ControllerButton variant="secondary" onClick={() => navigate('/learn')}>
                Sample learning lab
              </ControllerButton>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Home</p>
          <p className="text-meta text-text-secondary">
            {targetWorkspace
              ? `Active workspace: ${targetWorkspace.name}`
              : `${workspaces.length} workspaces available`}
          </p>
        </div>
        <ControllerButton variant="secondary" onClick={() => navigate('/search')}>
          Search
        </ControllerButton>
      </div>

      {(error || summary.errors.length > 0) && (
        <ErrorState
          title="Home state degraded"
          description={[error, ...summary.errors].filter(Boolean).join(' ')}
        />
      )}

      {targetWorkspace && (
        <section className="grid grid-cols-[1.2fr_0.8fr] gap-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-body font-semibold text-text-primary">Continue</p>
            <p className="mt-1 text-title font-semibold text-text-primary">
              {targetWorkspace.name}
            </p>
            <p className="text-meta text-text-secondary">{targetWorkspace.rootPath}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ControllerButton
                ref={continueRef}
                variant="primary"
                className={continueFocused ? 'ring-2 ring-border-focus' : undefined}
                onClick={() => {
                  setActive(targetWorkspace.id)
                  navigate('/workspaces/detail')
                }}
              >
                Continue
              </ControllerButton>
              <ControllerButton variant="secondary" onClick={() => navigate('/files')}>
                Files
              </ControllerButton>
              <ControllerButton variant="secondary" onClick={() => navigate('/terminal')}>
                Terminal
              </ControllerButton>
              <ControllerButton variant="secondary" onClick={() => navigate('/git')}>
                Git
              </ControllerButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric label="Workflows" value={summary.workflows.length} />
            <Metric label="Agents" value={summary.agentCount} />
            <Metric label="Workflow runs" value={runningWorkflows.length} />
            <Metric label="Agent runs" value={runningAgents.length} />
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-body font-semibold text-text-primary">Workspaces</p>
          <ControllerButton variant="ghost" onClick={() => navigate('/workspaces')}>
            Manage
          </ControllerButton>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {workspaces.slice(0, 6).map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              active={workspace.id === targetWorkspace?.id}
              onOpen={() => {
                setActive(workspace.id)
                navigate('/workspaces/detail')
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-body font-semibold text-text-primary">Recommendations</p>
        <div className="grid grid-cols-4 gap-2">
          <Recommendation
            title="Create workflow"
            detail="Automate real tool steps"
            path="/automations/forge"
          />
          <Recommendation title="Create agent" detail="Plan with a routed model" path="/agents" />
          <Recommendation
            title="Review approvals"
            detail="Inspect queued actions"
            path="/ai/approvals"
          />
          <Recommendation
            title="Open learning lab"
            detail="Continue guided practice"
            path="/learn"
          />
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-meta text-text-secondary">{label}</p>
      <p className="text-title font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function WorkspaceCard({
  workspace,
  active,
  onOpen
}: {
  workspace: Workspace
  active: boolean
  onOpen: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`min-h-[var(--ndx-target-min)] rounded-lg border bg-surface p-3 text-left ${
        active ? 'border-border-focus' : 'border-border hover:border-border-focus/70'
      }`}
    >
      <p className="text-body font-semibold text-text-primary">{workspace.name}</p>
      <p className="truncate text-meta text-text-tertiary">{workspace.rootPath}</p>
    </button>
  )
}

function Recommendation({
  title,
  detail,
  path
}: {
  title: string
  detail: string
  path: string
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="min-h-[var(--ndx-target-min)] rounded-lg border border-border bg-surface p-3 text-left hover:border-border-focus/70"
    >
      <p className="text-body font-semibold text-text-primary">{title}</p>
      <p className="text-meta text-text-secondary">{detail}</p>
    </button>
  )
}
