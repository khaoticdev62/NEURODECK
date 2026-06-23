import type {
  CreateWorkspaceRequest,
  DiscoveredWorkspace,
  NdxResult,
  Workspace,
  WorkspaceDiscoveryOptions
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listWorkspaces(): Promise<NdxResult<Workspace[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workspaces.list()
}

export async function createWorkspace(
  request: CreateWorkspaceRequest
): Promise<NdxResult<Workspace>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workspaces.create(request)
}

export async function removeWorkspace(id: string): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workspaces.remove(id)
}

export async function pickWorkspaceFolder(): Promise<NdxResult<string | null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workspaces.pickFolder()
}

export async function discoverWorkspaces(
  options: WorkspaceDiscoveryOptions = {}
): Promise<NdxResult<DiscoveredWorkspace[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workspaces.discover(options)
}
