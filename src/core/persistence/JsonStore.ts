import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Generic JSON-file-backed store (mega-prompt §19 persistence). Writes are
 * atomic — content is written to a temp file in the same directory, then
 * renamed over the target, so a crash mid-write can never corrupt the
 * existing file (rename is atomic on the same filesystem).
 */
export class JsonStore<T> {
  constructor(
    private filePath: string,
    private defaultValue: T
  ) {}

  async read(): Promise<T> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch (error) {
      if (isNotFound(error)) return this.defaultValue
      throw error
    }
  }

  async write(value: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8')
    await rename(tempPath, this.filePath)
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
