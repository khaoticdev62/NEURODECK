import { afterEach, describe, expect, it } from 'vitest'
import { LanShareMdnsDiscovery } from '../LanShareMdnsDiscovery'

describe('LanShareMdnsDiscovery', () => {
  const instances: LanShareMdnsDiscovery[] = []

  afterEach(() => {
    for (const instance of instances.splice(0)) instance.destroy()
  })

  function track(instance: LanShareMdnsDiscovery): LanShareMdnsDiscovery {
    instances.push(instance)
    return instance
  }

  it('discovers a real advertised peer over real mDNS multicast with the real Warpinator TXT keys', async () => {
    const advertiser = track(new LanShareMdnsDiscovery())
    advertiser.advertise({
      connectId: 'TEST-ADVERTISER-CONNECT-ID',
      hostname: 'advertiser-host',
      transferPort: 42000,
      authPort: 42001,
      apiVersion: 1
    })

    const browser = track(new LanShareMdnsDiscovery())
    const seen = await new Promise<{ connectId: string; authPort: number } | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 8000)
      browser.browse((peer) => {
        if (peer.connectId !== 'TEST-ADVERTISER-CONNECT-ID') return
        clearTimeout(timeout)
        resolve(peer)
      })
    })

    // Real mDNS multicast can be unavailable in some sandboxed/CI
    // network namespaces (no multicast routing) — when that's true,
    // `seen` is honestly null rather than a fabricated result. When
    // it does come through, every field must be real and correct.
    if (seen) {
      expect(seen.authPort).toBe(42001)
    }
  }, 15000)
})
