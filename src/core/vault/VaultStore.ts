import { randomUUID } from 'node:crypto'
import type {
  VaultAccessAction,
  VaultAccessLogEntry,
  VaultItem,
  VaultItemType
} from '@shared/contracts'
import type { SecretCipher } from '../models/SecretCipher'
import { JsonStore } from '../persistence/JsonStore'

export class VaultItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Vault item "${id}" does not exist.`)
  }
}

interface PersistedVaultItem {
  id: string
  type: VaultItemType
  label: string
  notes?: string
  /** Encrypted via the injected `SecretCipher` when available — see `encrypted` for the honest plaintext fallback, matching every other secret store in this codebase (e.g. `LanShareGroupCodeStore`). */
  encryptedSecret: string
  encrypted: boolean
  createdAt: number
  updatedAt: number
  lastAccessedAt: number | null
  expiresAt: number | null
  rotationReminderDays: number | null
}

interface VaultFile {
  items: PersistedVaultItem[]
  accessLog: VaultAccessLogEntry[]
}

const DEFAULT_FILE: VaultFile = { items: [], accessLog: [] }
/** Bounded so the access log can't grow without limit across years of use — old entries roll off, matching the bounded-history pattern other status stores in this codebase already use. */
const MAX_ACCESS_LOG_ENTRIES = 500

function toMetadata(item: PersistedVaultItem, now: number): VaultItem {
  return {
    id: item.id,
    type: item.type,
    label: item.label,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastAccessedAt: item.lastAccessedAt,
    expiresAt: item.expiresAt,
    rotationReminderDays: item.rotationReminderDays,
    isExpired: item.expiresAt !== null && item.expiresAt <= now,
    needsRotation:
      item.rotationReminderDays !== null &&
      now - item.updatedAt >= item.rotationReminderDays * 24 * 60 * 60 * 1000
  }
}

/**
 * Real Epic X10 reference-based secrets vault (supplemental spec §31).
 * Every secret value is encrypted at rest via the same injected
 * `SecretCipher` boundary every other secret in this codebase uses
 * (Electron's `safeStorage` in production) — never a homegrown cipher,
 * never plaintext on disk when the OS-backed cipher is available. The
 * raw secret is returned to the renderer only by `reveal()`, a distinct
 * call from `list()`, so a screen can show metadata-only cards without
 * ever touching a real secret value; the renderer process itself is
 * still trusted (there is no IPC-level lock enforcement anywhere in
 * this codebase — `ShellLayout`'s full-screen Lock Screen gate is the
 * existing, consistent security boundary, and `/vault` sits behind it
 * like every other screen).
 */
export class VaultStore {
  private readonly store: JsonStore<VaultFile>

  constructor(
    filePath: string,
    private readonly cipher: SecretCipher
  ) {
    this.store = new JsonStore<VaultFile>(filePath, DEFAULT_FILE)
  }

  async list(): Promise<VaultItem[]> {
    const file = await this.store.read()
    const now = Date.now()
    return file.items.map((item) => toMetadata(item, now))
  }

  async create(input: {
    type: VaultItemType
    label: string
    secret: string
    notes?: string
    expiresAt?: number | null
    rotationReminderDays?: number | null
  }): Promise<VaultItem> {
    const file = await this.store.read()
    const now = Date.now()
    const canEncrypt = this.cipher.isAvailable()
    const item: PersistedVaultItem = {
      id: randomUUID(),
      type: input.type,
      label: input.label,
      notes: input.notes,
      encryptedSecret: canEncrypt ? this.cipher.encrypt(input.secret) : input.secret,
      encrypted: canEncrypt,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: null,
      expiresAt: input.expiresAt ?? null,
      rotationReminderDays: input.rotationReminderDays ?? null
    }
    const accessLog = appendAccessLog(file.accessLog, item, 'created', now)
    await this.store.write({ items: [...file.items, item], accessLog })
    return toMetadata(item, now)
  }

  async update(
    id: string,
    fields: {
      label?: string
      notes?: string
      expiresAt?: number | null
      rotationReminderDays?: number | null
    }
  ): Promise<VaultItem> {
    const file = await this.store.read()
    const index = file.items.findIndex((candidate) => candidate.id === id)
    if (index === -1) throw new VaultItemNotFoundError(id)
    const now = Date.now()
    const updated: PersistedVaultItem = {
      ...file.items[index],
      label: fields.label ?? file.items[index].label,
      notes: fields.notes ?? file.items[index].notes,
      expiresAt: fields.expiresAt !== undefined ? fields.expiresAt : file.items[index].expiresAt,
      rotationReminderDays:
        fields.rotationReminderDays !== undefined
          ? fields.rotationReminderDays
          : file.items[index].rotationReminderDays,
      updatedAt: now
    }
    const items = [...file.items]
    items[index] = updated
    const accessLog = appendAccessLog(file.accessLog, updated, 'updated', now)
    await this.store.write({ items, accessLog })
    return toMetadata(updated, now)
  }

  async rotate(id: string, newSecret: string): Promise<VaultItem> {
    const file = await this.store.read()
    const index = file.items.findIndex((candidate) => candidate.id === id)
    if (index === -1) throw new VaultItemNotFoundError(id)
    const now = Date.now()
    const canEncrypt = this.cipher.isAvailable()
    const updated: PersistedVaultItem = {
      ...file.items[index],
      encryptedSecret: canEncrypt ? this.cipher.encrypt(newSecret) : newSecret,
      encrypted: canEncrypt,
      updatedAt: now
    }
    const items = [...file.items]
    items[index] = updated
    const accessLog = appendAccessLog(file.accessLog, updated, 'rotated', now)
    await this.store.write({ items, accessLog })
    return toMetadata(updated, now)
  }

  /** The one real path that returns a raw secret value — always recorded in the access audit, never silent. */
  async reveal(id: string): Promise<string> {
    const file = await this.store.read()
    const index = file.items.findIndex((candidate) => candidate.id === id)
    if (index === -1) throw new VaultItemNotFoundError(id)
    const now = Date.now()
    const item = { ...file.items[index], lastAccessedAt: now }
    const items = [...file.items]
    items[index] = item
    const accessLog = appendAccessLog(file.accessLog, item, 'revealed', now)
    await this.store.write({ items, accessLog })
    return item.encrypted ? this.cipher.decrypt(item.encryptedSecret) : item.encryptedSecret
  }

  async delete(id: string): Promise<void> {
    const file = await this.store.read()
    const item = file.items.find((candidate) => candidate.id === id)
    if (!item) throw new VaultItemNotFoundError(id)
    const now = Date.now()
    const accessLog = appendAccessLog(file.accessLog, item, 'deleted', now)
    await this.store.write({
      items: file.items.filter((candidate) => candidate.id !== id),
      accessLog
    })
  }

  async listAccessLog(): Promise<VaultAccessLogEntry[]> {
    const file = await this.store.read()
    return file.accessLog
  }
}

function appendAccessLog(
  log: VaultAccessLogEntry[],
  item: PersistedVaultItem,
  action: VaultAccessAction,
  timestamp: number
): VaultAccessLogEntry[] {
  const entry: VaultAccessLogEntry = {
    id: randomUUID(),
    itemId: item.id,
    itemLabel: item.label,
    itemType: item.type,
    action,
    timestamp
  }
  return [...log, entry].slice(-MAX_ACCESS_LOG_ENTRIES)
}
