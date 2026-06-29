import { z } from 'zod'

/**
 * Epic X14 Kiosk Mode (supplemental spec §46.2). Reuses real existing
 * mechanisms rather than inventing new ones: "Restricted exit" and
 * "No secret access" both reuse the existing real Lock PIN
 * (`LockSettingsStore`/`verifyLockPin`) — there is no separate kiosk
 * PIN. "No developer mode" has nothing to gate — no Developer Mode
 * toggle exists anywhere in this codebase yet (supplemental §44,
 * unbuilt). "Controller-only operation" needs no new code — this
 * app's entire shell is already controller-native by construction.
 * "Reset session" is deliberately scoped to "return to the kiosk's
 * starting route," not a deep app-state reset, to avoid widening
 * `WorkspaceContextValue.setActive`'s existing, widely-used type.
 */
export const kioskModeSettingsSchema = z.object({
  enabled: z.boolean(),
  /** Real route paths from `ROUTE_DEFINITIONS` the kiosk session may visit. */
  allowedRoutePaths: z.array(z.string()),
  /** When true, every `/settings/*` route is blocked regardless of `allowedRoutePaths`. */
  restrictSettings: z.boolean(),
  /** The route a restricted/disallowed navigation redirects back to. */
  startRoutePath: z.string()
})
export type KioskModeSettings = z.infer<typeof kioskModeSettingsSchema>

export const setKioskModeRequestSchema = kioskModeSettingsSchema
export type SetKioskModeRequest = z.infer<typeof setKioskModeRequestSchema>
