import { z } from 'zod'
import type { RoutingProfileId } from '@shared/contracts'
import { completeModel } from '../../services/ipc/modelClient'

/**
 * A real, model-generated plan preview for ND-013 AI Command Canvas. This is
 * a transparency/review artifact, not an execution contract — actual
 * execution still runs through the real `AgentRuntime` (the same iterative
 * objective→tool-call loop Agent Operations Center uses), which re-plans
 * independently rather than executing this preview's steps deterministically
 * one by one. `AgentRuntime` has no concept of a fixed, ordered, externally
 * authored step script, so reordering steps, assigning a different model per
 * step, or enforcing a hard file-count/network restriction from this preview
 * is not implemented — those need real per-step execution semantics this
 * runtime doesn't have yet.
 */
const planPreviewSchema = z.object({
  goal: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1).max(12),
  riskLevel: z.enum(['low', 'medium', 'high']),
  filesEstimate: z.string().min(1),
  networkRequired: z.boolean(),
  reversible: z.boolean()
})
export type PlanPreview = z.infer<typeof planPreviewSchema>

const SYSTEM_PROMPT = `You turn a user's plain-language intent into a short, reviewable execution plan for a desktop AI operating environment. Respond with ONLY a single JSON object, no prose, no markdown fences, matching exactly this shape:
{"goal": string, "steps": string[] (3-8 short imperative steps), "riskLevel": "low"|"medium"|"high", "filesEstimate": string (a short honest estimate like "0-5 files" or "unknown - depends on workspace size"), "networkRequired": boolean, "reversible": boolean}
Be conservative: if the intent implies destructive or hard-to-reverse actions, set riskLevel to "high" and reversible to false. If you are uncertain, say so plainly in filesEstimate rather than inventing a precise number.`

export type PlanPreviewResult = { ok: true; data: PlanPreview } | { ok: false; error: string }

export async function requestPlanPreview(
  intent: string,
  profileId: RoutingProfileId
): Promise<PlanPreviewResult> {
  const result = await completeModel({
    profileId,
    workspacePrivate: false,
    temperature: 0.1,
    maxTokens: 768,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: intent }
    ]
  })
  if (!result.ok) return { ok: false, error: result.error.userMessage }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(extractJsonObject(result.data.content))
  } catch {
    return { ok: false, error: 'The model did not return a valid plan. Try rephrasing the intent.' }
  }

  const parsed = planPreviewSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return { ok: false, error: 'The model returned a plan in an unexpected shape.' }
  }
  return { ok: true, data: parsed.data }
}

/** Models sometimes wrap JSON in markdown fences despite instructions — strip them rather than failing outright. */
function extractJsonObject(content: string): string {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenced ? fenced[1] : trimmed
}
