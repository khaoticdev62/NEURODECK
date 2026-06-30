import type { GitFileChange } from '@shared/contracts'
import { completeModel } from '../../services/ipc/modelClient'
import { getGitDiff } from '../../services/ipc/gitClient'

/**
 * Real Git AI commit-message assistance (the named gap HANDOFF.md's
 * Git Service entry has tracked since Epic 6: "AI commit-message
 * assistance" remains deferred). Unlike `workflows/aiDecision.ts` or
 * `features/ai-canvas/planPreview.ts`, the model's output here is
 * presented directly to a human for review/edit in the existing
 * commit-message textarea — it never drives control flow or gets
 * parsed as structured data, so a strict-JSON contract would add
 * friction without adding safety. The user must still explicitly
 * review and commit; this only pre-fills a draft.
 */
const MAX_FILES = 10
const MAX_DIFF_CHARS_PER_FILE = 2000

const SYSTEM_PROMPT = `You write a single, conventional Git commit message (a short imperative summary line, optionally a blank line and 1-3 body bullet points for non-trivial changes) describing the real staged diff you are shown. Respond with ONLY the commit message text — no markdown fences, no explanation, no quotes around it.`

export type CommitMessageSuggestionResult =
  | { ok: true; data: string }
  | { ok: false; error: string }

export async function requestCommitMessageSuggestion(
  workspaceId: string,
  stagedChanges: GitFileChange[]
): Promise<CommitMessageSuggestionResult> {
  if (stagedChanges.length === 0) {
    return { ok: false, error: 'Stage at least one change before requesting a suggestion.' }
  }

  const files = stagedChanges.slice(0, MAX_FILES)
  const diffSections = await Promise.all(
    files.map(async (change) => {
      const result = await getGitDiff({ workspaceId, path: change.path, staged: true })
      const diff = result.ok ? result.data.diff : '(diff unavailable)'
      return `--- ${change.path} (${change.status}) ---\n${diff.slice(0, MAX_DIFF_CHARS_PER_FILE)}`
    })
  )
  const omittedCount = stagedChanges.length - files.length
  const omittedNote =
    omittedCount > 0 ? `\n\n(${omittedCount} additional staged file(s) not shown)` : ''

  const result = await completeModel({
    profileId: 'balanced',
    workspacePrivate: false,
    temperature: 0.3,
    maxTokens: 400,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: diffSections.join('\n\n') + omittedNote }
    ]
  })
  if (!result.ok) return { ok: false, error: result.error.userMessage }

  const message = result.data.content.trim()
  if (!message) return { ok: false, error: 'The model returned an empty commit message.' }
  return { ok: true, data: message }
}
