import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { useOpenFiles } from '../useOpenFiles'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('useOpenFiles', () => {
  it('opens a real file and makes it active', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'hello', truncated: false, sizeBytes: 5 } })
    stubBridge({ files: { read, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))

    await act(async () => {
      await result.current.openFile('readme.md')
    })

    expect(read).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: 'readme.md' })
    expect(result.current.activePath).toBe('readme.md')
    expect(result.current.openFiles).toEqual([
      { path: 'readme.md', content: 'hello', truncated: false, error: null }
    ])
  })

  it('does not re-fetch a file that is already open, just activates it', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'a', truncated: false, sizeBytes: 1 } })
    stubBridge({ files: { read, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))
    await act(async () => {
      await result.current.openFile('a.txt')
    })
    await act(async () => {
      await result.current.openFile('a.txt')
    })

    expect(read).toHaveBeenCalledTimes(1)
  })

  it('records a real error when the read fails', async () => {
    const read = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        userMessage: 'Permission denied',
        code: 'x',
        message: 'x',
        category: 'system',
        retryable: false,
        correlationId: '1'
      }
    })
    stubBridge({ files: { read, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))
    await act(async () => {
      await result.current.openFile('secret.txt')
    })

    expect(result.current.openFiles[0]).toEqual({
      path: 'secret.txt',
      content: '',
      truncated: false,
      error: 'Permission denied'
    })
  })

  it('closes a file and falls back to the previous tab', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'x', truncated: false, sizeBytes: 1 } })
    stubBridge({ files: { read, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))
    await act(async () => {
      await result.current.openFile('a.txt')
    })
    await act(async () => {
      await result.current.openFile('b.txt')
    })

    act(() => {
      result.current.closeFile('b.txt')
    })

    await waitFor(() => {
      expect(result.current.openFiles.map((file) => file.path)).toEqual(['a.txt'])
    })
    expect(result.current.activePath).toBe('a.txt')
  })
})
