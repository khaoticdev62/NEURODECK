import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GitService } from '../../git/GitService'
import { RemoteHostStore } from '../../remote/RemoteHostStore'
import { WorkspaceDiscoveryService } from '../WorkspaceDiscoveryService'

const execFileAsync = promisify(execFile)

const mockCipher = {
  isAvailable: () => true,
  encrypt: (plain: string) => `enc:${plain}`,
  decrypt: (cipher: string) => cipher.replace(/^enc:/, '')
}

let dir: string
let gitService: GitService
let remoteHostStore: RemoteHostStore

async function initGitRepo(repoPath: string): Promise<void> {
  await mkdir(repoPath, { recursive: true })
  await execFileAsync('git', ['init', repoPath])
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-discovery-'))
  gitService = new GitService()
  remoteHostStore = new RemoteHostStore(join(dir, 'remote-hosts.json'), mockCipher)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function makeService(overrides?: {
  homeDir?: string
  steamAppsRoots?: string[]
  mountRoots?: string[]
}): WorkspaceDiscoveryService {
  return new WorkspaceDiscoveryService(gitService, remoteHostStore, overrides)
}

describe('WorkspaceDiscoveryService', () => {
  it('finds home projects by marker files', async () => {
    const home = join(dir, 'home')
    await mkdir(join(home, 'web-app'), { recursive: true })
    await mkdir(join(home, 'rust-tool'), { recursive: true })
    await mkdir(join(home, 'plain-folder'), { recursive: true })
    await writeFile(join(home, 'web-app', 'package.json'), '{}')
    await writeFile(join(home, 'rust-tool', 'Cargo.toml'), '[package]')

    const service = makeService({ homeDir: home })
    const found = await service.discover({ sources: ['home'] })

    expect(found.map((f) => f.name).sort()).toEqual(['rust-tool', 'web-app'])
    expect(found.every((f) => f.source === 'home')).toBe(true)
  })

  it('finds git repositories up to the bounded depth', async () => {
    const home = join(dir, 'home')
    await initGitRepo(join(home, 'shallow-repo'))
    await initGitRepo(join(home, 'nested', 'deep-repo'))
    await mkdir(join(home, 'not-a-repo'), { recursive: true })
    await writeFile(join(home, 'not-a-repo', 'README.md'), 'hi')

    const service = makeService({ homeDir: home })
    const found = await service.discover({ sources: ['git'] })

    expect(found.map((f) => f.name).sort()).toEqual(['deep-repo', 'shallow-repo'])
    expect(found.every((f) => f.source === 'git')).toBe(true)
  })

  it('lists saved SSH hosts', async () => {
    await remoteHostStore.add({
      name: 'Deck dev box',
      hostname: 'deck.local',
      port: 22,
      username: 'deck',
      authMethod: 'password',
      secret: 'secret'
    })

    const service = makeService()
    const found = await service.discover({ sources: ['ssh'] })

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      name: 'Deck dev box',
      source: 'ssh',
      rootPath: 'deck@deck.local:22',
      reachable: true
    })
  })

  it('discovers removable mount points', async () => {
    const mounts = join(dir, 'mounts')
    await mkdir(join(mounts, 'USB-1'), { recursive: true })
    await mkdir(join(mounts, 'SD-Card'), { recursive: true })
    await writeFile(join(mounts, 'not-a-dir.txt'), 'x')

    const service = makeService({ mountRoots: [mounts] })
    const found = await service.discover({ sources: ['removable'] })

    expect(found.map((f) => f.name).sort()).toEqual(['SD-Card', 'USB-1'])
  })

  it('discovers Steam games from appmanifest files', async () => {
    const steam = join(dir, 'steam', 'steamapps')
    await mkdir(steam, { recursive: true })
    await mkdir(join(steam, 'common', 'Hades'), { recursive: true })
    await writeFile(
      join(steam, 'appmanifest_1145360.acf'),
      '"AppState"\n{\n  "appid" "1145360"\n  "name" "Hades"\n  "installdir" "Hades"\n}'
    )
    await writeFile(
      join(steam, 'appmanifest_9999999.acf'),
      '"AppState"\n{\n  "appid" "9999999"\n  "name" "Missing"\n  "installdir" "MissingGame"\n}'
    )

    const service = makeService({ steamAppsRoots: [steam] })
    const found = await service.discover({ sources: ['steam'] })

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      id: 'steam-1145360',
      name: 'Hades',
      source: 'steam'
    })
  })

  it('deduplicates a folder that matches both home and git sources', async () => {
    const home = join(dir, 'home')
    const project = join(home, 'my-project')
    await mkdir(project, { recursive: true })
    await writeFile(join(project, 'package.json'), '{}')
    await initGitRepo(project)

    const service = makeService({ homeDir: home })
    const found = await service.discover({ sources: ['home', 'git'] })

    expect(found).toHaveLength(1)
    expect(found[0].name).toBe('my-project')
  })

  it('returns empty results instead of crashing when a source directory is unreadable', async () => {
    const service = makeService({ homeDir: join(dir, 'does-not-exist') })
    const found = await service.discover({ sources: ['home'] })

    expect(found).toEqual([])
  })

  it('limits git discovery to the configured max depth', async () => {
    const home = join(dir, 'home')
    await initGitRepo(join(home, 'a', 'b', 'c', 'too-deep'))

    const service = makeService({ homeDir: home })
    const found = await service.discover({ sources: ['git'] })

    expect(found).toHaveLength(0)
  })
})
