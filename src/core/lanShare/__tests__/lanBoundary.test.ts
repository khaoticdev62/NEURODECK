import { describe, expect, it } from 'vitest'
import {
  assertWithinLanBoundary,
  isPrivateOrLinkLocalAddress,
  UnsafeLanAddressError
} from '../lanBoundary'

describe('isPrivateOrLinkLocalAddress', () => {
  it('accepts real private IPv4 ranges', () => {
    expect(isPrivateOrLinkLocalAddress('192.168.1.50')).toBe(true)
    expect(isPrivateOrLinkLocalAddress('10.0.0.1')).toBe(true)
    expect(isPrivateOrLinkLocalAddress('172.16.5.5')).toBe(true)
    expect(isPrivateOrLinkLocalAddress('169.254.1.1')).toBe(true)
    expect(isPrivateOrLinkLocalAddress('127.0.0.1')).toBe(true)
  })

  it('rejects a real public IPv4 address', () => {
    expect(isPrivateOrLinkLocalAddress('8.8.8.8')).toBe(false)
    expect(isPrivateOrLinkLocalAddress('1.1.1.1')).toBe(false)
    expect(isPrivateOrLinkLocalAddress('172.32.0.1')).toBe(false)
  })

  it('accepts real private/link-local IPv6 addresses', () => {
    expect(isPrivateOrLinkLocalAddress('::1')).toBe(true)
    expect(isPrivateOrLinkLocalAddress('fe80::1234')).toBe(true)
    expect(isPrivateOrLinkLocalAddress('fd00::1')).toBe(true)
  })

  it('rejects a real public IPv6 address', () => {
    expect(isPrivateOrLinkLocalAddress('2606:4700:4700::1111')).toBe(false)
  })

  it('rejects malformed input rather than guessing', () => {
    expect(isPrivateOrLinkLocalAddress('not-an-address')).toBe(false)
    expect(isPrivateOrLinkLocalAddress('999.999.999.999')).toBe(false)
  })
})

describe('assertWithinLanBoundary', () => {
  it('does not throw for a real private address', () => {
    expect(() => assertWithinLanBoundary('192.168.1.1')).not.toThrow()
  })

  it('throws UnsafeLanAddressError for a real public address', () => {
    expect(() => assertWithinLanBoundary('8.8.8.8')).toThrow(UnsafeLanAddressError)
  })
})
