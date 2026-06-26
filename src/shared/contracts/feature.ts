import { z } from 'zod'
import { capabilityIdSchema } from './capability'

/**
 * Epic X1 Feature Registry (supplemental spec §34) — describes every
 * navigable feature so navigation can adapt (hide/disable) when a
 * declared capability is unavailable, an extension that owns the feature
 * is disabled, or a profile hides it, instead of leaving a route that
 * silently 404s or crashes. `FeatureRegistry.computeVisibility()` is the
 * one real decision function every consumer (today: the primary
 * Navigation Rail) calls — no screen invents its own hide/show logic.
 */
export const featureDescriptorSchema = z.object({
  id: z.string().min(1),
  route: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  capabilityDependencies: z.array(capabilityIdSchema).default([]),
  /** Permission capabilities from the existing AI-safety `PermissionBroker` scheme — distinct from hardware `capabilityDependencies` above. */
  permissionRequirements: z.array(z.string()).default([]),
  /** Empty means visible in every profile — no profile system exists yet (Epic X10), so every current entry is empty and real today. */
  profileVisibility: z.array(z.string()).default([]),
  /** Set once an extension actually registers this feature (Epic X3) — every current entry is `undefined` since no extension host exists yet. */
  extensionOwnerId: z.string().optional(),
  helpTopic: z.string().optional()
})
export type FeatureDescriptor = z.infer<typeof featureDescriptorSchema>

export const featureVisibilitySchema = z.enum(['visible', 'disabled', 'hidden'])
export type FeatureVisibility = z.infer<typeof featureVisibilitySchema>

export const featureStateSchema = z.object({
  descriptor: featureDescriptorSchema,
  visibility: featureVisibilitySchema,
  /** Always populated when `visibility` isn't `visible` — "no dead navigation" means a hidden/disabled entry must say why if anything ever surfaces it (e.g. a future command palette search hit). */
  reason: z.string().optional()
})
export type FeatureState = z.infer<typeof featureStateSchema>
