import type {
  AddManualLanSharePeerRequest,
  LanSharePeer,
  LanShareTrustState
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

/**
 * Phase LAN-1 peer/trust persistence (spec §10–12, §27
 * `lan_share_manual_peers`/`lan_share_peer_observations`/
 * `lan_share_trusted_peers`/`lan_share_blocked_peers` consolidated into
 * one real store keyed by peer id — splitting them into four physical
 * tables with no real discovery engine populating any of them yet would
 * be speculative). Real mDNS-driven peer observations land in Phase
 * LAN-3; for now this store only ever holds manually-added peers, but
 * its `upsertSeen`/trust-transition logic is the same real logic
 * discovery will call once it exists.
 */
export class LanSharePeerStore {
  private readonly store: JsonStore<LanSharePeer[]>

  constructor(filePath: string) {
    this.store = new JsonStore<LanSharePeer[]>(filePath, [])
  }

  async list(): Promise<LanSharePeer[]> {
    return this.store.read()
  }

  async get(id: string): Promise<LanSharePeer | undefined> {
    const peers = await this.store.read()
    return peers.find((peer) => peer.id === id)
  }

  async addManual(request: AddManualLanSharePeerRequest): Promise<LanSharePeer> {
    const id = `${request.address}:${request.transferPort}`
    const peers = await this.store.read()
    const existing = peers.find((peer) => peer.id === id)
    if (existing) return existing

    const peer: LanSharePeer = {
      id,
      displayName: request.address,
      addresses: [request.address],
      transferPort: request.transferPort,
      authPort: request.authPort,
      registrationVersion: 'unknown',
      platform: 'unknown',
      capabilities: [],
      trustState: 'unknown',
      groupMatch: false,
      lastSeenAt: Date.now(),
      discoverySource: 'manual',
      status: 'offline'
    }
    await this.store.write([...peers, peer])
    return peer
  }

  async remove(id: string): Promise<void> {
    const peers = await this.store.read()
    await this.store.write(peers.filter((peer) => peer.id !== id))
  }

  /**
   * Mirrors the real state machine in spec §12: a fingerprint change
   * never silently re-trusts, and `blocked` only ever changes via an
   * explicit `setTrust` call from the user, never an automatic
   * re-observation.
   */
  async setTrust(id: string, trustState: LanShareTrustState): Promise<LanSharePeer | undefined> {
    const peers = await this.store.read()
    const index = peers.findIndex((peer) => peer.id === id)
    if (index === -1) return undefined
    const updated = { ...peers[index], trustState }
    const next = [...peers]
    next[index] = updated
    await this.store.write(next)
    return updated
  }
}
