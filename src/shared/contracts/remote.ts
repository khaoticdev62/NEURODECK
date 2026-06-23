import { z } from 'zod'

/**
 * ND-040 Remote Systems / ND-041 Remote Session (wireframe §ND-040/041).
 * This slice covers SSH hosts only — homelab/Windows-remote-tooling/
 * containers/network-shares are real-world targets the wireframe lists but
 * this slice doesn't build a protocol for; adding them later means adding a
 * `kind` value and a matching `RemoteConnectionService` strategy, not
 * reshaping this contract.
 */
export const remoteHostAuthMethodSchema = z.enum(['password', 'privateKey'])
export type RemoteHostAuthMethod = z.infer<typeof remoteHostAuthMethodSchema>

export const remoteHostSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  hostname: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(120),
  authMethod: remoteHostAuthMethodSchema,
  hasSecret: z.boolean(),
  /** SHA256 fingerprint of the host key recorded on first successful connection (trust-on-first-use). `null` until first connect. */
  trustedFingerprint: z.string().nullable(),
  trustedAt: z.number().int().nonnegative().nullable(),
  createdAt: z.number().int().nonnegative()
})
export type RemoteHost = z.infer<typeof remoteHostSchema>

export const addRemoteHostRequestSchema = z.object({
  name: z.string().min(1).max(120),
  hostname: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1).max(120),
  authMethod: remoteHostAuthMethodSchema,
  /** Password, or private key passphrase if the key itself is unencrypted-on-disk; always encrypted at rest via the OS secret store. */
  secret: z.string().max(8192).optional(),
  privateKeyPath: z.string().max(4096).optional()
})
export type AddRemoteHostRequest = z.input<typeof addRemoteHostRequestSchema>

export const remoteHostRequestSchema = z.object({ hostId: z.string().uuid() })
export type RemoteHostRequest = z.infer<typeof remoteHostRequestSchema>

export const remoteConnectionTestResultSchema = z.object({
  hostId: z.string().uuid(),
  reachable: z.boolean(),
  latencyMs: z.number().nonnegative().nullable(),
  fingerprint: z.string().nullable(),
  /** True the first time a host's fingerprint is recorded; false on every subsequent matching connection. */
  newlyTrusted: z.boolean(),
  errorMessage: z.string().nullable()
})
export type RemoteConnectionTestResult = z.infer<typeof remoteConnectionTestResultSchema>

export const remoteSessionStatusSchema = z.enum(['connecting', 'running', 'exited', 'error'])
export type RemoteSessionStatus = z.infer<typeof remoteSessionStatusSchema>

export const remoteSessionSchema = z.object({
  id: z.string().uuid(),
  hostId: z.string().uuid(),
  hostLabel: z.string(),
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  status: remoteSessionStatusSchema,
  exitCode: z.number().int().nullable(),
  errorMessage: z.string().nullable()
})
export type RemoteSession = z.infer<typeof remoteSessionSchema>

export const createRemoteSessionRequestSchema = z.object({
  hostId: z.string().uuid(),
  cols: z.number().int().min(20).max(300).default(100),
  rows: z.number().int().min(5).max(120).default(30)
})
export type CreateRemoteSessionRequest = z.input<typeof createRemoteSessionRequestSchema>

export const remoteSessionRequestSchema = z.object({ sessionId: z.string().uuid() })
export type RemoteSessionRequest = z.infer<typeof remoteSessionRequestSchema>

export const remoteSessionWriteRequestSchema = remoteSessionRequestSchema.extend({
  data: z.string().max(64 * 1024)
})
export type RemoteSessionWriteRequest = z.infer<typeof remoteSessionWriteRequestSchema>

export const remoteSessionResizeRequestSchema = remoteSessionRequestSchema.extend({
  cols: z.number().int().min(20).max(300),
  rows: z.number().int().min(5).max(120)
})
export type RemoteSessionResizeRequest = z.infer<typeof remoteSessionResizeRequestSchema>

export const remoteSessionSnapshotSchema = z.object({
  session: remoteSessionSchema,
  output: z.string(),
  truncated: z.boolean(),
  lastSequence: z.number().int().nonnegative()
})
export type RemoteSessionSnapshot = z.infer<typeof remoteSessionSnapshotSchema>

export const remoteSessionDataEventSchema = z.object({
  sessionId: z.string().uuid(),
  data: z.string(),
  sequence: z.number().int().positive()
})
export type RemoteSessionDataEvent = z.infer<typeof remoteSessionDataEventSchema>

export const remoteSessionExitEventSchema = z.object({ session: remoteSessionSchema })
export type RemoteSessionExitEvent = z.infer<typeof remoteSessionExitEventSchema>
