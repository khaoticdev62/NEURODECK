import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GitService } from '../GitService'

const execFileAsync = promisify(execFile)

let dir: string
let service: GitService

async function git(args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd: dir })
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-git-'))
  service = new GitService()
  await git(['init', '--initial-branch=main'])
  await git(['config', 'user.email', 'test@example.com'])
  await git(['config', 'user.name', 'Test User'])
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('GitService', () => {
  it('reports isRepository false for a plain (non-git) directory', async () => {
    const plainDir = await mkdtemp(join(tmpdir(), 'ndx-plain-'))
    expect(await service.isRepository(plainDir)).toBe(false)
    await rm(plainDir, { recursive: true, force: true })
  })

  it('reports isRepository true and a real branch for a freshly initialized repo', async () => {
    await writeFile(join(dir, 'readme.md'), '# hi')
    await git(['add', '.'])
    await git(['commit', '-m', 'initial commit'])

    const status = await service.status(dir)

    expect(status.isRepository).toBe(true)
    expect(status.branch).toBe('main')
    expect(status.changes).toEqual([])
  })

  it('lists real untracked and staged changes', async () => {
    await writeFile(join(dir, 'tracked.txt'), 'v1')
    await git(['add', 'tracked.txt'])
    await git(['commit', '-m', 'add tracked'])

    await writeFile(join(dir, 'tracked.txt'), 'v2')
    await writeFile(join(dir, 'untracked.txt'), 'new')
    await git(['add', 'untracked.txt'])

    const status = await service.status(dir)

    const untracked = status.changes.find((c) => c.path === 'untracked.txt')
    const modified = status.changes.find((c) => c.path === 'tracked.txt')
    expect(untracked).toMatchObject({ staged: true })
    expect(modified).toMatchObject({ staged: false })
  })

  it('preserves paths with spaces and exposes staged and working-tree patches separately', async () => {
    const path = 'notes with spaces.txt'
    await writeFile(join(dir, path), 'v1\n')
    await git(['add', path])
    await git(['commit', '-m', 'initial'])
    await writeFile(join(dir, path), 'v2\n')
    await git(['add', path])
    await writeFile(join(dir, path), 'v3\n')

    const status = await service.status(dir)
    const changes = status.changes.filter((change) => change.path === path)

    expect(changes).toHaveLength(2)
    expect(changes.map((change) => change.staged).sort()).toEqual([false, true])
    expect(await service.diff(dir, path, true)).toContain('+v2')
    expect(await service.diff(dir, path, false)).toContain('+v3')
  })

  it('stages and unstages real files', async () => {
    await writeFile(join(dir, 'a.txt'), 'content')

    await service.stage(dir, ['a.txt'])
    let status = await service.status(dir)
    expect(status.changes.find((c) => c.path === 'a.txt')?.staged).toBe(true)

    await service.unstage(dir, ['a.txt'])
    status = await service.status(dir)
    expect(status.changes.find((c) => c.path === 'a.txt')?.staged).toBe(false)
  })

  it('creates a real commit', async () => {
    await writeFile(join(dir, 'a.txt'), 'content')
    await service.stage(dir, ['a.txt'])

    await service.commit(dir, 'add a.txt')

    const log = await service.log(dir)
    expect(log[0].message).toBe('add a.txt')
    expect(log[0].author).toBe('Test User')
  })

  it('returns a real unified diff for a staged file', async () => {
    await writeFile(join(dir, 'a.txt'), 'line1\n')
    await git(['add', 'a.txt'])
    await git(['commit', '-m', 'init'])
    await writeFile(join(dir, 'a.txt'), 'line1\nline2\n')
    await service.stage(dir, ['a.txt'])

    const diff = await service.diff(dir, 'a.txt', true)

    expect(diff).toContain('+line2')
  })

  it('returns a real unified diff for an untracked file', async () => {
    await writeFile(join(dir, 'new.txt'), 'first line\n')

    const diff = await service.diff(dir, 'new.txt', false)

    expect(diff).toContain('+first line')
    expect(diff).toContain('new.txt')
  })

  it('lists real branches and checks out a new one', async () => {
    await writeFile(join(dir, 'a.txt'), 'content')
    await git(['add', '.'])
    await git(['commit', '-m', 'init'])
    await git(['branch', 'feature/test'])

    const branches = await service.branches(dir)
    expect(branches.map((b) => b.name).sort()).toEqual(['feature/test', 'main'])
    expect(branches.find((b) => b.name === 'main')?.current).toBe(true)

    await service.checkout(dir, 'feature/test')
    const after = await service.branches(dir)
    expect(after.find((b) => b.name === 'feature/test')?.current).toBe(true)
  })

  it('rejects checkout targets that are not exact local branch names', async () => {
    await expect(service.checkout(dir, '--detach')).rejects.toThrow('Local branch does not exist')
  })

  it('returns real commit history in order', async () => {
    await writeFile(join(dir, 'a.txt'), '1')
    await git(['add', '.'])
    await git(['commit', '-m', 'first'])
    await writeFile(join(dir, 'a.txt'), '2')
    await git(['add', '.'])
    await git(['commit', '-m', 'second'])

    const log = await service.log(dir)

    expect(log).toHaveLength(2)
    expect(log[0].message).toBe('second')
    expect(log[1].message).toBe('first')
    expect(log[0].shortHash).toHaveLength(7)
  })

  it('restores a real tracked file back to its HEAD content, discarding the uncommitted edit', async () => {
    await writeFile(join(dir, 'tracked.txt'), 'committed content')
    await git(['add', '.'])
    await git(['commit', '-m', 'initial'])
    await writeFile(join(dir, 'tracked.txt'), 'uncommitted edit')

    await service.restore(dir, ['tracked.txt'])

    const status = await service.status(dir)
    expect(status.changes).toEqual([])
  })

  it('rejects restoring an untracked file (nothing committed to restore to)', async () => {
    await writeFile(join(dir, 'readme.md'), '# hi')
    await git(['add', '.'])
    await git(['commit', '-m', 'initial'])
    await writeFile(join(dir, 'new-untracked.txt'), 'never committed')

    await expect(service.restore(dir, ['new-untracked.txt'])).rejects.toThrow()
  })

  it('creates a real new branch without switching to it', async () => {
    await writeFile(join(dir, 'readme.md'), '# hi')
    await git(['add', '.'])
    await git(['commit', '-m', 'initial'])

    await service.createBranch(dir, 'feature/new-thing')

    const branches = await service.branches(dir)
    expect(branches.map((b) => b.name)).toContain('feature/new-thing')
    expect(branches.find((b) => b.name === 'feature/new-thing')?.current).toBe(false)
  })

  it('safely refuses to delete a branch with unmerged commits, but force deletes it when asked', async () => {
    await writeFile(join(dir, 'readme.md'), '# hi')
    await git(['add', '.'])
    await git(['commit', '-m', 'initial'])
    await git(['checkout', '-b', 'feature/doomed'])
    await writeFile(join(dir, 'only-on-branch.txt'), 'unmerged')
    await git(['add', '.'])
    await git(['commit', '-m', 'unmerged commit'])
    await git(['checkout', 'main'])

    await expect(service.deleteBranch(dir, 'feature/doomed', false)).rejects.toThrow()
    expect((await service.branches(dir)).map((b) => b.name)).toContain('feature/doomed')

    await service.deleteBranch(dir, 'feature/doomed', true)
    expect((await service.branches(dir)).map((b) => b.name)).not.toContain('feature/doomed')
  })
})
