import { mkdtemp, readFile, readdir, readlink, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compressChunk } from '../grpc/fileChunkCompression'
import type { NdxFileChunk } from '../grpc/LanShareTransferServer'
import { LanShareReceiveEngine } from '../LanShareReceiveEngine'
import { UnsafeDestinationPathError } from '../receivePathSafety'

function chunk(overrides: Partial<NdxFileChunk>): NdxFileChunk {
  return {
    relative_path: 'file.txt',
    file_type: 1,
    symlink_target: '',
    chunk: Buffer.alloc(0),
    file_mode: 0o644,
    ...overrides
  }
}

describe('LanShareReceiveEngine', () => {
  let dir: string
  let engine: LanShareReceiveEngine

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-receive-'))
    engine = new LanShareReceiveEngine()
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('stages real directory, file, and symlink chunks safely', async () => {
    const stagingRoot = engine.stagingRootFor(dir, 'job-1')
    await engine.beginStaging(stagingRoot)

    await engine.writeChunk(stagingRoot, chunk({ relative_path: 'project', file_type: 2 }), false)
    await engine.writeChunk(
      stagingRoot,
      chunk({ relative_path: 'project/a.txt', chunk: Buffer.from('hello ') }),
      false
    )
    await engine.writeChunk(
      stagingRoot,
      chunk({ relative_path: 'project/a.txt', chunk: Buffer.from('world') }),
      false
    )
    await engine.writeChunk(
      stagingRoot,
      chunk({
        relative_path: 'project/link.txt',
        file_type: 3,
        symlink_target: 'a.txt'
      }),
      false
    )

    const fileContent = await readFile(join(stagingRoot, 'project', 'a.txt'), 'utf-8')
    expect(fileContent).toBe('hello world')
    const linkTarget = await readlink(join(stagingRoot, 'project', 'link.txt'))
    expect(linkTarget).toBe('a.txt')
  })

  it('decompresses real zlib-compressed chunks when use_compression is set', async () => {
    const stagingRoot = engine.stagingRootFor(dir, 'job-2')
    await engine.beginStaging(stagingRoot)
    const original = 'real content that gets compressed for the wire'
    await engine.writeChunk(
      stagingRoot,
      chunk({ relative_path: 'doc.txt', chunk: compressChunk(Buffer.from(original)) }),
      true
    )
    const written = await readFile(join(stagingRoot, 'doc.txt'), 'utf-8')
    expect(written).toBe(original)
  })

  it('rejects an unsafe relative path during staging', async () => {
    const stagingRoot = engine.stagingRootFor(dir, 'job-3')
    await engine.beginStaging(stagingRoot)
    await expect(
      engine.writeChunk(stagingRoot, chunk({ relative_path: '../../escape.txt' }), false)
    ).rejects.toThrow(UnsafeDestinationPathError)
  })

  it('commits real staged files into the destination atomically and cleans up staging', async () => {
    const stagingRoot = engine.stagingRootFor(dir, 'job-4')
    await engine.beginStaging(stagingRoot)
    await engine.writeChunk(
      stagingRoot,
      chunk({ relative_path: 'result.txt', chunk: Buffer.from('done') }),
      false
    )

    const destinationDir = join(dir, 'destination')
    const committed = await engine.commit(stagingRoot, destinationDir)

    expect(committed).toEqual(['result.txt'])
    const finalContent = await readFile(join(destinationDir, 'result.txt'), 'utf-8')
    expect(finalContent).toBe('done')
    await expect(stat(stagingRoot)).rejects.toThrow()
  })

  it('never silently replaces a real existing file — uses conflict-safe naming', async () => {
    const destinationDir = join(dir, 'destination')
    await writeFile(join(dir, 'placeholder'), '')
    const stagingRoot1 = engine.stagingRootFor(dir, 'job-5')
    await engine.beginStaging(stagingRoot1)
    await engine.writeChunk(
      stagingRoot1,
      chunk({ relative_path: 'photo.png', chunk: Buffer.from('first') }),
      false
    )
    await engine.commit(stagingRoot1, destinationDir)

    const stagingRoot2 = engine.stagingRootFor(dir, 'job-6')
    await engine.beginStaging(stagingRoot2)
    await engine.writeChunk(
      stagingRoot2,
      chunk({ relative_path: 'photo.png', chunk: Buffer.from('second') }),
      false
    )
    await engine.commit(stagingRoot2, destinationDir)

    const names = (await readdir(destinationDir)).sort()
    expect(names).toEqual(['photo (1).png', 'photo.png'])
    expect(await readFile(join(destinationDir, 'photo.png'), 'utf-8')).toBe('first')
    expect(await readFile(join(destinationDir, 'photo (1).png'), 'utf-8')).toBe('second')
  })
})
