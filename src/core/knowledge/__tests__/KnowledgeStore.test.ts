import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { KnowledgeSource } from '@shared/contracts'
import { KnowledgeStore } from '../KnowledgeStore'

let dir: string
let store: KnowledgeStore

const sample: KnowledgeSource = {
  id: 'source-1',
  type: 'file',
  title: 'notes.md',
  origin: '/tmp/notes.md',
  privacyLevel: 'workspace',
  ingestionStatus: 'indexed',
  parserVersion: '1',
  contentHash: 'abc',
  createdAt: 1,
  updatedAt: 1
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-knowledge-'))
  store = new KnowledgeStore(join(dir, 'knowledge.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('KnowledgeStore', () => {
  it('starts with no sources or chunks', async () => {
    expect(await store.listSources()).toEqual([])
  })

  it('upserts and retrieves a real source', async () => {
    await store.upsertSource(sample)
    expect(await store.getSource('source-1')).toEqual(sample)
  })

  it('replaceChunks() removes the previous chunk set for a source rather than appending', async () => {
    await store.replaceChunks('source-1', [
      { id: 'c1', sourceId: 'source-1', index: 0, text: 'old' }
    ])
    await store.replaceChunks('source-1', [
      { id: 'c2', sourceId: 'source-1', index: 0, text: 'new' }
    ])

    const chunks = await store.listChunks('source-1')
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe('new')
  })

  it('removeSource() deletes both the source and its chunks', async () => {
    await store.upsertSource(sample)
    await store.replaceChunks('source-1', [{ id: 'c1', sourceId: 'source-1', index: 0, text: 'x' }])

    await store.removeSource('source-1')

    expect(await store.getSource('source-1')).toBeUndefined()
    expect(await store.listChunks('source-1')).toEqual([])
  })

  it('keeps chunks from different sources isolated', async () => {
    await store.replaceChunks('source-1', [{ id: 'c1', sourceId: 'source-1', index: 0, text: 'a' }])
    await store.replaceChunks('source-2', [{ id: 'c2', sourceId: 'source-2', index: 0, text: 'b' }])

    expect(await store.listChunks('source-1')).toHaveLength(1)
    expect(await store.listChunks('source-2')).toHaveLength(1)
  })
})
