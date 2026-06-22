import type {
  CreateWorkflowRunRequest,
  NdxResult,
  SaveWorkflowRequest,
  UpdateWorkflowRunRequest,
  WorkflowDefinition,
  WorkflowIdRequest,
  WorkflowRun,
  WorkspaceWorkflowRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listWorkflows(
  request: WorkspaceWorkflowRequest
): Promise<NdxResult<WorkflowDefinition[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workflows.list(request)
}

export async function saveWorkflow(
  request: SaveWorkflowRequest
): Promise<NdxResult<WorkflowDefinition>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workflows.save(request)
}

export async function removeWorkflow(request: WorkflowIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workflows.remove(request)
}

export async function listWorkflowRuns(
  request: WorkspaceWorkflowRequest
): Promise<NdxResult<WorkflowRun[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workflowRuns.list(request)
}

export async function createWorkflowRun(
  request: CreateWorkflowRunRequest
): Promise<NdxResult<WorkflowRun>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workflowRuns.create(request)
}

export async function updateWorkflowRun(
  request: UpdateWorkflowRunRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.workflowRuns.update(request)
}
