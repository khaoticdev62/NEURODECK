import { z } from 'zod'

/**
 * Epic X2 Application ecosystem (supplemental spec §6/§7/§8) — discovery,
 * launch, and the Flatpak package lifecycle on top of Epic X1's
 * `ApplicationRecord`/`ApplicationStore`. Steam Shortcut Manager's
 * binary `shortcuts.vdf` read/write (§8) is explicitly deferred — see
 * the ledger for why a rushed, under-tested binary-format implementation
 * against a real user Steam config isn't attempted in this slice.
 */
export const applicationDiscoverySourceSchema = z.enum([
  'desktop-entry',
  'steam-library',
  'flatpak'
])
export type ApplicationDiscoverySource = z.infer<typeof applicationDiscoverySourceSchema>

export const discoverApplicationsRequestSchema = z.object({
  sources: z.array(applicationDiscoverySourceSchema).optional()
})
export type DiscoverApplicationsRequest = z.infer<typeof discoverApplicationsRequestSchema>

export const launchApplicationRequestSchema = z.object({ id: z.string().min(1) })
export type LaunchApplicationRequest = z.infer<typeof launchApplicationRequestSchema>

export const launchResultSchema = z.object({
  launched: z.boolean(),
  pid: z.number().int().optional(),
  message: z.string().optional()
})
export type LaunchResult = z.infer<typeof launchResultSchema>

export const registerAppImageRequestSchema = z.object({
  /** Real, already-resolved absolute path from the native file picker — never a user-typed string. */
  path: z.string().min(1)
})
export type RegisterAppImageRequest = z.infer<typeof registerAppImageRequestSchema>

export const flatpakRefRequestSchema = z.object({ ref: z.string().min(1) })
export type FlatpakRefRequest = z.infer<typeof flatpakRefRequestSchema>

export const flatpakSearchRequestSchema = z.object({ query: z.string().min(1) })
export type FlatpakSearchRequest = z.infer<typeof flatpakSearchRequestSchema>

export const flatpakRemoteAppSchema = z.object({
  ref: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional(),
  remote: z.string().min(1)
})
export type FlatpakRemoteApp = z.infer<typeof flatpakRemoteAppSchema>

export const flatpakPermissionPreviewSchema = z.object({
  ref: z.string().min(1),
  permissions: z.array(z.string())
})
export type FlatpakPermissionPreview = z.infer<typeof flatpakPermissionPreviewSchema>
