import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl, isAllowedNavigation, safeOrigin } from '../urlPolicy'

describe('isAllowedExternalUrl', () => {
  it('allows https URLs', () => {
    expect(isAllowedExternalUrl('https://example.com')).toBe(true)
  })

  it('allows mailto links', () => {
    expect(isAllowedExternalUrl('mailto:user@example.com')).toBe(true)
  })

  it('rejects http URLs', () => {
    expect(isAllowedExternalUrl('http://example.com')).toBe(false)
  })

  it('rejects file URLs', () => {
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects javascript URLs', () => {
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})

describe('safeOrigin', () => {
  it('returns the origin for a valid URL', () => {
    expect(safeOrigin('https://example.com/path?x=1')).toBe('https://example.com')
  })

  it('returns null for a malformed URL', () => {
    expect(safeOrigin('not a url')).toBeNull()
  })
})

describe('isAllowedNavigation', () => {
  const allowed = ['http://localhost:5173', 'file://']

  it('allows navigation to an allowlisted origin', () => {
    expect(isAllowedNavigation('http://localhost:5173/index.html', allowed)).toBe(true)
  })

  it('denies navigation to a non-allowlisted origin', () => {
    expect(isAllowedNavigation('https://attacker.example', allowed)).toBe(false)
  })

  it('denies malformed navigation targets', () => {
    expect(isAllowedNavigation('not a url', allowed)).toBe(false)
  })
})
