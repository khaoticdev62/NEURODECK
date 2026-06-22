import { readdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { FileEntry } from '@shared/contracts/file'

const MAX_PREVIEW_BYTES = 256 * 1024

export class PathOutsideWorkspaceError extends Error {
  constructor(path: string) {
    super(`"${path}" resolves outside the workspace root.`)
  }
}

/**
 * Real file service (mega-prompt §20). `write()` is the first destructive
 * operation implemented — it shipped alongside the real Recovery Service
 * (Epic 11), satisfying mega-prompt §2.4's "no destructive action without
 * a real recovery path." Copy/move/rename/duplicate/compress/extract/trash
 * remain unimplemented: each needs its own recovery-checkpoint shape
 * (recording a move isn't the same as recording a content overwrite) that
 * hasn't been designed yet.
 */
export class FileService {
  /**
   * Resolves `relativePath` against `rootPath` and verifies the result is
   * still inside the root — the core defense against path traversal
   * (`../../etc/passwd`-style escapes) required by spec §20 "Security."
   */
  private async resolveWithinRoot(rootPath: string, relativePath: string): Promise<string> {
    const root = await realpath(rootPath)
    // realpath resolves symlinks too, so a symlink that *looks* like it stays
    // inside the root but actually points elsewhere is caught here, not just
    // a literal "../" in the input string. Both list() and read() only ever
    // operate on paths that must already exist, so a real ENOENT here is a
    // legitimate "not found" error, not something to paper over.
    const real = await realpath(resolve(root, relativePath))

    const rel = relative(root, real)
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new PathOutsideWorkspaceError(relativePath)
    }
    return real
  }

  async list(rootPath: string, relativePath: string): Promise<FileEntry[]> {
    const dirPath = await this.resolveWithinRoot(rootPath, relativePath)
    const entries = await readdir(dirPath, { withFileTypes: true })

    const results: FileEntry[] = []
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name)
      const info = await stat(entryPath)
      results.push({
        name: entry.name,
        path: relative(rootPath, entryPath),
        isDirectory: entry.isDirectory(),
        sizeBytes: info.size,
        modifiedAt: info.mtimeMs
      })
    }
    return results.sort(
      (a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name)
    )
  }

  async read(
    rootPath: string,
    relativePath: string
  ): Promise<{ content: string; truncated: boolean; sizeBytes: number }> {
    const filePath = await this.resolveWithinRoot(rootPath, relativePath)
    const info = await stat(filePath)
    if (info.isDirectory()) {
      throw new Error(`"${relativePath}" is a directory, not a file.`)
    }

    const truncated = info.size > MAX_PREVIEW_BYTES
    const buffer = await readFile(filePath)
    const content = buffer.subarray(0, MAX_PREVIEW_BYTES).toString('utf-8')
    return { content, truncated, sizeBytes: info.size }
  }

  /** Like `read()`, but returns `null` instead of throwing when the file doesn't exist yet — used to capture "previous content" before a write, including the "this is a brand-new file" case. */
  async readIfExists(rootPath: string, relativePath: string): Promise<string | null> {
    try {
      return (await this.read(rootPath, relativePath)).content
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  /**
   * Resolves a path for a write whose leaf may not exist yet — `realpath`
   * (used by `resolveWithinRoot`) requires the full path to already exist,
   * which breaks "create a new file." Instead, this resolves the parent
   * directory (which must exist; directory creation isn't supported) and
   * verifies *that* stays inside the root, closing the same symlink-escape
   * gap for the directory side of a write.
   */
  private async resolveForWrite(rootPath: string, relativePath: string): Promise<string> {
    const root = await realpath(rootPath)
    const target = resolve(root, relativePath)
    const realParentDir = await realpath(dirname(target))
    const real = join(realParentDir, basename(target))

    const rel = relative(root, real)
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new PathOutsideWorkspaceError(relativePath)
    }
    return real
  }

  /** Atomic write (temp file + rename, same pattern as `JsonStore`) — a crash mid-write can never corrupt the existing file. */
  async write(rootPath: string, relativePath: string, content: string): Promise<void> {
    const filePath = await this.resolveForWrite(rootPath, relativePath)
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tempPath, content, 'utf-8')
    await rename(tempPath, filePath)
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
