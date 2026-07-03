import { ipcMain } from 'electron'
import {
  deckySettingsSchema,
  IPC_CHANNELS,
  ndxError,
  type DeckyBridgeStatus,
  type DeckySettings,
  type NdxResult
} from '@shared/contracts'
import type { DeckyBridgeService } from '../../core/decky/DeckyBridgeService'
import type { DeckySettingsStore } from '../../core/decky/DeckySettingsStore'

/**
 * Real Phase 4 Decky Loader bridge IPC. Enabling/disabling here actually
 * starts/stops `DeckyBridgeService`'s real loopback HTTP listener — this
 * is not a settings-only toggle that a real service ignores.
 */
export function registerDeckyHandlers(store: DeckySettingsStore, bridge: DeckyBridgeService): void {
  ipcMain.handle(IPC_CHANNELS.deckyGetSettings, async (): Promise<NdxResult<DeckySettings>> => {
    return { ok: true, data: await store.get() }
  })

  ipcMain.handle(
    IPC_CHANNELS.deckySetSettings,
    async (_event, payload: unknown): Promise<NdxResult<DeckySettings>> => {
      const parsed = deckySettingsSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That Decky settings request is invalid.'
          )
        }
      }
      const settings = await store.set(parsed.data)
      try {
        if (settings.enabled) await bridge.start()
        else await bridge.stop()
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'system',
            'decky-bridge-failed',
            error instanceof Error ? error.message : 'The Decky bridge could not be started.'
          )
        }
      }
      return { ok: true, data: settings }
    }
  )

  ipcMain.handle(IPC_CHANNELS.deckyGetStatus, async (): Promise<NdxResult<DeckyBridgeStatus>> => {
    const settings = await store.get()
    return {
      ok: true,
      data: {
        enabled: settings.enabled,
        listening: bridge.isListening(),
        port: bridge.getPort() ?? undefined,
        lastRequestAt: bridge.getLastRequestAt()
      }
    }
  })
}
