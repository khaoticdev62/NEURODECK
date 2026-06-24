import { z } from 'zod'
import { runHeadlessTerminal } from '../../services/ipc/terminalClient'
import type { RiskLevel } from '../contracts/plan'
import type { PermissionCapability } from '../contracts/permission'
import type { ToolDefinition } from '../ToolRegistry'

const headlessCommandArgsSchema = z.object({
  workspaceId: z.string().min(1),
  command: z.string().trim().min(1).max(8192),
  relativeCwd: z.string().max(1024).optional()
})

const TOOL_CONFIGS: Array<{
  id: string
  title: string
  description: string
  capability: PermissionCapability
  risk: RiskLevel
}> = [
  {
    id: 'terminal-headless-low',
    title: 'Run headless local command',
    description:
      'Runs the reviewed local command without an attached terminal and captures its output.',
    capability: 'terminal.execute',
    risk: 'low'
  },
  {
    id: 'terminal-headless-medium',
    title: 'Run headless external-effect command',
    description:
      'Runs the reviewed network or installation command without an attached terminal and captures its output.',
    capability: 'terminal.execute',
    risk: 'medium'
  },
  {
    id: 'terminal-headless-high',
    title: 'Run headless destructive command',
    description:
      'Runs the reviewed destructive command without an attached terminal and captures its output.',
    capability: 'terminal.execute',
    risk: 'high'
  },
  {
    id: 'terminal-headless-privileged',
    title: 'Run headless privileged command',
    description:
      'Runs the reviewed privileged command without an attached terminal and captures its output.',
    capability: 'terminal.privileged',
    risk: 'critical'
  }
]

/** Headless counterpart to `createTerminalCommandTools` (mega-prompt §21) — runs a reviewed command to completion in a bounded child process and returns its captured output as the tool result, instead of writing keystrokes into a live PTY session. */
export function createHeadlessTerminalTools(): ToolDefinition[] {
  return TOOL_CONFIGS.map((config) => ({
    id: config.id,
    title: config.title,
    description: config.description,
    requiredCapability: config.capability,
    risk: config.risk,
    reversible: false,
    run: async (args) => {
      const parsed = headlessCommandArgsSchema.safeParse(args)
      if (!parsed.success)
        return { success: false, message: 'Headless command arguments are invalid.' }
      const result = await runHeadlessTerminal(parsed.data)
      if (!result.ok) return { success: false, message: result.error.userMessage }

      const { exitCode, timedOut, truncated, stdout, stderr, durationMs } = result.data
      const status = timedOut ? 'timed out' : `exited ${exitCode}`
      const output = (stdout + stderr).trim()
      const summary = output ? output.slice(0, 600) : '(no output)'
      const note = truncated ? ' (output truncated)' : ''
      return {
        success: !timedOut && exitCode === 0,
        message: `${status} in ${durationMs}ms${note}: ${summary}`
      }
    }
  }))
}
