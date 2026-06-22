import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { createTerminal, onTerminalData, writeTerminal } from '../terminalClient'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('terminalClient', () => {
  it('returns a bridge-unavailable result when preload is missing', async () => {
    const result = await createTerminal({ workspaceId: 'w1', cols: 80, rows: 24 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('bridge-unavailable')
  })

  it('delegates session creation and terminal input', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: {} })
    const write = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      terminal: { create, write } as never
    } as Partial<NdxBridge> as NdxBridge

    await createTerminal({ workspaceId: 'w1', relativeCwd: 'src', cols: 100, rows: 30 })
    await writeTerminal({ sessionId: '00000000-0000-4000-8000-000000000000', data: 'pwd\r' })

    expect(create).toHaveBeenCalledWith({
      workspaceId: 'w1',
      relativeCwd: 'src',
      cols: 100,
      rows: 30
    })
    expect(write).toHaveBeenCalledWith({
      sessionId: '00000000-0000-4000-8000-000000000000',
      data: 'pwd\r'
    })
  })

  it('delegates output subscriptions and their cleanup', () => {
    const unsubscribe = vi.fn()
    const onData = vi.fn().mockReturnValue(unsubscribe)
    const listener = vi.fn()
    window.ndx = {
      terminal: { onData } as never
    } as Partial<NdxBridge> as NdxBridge

    const cleanup = onTerminalData(listener)
    cleanup()

    expect(onData).toHaveBeenCalledWith(listener)
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
