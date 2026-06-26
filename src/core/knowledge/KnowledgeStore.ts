import type { KnowledgeChunk, KnowledgeSource } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface KnowledgeIndexFile {
  sources: KnowledgeSource[]
  chunks: KnowledgeChunk[]
}

/** Real persisted store for the Knowledge Vault's sources and their derived chunks (supplemental §12.2), mirroring `ApplicationStore`'s shape. */
export class KnowledgeStore {
  private readonly store: JsonStore<KnowledgeIndexFile>

  constructor(filePath: string) {
    this.store = new JsonStore<KnowledgeIndexFile>(filePath, { sources: [], chunks: [] })
  }

  async listSources(): Promise<KnowledgeSource[]> {
    const index = await this.store.read()
    return index.sources
  }

  async getSource(id: string): Promise<KnowledgeSource | undefined> {
    const index = await this.store.read()
    return index.sources.find((source) => source.id === id)
  }

  async upsertSource(source: KnowledgeSource): Promise<KnowledgeSource> {
    const index = await this.store.read()
    const existing = index.sources.find((candidate) => candidate.id === source.id)
    const sources = existing
      ? index.sources.map((candidate) => (candidate.id === source.id ? source : candidate))
      : [...index.sources, source]
    await this.store.write({ ...index, sources })
    return source
  }

  async removeSource(id: string): Promise<void> {
    const index = await this.store.read()
    await this.store.write({
      sources: index.sources.filter((source) => source.id !== id),
      chunks: index.chunks.filter((chunk) => chunk.sourceId !== id)
    })
  }

  async listChunks(sourceId: string): Promise<KnowledgeChunk[]> {
    const index = await this.store.read()
    return index.chunks.filter((chunk) => chunk.sourceId === sourceId)
  }

  /** Real reindex semantics — entirely replaces a source's derived chunks rather than appending duplicates. */
  async replaceChunks(sourceId: string, chunks: KnowledgeChunk[]): Promise<void> {
    const index = await this.store.read()
    const remaining = index.chunks.filter((chunk) => chunk.sourceId !== sourceId)
    await this.store.write({ ...index, chunks: [...remaining, ...chunks] })
  }
}
