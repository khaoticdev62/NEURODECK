import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GitService } from '../GitService'

const execFileAsync = promisify(execFile)

let root: string
let remoteDir: string
let localDir: string
let otherCloneDir: string
let service: GitService

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd })
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndx-git-remote-'))
  remoteDir = join(root, 'remote.git')
  localDir = join(root, 'local')
  otherCloneDir = join(root, 'other')
  service = new GitService()

  await git(root, ['init', '--bare', '--initial-branch=main', remoteDir])
  await git(root, ['clone', remoteDir, localDir])
  await git(localDir, ['config', 'user.email', 'test@example.com'])
  await git(localDir, ['config', 'user.name', 'Test User'])
  await writeFile(join(localDir, 'readme.md'), '# hello\n')
  await git(localDir, ['add', '.'])
  await git(localDir, ['commit', '-m', 'initial commit'])
  await git(localDir, ['push', 'origin', 'main'])
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('GitService remote operations', () => {
  it('lists the real configured remote with fetch/push URLs', async () => {
    const remotes = await service.remotes(localDir)
    expect(remotes).toEqual([{ name: 'origin', fetchUrl: remoteDir, pushUrl: remoteDir }])
  })

  it('rejects fetch/pull/push against an unknown remote', async () => {
    await expect(service.fetch(localDir, 'does-not-exist')).rejects.toThrow('Unknown remote')
    await expect(service.pull(localDir, 'does-not-exist', 'main')).rejects.toThrow('Unknown remote')
    await expect(service.push(localDir, 'does-not-exist', 'main')).rejects.toThrow('Unknown remote')
  })

  it('pushes real local commits to the bare remote', async () => {
    await writeFile(join(localDir, 'second.txt'), 'content')
    await git(localDir, ['add', '.'])
    await git(localDir, ['commit', '-m', 'second commit'])

    await service.push(localDir, 'origin', 'main')

    await git(root, ['clone', remoteDir, otherCloneDir])
    const log = await service.log(otherCloneDir)
    expect(log[0].message).toBe('second commit')
  })

  it('fetches and pulls real commits pushed by another clone', async () => {
    await git(root, ['clone', remoteDir, otherCloneDir])
    await git(otherCloneDir, ['config', 'user.email', 'other@example.com'])
    await git(otherCloneDir, ['config', 'user.name', 'Other User'])
    await writeFile(join(otherCloneDir, 'from-other.txt'), 'content')
    await git(otherCloneDir, ['add', '.'])
    await git(otherCloneDir, ['commit', '-m', 'from other clone'])
    await git(otherCloneDir, ['push', 'origin', 'main'])

    await service.fetch(localDir, 'origin')
    let status = await service.status(localDir)
    expect(status.behind).toBe(1)

    await service.pull(localDir, 'origin', 'main')
    status = await service.status(localDir)
    expect(status.behind).toBe(0)
    const log = await service.log(localDir)
    expect(log[0].message).toBe('from other clone')
  })

  it('saves, lists, and pops a real stash', async () => {
    await writeFile(join(localDir, 'readme.md'), '# hello\nuncommitted change\n')

    await service.stashSave(localDir, 'wip changes')
    const statusAfterStash = await service.status(localDir)
    expect(statusAfterStash.changes).toEqual([])

    const stashes = await service.stashList(localDir)
    expect(stashes).toEqual([{ index: 0, message: expect.stringContaining('wip changes') }])

    await service.stashPop(localDir, 0)
    const statusAfterPop = await service.status(localDir)
    expect(statusAfterPop.changes.find((c) => c.path === 'readme.md')).toBeTruthy()
    expect(await service.stashList(localDir)).toEqual([])
  })

  it('detects a real merge conflict and reports it in status', async () => {
    await git(root, ['clone', remoteDir, otherCloneDir])
    await git(otherCloneDir, ['config', 'user.email', 'other@example.com'])
    await git(otherCloneDir, ['config', 'user.name', 'Other User'])
    await writeFile(join(otherCloneDir, 'readme.md'), '# hello\nchanged by other\n')
    await git(otherCloneDir, ['add', '.'])
    await git(otherCloneDir, ['commit', '-m', 'change from other'])
    await git(otherCloneDir, ['push', 'origin', 'main'])

    await writeFile(join(localDir, 'readme.md'), '# hello\nchanged locally\n')
    await git(localDir, ['add', '.'])
    await git(localDir, ['commit', '-m', 'change locally'])

    await service.fetch(localDir, 'origin')
    await expect(service.pull(localDir, 'origin', 'main')).rejects.toThrow()

    const status = await service.status(localDir)
    expect(status.hasConflicts).toBe(true)
    expect(status.changes.some((c) => c.path === 'readme.md')).toBe(true)
  })

  it('force-pushes a real rewritten history to the bare remote', async () => {
    await writeFile(join(localDir, 'second.txt'), 'content')
    await git(localDir, ['add', '.'])
    await git(localDir, ['commit', '-m', 'second commit'])
    await git(localDir, ['commit', '--amend', '-m', 'rewritten second commit'])

    await service.forcePush(localDir, 'origin', 'main')

    await git(root, ['clone', remoteDir, otherCloneDir])
    const log = await service.log(otherCloneDir)
    expect(log[0].message).toBe('rewritten second commit')
  })

  it('rejects force-with-lease when the remote moved since the last fetch, instead of clobbering it', async () => {
    await git(root, ['clone', remoteDir, otherCloneDir])
    await git(otherCloneDir, ['config', 'user.email', 'other@example.com'])
    await git(otherCloneDir, ['config', 'user.name', 'Other User'])
    await writeFile(join(otherCloneDir, 'from-other.txt'), 'content')
    await git(otherCloneDir, ['add', '.'])
    await git(otherCloneDir, ['commit', '-m', 'from other clone'])
    await git(otherCloneDir, ['push', 'origin', 'main'])

    // localDir never fetched the other clone's push, so its view of origin/main is stale.
    await writeFile(join(localDir, 'second.txt'), 'content')
    await git(localDir, ['add', '.'])
    await git(localDir, ['commit', '-m', 'second commit'])

    await expect(service.forcePush(localDir, 'origin', 'main')).rejects.toThrow()

    const log = await service.log(otherCloneDir)
    expect(log[0].message).toBe('from other clone')
  })

  it('rejects force push against an unknown remote', async () => {
    await expect(service.forcePush(localDir, 'does-not-exist', 'main')).rejects.toThrow(
      'Unknown remote'
    )
  })
})
