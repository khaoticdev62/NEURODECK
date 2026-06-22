import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WorkspaceStore } from '../WorkspaceStore'

let dir: string
let projectDir: string
let store: WorkspaceStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-workspaces-'))
  projectDir = join(dir, 'my-project')
  await import('node:fs/promises').then((fs) => fs.mkdir(projectDir))
  store = new WorkspaceStore(join(dir, 'store', 'workspaces.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('WorkspaceStore', () => {
  it('starts with an empty list', async () => {
    expect(await store.list()).toEqual([])
  })

  it('creates a workspace from a real, existing directory', async () => {
    const workspace = await store.create(projectDir)

    expect(workspace.name).toBe('my-project')
    expect(workspace.rootPath).toBe(projectDir)
    expect(await store.list()).toHaveLength(1)
  })

  it('rejects a path that does not exist', async () => {
    await expect(store.create(join(dir, 'does-not-exist'))).rejects.toThrow()
  })

  it('rejects a path that is a file, not a directory', async () => {
    const { writeFile } = await import('node:fs/promises')
    const filePath = join(dir, 'a-file.txt')
    await writeFile(filePath, 'hello')

    await expect(store.create(filePath)).rejects.toThrow(/not a directory/)
  })

  it('removes a workspace by id', async () => {
    const workspace = await store.create(projectDir)
    await store.remove(workspace.id)

    expect(await store.list()).toEqual([])
  })

  it('persists across separate store instances pointed at the same file', async () => {
    const workspace = await store.create(projectDir)
    const secondStore = new WorkspaceStore(join(dir, 'store', 'workspaces.json'))

    expect(await secondStore.get(workspace.id)).toEqual(workspace)
  })
})
