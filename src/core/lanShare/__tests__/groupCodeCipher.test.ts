import { describe, expect, it } from 'vitest'
import { decryptWithGroupCode, encryptWithGroupCode } from '../grpc/groupCodeCipher'

describe('groupCodeCipher', () => {
  it('round-trips real plaintext through a real NaCl secretbox', () => {
    const encoded = encryptWithGroupCode('Warpinator', '-----BEGIN CERTIFICATE-----abc')
    expect(decryptWithGroupCode('Warpinator', encoded)).toBe('-----BEGIN CERTIFICATE-----abc')
  })

  it('produces a different nonce/ciphertext on every call (no nonce reuse)', () => {
    const first = encryptWithGroupCode('Warpinator', 'same plaintext')
    const second = encryptWithGroupCode('Warpinator', 'same plaintext')
    expect(first).not.toBe(second)
  })

  it('fails to decrypt with the wrong group code — a real, detectable group mismatch', () => {
    const encoded = encryptWithGroupCode('correct-code', 'secret payload')
    expect(decryptWithGroupCode('wrong-code', encoded)).toBeNull()
  })

  it('fails to decrypt malformed input rather than throwing', () => {
    expect(decryptWithGroupCode('any-code', 'not-real-base64-ciphertext')).toBeNull()
  })
})
