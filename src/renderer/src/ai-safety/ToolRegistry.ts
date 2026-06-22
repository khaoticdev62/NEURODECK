import type { PermissionCapability } from './contracts/permission'
import type { RiskLevel } from './contracts/plan'

export interface ToolResult {
  success: boolean
  message: string
}

/**
 * A registered tool (mega-prompt §15.3 "tool invocations must match a
 * registered tool"). `run` is the only place real side effects happen —
 * everything upstream (plan, permission, queue) is pure bookkeeping.
 */
export interface ToolDefinition {
  id: string
  title: string
  description: string
  requiredCapability: PermissionCapability
  risk: RiskLevel
  reversible: boolean
  run: (args: Record<string, unknown>) => Promise<ToolResult>
}

/** Real typed tool registry — invocation must match a registered tool, never an arbitrary string (mega-prompt §15.3). */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool)
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id)
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()]
  }
}
