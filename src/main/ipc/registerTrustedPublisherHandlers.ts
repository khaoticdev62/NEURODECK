import { ipcMain } from 'electron'
import {
  addTrustedPublisherRequestSchema,
  IPC_CHANNELS,
  ndxError,
  trustedPublisherFingerprintRequestSchema,
  type NdxResult,
  type TrustedPublisherRecord
} from '@shared/contracts'
import type { TrustedPublisherStore } from '../../core/extensions/TrustedPublisherStore'

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That trusted publisher request is invalid.')
  }
}

/** Real Epic X15 trusted-publisher keystore IPC — see `TrustedPublisherStore` for the security rationale. */
export function registerTrustedPublisherHandlers(store: TrustedPublisherStore): void {
  ipcMain.handle(
    IPC_CHANNELS.trustedPublisherList,
    async (): Promise<NdxResult<TrustedPublisherRecord[]>> => {
      return { ok: true, data: await store.list() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.trustedPublisherAdd,
    async (_event, payload: unknown): Promise<NdxResult<TrustedPublisherRecord>> => {
      const parsed = addTrustedPublisherRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return {
          ok: true,
          data: await store.add(parsed.data.publicKeyPem, parsed.data.publisherName)
        }
      } catch (error) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'add-failed',
            error instanceof Error ? error.message : 'Could not add that trusted publisher.'
          )
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.trustedPublisherRevoke,
    async (_event, payload: unknown): Promise<NdxResult<TrustedPublisherRecord>> => {
      const parsed = trustedPublisherFingerprintRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.setRevoked(parsed.data.fingerprint, true) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.trustedPublisherUnrevoke,
    async (_event, payload: unknown): Promise<NdxResult<TrustedPublisherRecord>> => {
      const parsed = trustedPublisherFingerprintRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.setRevoked(parsed.data.fingerprint, false) }
    }
  )
}
