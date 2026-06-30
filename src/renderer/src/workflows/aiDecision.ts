import { z } from 'zod'
import { completeModel } from '../services/ipc/modelClient'

/**
 * Real Epic 8 "AI decision" workflow step (mega-prompt §25's named
 * gap, unblocked by Epic 9's real model router). Mirrors
 * `features/ai-canvas/planPreview.ts`'s strict-JSON contract — the
 * model must respond with structured data, never free-form prose
 * the engine would have to interpret heuristically. Like
 * `condition`/`validator`, this can only stop a run early; it cannot
 * branch or loop, matching the sequential-only engine's documented
 * scope.
 */
const aiDecisionResponseSchema = z.object({
  proceed: z.boolean(),
  reason: z.string().min(1)
})
export type AiDecisionResponse = z.infer<typeof aiDecisionResponseSchema>

const SYSTEM_PROMPT = `You evaluate a single yes/no checkpoint inside an automated workflow. Respond with ONLY a single JSON object, no prose, no markdown fences, matching exactly this shape:
{"proceed": boolean, "reason": string (a short, one-sentence explanation of your decision)}
If you are uncertain or the prompt and context are insufficient to decide safely, set proceed to false and explain why in reason.`

export type AiDecisionResult = { ok: true; data: AiDecisionResponse } | { ok: false; error: string }

export async function requestAiDecision(
  prompt: string,
  context: Record<string, string>
): Promise<AiDecisionResult> {
  const contextBlock =
    Object.keys(context).length > 0
      ? `Current workflow context variables: ${JSON.stringify(context)}`
      : 'No workflow context variables are set.'

  const result = await completeModel({
    profileId: 'balanced',
    workspacePrivate: false,
    temperature: 0.1,
    maxTokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${contextBlock}\n\nDecision to make: ${prompt}` }
    ]
  })
  if (!result.ok) return { ok: false, error: result.error.userMessage }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(extractJsonObject(result.data.content))
  } catch {
    return { ok: false, error: 'The model did not return a valid decision.' }
  }

  const parsed = aiDecisionResponseSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return { ok: false, error: 'The model returned a decision in an unexpected shape.' }
  }
  return { ok: true, data: parsed.data }
}

/** Models sometimes wrap JSON in markdown fences despite instructions — strip them rather than failing outright. */
function extractJsonObject(content: string): string {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenced ? fenced[1] : trimmed
}
