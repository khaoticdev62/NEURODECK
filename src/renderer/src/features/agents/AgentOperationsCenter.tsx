import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AgentDefinition, RoutingProfileId } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxFocusSurface, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import {
  createAgent,
  listAgents,
  removeAgent,
  setAgentEnabled
} from '../../services/ipc/agentClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

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
 * ND-016 Agent Operations Center. Real: agents are persisted definitions
 * (Epic 8 core lifecycle), and a run plans through the real Model Router
 * (Epic 9). Tool calls now submit through the ActionQueue bridge, but
 * "Active/Idle/Paused" status here reflects the real run state machine,
 * not a simulated busy indicator. Tool allowlist options come from the
 * real `ToolRegistry`, not an invented capability list.
 */
export function AgentOperationsCenter(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState title="No active workspace" description="Open a workspace to see its agents." />
    )
  }

  return (
    <AgentOperationsCenterWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
  )
}

function AgentOperationsCenterWorkspace({
  workspaceId
}: {
  workspaceId: string
}): React.JSX.Element {
  const navigate = useNavigate()
  const { registry } = useAiSafety()
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    let active = true
    void listAgents({ workspaceId }).then((result) => {
      if (!active) return
      if (result.ok) {
        setAgents(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [workspaceId])

  async function handleToggleEnabled(agent: AgentDefinition): Promise<void> {
    const result = await setAgentEnabled({ agentId: agent.id, enabled: !agent.enabled })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setAgents((current) => current.map((item) => (item.id === agent.id ? result.data : item)))
  }

  async function handleRemove(agentId: string): Promise<void> {
    const result = await removeAgent({ agentId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setAgents((current) => current.filter((agent) => agent.id !== agentId))
  }

  const toolIds = registry.list().map((tool) => tool.id)
  const enabledCount = agents.filter((agent) => agent.enabled).length

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[20rem_minmax(28rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Agent Factory" subtitle={`${toolIds.length} registered tools`}>
        <ControllerButton
          variant="primary"
          onClick={() => setShowCreateForm((current) => !current)}
        >
          {showCreateForm ? 'Cancel' : 'New agent'}
        </ControllerButton>

        {showCreateForm ? (
          <CreateAgentForm
            workspaceId={workspaceId}
            toolIds={toolIds}
            onCreated={(agent) => {
              setShowCreateForm(false)
              setAgents((current) => [...current, agent])
            }}
            onError={setError}
          />
        ) : (
          <p className="text-meta text-text-tertiary">
            Create persisted agents with explicit tool allowlists and zero implicit permission
            ceiling grants.
          </p>
        )}
      </NdxToolWindow>

      <NdxEditorShell title="Agent Operations Center">
        <div className="flex min-h-full flex-col gap-3 p-3">
          {error && <ErrorState title="Agent error" description={error} />}

          {agents.length === 0 ? (
            <EmptyState
              className="flex-1"
              title="No agents yet"
              description="Create an agent to plan against an objective using the configured model router."
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onOpen={() => navigate(`/agents/${agent.id}`)}
                  onToggleEnabled={() => void handleToggleEnabled(agent)}
                  onRemove={() => void handleRemove(agent.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </NdxEditorShell>

      <NdxToolWindow
        title="Agent Policy"
        subtitle={`${enabledCount}/${agents.length} enabled`}
        side="right"
      >
        <p className="text-meta text-text-secondary">
          Runs still plan through the real Model Router and submit tool calls through ActionQueue
          review.
        </p>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Tool registry</p>
          <p className="text-meta text-text-tertiary">
            {toolIds.length
              ? `${toolIds.length} tools available for allowlists.`
              : 'No tools registered.'}
          </p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Permission default</p>
          <p className="text-meta text-text-tertiary">
            New agents start with no permission ceiling grants. Tool access must be explicit.
          </p>
        </div>
      </NdxToolWindow>
    </div>
  )
}

function CreateAgentForm({
  workspaceId,
  toolIds,
  onCreated,
  onError
}: {
  workspaceId: string
  toolIds: string[]
  onCreated: (agent: AgentDefinition) => void
  onError: (message: string | null) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [goal, setGoal] = useState('')
  const [modelProfile, setModelProfile] = useState<RoutingProfileId>('balanced')
  const [allowedTool, setAllowedTool] = useState(toolIds[0] ?? '')
  const [saving, setSaving] = useState(false)

  async function handleCreate(): Promise<void> {
    setSaving(true)
    const result = await createAgent({
      name: name.trim() || 'New Agent',
      role: role.trim() || 'Assistant',
      goal: goal.trim() || 'Assist with the workspace.',
      workspaceId,
      modelProfile,
      toolAllowlist: allowedTool ? [allowedTool] : [],
      permissionCeiling: [],
      resourceLimits: { maxTokens: 1024, timeoutMs: 30000, maxToolCalls: 0 },
      childAgentPolicy: { allowChildAgents: false, maxChildrenPerRun: 0, maxDepth: 0 },
      enabled: true
    })
    setSaving(false)
    if (!result.ok) {
      onError(result.error.userMessage)
      return
    }
    onError(null)
    onCreated(result.data)
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Agent name"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <input
        value={role}
        onChange={(event) => setRole(event.target.value)}
        placeholder="Role (e.g. Code reviewer)"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <input
        value={goal}
        onChange={(event) => setGoal(event.target.value)}
        placeholder="Goal (e.g. Find actionable risks)"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <select
        value={modelProfile}
        onChange={(event) => setModelProfile(event.target.value as RoutingProfileId)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        {ROUTING_PROFILES.map((profile) => (
          <option key={profile} value={profile}>
            {profile}
          </option>
        ))}
      </select>
      <select
        value={allowedTool}
        onChange={(event) => setAllowedTool(event.target.value)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        <option value="">No tools allowed (plan only)</option>
        {toolIds.map((toolId) => (
          <option key={toolId} value={toolId}>
            {toolId}
          </option>
        ))}
      </select>
      <ControllerButton variant="primary" disabled={saving} onClick={() => void handleCreate()}>
        {saving ? 'Creating…' : 'Create agent'}
      </ControllerButton>
    </div>
  )
}

function AgentCard({
  agent,
  onOpen,
  onToggleEnabled,
  onRemove
}: {
  agent: AgentDefinition
  onOpen: () => void
  onToggleEnabled: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `agent-card:${agent.id}`,
    groupId: 'agent-operations-center',
    onActivate: onOpen
  })

  return (
    <li ref={ref} tabIndex={-1} className="outline-none">
      <NdxFocusSurface active={isFocused} density="comfortable" className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-body font-semibold text-text-primary">{agent.name}</p>
          <StatusBadge
            tone={agent.enabled ? 'success' : 'neutral'}
            label={agent.enabled ? 'Enabled' : 'Disabled'}
          />
        </div>
        <p className="text-meta text-text-secondary">
          {agent.role} · {agent.modelProfile}
        </p>
        <p className="text-meta text-text-tertiary">{agent.goal}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-meta">
          <span className="text-text-tertiary">Context window</span>
          <span className="text-right tabular-nums text-text-primary">
            {agent.resourceLimits.maxTokens.toLocaleString()} tokens
          </span>
        </div>
        <p className="text-meta text-text-tertiary">
          Assigned tools: {agent.toolAllowlist.length > 0 ? agent.toolAllowlist.join(', ') : 'none'}
        </p>
        <p className="text-meta text-text-tertiary">
          Child agents:{' '}
          {agent.childAgentPolicy.allowChildAgents
            ? `${agent.childAgentPolicy.maxChildrenPerRun} max · depth ${agent.childAgentPolicy.maxDepth}`
            : 'disabled'}
        </p>
        <div className="mt-3 flex gap-2">
          <ControllerButton variant="primary" onClick={onOpen}>
            Open
          </ControllerButton>
          <ControllerButton variant="secondary" onClick={onToggleEnabled}>
            {agent.enabled ? 'Disable' : 'Enable'}
          </ControllerButton>
          <ControllerButton variant="ghost" onClick={onRemove}>
            Remove
          </ControllerButton>
        </div>
      </NdxFocusSurface>
    </li>
  )
}
