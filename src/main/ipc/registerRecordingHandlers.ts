import { ipcMain } from 'electron'
import {
  appendRecordingChunkRequestSchema,
  beginRecordingRequestSchema,
  IPC_CHANNELS,
  ndxError,
  recordingIdRequestSchema,
  type BeginRecordingResult,
  type NdxResult,
  type RecordingRecord,
  type RecordingSource
} from '@shared/contracts'
import { RecordingNotFoundError, type RecordingService } from '../recording/RecordingService'

/** Real Epic X14 Recording IPC — see `RecordingService` for the real chunked-write behavior behind it. */
export function registerRecordingHandlers(service: RecordingService): void {
  ipcMain.handle(
    IPC_CHANNELS.recordingListSources,
    async (): Promise<NdxResult<RecordingSource[]>> => {
      try {
        return { ok: true, data: await service.listSources() }
      } catch (error) {
        return { ok: false, error: toRecordingError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recordingBegin,
    async (_event, payload: unknown): Promise<NdxResult<BeginRecordingResult>> => {
      const parsed = beginRecordingRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      const recordingId = await service.begin(parsed.data)
      return { ok: true, data: { recordingId } }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recordingAppendChunk,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = appendRecordingChunkRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        await service.appendChunk(parsed.data.recordingId, parsed.data.chunkBase64)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toRecordingError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recordingFinish,
    async (_event, payload: unknown): Promise<NdxResult<RecordingRecord>> => {
      const parsed = recordingIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await service.finish(parsed.data.recordingId) }
      } catch (error) {
        return { ok: false, error: toRecordingError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.recordingCancel,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = recordingIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        await service.cancel(parsed.data.recordingId)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toRecordingError(error) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.recordingList, async (): Promise<NdxResult<RecordingRecord[]>> => {
    return { ok: true, data: await service.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.recordingDelete,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = recordingIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        await service.delete(parsed.data.recordingId)
        return { ok: true, data: null }
      } catch (error) {
        return { ok: false, error: toRecordingError(error) }
      }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That recording request is invalid.')
  }
}

function toRecordingError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof RecordingNotFoundError) {
    return ndxError('not-found', 'recording-not-found', error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'recording-operation-failed', message, { message })
}
