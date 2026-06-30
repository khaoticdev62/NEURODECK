import { z } from 'zod'

/**
 * Real Epic X15 trusted-publisher keystore (supplemental §39
 * "Extension signing" / "Update signature verification"). A
 * `TrustedPublisherRecord` is the local, user-managed allowlist
 * `ManifestSignature.verifyManifestSignature()` checks an extension
 * manifest's claimed `publicKeyFingerprint` against — there is no
 * real distributed certificate authority or marketplace registry
 * for this codebase to query, so trust is explicit and local, never
 * fabricated as "verified by NeuroDeck."
 */
export const trustedPublisherRecordSchema = z.object({
  fingerprint: z.string().min(1),
  publicKeyPem: z.string().min(1),
  publisherName: z.string().min(1).max(200),
  addedAt: z.number(),
  revoked: z.boolean()
})
export type TrustedPublisherRecord = z.infer<typeof trustedPublisherRecordSchema>

export const addTrustedPublisherRequestSchema = z.object({
  publicKeyPem: z.string().min(1),
  publisherName: z.string().min(1).max(200)
})
export type AddTrustedPublisherRequest = z.infer<typeof addTrustedPublisherRequestSchema>

export const trustedPublisherFingerprintRequestSchema = z.object({
  fingerprint: z.string().min(1)
})
export type TrustedPublisherFingerprintRequest = z.infer<
  typeof trustedPublisherFingerprintRequestSchema
>
