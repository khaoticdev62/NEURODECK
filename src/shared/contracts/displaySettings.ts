import { z } from 'zod'

/**
 * ND-044 Display and Theme Settings. Originally scoped to three controls
 * (reduced-motion/high-contrast overrides of the matching OS media queries,
 * plus a text-size scale) — now extended with a real structured theme
 * builder: a curated accent palette, corner radius style, spacing density,
 * surface style (solid vs. glass/blur), and focus-indicator style. Each new
 * field patches the existing `--ndx-*`/`--color-*` token layer in
 * `tokens.css` via a `data-ndx-*` attribute, the same attribute-driven-CSS
 * pattern the original three fields already established. Appearance (no
 * light theme exists), Wallpaper, and OLED-safe behavior still need real new
 * visual systems this contract doesn't invent.
 */
export const textScaleSchema = z.enum(['normal', 'large', 'larger'])
export type TextScale = z.infer<typeof textScaleSchema>

export const accentSchema = z.enum(['cyan', 'violet', 'amber', 'green', 'rose'])
export type Accent = z.infer<typeof accentSchema>

export const radiusStyleSchema = z.enum(['sharp', 'soft', 'round'])
export type RadiusStyle = z.infer<typeof radiusStyleSchema>

export const densitySchema = z.enum(['compact', 'comfortable', 'spacious'])
export type Density = z.infer<typeof densitySchema>

export const surfaceStyleSchema = z.enum(['solid', 'glass'])
export type SurfaceStyle = z.infer<typeof surfaceStyleSchema>

export const focusStyleSchema = z.enum(['ring', 'bloom', 'underline'])
export type FocusStyle = z.infer<typeof focusStyleSchema>

export const displaySettingsSchema = z.object({
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  textScale: textScaleSchema,
  accent: accentSchema.default('cyan'),
  radiusStyle: radiusStyleSchema.default('soft'),
  density: densitySchema.default('comfortable'),
  surfaceStyle: surfaceStyleSchema.default('solid'),
  focusStyle: focusStyleSchema.default('ring')
})
export type DisplaySettings = z.infer<typeof displaySettingsSchema>

export const setDisplaySettingsRequestSchema = displaySettingsSchema
export type SetDisplaySettingsRequest = z.infer<typeof setDisplaySettingsRequestSchema>
