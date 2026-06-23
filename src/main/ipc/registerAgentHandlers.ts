import { ipcMain } from 'electron'
import {
  agentIdRequestSchema,
  createAgentRequestSchema,
  IPC_CHANNELS,
  listAgentRunsRequestSchema,
  ndxError,
  setAgentEnabledRequestSchema,
  startAgentRunRequestSchema,
  updateAgentRequestSchema,
  workspaceAgentRequestSchema,
  agentRunIdRequestSchema,
  agentToolExecutionResultSchema,
  type AgentDefinition,
  type AgentRun,
  type NdxResult
} from '@shared/contracts'
import type { AgentRuntime } from '../../core/agents/AgentRuntime'
import type { AgentStore } from '../../core/agents/AgentStore'

/**
 * Real Agent Runtime IPC (mega-prompt §17 core lifecycle). `AgentRuntime`
 * plans through the real Model Router, exposes pause/resume/cancel controls,
 * and resolves typed tool-result acknowledgments from the renderer-owned
 * ActionQueue bridge. Live run updates are pushed via `agentRun.update`.
 */
export function registerAgentHandlers(store: AgentStore, runtime: AgentRuntime): void {
  ipcMain.handle(
    IPC_CHANNELS.agentList,
    async (_event, payload: unknown): Promise<NdxResult<AgentDefinition[]>> => {
      const parsed = workspaceAgentRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentCreate,
    async (_event, payload: unknown): Promise<NdxResult<AgentDefinition>> => {
      const parsed = createAgentRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.create(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentUpdate,
    async (_event, payload: unknown): Promise<NdxResult<AgentDefinition>> => {
      const parsed = updateAgentRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.update(parsed.data.agentId, parsed.data.agent) }
      } catch (error) {
        return { ok: false, error: toAgentError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentSetEnabled,
    async (_event, payload: unknown): Promise<NdxResult<AgentDefinition>> => {
      const parsed = setAgentEnabledRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.setEnabled(parsed.data.agentId, parsed.data.enabled) }
      } catch (error) {
        return { ok: false, error: toAgentError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = agentIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      await store.remove(parsed.data.agentId)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRunList,
    async (_event, payload: unknown): Promise<NdxResult<AgentRun[]>> => {
      const parsed = listAgentRunsRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.listRuns(parsed.data.agentId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRunGet,
    async (_event, payload: unknown): Promise<NdxResult<AgentRun>> => {
      const parsed = agentRunIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const run = await store.getRun(parsed.data.runId)
      if (!run)
        return {
          ok: false,
          error: ndxError('not-found', 'agent-run-not-found', 'That agent run no longer exists.')
        }
      return { ok: true, data: run }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRunStart,
    async (_event, payload: unknown): Promise<NdxResult<AgentRun>> => {
      const parsed = startAgentRunRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await runtime.start(parsed.data.agentId, parsed.data.objective) }
      } catch (error) {
        return { ok: false, error: toAgentError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRunCancel,
    async (_event, payload: unknown): Promise<NdxResult<AgentRun>> => {
      const parsed = agentRunIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await runtime.cancel(parsed.data.runId) }
      } catch (error) {
        return { ok: false, error: toAgentError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRunPause,
    async (_event, payload: unknown): Promise<NdxResult<AgentRun>> => {
      const parsed = agentRunIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await runtime.pause(parsed.data.runId) }
      } catch (error) {
        return { ok: false, error: toAgentError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentRunResume,
    async (_event, payload: unknown): Promise<NdxResult<AgentRun>> => {
      const parsed = agentRunIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await runtime.resume(parsed.data.runId) }
      } catch (error) {
        return { ok: false, error: toAgentError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.agentToolResult,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = agentToolExecutionResultSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      await runtime.resolveToolResult(parsed.data)
      return { ok: true, data: null }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That agent request is invalid.')
  }
}

function toAgentError(error: unknown): ReturnType<typeof ndxError> {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'agent-operation-failed', message, { message })
}
