import type { ClearDataCategoryResult, DataCategoryId, DataMapEntry } from '@shared/contracts'
import type { BackupService } from '../backup/BackupService'
import type { BrowserPermissionStore } from '../browser/BrowserPermissionStore'
import type { ClipboardStore } from '../clipboard/ClipboardStore'
import type { KnowledgeStore } from '../knowledge/KnowledgeStore'
import type { MemoryStore } from '../memory/MemoryStore'
import type { VaultStore } from '../vault/VaultStore'

export class DataCategoryNotClearableError extends Error {
  constructor(id: DataCategoryId) {
    super(`"${id}" has no real bulk-delete control in this build.`)
  }
}

/**
 * Real Epic X12 Data Lifecycle and Privacy Map (supplemental spec
 * §37.1–37.2). Every row below describes a real store this codebase
 * actually has — never a fabricated category for a subsystem that
 * doesn't exist (sync, cloud processing, analytics, and crash reports
 * are honestly omitted; see `shared/contracts/privacy.ts`'s doc
 * comment). `clearCategory()` calls the real owning store's bulk-clear
 * method and then re-reads it to genuinely verify emptiness (§37.2
 * "Deletion must address... Primary record"), rather than assuming a
 * write succeeded.
 */
export class PrivacyDataMapService {
  constructor(
    private readonly clipboardStore: ClipboardStore,
    private readonly memoryStore: MemoryStore,
    private readonly browserPermissionStore: BrowserPermissionStore,
    private readonly knowledgeStore: KnowledgeStore,
    private readonly backupService: BackupService,
    private readonly vaultStore: VaultStore
  ) {}

  async getDataMap(): Promise<DataMapEntry[]> {
    const [clipboard, memory, browserPermissions, knowledgeSources, backups, vaultItems] =
      await Promise.all([
        this.clipboardStore.list(),
        this.memoryStore.list(),
        this.browserPermissionStore.list(),
        this.knowledgeStore.listSources(),
        this.backupService.list(),
        this.vaultStore.list()
      ])

    return [
      {
        id: 'browser-data',
        label: 'Browser data',
        storageLocation:
          'Local JSON (per-origin permission grants); browser tabs are persisted per workspace',
        encrypted: false,
        retention: 'Until explicitly cleared',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'available-here',
        deleteControlDetail:
          'Clears all stored site permission grants/denials. Per-workspace tab history must be cleared from each workspace’s Browser tab.',
        providerInvolvement: 'None — local only',
        itemCount: browserPermissions.length
      },
      {
        id: 'terminal-history',
        label: 'Terminal history',
        storageLocation: 'None — PTY sessions are in-memory only and end when closed',
        encrypted: false,
        retention: 'Not persisted',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'not-applicable',
        deleteControlDetail:
          'Nothing to delete — no terminal output or command history is ever written to disk.',
        providerInvolvement: 'None',
        itemCount: null
      },
      {
        id: 'clipboard-history',
        label: 'Clipboard history',
        storageLocation: 'Local JSON',
        encrypted: false,
        retention: 'Until explicitly cleared',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'available-here',
        deleteControlDetail:
          'Clears every stored clipboard entry. A separate "clear sensitive only" control exists in Clipboard Center.',
        providerInvolvement: 'None — local only',
        itemCount: clipboard.length
      },
      {
        id: 'ai-conversations',
        label: 'AI conversations',
        storageLocation: 'None — model requests/responses are not persisted by this build',
        encrypted: false,
        retention: 'Not persisted',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'not-applicable',
        deleteControlDetail: 'Nothing to delete — no chat/completion history is written to disk.',
        providerInvolvement:
          'Real model providers receive request content live, per call, but nothing is retained locally afterward.',
        itemCount: null
      },
      {
        id: 'memory',
        label: 'AI memory',
        storageLocation: 'Local JSON',
        encrypted: false,
        retention:
          'Until explicitly cleared; secret-shaped content is rejected at write time, never stored',
        syncStatus: 'Not synced',
        exportSupport: 'Real JSON export (Memory Control Center)',
        deleteControl: 'available-here',
        deleteControlDetail: 'Clears every memory item across every scope.',
        providerInvolvement: 'None — local only',
        itemCount: memory.length
      },
      {
        id: 'knowledge-index',
        label: 'Knowledge index',
        storageLocation: 'Local JSON (source metadata) plus derived chunks',
        encrypted: false,
        retention: 'Until each source is removed',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'available-elsewhere',
        deleteControlDetail:
          'Removing a source also removes its derived chunks. Manage from the Knowledge Vault screen — sources are workspace-scoped, so there is no single global "clear all" here.',
        providerInvolvement: 'None — local only',
        itemCount: knowledgeSources.length,
        linkedRoute: '/knowledge'
      },
      {
        id: 'audit-logs',
        label: 'Audit logs',
        storageLocation: 'Renderer-process memory only — not written to disk',
        encrypted: false,
        retention: 'Cleared automatically when the app closes',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'not-applicable',
        deleteControlDetail:
          'Nothing to delete — the audit log is in-memory only and never persists across a restart.',
        providerInvolvement: 'None',
        itemCount: null
      },
      {
        id: 'backups',
        label: 'Backups',
        storageLocation: 'Local JSON bundles under the app data directory',
        encrypted: false,
        retention: 'Until explicitly deleted',
        syncStatus: 'Not synced',
        exportSupport: 'Real export/import (Backup and Restore)',
        deleteControl: 'available-elsewhere',
        deleteControlDetail:
          'Manage and delete individual backups from the Backup and Restore screen.',
        providerInvolvement: 'None — local only',
        itemCount: backups.length,
        linkedRoute: '/backup'
      },
      {
        id: 'vault-secrets',
        label: 'Vault secrets',
        storageLocation:
          'Local JSON, values encrypted at rest via the OS secret store when available',
        encrypted: true,
        retention: 'Until explicitly deleted; optional expiration/rotation reminders',
        syncStatus: 'Not synced',
        exportSupport: 'Not supported',
        deleteControl: 'available-elsewhere',
        deleteControlDetail: 'Manage and delete individual secrets from the Secrets Vault screen.',
        providerInvolvement: 'None — local only',
        itemCount: vaultItems.length,
        linkedRoute: '/vault'
      }
    ]
  }

  async clearCategory(id: DataCategoryId): Promise<ClearDataCategoryResult> {
    switch (id) {
      case 'clipboard-history': {
        const before = await this.clipboardStore.list()
        await this.clipboardStore.clear()
        const after = await this.clipboardStore.list()
        return { id, clearedCount: before.length, verifiedEmpty: after.length === 0 }
      }
      case 'memory': {
        const clearedCount = await this.memoryStore.clearAll()
        const after = await this.memoryStore.list()
        return { id, clearedCount, verifiedEmpty: after.length === 0 }
      }
      case 'browser-data': {
        const before = await this.browserPermissionStore.list()
        await this.browserPermissionStore.clearAll()
        const after = await this.browserPermissionStore.list()
        return { id, clearedCount: before.length, verifiedEmpty: after.length === 0 }
      }
      default:
        throw new DataCategoryNotClearableError(id)
    }
  }
}
