import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BackupService } from '../BackupService'

let dir: string
let service: BackupService

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-backup-'))
  service = new BackupService(dir, join(dir, 'backups'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('BackupService', () => {
  it('creates a verified local app-state backup and excludes secret stores', async () => {
    await writeFile(join(dir, 'workspaces.json'), JSON.stringify({ workspaces: [] }), 'utf-8')
    await writeFile(join(dir, 'memory.json'), JSON.stringify({ items: [] }), 'utf-8')
    await writeFile(
      join(dir, 'model-providers.json'),
      JSON.stringify({ providers: [{ encryptedApiKey: 'secret' }] }),
      'utf-8'
    )

    const record = await service.create({ label: 'Manual checkpoint' })

    expect(record.label).toBe('Manual checkpoint')
    expect(record.verified).toBe(true)
    expect(record.fileCount).toBe(2)
    expect(record.excludedSecretPaths).toContain('model-providers.json')

    const raw = await readFile(record.path, 'utf-8')
    expect(raw).toContain('workspaces.json')
    expect(raw).toContain('memory.json')
    expect(raw).not.toContain('encryptedApiKey')
    expect(await service.list()).toEqual([record])
  })

  it('detects a corrupted backup during verification', async () => {
    await writeFile(join(dir, 'workspaces.json'), JSON.stringify({ workspaces: [] }), 'utf-8')
    const record = await service.create()

    const raw = await readFile(record.path, 'utf-8')
    await writeFile(record.path, raw.replace('workspaces.json', 'tampered.json'), 'utf-8')

    const verification = await service.verify(record.id)

    expect(verification.ok).toBe(false)
    expect(verification.failures).toContain('The backup manifest hash does not match its content.')
  })

  it('restores a verified backup and creates a rollback backup first', async () => {
    await writeFile(
      join(dir, 'workspaces.json'),
      JSON.stringify({ workspaces: [{ id: 'before' }] }),
      'utf-8'
    )
    const backup = await service.create({ label: 'Known good' })

    await writeFile(
      join(dir, 'workspaces.json'),
      JSON.stringify({ workspaces: [{ id: 'after' }] }),
      'utf-8'
    )
    await writeFile(join(dir, 'memory.json'), JSON.stringify({ items: ['stale'] }), 'utf-8')

    const result = await service.restore(backup.id)

    expect(result.restoredBackupId).toBe(backup.id)
    expect(result.restoredFileCount).toBe(1)
    expect(result.removedFileCount).toBe(1)
    expect(await readFile(join(dir, 'workspaces.json'), 'utf-8')).toContain('before')
    await expect(stat(join(dir, 'memory.json'))).rejects.toMatchObject({ code: 'ENOENT' })

    const rollbackRaw = await readFile(result.rollbackBackupPath, 'utf-8')
    expect(rollbackRaw).toContain('after')
    expect(rollbackRaw).toContain('stale')
  })

  it('refuses to restore a corrupted backup before writing app state', async () => {
    await writeFile(
      join(dir, 'workspaces.json'),
      JSON.stringify({ workspaces: [{ id: 'safe' }] }),
      'utf-8'
    )
    const backup = await service.create()
    const raw = await readFile(backup.path, 'utf-8')
    await writeFile(backup.path, raw.replace('safe', 'tampered'), 'utf-8')

    await expect(service.restore(backup.id)).rejects.toThrow('Backup failed verification')
    expect(await readFile(join(dir, 'workspaces.json'), 'utf-8')).toContain('safe')
  })

  it('imports a verified backup file into the managed backup directory', async () => {
    await writeFile(join(dir, 'workspaces.json'), JSON.stringify({ workspaces: [] }), 'utf-8')
    const exported = await service.create({ label: 'Portable' })

    const importedDir = await mkdtemp(join(tmpdir(), 'ndx-backup-import-'))
    const importedService = new BackupService(importedDir, join(importedDir, 'backups'))
    try {
      const imported = await importedService.importFromPath(exported.path)

      expect(imported.id).toBe(exported.id)
      expect(imported.path).not.toBe(exported.path)
      expect(imported.verified).toBe(true)
      expect(await importedService.list()).toEqual([imported])
    } finally {
      await rm(importedDir, { recursive: true, force: true })
    }
  })

  it('rejects importing a corrupted backup file', async () => {
    await writeFile(join(dir, 'workspaces.json'), JSON.stringify({ workspaces: [] }), 'utf-8')
    const exported = await service.create()
    const raw = await readFile(exported.path, 'utf-8')
    const corruptPath = join(dir, 'corrupt.ndx-backup.json')
    await writeFile(corruptPath, raw.replace('workspaces.json', 'tampered.json'), 'utf-8')

    await expect(service.importFromPath(corruptPath)).rejects.toThrow('Backup failed verification')
  })

  it('reports current backups during migration without rewriting them', async () => {
    await writeFile(join(dir, 'workspaces.json'), JSON.stringify({ workspaces: [] }), 'utf-8')
    const backup = await service.create()

    const report = await service.migrateManagedBackups()

    expect(report.total).toBe(1)
    expect(report.current).toBe(1)
    expect(report.migrated).toBe(0)
    expect(report.records[0]).toMatchObject({
      backupId: backup.id,
      status: 'current',
      fromSchemaVersion: '1.0.0',
      toSchemaVersion: '1.0.0'
    })
  })

  it('migrates a legacy 0.9.0 backup bundle to the current hashed format', async () => {
    await mkdir(join(dir, 'backups'), { recursive: true })
    const backupPath = join(dir, 'backups', '11111111-1111-4111-8111-111111111111.ndx-backup.json')
    await writeFile(
      backupPath,
      JSON.stringify(
        {
          schemaVersion: '0.9.0',
          id: '11111111-1111-4111-8111-111111111111',
          createdAt: 123,
          label: 'Legacy',
          scope: 'app-state',
          files: [{ relativePath: 'workspaces.json', content: '{"workspaces":[]}' }]
        },
        null,
        2
      ),
      'utf-8'
    )

    const report = await service.migrateManagedBackups()
    const migrated = JSON.parse(await readFile(backupPath, 'utf-8')) as {
      schemaVersion: string
      sha256: string
      files: Array<{ bytes: number; sha256: string }>
      excludedSecretPaths: string[]
    }

    expect(report.migrated).toBe(1)
    expect(report.records[0]).toMatchObject({
      status: 'migrated',
      fromSchemaVersion: '0.9.0',
      toSchemaVersion: '1.0.0'
    })
    expect(migrated.schemaVersion).toBe('1.0.0')
    expect(migrated.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(migrated.files[0].bytes).toBeGreaterThan(0)
    expect(migrated.files[0].sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(migrated.excludedSecretPaths).toContain('model-providers.json')
  })

  it('records invalid and blocked backup migration entries without throwing', async () => {
    await mkdir(join(dir, 'backups'), { recursive: true })
    await writeFile(join(dir, 'backups', 'invalid.ndx-backup.json'), 'not json', 'utf-8')
    await writeFile(
      join(dir, 'backups', 'future.ndx-backup.json'),
      JSON.stringify({ schemaVersion: '2.0.0', id: 'future' }),
      'utf-8'
    )

    const report = await service.migrateManagedBackups()

    expect(report.invalid).toBe(1)
    expect(report.blocked).toBe(1)
    expect(report.records.map((record) => record.status).sort()).toEqual(['blocked', 'invalid'])
  })
})
