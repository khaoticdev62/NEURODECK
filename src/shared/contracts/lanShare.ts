import { z } from 'zod'

/**
 * LAN Share (Warpinator-compatible transfers) — Phase LAN-1 schemas.
 *
 * This is a deliberately distinct domain from Epic X6's `lan.ts`/
 * `transfer.ts` (the existing NDX-only peer-discovery/transfer feature).
 * LAN Share targets real wire-protocol interoperability with the
 * external Warpinator/Winpinator ecosystem; per the clean-room strategy
 * recorded in `docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md` §4,
 * these shapes were authored independently from this project's own
 * understanding of the wire behavior — none of this was copied from
 * upstream source.
 *
 * Phase LAN-1 ships schemas, settings, a real (but not yet
 * network-driven) data model, and error codes only. Discovery (LAN-3),
 * authentication (LAN-4), and the send/receive engines (LAN-5/6) are
 * deliberately not implemented yet — see the implementation ledger.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const lanShareIdentitySchema = z.object({
  id: z.string().min(1),
  /** Real Warpinator-compatible connect-id format (`{HOSTNAME}-{20 hex chars}`), confirmed from their own `prefs.py` `get_new_connect_id()` — used as the real mDNS service instance name and `ServiceRegistration.service_id` so this device looks like a genuine peer on the wire, not just to other NeuroDeck instances. */
  connectId: z.string().min(1),
  displayName: z.string().min(1).max(200),
  createdAt: z.number().int().nonnegative()
})
export type LanShareIdentity = z.infer<typeof lanShareIdentitySchema>

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const lanShareApprovalPolicySchema = z.enum(['always-ask', 'auto-accept-trusted'])
export type LanShareApprovalPolicy = z.infer<typeof lanShareApprovalPolicySchema>

export const lanShareBackgroundPolicySchema = z.enum(['screen-only', 'ndx-session', 'user-login'])
export type LanShareBackgroundPolicy = z.infer<typeof lanShareBackgroundPolicySchema>

export const lanShareCompressionModeSchema = z.enum(['auto', 'off', 'compatible'])
export type LanShareCompressionMode = z.infer<typeof lanShareCompressionModeSchema>

export const lanShareSettingsSchema = z.object({
  deviceDisplayName: z.string().min(1).max(120),
  transferPort: z.number().int().min(1).max(65535),
  authPort: z.number().int().min(1).max(65535),
  receiveDirectory: z.string().min(1),
  groupCodeConfigured: z.boolean(),
  approvalPolicy: lanShareApprovalPolicySchema,
  backgroundPolicy: lanShareBackgroundPolicySchema,
  compressionMode: lanShareCompressionModeSchema,
  autoStartEnabled: z.boolean(),
  preferredInterfaceId: z.string().optional()
})
export type LanShareSettings = z.infer<typeof lanShareSettingsSchema>

export const updateLanShareSettingsRequestSchema = lanShareSettingsSchema.partial()
export type UpdateLanShareSettingsRequest = z.infer<typeof updateLanShareSettingsRequestSchema>

/** Plaintext only ever crosses this one request boundary — never returned to the renderer afterward (spec §11). */
export const setLanShareGroupCodeRequestSchema = z.object({
  groupCode: z.string().min(8).max(32)
})
export type SetLanShareGroupCodeRequest = z.infer<typeof setLanShareGroupCodeRequestSchema>

// ---------------------------------------------------------------------------
// Peers / trust (spec §10–12)
// ---------------------------------------------------------------------------

export const lanSharePlatformSchema = z.enum(['linux', 'windows', 'android', 'ndx', 'unknown'])
export type LanSharePlatform = z.infer<typeof lanSharePlatformSchema>

export const lanShareRegistrationVersionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal('unknown')
])
export type LanShareRegistrationVersion = z.infer<typeof lanShareRegistrationVersionSchema>

export const lanSharePeerStatusSchema = z.enum([
  'online',
  'connecting',
  'busy',
  'offline',
  'incompatible'
])
export type LanSharePeerStatus = z.infer<typeof lanSharePeerStatusSchema>

export const lanShareDiscoverySourceSchema = z.enum(['mdns', 'manual', 'history'])
export type LanShareDiscoverySource = z.infer<typeof lanShareDiscoverySourceSchema>

