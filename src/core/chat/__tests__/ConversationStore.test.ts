import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ConversationMessage } from '@shared/contracts/conversation'
import { ConversationStore } from '../ConversationStore'

let dir: string
let store: ConversationStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-conversations-'))
  store = new ConversationStore(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ConversationStore', () => {
  it('starts empty for a workspace with no conversations', async () => {
    expect(await store.list('workspace-1')).toEqual([])
  })

  it('creates a real, persisted conversation scoped to a workspace', async () => {
    const conversation = await store.create('workspace-1', 'balanced')

    expect(conversation.workspaceId).toBe('workspace-1')
    expect(conversation.profileId).toBe('balanced')
    expect(conversation.title).toBe('New conversation')
    expect(conversation.messages).toEqual([])

    expect(await store.list('workspace-1')).toEqual([conversation])
    expect(await store.list('workspace-2')).toEqual([])
  })

  it('appends messages and derives a title from the first user message', async () => {
    const conversation = await store.create('workspace-1', 'balanced')
    const userMessage: ConversationMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'What does this codebase do, exactly, in a lot of detail so the title truncates?',
      createdAt: 1
    }
    const assistantMessage: ConversationMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: 'It is a controller-native AI harness.',
      createdAt: 2,
      providerId: 'provider-1',
      modelId: 'model-1'
    }

    const result = await store.appendMessages('workspace-1', conversation.id, [
      userMessage,
      assistantMessage
    ])

    expect(result.messages).toEqual([userMessage, assistantMessage])
    expect(result.title).toBe('What does this codebase do, exactly, in a lot of detail s...')
    expect(result.title.length).toBeLessThanOrEqual(60)
  })

  it('does not overwrite a title that was already derived', async () => {
    const conversation = await store.create('workspace-1', 'balanced')
    await store.appendMessages('workspace-1', conversation.id, [
      { id: 'm1', role: 'user', content: 'First message', createdAt: 1 }
    ])
    const second = await store.appendMessages('workspace-1', conversation.id, [
      { id: 'm2', role: 'user', content: 'Second message', createdAt: 2 }
    ])

    expect(second.title).toBe('First message')
  })

  it('removes a conversation', async () => {
    const conversation = await store.create('workspace-1', 'balanced')
    await store.remove('workspace-1', conversation.id)

    expect(await store.list('workspace-1')).toEqual([])
  })

  it('throws when appending to a conversation that does not exist', async () => {
    await expect(
      store.appendMessages('workspace-1', 'missing', [
        { id: 'm1', role: 'user', content: 'hi', createdAt: 1 }
      ])
    ).rejects.toThrow('Conversation not found.')
  })
})
