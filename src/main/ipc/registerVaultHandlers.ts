import { ipcMain } from 'electron'
import {
  createVaultItemRequestSchema,
  IPC_CHANNELS,
  ndxError,
  revealVaultItemResultSchema,
  rotateVaultItemRequestSchema,
  updateVaultItemRequestSchema,
  vaultItemIdRequestSchema,
  type NdxResult,
  type VaultAccessLogEntry,
  type VaultItem
} from '@shared/contracts'
import { VaultItemNotFoundError, type VaultStore } from '../../core/vault/VaultStore'

/** Real Epic X10 Secrets Vault IPC — see `VaultStore` for the encryption/access-audit model this wraps. */
export function registerVaultHandlers(store: VaultStore): void {
  ipcMain.handle(IPC_CHANNELS.vaultList, async (): Promise<NdxResult<VaultItem[]>> => {
    return { ok: true, data: await store.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.vaultCreate,
    async (_event, payload: unknown): Promise<NdxResult<VaultItem>> => {
      const parsed = createVaultItemRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.create(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.vaultUpdate,
    async (_event, payload: unknown): Promise<NdxResult<VaultItem>> => {
      const parsed = updateVaultItemRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.update(parsed.data.id, parsed.data) }
      } catch (error) {
        return { ok: false, error: toVaultError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.vaultRotate,
    async (_event, payload: unknown): Promise<NdxResult<VaultItem>> => {
      const parsed = rotateVaultItemRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.rotate(parsed.data.id, parsed.data.newSecret) }
      } catch (error) {
        return { ok: false, error: toVaultError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.vaultReveal,
    async (
      _event,
      payload: unknown
    ): Promise<NdxResult<ReturnType<typeof revealVaultItemResultSchema.parse>>> => {
      const parsed = vaultItemIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        const secret = await store.reveal(parsed.data.id)
        return { ok: true, data: { secret } }
      } catch (error) {
        return { ok: false, error: toVaultError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.vaultDelete,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = vaultItemIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        await store.delete(parsed.data.id)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toVaultError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.vaultAccessLog,
    async (): Promise<NdxResult<VaultAccessLogEntry[]>> => {
      return { ok: true, data: await store.listAccessLog() }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That vault request is invalid.')
  }
}

function toVaultError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof VaultItemNotFoundError) {
    return ndxError('not-found', 'vault-item-not-found', error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'vault-operation-failed', message, { message })
}
