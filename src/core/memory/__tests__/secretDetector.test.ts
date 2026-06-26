import { describe, expect, it } from 'vitest'
import { detectSecret } from '../secretDetector'

describe('detectSecret', () => {
  it('detects a real AWS access key shape', () => {
    expect(detectSecret('my key is AKIAABCDEFGHIJKLMNOP').detected).toBe(true)
  })

  it('detects a PEM private key block', () => {
    expect(detectSecret('-----BEGIN RSA PRIVATE KEY-----\nMIIBOg...').detected).toBe(true)
  })

  it('detects a JWT-shaped string', () => {
    expect(
      detectSecret(
        'token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      ).detected
    ).toBe(true)
  })

  it('detects a GitHub personal access token shape', () => {
    expect(detectSecret('ghp_' + 'a'.repeat(36)).detected).toBe(true)
  })

  it('detects a generic api_key=... assignment', () => {
    expect(detectSecret('api_key: "sk-abc123def456"').detected).toBe(true)
  })

  it('detects a Bearer token', () => {
    expect(
      detectSecret('Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789').detected
    ).toBe(true)
  })

  it('does not flag ordinary, non-secret-shaped prose', () => {
    expect(detectSecret('The user prefers dark mode and tabs over spaces.').detected).toBe(false)
  })

  it('does not flag a short, normal sentence with punctuation', () => {
    expect(detectSecret('Always run tests before committing changes.').detected).toBe(false)
  })
})
