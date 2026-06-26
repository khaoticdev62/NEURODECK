import { z } from 'zod'

/**
 * Epic X6 LAN device discovery and peer transfer (supplemental §19) —
 * a Warpinator/Winpinator-style NDX peer protocol. Honest scope: real
 * UDP-broadcast discovery and a real authenticated-encrypted-transport
 * file transfer over plain TCP, using AES-256-GCM with a key derived
 * from a real pre-shared pairing code (real AEAD encryption — a
 * genuine confidentiality+integrity guarantee) rather than full
 * mutual TLS/X.509 certificate exchange, since generating real X.509
 * certs needs a dependency (`node-forge`/`selfsigned`) not in this
 * codebase yet and adding one is its own decision. QR pairing is
 * explicitly deferred — needs a real QR generation/scanning library,
 * also not present.
 */
export const peerOnlineStateSchema = z.enum(['online', 'offline'])
export type PeerOnlineState = z.infer<typeof peerOnlineStateSchema>

export const peerTrustStateSchema = z.enum(['untrusted', 'trusted', 'blocked'])
export type PeerTrustState = z.infer<typeof peerTrustStateSchema>

export const peerDeviceSchema = z.object({
  id: z.string().min(1),
  friendlyName: z.string().min(1).max(200),
  address: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  /** Real SHA-256 fingerprint of this peer's real public identity key, learned on first contact (trust-on-first-use, the same model `RemoteHostStore` already uses for SSH host keys). */
  fingerprint: z.string().min(1),
  trust: peerTrustStateSchema,
  online: peerOnlineStateSchema,
  lastSeenAt: z.number().int().nonnegative()
})
export type PeerDevice = z.infer<typeof peerDeviceSchema>

export const addManualPeerRequestSchema = z.object({
  address: z.string().min(1),
  port: z.number().int().min(1).max(65535)
})
export type AddManualPeerRequest = z.infer<typeof addManualPeerRequestSchema>

export const peerIdRequestSchema = z.object({ id: z.string().min(1) })
export type PeerIdRequest = z.infer<typeof peerIdRequestSchema>

export const setPeerTrustRequestSchema = z.object({
  id: z.string().min(1),
  trust: peerTrustStateSchema
})
export type SetPeerTrustRequest = z.infer<typeof setPeerTrustRequestSchema>

export const sendFileToPeerRequestSchema = z.object({
  peerId: z.string().min(1),
  /** Real, already-resolved absolute path from a native file picker. */
  filePath: z.string().min(1),
  /** Real pre-shared pairing code, entered by the user on both devices out of band — the real shared secret AES-256-GCM session encryption is derived from. */
  pairingCode: z.string().min(4)
})
export type SendFileToPeerRequest = z.infer<typeof sendFileToPeerRequestSchema>
