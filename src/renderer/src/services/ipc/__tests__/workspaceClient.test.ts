import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createWorkspace,
  discoverWorkspaces,
  listWorkspaces,
  pickWorkspaceFolder,
  removeWorkspace
} from '../workspaceClient'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('workspaceClient', () => {
  it('returns a real bridge-unavailable error when window.ndx is missing', async () => {
    const result = await listWorkspaces()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bridge-unavailable')
  })

  it('delegates list() to the real preload bridge', async () => {
    const list = vi.fn().mockResolvedValue({ ok: true, data: [] })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: { list }, files: {} }

    const result = await listWorkspaces()

    expect(list).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, data: [] })
  })

  it('delegates create() with the request payload', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: { id: 'w1' } })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: { create }, files: {} }

    await createWorkspace({ rootPath: '/tmp/project' })

    expect(create).toHaveBeenCalledWith({ rootPath: '/tmp/project' })
  })

  it('delegates remove() with the id', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: { remove }, files: {} }

    await removeWorkspace('w1')

    expect(remove).toHaveBeenCalledWith('w1')
  })

  it('delegates pickFolder()', async () => {
    const pickFolder = vi.fn().mockResolvedValue({ ok: true, data: '/tmp/picked' })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: { pickFolder }, files: {} }

    const result = await pickWorkspaceFolder()

    expect(result).toEqual({ ok: true, data: '/tmp/picked' })
  })

  it('delegates discover() with options', async () => {
    const discover = vi.fn().mockResolvedValue({ ok: true, data: [] })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: { discover }, files: {} }

    const result = await discoverWorkspaces({ sources: ['home'] })

    expect(discover).toHaveBeenCalledWith({ sources: ['home'] })
    expect(result).toEqual({ ok: true, data: [] })
  })
})
