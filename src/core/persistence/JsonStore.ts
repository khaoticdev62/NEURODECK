import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Generic JSON-file-backed store (mega-prompt §19 persistence). Writes are
 * atomic — content is written to a temp file in the same directory, then
 * renamed over the target, so a crash mid-write can never corrupt the
 * existing file (rename is atomic on the same filesystem).
 */
export class JsonStore<T> {
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(
    private filePath: string,
    private defaultValue: T
  ) {}

  /**
   * A genuinely corrupted file (not "missing", which `isNotFound` already
   * handles) used to propagate as a thrown `SyntaxError` all the way up to
   * the IPC handler, which is fine in isolation — but for `WorkspaceStore`
   * specifically, that error reaches `BootSessionStart`'s workspace check,
   * which used to treat *any* failure there as fatal and permanently block
   * the whole UI behind a "Boot failed" screen with no way back in, since
   * retrying just re-reads the same corrupted file. Move the unreadable
   * file aside (preserved for forensics, never silently deleted) and fall
   * back to the default value instead, so corruption in any one store
   * self-heals rather than bricking whatever feature depends on it.
   */
  async read(): Promise<T> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch (error) {
      if (isNotFound(error)) return this.defaultValue
      if (error instanceof SyntaxError) {
        await this.quarantineCorruptedFile()
        return this.defaultValue
      }
      throw error
    }
  }

  private async quarantineCorruptedFile(): Promise<void> {
    const quarantinePath = `${this.filePath}.corrupted-${Date.now()}`
    try {
      await rename(this.filePath, quarantinePath)
    } catch {
      // Best-effort — if even the rename fails (e.g. permissions), falling
      // back to the default value is still strictly better than throwing.
    }
  }

  async write(value: T): Promise<void> {
    const operation = this.writeQueue.then(
      () => this.writeNow(value),
      () => this.writeNow(value)
    )
    this.writeQueue = operation.catch(() => undefined)
    return operation
  }

  private async writeNow(value: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8')
    try {
      await rename(tempPath, this.filePath)
    } catch (error) {
      if (!isReplaceBlocked(error)) throw error
      await rm(this.filePath, { force: true })
      await rename(tempPath, this.filePath)
    }
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

function isReplaceBlocked(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'EPERM' || error.code === 'EEXIST')
  )
}