/** Mirrors the real state machine in spec §12 exactly — group-code match alone is never permanent trust. */
export const lanShareTrustStateSchema = z.enum([
  'unknown',
  'seen',
  'temporarily-approved',
  'trusted',
  'blocked',
  'fingerprint-changed',
  'revoked'
])
export type LanShareTrustState = z.infer<typeof lanShareTrustStateSchema>

export const lanSharePeerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  addresses: z.array(z.string().min(1)).default([]),
  interfaceId: z.string().optional(),
  transferPort: z.number().int().min(1).max(65535),
  authPort: z.number().int().min(1).max(65535),
  registrationVersion: lanShareRegistrationVersionSchema,
  platform: lanSharePlatformSchema,
  capabilities: z.array(z.string()).default([]),
  trustState: lanShareTrustStateSchema,
  fingerprint: z.string().optional(),
  groupMatch: z.boolean(),
  lastSeenAt: z.number().int().nonnegative(),
  discoverySource: lanShareDiscoverySourceSchema,
  status: lanSharePeerStatusSchema
})
export type LanSharePeer = z.infer<typeof lanSharePeerSchema>

export const addManualLanSharePeerRequestSchema = z.object({
  address: z.string().min(1),
  transferPort: z.number().int().min(1).max(65535).default(42000),
  authPort: z.number().int().min(1).max(65535).default(42001)
})
export type AddManualLanSharePeerRequest = z.infer<typeof addManualLanSharePeerRequestSchema>

export const lanSharePeerIdRequestSchema = z.object({ id: z.string().min(1) })
export type LanSharePeerIdRequest = z.infer<typeof lanSharePeerIdRequestSchema>

export const setLanSharePeerTrustRequestSchema = z.object({
  id: z.string().min(1),
  trustState: lanShareTrustStateSchema
})
export type SetLanSharePeerTrustRequest = z.infer<typeof setLanSharePeerTrustRequestSchema>

// ---------------------------------------------------------------------------
// Transfer jobs/items (spec §20, §27) — distinct from Epic X6's TransferJob
// ---------------------------------------------------------------------------

export const lanShareTransferStatusSchema = z.enum([
  'draft',
  'preflighting',
  'waiting-for-peer',
  'waiting-for-approval',
  'queued',
  'negotiating',
  'transferring',
  'verifying',
  'waiting-for-conflict',
  'committing',
  'completed',
  'rejected',
  'cancelled',
  'failed',
  'quarantined'
])
export type LanShareTransferStatus = z.infer<typeof lanShareTransferStatusSchema>

export const lanShareTransferDirectionSchema = z.enum(['send', 'receive'])
export type LanShareTransferDirection = z.infer<typeof lanShareTransferDirectionSchema>

export const lanShareTransferItemSchema = z.object({
  id: z.string().min(1),
  relativePath: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  transferredBytes: z.number().int().nonnegative(),
  status: lanShareTransferStatusSchema,
  checksum: z.string().optional()
})
export type LanShareTransferItem = z.infer<typeof lanShareTransferItemSchema>

export const lanShareTransferJobSchema = z.object({
  id: z.string().min(1),
  direction: lanShareTransferDirectionSchema,
  peerId: z.string().min(1),
  displayName: z.string().min(1),
  itemCount: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative().optional(),
  transferredBytes: z.number().int().nonnegative(),
  status: lanShareTransferStatusSchema,
  useCompression: z.boolean(),
  errorMessage: z.string().optional(),
  createdAt: z.number().int().nonnegative(),
  startedAt: z.number().int().nonnegative().optional(),
  completedAt: z.number().int().nonnegative().optional()
})
export type LanShareTransferJob = z.infer<typeof lanShareTransferJobSchema>

export const lanShareTransferJobIdRequestSchema = z.object({ id: z.string().min(1) })
export type LanShareTransferJobIdRequest = z.infer<typeof lanShareTransferJobIdRequestSchema>

// ---------------------------------------------------------------------------
// Service status (spec §5, §26)
// ---------------------------------------------------------------------------

export const lanShareServiceStateSchema = z.enum([
  'stopped',
  'starting',
  'running',
  'degraded',
  'error'
])
export type LanShareServiceState = z.infer<typeof lanShareServiceStateSchema>

export const lanShareServiceStatusSchema = z.object({
  state: lanShareServiceStateSchema,
  reason: z.string().min(1),
  startedAt: z.number().int().nonnegative().optional()
})
export type LanShareServiceStatus = z.infer<typeof lanShareServiceStatusSchema>

