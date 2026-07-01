import { ipcMain } from 'electron'
import {
  clearMemoryScopeRequestSchema,
  IPC_CHANNELS,
  memoryExportSchema,
  memoryIdRequestSchema,
  memoryQueryRequestSchema,
  ndxError,
  setMemoryDisabledRequestSchema,
  updateMemoryRequestSchema,
  writeMemoryRequestSchema,
  type MemoryDisabledState,
  type MemoryExport,
  type MemoryItem,
  type NdxResult
} from '@shared/contracts'
import type { MemoryStore } from '../../core/memory/MemoryStore'

/** Real Epic X4 Scoped AI Memory IPC (supplemental spec §13). */
export function registerMemoryHandlers(store: MemoryStore): void {
  ipcMain.handle(
    IPC_CHANNELS.memoryList,
    async (_event, payload: unknown): Promise<NdxResult<MemoryItem[]>> => {
      const parsed = memoryQueryRequestSchema.safeParse(payload ?? {})
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That query is invalid.')
        }
      }
      return { ok: true, data: await store.list(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memoryWrite,
    async (_event, payload: unknown): Promise<NdxResult<MemoryItem>> => {
      const parsed = writeMemoryRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That memory write is invalid.')
        }
      }
      try {
        return { ok: true, data: await store.write(parsed.data) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'memory-write-refused',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memoryUpdate,
    async (_event, payload: unknown): Promise<NdxResult<MemoryItem>> => {
      const parsed = updateMemoryRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That update is invalid.')
        }
      }
      try {
        const updated = await store.update(parsed.data)
        if (!updated) {
          return {
            ok: false,
            error: ndxError('not-found', 'memory-not-found', 'That memory item no longer exists.')
          }
        }
        return { ok: true, data: updated }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'memory-write-refused',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memoryDelete,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = memoryIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That memory id is invalid.')
        }
      }
      await store.delete(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memorySetDisabled,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = setMemoryDisabledRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      await store.setDisabled(parsed.data.type, parsed.data.disabled)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memoryGetDisabledState,
    async (): Promise<NdxResult<MemoryDisabledState>> => {
      return { ok: true, data: await store.getDisabledState() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memoryClearScope,
    async (_event, payload: unknown): Promise<NdxResult<number>> => {
      const parsed = clearMemoryScopeRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      const removed = await store.clearScope(parsed.data.scope, parsed.data.workspaceId)
      return { ok: true, data: removed }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.memoryExport,
    async (_event, payload: unknown): Promise<NdxResult<MemoryExport>> => {
      const parsed = memoryQueryRequestSchema.safeParse(payload ?? {})
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That export query is invalid.')
        }
      }
      const exported = await store.export(parsed.data)
      return { ok: true, data: memoryExportSchema.parse(exported) }
    }
  )
}
