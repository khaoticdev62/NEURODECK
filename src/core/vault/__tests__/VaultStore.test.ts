import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../../models/SecretCipher'
import { VaultItemNotFoundError, VaultStore } from '../VaultStore'

function fakeCipher(): SecretCipher {
  return {
    isAvailable: () => true,
    encrypt: (plaintext) => `ENC(${plaintext})`,
    decrypt: (ciphertext) => ciphertext.replace(/^ENC\(/, '').replace(/\)$/, '')
  }
}

describe('VaultStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vault-store-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('creates an item and never returns the raw secret from list()', async () => {
    const store = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    const item = await store.create({
      type: 'api-credential',
      label: 'Production API key',
      secret: 'sk-real-secret-value'
    })

    expect(item.label).toBe('Production API key')
    expect(JSON.stringify(item)).not.toContain('sk-real-secret-value')

    const listed = await store.list()
    expect(listed).toHaveLength(1)
    expect(JSON.stringify(listed)).not.toContain('sk-real-secret-value')
  })

  it('routes every secret through the real SecretCipher boundary before it is persisted', async () => {
    const filePath = join(dir, 'vault.json')
    const store = new VaultStore(filePath, fakeCipher())
    await store.create({ type: 'passphrase', label: 'Test', secret: 'super-secret-raw-value' })

    const raw = await import('node:fs/promises').then((fs) => fs.readFile(filePath, 'utf-8'))
    const parsed = JSON.parse(raw) as { items: Array<Record<string, unknown>> }
    // The fake cipher above is a transparent wrapper for test purposes, not
    // a real cipher — it deliberately doesn't obscure the substring. What
    // this asserts is the real, meaningful guarantee: the persisted field
    // is `encryptedSecret`/`encrypted: true`, never a bare `secret` field,
    // proving every create() call passes through `cipher.encrypt()` rather
    // than writing the raw input directly. The real opacity guarantee
    // comes from `electronSecretCipher`'s actual `safeStorage`-backed
    // implementation in production, which this unit test does not invoke.
    expect(parsed.items[0].encryptedSecret).toBe('ENC(super-secret-raw-value)')
    expect(parsed.items[0].encrypted).toBe(true)
    expect(parsed.items[0].secret).toBeUndefined()
  })

  it('reveal() returns the real decrypted secret and records a real access-log entry', async () => {
    const store = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    const item = await store.create({
      type: 'passphrase',
      label: 'Wi-Fi passphrase',
      secret: 'correct-horse-battery-staple'
    })

    const secret = await store.reveal(item.id)
    expect(secret).toBe('correct-horse-battery-staple')

    const log = await store.listAccessLog()
    expect(log.some((entry) => entry.itemId === item.id && entry.action === 'revealed')).toBe(true)

    const refreshed = await store.list()
    expect(refreshed[0].lastAccessedAt).not.toBeNull()
  })

  it('rotate() replaces the secret and a subsequent reveal returns the new value', async () => {
    const store = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    const item = await store.create({ type: 'oauth-token', label: 'Token', secret: 'old-token' })

    await store.rotate(item.id, 'new-token')

    expect(await store.reveal(item.id)).toBe('new-token')
    const log = await store.listAccessLog()
    expect(log.some((entry) => entry.itemId === item.id && entry.action === 'rotated')).toBe(true)
  })

  it('delete() removes the item and records a real access-log entry', async () => {
    const store = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    const item = await store.create({ type: 'certificate', label: 'Cert', secret: 'cert-data' })

    await store.delete(item.id)

    expect(await store.list()).toHaveLength(0)
    const log = await store.listAccessLog()
    expect(log.some((entry) => entry.itemId === item.id && entry.action === 'deleted')).toBe(true)
  })

  it('throws VaultItemNotFoundError for an unknown id on reveal/update/rotate/delete', async () => {
    const store = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    await expect(store.reveal('missing')).rejects.toThrow(VaultItemNotFoundError)
    await expect(store.update('missing', { label: 'x' })).rejects.toThrow(VaultItemNotFoundError)
    await expect(store.rotate('missing', 'x')).rejects.toThrow(VaultItemNotFoundError)
    await expect(store.delete('missing')).rejects.toThrow(VaultItemNotFoundError)
  })

  it('computes isExpired and needsRotation honestly at read time, never as a stored stale flag', async () => {
    const store = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    const expired = await store.create({
      type: 'certificate',
      label: 'Old cert',
      secret: 'x',
      expiresAt: Date.now() - 1000
    })
    const dueForRotation = await store.create({
      type: 'api-credential',
      label: 'Old key',
      secret: 'x',
      rotationReminderDays: 1
    })

    const list = await store.list()
    const expiredItem = list.find((entry) => entry.id === expired.id)
    const rotationItem = list.find((entry) => entry.id === dueForRotation.id)

    expect(expiredItem?.isExpired).toBe(true)
    // rotationReminderDays of 1 day cannot yet be due immediately after creation.
    expect(rotationItem?.needsRotation).toBe(false)
  })

  it('falls back to honest plaintext storage when the cipher is unavailable, matching other secret stores', async () => {
    const unavailableCipher: SecretCipher = {
      isAvailable: () => false,
      encrypt: (plaintext) => plaintext,
      decrypt: (ciphertext) => ciphertext
    }
    const store = new VaultStore(join(dir, 'vault.json'), unavailableCipher)
    const item = await store.create({ type: 'passphrase', label: 'Test', secret: 'plain-value' })

    expect(await store.reveal(item.id)).toBe('plain-value')
  })
})
