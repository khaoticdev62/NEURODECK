import type { HapticsService } from '../../controller/haptics/hapticsService'
import type { ToolDefinition } from '../ToolRegistry'

/**
 * The one real tool registered today (Epic 4 baseline). Deliberately
 * low-risk and reversible — it genuinely changes the haptics intensity via
 * the real `HapticsService` from Epic 2, demonstrating the full
 * registry → permission → approval → execution → audit pipeline end to end
 * without any AI/model integration (which doesn't exist until Epic 9).
 */
export function createResetHapticsIntensityTool(haptics: HapticsService): ToolDefinition {
  return {
    id: 'reset-haptics-intensity',
    title: 'Reset haptics intensity to medium',
    description: 'Sets controller haptics intensity back to the default (medium).',
    requiredCapability: 'system.changeSettings',
    risk: 'low',
    reversible: true,
    run: async () => {
      haptics.setIntensity('medium')
      return { success: true, message: 'Haptics intensity set to medium.' }
    }
  }
}
