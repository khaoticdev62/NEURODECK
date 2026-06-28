import { dirname, join } from 'node:path'
import { appendFile, mkdir, readdir, rename, rm, stat, symlink, utimes } from 'node:fs/promises'
import { decompressChunk } from './grpc/fileChunkCompression'
import type { NdxFileChunk } from './grpc/LanShareTransferServer'
import { NDX_FILE_TYPE_DIRECTORY, NDX_FILE_TYPE_SYMBOLIC_LINK } from './LanShareManifestBuilder'
import { assertSafeSymlinkTarget, resolveSafeDestination } from './receivePathSafety'

/**
 * Real receive/staging/commit engine (spec §15–18, Phase LAN-6).
 * Every chunk is written into a real per-job staging directory under
 * the configured receive directory — never directly into the final
 * destination — so a transfer that fails partway never leaves a
 * half-written file where the user would see it (spec §17 "Never
 * expose half-written files in the final destination"). `commit()` is
 * the one real, atomic step: an `fs.rename()` per top-level item
 * (atomic on the same filesystem, which staging and the destination
 * always share here) into the real destination, applying real
 * conflict-safe naming since spec §18 requires the default to never
 * silently replace an existing file.
 *
 * Full OS-level sandboxing (Landlock/Bubblewrap, spec §16) is a
 * separate, Linux-specific concern this engine does not attempt —
 * tracked honestly via the `lanShare.landlock`/`lanShare.bubblewrap`
 * Capability Registry entries.
 */
export class LanShareReceiveEngine {
  stagingRootFor(receiveDirectory: string, jobId: string): string {
    return join(receiveDirectory, '.ndx-lan-share-staging', jobId)
  }

  async beginStaging(stagingRoot: string): Promise<void> {
    await mkdir(stagingRoot, { recursive: true })
  }

  async writeChunk(
    stagingRoot: string,
    chunk: NdxFileChunk,
    useCompression: boolean
  ): Promise<void> {
    const destination = resolveSafeDestination(stagingRoot, chunk.relative_path)

    if (chunk.file_type === NDX_FILE_TYPE_DIRECTORY) {
      await mkdir(destination, { recursive: true })
      return
    }
    if (chunk.file_type === NDX_FILE_TYPE_SYMBOLIC_LINK) {
      assertSafeSymlinkTarget(stagingRoot, chunk.relative_path, chunk.symlink_target)
      await mkdir(dirname(destination), { recursive: true })
      await symlink(chunk.symlink_target, destination)
      return
    }

    await mkdir(dirname(destination), { recursive: true })
    if (chunk.chunk.length > 0) {
      const bytes = useCompression ? decompressChunk(chunk.chunk) : chunk.chunk
      await appendFile(destination, bytes)
    }
    if (chunk.time) {
      const mtimeMs = Number(chunk.time.mtime) * 1000 + Math.floor(chunk.time.mtime_usec / 1000)
      const mtime = new Date(mtimeMs)
      await utimes(destination, mtime, mtime).catch(() => undefined)
    }
  }

  /** Real conflict-safe naming (spec §18 "Default must not silently replace") — appends " (1)", " (2)", etc. until a genuinely free name is found via real `fs.stat` checks. */
  async resolveConflictFreeName(destinationDir: string, baseName: string): Promise<string> {
    let candidate = baseName
    let counter = 1
    while (await pathExists(join(destinationDir, candidate))) {
      const dotIndex = baseName.lastIndexOf('.')
      const stem = dotIndex > 0 ? baseName.slice(0, dotIndex) : baseName
      const ext = dotIndex > 0 ? baseName.slice(dotIndex) : ''
      candidate = `${stem} (${counter})${ext}`
      counter += 1
    }
    return candidate
  }

  async commit(stagingRoot: string, destinationDir: string): Promise<string[]> {
    await mkdir(destinationDir, { recursive: true })
    const topLevelNames = await readdir(stagingRoot)
    const committed: string[] = []
    for (const name of topLevelNames) {
      const finalName = await this.resolveConflictFreeName(destinationDir, name)
      await rename(join(stagingRoot, name), join(destinationDir, finalName))
      committed.push(finalName)
    }
    await this.cleanup(stagingRoot)
    return committed
  }

  async cleanup(stagingRoot: string): Promise<void> {
    await rm(stagingRoot, { recursive: true, force: true })
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
