import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseBinaryVdf, serializeBinaryVdf } from '../SteamBinaryVdf'
import { buildShortcutsTree, parseShortcutsTree } from '../SteamShortcutCodec'
import { SteamShortcutService } from '../SteamShortcutService'

let dir: string
let vdfPath: string
let backupDir: string
let service: SteamShortcutService

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-steam-'))
  vdfPath = join(dir, 'config', 'shortcuts.vdf')
  backupDir = join(dir, 'backups')
  service = new SteamShortcutService(vdfPath, backupDir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('SteamShortcutService', () => {
  it('returns an empty real list when shortcuts.vdf does not exist yet', async () => {
    expect(await service.list()).toEqual([])
  })

  it('creates a real shortcut and persists it to a real shortcuts.vdf file', async () => {
    const entries = await service.create({
      appName: 'Demo Game',
      exe: '"/usr/bin/demo"',
      startDir: '"/usr/bin/"',
      launchOptions: '--fullscreen'
    })

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ appName: 'Demo Game', exe: '"/usr/bin/demo"' })

    const onDisk = await service.list()
    expect(onDisk).toEqual(entries)
  })

  it('backs up the real prior file content before every write', async () => {
    await service.create({ appName: 'First', exe: 'a', startDir: '', launchOptions: '' })
    await service.create({ appName: 'Second', exe: 'b', startDir: '', launchOptions: '' })

    const backups = await service.listBackups()
    expect(backups.length).toBeGreaterThanOrEqual(1)

    // The most recent backup must contain the state as it was *before*
    // the second create — i.e. only "First".
    const newestBackup = backups[0]
    const buffer = await readFile(join(backupDir, newestBackup.fileName))
    const backedUpEntries = parseShortcutsTree(parseBinaryVdf(buffer)).entries
    expect(backedUpEntries.map((entry) => entry.appName)).toEqual(['First'])
  })

  it('prunes backups beyond the real retention limit', async () => {
    for (let i = 0; i < 13; i++) {
      await service.create({ appName: `Entry ${i}`, exe: 'a', startDir: '', launchOptions: '' })
    }

    const backups = await service.listBackups()
    expect(backups.length).toBeLessThanOrEqual(10)
  })

  it('updates a real shortcut while preserving its other real fields', async () => {
    await service.create({
      appName: 'Original',
      exe: '"/usr/bin/original"',
      startDir: '',
      launchOptions: ''
    })

    const updated = await service.update(0, { appName: 'Renamed' })

    expect(updated[0]).toMatchObject({ appName: 'Renamed', exe: '"/usr/bin/original"' })
  })

  it('rejects updating a shortcut index that does not exist', async () => {
    await expect(service.update(5, { appName: 'X' })).rejects.toThrow(/no longer exists/)
  })

  it('removes a real shortcut and re-derives sequential indices for the rest', async () => {
    await service.create({ appName: 'First', exe: 'a', startDir: '', launchOptions: '' })
    await service.create({ appName: 'Second', exe: 'b', startDir: '', launchOptions: '' })
    await service.create({ appName: 'Third', exe: 'c', startDir: '', launchOptions: '' })

    const remaining = await service.remove(1)

    expect(remaining.map((entry) => entry.appName)).toEqual(['First', 'Third'])
    expect(remaining.map((entry) => entry.index)).toEqual([0, 1])
  })

  it('writes shortcuts.vdf atomically — no leftover temp file after a successful write', async () => {
    await service.create({ appName: 'A', exe: 'a', startDir: '', launchOptions: '' })

    const filesInConfigDir = await readdir(join(dir, 'config'))
    expect(filesInConfigDir).toEqual(['shortcuts.vdf'])
  })

  it('restores a real prior backup, overwriting current shortcuts with its content', async () => {
    await service.create({ appName: 'Original', exe: 'a', startDir: '', launchOptions: '' })
    const backups = await service.listBackups()
    // Nothing backed up yet from the very first create (no prior file
    // existed) — make a second change so a real backup of "Original" exists.
    await service.create({ appName: 'Second', exe: 'b', startDir: '', launchOptions: '' })
    const backupsAfter = await service.listBackups()
    expect(backupsAfter.length).toBeGreaterThan(backups.length)

    const restored = await service.restoreFromBackup(backupsAfter[0].fileName)

    expect(restored.map((entry) => entry.appName)).toEqual(['Original'])
  })

  it('rejects a backup file name containing path traversal characters', async () => {
    await expect(service.restoreFromBackup('../../etc/passwd')).rejects.toThrow(/Invalid/)
  })

  it('reports a real "not-running"/"running"/"unknown" Steam process state without throwing', async () => {
    const state = await service.checkSteamRunning()
    expect(['running', 'not-running', 'unknown']).toContain(state)
  })

  it('preserves an unknown real field on an existing entry across an update', async () => {
    // Hand-write a real shortcuts.vdf with a field this codec does not model.
    const tree = buildShortcutsTree(
      [
        {
          index: 0,
          appName: 'Hand Written',
          exe: 'a',
          startDir: '',
          icon: '',
          shortcutPath: '',
          launchOptions: '',
          isHidden: false,
          allowDesktopConfig: true,
          allowOverlay: true,
          openVR: false,
          devkit: false,
          devkitGameId: '',
          devkitOverrideAppId: 0,
          lastPlayTime: 0,
          flatpakAppId: '',
          tags: []
        }
      ],
      []
    )
    const shortcutsNode = tree.shortcuts as Record<string, Record<string, unknown>>
    shortcutsNode['0'].SomeFutureField = 'must-survive'
    await mkdir(join(dir, 'config'), { recursive: true })
    await writeFile(vdfPath, serializeBinaryVdf(tree))

    await service.update(0, { appName: 'Edited' })

    const raw = await readFile(vdfPath)
    const rawTree = parseBinaryVdf(raw)
    const rawShortcuts = rawTree.shortcuts as Record<string, Record<string, unknown>>
    expect(rawShortcuts['0'].SomeFutureField).toBe('must-survive')
    expect(rawShortcuts['0'].appname).toBe('Edited')
  })
})
