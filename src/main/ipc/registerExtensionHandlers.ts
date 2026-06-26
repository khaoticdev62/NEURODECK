import { ipcMain } from 'electron'
import {
  extensionIdRequestSchema,
  installExtensionRequestSchema,
  IPC_CHANNELS,
  ndxError,
  setExtensionEnabledRequestSchema,
  type ExtensionRecord,
  type NdxResult
} from '@shared/contracts'
import type { ExtensionRuntime } from '../../core/extensions/ExtensionRuntime'
import type { ExtensionStore } from '../../core/extensions/ExtensionStore'

/**
 * Real Epic X3 extension lifecycle IPC (supplemental spec §9.5).
 * `ExtensionRuntime`'s own `notify` callback (wired in `main/ipc/index.ts`
 * when it's constructed) pushes real, live updates to the renderer over
 * `extension.healthEvent` — the same live-push pattern terminal data/
 * agent run updates already use — so a future Extension Manager screen
 * sees real quarantine/fault state without polling.
 */
export function registerExtensionHandlers(store: ExtensionStore, runtime: ExtensionRuntime): void {
  ipcMain.handle(IPC_CHANNELS.extensionList, async (): Promise<NdxResult<ExtensionRecord[]>> => {
    return { ok: true, data: await store.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.extensionInstall,
    async (_event, payload: unknown): Promise<NdxResult<ExtensionRecord>> => {
      const parsed = installExtensionRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That install request is invalid.')
        }
      }
      try {
        return { ok: true, data: await runtime.install(parsed.data) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'extension-install-failed',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.extensionSetEnabled,
    async (_event, payload: unknown): Promise<NdxResult<ExtensionRecord>> => {
      const parsed = setExtensionEnabledRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      try {
        return { ok: true, data: await runtime.setEnabled(parsed.data.id, parsed.data.enabled) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'extension-state-change-failed',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.extensionRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = extensionIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That extension id is invalid.')
        }
      }
      await runtime.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.extensionClearQuarantine,
    async (_event, payload: unknown): Promise<NdxResult<ExtensionRecord>> => {
      const parsed = extensionIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That extension id is invalid.')
        }
      }
      try {
        return { ok: true, data: await runtime.clearQuarantine(parsed.data.id) }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'extension-clear-quarantine-failed',
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }
  )
}
