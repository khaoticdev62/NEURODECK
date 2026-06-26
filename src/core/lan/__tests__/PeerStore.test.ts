import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PeerStore } from '../PeerStore'

let dir: string
let store: PeerStore

const seen = {
  id: 'peer-1',
  friendlyName: "Ada's Deck",
  address: '192.168.1.50',
  port: 53317,
  fingerprint: 'sha256:abc123',
  online: 'online' as const,
  lastSeenAt: Date.now()
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-peers-'))
  store = new PeerStore(join(dir, 'peers.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('PeerStore', () => {
  it('starts with no peers', async () => {
    expect(await store.list()).toEqual([])
  })

  it('upsertSeen() records a new peer as untrusted by default', async () => {
    const peer = await store.upsertSeen(seen)
    expect(peer.trust).toBe('untrusted')
    expect(await store.list()).toEqual([peer])
  })

  it('upsertSeen() preserves an existing trust decision across re-announcements', async () => {
    await store.upsertSeen(seen)
    await store.setTrust('peer-1', 'trusted')

    const reAnnounced = await store.upsertSeen({ ...seen, lastSeenAt: Date.now() + 1000 })

    expect(reAnnounced.trust).toBe('trusted')
  })

  it('setTrust() updates a real peer and returns undefined for an unknown id', async () => {
    await store.upsertSeen(seen)
    const updated = await store.setTrust('peer-1', 'blocked')
    expect(updated?.trust).toBe('blocked')
    expect(await store.setTrust('missing', 'trusted')).toBeUndefined()
  })

  it('remove() deletes a peer', async () => {
    await store.upsertSeen(seen)
    expect(await store.remove('peer-1')).toBe(true)
    expect(await store.list()).toEqual([])
  })

  it('markStaleOffline() flips a real stale peer to offline without touching a recently-seen one', async () => {
    await store.upsertSeen({ ...seen, lastSeenAt: Date.now() - 100_000 })
    await store.upsertSeen({ ...seen, id: 'peer-2', lastSeenAt: Date.now() })

    await store.markStaleOffline(60_000)

    const peers = await store.list()
    expect(peers.find((peer) => peer.id === 'peer-1')?.online).toBe('offline')
    expect(peers.find((peer) => peer.id === 'peer-2')?.online).toBe('online')
  })
})
