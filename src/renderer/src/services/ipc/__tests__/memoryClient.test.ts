import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportMemory } from '../memoryClient'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('memoryClient', () => {
  it('returns a real bridge-unavailable error when window.ndx is missing', async () => {
    const result = await exportMemory()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bridge-unavailable')
  })

  it('delegates export() with an optional filter payload', async () => {
    const exported = {
      schemaVersion: '1.0.0',
      exportedAt: 123,
      query: { scope: 'workspace', workspaceId: 'w1' },
      itemCount: 0,
      items: []
    }
    const exportMemoryFromBridge = vi.fn().mockResolvedValue({ ok: true, data: exported })
    // @ts-expect-error assigning the test stub for the preload-injected global
    window.ndx = { workspaces: {}, files: {}, memory: { export: exportMemoryFromBridge } }

    const result = await exportMemory({ scope: 'workspace', workspaceId: 'w1' })

    expect(exportMemoryFromBridge).toHaveBeenCalledWith({ scope: 'workspace', workspaceId: 'w1' })
    expect(result).toEqual({ ok: true, data: exported })
  })
})
