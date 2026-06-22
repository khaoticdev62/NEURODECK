import { z } from 'zod'

/**
 * ND-043 Controller Settings, scoped to the one real adjustable value
 * this architecture has today: haptics intensity. `HapticsService` already
 * supports off/low/medium/high in-memory (Epic 2); this contract is what
 * makes that choice survive an app restart. Hold duration, repeat delay,
 * repeat rate, and stick dead zone are real but not yet adjustable — making
 * them configurable needs a threading refactor through the pure
 * `gamepadPolling.ts` module that's a separate, larger piece of work.
 */
export const hapticsIntensitySchema = z.enum(['off', 'low', 'medium', 'high'])
export type HapticsIntensitySetting = z.infer<typeof hapticsIntensitySchema>

export const controllerSettingsSchema = z.object({
  hapticsIntensity: hapticsIntensitySchema
})
export type ControllerSettings = z.infer<typeof controllerSettingsSchema>

export const setControllerSettingsRequestSchema = controllerSettingsSchema
export type SetControllerSettingsRequest = z.infer<typeof setControllerSettingsRequestSchema>
