import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
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
})
