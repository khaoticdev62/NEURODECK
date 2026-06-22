import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, NdxResult, TerminalDataEvent, TerminalSnapshot } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { TerminalViewport } from '../TerminalViewport'

const terminalMocks = vi.hoisted(() => ({
  write: vi.fn(),
  open: vi.fn(),
  focus: vi.fn(),
  dispose: vi.fn(),
  loadAddon: vi.fn(),
  onData: vi.fn(() => ({ dispose: vi.fn() })),
  fit: vi.fn()
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
  }
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = terminalMocks.fit
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
})
