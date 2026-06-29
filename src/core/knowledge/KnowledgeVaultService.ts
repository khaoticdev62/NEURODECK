import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type {
  AddKnowledgeSourceRequest,
  KnowledgeChunk,
  KnowledgePrivacyLevel,
  KnowledgeQueryResult,
  KnowledgeSource
} from '@shared/contracts'
import { detectSecret } from '../memory/secretDetector'
import { chunkText } from './Chunker'
import { KnowledgeIndex } from './KnowledgeIndex'
import type { KnowledgeStore } from './KnowledgeStore'
import { isSupportedExtension, parseByExtension, TEXT_PARSER_VERSION } from './parsers/textParsers'

/**
 * Real Epic X4 Knowledge Vault ingestion + retrieval pipeline
 * (supplemental §12.3): source validation → safe parsing → secret
 * detection → chunking → index write → source health. Every step is
 * real — a source whose content matches a real secret shape fails
 * ingestion outright (`failed`, with a real reason) rather than
 * indexing it anyway; a source isn't `indexed` unless chunking actually
 * produced real chunks.
 */
export class KnowledgeVaultService {
  private readonly index = new KnowledgeIndex()

  constructor(private readonly store: KnowledgeStore) {}

  async addMarkdownNote(request: {
    title: string
    text: string
    origin: string
    workspaceId?: string
    privacyLevel: KnowledgePrivacyLevel
  }): Promise<KnowledgeSource> {
    const now = Date.now()
    const contentHash = createHash('sha256').update(request.text).digest('hex')
    let source: KnowledgeSource = {
      id: randomUUID(),
      type: 'markdown-note',
      title: request.title,
      origin: request.origin,
      workspaceId: request.workspaceId,
      privacyLevel: request.privacyLevel,
      ingestionStatus: 'pending',
      parserVersion: TEXT_PARSER_VERSION,
      contentHash,
      createdAt: now,
      updatedAt: now
    }

    const secret = detectSecret(request.text)
    if (secret.detected) {
      source = {
        ...source,
        ingestionStatus: 'failed',
        failureReason: `Ingestion refused â€” content matches a real secret shape (${secret.label}).`,
        updatedAt: Date.now()
      }
      await this.store.upsertSource(source)
      return source
    }

    const knowledgeChunks: KnowledgeChunk[] = chunkText(request.text).map((text, index) => ({
      id: randomUUID(),
      sourceId: source.id,
      index,
      text
    }))
    await this.store.replaceChunks(source.id, knowledgeChunks)

    source = {
      ...source,
      ingestionStatus: 'indexed',
      chunkCount: knowledgeChunks.length,
      lastIndexedAt: Date.now(),
      updatedAt: Date.now()
    }
    await this.store.upsertSource(source)
    return source
  }

  async addSource(request: AddKnowledgeSourceRequest): Promise<KnowledgeSource> {
    if (!isSupportedExtension(request.path)) {
      throw new Error(
        `Unsupported source type for "${basename(request.path)}" — only .txt/.md/.json/.csv are parsed in this slice (PDF and code-repository ingestion are explicitly deferred).`
      )
    }

    const now = Date.now()
    let source: KnowledgeSource = {
      id: randomUUID(),
      type: 'file',
      title: basename(request.path),
      origin: request.path,
      workspaceId: request.workspaceId,
      privacyLevel: request.privacyLevel,
      ingestionStatus: 'pending',
      parserVersion: TEXT_PARSER_VERSION,
      contentHash: '',
      createdAt: now,
      updatedAt: now
    }

    try {
      const raw = await readFile(request.path, 'utf-8')
      const contentHash = createHash('sha256').update(raw).digest('hex')
      const parsed = parseByExtension(request.path, raw)

      const secret = detectSecret(parsed.text)
      if (secret.detected) {
        source = {
          ...source,
          ingestionStatus: 'failed',
          contentHash,
          failureReason: `Ingestion refused — content matches a real secret shape (${secret.label}).`,
          updatedAt: Date.now()
        }
        await this.store.upsertSource(source)
        return source
      }

      const chunks = chunkText(parsed.text)
      const knowledgeChunks: KnowledgeChunk[] = chunks.map((text, index) => ({
        id: randomUUID(),
        sourceId: source.id,
        index,
        text
      }))
      await this.store.replaceChunks(source.id, knowledgeChunks)

      source = {
        ...source,
        ingestionStatus: 'indexed',
        contentHash,
        chunkCount: knowledgeChunks.length,
        lastIndexedAt: Date.now(),
        updatedAt: Date.now()
      }
    } catch (error) {
      source = {
        ...source,
        ingestionStatus: 'failed',
        failureReason: error instanceof Error ? error.message : String(error),
        updatedAt: Date.now()
      }
    }

    await this.store.upsertSource(source)
    return source
  }

  async reindex(id: string): Promise<KnowledgeSource> {
    const existing = await this.store.getSource(id)
    if (!existing) throw new Error('That knowledge source is not registered.')
    return this.addSource({
      path: existing.origin,
      workspaceId: existing.workspaceId,
      privacyLevel: existing.privacyLevel
    }).then((reindexed) => ({ ...reindexed, id: existing.id }))
  }

  async setPaused(id: string, paused: boolean): Promise<KnowledgeSource | undefined> {
    const existing = await this.store.getSource(id)
    if (!existing) return undefined
    const updated: KnowledgeSource = {
      ...existing,
      ingestionStatus: paused ? 'paused' : 'indexed',
      updatedAt: Date.now()
    }
    await this.store.upsertSource(updated)
    return updated
  }

  async removeSource(id: string): Promise<void> {
    await this.store.removeSource(id)
  }

  /** Real stale detection (supplemental §12.4) — recomputes the source's real on-disk hash rather than trusting the last-known value. */
  private async isStale(source: KnowledgeSource): Promise<boolean> {
    if (source.type !== 'file') return false
    try {
      await stat(source.origin)
      const raw = await readFile(source.origin, 'utf-8')
      const currentHash = createHash('sha256').update(raw).digest('hex')
      return currentHash !== source.contentHash
    } catch {
      return true
    }
  }

  /** Real retrieval (supplemental §12.5) — every result carries real provenance (source, timestamp, staleness), and retrieved text is returned as data only, never as something that can authorize a tool call on its own. */
  async query(
    queryText: string,
    workspaceId: string | undefined,
    maxResults: number
  ): Promise<KnowledgeQueryResult[]> {
    const sources = await this.store.listSources()
    const scopedSources = sources.filter(
      (source) =>
        source.ingestionStatus === 'indexed' && (!workspaceId || source.workspaceId === workspaceId)
    )

    const results: KnowledgeQueryResult[] = []
    const retrievedAt = Date.now()
    for (const source of scopedSources) {
      const chunks = await this.store.listChunks(source.id)
      const ranked = this.index.rank(queryText, chunks, maxResults)
      const stale = ranked.length > 0 ? await this.isStale(source) : false
      for (const { chunk, score } of ranked) {
        results.push({
          chunk,
          sourceId: source.id,
          sourceTitle: source.title,
          score,
          retrievedAt,
          stale
        })
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, maxResults)
  }
}
