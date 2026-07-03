import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { Conversation, ConversationMessage } from '@shared/contracts/conversation'
import type { RoutingProfileId } from '@shared/contracts/model'
import { JsonStore } from '../persistence/JsonStore'

interface ConversationIndex {
  conversations: Conversation[]
}

const MAX_CONVERSATIONS_PER_WORKSPACE = 200
const DEFAULT_TITLE = 'New conversation'

/** Real, persisted Phase 3 AI Chat conversations — one JSON file per workspace, mirroring `WorkflowRunStore`'s layout exactly rather than inventing a new persistence shape. */
export class ConversationStore {
  constructor(private baseDir: string) {}

  private store(workspaceId: string): JsonStore<ConversationIndex> {
    return new JsonStore<ConversationIndex>(join(this.baseDir, workspaceId, 'conversations.json'), {
      conversations: []
    })
  }

  async list(workspaceId: string): Promise<Conversation[]> {
    return (await this.store(workspaceId).read()).conversations
  }

  async get(workspaceId: string, conversationId: string): Promise<Conversation | undefined> {
    return (await this.list(workspaceId)).find((conversation) => conversation.id === conversationId)
  }

  async create(workspaceId: string, profileId: RoutingProfileId): Promise<Conversation> {
    const now = Date.now()
    const conversation: Conversation = {
      id: randomUUID(),
      workspaceId,
      title: DEFAULT_TITLE,
      profileId,
      messages: [],
      createdAt: now,
      updatedAt: now
    }
    const store = this.store(workspaceId)
    const index = await store.read()
    const conversations = [conversation, ...index.conversations].slice(
      0,
      MAX_CONVERSATIONS_PER_WORKSPACE
    )
    await store.write({ conversations })
    return conversation
  }

  /** Appends one or more messages (a user turn, then its real assistant reply once the model call resolves) and derives a title from the first user message if the conversation is still untitled. */
  async appendMessages(
    workspaceId: string,
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<Conversation> {
    const store = this.store(workspaceId)
    const index = await store.read()
    const existing = index.conversations.find((conversation) => conversation.id === conversationId)
    if (!existing) throw new Error('Conversation not found.')

    const firstUserMessage = messages.find((message) => message.role === 'user')
    const updated: Conversation = {
      ...existing,
      messages: [...existing.messages, ...messages],
      title:
        existing.title === DEFAULT_TITLE && firstUserMessage
          ? deriveTitle(firstUserMessage.content)
          : existing.title,
      updatedAt: Date.now()
    }
    await store.write({
      conversations: index.conversations.map((conversation) =>
        conversation.id === conversationId ? updated : conversation
      )
    })
    return updated
  }

  async remove(workspaceId: string, conversationId: string): Promise<void> {
    const store = this.store(workspaceId)
    const index = await store.read()
    await store.write({
      conversations: index.conversations.filter(
        (conversation) => conversation.id !== conversationId
      )
    })
  }
}

function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (!trimmed) return DEFAULT_TITLE
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
}
