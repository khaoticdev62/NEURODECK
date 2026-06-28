import { z } from 'zod'

export const operatingModeSchema = z.enum(['owner', 'work', 'creator', 'guest', 'private'])
export type OperatingMode = z.infer<typeof operatingModeSchema>

export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mode: operatingModeSchema,
  color: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type UserProfile = z.infer<typeof profileSchema>

export const profileSessionSchema = z.object({
  activeProfileId: z.string().min(1),
  guestModeActive: z.boolean(),
  privateModeActive: z.boolean(),
  startedAt: z.number().int().nonnegative()
})
export type ProfileSession = z.infer<typeof profileSessionSchema>

export const profileStateSchema = z.object({
  profiles: z.array(profileSchema),
  session: profileSessionSchema
})
export type ProfileState = z.infer<typeof profileStateSchema>

export const createProfileRequestSchema = z.object({
  name: z.string().min(1),
  mode: operatingModeSchema.default('work'),
  color: z.string().min(1).default('blue')
})
export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>

export const profileIdRequestSchema = z.object({ id: z.string().min(1) })
export type ProfileIdRequest = z.infer<typeof profileIdRequestSchema>

export const updateProfileRequestSchema = profileIdRequestSchema.extend({
  name: z.string().min(1).optional(),
  mode: operatingModeSchema.optional(),
  color: z.string().min(1).optional()
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const startProfileSessionRequestSchema = profileIdRequestSchema.extend({
  privateMode: z.boolean().default(false)
})
export type StartProfileSessionRequest = z.infer<typeof startProfileSessionRequestSchema>
