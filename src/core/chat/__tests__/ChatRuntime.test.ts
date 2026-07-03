import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModelCompletionResult } from '@shared/contracts/model'
import { ChatRuntime, type ChatModelPort } from '../ChatRuntime'
import { ConversationStore } from '../ConversationStore'

let dir: string
let store: ConversationStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-chat-runtime-'))
  store = new ConversationStore(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function completion(overrides: Partial<ModelCompletionResult> = {}): ModelCompletionResult {
  return {
    providerId: 'provider-1',
    providerName: 'Local',
    modelId: 'chat-model',
    local: true,
    profileId: 'balanced',
    content: 'I can help with that.',
    usage: { promptTokens: 10, completionTokens: 6, totalTokens: 16 },
    durationMs: 12,
    ...overrides
  }
}

describe('ChatRuntime', () => {
  it('sends the full conversation history plus the new turn to the model, and persists both real messages', async () => {
    const conversation = await store.create('workspace-1', 'balanced')
    await store.appendMessages('workspace-1', conversation.id, [
      { id: 'm1', role: 'user', content: 'Hello', createdAt: 1 },
      { id: 'm2', role: 'assistant', content: 'Hi there.', createdAt: 2 }
    ])

    const complete = vi.fn().mockResolvedValue(completion())
    const runtime = new ChatRuntime(store, { complete })

    const updated = await runtime.sendMessage('workspace-1', conversation.id, 'What can you do?')

    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'balanced',
        messages: [
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there.' },
          { role: 'user', content: 'What can you do?' }
        ]
      }),
      undefined
    )

    expect(updated.messages).toHaveLength(4)
    expect(updated.messages[2]).toMatchObject({ role: 'user', content: 'What can you do?' })
    expect(updated.messages[3]).toMatchObject({
      role: 'assistant',
      content: 'I can help with that.',
      providerId: 'provider-1',
      modelId: 'chat-model'
    })
  })

  it('tells the model it cannot execute tools or take actions', async () => {
    const conversation = await store.create('workspace-1', 'balanced')
    const complete = vi.fn().mockResolvedValue(completion())
    const runtime = new ChatRuntime(store, { complete })

    await runtime.sendMessage('workspace-1', conversation.id, 'Delete my files')

    const systemMessage = complete.mock.calls[0][0].messages[0]
    expect(systemMessage.role).toBe('system')
    expect(systemMessage.content).toContain('cannot execute tools')
  })

  it('records a real error message instead of silently dropping a failed turn', async () => {
    const conversation = await store.create('workspace-1', 'balanced')
    const model: ChatModelPort = {
      complete: vi.fn().mockRejectedValue(new Error('Provider unavailable.'))
    }
    const runtime = new ChatRuntime(store, model)

    const updated = await runtime.sendMessage('workspace-1', conversation.id, 'Hello?')

    expect(updated.messages).toHaveLength(2)
    expect(updated.messages[0]).toMatchObject({ role: 'user', content: 'Hello?' })
    expect(updated.messages[1]).toMatchObject({ role: 'assistant', error: 'Provider unavailable.' })
  })

  it('throws when the conversation does not exist', async () => {
    const runtime = new ChatRuntime(store, { complete: vi.fn() })

    await expect(runtime.sendMessage('workspace-1', 'missing', 'Hello')).rejects.toThrow(
      'Conversation not found.'
    )
  })
})
