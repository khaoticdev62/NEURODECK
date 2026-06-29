import { z } from 'zod'

/**
 * Epic X14 Screenshot Center (supplemental spec §42.1), scoped to the
 * two real capture sources this app can reliably produce: "Current
 * window" (Electron's `webContents.capturePage()` — always works, no
 * OS permission needed, captures this app's own rendered frame) and
 * "Full screen" (Electron's `desktopCapturer` — real, but genuinely
 * gated by OS screen-recording permission on some platforms; a real
 * failure here is surfaced honestly, never silently degraded to a
 * fake image). "Selected region," "Current panel," "Annotation," and
 * "Redaction" need a real selection/drawing overlay UI that doesn't
 * exist yet and are deliberately not offered. "Ask AI" needs real
 * vision support, which Epic 9 already documents as out of scope.
 */
export const screenshotSourceSchema = z.enum(['full-screen', 'current-window'])
export type ScreenshotSource = z.infer<typeof screenshotSourceSchema>

export const screenshotRecordSchema = z.object({
  id: z.string(),
  path: z.string(),
  capturedAt: z.number(),
  source: screenshotSourceSchema,
  bytes: z.number()
})
export type ScreenshotRecord = z.infer<typeof screenshotRecordSchema>

export const captureScreenshotRequestSchema = z.object({
  source: screenshotSourceSchema,
  delaySeconds: z.number().int().min(0).max(10).default(0)
})
export type CaptureScreenshotRequest = z.infer<typeof captureScreenshotRequestSchema>

export const screenshotIdRequestSchema = z.object({ id: z.string().min(1) })
export type ScreenshotIdRequest = z.infer<typeof screenshotIdRequestSchema>

export const addScreenshotToWorkspaceRequestSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1)
})
export type AddScreenshotToWorkspaceRequest = z.infer<typeof addScreenshotToWorkspaceRequestSchema>