// ---------------------------------------------------------------------------
// Interfaces and health (spec §5, §22 basics, §30) — Phase LAN-2
// ---------------------------------------------------------------------------

/**
 * `inferredType` is a best-effort guess from the OS-given interface name
 * (e.g. `wlan0`/`Wi-Fi` vs `eth0`/`Ethernet`) — not a true link-layer
 * query, which Node's standard library does not expose. Honestly
 * `unknown` when the name doesn't match a recognized pattern.
 */
export const lanShareInterfaceTypeSchema = z.enum(['wifi', 'ethernet', 'unknown'])
export type LanShareInterfaceType = z.infer<typeof lanShareInterfaceTypeSchema>

export const lanShareNetworkInterfaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  family: z.enum(['IPv4', 'IPv6']),
  inferredType: lanShareInterfaceTypeSchema
})
export type LanShareNetworkInterface = z.infer<typeof lanShareNetworkInterfaceSchema>

export const lanShareHealthSchema = z.object({
  serviceState: lanShareServiceStateSchema,
  transferPortBound: z.boolean(),
  authPortBound: z.boolean(),
  receiveDirectoryWritable: z.boolean(),
  interfaceCount: z.number().int().nonnegative()
})
export type LanShareHealth = z.infer<typeof lanShareHealthSchema>

// ---------------------------------------------------------------------------
// Errors (spec §28) — exact code list, every error carries a real correlation id
// ---------------------------------------------------------------------------

export const lanShareErrorCodeSchema = z.enum([
  'LAN_SERVICE_UNAVAILABLE',
  'LAN_BIND_FAILED',
  'LAN_PORT_IN_USE',
  'LAN_INTERFACE_UNAVAILABLE',
  'LAN_MDNS_UNAVAILABLE',
  'LAN_DISCOVERY_TIMEOUT',
  'LAN_PEER_OFFLINE',
  'LAN_GROUP_MISMATCH',
  'LAN_AUTH_FAILED',
  'LAN_FINGERPRINT_CHANGED',
  'LAN_PROTOCOL_INCOMPATIBLE',
  'LAN_TRANSFER_REJECTED',
  'LAN_TRANSFER_INTERRUPTED',
  'LAN_LENGTH_MISMATCH',
  'LAN_INTEGRITY_FAILED',
  'LAN_DESTINATION_DENIED',
  'LAN_PATH_UNSAFE',
  'LAN_STORAGE_INSUFFICIENT',
  'LAN_CONFLICT',
  'LAN_FILE_CHANGED_DURING_SEND',
  'LAN_FIREWALL_BLOCKED',
  'LAN_VPN_ROUTE_BLOCKED',
  'LAN_ISOLATION_DEGRADED'
])
export type LanShareErrorCode = z.infer<typeof lanShareErrorCodeSchema>

export const lanShareErrorSchema = z.object({
  code: lanShareErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  peerId: z.string().optional(),
  itemId: z.string().optional(),
  correlationId: z.string().min(1)
})
export type LanShareError = z.infer<typeof lanShareErrorSchema>

// ---------------------------------------------------------------------------
// Diagnostics (spec §30) — schema only; the real checks land with LAN-9
// ---------------------------------------------------------------------------

export const lanShareDiagnosticCheckIdSchema = z.enum([
  'service',
  'sockets',
  'interface',
  'mdns',
  'ports',
  'firewall',
  'vpn-route',
  'destination-write',
  'isolation',
  'peer-probe',
  'registration',
  'compression',
  'protocol-version'
])
export type LanShareDiagnosticCheckId = z.infer<typeof lanShareDiagnosticCheckIdSchema>

export const lanShareDiagnosticOutcomeSchema = z.enum(['pass', 'warning', 'fail', 'unsupported'])
export type LanShareDiagnosticOutcome = z.infer<typeof lanShareDiagnosticOutcomeSchema>

export const lanShareDiagnosticResultSchema = z.object({
  id: lanShareDiagnosticCheckIdSchema,
  outcome: lanShareDiagnosticOutcomeSchema,
  detail: z.string().min(1),
  remediation: z.string().optional()
})
export type LanShareDiagnosticResult = z.infer<typeof lanShareDiagnosticResultSchema>
