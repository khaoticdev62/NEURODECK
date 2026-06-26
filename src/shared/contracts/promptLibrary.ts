import { z } from 'zod'

/**
 * Epic X4 Prompt and Persona libraries (supplemental spec §14.1/§14.2).
 * Tool Library (§14.3) is a real read-only view over the existing
 * `ToolRegistry` (ai-safety) — no new persisted contract needed, see
 * the renderer hook. Skill packs (§14.4) are explicitly deferred — the
 * spec requires them to "use the same signing and permission model as
 * extensions," and Epic X3's extension signing is itself only
 * presence-checked, not cryptographically verified yet; building skill
 * packs on top of an unverified signing model would just compound that
 * gap.
 */
export const promptRiskClassSchema = z.enum(['low', 'medium', 'high'])
export type PromptRiskClass = z.infer<typeof promptRiskClassSchema>

export const promptTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  purpose: z.string().min(1).max(1000),
  inputs: z.array(z.string()).default([]),
  requiredTools: z.array(z.string()).default([]),
  workspaceScoped: z.boolean().default(false),
  modelRequirements: z.string().optional(),
  outputSchema: z.string().optional(),
  riskClass: promptRiskClassSchema,
  version: z.string().min(1),
  author: z.string().min(1),
  testCases: z.array(z.object({ input: z.string(), expectedOutcome: z.string() })).default([]),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type PromptTemplate = z.infer<typeof promptTemplateSchema>

export const upsertPromptTemplateRequestSchema = promptTemplateSchema.omit({
  createdAt: true,
  updatedAt: true
})
export type UpsertPromptTemplateRequest = z.infer<typeof upsertPromptTemplateRequestSchema>

/**
 * Personas may only ever describe *style*, never *authority* — by
 * construction, this schema has no field that could expand permissions,
 * bypass policy, hide impact, or auto-confirm a destructive action
 * (supplemental §14.2's explicit "Personas may not" list). There is no
 * field to add here that would violate it without it being immediately
 * obvious in review.
 */
export const personaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  communicationStyle: z.string().min(1).max(500),
  explanationDepth: z.enum(['concise', 'standard', 'detailed']),
  defaultModelProfile: z.string().optional(),
  suggestedToolIds: z.array(z.string()).default([]),
  reviewStrictness: z.enum(['standard', 'strict']).default('standard'),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type Persona = z.infer<typeof personaSchema>

export const upsertPersonaRequestSchema = personaSchema.omit({ createdAt: true, updatedAt: true })
export type UpsertPersonaRequest = z.infer<typeof upsertPersonaRequestSchema>

export const promptTemplateIdRequestSchema = z.object({ id: z.string().min(1) })
export type PromptTemplateIdRequest = z.infer<typeof promptTemplateIdRequestSchema>

export const personaIdRequestSchema = z.object({ id: z.string().min(1) })
export type PersonaIdRequest = z.infer<typeof personaIdRequestSchema>
