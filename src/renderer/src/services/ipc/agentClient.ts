import type {
  AgentDefinition,
  AgentIdRequest,
  AgentRun,
  AgentRunIdRequest,
  CreateAgentRequest,
  ListAgentRunsRequest,
  NdxResult,
  SetAgentEnabledRequest,
  StartAgentRunRequest,
  UpdateAgentRequest,
  WorkspaceAgentRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listAgents(
  request: WorkspaceAgentRequest
): Promise<NdxResult<AgentDefinition[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agents.list(request)
}

export async function createAgent(
  request: CreateAgentRequest
): Promise<NdxResult<AgentDefinition>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agents.create(request)
}

export async function updateAgent(
  request: UpdateAgentRequest
): Promise<NdxResult<AgentDefinition>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agents.update(request)
}

export async function setAgentEnabled(
  request: SetAgentEnabledRequest
): Promise<NdxResult<AgentDefinition>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agents.setEnabled(request)
}

export async function removeAgent(request: AgentIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agents.remove(request)
}

export async function listAgentRuns(request: ListAgentRunsRequest): Promise<NdxResult<AgentRun[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agentRuns.list(request)
}

export async function getAgentRun(request: AgentRunIdRequest): Promise<NdxResult<AgentRun>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agentRuns.get(request)
}

export async function startAgentRun(request: StartAgentRunRequest): Promise<NdxResult<AgentRun>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agentRuns.start(request)
}

export async function cancelAgentRun(request: AgentRunIdRequest): Promise<NdxResult<AgentRun>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.agentRuns.cancel(request)
}

export function onAgentRunUpdate(listener: (run: AgentRun) => void): () => void {
  return getNdxBridge()?.agentRuns.onUpdate(listener) ?? (() => undefined)
}
