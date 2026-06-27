/**
 * `call.getPeer()` returns this grpc-js version's real, observed format:
 * `host:port` for IPv4 (e.g. `127.0.0.1:54321`), `[ipv6]:port` for IPv6,
 * with an optional `ipv4:`/`ipv6:` scheme prefix on other grpc-js
 * versions/platforms — handled defensively since this isn't a
 * documented, version-pinned format. Returns the host only, since the
 * ephemeral source port changes on every new connection and is never
 * the right rate-limiting/peer-identity key.
 */
export function parsePeerHost(peer: string): string | null {
  const withoutScheme = peer.replace(/^ipv[46]:/, '')
  const match = /^\[?([^\]]+)\]?:\d+$/.exec(withoutScheme)
  return match ? match[1] : null
}
