import { z } from 'zod'

/**
 * Epic X1 Application Registry (supplemental spec §6.2) — the persisted
 * record shape and real CRUD only. Real multi-source *discovery* (Steam
 * library, desktop entries, Flatpak, AppImage, system packages) is Epic
 * X2's job (Application Library) — building fabricated discovery here
 * ahead of a real adapter would violate the "no package-manager lies"
 * non-negotiable. This registry is the shared store every discovery
 * adapter will write real, verified records into.
 */
export const applicationSourceSchema = z.enum([
  'steam',
  'desktop-entry',
  'flatpak',
  'appimage',
  'system',
  'web',
  'remote',
  'internal',
  'custom'
])
export type ApplicationSource = z.infer<typeof applicationSourceSchema>

export const applicationHealthSchema = z.enum(['ok', 'degraded', 'crashed', 'unknown'])
export type ApplicationHealth = z.infer<typeof applicationHealthSchema>

export const applicationLaunchModeSchema = z.enum([
  'windowed',
  'fullscreen',
  'background',
  'external'
])
export type ApplicationLaunchMode = z.infer<typeof applicationLaunchModeSchema>

export const applicationRecordSchema = z.object({
  id: z.string().min(1),
  source: applicationSourceSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  iconRef: z.string().optional(),
  executableRef: z.string().optional(),
  launchArguments: z.array(z.string()).default([]),
  workingDirectory: z.string().optional(),
  categories: z.array(z.string()).default([]),
  installed: z.boolean(),
  updateAvailable: z.boolean().optional(),
  controllerProfileId: z.string().optional(),
  permissionProfileId: z.string().optional(),
  workspaceIds: z.array(z.string()).default([]),
  launchMode: applicationLaunchModeSchema,
  capabilityRequirements: z.array(z.string()).default([]),
  lastLaunchedAt: z.number().int().nonnegative().optional(),
  health: applicationHealthSchema.optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type ApplicationRecord = z.infer<typeof applicationRecordSchema>

export const upsertApplicationRequestSchema = applicationRecordSchema.omit({
  createdAt: true,
  updatedAt: true
})
export type UpsertApplicationRequest = z.infer<typeof upsertApplicationRequestSchema>

export const applicationIdRequestSchema = z.object({ id: z.string().min(1) })
export type ApplicationIdRequest = z.infer<typeof applicationIdRequestSchema>
