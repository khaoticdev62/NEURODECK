import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileService, PathOutsideWorkspaceError } from '../FileService'

let dir: string
let root: string
let service: FileService

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-fileservice-'))
  root = join(dir, 'workspace')
  await mkdir(root)
  service = new FileService()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('FileService.list', () => {
  it('lists real files and directories with metadata', async () => {
    await writeFile(join(root, 'readme.md'), '# Hello')
    await mkdir(join(root, 'src'))

    const entries = await service.list(root, '')

    expect(entries.map((e) => e.name)).toEqual(['src', 'readme.md']) // directories sort first
    const file = entries.find((e) => e.name === 'readme.md')!
    expect(file.isDirectory).toBe(false)
    expect(file.sizeBytes).toBe(Buffer.byteLength('# Hello'))
  })

  it('lists a subdirectory by relative path', async () => {
    await mkdir(join(root, 'src'))
    await writeFile(join(root, 'src', 'index.ts'), 'export {}')

    const entries = await service.list(root, 'src')

    expect(entries.map((e) => e.name)).toEqual(['index.ts'])
  })

  it('rejects a relative path that escapes the workspace root via "../"', async () => {
    await mkdir(join(dir, 'outside'))

    await expect(service.list(root, '../outside')).rejects.toThrow(PathOutsideWorkspaceError)
  })

  it('rejects a symlink inside the root that points outside it', async () => {
    const secretDir = join(dir, 'secret')
    await mkdir(secretDir)
    await writeFile(join(secretDir, 'passwords.txt'), 'super secret')
    await symlink(secretDir, join(root, 'escape-link'), 'dir')

    await expect(service.list(root, 'escape-link')).rejects.toThrow(PathOutsideWorkspaceError)
  })
})

describe('FileService.read', () => {
  it('reads real file content', async () => {
    await writeFile(join(root, 'notes.txt'), 'hello world')

    const result = await service.read(root, 'notes.txt')

    expect(result).toEqual({ content: 'hello world', truncated: false, sizeBytes: 11 })
  })

  it('rejects reading a directory as a file', async () => {
    await mkdir(join(root, 'src'))

    await expect(service.read(root, 'src')).rejects.toThrow(/is a directory/)
  })

  it('rejects a read that escapes the workspace root', async () => {
    await writeFile(join(dir, 'outside.txt'), 'nope')

    await expect(service.read(root, '../outside.txt')).rejects.toThrow(PathOutsideWorkspaceError)
  })

  it('truncates files larger than the preview cap', async () => {
    const big = 'x'.repeat(300 * 1024)
    await writeFile(join(root, 'big.txt'), big)

    const result = await service.read(root, 'big.txt')

    expect(result.truncated).toBe(true)
    expect(result.content.length).toBeLessThan(big.length)
    expect(result.sizeBytes).toBe(big.length)
  })
})

describe('FileService.readIfExists', () => {
  it('returns the real content when the file exists', async () => {
    await writeFile(join(root, 'a.txt'), 'hello')
    expect(await service.readIfExists(root, 'a.txt')).toBe('hello')
  })

  it('returns null when the file does not exist', async () => {
    expect(await service.readIfExists(root, 'missing.txt')).toBeNull()
  })
})

describe('FileService.write', () => {
  it('creates a real new file atomically', async () => {
    await service.write(root, 'new.txt', 'hello')

    expect(await service.read(root, 'new.txt')).toEqual({
      content: 'hello',
      truncated: false,
      sizeBytes: 5
    })
  })

  it('overwrites an existing real file', async () => {
    await writeFile(join(root, 'a.txt'), 'old')

    await service.write(root, 'a.txt', 'new content')

    expect((await service.read(root, 'a.txt')).content).toBe('new content')
  })

  it('creates a file inside a real subdirectory', async () => {
    await mkdir(join(root, 'src'))

    await service.write(root, 'src/index.ts', 'export {}')

    expect((await service.read(root, 'src/index.ts')).content).toBe('export {}')
  })

  it('rejects a write that escapes the workspace root', async () => {
    await expect(service.write(root, '../outside.txt', 'nope')).rejects.toThrow(
      PathOutsideWorkspaceError
    )
  })

  it('rejects a write through a symlinked subdirectory that escapes the root', async () => {
    const secretDir = join(dir, 'secret')
    await mkdir(secretDir)
    await symlink(secretDir, join(root, 'escape-link'), 'dir')

    await expect(service.write(root, 'escape-link/evil.txt', 'nope')).rejects.toThrow(
      PathOutsideWorkspaceError
    )
  })

  it('does not leave a temp file behind after a successful write', async () => {
    await service.write(root, 'a.txt', 'content')

    const { readdir } = await import('node:fs/promises')
    const files = await readdir(root)
    expect(files).toEqual(['a.txt'])
  })
})
