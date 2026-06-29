import { ipcMain } from 'electron'
import {
  applicationPolicyIdRequestSchema,
  IPC_CHANNELS,
  ndxError,
  setApplicationPolicyRequestSchema,
  type ApplicationPolicy,
  type NdxResult
} from '@shared/contracts'
import type { ApplicationPolicyStore } from '../../core/applications/ApplicationPolicyStore'

/** Real Epic X14 Application Sandbox and Policy IPC — see `ApplicationPolicyStore` for the real persisted scope behind it. */
export function registerApplicationPolicyHandlers(store: ApplicationPolicyStore): void {
  ipcMain.handle(
    IPC_CHANNELS.applicationPolicyGet,
    async (_event, payload: unknown): Promise<NdxResult<ApplicationPolicy | null>> => {
      const parsed = applicationPolicyIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const policy = await store.get(parsed.data.applicationId)
      return { ok: true, data: policy ?? null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationPolicySet,
    async (_event, payload: unknown): Promise<NdxResult<ApplicationPolicy>> => {
      const parsed = setApplicationPolicyRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const policy = await store.set(
        parsed.data.applicationId,
        parsed.data.entries,
        parsed.data.launchEnvironment
      )
      return { ok: true, data: policy }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That application policy request is invalid.')
  }
}
