import { describe, expect, it } from 'vitest'
import { detectLanguage } from '../detectLanguage'

describe('detectLanguage', () => {
  it('maps common extensions to their real Monaco language ids', () => {
    expect(detectLanguage('src/index.ts')).toBe('typescript')
    expect(detectLanguage('src/App.tsx')).toBe('typescript')
    expect(detectLanguage('script.js')).toBe('javascript')
    expect(detectLanguage('package.json')).toBe('json')
    expect(detectLanguage('styles.css')).toBe('css')
    expect(detectLanguage('README.md')).toBe('markdown')
    expect(detectLanguage('main.rs')).toBe('rust')
  })

  it('is case-insensitive on the extension', () => {
    expect(detectLanguage('FILE.TS')).toBe('typescript')
  })

  it('falls back to plaintext for unknown or missing extensions', () => {
    expect(detectLanguage('Makefile')).toBe('plaintext')
    expect(detectLanguage('archive.unknownext')).toBe('plaintext')
  })

  it('handles nested paths with multiple dots', () => {
    expect(detectLanguage('src/feature/component.test.tsx')).toBe('typescript')
  })
})
