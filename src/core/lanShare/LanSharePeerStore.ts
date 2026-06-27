import type {
  AddManualLanSharePeerRequest,
  LanSharePeer,
  LanSharePeerStatus,
  LanSharePlatform,
  LanShareRegistrationVersion,
  LanShareTrustState
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

export interface UpsertSeenLanSharePeerInput {
  id: string
  displayName: string
  addresses: string[]
  transferPort: number
  authPort: number
  registrationVersion: LanShareRegistrationVersion
  platform: LanSharePlatform
  status: LanSharePeerStatus
  fingerprint?: string
}

/**
 * Phase LAN-1 peer/trust persistence (spec §10–12, §27
 * `lan_share_manual_peers`/`lan_share_peer_observations`/
 * `lan_share_trusted_peers`/`lan_share_blocked_peers` consolidated into
 * one real store keyed by peer id). `upsertSeen` is real as of Phase
 * LAN-3 — `LanShareService` calls it with the real result of an mDNS
 * discovery + v1 registration handshake against an actual peer, never
 * a fabricated entry. A peer's existing `trustState`/`groupMatch` is
 * preserved across re-observations — only an explicit `setTrust` call
 * changes trust (spec §12: a re-observation never silently re-trusts).
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

  async upsertSeen(
    input: UpsertSeenLanSharePeerInput,
    discoverySource: 'mdns' | 'history' = 'mdns'
  ): Promise<LanSharePeer> {
    const peers = await this.store.read()
    const index = peers.findIndex((peer) => peer.id === input.id)
    const existing = index >= 0 ? peers[index] : undefined

    const peer: LanSharePeer = {
      id: input.id,
      displayName: input.displayName,
      addresses: input.addresses,
      transferPort: input.transferPort,
      authPort: input.authPort,
      registrationVersion: input.registrationVersion,
      platform: input.platform,
      capabilities: existing?.capabilities ?? [],
      trustState: existing?.trustState ?? 'unknown',
      fingerprint: input.fingerprint ?? existing?.fingerprint,
      groupMatch: existing?.groupMatch ?? false,
      lastSeenAt: Date.now(),
      discoverySource: existing?.discoverySource ?? discoverySource,
      status: input.status
    }

    const next = index >= 0 ? [...peers] : [...peers, peer]
    if (index >= 0) next[index] = peer
    await this.store.write(next)
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
