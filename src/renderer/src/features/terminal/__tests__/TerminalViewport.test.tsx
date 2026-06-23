import { createRef } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, NdxResult, TerminalDataEvent, TerminalSnapshot } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { TerminalViewport, type TerminalViewportHandle } from '../TerminalViewport'

const terminalMocks = vi.hoisted(() => ({
  write: vi.fn(),
  open: vi.fn(),
  focus: vi.fn(),
  dispose: vi.fn(),
  loadAddon: vi.fn(),
  onData: vi.fn(() => ({ dispose: vi.fn() })),
  fit: vi.fn(),
  findNext: vi.fn(),
  findPrevious: vi.fn(),
  clearDecorations: vi.fn(),
  getSelection: vi.fn()
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 100
    rows = 30
    write = terminalMocks.write
    open = terminalMocks.open
    focus = terminalMocks.focus
    dispose = terminalMocks.dispose
    loadAddon = terminalMocks.loadAddon
    onData = terminalMocks.onData
    getSelection = terminalMocks.getSelection
  }
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = terminalMocks.fit
  }
}))

vi.mock('@xterm/addon-search', () => ({
  SearchAddon: class {
    findNext = terminalMocks.findNext
    findPrevious = terminalMocks.findPrevious
    clearDecorations = terminalMocks.clearDecorations
  }
}))

class TestResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
}

const session = {
  id: '00000000-0000-4000-8000-000000000001',
  workspaceId: 'w1',
  shell: 'bash',
  cwd: '/workspace',
  pid: 123,
  cols: 100,
  rows: 30,
  createdAt: 1,
  status: 'running' as const,
  exitCode: null
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
  vi.unstubAllGlobals()
})

describe('TerminalViewport', () => {
  it('hydrates a snapshot and appends only newer queued stream events', async () => {
    let dataListener: ((event: TerminalDataEvent) => void) | undefined
    let resolveSnapshot: ((result: NdxResult<TerminalSnapshot>) => void) | undefined
    const snapshot = new Promise<NdxResult<TerminalSnapshot>>((resolve) => {
      resolveSnapshot = resolve
    })
    window.ndx = {
      terminal: {
        snapshot: vi.fn().mockReturnValue(snapshot),
        onData: vi.fn((listener) => {
          dataListener = listener
          return vi.fn()
        })
      } as never
    } as Partial<NdxBridge> as NdxBridge

    render(
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <TerminalViewport session={session} onError={vi.fn()} />
      </FocusEngineProvider>
    )

    act(() => {
      dataListener?.({ sessionId: session.id, data: 'duplicate', sequence: 1 })
      dataListener?.({ sessionId: session.id, data: 'new output', sequence: 2 })
      resolveSnapshot?.({
        ok: true,
        data: { session, output: 'snapshot output', truncated: false, lastSequence: 1 }
      })
    })

    await waitFor(() => expect(terminalMocks.write).toHaveBeenCalledTimes(2))
    expect(terminalMocks.write).toHaveBeenNthCalledWith(1, 'snapshot output')
    expect(terminalMocks.write).toHaveBeenNthCalledWith(2, 'new output')
  })

  it('exposes findNext/findPrevious/copySelection through the imperative handle', async () => {
    window.ndx = {
      terminal: {
        snapshot: vi.fn().mockResolvedValue({
          ok: true,
          data: { session, output: '', truncated: false, lastSequence: 0 }
        }),
        onData: vi.fn(() => vi.fn())
      } as never
    } as Partial<NdxBridge> as NdxBridge
    terminalMocks.findNext.mockReturnValue(true)
    terminalMocks.findPrevious.mockReturnValue(false)
    terminalMocks.getSelection.mockReturnValue('selected text')
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const ref = createRef<TerminalViewportHandle>()
    render(
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <TerminalViewport ref={ref} session={session} onError={vi.fn()} />
      </FocusEngineProvider>
    )
    await waitFor(() => expect(terminalMocks.loadAddon).toHaveBeenCalled())

    expect(ref.current?.findNext('hello')).toBe(true)
    expect(terminalMocks.findNext).toHaveBeenCalledWith('hello')
    expect(ref.current?.findPrevious('world')).toBe(false)
    expect(terminalMocks.findPrevious).toHaveBeenCalledWith('world')

    expect(ref.current?.copySelection()).toBe(true)
    expect(writeText).toHaveBeenCalledWith('selected text')
  })
})
