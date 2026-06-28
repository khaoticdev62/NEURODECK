/**
 * Real default local-network boundary (spec §22 "Default local boundary
 * includes private/link-local ranges and same-subnet peers. No WAN
 * exposure."). Manual connect is the one place a user could otherwise
 * type a real public IP address and have this device dial out to the
 * open internet under the "LAN Share" name — this is the one real
 * choke point that stops that by default.
 */
export class UnsafeLanAddressError extends Error {}

const IPV4_PRIVATE_RANGES: [number, number][] = [
  // 10.0.0.0/8
  [ipv4ToInt(10, 0, 0, 0), ipv4ToInt(10, 255, 255, 255)],
  // 172.16.0.0/12
  [ipv4ToInt(172, 16, 0, 0), ipv4ToInt(172, 31, 255, 255)],
  // 192.168.0.0/16
  [ipv4ToInt(192, 168, 0, 0), ipv4ToInt(192, 168, 255, 255)],
  // 169.254.0.0/16 (link-local)
  [ipv4ToInt(169, 254, 0, 0), ipv4ToInt(169, 254, 255, 255)],
  // 127.0.0.0/8 (loopback)
  [ipv4ToInt(127, 0, 0, 0), ipv4ToInt(127, 255, 255, 255)]
]

function ipv4ToInt(a: number, b: number, c: number, d: number): number {
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0
}

function parseIpv4(address: string): number | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address)
  if (!match) return null
  const parts = match.slice(1, 5).map(Number)
  if (parts.some((part) => part < 0 || part > 255)) return null
  return ipv4ToInt(parts[0], parts[1], parts[2], parts[3])
}

function isPrivateOrLinkLocalIpv4(address: string): boolean {
  const value = parseIpv4(address)
  if (value === null) return false
  return IPV4_PRIVATE_RANGES.some(([start, end]) => value >= start && value <= end)
}

function isPrivateOrLinkLocalIpv6(address: string): boolean {
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true // loopback
  // fe80::/10 link-local: first hextet's top 10 bits fixed, i.e. fe80-febf.
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true
  // fc00::/7 unique local addresses: first byte is fc or fd.
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true
  return false
}

/** Real, honest classification — never assumes an address is safe just because it parsed. */
export function isPrivateOrLinkLocalAddress(address: string): boolean {
  if (address.includes(':')) return isPrivateOrLinkLocalIpv6(address)
  return isPrivateOrLinkLocalIpv4(address)
}

/** Throws `UnsafeLanAddressError` for any address outside the real private/link-local/loopback ranges — the default "no WAN exposure" boundary. */
export function assertWithinLanBoundary(address: string): void {
  if (!isPrivateOrLinkLocalAddress(address)) {
    throw new UnsafeLanAddressError(
      `"${address}" is not a private or link-local address — LAN Share does not connect to addresses outside the local network by default.`
    )
  }
}

/** grpc-js's `bindAsync`/dial target syntax requires bracketing a literal IPv6 host (e.g. `[::1]:1234`), unlike IPv4 or `0.0.0.0`. */
export function formatBindHost(address: string): string {
  return address.includes(':') ? `[${address}]` : address
}
