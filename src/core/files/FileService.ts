import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { FileEntry } from '@shared/contracts/file'

const MAX_PREVIEW_BYTES = 256 * 1024

export class PathOutsideWorkspaceError extends Error {
  constructor(path: string) {
    super(`"${path}" resolves outside the workspace root.`)
  }
}

/**
 * Real file service (mega-prompt §20) — read-only today (listing, reading,
 * metadata). Write/copy/move/rename/duplicate/compress/extract/trash are
 * deliberately not implemented yet: every one of them is a destructive or
 * semi-destructive operation, and the spec requires a real recovery path
 * before any destructive action ships (mega-prompt §2.4) — Recovery Service
 * doesn't exist until Epic 11. Building delete/move now would mean either
 * skipping that requirement or faking the recovery path; neither is
 * acceptable, so this stays read-only until Recovery lands.
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
}
