import { ipcMain } from 'electron'
import {
  createWorkflowRunRequestSchema,
  IPC_CHANNELS,
  ndxError,
  saveWorkflowRequestSchema,
  updateWorkflowRunRequestSchema,
  workflowIdRequestSchema,
  workspaceWorkflowRequestSchema,
  type NdxResult,
  type WorkflowDefinition,
  type WorkflowRun
} from '@shared/contracts'
import type { WorkflowRunStore } from '../../core/workflows/WorkflowRunStore'
import type { WorkflowStore } from '../../core/workflows/WorkflowStore'

/** Real handlers backed by `WorkflowStore`/`WorkflowRunStore` — Zod-validated, same pattern as every other Epic 5+ IPC surface. */
export function registerWorkflowHandlers(
  workflowStore: WorkflowStore,
  workflowRunStore: WorkflowRunStore
): void {
  ipcMain.handle(
    IPC_CHANNELS.workflowList,
    async (_event, payload: unknown): Promise<NdxResult<WorkflowDefinition[]>> => {
      const parsed = workspaceWorkflowRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await workflowStore.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.workflowSave,
    async (_event, payload: unknown): Promise<NdxResult<WorkflowDefinition>> => {
      const parsed = saveWorkflowRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await workflowStore.save(parsed.data) }
      } catch (error) {
        return { ok: false, error: toWorkflowError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.workflowRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = workflowIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      await workflowStore.remove(parsed.data.workspaceId, parsed.data.workflowId)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.workflowRunList,
    async (_event, payload: unknown): Promise<NdxResult<WorkflowRun[]>> => {
      const parsed = workspaceWorkflowRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await workflowRunStore.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.workflowRunCreate,
    async (_event, payload: unknown): Promise<NdxResult<WorkflowRun>> => {
      const parsed = createWorkflowRunRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const run = await workflowRunStore.create(parsed.data.workspaceId, parsed.data.workflowId)
      return { ok: true, data: run }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.workflowRunUpdate,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = updateWorkflowRunRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      await workflowRunStore.update(parsed.data.workspaceId, parsed.data.run)
      return { ok: true, data: null }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That workflow request is invalid.')
  }
}

function toWorkflowError(error: unknown): ReturnType<typeof ndxError> {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'workflow-operation-failed', message, { message })
}
