import { z } from 'zod'

/**
 * Epic X1 Capability Registry (supplemental spec §33) — every hardware- or
 * environment-dependent feature in the app is meant to query this rather
 * than doing its own ad hoc `process.platform`/feature-sniffing check, so
 * "is this available" has one real, honest answer instead of N divergent
 * guesses. Per the supplemental non-negotiable §3.7, a capability must
 * never be reported `available` unless it was actually, currently
 * detected — there is no fallback path that fabricates sensor or device
 * presence.
 */
export const capabilityStatusSchema = z.enum([
  'available',
  'permission-required',
  'dependency-required',
  'unsupported',
  'temporarily-unavailable',
  'degraded'
])
export type CapabilityStatus = z.infer<typeof capabilityStatusSchema>

export const capabilityIdSchema = z.enum([
  'rear-buttons',
  'haptics',
  'gyro',
  'microphone',
  'camera',
  'bluetooth',
  'network-manager',
  'flatpak',
  'steam-shortcut-editing',
  'decky-integration',
  'local-model-runtime',
  'gpu-acceleration',
  'thermal-sensors',
  'fan-controls',
  'external-displays',
  'vpn-backends',
  'secure-storage',
  'notifications',
  'screen-capture',
  'ocr-extraction',
  'remote-desktop-launchers'
])
export type CapabilityId = z.infer<typeof capabilityIdSchema>

export const capabilityRemediationSchema = z.object({
  label: z.string().min(1),
  /** Free-text instruction, e.g. "Install flatpak via your distro's package manager" — never a real action button wired to perform the fix itself unless that fix already exists as a real tool elsewhere (e.g. Package Center, once X2 lands). */
  detail: z.string().min(1)
})
export type CapabilityRemediation = z.infer<typeof capabilityRemediationSchema>

export const capabilityStateSchema = z.object({
  id: capabilityIdSchema,
  status: capabilityStatusSchema,
  provider: z.string().optional(),
  version: z.string().optional(),
  reason: z.string().min(1),
  remediation: z.array(capabilityRemediationSchema).default([]),
  lastCheckedAt: z.number().int().nonnegative()
})
export type CapabilityState = z.infer<typeof capabilityStateSchema>
