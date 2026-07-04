import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu } from 'lucide-react'
import type {
  AgentRun,
  MetricValue,
  ModelProvider,
  SystemMetricsSnapshot,
  WorkflowDefinition,
  WorkflowRun,
  Workspace
} from '@shared/contracts'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { formatBytes } from '../../components/primitives/formatBytes'
import { NdxMeter, type NdxMeterTone } from '../../components/primitives/NdxMeter'
import { TechCard } from '../../components/primitives/TechCard'
import { NdxFocusSurface } from '../../components/workbench'
import { NdxTvShelf, TvCategoryIcon } from '../../components/tvos'
import { useFocusable } from '../../controller/focus/useFocusable'
import { listAgents, listAgentRuns } from '../../services/ipc/agentClient'
import { listModelProviders } from '../../services/ipc/modelClient'
import { listWorkflows, listWorkflowRuns } from '../../services/ipc/workflowClient'
import { useCoreTelemetry } from '../../state/useCoreTelemetry'
import { useDisplaySettings } from '../../state/useDisplaySettings'
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
  const { reduceMotion } = useDisplaySettings()
  const { workspaces, activeWorkspace, loading, error, setActive } = useWorkspaces()
  const targetWorkspace = activeWorkspace ?? workspaces[0] ?? null
  const [summary, setSummary] = useState<HomeSummary>(EMPTY_SUMMARY)
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [providerError, setProviderError] = useState<string | null>(null)

  // Command Center's "System Health" telemetry reads the same shared,
  // already-polling snapshot the footer's `useCoreTelemetry` maintains
  // (one 5s IPC poll for the whole app) instead of triggering a second,
  // independent `collectSystemMetrics()` round trip on every Home mount.
  const telemetry = useCoreTelemetry()
  const metrics = telemetry.snapshot
  const metricsUnavailable = metrics === null && telemetry.kernelStatus === 'offline'

  // "Active Engine" reads the real provider registry — a fetch failure is
  // surfaced explicitly rather than silently rendering as "no provider".
  useEffect(() => {
    let active = true
    void listModelProviders().then((result) => {
      if (!active) return
      if (result.ok) {
        setProviders(result.data)
        setProviderError(null)
      } else {
        setProviderError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

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
    <div className="flex min-h-full flex-col gap-3 p-2">
      <section className="ndx-os-panel shrink-0 overflow-hidden">
        <div className="ndx-console-ruler" aria-hidden="true" />
        <div className="grid grid-cols-1 items-stretch gap-0 deck:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 border-b border-[var(--ndx-workbench-border)] px-4 py-3 deck:border-b-0 deck:border-r">
            <p className="text-meta uppercase tracking-wide text-text-tertiary">Command center</p>
            <h1 className="mt-1 truncate text-display font-semibold text-text-primary">
              {targetWorkspace?.name ?? 'Home'}
            </h1>
            <p className="mt-1 truncate text-meta text-text-secondary">
              {targetWorkspace
                ? `Active workspace: ${targetWorkspace.name}`
                : `${workspaces.length} workspaces available`}
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-2 deck:min-w-[224px]">
            <Metric label="Workflows" value={summary.workflows.length} />
            <Metric label="Agents" value={summary.agentCount} />
            <Metric label="Workflow runs" value={runningWorkflows.length} />
            <Metric label="Agent runs" value={runningAgents.length} />
          </div>
        </div>
      </section>

      {(error || summary.errors.length > 0) && (
        <ErrorState
          title="Home state degraded"
          description={[error, ...summary.errors].filter(Boolean).join(' ')}
        />
      )}

      {targetWorkspace && (
        <section className="ndx-bento-grid shrink-0">
          <TechCard reduceMotion={reduceMotion} className="ndx-bento-primary p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-meta uppercase tracking-wide text-text-tertiary">Resume</p>
                <p className="mt-1 truncate text-title font-semibold text-text-primary">
                  {targetWorkspace.rootPath}
                </p>
              </div>
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
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
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
          </TechCard>

          <div className="ndx-bento-telemetry flex flex-col gap-3">
            <TechCard reduceMotion={reduceMotion} className="p-3">
              <p className="text-meta uppercase tracking-wide text-text-tertiary">Jump</p>
              <div className="mt-2 grid gap-2">
                <ControllerButton variant="secondary" onClick={() => navigate('/search')}>
                  Search
                </ControllerButton>
                <ControllerButton variant="secondary" onClick={() => navigate('/ai')}>
                  AI canvas
                </ControllerButton>
                <ControllerButton variant="ghost" onClick={() => navigate('/automations')}>
                  Open workflows
                </ControllerButton>
              </div>
            </TechCard>

            <SystemHealthCard
              reduceMotion={reduceMotion}
              metrics={metrics}
              metricsUnavailable={metricsUnavailable}
              providers={providers}
              providerError={providerError}
            />
          </div>
        </section>
      )}

      <NdxTvShelf
        title="Workspaces"
        subtitle="Controller-ready project targets"
        icon={<TvCategoryIcon category="Workspaces" />}
        action={
          <ControllerButton variant="ghost" onClick={() => navigate('/workspaces')}>
            Manage
          </ControllerButton>
        }
      >
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
      </NdxTvShelf>

      <NdxTvShelf
        title="Next actions"
        subtitle="Common routes for the active workspace"
        icon={<TvCategoryIcon category="Next actions" />}
      >
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
        <Recommendation title="Open learning lab" detail="Continue guided practice" path="/learn" />
      </NdxTvShelf>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <NdxFocusSurface density="spatial" selected={value > 0}>
      <div className="p-2.5">
        <p className="truncate text-meta text-text-secondary">{label}</p>
        <p className="mt-1 text-title font-semibold tabular-nums text-text-primary">{value}</p>
      </div>
    </NdxFocusSurface>
  )
}

type ByteMetric = MetricValue<{ usagePercent: number; usedBytes: number; totalBytes: number }>

function MetricRow({
  label,
  tone,
  metric
}: {
  label: string
  tone?: NdxMeterTone
  metric: ByteMetric | undefined
}): React.JSX.Element {
  if (!metric?.available || !metric.value) {
    return <p className="text-meta text-text-tertiary">{label} unavailable</p>
  }
  return (
    <NdxMeter
      label={label}
      tone={tone}
      percent={metric.value.usagePercent}
      displayValue={`${formatBytes(metric.value.usedBytes)} / ${formatBytes(metric.value.totalBytes)}`}
    />
  )
}

/**
 * "Active Engine" reports how many configured providers are actually
 * enabled rather than guessing a single one — `enabled` is a per-provider
 * router-candidate flag (see `ModelProviderStore.setEnabled`), not a
 * mutually-exclusive "this one is active" selection, so more than one
 * provider can legitimately be enabled at once.
 */
function describeActiveEngine(providers: ModelProvider[]): string {
  const enabled = providers.filter((provider) => provider.enabled)
  if (enabled.length === 0) return 'No model provider enabled'
  if (enabled.length === 1) return enabled[0].name
  return `${enabled.length} providers enabled`
}

/**
 * Command Center reference's "Active Engine" / "System Health" telemetry
 * column — real data only: RAM/storage from `SystemMetricsSnapshot`
 * (`MetricValue.available` honestly reflects a missing sensor rather than
 * zero-filling it), and the provider registry from `listModelProviders`
 * rather than a fabricated "Connected" claim. A failed telemetry poll or
 * provider fetch is surfaced explicitly instead of rendering identically to
 * a genuinely empty/unavailable state.
 */
function SystemHealthCard({
  reduceMotion,
  metrics,
  metricsUnavailable,
  providers,
  providerError
}: {
  reduceMotion: boolean
  metrics: SystemMetricsSnapshot | null
  metricsUnavailable: boolean
  providers: ModelProvider[]
  providerError: string | null
}): React.JSX.Element {
  return (
    <TechCard reduceMotion={reduceMotion} className="flex flex-col gap-3 p-3">
      <div>
        <p className="text-meta uppercase tracking-wide text-text-tertiary">Active engine</p>
        <div className="mt-1 flex items-center gap-2">
          <Cpu className="size-4 shrink-0 text-[var(--ndx-accent)]" />
          <p className="truncate text-body font-semibold text-text-primary">
            {providerError ? 'Unable to load model providers' : describeActiveEngine(providers)}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-[var(--ndx-workbench-border-muted)] pt-3">
        <p className="text-meta uppercase tracking-wide text-text-tertiary">System health</p>
        {metricsUnavailable ? (
          <p className="text-meta text-text-tertiary">System metrics unavailable</p>
        ) : (
          <>
            <MetricRow label="RAM" metric={metrics?.memory} />
            <MetricRow label="Storage" tone="secondary" metric={metrics?.storage} />
          </>
        )}
      </div>
    </TechCard>
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
    <NdxFocusSurface density="spatial" selected={active} className="ndx-tv-card shrink-0">
      <button type="button" onClick={onOpen} className="block h-full w-full p-3 text-left">
        <span className="mb-2 inline-flex border border-[var(--ndx-workbench-border)] px-2 py-0.5 text-meta text-text-tertiary">
          {active ? 'Active' : 'Workspace'}
        </span>
        <p className="truncate text-body font-semibold text-text-primary">{workspace.name}</p>
        <p className="mt-1 line-clamp-2 break-all text-meta text-text-tertiary">
          {workspace.rootPath}
        </p>
      </button>
    </NdxFocusSurface>
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
    <NdxFocusSurface density="spatial" className="ndx-tv-card shrink-0">
      <button
        type="button"
        onClick={() => navigate(path)}
        className="block h-full w-full p-3 text-left"
      >
        <p className="text-body font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-meta text-text-secondary">{detail}</p>
      </button>
    </NdxFocusSurface>
  )
}
