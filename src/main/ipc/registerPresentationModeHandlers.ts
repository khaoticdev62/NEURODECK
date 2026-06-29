import { ipcMain, powerSaveBlocker } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  setPresentationModeRequestSchema,
  type NdxResult,
  type PresentationModeSettings
} from '@shared/contracts'
import type { PresentationModeStore } from '../../core/presentation/PresentationModeStore'

/**
 * Real Epic X14 Presentation Mode IPC. The one genuinely Electron-API
 * piece — `powerSaveBlocker` — is managed here, in `main/`, never in
 * `core/` (matching `ScreenshotService`'s precedent for keeping
 * `electron` imports out of the pure-Node `core/` layer). A blocker id
 * is tracked in this closure so a real `stop()` call always matches a
 * real prior `start()` — never double-started, never leaked.
 */
export function registerPresentationModeHandlers(store: PresentationModeStore): () => void {
  let blockerId: number | null = null

  function applyKeepAwake(settings: PresentationModeSettings): void {
    const shouldBlock = settings.enabled && settings.keepScreenAwake
    if (shouldBlock && blockerId === null) {
      blockerId = powerSaveBlocker.start('prevent-display-sleep')
    } else if (!shouldBlock && blockerId !== null) {
      powerSaveBlocker.stop(blockerId)
      blockerId = null
    }
  }

  ipcMain.handle(
    IPC_CHANNELS.presentationModeGet,
    async (): Promise<NdxResult<PresentationModeSettings>> => {
      return { ok: true, data: await store.get() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.presentationModeSet,
    async (_event, payload: unknown): Promise<NdxResult<PresentationModeSettings>> => {
      const parsed = setPresentationModeRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That presentation mode request is invalid.'
          )
        }
      }
      const settings = await store.set(parsed.data)
      applyKeepAwake(settings)
      return { ok: true, data: settings }
    }
  )

  return () => {
    if (blockerId !== null) {
      powerSaveBlocker.stop(blockerId)
      blockerId = null
    }
  }
}
