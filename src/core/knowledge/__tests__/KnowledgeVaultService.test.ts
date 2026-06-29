import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KnowledgeStore } from '../KnowledgeStore'
import { KnowledgeVaultService } from '../KnowledgeVaultService'

let dir: string
let store: KnowledgeStore
let service: KnowledgeVaultService

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-knowledge-vault-'))
  store = new KnowledgeStore(join(dir, 'knowledge.json'))
  service = new KnowledgeVaultService(store)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('KnowledgeVaultService', () => {
  it('ingests a real markdown file end-to-end: parse -> chunk -> index', async () => {
    const path = join(dir, 'notes.md')
    await writeFile(
      path,
      'NeuroDeck is a controller-native AI operating harness for Steam Deck.',
      'utf-8'
    )

    const source = await service.addSource({ path, privacyLevel: 'workspace' })

    expect(source.ingestionStatus).toBe('indexed')
    expect(source.chunkCount).toBe(1)
    expect(source.contentHash).toHaveLength(64)
  })

  it('refuses to ingest content matching a real secret shape', async () => {
    const path = join(dir, 'secret.md')
    await writeFile(path, 'AKIAABCDEFGHIJKLMNOP is my key', 'utf-8')

    const source = await service.addSource({ path, privacyLevel: 'workspace' })

    expect(source.ingestionStatus).toBe('failed')
    expect(source.failureReason).toMatch(/secret shape/)
    expect(await store.listChunks(source.id)).toEqual([])
  })

  it('indexes a direct markdown note as real knowledge without a source file', async () => {
    const source = await service.addMarkdownNote({
      title: 'Voice note transcript',
      text: 'Meeting note about recovery checkpoints and workspace safety.',
      origin: 'voice-note:note-1',
      privacyLevel: 'workspace'
    })

    expect(source.type).toBe('markdown-note')
    expect(source.ingestionStatus).toBe('indexed')
    expect(source.origin).toBe('voice-note:note-1')

    const results = await service.query('recovery checkpoints', undefined, 10)
    expect(results[0].sourceTitle).toBe('Voice note transcript')
    expect(results[0].stale).toBe(false)
  })

  it('rejects an unsupported file type honestly rather than fabricating a parse', async () => {
    const path = join(dir, 'doc.pdf')
    await writeFile(path, 'fake pdf bytes', 'utf-8')

    await expect(service.addSource({ path, privacyLevel: 'workspace' })).rejects.toThrow(
      /Unsupported source type/
    )
  })

  it('records a real failure when the source file does not exist', async () => {
    const source = await service.addSource({
      path: join(dir, 'missing.md'),
      privacyLevel: 'workspace'
    })
    expect(source.ingestionStatus).toBe('failed')
  })

  it('query() returns real, scored, provenance-carrying results from indexed sources', async () => {
    const path = join(dir, 'recovery.md')
    await writeFile(
      path,
      'The recovery service writes a checkpoint before every file write happens.',
      'utf-8'
    )
    await service.addSource({ path, workspaceId: 'w1', privacyLevel: 'workspace' })

    const results = await service.query('recovery checkpoint', 'w1', 10)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].sourceTitle).toBe('recovery.md')
    expect(results[0].stale).toBe(false)
    expect(results[0].retrievedAt).toBeGreaterThan(0)
  })

  it('query() scopes results to the requested workspace only', async () => {
    const pathA = join(dir, 'a.md')
    const pathB = join(dir, 'b.md')
    await writeFile(pathA, 'recovery checkpoint information for workspace A', 'utf-8')
    await writeFile(pathB, 'recovery checkpoint information for workspace B', 'utf-8')
    await service.addSource({ path: pathA, workspaceId: 'w1', privacyLevel: 'workspace' })
    await service.addSource({ path: pathB, workspaceId: 'w2', privacyLevel: 'workspace' })

    const results = await service.query('recovery checkpoint', 'w1', 10)

    expect(results.every((result) => result.sourceTitle === 'a.md')).toBe(true)
  })

  it('query() reports a real stale flag when the file changed after indexing', async () => {
    const path = join(dir, 'changing.md')
    await writeFile(path, 'recovery checkpoint original content', 'utf-8')
    await service.addSource({ path, privacyLevel: 'workspace' })

    await writeFile(path, 'recovery checkpoint changed content now', 'utf-8')

    const results = await service.query('recovery checkpoint', undefined, 10)
    expect(results[0].stale).toBe(true)
  })

  it('reindex() re-parses the real current file content under the same source id', async () => {
    const path = join(dir, 'doc.md')
    await writeFile(path, 'first version of the document', 'utf-8')
    const original = await service.addSource({ path, privacyLevel: 'workspace' })

    await writeFile(path, 'second version of the document, now longer than before', 'utf-8')
    const reindexed = await service.reindex(original.id)

    expect(reindexed.id).toBe(original.id)
    expect(reindexed.contentHash).not.toBe(original.contentHash)
  })

  it('setPaused() really stops a source from being treated as indexed for queries', async () => {
    const path = join(dir, 'doc.md')
    await writeFile(path, 'recovery checkpoint content', 'utf-8')
    const source = await service.addSource({ path, privacyLevel: 'workspace' })

    await service.setPaused(source.id, true)
    const results = await service.query('recovery checkpoint', undefined, 10)

    expect(results).toEqual([])
  })

  it('removeSource() deletes the source and its chunks so it can never be retrieved again', async () => {
    const path = join(dir, 'doc.md')
    await writeFile(path, 'recovery checkpoint content', 'utf-8')
    const source = await service.addSource({ path, privacyLevel: 'workspace' })

    await service.removeSource(source.id)

    expect(await store.getSource(source.id)).toBeUndefined()
    expect(await service.query('recovery checkpoint', undefined, 10)).toEqual([])
  })
})
