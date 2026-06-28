import { ipcMain } from 'electron'
import {
  clearDataCategoryRequestSchema,
  IPC_CHANNELS,
  ndxError,
  type ClearDataCategoryResult,
  type DataMapEntry,
  type NdxResult
} from '@shared/contracts'
import {
  DataCategoryNotClearableError,
  type PrivacyDataMapService
} from '../../core/privacy/PrivacyDataMapService'

/** Real Epic X12 Data Lifecycle and Privacy Map IPC — see `PrivacyDataMapService` for the real store-backed data behind it. */
export function registerPrivacyHandlers(service: PrivacyDataMapService): void {
  ipcMain.handle(IPC_CHANNELS.privacyDataMapGet, async (): Promise<NdxResult<DataMapEntry[]>> => {
    return { ok: true, data: await service.getDataMap() }
  })

  ipcMain.handle(
    IPC_CHANNELS.privacyDataCategoryClear,
    async (_event, payload: unknown): Promise<NdxResult<ClearDataCategoryResult>> => {
      const parsed = clearDataCategoryRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That privacy request is invalid.')
        }
      }
      try {
        return { ok: true, data: await service.clearCategory(parsed.data.id) }
      } catch (error) {
        if (error instanceof DataCategoryNotClearableError) {
          return {
            ok: false,
            error: ndxError('validation', 'category-not-clearable', error.message)
          }
        }
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          ok: false,
          error: ndxError('system', 'privacy-operation-failed', message, { message })
        }
      }
    }
  )
}
