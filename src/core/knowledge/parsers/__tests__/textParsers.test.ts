import { describe, expect, it } from 'vitest'
import {
  isSupportedExtension,
  parseByExtension,
  parseCsv,
  parseJson,
  parsePlainText
} from '../textParsers'

describe('textParsers', () => {
  it('parsePlainText returns the raw text unchanged', () => {
    expect(parsePlainText('# Hello\n\nWorld').text).toBe('# Hello\n\nWorld')
  })

  it('parseJson re-serializes real parsed JSON, rejecting invalid JSON loudly', () => {
    const result = parseJson('{"a":1,"b":[1,2,3]}')
    expect(result.text).toContain('"a": 1')
    expect(() => parseJson('{ not json')).toThrow()
  })

  it('parseCsv converts real comma-separated rows into a readable form', () => {
    const result = parseCsv('name,age\nAlice,30\nBob,25')
    expect(result.text).toBe('name | age\nAlice | 30\nBob | 25')
  })

  it('isSupportedExtension recognizes real supported extensions only', () => {
    expect(isSupportedExtension('notes.md')).toBe(true)
    expect(isSupportedExtension('data.json')).toBe(true)
    expect(isSupportedExtension('table.csv')).toBe(true)
    expect(isSupportedExtension('document.pdf')).toBe(false)
    expect(isSupportedExtension('archive.zip')).toBe(false)
  })

  it('parseByExtension dispatches to the right real parser', () => {
    expect(parseByExtension('a.json', '{"x":1}').text).toContain('"x": 1')
    expect(parseByExtension('a.csv', 'x,y\n1,2').text).toBe('x | y\n1 | 2')
    expect(parseByExtension('a.md', '# Title').text).toBe('# Title')
  })
})
