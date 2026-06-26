import { randomUUID } from 'node:crypto'
import type {
  MemoryItem,
  MemoryQueryRequest,
  MemoryType,
  UpdateMemoryRequest,
  WriteMemoryRequest
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'
import { detectSecret } from './secretDetector'

interface MemoryIndex {
  items: MemoryItem[]
  disabledTypes: MemoryType[]
  allDisabled: boolean
}

export class MemorySecretRejectedError extends Error {
  constructor(label: string) {
    super(`Refusing to store this memory — content matches a real secret shape (${label}).`)
  }
}

export class MemoryDisabledError extends Error {
  constructor(message: string) {
    super(message)
  }
}

/**
 * Real Epic X4 Scoped AI Memory store (supplemental spec §13). Every
 * write is checked against `detectSecret()` before it ever reaches
 * disk (§13.4) — there is no path that bypasses this, including writes
 * `attributedTo: 'agent'`. `allDisabled`/`disabledTypes` are checked
 * before every write too, so "Disable category"/"Disable all" (§13.3)
 * actually stops new memories from being written, not just hides them
 * from a UI list.
 */
export class MemoryStore {
  private readonly store: JsonStore<MemoryIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<MemoryIndex>(filePath, {
      items: [],
      disabledTypes: [],
      allDisabled: false
    })
  }

  async list(query: MemoryQueryRequest = {}): Promise<MemoryItem[]> {
    const index = await this.store.read()
    return index.items.filter((item) => {
      if (query.scope && item.scope !== query.scope) return false
      if (query.workspaceId && item.workspaceId !== query.workspaceId) return false
      if (query.search && !item.content.toLowerCase().includes(query.search.toLowerCase())) {
        return false
      }
      return true
    })
  }

  async write(request: WriteMemoryRequest): Promise<MemoryItem> {
    const detection = detectSecret(request.content)
    if (detection.detected) throw new MemorySecretRejectedError(detection.label ?? 'unknown')

    const index = await this.store.read()
    if (index.allDisabled) {
      throw new MemoryDisabledError('All memory writes are currently disabled.')
    }
    if (index.disabledTypes.includes(request.type)) {
      throw new MemoryDisabledError(
        `Memory writes for type "${request.type}" are currently disabled.`
      )
    }

    const now = Date.now()
    const item: MemoryItem = { id: randomUUID(), ...request, createdAt: now, updatedAt: now }
    await this.store.write({ ...index, items: [...index.items, item] })
    return item
  }

  async update(request: UpdateMemoryRequest): Promise<MemoryItem | undefined> {
    if (request.content) {
      const detection = detectSecret(request.content)
      if (detection.detected) throw new MemorySecretRejectedError(detection.label ?? 'unknown')
    }
    const index = await this.store.read()
    const existing = index.items.find((item) => item.id === request.id)
    if (!existing) return undefined
    const updated: MemoryItem = {
      ...existing,
      content: request.content ?? existing.content,
      scope: request.scope ?? existing.scope,
      pinned: request.pinned ?? existing.pinned,
      expiresAt: request.expiresAt ?? existing.expiresAt,
      updatedAt: Date.now()
    }
    await this.store.write({
      ...index,
      items: index.items.map((item) => (item.id === request.id ? updated : item))
    })
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.items.filter((item) => item.id !== id)
    if (next.length === index.items.length) return false
    await this.store.write({ ...index, items: next })
    return true
  }

  async setDisabled(type: MemoryType | undefined, disabled: boolean): Promise<void> {
    const index = await this.store.read()
    if (!type) {
      await this.store.write({ ...index, allDisabled: disabled })
      return
    }
    const disabledTypes = disabled
      ? Array.from(new Set([...index.disabledTypes, type]))
      : index.disabledTypes.filter((candidate) => candidate !== type)
    await this.store.write({ ...index, disabledTypes })
  }

  /** Real "Clear conversation memory"/"Clear global memory" (§13.3) — removes every item in a scope, not a soft hide. */
  async clearScope(scope: MemoryItem['scope'], workspaceId?: string): Promise<number> {
    const index = await this.store.read()
    const next = index.items.filter(
      (item) => !(item.scope === scope && (!workspaceId || item.workspaceId === workspaceId))
    )
    const removed = index.items.length - next.length
    await this.store.write({ ...index, items: next })
    return removed
  }
}
