import { ipcMain, type BrowserWindow } from 'electron'
import {
  addManualPeerRequestSchema,
  IPC_CHANNELS,
  ndxError,
  peerIdRequestSchema,
  sendFileToPeerRequestSchema,
  setPeerTrustRequestSchema,
  transferJobIdRequestSchema,
  type NdxResult,
  type PeerDevice,
  type TransferJob
} from '@shared/contracts'
import type { PeerStore } from '../../core/lan/PeerStore'
import type { PeerTransferService } from '../../core/lan/PeerTransferService'
import type { TransferManager } from '../../core/transfer/TransferManager'

/**
 * Real Epic X6 LAN discovery/peer transfer + Transfer Center IPC
 * (supplemental §18/§19). Every transfer-affecting call pushes the
 * real, current job/peer lists to the renderer over
 * `transferJob.update`/`peer.update` — the same live-push pattern
 * already used everywhere else in this codebase — so a future
 * Transfer Center / Nearby Devices screen sees real progress without
 * polling.
 */
export function registerLanHandlers(
  peerStore: PeerStore,
  transferService: PeerTransferService,
  transferManager: TransferManager,
  getWindow: () => BrowserWindow | null
): () => void {
  const unsubscribe = transferManager.onChange(() => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.transferJobUpdate, transferManager.list())
    }
  })

  ipcMain.handle(IPC_CHANNELS.peerList, async (): Promise<NdxResult<PeerDevice[]>> => {
    return { ok: true, data: await peerStore.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.peerAddManual,
    async (_event, payload: unknown): Promise<NdxResult<PeerDevice>> => {
      const parsed = addManualPeerRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That address is invalid.')
        }
      }
      const id = `${parsed.data.address}:${parsed.data.port}`
      const peer = await peerStore.upsertSeen({
        id,
        friendlyName: id,
        address: parsed.data.address,
        port: parsed.data.port,
        fingerprint: 'unknown-until-first-contact',
        online: 'offline',
        lastSeenAt: Date.now()
      })
      return { ok: true, data: peer }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.peerRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = peerIdRequestSchema.safeParse(payload)
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
    IPC_CHANNELS.peerSetTrust,
    async (_event, payload: unknown): Promise<NdxResult<PeerDevice>> => {
      const parsed = setPeerTrustRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That request is invalid.')
        }
      }
      const updated = await peerStore.setTrust(parsed.data.id, parsed.data.trust)
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
    IPC_CHANNELS.peerSendFile,
    async (_event, payload: unknown): Promise<NdxResult<TransferJob>> => {
      const parsed = sendFileToPeerRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That transfer request is invalid.')
        }
      }
      const peer = await peerStore.get(parsed.data.peerId)
      if (!peer) {
        return {
          ok: false,
          error: ndxError('not-found', 'peer-not-found', 'That peer is not known.')
        }
      }
      if (peer.trust === 'blocked') {
        return {
          ok: false,
          error: ndxError('permission', 'peer-blocked', 'This peer is on the block list.')
        }
      }

      const job = transferManager.create({
        kind: 'lan-transfer',
        source: { label: 'This device', reference: parsed.data.filePath },
        destination: { label: peer.friendlyName, reference: peer.id },
        displayName: parsed.data.filePath.split(/[\\/]/).pop() ?? parsed.data.filePath,
        resumable: false
      })
      transferManager.start(job.id)

      try {
        const result = await transferService.sendFile(
          peer.address,
          peer.port,
          parsed.data.filePath,
          parsed.data.pairingCode
        )
        transferManager.progress(job.id, result.sizeBytes)
        transferManager.succeed(job.id, result.sha256)
      } catch (error) {
        transferManager.fail(job.id, error instanceof Error ? error.message : String(error))
      }

      return { ok: true, data: transferManager.get(job.id) ?? job }
    }
  )

  ipcMain.handle(IPC_CHANNELS.transferJobList, async (): Promise<NdxResult<TransferJob[]>> => {
    return { ok: true, data: transferManager.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.transferJobCancel,
    async (_event, payload: unknown): Promise<NdxResult<boolean>> => {
      const parsed = transferJobIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That job id is invalid.')
        }
      }
      return { ok: true, data: transferManager.cancel(parsed.data.id) }
    }
  )

  return unsubscribe
}
