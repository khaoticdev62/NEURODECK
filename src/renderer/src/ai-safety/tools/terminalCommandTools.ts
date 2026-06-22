import { z } from 'zod'
import { writeTerminal } from '../../services/ipc/terminalClient'
import type { RiskLevel } from '../contracts/plan'
import type { PermissionCapability } from '../contracts/permission'
import type { ToolDefinition } from '../ToolRegistry'

const terminalCommandArgsSchema = z.object({
  sessionId: z.string().uuid(),
  command: z
    .string()
    .trim()
    .min(1)
    .max(16 * 1024),
  target: z.string().max(2048).optional()
})

const TOOL_CONFIGS: Array<{
  id: string
  title: string
  description: string
  capability: PermissionCapability
  risk: RiskLevel
}> = [
  {
    id: 'terminal-command-low',
    title: 'Run local terminal command',
    description: 'Writes the reviewed local command to the selected terminal session.',
    capability: 'terminal.execute',
    risk: 'low'
  },
  {
    id: 'terminal-command-medium',
    title: 'Run external-effect terminal command',
    description: 'Writes the reviewed network or installation command to the selected terminal.',
    capability: 'terminal.execute',
    risk: 'medium'
  },
  {
    id: 'terminal-command-high',
    title: 'Run destructive terminal command',
    description: 'Writes the reviewed destructive command to the selected terminal session.',
    capability: 'terminal.execute',
    risk: 'high'
  },
  {
    id: 'terminal-command-privileged',
    title: 'Run privileged terminal command',
    description: 'Writes the reviewed privileged command to the selected terminal session.',
    capability: 'terminal.privileged',
    risk: 'critical'
  }
]

export function createTerminalCommandTools(): ToolDefinition[] {
  return TOOL_CONFIGS.map((config) => ({
    id: config.id,
    title: config.title,
    description: config.description,
    requiredCapability: config.capability,
    risk: config.risk,
    reversible: false,
    run: async (args) => {
      const parsed = terminalCommandArgsSchema.safeParse(args)
      if (!parsed.success)
        return { success: false, message: 'Terminal command arguments are invalid.' }
      const result = await writeTerminal({
        sessionId: parsed.data.sessionId,
        data: `${parsed.data.command}\r`
      })
      return result.ok
        ? { success: true, message: 'Reviewed command sent to the terminal.' }
        : { success: false, message: result.error.userMessage }
    }
  }))
}
