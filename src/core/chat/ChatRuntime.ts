import { randomUUID } from 'node:crypto'
import type { Conversation, ConversationMessage } from '@shared/contracts/conversation'
import type {
  ModelCompletionRequest,
  ModelCompletionResult,
  ModelMessage
} from '@shared/contracts/model'
import type { ConversationStore } from './ConversationStore'

export interface ChatModelPort {
  complete(request: ModelCompletionRequest, signal?: AbortSignal): Promise<ModelCompletionResult>
}

const SYSTEM_PROMPT = [
  'You are the NeuroDeck AI assistant, a conversational chat surface.',
  'You cannot execute tools, run commands, edit files, or take any action from this chat — you can only reply with text.',
  'If the user wants something done in their workspace, tell them to use the AI Command Canvas, which routes real actions through a reviewed plan and approval step.',
  'Be concise and helpful.'
].join('\n')

/**
 * Real multi-turn AI Chat orchestration (Phase 3), deliberately separate
 * from `AgentRuntime`: a conversation is plain back-and-forth dialogue with
 * no tool-call loop, no state machine, and no execution — the model port
 * (`ModelRouter` in production) is called once per turn with the full
 * message history, exactly like `AgentRuntime` calls it once per run,
 * following the same `{complete(request, signal?)}` injection shape so
 * both are equally easy to test with a fake model port.
 */
export class ChatRuntime {
  constructor(
    private readonly store: ConversationStore,
    private readonly model: ChatModelPort
  ) {}

  async sendMessage(
    workspaceId: string,
    conversationId: string,
    content: string,
    signal?: AbortSignal
  ): Promise<Conversation> {
    const conversation = await this.store.get(workspaceId, conversationId)
    if (!conversation) throw new Error('Conversation not found.')

    const userMessage: ConversationMessage = {
      id: randomUUID(),
      role: 'user',
      content,
      createdAt: Date.now()
    }

    const history: ModelMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation.messages.map((message): ModelMessage => ({
        role: message.role,
        content: message.content
      })),
      { role: 'user', content }
    ]

    try {
      const completion = await this.model.complete(
        {
          profileId: conversation.profileId,
          workspacePrivate: conversation.profileId === 'private-workspace',
          temperature: 0.4,
          maxTokens: 2048,
          messages: history
        },
        signal
      )
      const assistantMessage: ConversationMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: completion.content,
        createdAt: Date.now(),
        providerId: completion.providerId,
        modelId: completion.modelId
      }
      return this.store.appendMessages(workspaceId, conversationId, [userMessage, assistantMessage])
    } catch (error) {
      const failedMessage: ConversationMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        error: error instanceof Error ? error.message : 'The model call failed.'
      }
      return this.store.appendMessages(workspaceId, conversationId, [userMessage, failedMessage])
    }
  }
}
