import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type {
  RecoveryCheckpoint,
  RecoveryCheckpointKind,
  RecoveryStorageSummary,
  Reversibility
} from '@shared/contracts/recovery'
import { JsonStore } from '../persistence/JsonStore'

const MAX_CHECKPOINTS_PER_WORKSPACE = 50

interface RecoveryIndex {
  checkpoints: RecoveryCheckpoint[]
}

/**
 * Real recovery checkpoints (mega-prompt §29) — the service that unblocks
 * destructive operations elsewhere in the app. Stored entirely outside the
 * user's own workspace (under `app.getPath('userData')/recovery/`), so
 * checkpoints never collide with the user's own Git history or get swept
 * up by a `git clean`. Every checkpoint declares its real reversibility;
 * this service only ever issues `fully-reversible` (a snapshot of prior
 * content always exists) — other reversibility levels are defined for
 * future consumers (Git restore, settings, package operations) that don't
 * exist yet.
 */
export class RecoveryService {
  constructor(private baseDir: string) {}

  private indexPath(workspaceId: string): string {
    return join(this.baseDir, workspaceId, 'index.json')
  }

  private snapshotPath(workspaceId: string, checkpointId: string): string {
    return join(this.baseDir, workspaceId, `${checkpointId}.snapshot`)
  }

  private store(workspaceId: string): JsonStore<RecoveryIndex> {
    return new JsonStore<RecoveryIndex>(this.indexPath(workspaceId), { checkpoints: [] })
  }

  async recordCheckpoint(
    workspaceId: string,
    relativePath: string,
    previousContent: string | null,
    description: string,
    kind: RecoveryCheckpointKind = 'file-write',
    reversibility: Reversibility = 'fully-reversible'
  ): Promise<RecoveryCheckpoint> {
    const checkpoint: RecoveryCheckpoint = {
      id: randomUUID(),
      workspaceId,
      kind,
      relativePath,
      description,
      reversibility,
      hadPreviousContent: previousContent !== null,
      createdAt: Date.now()
    }

    if (previousContent !== null) {
      const snapshotPath = this.snapshotPath(workspaceId, checkpoint.id)
      await mkdir(dirname(snapshotPath), { recursive: true })
      await writeFile(snapshotPath, previousContent, 'utf-8')
    }

    const store = this.store(workspaceId)
    const index = await store.read()
    await store.write({ checkpoints: [checkpoint, ...index.checkpoints] })
    await this.prune(workspaceId)
    return checkpoint
  }

  async list(workspaceId: string): Promise<RecoveryCheckpoint[]> {
    return (await this.store(workspaceId).read()).checkpoints
  }

  async getCheckpoint(
    workspaceId: string,
    checkpointId: string
  ): Promise<RecoveryCheckpoint | undefined> {
    return (await this.list(workspaceId)).find((checkpoint) => checkpoint.id === checkpointId)
  }

  /** Returns the snapshotted prior content, or `null` if this checkpoint recorded a brand-new file (nothing to restore to). */
  async getSnapshotContent(workspaceId: string, checkpointId: string): Promise<string | null> {
    const checkpoint = await this.getCheckpoint(workspaceId, checkpointId)
    if (!checkpoint || !checkpoint.hadPreviousContent) return null
    return readFile(this.snapshotPath(workspaceId, checkpointId), 'utf-8')
  }

  async storageSummary(workspaceId: string): Promise<RecoveryStorageSummary> {
    const checkpoints = await this.list(workspaceId)
    let totalBytes = 0
    for (const checkpoint of checkpoints) {
      if (!checkpoint.hadPreviousContent) continue
      try {
        const info = await stat(this.snapshotPath(workspaceId, checkpoint.id))
        totalBytes += info.size
      } catch {
        // Snapshot file missing (already pruned out of band) — skip it.
      }
    }
    return { checkpointCount: checkpoints.length, totalBytes }
  }

  private async prune(workspaceId: string): Promise<void> {
    const store = this.store(workspaceId)
    const index = await store.read()
    if (index.checkpoints.length <= MAX_CHECKPOINTS_PER_WORKSPACE) return

    const keep = index.checkpoints.slice(0, MAX_CHECKPOINTS_PER_WORKSPACE)
    const drop = index.checkpoints.slice(MAX_CHECKPOINTS_PER_WORKSPACE)
    await store.write({ checkpoints: keep })
    for (const checkpoint of drop) {
      if (checkpoint.hadPreviousContent) {
        await rm(this.snapshotPath(workspaceId, checkpoint.id), { force: true })
      }
    }
  }
}
