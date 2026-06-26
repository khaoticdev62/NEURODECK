import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LanSharePeerStore } from '../LanSharePeerStore'

describe('LanSharePeerStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-peers-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('adds a manual peer as unknown trust by default', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    const peer = await store.addManual({
      address: '192.168.1.50',
      transferPort: 42000,
      authPort: 42001
    })
    expect(peer.trustState).toBe('unknown')
    expect(peer.discoverySource).toBe('manual')
    expect(await store.list()).toHaveLength(1)
  })

  it('does not duplicate the same manual peer', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    await store.addManual({ address: '192.168.1.50', transferPort: 42000, authPort: 42001 })
    await store.addManual({ address: '192.168.1.50', transferPort: 42000, authPort: 42001 })
    expect(await store.list()).toHaveLength(1)
  })

  it('transitions trust state explicitly', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    const peer = await store.addManual({
      address: '192.168.1.50',
      transferPort: 42000,
      authPort: 42001
    })
    const trusted = await store.setTrust(peer.id, 'trusted')
    expect(trusted?.trustState).toBe('trusted')
  })

  it('removes a peer', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    const peer = await store.addManual({
      address: '192.168.1.50',
      transferPort: 42000,
      authPort: 42001
    })
    await store.remove(peer.id)
    expect(await store.list()).toHaveLength(0)
  })

  it('returns undefined when setting trust on an unknown peer', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    expect(await store.setTrust('missing', 'trusted')).toBeUndefined()
  })
})
