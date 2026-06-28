import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  LanShareManifestBuilder,
  NDX_FILE_TYPE_DIRECTORY,
  NDX_FILE_TYPE_REGULAR,
  NDX_FILE_TYPE_SYMBOLIC_LINK,
  UnsafeSourcePathError
} from '../LanShareManifestBuilder'

describe('LanShareManifestBuilder', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-manifest-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('builds a real manifest for a single file with the real Gio file-type value', async () => {
    const filePath = join(dir, 'photo.png')
    await writeFile(filePath, Buffer.from('fake-image-bytes'))

    const manifest = await new LanShareManifestBuilder().build([filePath])

    expect(manifest.entries).toHaveLength(1)
    expect(manifest.entries[0].fileType).toBe(NDX_FILE_TYPE_REGULAR)
    expect(manifest.entries[0].sizeBytes).toBe(16)
    expect(manifest.totalBytes).toBe(16)
    expect(manifest.nameIfSingle).toBe('photo.png')
  })

  it('walks a real directory tree and reports real directory/file entries with posix-style relative paths', async () => {
    await mkdir(join(dir, 'project', 'src'), { recursive: true })
    await writeFile(join(dir, 'project', 'README.md'), 'hello')
    await writeFile(join(dir, 'project', 'src', 'index.ts'), 'export {}')

    const manifest = await new LanShareManifestBuilder().build([join(dir, 'project')])

    const relativePaths = manifest.entries.map((entry) => entry.relativePath).sort()
    expect(relativePaths).toEqual([
      'project',
      'project/README.md',
      'project/src',
      'project/src/index.ts'
    ])
    expect(manifest.entries.find((e) => e.relativePath === 'project')?.fileType).toBe(
      NDX_FILE_TYPE_DIRECTORY
    )
  })

  it('records a real symlink target without following it', async () => {
    const realFile = join(dir, 'real.txt')
    await writeFile(realFile, 'content')
    const linkPath = join(dir, 'link.txt')
    await symlink(realFile, linkPath)

    const manifest = await new LanShareManifestBuilder().build([linkPath])

    expect(manifest.entries[0].fileType).toBe(NDX_FILE_TYPE_SYMBOLIC_LINK)
    expect(manifest.entries[0].symlinkTarget).toBe(realFile)
    expect(manifest.entries[0].sizeBytes).toBe(0)
  })

  it('computes real top-level basenames and item count for multiple sources', async () => {
    const fileA = join(dir, 'a.txt')
    const fileB = join(dir, 'b.txt')
    await writeFile(fileA, 'a')
    await writeFile(fileB, 'bb')

    const manifest = await new LanShareManifestBuilder().build([fileA, fileB])

    expect(manifest.topDirBasenames).toEqual(['a.txt', 'b.txt'])
    expect(manifest.itemCount).toBe(2)
    expect(manifest.totalBytes).toBe(3)
    expect(manifest.nameIfSingle).toBeUndefined()
  })

  it('rejects an empty source list', async () => {
    await expect(new LanShareManifestBuilder().build([])).rejects.toThrow(UnsafeSourcePathError)
  })

  it('respects real cancellation via AbortSignal', async () => {
    await mkdir(join(dir, 'project'), { recursive: true })
    await writeFile(join(dir, 'project', 'file.txt'), 'x')
    const controller = new AbortController()
    controller.abort()

    await expect(
      new LanShareManifestBuilder().build([join(dir, 'project')], controller.signal)
    ).rejects.toThrow()
  })
})
