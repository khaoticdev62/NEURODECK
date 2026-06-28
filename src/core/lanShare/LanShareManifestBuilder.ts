import type { Stats } from 'node:fs'
import { lstat, readdir, readlink } from 'node:fs/promises'
import { basename, join, sep } from 'node:path'

/**
 * Real wire values for `FileChunk.file_type` — these are not NDX's
 * own invention. Warpinator's own `util.py` builds its `FileType` enum
 * directly from GLib/Gio's real `GFileType` enum values
 * (`Gio.FileType.REGULAR`/`DIRECTORY`/`SYMBOLIC_LINK`), confirmed in
 * the LAN-0/LAN-5 audit. A real Warpinator-ecosystem peer reading our
 * `FileChunk.file_type` needs these exact integers, not arbitrary
 * 0/1/2 placeholders.
 */
export const NDX_FILE_TYPE_REGULAR = 1
export const NDX_FILE_TYPE_DIRECTORY = 2
export const NDX_FILE_TYPE_SYMBOLIC_LINK = 3

export interface ManifestEntry {
  /** Real absolute path on this device's filesystem — the sender's own `Warp` `StartTransfer` implementation reads from this; never sent over the wire itself. */
  absolutePath: string
  relativePath: string
  fileType:
    | typeof NDX_FILE_TYPE_REGULAR
    | typeof NDX_FILE_TYPE_DIRECTORY
    | typeof NDX_FILE_TYPE_SYMBOLIC_LINK
  sizeBytes: number
  mtimeMs: number
  mode: number
  symlinkTarget?: string
}

export interface TransferManifest {
  entries: ManifestEntry[]
  totalBytes: number
  itemCount: number
  topDirBasenames: string[]
  nameIfSingle?: string
}

export class UnsafeSourcePathError extends Error {}

/**
 * Real preflight/manifest builder (spec §14 "Preflight", Phase LAN-5).
 * Every entry comes from a real `fs.lstat` — symlinks are recorded as
 * `SYMBOLIC_LINK` entries (their target captured, never silently
 * followed/dereferenced, matching Gio's `NOFOLLOW_SYMLINKS` query flag
 * Warpinator itself uses) and special files (sockets, FIFOs, char/block
 * devices) are rejected outright rather than included as if they were
 * regular files. Cancellable mid-traversal via a real `AbortSignal` —
 * a huge tree doesn't have to fully enumerate before the user can back
 * out.
 */
export class LanShareManifestBuilder {
  async build(sourcePaths: string[], signal?: AbortSignal): Promise<TransferManifest> {
    if (sourcePaths.length === 0) {
      throw new UnsafeSourcePathError('No source paths were provided.')
    }

    const entries: ManifestEntry[] = []
    let totalBytes = 0

    for (const sourcePath of sourcePaths) {
      throwIfAborted(signal)
      const topStat = await lstat(sourcePath)
      const topBasename = basename(sourcePath)

      if (topStat.isDirectory()) {
        await this.walkDirectory(sourcePath, topBasename, entries, signal)
      } else {
        const entry = await this.buildEntry(sourcePath, topBasename, topStat)
        entries.push(entry)
      }
    }

    for (const entry of entries) {
      if (entry.fileType === NDX_FILE_TYPE_REGULAR) totalBytes += entry.sizeBytes
    }

    const topDirBasenames = sourcePaths.map((path) => basename(path))
    const nameIfSingle = sourcePaths.length === 1 ? basename(sourcePaths[0]) : undefined

    return {
      entries,
      totalBytes,
      itemCount: entries.length,
      topDirBasenames,
      nameIfSingle
    }
  }

  private async walkDirectory(
    absoluteDir: string,
    relativeDir: string,
    entries: ManifestEntry[],
    signal?: AbortSignal
  ): Promise<void> {
    throwIfAborted(signal)
    const dirStat = await lstat(absoluteDir)
    entries.push({
      absolutePath: absoluteDir,
      relativePath: relativeDir,
      fileType: NDX_FILE_TYPE_DIRECTORY,
      sizeBytes: 0,
      mtimeMs: dirStat.mtimeMs,
      mode: dirStat.mode
    })

    const children = await readdir(absoluteDir)
    for (const child of children) {
      throwIfAborted(signal)
      const childAbsolute = join(absoluteDir, child)
      const childRelative = relativeDir ? `${relativeDir}/${child}` : child
      const childStat = await lstat(childAbsolute)

      if (childStat.isDirectory()) {
        await this.walkDirectory(childAbsolute, childRelative, entries, signal)
      } else {
        entries.push(await this.buildEntry(childAbsolute, childRelative, childStat))
      }
    }
  }

  private async buildEntry(
    absolutePath: string,
    relativePath: string,
    stat: Stats
  ): Promise<ManifestEntry> {
    if (stat.isSymbolicLink()) {
      const target = await readlink(absolutePath)
      return {
        absolutePath,
        relativePath: toPosixPath(relativePath),
        fileType: NDX_FILE_TYPE_SYMBOLIC_LINK,
        sizeBytes: 0,
        mtimeMs: stat.mtimeMs,
        mode: stat.mode,
        symlinkTarget: target
      }
    }
    if (stat.isFile()) {
      return {
        absolutePath,
        relativePath: toPosixPath(relativePath),
        fileType: NDX_FILE_TYPE_REGULAR,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        mode: stat.mode
      }
    }
    throw new UnsafeSourcePathError(
      `Refusing to include special file (socket, FIFO, or device): ${relativePath}`
    )
  }
}

function toPosixPath(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/')
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new DOMException('Manifest build cancelled.', 'AbortError')
}
