import { z } from 'zod'

/**
 * ND-044 Display and Theme Settings, scoped to the three controls this
 * single-theme dark UI can genuinely support: a user-forced reduced-motion
 * override (independent of the OS `prefers-reduced-motion` media query
 * tokens.css already honors), a user-forced high-contrast override (same
 * relationship to `prefers-contrast: more`), and a real text-size scale
 * applied via the document root font size (the existing `rem`-based type
 * scale in tokens.css already responds to that). Appearance (no light
 * theme exists), Transparency (no glass/blur effects exist), Focus style
 * (no alternate focus-ring style exists), Wallpaper, and OLED-safe
 * behavior all need real new visual systems this contract doesn't invent.
 */
export const textScaleSchema = z.enum(['normal', 'large', 'larger'])
export type TextScale = z.infer<typeof textScaleSchema>

export const displaySettingsSchema = z.object({
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  textScale: textScaleSchema
})
export type DisplaySettings = z.infer<typeof displaySettingsSchema>

export const setDisplaySettingsRequestSchema = displaySettingsSchema
export type SetDisplaySettingsRequest = z.infer<typeof setDisplaySettingsRequestSchema>
