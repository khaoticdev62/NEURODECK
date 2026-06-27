import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { WriteMemoryRequest } from '@shared/contracts'
import { MemoryDisabledError, MemorySecretRejectedError, MemoryStore } from '../MemoryStore'

let dir: string
let store: MemoryStore

const sample: WriteMemoryRequest = {
  scope: 'workspace',
  type: 'user-preference',
  content: 'Prefers tabs over spaces.',
  attributedTo: 'user',
  workspaceId: 'w1',
  pinned: false
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-memory-'))
  store = new MemoryStore(join(dir, 'memory.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('MemoryStore', () => {
  it('starts with no memory items', async () => {
    expect(await store.list()).toEqual([])
  })

  it('writes and lists a real memory item with real attribution', async () => {
    const item = await store.write(sample)
    expect(item.attributedTo).toBe('user')
    expect(await store.list()).toEqual([item])
  })

  it('refuses to store content matching a real secret shape', async () => {
    await expect(store.write({ ...sample, content: 'AKIAABCDEFGHIJKLMNOP' })).rejects.toThrow(
      MemorySecretRejectedError
    )
    expect(await store.list()).toEqual([])
  })

  it('filters by scope, workspace, and search text', async () => {
    await store.write(sample)
    await store.write({
      ...sample,
      scope: 'global',
      workspaceId: undefined,
      content: 'Likes dark mode.'
    })

    expect(await store.list({ scope: 'global' })).toHaveLength(1)
    expect(await store.list({ workspaceId: 'w1' })).toHaveLength(1)
    expect(await store.list({ search: 'dark' })).toHaveLength(1)
  })

  it('exports a versioned filtered snapshot with real items', async () => {
    await store.write(sample)
    await store.write({
      ...sample,
      scope: 'global',
      workspaceId: undefined,
      content: 'Use concise release notes.'
    })

    const exported = await store.export({ scope: 'workspace', workspaceId: 'w1' })

    expect(exported.schemaVersion).toBe('1.0.0')
    expect(exported.exportedAt).toBeGreaterThan(0)
    expect(exported.query).toEqual({ scope: 'workspace', workspaceId: 'w1' })
    expect(exported.itemCount).toBe(1)
    expect(exported.items[0].content).toBe(sample.content)
  })

  it('update() changes content/scope/pin without touching other fields, and still rejects secrets', async () => {
    const item = await store.write(sample)
    const updated = await store.update({ id: item.id, pinned: true })

    expect(updated?.pinned).toBe(true)
    expect(updated?.content).toBe(sample.content)

    await expect(store.update({ id: item.id, content: 'ghp_' + 'a'.repeat(36) })).rejects.toThrow(
      MemorySecretRejectedError
    )
  })

  it('delete() removes a real item and returns false for an unknown id', async () => {
    const item = await store.write(sample)
    expect(await store.delete(item.id)).toBe(true)
    expect(await store.list()).toEqual([])
    expect(await store.delete('missing')).toBe(false)
  })

  it('setDisabled(type) blocks new writes of that type only', async () => {
    await store.setDisabled('user-preference', true)

    await expect(store.write(sample)).rejects.toThrow(MemoryDisabledError)
    await expect(store.write({ ...sample, type: 'pinned-fact' })).resolves.toBeDefined()
  })

  it('setDisabled(undefined, true) blocks every write ("disable all")', async () => {
    await store.setDisabled(undefined, true)

    await expect(store.write(sample)).rejects.toThrow(MemoryDisabledError)
    await expect(store.write({ ...sample, type: 'pinned-fact' })).rejects.toThrow(
      MemoryDisabledError
    )
  })

  it('clearScope() really deletes every item in a scope, scoped to a workspace when given', async () => {
    await store.write(sample)
    await store.write({ ...sample, workspaceId: 'w2' })
    await store.write({ ...sample, scope: 'global', workspaceId: undefined })

    const removed = await store.clearScope('workspace', 'w1')

    expect(removed).toBe(1)
    const remaining = await store.list()
    expect(remaining).toHaveLength(2)
    expect(remaining.some((item) => item.workspaceId === 'w1')).toBe(false)
  })
})
