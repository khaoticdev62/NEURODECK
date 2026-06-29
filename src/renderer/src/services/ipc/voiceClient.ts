import type {
  AddVoiceNoteToKnowledgeRequest,
  DocumentIntakeRequest,
  DocumentIntakeResult,
  KnowledgeSource,
  MicrophonePermissionStatus,
  NdxResult,
  SaveVoiceNoteRequest,
  SetMicrophonePermissionRequest,
  VoiceNote,
  VoiceNoteIdRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function getMicrophoneStatus(): Promise<NdxResult<MicrophonePermissionStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.getMicrophoneStatus()
}

export async function setMicrophoneGranted(
  request: SetMicrophonePermissionRequest
): Promise<NdxResult<MicrophonePermissionStatus>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.setMicrophoneGranted(request)
}

export async function listVoiceNotes(): Promise<NdxResult<VoiceNote[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.listVoiceNotes()
}

export async function saveVoiceNote(request: SaveVoiceNoteRequest): Promise<NdxResult<VoiceNote>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.saveVoiceNote(request)
}

export async function removeVoiceNote(request: VoiceNoteIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.removeVoiceNote(request)
}

export async function deleteVoiceNoteAudio(
  request: VoiceNoteIdRequest
): Promise<NdxResult<VoiceNote>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.deleteVoiceNoteAudio(request)
}

export async function addVoiceNoteToKnowledge(
  request: AddVoiceNoteToKnowledgeRequest
): Promise<NdxResult<KnowledgeSource>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.addVoiceNoteToKnowledge(request)
}

export async function intakeDocument(
  request: DocumentIntakeRequest
): Promise<NdxResult<DocumentIntakeResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.voice.intakeDocument(request)
}
