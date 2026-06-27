import { z } from 'zod'

/**
 * Epic X3 Extension and Plugin Platform (supplemental spec §9) — real
 * manifest validation, capability request schema, and lifecycle state.
 * Per §9.3 ("Do not execute third-party extension code in the renderer
 * or main process directly"), the actual execution boundary
 * (`core/extensions/ExtensionHost.ts`) runs every extension in a real,
 * separate Node child process — these contracts are what crosses that
 * boundary, validated on both sides.
 */
export const extensionTypeSchema = z.enum([
  'ui-panel',
  'command',
  'tool-adapter',
  'model-provider',
  'workflow-node',
  'file-previewer',
  'importer-exporter',
  'knowledge-connector',
  'device-adapter',
  'theme',
  'controller-profile',
  'learning-pack',
  'notification-provider',
  'browser-integration',
  'terminal-command-provider'
])
export type ExtensionType = z.infer<typeof extensionTypeSchema>

/** Capabilities are denied by default (supplemental §9.4) — every one of these must be explicitly granted during install review before the extension host's `CapabilityBroker` will authorize a single call. */
export const extensionCapabilitySchema = z.enum([
  'read-workspace-files',
  'write-workspace-files',
  'register-command',
  'add-workflow-node',
  'network-access',
  'add-view',
  'read-selected-context',
  'show-notification',
  'store-extension-data',
  'request-secret-reference',
  'register-importer',
  'register-model-adapter'
])
export type ExtensionCapability = z.infer<typeof extensionCapabilitySchema>

export const extensionCapabilityRequestSchema = z.object({
  capability: extensionCapabilitySchema,
  reason: z.string().min(1).max(500)
})
export type ExtensionCapabilityRequest = z.infer<typeof extensionCapabilityRequestSchema>

export const extensionEntrypointsSchema = z.object({
  /** Relative path, from the extension's real installed directory, to its real Node entry module — resolved and validated against directory traversal before the host ever loads it. */
  main: z.string().min(1)
})
export type ExtensionEntrypoints = z.infer<typeof extensionEntrypointsSchema>

export const extensionSignatureSchema = z.object({
  algorithm: z.string().min(1),
  publicKeyFingerprint: z.string().min(1),
  signature: z.string().min(1)
})
export type ExtensionSignature = z.infer<typeof extensionSignatureSchema>

export const extensionManifestSchema = z.object({
  schemaVersion: z.string().min(1),
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  version: z.string().min(1),
  publisher: z.string().min(1).max(200),
  description: z.string().max(2000),
  type: extensionTypeSchema,
  entrypoints: extensionEntrypointsSchema,
  capabilities: z.array(extensionCapabilityRequestSchema).default([]),
  minimumNdxVersion: z.string().min(1),
  supportedPlatforms: z.array(z.string()).default([]),
  dependencies: z.record(z.string(), z.string()).optional(),
  signature: extensionSignatureSchema.optional()
})
export type NdxExtensionManifest = z.infer<typeof extensionManifestSchema>

/** Real lifecycle states (supplemental §9.5) — `quarantined` is set automatically by health monitoring, never directly by the user. */
export const extensionStateSchema = z.enum([
  'installed',
  'enabled',
  'disabled',
  'quarantined',
  'removed'
])
export type ExtensionState = z.infer<typeof extensionStateSchema>

export const extensionTrustSchema = z.enum(['verified-publisher', 'signed', 'unsigned', 'revoked'])
export type ExtensionTrust = z.infer<typeof extensionTrustSchema>

export const extensionRecordSchema = z.object({
  manifest: extensionManifestSchema,
  /** Real absolute installed-directory path on disk, resolved once at install time. */
  installPath: z.string().min(1),
  state: extensionStateSchema,
  trust: extensionTrustSchema,
  /** Capabilities the user actually approved during install/permission review — may be a subset of `manifest.capabilities` requested; never a superset. */
  grantedCapabilities: z.array(extensionCapabilitySchema).default([]),
  /** Real fault count within the health-monitoring window (supplemental §9.6) — drives automatic quarantine, not a cosmetic counter. */
  faultCount: z.number().int().nonnegative().default(0),
  lastFaultAt: z.number().int().nonnegative().optional(),
  quarantineReason: z.string().optional(),
  installedAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type ExtensionRecord = z.infer<typeof extensionRecordSchema>

export const installExtensionRequestSchema = z.object({
  /** Real, already-resolved absolute directory path from a native folder picker — a marketplace download path doesn't exist yet (see ledger), so this is "install from a local unpacked extension directory," the same real, honest action VS Code calls "Install from Folder." */
  directoryPath: z.string().min(1),
  approvedCapabilities: z.array(extensionCapabilitySchema).default([])
})
export type InstallExtensionRequest = z.infer<typeof installExtensionRequestSchema>

export const previewExtensionInstallRequestSchema = z.object({
  directoryPath: z.string().min(1)
})
export type PreviewExtensionInstallRequest = z.infer<typeof previewExtensionInstallRequestSchema>

export const extensionInstallPreviewSchema = z.object({
  directoryPath: z.string().min(1),
  manifest: extensionManifestSchema,
  trust: extensionTrustSchema,
  requestedCapabilities: z.array(extensionCapabilityRequestSchema)
})
export type ExtensionInstallPreview = z.infer<typeof extensionInstallPreviewSchema>

export const extensionIdRequestSchema = z.object({ id: z.string().min(1) })
export type ExtensionIdRequest = z.infer<typeof extensionIdRequestSchema>

export const setExtensionEnabledRequestSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean()
})
export type SetExtensionEnabledRequest = z.infer<typeof setExtensionEnabledRequestSchema>

export const extensionHealthEventSchema = z.object({
  id: z.string().min(1),
  state: extensionStateSchema,
  faultCount: z.number().int().nonnegative(),
  quarantineReason: z.string().optional()
})
export type ExtensionHealthEvent = z.infer<typeof extensionHealthEventSchema>

/**
 * The real message protocol crossing the child-process boundary
 * (supplemental §9.3/§9.4) — every capability call an extension makes is
 * one of these, never a raw method call into host code. `CapabilityBroker`
 * (main-process side) checks `capability` against the extension's real
 * `grantedCapabilities` before dispatching `method`/`args` to a real,
 * narrow handler; anything not granted is denied, not silently ignored.
 */
export const extensionCapabilityCallSchema = z.object({
  requestId: z.string().min(1),
  capability: extensionCapabilitySchema,
  method: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({})
})
export type ExtensionCapabilityCall = z.infer<typeof extensionCapabilityCallSchema>

export const extensionCapabilityResultSchema = z.object({
  requestId: z.string().min(1),
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional()
})
export type ExtensionCapabilityResult = z.infer<typeof extensionCapabilityResultSchema>
