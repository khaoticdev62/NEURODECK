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
      {
        path: 'readme.md',
        content: 'hello',
        savedContent: 'hello',
        truncated: false,
        error: null,
        saveError: null,
        saving: false
      }
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
      savedContent: '',
      truncated: false,
      error: 'Permission denied',
      saveError: null,
      saving: false
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

  it('updateContent marks the file dirty relative to savedContent', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'v1', truncated: false, sizeBytes: 2 } })
    stubBridge({ files: { read, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))
    await act(async () => {
      await result.current.openFile('a.txt')
    })

    act(() => {
      result.current.updateContent('a.txt', 'v2')
    })

    expect(result.current.openFiles[0].content).toBe('v2')
    expect(result.current.openFiles[0].savedContent).toBe('v1')
  })

  it('saveFile writes the real edited content and updates savedContent on success', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'v1', truncated: false, sizeBytes: 2 } })
    const write = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({ files: { read, write, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))
    await act(async () => {
      await result.current.openFile('a.txt')
    })
    act(() => {
      result.current.updateContent('a.txt', 'v2')
    })

    let saved = false
    await act(async () => {
      saved = await result.current.saveFile('a.txt', 'edit a.txt')
    })

    expect(saved).toBe(true)
    expect(write).toHaveBeenCalledWith({
      workspaceId: 'w1',
      relativePath: 'a.txt',
      content: 'v2',
      description: 'edit a.txt'
    })
    expect(result.current.openFiles[0].savedContent).toBe('v2')
    expect(result.current.openFiles[0].saving).toBe(false)
  })

  it('saveFile records a real error and leaves savedContent unchanged on failure', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'v1', truncated: false, sizeBytes: 2 } })
    const write = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        userMessage: 'Disk full',
        code: 'x',
        message: 'x',
        category: 'system',
        retryable: false,
        correlationId: '1'
      }
    })
    stubBridge({ files: { read, write, list: vi.fn() } as never })

    const { result } = renderHook(() => useOpenFiles('w1'))
    await act(async () => {
      await result.current.openFile('a.txt')
    })
    act(() => {
      result.current.updateContent('a.txt', 'v2')
    })

    let saved = true
    await act(async () => {
      saved = await result.current.saveFile('a.txt', 'edit a.txt')
    })

    expect(saved).toBe(false)
    expect(result.current.openFiles[0].saveError).toBe('Disk full')
    expect(result.current.openFiles[0].savedContent).toBe('v1')
  })
})
