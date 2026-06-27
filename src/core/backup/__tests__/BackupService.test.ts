import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
})
