import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  setNotificationPolicyRequestSchema,
  type NdxResult,
  type NotificationPolicy
} from '@shared/contracts'
import type { NotificationPolicyStore } from '../../core/notifications/NotificationPolicyStore'

/** Real Epic X14 Notification Policy IPC — see `NotificationPolicyStore` for the persisted scope. */
export function registerNotificationPolicyHandlers(store: NotificationPolicyStore): void {
  ipcMain.handle(
    IPC_CHANNELS.notificationPolicyGet,
    async (): Promise<NdxResult<NotificationPolicy>> => {
      return { ok: true, data: await store.get() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.notificationPolicySet,
    async (_event, payload: unknown): Promise<NdxResult<NotificationPolicy>> => {
      const parsed = setNotificationPolicyRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That notification policy request is invalid.'
          )
        }
      }
      return { ok: true, data: await store.set(parsed.data) }
    }
  )
}
