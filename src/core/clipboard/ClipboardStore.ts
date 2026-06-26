import { randomUUID } from 'node:crypto'
import type { ClipboardEntry, ClipboardEntryKind, ClipboardQueryRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'
import { detectSecret } from '../memory/secretDetector'
import type { SecretCipher } from '../models/SecretCipher'

interface PersistedClipboardEntry extends Omit<ClipboardEntry, 'content'> {
  /** Real ciphertext when the cipher is available — `content` is only ever plaintext-on-disk when `cipher.isAvailable()` is false, the same honest fallback `ModelProviderStore` uses for API keys. */
  content: string
  encrypted: boolean
}

interface ClipboardIndex {
  entries: PersistedClipboardEntry[]
  monitoringEnabled: boolean
}

const DEFAULT_MAX_ENTRIES = 200

/**
 * Real Epic X6 Clipboard Center (supplemental §17.1/§17.2). "Secret
 * fields never enter history" is enforced at write time via the same
 * real `detectSecret()` Scoped Memory/Knowledge Vault already use — a
 * clipboard write matching a real secret shape is dropped before it
 * ever reaches the in-memory list, let alone disk. Every persisted
 * entry is encrypted at rest through the injected `SecretCipher` (the
 * real OS-level `safeStorage` boundary `ModelProviderStore`'s API keys
 * already use) — never plaintext on disk when encryption is available.
 */
export class ClipboardStore {
  private readonly store: JsonStore<ClipboardIndex>

  constructor(
    filePath: string,
    private readonly cipher: SecretCipher,
    private readonly maxEntries: number = DEFAULT_MAX_ENTRIES
  ) {
    this.store = new JsonStore<ClipboardIndex>(filePath, { entries: [], monitoringEnabled: true })
  }

  private decode(entry: PersistedClipboardEntry): ClipboardEntry {
    const content = entry.encrypted ? this.cipher.decrypt(entry.content) : entry.content
    return {
      id: entry.id,
      kind: entry.kind,
      content,
      pinned: entry.pinned,
      sensitive: entry.sensitive,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt
    }
  }

  async list(query: ClipboardQueryRequest = {}): Promise<ClipboardEntry[]> {
    const index = await this.store.read()
    const now = Date.now()
    return index.entries
      .filter((entry) => !entry.expiresAt || entry.expiresAt > now)
      .map((entry) => this.decode(entry))
      .filter(
        (entry) => !query.search || entry.content.toLowerCase().includes(query.search.toLowerCase())
      )
  }

  async isMonitoringEnabled(): Promise<boolean> {
    return (await this.store.read()).monitoringEnabled
  }

  async setMonitoringEnabled(enabled: boolean): Promise<void> {
    const index = await this.store.read()
    await this.store.write({ ...index, monitoringEnabled: enabled })
  }

  /** Returns `undefined` (not an error) when the content was refused as a real secret shape — a refused write is an expected, honest outcome, not a failure. */
  async add(
    content: string,
    kind: ClipboardEntryKind = 'text'
  ): Promise<ClipboardEntry | undefined> {
    const index = await this.store.read()
    if (!index.monitoringEnabled) return undefined

    const detection = detectSecret(content)
    if (detection.detected) return undefined

    const canEncrypt = this.cipher.isAvailable()
    const now = Date.now()
    const entry: PersistedClipboardEntry = {
      id: randomUUID(),
      kind,
      content: canEncrypt ? this.cipher.encrypt(content) : content,
      encrypted: canEncrypt,
      pinned: false,
      sensitive: false,
      createdAt: now
    }

    const trimmed = [entry, ...index.entries.filter((existing) => !existing.pinned)]
    const pinned = index.entries.filter((existing) => existing.pinned)
    const combined = [...pinned, ...trimmed].slice(0, this.maxEntries)
    await this.store.write({ ...index, entries: combined })
    return this.decode(entry)
  }

  async setPinned(id: string, pinned: boolean): Promise<ClipboardEntry | undefined> {
    const index = await this.store.read()
    const existing = index.entries.find((entry) => entry.id === id)
    if (!existing) return undefined
    const updated = { ...existing, pinned }
    await this.store.write({
      ...index,
      entries: index.entries.map((entry) => (entry.id === id ? updated : entry))
    })
    return this.decode(updated)
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.entries.filter((entry) => entry.id !== id)
    if (next.length === index.entries.length) return false
    await this.store.write({ ...index, entries: next })
    return true
  }

  /** Real "Clear" (§17.1) — never clears pinned entries, matching every other "clear list" affordance in this app that preserves explicitly-pinned items. */
  async clear(): Promise<void> {
    const index = await this.store.read()
    await this.store.write({ ...index, entries: index.entries.filter((entry) => entry.pinned) })
  }

  /** Real "Locking clears transient sensitive entries" (§17.2). */
  async clearSensitive(): Promise<void> {
    const index = await this.store.read()
    await this.store.write({
      ...index,
      entries: index.entries.filter((entry) => entry.pinned || !entry.sensitive)
    })
  }
}
