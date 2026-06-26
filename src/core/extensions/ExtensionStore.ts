import type { ExtensionRecord } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface ExtensionIndex {
  extensions: ExtensionRecord[]
}

/** Real Epic X3 extension registry persistence (supplemental spec §9.5 lifecycle states), mirroring `ApplicationStore`'s shape. */
export class ExtensionStore {
  private readonly store: JsonStore<ExtensionIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<ExtensionIndex>(filePath, { extensions: [] })
  }

  async list(): Promise<ExtensionRecord[]> {
    const index = await this.store.read()
    return index.extensions
  }

  async get(id: string): Promise<ExtensionRecord | undefined> {
    const index = await this.store.read()
    return index.extensions.find((extension) => extension.manifest.id === id)
  }

  async upsert(record: ExtensionRecord): Promise<ExtensionRecord> {
    const index = await this.store.read()
    const existing = index.extensions.find(
      (candidate) => candidate.manifest.id === record.manifest.id
    )
    const next: ExtensionRecord = { ...record, updatedAt: Date.now() }
    const extensions = existing
      ? index.extensions.map((candidate) =>
          candidate.manifest.id === record.manifest.id ? next : candidate
        )
      : [...index.extensions, next]
    await this.store.write({ extensions })
    return next
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.extensions.filter((extension) => extension.manifest.id !== id)
    if (next.length === index.extensions.length) return false
    await this.store.write({ extensions: next })
    return true
  }
}
