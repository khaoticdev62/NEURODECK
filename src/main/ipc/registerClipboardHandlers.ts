import { ipcMain } from 'electron'
import {
  clipboardEntryIdRequestSchema,
  clipboardQueryRequestSchema,
  IPC_CHANNELS,
  ndxError,
  renderSnippetRequestSchema,
  setClipboardMonitoringRequestSchema,
  setClipboardPinnedRequestSchema,
  snippetIdRequestSchema,
  upsertSnippetRequestSchema,
  type ClipboardEntry,
  type NdxResult,
  type RenderedSnippet,
  type Snippet
} from '@shared/contracts'
import type { ClipboardStore } from '../../core/clipboard/ClipboardStore'
import type { SnippetStore } from '../../core/clipboard/SnippetStore'

/** Real Epic X6 Clipboard Center + Snippets IPC (supplemental spec §17). */
export function registerClipboardHandlers(
  clipboardStore: ClipboardStore,
  snippetStore: SnippetStore
): void {
  ipcMain.handle(
    IPC_CHANNELS.clipboardList,
    async (_event, payload: unknown): Promise<NdxResult<ClipboardEntry[]>> => {
      const parsed = clipboardQueryRequestSchema.safeParse(payload ?? {})
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That query is invalid.')
        }
      }
      return { ok: true, data: await clipboardStore.list(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.clipboardSetPinned,
    async (_event, payload: unknown): Promise<NdxResult<ClipboardEntry>> => {
      const parsed = setClipboardPinnedRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      const updated = await clipboardStore.setPinned(parsed.data.id, parsed.data.pinned)
      if (!updated) {
        return {
          ok: false,
          error: ndxError('not-found', 'clipboard-entry-not-found', 'That entry no longer exists.')
        }
      }
      return { ok: true, data: updated }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.clipboardRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = clipboardEntryIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That id is invalid.')
        }
      }
      await clipboardStore.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(IPC_CHANNELS.clipboardClear, async (): Promise<NdxResult<null>> => {
    await clipboardStore.clear()
    return { ok: true, data: null }
  })

  ipcMain.handle(
    IPC_CHANNELS.clipboardSetMonitoring,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = setClipboardMonitoringRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      await clipboardStore.setMonitoringEnabled(parsed.data.enabled)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(IPC_CHANNELS.clipboardGetMonitoring, async (): Promise<NdxResult<boolean>> => {
    return { ok: true, data: await clipboardStore.isMonitoringEnabled() }
  })

  ipcMain.handle(IPC_CHANNELS.snippetList, async (): Promise<NdxResult<Snippet[]>> => {
    return { ok: true, data: await snippetStore.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.snippetUpsert,
    async (_event, payload: unknown): Promise<NdxResult<Snippet>> => {
      const parsed = upsertSnippetRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That snippet is invalid.')
        }
      }
      return { ok: true, data: await snippetStore.upsert(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.snippetRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = snippetIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That snippet id is invalid.')
        }
      }
      await snippetStore.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.snippetRender,
    async (_event, payload: unknown): Promise<NdxResult<RenderedSnippet>> => {
      const parsed = renderSnippetRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      const rendered = await snippetStore.render(parsed.data.id, parsed.data.values)
      if (!rendered) {
        return {
          ok: false,
          error: ndxError('not-found', 'snippet-not-found', 'That snippet no longer exists.')
        }
      }
      return { ok: true, data: rendered }
    }
  )
}
