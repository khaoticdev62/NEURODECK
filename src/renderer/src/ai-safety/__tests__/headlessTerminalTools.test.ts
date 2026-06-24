import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { createHeadlessTerminalTools } from '../tools/headlessTerminalTools'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('headlessTerminalTools', () => {
  it('registers fixed risk/capability variants', () => {
    const tools = createHeadlessTerminalTools()
    expect(tools.map((tool) => [tool.id, tool.risk, tool.requiredCapability])).toEqual([
      ['terminal-headless-low', 'low', 'terminal.execute'],
      ['terminal-headless-medium', 'medium', 'terminal.execute'],
      ['terminal-headless-high', 'high', 'terminal.execute'],
      ['terminal-headless-privileged', 'critical', 'terminal.privileged']
    ])
  })

  it('validates arguments before running anything', async () => {
    const tool = createHeadlessTerminalTools()[0]
    expect(await tool.run({ command: 'echo hi' })).toMatchObject({ success: false })
  })

  it('runs the reviewed command headlessly and reports captured output', async () => {
    const runHeadless = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        command: 'echo hi',
        cwd: '/workspace/project',
        shell: 'sh',
        stdout: 'hi\n',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        durationMs: 12,
        truncated: false
      }
    })
    window.ndx = {
      terminal: { runHeadless } as never
    } as Partial<NdxBridge> as NdxBridge
    const tool = createHeadlessTerminalTools()[0]

    const result = await tool.run({ workspaceId: 'w1', command: 'echo hi' })

    expect(runHeadless).toHaveBeenCalledWith({ workspaceId: 'w1', command: 'echo hi' })
    expect(result).toEqual({ success: true, message: 'exited 0 in 12ms: hi' })
  })

  it('reports a failed, timed-out, or truncated run as unsuccessful', async () => {
    const runHeadless = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        command: 'sleep 100',
        cwd: '/workspace/project',
        shell: 'sh',
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: true,
        durationMs: 30000,
        truncated: false
      }
    })
    window.ndx = {
      terminal: { runHeadless } as never
    } as Partial<NdxBridge> as NdxBridge
    const tool = createHeadlessTerminalTools()[0]

    const result = await tool.run({ workspaceId: 'w1', command: 'sleep 100' })

    expect(result).toEqual({ success: false, message: 'timed out in 30000ms: (no output)' })
  })

  it('surfaces a bridge error as a failed result', async () => {
    const runHeadless = vi.fn().mockResolvedValue({
      ok: false,
      error: { userMessage: 'Workspace not found.' }
    })
    window.ndx = {
      terminal: { runHeadless } as never
    } as Partial<NdxBridge> as NdxBridge
    const tool = createHeadlessTerminalTools()[0]

    const result = await tool.run({ workspaceId: 'w1', command: 'echo hi' })

    expect(result).toEqual({ success: false, message: 'Workspace not found.' })
  })
})
