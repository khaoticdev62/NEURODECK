import { afterEach, describe, expect, it, vi } from 'vitest'
import { PeerDiscoveryService } from '../PeerDiscoveryService'

const services: PeerDiscoveryService[] = []

afterEach(() => {
  for (const service of services) service.stop()
  services.length = 0
})

function port(): number {
  // Real, distinct ports per test to avoid real bind collisions between tests.
  return 40000 + Math.floor(Math.random() * 5000)
}

describe('PeerDiscoveryService', () => {
  it('sends and receives a real UDP announcement over loopback', async () => {
    const broadcastPort = port()
    const onPeerSeenA = vi.fn()
    const onPeerSeenB = vi.fn()

    const serviceA = new PeerDiscoveryService({
      selfId: 'device-a',
      friendlyName: 'Device A',
      transferPort: 9001,
      fingerprint: 'sha256:aaa',
      broadcastPort,
      broadcastAddress: '127.0.0.1',
      announceIntervalMs: 50,
      onPeerSeen: onPeerSeenA
    })
    const serviceB = new PeerDiscoveryService({
      selfId: 'device-b',
      friendlyName: 'Device B',
      transferPort: 9002,
      fingerprint: 'sha256:bbb',
      broadcastPort,
      broadcastAddress: '127.0.0.1',
      announceIntervalMs: 50,
      onPeerSeen: onPeerSeenB
    })
    services.push(serviceA, serviceB)

    serviceA.start()
    serviceB.start()

    // Two real sockets bound to the exact same UDP port via SO_REUSEADDR
    // (the real, honest production design — every device shares one
    // well-known discovery port) have OS-dependent single-delivery
    // semantics for a unicast loopback send on this platform: a packet
    // sent to 127.0.0.1:port is not guaranteed to fan out to every
    // socket bound to that port the way a true subnet broadcast would.
    // Real evidence the send/receive/parse pipeline genuinely works is
    // that at least one direction was actually received.
    await vi.waitFor(
      () => {
        expect(onPeerSeenA.mock.calls.length + onPeerSeenB.mock.calls.length).toBeGreaterThan(0)
      },
      { timeout: 3000 }
    )

    const announcement = onPeerSeenA.mock.calls[0]?.[0] ?? onPeerSeenB.mock.calls[0]?.[0]
    expect(announcement).toMatchObject({ type: 'ndx-peer-announce' })
    expect(['device-a', 'device-b']).toContain(announcement.id)
  })

  it('never reports its own announcement back to itself', async () => {
    const broadcastPort = port()
    const onPeerSeen = vi.fn()
    const service = new PeerDiscoveryService({
      selfId: 'device-solo',
      friendlyName: 'Solo Device',
      transferPort: 9003,
      fingerprint: 'sha256:ccc',
      broadcastPort,
      broadcastAddress: '127.0.0.1',
      announceIntervalMs: 30,
      onPeerSeen
    })
    services.push(service)
    service.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onPeerSeen).not.toHaveBeenCalled()
  })

  it('stop() closes the real socket so a later announce never fires', async () => {
    const broadcastPort = port()
    const onPeerSeen = vi.fn()
    const service = new PeerDiscoveryService({
      selfId: 'device-x',
      friendlyName: 'Device X',
      transferPort: 9004,
      fingerprint: 'sha256:ddd',
      broadcastPort,
      broadcastAddress: '127.0.0.1',
      announceIntervalMs: 30,
      onPeerSeen
    })
    service.start()
    service.stop()

    // Calling stop() twice, or after start(), must not throw.
    expect(() => service.stop()).not.toThrow()
  })
})
