import type {
  AddKnowledgeSourceRequest,
  KnowledgeQueryRequest,
  KnowledgeQueryResult,
  KnowledgeSource,
  KnowledgeSourceIdRequest,
  NdxResult,
  SetKnowledgeSourcePausedRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listKnowledgeSources(): Promise<NdxResult<KnowledgeSource[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.knowledge.listSources()
}

export async function addKnowledgeSource(
  request: AddKnowledgeSourceRequest
): Promise<NdxResult<KnowledgeSource>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.knowledge.addSource(request)
}

export async function removeKnowledgeSource(
  request: KnowledgeSourceIdRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.knowledge.removeSource(request)
}

export async function reindexKnowledgeSource(
  request: KnowledgeSourceIdRequest
): Promise<NdxResult<KnowledgeSource>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.knowledge.reindexSource(request)
}

export async function setKnowledgeSourcePaused(
  request: SetKnowledgeSourcePausedRequest
): Promise<NdxResult<KnowledgeSource>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.knowledge.setSourcePaused(request)
}

export async function queryKnowledge(
  request: KnowledgeQueryRequest
): Promise<NdxResult<KnowledgeQueryResult[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.knowledge.query(request)
}
