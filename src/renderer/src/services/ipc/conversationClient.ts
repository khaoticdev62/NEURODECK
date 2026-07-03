import type {
  Conversation,
  ConversationIdRequest,
  CreateConversationRequest,
  ListConversationsRequest,
  NdxResult,
  SendConversationMessageRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listConversations(
  request: ListConversationsRequest
): Promise<NdxResult<Conversation[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.conversations.list(request)
}

export async function createConversation(
  request: CreateConversationRequest
): Promise<NdxResult<Conversation>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.conversations.create(request)
}

export async function sendConversationMessage(
  request: SendConversationMessageRequest
): Promise<NdxResult<Conversation>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.conversations.sendMessage(request)
}

export async function removeConversation(request: ConversationIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.conversations.remove(request)
}
