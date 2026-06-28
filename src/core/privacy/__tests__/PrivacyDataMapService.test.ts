import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../../models/SecretCipher'
import { BackupService } from '../../backup/BackupService'
import { BrowserPermissionStore } from '../../browser/BrowserPermissionStore'
import { ClipboardStore } from '../../clipboard/ClipboardStore'
import { KnowledgeStore } from '../../knowledge/KnowledgeStore'
import { MemoryStore } from '../../memory/MemoryStore'
import { VaultStore } from '../../vault/VaultStore'
import { DataCategoryNotClearableError, PrivacyDataMapService } from '../PrivacyDataMapService'

function fakeCipher(): SecretCipher {
  return {
    isAvailable: () => true,
    encrypt: (plaintext) => `ENC(${plaintext})`,
    decrypt: (ciphertext) => ciphertext.replace(/^ENC\(/, '').replace(/\)$/, '')
  }
}

describe('PrivacyDataMapService', () => {
  let dir: string
  let service: PrivacyDataMapService
  let clipboardStore: ClipboardStore
  let memoryStore: MemoryStore
  let browserPermissionStore: BrowserPermissionStore

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'privacy-data-map-'))
    clipboardStore = new ClipboardStore(join(dir, 'clipboard.json'), fakeCipher())
    memoryStore = new MemoryStore(join(dir, 'memory.json'))
    browserPermissionStore = new BrowserPermissionStore(join(dir, 'browser-permissions.json'))
    const knowledgeStore = new KnowledgeStore(join(dir, 'knowledge.json'))
    const backupService = new BackupService(dir, join(dir, 'backups'))
    const vaultStore = new VaultStore(join(dir, 'vault.json'), fakeCipher())
    service = new PrivacyDataMapService(
      clipboardStore,
      memoryStore,
      browserPermissionStore,
      knowledgeStore,
      backupService,
      vaultStore
    )
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns every real spec data category with an honest item count', async () => {
    const map = await service.getDataMap()
    const ids = map.map((entry) => entry.id)
    expect(ids).toEqual([
      'browser-data',
      'terminal-history',
      'clipboard-history',
      'ai-conversations',
      'memory',
      'knowledge-index',
      'audit-logs',
      'backups',
      'vault-secrets'
    ])

    const terminalHistory = map.find((entry) => entry.id === 'terminal-history')
    expect(terminalHistory?.itemCount).toBeNull()
    expect(terminalHistory?.deleteControl).toBe('not-applicable')
  })

  it('reflects a real, current item count for clipboard history', async () => {
    await clipboardStore.add('hello world')
    const map = await service.getDataMap()
    expect(map.find((entry) => entry.id === 'clipboard-history')?.itemCount).toBe(1)
  })

  it('clears clipboard history and genuinely verifies it is empty afterward', async () => {
    await clipboardStore.add('one')
    await clipboardStore.add('two')

    const result = await service.clearCategory('clipboard-history')

    expect(result.clearedCount).toBe(2)
    expect(result.verifiedEmpty).toBe(true)
    expect(await clipboardStore.list()).toHaveLength(0)
  })

  it('clears memory across every scope and verifies emptiness', async () => {
    await memoryStore.write({
      scope: 'global',
      type: 'user-preference',
      content: 'real memory item',
      attributedTo: 'user',
      pinned: false
    })

    const result = await service.clearCategory('memory')

    expect(result.clearedCount).toBe(1)
    expect(result.verifiedEmpty).toBe(true)
  })

  it('clears browser permission grants and verifies emptiness', async () => {
    await browserPermissionStore.set('https://example.com', 'camera', true)

    const result = await service.clearCategory('browser-data')

    expect(result.clearedCount).toBe(1)
    expect(result.verifiedEmpty).toBe(true)
  })

  it('throws DataCategoryNotClearableError for a category with no bulk-clear control', async () => {
    await expect(service.clearCategory('vault-secrets')).rejects.toThrow(
      DataCategoryNotClearableError
    )
    await expect(service.clearCategory('terminal-history')).rejects.toThrow(
      DataCategoryNotClearableError
    )
  })
})
