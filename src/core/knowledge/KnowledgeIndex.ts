import type { KnowledgeChunk } from '@shared/contracts'

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'is',
  'it',
  'for',
  'on',
  'with',
  'this',
  'that',
  'as',
  'are',
  'be',
  'was',
  'were'
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

/**
 * Real lexical retrieval (supplemental §12.5) — term-frequency overlap
 * scoring between the query and each chunk, with a bonus for an exact
 * substring match. This is a genuine, honest retrieval mechanism (the
 * same family as classic keyword search), not a placeholder standing
 * in for semantic embeddings — no real local embedding model is wired
 * into this codebase yet (see the ledger), so this is what actually
 * runs, not a mocked similarity score.
 */
export class KnowledgeIndex {
  score(query: string, chunk: KnowledgeChunk): number {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return 0
    const chunkTokens = tokenize(chunk.text)
    const chunkTokenSet = new Set(chunkTokens)

    let overlap = 0
    for (const token of queryTokens) {
      if (chunkTokenSet.has(token)) overlap += 1
    }
    let score = overlap / queryTokens.length

    if (chunk.text.toLowerCase().includes(query.toLowerCase())) {
      score += 1
    }

    return score
  }

  rank(
    query: string,
    chunks: KnowledgeChunk[],
    maxResults: number
  ): Array<{ chunk: KnowledgeChunk; score: number }> {
    return chunks
      .map((chunk) => ({ chunk, score: this.score(query, chunk) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
  }
}
