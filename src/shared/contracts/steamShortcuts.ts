import { z } from 'zod'

/**
 * Real Steam Shortcut Manager (supplemental §8), scoped to safe,
 * reversible operations on `shortcuts.vdf`'s real binary KeyValues
 * format. Launch profiles (§8.2 — resolution/fullscreen/performance
 * profile/network policy/pre-post-launch workflows) are explicitly
 * deferred: they belong on top of this real foundation as a separate,
 * deliberately scoped pass, not bundled into the first safe
 * read/write/backup pipeline.
 */
export const steamRunningStateSchema = z.enum(['running', 'not-running', 'unknown'])
export type SteamRunningState = z.infer<typeof steamRunningStateSchema>

export const steamShortcutEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  appName: z.string(),
  exe: z.string(),
  startDir: z.string(),
  icon: z.string(),
  shortcutPath: z.string(),
  launchOptions: z.string(),
  isHidden: z.boolean(),
  allowDesktopConfig: z.boolean(),
  allowOverlay: z.boolean(),
  openVR: z.boolean(),
  devkit: z.boolean(),
  devkitGameId: z.string(),
  devkitOverrideAppId: z.number().int(),
  lastPlayTime: z.number().int(),
  flatpakAppId: z.string(),
  tags: z.array(z.string())
})
export type SteamShortcutEntry = z.infer<typeof steamShortcutEntrySchema>

export const steamShortcutBackupSchema = z.object({
  fileName: z.string(),
  createdAt: z.number(),
  bytes: z.number()
})
export type SteamShortcutBackup = z.infer<typeof steamShortcutBackupSchema>

export const steamUserProfileSchema = z.object({
  /** The real numeric Steam user ID this `shortcuts.vdf` path belongs to (the directory name under `userdata/`). */
  userId: z.string(),
  vdfPath: z.string()
})
export type SteamUserProfile = z.infer<typeof steamUserProfileSchema>

export const selectSteamProfileRequestSchema = z.object({
  vdfPath: z.string().min(1)
})
export type SelectSteamProfileRequest = z.infer<typeof selectSteamProfileRequestSchema>

export const createSteamShortcutRequestSchema = z.object({
  vdfPath: z.string().min(1),
  appName: z.string().min(1).max(200),
  exe: z.string().min(1),
  startDir: z.string().default(''),
  launchOptions: z.string().default('')
})
export type CreateSteamShortcutRequest = z.infer<typeof createSteamShortcutRequestSchema>

export const updateSteamShortcutRequestSchema = z.object({
  vdfPath: z.string().min(1),
  index: z.number().int().nonnegative(),
  patch: z.object({
    appName: z.string().min(1).max(200).optional(),
    exe: z.string().min(1).optional(),
    startDir: z.string().optional(),
    launchOptions: z.string().optional(),
    isHidden: z.boolean().optional(),
    tags: z.array(z.string()).optional()
  })
})
export type UpdateSteamShortcutRequest = z.infer<typeof updateSteamShortcutRequestSchema>

export const removeSteamShortcutRequestSchema = z.object({
  vdfPath: z.string().min(1),
  index: z.number().int().nonnegative()
})
export type RemoveSteamShortcutRequest = z.infer<typeof removeSteamShortcutRequestSchema>

export const restoreSteamShortcutBackupRequestSchema = z.object({
  vdfPath: z.string().min(1),
  fileName: z.string().min(1)
})
export type RestoreSteamShortcutBackupRequest = z.infer<
  typeof restoreSteamShortcutBackupRequestSchema
>
