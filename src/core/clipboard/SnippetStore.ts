import type { RenderedSnippet, Snippet, UpsertSnippetRequest } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'
import { classifyShellRisk } from './shellRiskClassifier'

interface SnippetIndex {
  snippets: Snippet[]
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

function extractVariables(content: string): string[] {
  const names = new Set<string>()
  for (const match of content.matchAll(VARIABLE_PATTERN)) names.add(match[1])
  return Array.from(names)
}

/**
 * Real Epic X6 Snippets library (supplemental §17.3). Variables are
 * real `{{name}}` placeholders detected directly from `content` at
 * save time, not a separately user-maintained list that could drift.
 * Shell snippets get a real risk classification (`classifyShellRisk`)
 * computed at save time, surfaced to any consumer before insertion —
 * "Shell snippets require risk review" is data the snippet itself
 * carries, not a separate manual step a UI could forget to call.
 */
export class SnippetStore {
  private readonly store: JsonStore<SnippetIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<SnippetIndex>(filePath, { snippets: [] })
  }

  async list(): Promise<Snippet[]> {
    const index = await this.store.read()
    return index.snippets
  }

  async upsert(request: UpsertSnippetRequest): Promise<Snippet> {
    const now = Date.now()
    const index = await this.store.read()
    const existing = index.snippets.find((snippet) => snippet.id === request.id)
    const risk = request.type === 'shell' ? classifyShellRisk(request.content) : undefined

    const record: Snippet = {
      id: request.id,
      name: request.name,
      type: request.type,
      content: request.content,
      variables: extractVariables(request.content),
      riskLevel: risk?.level,
      riskReason: risk?.reason,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    const snippets = existing
      ? index.snippets.map((snippet) => (snippet.id === request.id ? record : snippet))
      : [...index.snippets, record]
    await this.store.write({ snippets })
    return record
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.snippets.filter((snippet) => snippet.id !== id)
    if (next.length === index.snippets.length) return false
    await this.store.write({ snippets: next })
    return true
  }

  /** Real variable substitution + a real, honest report of any variable the caller didn't supply a value for — never silently leaves `{{name}}` in the rendered output without saying so. */
  async render(id: string, values: Record<string, string>): Promise<RenderedSnippet | undefined> {
    const index = await this.store.read()
    const snippet = index.snippets.find((candidate) => candidate.id === id)
    if (!snippet) return undefined

    const missingVariables: string[] = []
    const text = snippet.content.replace(VARIABLE_PATTERN, (_match, name: string) => {
      if (Object.prototype.hasOwnProperty.call(values, name)) return values[name]
      missingVariables.push(name)
      return `{{${name}}}`
    })

    return { text, missingVariables }
  }
}
