import { ipcMain } from 'electron'
import {
  addKnowledgeSourceRequestSchema,
  IPC_CHANNELS,
  knowledgeQueryRequestSchema,
  knowledgeSourceIdRequestSchema,
  ndxError,
  setKnowledgeSourcePausedRequestSchema,
  type KnowledgeQueryResult,
  type KnowledgeSource,
  type NdxResult
} from '@shared/contracts'
import type { KnowledgeStore } from '../../core/knowledge/KnowledgeStore'
import type { KnowledgeVaultService } from '../../core/knowledge/KnowledgeVaultService'

/** Real Epic X4 Knowledge Vault IPC (supplemental spec §12). */
export function registerKnowledgeHandlers(
  store: KnowledgeStore,
  service: KnowledgeVaultService
): void {
  ipcMain.handle(
    IPC_CHANNELS.knowledgeSourceList,
    async (): Promise<NdxResult<KnowledgeSource[]>> => {
      return { ok: true, data: await store.listSources() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.knowledgeSourceAdd,
    async (_event, payload: unknown): Promise<NdxResult<KnowledgeSource>> => {
      const parsed = addKnowledgeSourceRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That source request is invalid.')
        }
      }
      try {
        return { ok: true, data: await service.addSource(parsed.data) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'knowledge-source-add-failed',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.knowledgeSourceRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = knowledgeSourceIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That source id is invalid.')
        }
      }
      await service.removeSource(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.knowledgeSourceReindex,
    async (_event, payload: unknown): Promise<NdxResult<KnowledgeSource>> => {
      const parsed = knowledgeSourceIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That source id is invalid.')
        }
      }
      try {
        return { ok: true, data: await service.reindex(parsed.data.id) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'knowledge-source-reindex-failed',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.knowledgeSourceSetPaused,
    async (_event, payload: unknown): Promise<NdxResult<KnowledgeSource>> => {
      const parsed = setKnowledgeSourcePausedRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      const updated = await service.setPaused(parsed.data.id, parsed.data.paused)
      if (!updated) {
        return {
          ok: false,
          error: ndxError(
            'not-found',
            'knowledge-source-not-found',
            'That source no longer exists.'
          )
        }
      }
      return { ok: true, data: updated }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.knowledgeQuery,
    async (_event, payload: unknown): Promise<NdxResult<KnowledgeQueryResult[]>> => {
      const parsed = knowledgeQueryRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That query is invalid.')
        }
      }
      const data = await service.query(
        parsed.data.query,
        parsed.data.workspaceId,
        parsed.data.maxResults
      )
      return { ok: true, data }
    }
  )
}
