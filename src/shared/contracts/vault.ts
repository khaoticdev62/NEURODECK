import { z } from 'zod'

/**
 * Epic X10 Identity/Credentials/Secrets Vault (supplemental spec §31).
 * Scoped to a reference-based vault for arbitrary secret strings — every
 * item type below stores one opaque secret value (a key, token, PIN,
 * or reference string the user pastes in), encrypted at rest the same
 * way every other secret in this codebase is (`SecretCipher`, backed by
 * Electron's `safeStorage`). "SSH key reference" and "signing key
 * reference" are reference types, not raw private-key file storage —
 * the spec itself calls these "reference-based," matching e.g. storing
 * a key's fingerprint/path/passphrase rather than vaulting an entire
 * private key file.
 */
export const vaultItemTypeSchema = z.enum([
  'api-credential',
  'ssh-key-reference',
  'certificate',
  'passphrase',
  'oauth-token',
  'provider-secret',
  'remote-host-credential',
  'signing-key-reference',
  'encryption-key'
])
export type VaultItemType = z.infer<typeof vaultItemTypeSchema>

/** Metadata only — the encrypted secret value never appears in this shape, so it's always safe to send to the renderer. */
export const vaultItemSchema = z.object({
  id: z.string(),
  type: vaultItemTypeSchema,
  label: z.string(),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastAccessedAt: z.number().nullable(),
  expiresAt: z.number().nullable(),
  rotationReminderDays: z.number().nullable(),
  /** Computed at read time from `expiresAt`/`rotationReminderDays` — never a stored, potentially-stale flag. */
  isExpired: z.boolean(),
  needsRotation: z.boolean()
})
export type VaultItem = z.infer<typeof vaultItemSchema>

export const createVaultItemRequestSchema = z.object({
  type: vaultItemTypeSchema,
  label: z.string().min(1).max(200),
  secret: z.string().min(1),
  notes: z.string().max(2000).optional(),
  expiresAt: z.number().nullable().optional(),
  rotationReminderDays: z.number().int().positive().nullable().optional()
})
export type CreateVaultItemRequest = z.infer<typeof createVaultItemRequestSchema>

export const vaultItemIdRequestSchema = z.object({ id: z.string().min(1) })
export type VaultItemIdRequest = z.infer<typeof vaultItemIdRequestSchema>

export const updateVaultItemRequestSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  expiresAt: z.number().nullable().optional(),
  rotationReminderDays: z.number().int().positive().nullable().optional()
})
export type UpdateVaultItemRequest = z.infer<typeof updateVaultItemRequestSchema>

export const rotateVaultItemRequestSchema = z.object({
  id: z.string().min(1),
  newSecret: z.string().min(1)
})
export type RotateVaultItemRequest = z.infer<typeof rotateVaultItemRequestSchema>

export const revealVaultItemResultSchema = z.object({ secret: z.string() })
export type RevealVaultItemResult = z.infer<typeof revealVaultItemResultSchema>

export const vaultAccessActionSchema = z.enum([
  'created',
  'revealed',
  'updated',
  'rotated',
  'deleted'
])
export type VaultAccessAction = z.infer<typeof vaultAccessActionSchema>

/** Real, persisted access audit (spec §31.2 "Access audit") — never includes the secret value itself, only that an access of a given kind happened. */
export const vaultAccessLogEntrySchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemLabel: z.string(),
  itemType: vaultItemTypeSchema,
  action: vaultAccessActionSchema,
  timestamp: z.number()
})
export type VaultAccessLogEntry = z.infer<typeof vaultAccessLogEntrySchema>
