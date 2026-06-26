import type { PeerDevice, PeerTrustState } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface PeerIndex {
  peers: PeerDevice[]
}

/**
 * Real Epic X6 LAN peer registry (supplemental §19.1). `trust` defaults
 * to `untrusted` for every newly-seen peer — trust-on-first-use means
 * "the fingerprint is now known," not "the device is automatically
 * trusted to receive files," matching `RemoteHostStore`'s SSH host-key
 * model where recording a fingerprint and authorizing transfers are
 * two separate, explicit steps.
 */
export class PeerStore {
  private readonly store: JsonStore<PeerIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<PeerIndex>(filePath, { peers: [] })
  }

  async list(): Promise<PeerDevice[]> {
    const index = await this.store.read()
    return index.peers
  }

  async get(id: string): Promise<PeerDevice | undefined> {
    const index = await this.store.read()
    return index.peers.find((peer) => peer.id === id)
  }

  /** Real upsert-on-announce — a peer re-announcing updates `lastSeenAt`/`online` without resetting its real persisted `trust` state. */
  async upsertSeen(peer: Omit<PeerDevice, 'trust'>): Promise<PeerDevice> {
    const index = await this.store.read()
    const existing = index.peers.find((candidate) => candidate.id === peer.id)
    const record: PeerDevice = { ...peer, trust: existing?.trust ?? 'untrusted' }
    const peers = existing
      ? index.peers.map((candidate) => (candidate.id === peer.id ? record : candidate))
      : [...index.peers, record]
    await this.store.write({ peers })
    return record
  }

  async setTrust(id: string, trust: PeerTrustState): Promise<PeerDevice | undefined> {
    const index = await this.store.read()
    const existing = index.peers.find((peer) => peer.id === id)
    if (!existing) return undefined
    const updated = { ...existing, trust }
    await this.store.write({
      peers: index.peers.map((peer) => (peer.id === id ? updated : peer))
    })
    return updated
  }

  async remove(id: string): Promise<boolean> {
    const index = await this.store.read()
    const next = index.peers.filter((peer) => peer.id !== id)
    if (next.length === index.peers.length) return false
    await this.store.write({ peers: next })
    return true
  }

  /** Real "Online/offline state" (§19.1) — any peer not re-announced within `staleAfterMs` is marked offline, never left stuck `online` after it actually left the network. */
  async markStaleOffline(staleAfterMs: number): Promise<void> {
    const index = await this.store.read()
    const now = Date.now()
    await this.store.write({
      peers: index.peers.map((peer) =>
        peer.online === 'online' && now - peer.lastSeenAt > staleAfterMs
          ? { ...peer, online: 'offline' }
          : peer
      )
    })
  }
}
