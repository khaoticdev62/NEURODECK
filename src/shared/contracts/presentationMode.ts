import { z } from 'zod'

/**
 * Epic X14 Presentation Mode (supplemental spec §46.1), scoped to the
 * real mechanisms this codebase already has rather than inventing new
 * UI infrastructure: "Use large text" reuses the existing real
 * `DisplaySettings.textScale` (`'large'`), "Suppress sensitive
 * notifications" reuses the existing real `ToastContext`
 * `muteCategory()`/`unmuteCategory()`, and "Keep screen awake" uses
 * Electron's real `powerSaveBlocker`. "Hide secrets" gates the real
 * Vault reveal action. "Hide private workspace names," "Disable
 * clipboard previews," and "Docked layout" (no real docked
 * `DisplayMode` exists) are deliberately not implemented in this
 * pass — see the ledger for the named reasons.
 */
export const presentationModeSettingsSchema = z.object({
  enabled: z.boolean(),
  keepScreenAwake: z.boolean()
})
export type PresentationModeSettings = z.infer<typeof presentationModeSettingsSchema>

export const setPresentationModeRequestSchema = z.object({
  enabled: z.boolean(),
  keepScreenAwake: z.boolean()
})
export type SetPresentationModeRequest = z.infer<typeof setPresentationModeRequestSchema>
