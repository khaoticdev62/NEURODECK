import type {
  NdxResult,
  RenderedSnippet,
  RenderSnippetRequest,
  Snippet,
  SnippetIdRequest,
  UpsertSnippetRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listSnippets(): Promise<NdxResult<Snippet[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.snippets.list()
}

export async function upsertSnippet(request: UpsertSnippetRequest): Promise<NdxResult<Snippet>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.snippets.upsert(request)
}

export async function removeSnippet(request: SnippetIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.snippets.remove(request)
}

export async function renderSnippet(
  request: RenderSnippetRequest
): Promise<NdxResult<RenderedSnippet>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.snippets.render(request)
}
