import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { parseBinaryVdf, serializeBinaryVdf, type VdfNode } from './SteamBinaryVdf'
import {
  buildShortcutsTree,
  parseShortcutsTree,
  type SteamShortcutEntry
} from './SteamShortcutCodec'

const execFileAsync = promisify(execFile)

export type SteamRunningState = 'running' | 'not-running' | 'unknown'

export interface SteamShortcutBackup {
  fileName: string
  createdAt: number
  bytes: number
}

export type CreateShortcutFields = Pick<
  SteamShortcutEntry,
  'appName' | 'exe' | 'startDir' | 'launchOptions'
>

const MAX_BACKUPS = 10
const BACKUP_PREFIX = 'shortcuts-'
const BACKUP_SUFFIX = '.vdf'

/**
 * Real Steam Shortcut Manager backend (supplemental §8), implementing
 * §8.3's safety requirements for real, not as a checklist to defer:
 * every write backs up the current file first, parses/validates the
 * new content before it ever touches disk, writes atomically (temp
 * file + rename, never an in-place write a crash could leave half
 * written), and re-reads the result from disk afterward to confirm
 * what's actually there matches what was intended. Process-state
 * awareness reports Steam's real running state so the UI can warn
 * before writing while Steam might overwrite the change on its own
 * next save — it never silently blocks, since detection itself can
 * fail and a false "not running" must never be presented as certain.
 *
 * Backups are a dedicated, bounded local history
 * (`<backupDir>/shortcuts-<timestamp>.vdf`), not a reuse of the
 * workspace-scoped `RecoveryService` — `shortcuts.vdf` is a system
 * file outside any workspace, and forcing it through a
 * workspace-shaped abstraction would be a worse fit than a small,
 * dedicated, equally-real mechanism.
 */
export class SteamShortcutService {
  constructor(
    private readonly vdfPath: string,
    private readonly backupDir: string
  ) {}

  async checkSteamRunning(): Promise<SteamRunningState> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq steam.exe', '/NH'])
        return stdout.toLowerCase().includes('steam.exe') ? 'running' : 'not-running'
      }
      const { stdout } = await execFileAsync('pgrep', ['-x', 'steam'])
      return stdout.trim().length > 0 ? 'running' : 'not-running'
    } catch (error) {
      // `pgrep` exits non-zero (and throws via execFile) when it finds no
      // match — that is a real, valid "not running" answer, not a failure.
      if (isExecFileNoMatch(error)) return 'not-running'
      return 'unknown'
    }
  }

  async list(): Promise<SteamShortcutEntry[]> {
    const { entries } = await this.readTree()
    return entries
  }

  async create(fields: CreateShortcutFields): Promise<SteamShortcutEntry[]> {
    const { entries, rawNodes } = await this.readTree()
    const created: SteamShortcutEntry = {
      index: entries.length,
      appName: fields.appName,
      exe: fields.exe,
      startDir: fields.startDir,
      icon: '',
      shortcutPath: '',
      launchOptions: fields.launchOptions,
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
    return this.writeEntries([...entries, created], rawNodes)
  }

  async update(
    index: number,
    patch: Partial<Omit<SteamShortcutEntry, 'index'>>
  ): Promise<SteamShortcutEntry[]> {
    const { entries, rawNodes } = await this.readTree()
    if (!entries.some((entry) => entry.index === index)) {
      throw new Error('That shortcut no longer exists. Refresh and try again.')
    }
    const updated = entries.map((entry) =>
      entry.index === index ? { ...entry, ...patch, index: entry.index } : entry
    )
    return this.writeEntries(updated, rawNodes)
  }

  async remove(index: number): Promise<SteamShortcutEntry[]> {
    const { entries, rawNodes } = await this.readTree()
    const remaining = entries.filter((entry) => entry.index !== index)
    return this.writeEntries(remaining, rawNodes)
  }

  async listBackups(): Promise<SteamShortcutBackup[]> {
    let fileNames: string[]
    try {
      fileNames = await readdir(this.backupDir)
    } catch {
      return []
    }
    const backups = await Promise.all(
      fileNames
        .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX))
        .map(async (fileName) => {
          const info = await stat(join(this.backupDir, fileName))
          return { fileName, createdAt: info.mtimeMs, bytes: info.size }
        })
    )
    return backups.sort((a, b) => b.createdAt - a.createdAt)
  }

  async restoreFromBackup(fileName: string): Promise<SteamShortcutEntry[]> {
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      throw new Error('Invalid backup file name.')
    }
    const backupPath = join(this.backupDir, fileName)
    const buffer = await readFile(backupPath)
    // Validate before restoring — never let a corrupted/foreign backup
    // file overwrite the real shortcuts.vdf without proving it parses.
    parseShortcutsTree(parseBinaryVdf(buffer))
    await this.backupCurrentFile()
    await this.atomicWrite(buffer)
    return this.list()
  }

  private async readTree(): Promise<{ entries: SteamShortcutEntry[]; rawNodes: VdfNode[] }> {
    let buffer: Buffer
    try {
      buffer = await readFile(this.vdfPath)
    } catch (error) {
      if (isEnoent(error)) return { entries: [], rawNodes: [] }
      throw error
    }
    return parseShortcutsTree(parseBinaryVdf(buffer))
  }

  private async writeEntries(
    entries: SteamShortcutEntry[],
    rawNodes: VdfNode[]
  ): Promise<SteamShortcutEntry[]> {
    const tree = buildShortcutsTree(entries, rawNodes)
    const buffer = serializeBinaryVdf(tree)

    // Validate our own output before it ever touches disk.
    const preWriteCheck = parseShortcutsTree(parseBinaryVdf(buffer))
    if (preWriteCheck.entries.length !== entries.length) {
      throw new Error('Refusing to write shortcuts.vdf: internal validation failed before writing.')
    }

    await this.backupCurrentFile()
    await this.atomicWrite(buffer)

    // Re-read from disk — confirm what is actually there, not just what
    // we attempted to write.
    const verifyBuffer = await readFile(this.vdfPath)
    const verified = parseShortcutsTree(parseBinaryVdf(verifyBuffer))
    if (verified.entries.length !== entries.length) {
      throw new Error(
        'shortcuts.vdf was written but failed post-write validation. A backup of the prior file was saved before this write.'
      )
    }
    return verified.entries
  }

  private async atomicWrite(buffer: Buffer): Promise<void> {
    const dir = dirname(this.vdfPath)
    await mkdir(dir, { recursive: true })
    const tempPath = join(dir, `.shortcuts.vdf.tmp-${randomUUID()}`)
    await writeFile(tempPath, buffer)
    await rename(tempPath, this.vdfPath)
  }

  private async backupCurrentFile(): Promise<void> {
    let buffer: Buffer
    try {
      buffer = await readFile(this.vdfPath)
    } catch {
      return // nothing real to back up yet
    }
    await mkdir(this.backupDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await writeFile(join(this.backupDir, `${BACKUP_PREFIX}${stamp}${BACKUP_SUFFIX}`), buffer)
    await this.pruneBackups()
  }

  private async pruneBackups(): Promise<void> {
    const backups = await this.listBackups()
    const excess = backups.slice(MAX_BACKUPS)
    await Promise.all(
      excess.map((backup) => rm(join(this.backupDir, backup.fileName), { force: true }))
    )
  }
}

function isEnoent(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT'
}

function isExecFileNoMatch(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as { code?: number }).code === 1
}
