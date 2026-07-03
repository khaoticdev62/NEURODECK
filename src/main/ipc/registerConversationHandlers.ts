import { ipcMain } from 'electron'
import {
  conversationIdRequestSchema,
  createConversationRequestSchema,
  listConversationsRequestSchema,
  ndxError,
  sendConversationMessageRequestSchema,
  IPC_CHANNELS,
  type Conversation,
  type NdxResult
} from '@shared/contracts'
import type { ChatRuntime } from '../../core/chat/ChatRuntime'
import type { ConversationStore } from '../../core/chat/ConversationStore'

/** Real Phase 3 AI Chat IPC — a persisted, multi-turn conversation with no tool-call loop, distinct from the agent run IPC in `registerAgentHandlers.ts`. */
export function registerConversationHandlers(store: ConversationStore, runtime: ChatRuntime): void {
  ipcMain.handle(
    IPC_CHANNELS.conversationList,
    async (_event, payload: unknown): Promise<NdxResult<Conversation[]>> => {
      const parsed = listConversationsRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.list(parsed.data.workspaceId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.conversationCreate,
    async (_event, payload: unknown): Promise<NdxResult<Conversation>> => {
      const parsed = createConversationRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await store.create(parsed.data.workspaceId, parsed.data.profileId) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.conversationSendMessage,
    async (_event, payload: unknown): Promise<NdxResult<Conversation>> => {
      const parsed = sendConversationMessageRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return {
          ok: true,
          data: await runtime.sendMessage(
            parsed.data.workspaceId,
            parsed.data.conversationId,
            parsed.data.content
          )
        }
      } catch (error) {
        return { ok: false, error: toConversationError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.conversationRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = conversationIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      await store.remove(parsed.data.workspaceId, parsed.data.conversationId)
      return { ok: true, data: null }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That conversation request is invalid.')
  }
}

function toConversationError(error: unknown): ReturnType<typeof ndxError> {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return ndxError('system', 'conversation-operation-failed', message, { message })
}
