import { ipcMain, type BrowserWindow } from 'electron'
import {
  flatpakRefRequestSchema,
  flatpakSearchRequestSchema,
  IPC_CHANNELS,
  ndxError,
  transactionIdRequestSchema,
  type FlatpakPermissionPreview,
  type FlatpakRemoteApp,
  type NdxResult,
  type TransactionRecord
} from '@shared/contracts'
import type { FlatpakAdapter } from '../../core/applications/FlatpakAdapter'
import type { PackageLifecycleService } from '../../core/applications/PackageLifecycleService'
import type { TransactionManager } from '../../core/transactions/TransactionManager'

/**
 * Real Epic X2 package lifecycle IPC (supplemental spec §7). Every
 * transaction-affecting handler pushes the real, current
 * `TransactionManager` list to the renderer over `package.transactionUpdate`
 * — the same live-push pattern terminal data/exit events and agent run
 * updates already use — so a future Activity/Package Center screen can
 * show real, live progress rather than polling.
 */
export function registerPackageHandlers(
  flatpak: FlatpakAdapter,
  lifecycle: PackageLifecycleService,
  transactions: TransactionManager,
  getWindow: () => BrowserWindow | null
): () => void {
  const unsubscribe = transactions.onChange(() => {
    const window = getWindow()
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.packageTransactionUpdate, transactions.list())
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.packageFlatpakSearch,
    async (_event, payload: unknown): Promise<NdxResult<FlatpakRemoteApp[]>> => {
      const parsed = flatpakSearchRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'A search query is required.')
        }
      }
      return { ok: true, data: await flatpak.search(parsed.data.query) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.packageFlatpakPermissions,
    async (_event, payload: unknown): Promise<NdxResult<FlatpakPermissionPreview>> => {
      const parsed = flatpakRefRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That ref is invalid.')
        }
      }
      const permissions = await flatpak.previewPermissions(parsed.data.ref)
      return { ok: true, data: { ref: parsed.data.ref, permissions } }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.packageFlatpakInstall,
    async (_event, payload: unknown): Promise<NdxResult<TransactionRecord>> => {
      const parsed = flatpakRefRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That ref is invalid.')
        }
      }
      return { ok: true, data: await lifecycle.install(parsed.data.ref) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.packageFlatpakUpdate,
    async (_event, payload: unknown): Promise<NdxResult<TransactionRecord>> => {
      const parsed = flatpakRefRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That ref is invalid.')
        }
      }
      return { ok: true, data: await lifecycle.update(parsed.data.ref) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.packageFlatpakUninstall,
    async (_event, payload: unknown): Promise<NdxResult<TransactionRecord>> => {
      const parsed = flatpakRefRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That ref is invalid.')
        }
      }
      return { ok: true, data: await lifecycle.uninstall(parsed.data.ref) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.packageTransactionList,
    async (): Promise<NdxResult<TransactionRecord[]>> => {
      return { ok: true, data: transactions.list() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.packageTransactionCancel,
    async (_event, payload: unknown): Promise<NdxResult<boolean>> => {
      const parsed = transactionIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'A transaction id is required.')
        }
      }
      return { ok: true, data: transactions.cancel(parsed.data.id) }
    }
  )

  return unsubscribe
}
