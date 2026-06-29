import type {
  AppendRecordingChunkRequest,
  BeginRecordingRequest,
  BeginRecordingResult,
  NdxResult,
  RecordingIdRequest,
  RecordingRecord,
  RecordingSource
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listRecordingSources(): Promise<NdxResult<RecordingSource[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.listSources()
}

export async function beginRecording(
  request: BeginRecordingRequest
): Promise<NdxResult<BeginRecordingResult>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.begin(request)
}

export async function appendRecordingChunk(
  request: AppendRecordingChunkRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.appendChunk(request)
}

export async function finishRecording(
  request: RecordingIdRequest
): Promise<NdxResult<RecordingRecord>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.finish(request)
}

export async function cancelRecording(request: RecordingIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.cancel(request)
}

export async function listRecordings(): Promise<NdxResult<RecordingRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.list()
}

export async function deleteRecording(request: RecordingIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge?.recording) return bridgeUnavailableError()
  return bridge.recording.remove(request)
}
