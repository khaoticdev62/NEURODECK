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

  it('demotes a trusted peer to fingerprint-changed on a real fingerprint mismatch', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    await store.upsertSeen({
      id: 'peer-1',
      displayName: 'Peer One',
      addresses: ['192.168.1.50'],
      transferPort: 42000,
      authPort: 42001,
      registrationVersion: 2,
      platform: 'unknown',
      status: 'online',
      fingerprint: 'aaaa'
    })
    await store.setTrust('peer-1', 'trusted')

    const updated = await store.upsertSeen({
      id: 'peer-1',
      displayName: 'Peer One',
      addresses: ['192.168.1.50'],
      transferPort: 42000,
      authPort: 42001,
      registrationVersion: 2,
      platform: 'unknown',
      status: 'online',
      fingerprint: 'bbbb'
    })

    expect(updated.trustState).toBe('fingerprint-changed')
  })

  it('never silently un-blocks a peer on re-observation', async () => {
    const store = new LanSharePeerStore(join(dir, 'peers.json'))
    await store.upsertSeen({
      id: 'peer-1',
      displayName: 'Peer One',
      addresses: ['192.168.1.50'],
      transferPort: 42000,
      authPort: 42001,
      registrationVersion: 1,
      platform: 'unknown',
      status: 'online'
    })
    await store.setTrust('peer-1', 'blocked')

    const updated = await store.upsertSeen({
      id: 'peer-1',
      displayName: 'Peer One',
      addresses: ['192.168.1.50'],
      transferPort: 42000,
      authPort: 42001,
      registrationVersion: 1,
      platform: 'unknown',
      status: 'online'
    })

    expect(updated.trustState).toBe('blocked')
  })
})
