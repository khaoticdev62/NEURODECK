import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveTerminalCwd, TerminalPathOutsideWorkspaceError } from '../TerminalPathPolicy'

let root: string
let outside: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndx-terminal-root-'))
  outside = await mkdtemp(join(tmpdir(), 'ndx-terminal-outside-'))
})

afterEach(async () => {
  await Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(outside, { recursive: true, force: true })
  ])
})

describe('resolveTerminalCwd', () => {
  it('resolves a real directory inside the workspace', async () => {
    await mkdir(join(root, 'src'))
    expect(await resolveTerminalCwd(root, 'src')).toBe(await resolveTerminalCwd(join(root, 'src')))
  })

  it('rejects parent traversal and files', async () => {
    await writeFile(join(root, 'file.txt'), 'content')
    await expect(resolveTerminalCwd(root, '..')).rejects.toBeInstanceOf(
      TerminalPathOutsideWorkspaceError
    )
    await expect(resolveTerminalCwd(root, 'file.txt')).rejects.toBeInstanceOf(
      TerminalPathOutsideWorkspaceError
    )
  })

  it('rejects a symlink that resolves outside the workspace', async () => {
    await symlink(outside, join(root, 'escape'), 'junction')
    await expect(resolveTerminalCwd(root, 'escape')).rejects.toBeInstanceOf(
      TerminalPathOutsideWorkspaceError
    )
  })
})
