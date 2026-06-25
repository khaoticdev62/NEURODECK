import { z } from 'zod'

/**
 * ND-002 Lock Screen, scoped to a single local controller PIN — there is no
 * multi-profile/account system yet (Phase B Epic X10's "Identity, credentials,
 * certificates, secrets vault"), so the spec's "[Y] Use account
 * authentication" option and "Welcome back, <name>" personalization are
 * deferred rather than faked. The PIN itself is never sent to or stored in
 * the renderer in any recoverable form — `LockSettingsStore` keeps only a
 * salted hash (`node:crypto`'s `scrypt`), and verification happens entirely
 * in the main process.
 */
export const lockStatusSchema = z.object({ enabled: z.boolean() })
export type LockStatus = z.infer<typeof lockStatusSchema>

const pinSchema = z.string().regex(/^\d{4,8}$/, 'PIN must be 4-8 digits.')

export const setLockPinRequestSchema = z.object({
  newPin: pinSchema,
  /** Required once a PIN already exists — proves the caller can already unlock before changing it. */
  currentPin: z.string().optional()
})
export type SetLockPinRequest = z.infer<typeof setLockPinRequestSchema>

export const removeLockPinRequestSchema = z.object({ currentPin: z.string().min(1) })
export type RemoveLockPinRequest = z.infer<typeof removeLockPinRequestSchema>

export const verifyLockPinRequestSchema = z.object({ pin: z.string().min(1) })
export type VerifyLockPinRequest = z.infer<typeof verifyLockPinRequestSchema>

export const verifyLockPinResultSchema = z.object({ valid: z.boolean() })
export type VerifyLockPinResult = z.infer<typeof verifyLockPinResultSchema>
