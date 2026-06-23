import type { ToolDefinition } from '../ToolRegistry'

/**
 * A deliberately harmless tutorial tool used by ND-007 to let first-time users
 * experience the real ActionQueue approval pipeline without any side effects.
 */
export function createTutorialAcknowledgeTool(): ToolDefinition {
  return {
    id: 'tutorial:acknowledge',
    title: 'Acknowledge tutorial step',
    description: 'A harmless tutorial action that does nothing but confirm the approval flow.',
    requiredCapability: 'tutorial.acknowledge',
    risk: 'low',
    reversible: true,
    run: async () => ({
      success: true,
      message: 'Tutorial step acknowledged.'
    })
  }
}
