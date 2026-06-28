import { z } from 'zod'

/**
 * ND-056 About and Diagnostics. Every field is real, sourced from
 * `app.getVersion()`/`process.versions`/`process.platform`/`process.arch`
 * and the real configured providers — never a fabricated "build hash" or
 * "database version" placeholder. Fields the current architecture has no
 * real value for (no separate core-service process, no database, no
 * license file) are honestly reported as such rather than invented.
 */
export const diagnosticsInfoSchema = z.object({
  appVersion: z.string(),
  electronVersion: z.string(),
  chromeVersion: z.string(),
  nodeVersion: z.string(),
  platform: z.string(),
  arch: z.string(),
  license: z.string(),
  modelProviderNames: z.array(z.string())
})
export type DiagnosticsInfo = z.infer<typeof diagnosticsInfoSchema>

export const supportBundleRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  path: z.string(),
  byteSize: z.number(),
  sha256: z.string(),
  includes: z.array(z.string()),
  redactions: z.array(z.string())
})
export type SupportBundleRecord = z.infer<typeof supportBundleRecordSchema>
