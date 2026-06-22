import { afterEach, describe, expect, it, vi } from 'vitest'
import { listFiles, readFile } from '../fileClient'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('fileClient', () => {
  it('returns a real bridge-unavailable error when window.ndx is missing', async () => {
    const result = await listFiles({ workspaceId: 'w1', relativePath: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bridge-unavailable')
  })

  it('delegates list() with the request payload', async () => {
    const list = vi.fn().mockResolvedValue({ ok: true, data: [] })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: {}, files: { list } }

    await listFiles({ workspaceId: 'w1', relativePath: 'src' })

    expect(list).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: 'src' })
  })

  it('delegates read() with the request payload', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'hi', truncated: false, sizeBytes: 2 } })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: {}, files: { read } }

    const result = await readFile({ workspaceId: 'w1', relativePath: 'readme.md' })

    expect(read).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: 'readme.md' })
    expect(result).toEqual({ ok: true, data: { content: 'hi', truncated: false, sizeBytes: 2 } })
  })
})
