import { ipcMain, type BrowserWindow } from 'electron'
import {
  addManualLanSharePeerRequestSchema,
  IPC_CHANNELS,
  lanSharePeerIdRequestSchema,
  lanShareTransferJobIdRequestSchema,
  ndxError,
  setLanSharePeerTrustRequestSchema,
  setLanShareGroupCodeRequestSchema,
  updateLanShareSettingsRequestSchema,
  type LanShareHealth,
  type LanShareIdentity,
  type LanShareNetworkInterface,
  type LanSharePeer,
  type LanShareServiceStatus,
  type LanShareSettings,
  type LanShareTransferJob,
  type NdxResult
} from '@shared/contracts'
import type { LanShareGroupCodeStore } from '../../core/lanShare/LanShareGroupCodeStore'
import type { LanShareIdentityStore } from '../../core/lanShare/LanShareIdentityStore'
import type { LanShareInterfaceManager } from '../../core/lanShare/LanShareInterfaceManager'
import type { LanSharePeerStore } from '../../core/lanShare/LanSharePeerStore'
import type { LanShareService } from '../../core/lanShare/LanShareService'
import {
  InvalidLanShareSettingsError,
  type LanShareSettingsStore
} from '../../core/lanShare/LanShareSettingsStore'
import type { LanShareTransferStore } from '../../core/lanShare/LanShareTransferStore'

/**
 * Phase LAN-1 IPC surface — identity, settings, manual peer/trust CRUD,
 * and transfer job listing only. Discovery, send/receive, firewall, and
 * diagnostics channels are deliberately not registered here: there is no
 * real engine behind them yet (those land in LAN-3 through LAN-9), and
 * registering a handler that returns fabricated success would violate
 * this project's no-mock-production-behavior rule. The renderer must not
 * call a `lanShare.*` channel that isn't listed in this file.
 */
export function registerLanShareHandlers(
  identityStore: LanShareIdentityStore,
  settingsStore: LanShareSettingsStore,
  peerStore: LanSharePeerStore,
  transferStore: LanShareTransferStore,
  service: LanShareService,
  interfaceManager: LanShareInterfaceManager,
  groupCodeStore: LanShareGroupCodeStore,
  getWindow: () => BrowserWindow | null
): () => void {
  const unsubscribeTransfers = transferStore.onChange((jobs) => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.lanShareTransferUpdate, jobs)
    }
  })
  const unsubscribeService = service.onChange((status) => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.lanShareServiceUpdate, status)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.lanShareIdentityGet,
    async (): Promise<NdxResult<LanShareIdentity>> => {
      return { ok: true, data: await identityStore.get() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareServiceStatus,
    async (): Promise<NdxResult<LanShareServiceStatus>> => {
      return { ok: true, data: service.getStatus() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareServiceStart,
    async (): Promise<NdxResult<LanShareServiceStatus>> => {
      return { ok: true, data: await service.start() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareServiceStop,
    async (): Promise<NdxResult<LanShareServiceStatus>> => {
      return { ok: true, data: await service.stop() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareInterfaceList,
    async (): Promise<NdxResult<LanShareNetworkInterface[]>> => {
      return { ok: true, data: interfaceManager.list() }
    }
  )

  ipcMain.handle(IPC_CHANNELS.lanShareHealthGet, async (): Promise<NdxResult<LanShareHealth>> => {
    return { ok: true, data: await service.getHealth() }
  })

  ipcMain.handle(
    IPC_CHANNELS.lanShareSettingsGet,
    async (): Promise<NdxResult<LanShareSettings>> => {
      return { ok: true, data: await settingsStore.get() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareSettingsUpdate,
    async (_event, payload: unknown): Promise<NdxResult<LanShareSettings>> => {
      const parsed = updateLanShareSettingsRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That settings update is invalid.')
        }
      }
      try {
        return { ok: true, data: await settingsStore.update(parsed.data) }
      } catch (error) {
        if (error instanceof InvalidLanShareSettingsError) {
          return { ok: false, error: ndxError('validation', 'invalid-settings', error.message) }
        }
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareSettingsSetGroupCode,
    async (_event, payload: unknown): Promise<NdxResult<LanShareSettings>> => {
      const parsed = setLanShareGroupCodeRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That group code does not meet the 8-32 character requirement.'
          )
        }
      }
      await groupCodeStore.set(parsed.data.groupCode)
      return { ok: true, data: await settingsStore.markGroupCodeConfigured(true) }
    }
  )

  ipcMain.handle(IPC_CHANNELS.lanSharePeerList, async (): Promise<NdxResult<LanSharePeer[]>> => {
    return { ok: true, data: await peerStore.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.lanSharePeerAddManual,
    async (_event, payload: unknown): Promise<NdxResult<LanSharePeer>> => {
      const parsed = addManualLanSharePeerRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That address is invalid.')
        }
      }
      const peer = await peerStore.addManual(parsed.data)
      await service.probeManualPeer(
        parsed.data.address,
        parsed.data.transferPort,
        parsed.data.authPort
      )
      return { ok: true, data: (await peerStore.get(peer.id)) ?? peer }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanSharePeerRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = lanSharePeerIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That peer id is invalid.')
        }
      }
      await peerStore.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanSharePeerSetTrust,
    async (_event, payload: unknown): Promise<NdxResult<LanSharePeer>> => {
      const parsed = setLanSharePeerTrustRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      const updated = await peerStore.setTrust(parsed.data.id, parsed.data.trustState)
      if (!updated) {
        return {
          ok: false,
          error: ndxError('not-found', 'peer-not-found', 'That peer no longer exists.')
        }
      }
      return { ok: true, data: updated }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareTransferList,
    async (): Promise<NdxResult<LanShareTransferJob[]>> => {
      return { ok: true, data: await transferStore.list() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.lanShareTransferCancel,
    async (_event, payload: unknown): Promise<NdxResult<boolean>> => {
      const parsed = lanShareTransferJobIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That job id is invalid.')
        }
      }
      return { ok: true, data: await transferStore.cancel(parsed.data.id) }
    }
  )

  return () => {
    unsubscribeTransfers()
    unsubscribeService()
  }
}
