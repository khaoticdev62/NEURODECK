import { describe, expect, it } from 'vitest'
import {
  organizeSingleLineImports,
  parsePredictiveEditProposal,
  summarizeRange,
  wrapSelectionInTryCatch
} from '../editorTransforms'

describe('editorTransforms', () => {
  it('sorts and deduplicates top-level single-line imports without touching the body', () => {
    const source = [
      "import z from 'zod'",
      "import a from 'alpha'",
      "import z from 'zod'",
      '',
      'export const value = z.string().parse(a)'
    ].join('\n')

    expect(organizeSingleLineImports(source)).toBe(
      [
        "import a from 'alpha'",
        "import z from 'zod'",
        '',
        'export const value = z.string().parse(a)'
      ].join('\n')
    )
  })

  it('leaves files without supported import blocks unchanged', () => {
    const source = "const dynamicImport = await import('x')"
    expect(organizeSingleLineImports(source)).toBe(source)
  })

  it('wraps the selected text in a concrete try/catch structure', () => {
    expect(wrapSelectionInTryCatch('await run()\nreturn true')).toBe(
      [
        'try {',
        '  await run()',
        '  return true',
        '} catch (error) {',
        '  console.error(error)',
        '}'
      ].join('\n')
    )
  })

  it('summarizes single-line and multi-line ranges for review text', () => {
    expect(
      summarizeRange({ startLineNumber: 4, startColumn: 1, endLineNumber: 4, endColumn: 12 })
    ).toBe('line 4')
    expect(
      summarizeRange({ startLineNumber: 4, startColumn: 1, endLineNumber: 8, endColumn: 1 })
    ).toBe('lines 4-8')
  })

  it('parses reviewed predictive-edit JSON from a model response', () => {
    expect(
      parsePredictiveEditProposal(
        '{"replacement":"const answer = 42","explanation":"Use a named constant."}'
      )
    ).toEqual({
      replacement: 'const answer = 42',
      explanation: 'Use a named constant.'
    })
  })

  it('rejects predictive-edit responses without replacement text', () => {
    expect(() => parsePredictiveEditProposal('{"explanation":"nothing to apply"}')).toThrow(
      /replacement text/
    )
  })
})
