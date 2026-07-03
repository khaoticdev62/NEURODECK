import { z } from 'zod'

/**
 * Phase 4 Decky Loader integration: NeuroDeck's side of a same-machine,
 * loopback-only control-plane bridge. A separate Decky Loader plugin
 * (Python backend, sideloaded independently — see `decky-plugin/`) calls
 * into this bridge over HTTP to check status, focus the NeuroDeck window,
 * and trigger a small allowlisted set of quick actions. Off by default —
 * per the supplemental spec's "keep the core app functional without Decky"
 * and "no background surprises" rules, the bridge only starts when the
 * user explicitly enables it here.
 */
export const deckySettingsSchema = z.object({
  enabled: z.boolean()
})
export type DeckySettings = z.infer<typeof deckySettingsSchema>

export const setDeckySettingsRequestSchema = deckySettingsSchema
export type SetDeckySettingsRequest = z.infer<typeof setDeckySettingsRequestSchema>

/** Real, current bridge status — never fabricated. `listening` reflects whether NeuroDeck's HTTP listener is actually up; it cannot confirm the Decky plugin itself is installed or running until that plugin makes a real request. */
export const deckyBridgeStatusSchema = z.object({
  enabled: z.boolean(),
  listening: z.boolean(),
  port: z.number().int().positive().optional(),
  lastRequestAt: z.number().optional()
})
export type DeckyBridgeStatus = z.infer<typeof deckyBridgeStatusSchema>

/** Pushed to the renderer when the Decky plugin triggers an allowlisted quick action that navigates somewhere real. */
export const deckyNavigateEventSchema = z.object({
  path: z.string().min(1)
})
export type DeckyNavigateEvent = z.infer<typeof deckyNavigateEventSchema>
