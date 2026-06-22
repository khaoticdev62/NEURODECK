import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { createTerminalCommandTools } from '../tools/terminalCommandTools'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('terminalCommandTools', () => {
  it('registers fixed risk/capability variants', () => {
    const tools = createTerminalCommandTools()
    expect(tools.map((tool) => [tool.id, tool.risk, tool.requiredCapability])).toEqual([
      ['terminal-command-low', 'low', 'terminal.execute'],
      ['terminal-command-medium', 'medium', 'terminal.execute'],
      ['terminal-command-high', 'high', 'terminal.execute'],
      ['terminal-command-privileged', 'critical', 'terminal.privileged']
    ])
  })

  it('validates arguments and writes the reviewed command with Enter', async () => {
    const write = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      terminal: { write } as never
    } as Partial<NdxBridge> as NdxBridge
    const tool = createTerminalCommandTools()[0]

    expect(await tool.run({ command: 'git status' })).toMatchObject({ success: false })
    const result = await tool.run({
      sessionId: '00000000-0000-4000-8000-000000000001',
      command: 'git status'
    })

    expect(result).toEqual({ success: true, message: 'Reviewed command sent to the terminal.' })
    expect(write).toHaveBeenCalledWith({
      sessionId: '00000000-0000-4000-8000-000000000001',
      data: 'git status\r'
    })
  })
})
