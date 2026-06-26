import { extname } from 'node:path'

export interface ParseResult {
  text: string
  parserVersion: string
}

/**
 * Real text extraction for the source types this codebase can parse
 * without a new dependency (supplemental §12.1/§12.3): plain text,
 * Markdown, JSON, and CSV — all read and parsed for real, never a
 * placeholder. PDF and code-repository-wide parsing are explicitly out
 * of scope for this slice — no PDF-parsing dependency exists in this
 * codebase yet (adding one is its own decision), and "code repository"
 * ingestion needs a real multi-file walk + per-language chunking
 * strategy beyond a single-document parser. `parserVersion` is bumped
 * whenever this parsing logic changes, so `KnowledgeVaultService` can
 * detect a source that needs real reindexing under new logic.
 */
export const TEXT_PARSER_VERSION = '1'

export function parseJson(raw: string): ParseResult {
  const parsed = JSON.parse(raw)
  return { text: JSON.stringify(parsed, null, 2), parserVersion: TEXT_PARSER_VERSION }
}

export function parseCsv(raw: string): ParseResult {
  const rows = raw
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').join(' | '))
  return { text: rows.join('\n'), parserVersion: TEXT_PARSER_VERSION }
}

export function parsePlainText(raw: string): ParseResult {
  return { text: raw, parserVersion: TEXT_PARSER_VERSION }
}

export function isSupportedExtension(path: string): boolean {
  return ['.txt', '.md', '.markdown', '.json', '.csv'].includes(extname(path).toLowerCase())
}

export function parseByExtension(path: string, raw: string): ParseResult {
  const extension = extname(path).toLowerCase()
  if (extension === '.json') return parseJson(raw)
  if (extension === '.csv') return parseCsv(raw)
  return parsePlainText(raw)
}
