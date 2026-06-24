export interface TextRange {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface PredictiveEditProposal {
  replacement: string
  explanation: string
}

const IMPORT_LINE_PATTERN = /^\s*import\s.+['"];?\s*$/

export function organizeSingleLineImports(content: string): string {
  const lines = content.split('\n')
  const firstImportIndex = lines.findIndex((line) => IMPORT_LINE_PATTERN.test(line))
  if (firstImportIndex === -1) return content

  let endIndex = firstImportIndex
  while (endIndex < lines.length && IMPORT_LINE_PATTERN.test(lines[endIndex])) {
    endIndex += 1
  }

  const imports = lines.slice(firstImportIndex, endIndex)
  const sortedImports = Array.from(new Set(imports)).sort((a, b) =>
    a.trim().localeCompare(b.trim(), undefined, { sensitivity: 'base' })
  )

  return [...lines.slice(0, firstImportIndex), ...sortedImports, ...lines.slice(endIndex)].join(
    '\n'
  )
}

export function wrapSelectionInTryCatch(selection: string): string {
  const body = selection
    .split('\n')
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join('\n')
  return `try {\n${body}\n} catch (error) {\n  console.error(error)\n}`
}

export function summarizeRange(range: TextRange): string {
  if (range.startLineNumber === range.endLineNumber) return `line ${range.startLineNumber}`
  return `lines ${range.startLineNumber}-${range.endLineNumber}`
}

export function parsePredictiveEditProposal(raw: string): PredictiveEditProposal {
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd <= jsonStart) {
    throw new Error('The model did not return a JSON edit proposal.')
  }

  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Partial<PredictiveEditProposal>
  const replacement = typeof parsed.replacement === 'string' ? parsed.replacement : ''
  const explanation = typeof parsed.explanation === 'string' ? parsed.explanation : ''

  if (!replacement.trim()) throw new Error('The edit proposal did not include replacement text.')
  if (replacement.length > 12000)
    throw new Error('The edit proposal is too large to review safely.')

  return {
    replacement,
    explanation: explanation.trim() || 'Model proposed a replacement for the selected editor range.'
  }
}
