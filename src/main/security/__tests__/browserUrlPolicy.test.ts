import { describe, expect, it } from 'vitest'
import { isAllowedBrowserUrl } from '../browserUrlPolicy'

describe('isAllowedBrowserUrl', () => {
  it('allows https URLs', () => {
    expect(isAllowedBrowserUrl('https://example.com')).toBe(true)
  })

  it('allows http URLs', () => {
    expect(isAllowedBrowserUrl('http://example.com')).toBe(true)
  })

  it('rejects javascript URLs', () => {
    expect(isAllowedBrowserUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects file URLs', () => {
    expect(isAllowedBrowserUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects data URLs', () => {
    expect(isAllowedBrowserUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects chrome and view-source URLs', () => {
    expect(isAllowedBrowserUrl('chrome://settings')).toBe(false)
    expect(isAllowedBrowserUrl('view-source:https://example.com')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isAllowedBrowserUrl('not a url')).toBe(false)
  })
})
