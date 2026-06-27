import { constants as fsConstants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { createServer, type Server, type Socket } from 'node:net'
import type { LanShareHealth, LanShareServiceStatus, LanShareSettings } from '@shared/contracts'
import { LanShareRegistrationClient } from './grpc/LanShareRegistrationClient'
import {
  LanShareRegistrationServer,
  type NdxServiceRegistration
} from './grpc/LanShareRegistrationServer'
import type { LanShareIdentityStore } from './LanShareIdentityStore'
import type { LanShareInterfaceManager } from './LanShareInterfaceManager'
import { LanShareMdnsDiscovery, type DiscoveredLanSharePeer } from './LanShareMdnsDiscovery'
import type { LanSharePeerStore } from './LanSharePeerStore'
import type { LanShareSettingsStore } from './LanShareSettingsStore'

/** Warpinator's own current `RPC_API_VERSION` is `2` (confirmed in `meson.build`, audited in docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md). This device honestly reports `1`: real v2 also needs the certificate exchange Phase LAN-4 hasn't built, and a real peer that sees `api_version: 1` correctly falls back to v1-only behavior with us. */
const SELF_REPORTED_API_VERSION = 1

/**
 * Phase LAN-2/LAN-3 service lifecycle (spec §5 "LAN Share Supervisor",
 * §10, §26). `start()` binds a real transfer-port placeholder socket
 * (Phase LAN-5/6 still owns the `Warp` transfer service), a real gRPC
 * `WarpRegistration` server on the auth port, and real mDNS
 * advertise/browse using Warpinator's own confirmed service type. A
 * peer discovered via mDNS gets a real v1 registration handshake
 * attempted against it; the real result (success or a real gRPC
 * error) is what `LanSharePeerStore` ends up recording — never a
 * fabricated "found" entry. Auto-start is deliberately never wired
 * into app boot — spec §24 gates it behind "secure mode" (a real group
 * code), which Phase LAN-4 has not built yet.
 */
export class LanShareService {
  private transferServer: Server | null = null
  private registrationServer: LanShareRegistrationServer | null = null
  private readonly mdnsDiscovery = new LanShareMdnsDiscovery()
  private readonly registrationClient = new LanShareRegistrationClient()
  private status: LanShareServiceStatus = { state: 'stopped', reason: 'Not started.' }
  private listeners = new Set<(status: LanShareServiceStatus) => void>()

  constructor(
    private readonly settingsStore: LanShareSettingsStore,
    private readonly interfaceManager: LanShareInterfaceManager,
    private readonly identityStore: LanShareIdentityStore,
    private readonly peerStore: LanSharePeerStore
  ) {}

  getStatus(): LanShareServiceStatus {
    return this.status
  }

  onChange(listener: (status: LanShareServiceStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<LanShareServiceStatus> {
    if (this.status.state === 'running' || this.status.state === 'starting') {
      return this.status
    }
    this.setStatus({ state: 'starting', reason: 'Binding real transfer and registration sockets.' })

    const settings = await this.settingsStore.get()
    const identity = await this.identityStore.get()

    try {
      this.transferServer = await this.listenOn(settings.transferPort)
      this.registrationServer = new LanShareRegistrationServer()
      await this.registrationServer.start(settings.authPort, {
        getOwnRegistration: () => this.buildOwnRegistration(settings, identity.connectId),
        onPeerRegistered: (registration, peerAddress) => {
          void this.recordPeerFromRegistration(registration, peerAddress)
        }
      })
    } catch (error) {
      await this.registrationServer?.stop()
      this.registrationServer = null
      this.closeServers()
      const reason =
        error instanceof Error
          ? `Failed to bind a real listening socket: ${error.message}`
          : 'Failed to bind a real listening socket.'
      this.setStatus({ state: 'error', reason })
      return this.status
    }

    this.mdnsDiscovery.advertise({
      connectId: identity.connectId,
      hostname: identity.displayName,
      transferPort: settings.transferPort,
      authPort: settings.authPort,
      apiVersion: SELF_REPORTED_API_VERSION
    })
    this.mdnsDiscovery.browse((discovered) => {
      void this.handleDiscoveredPeer(discovered, identity.connectId, settings)
    })

    this.setStatus({
      state: 'running',
      reason: 'Transfer and registration sockets are bound and accepting connections.',
      startedAt: Date.now()
    })
    return this.status
  }

  async stop(): Promise<LanShareServiceStatus> {
    this.mdnsDiscovery.destroy()
    await this.registrationServer?.stop()
    this.registrationServer = null
    this.closeServers()
    this.setStatus({ state: 'stopped', reason: 'Stopped by request.' })
    return this.status
  }

  async getHealth(): Promise<LanShareHealth> {
    const settings = await this.settingsStore.get()
    return {
      serviceState: this.status.state,
      transferPortBound: this.transferServer?.listening ?? false,
      authPortBound: this.registrationServer !== null,
      receiveDirectoryWritable: await this.checkReceiveDirectoryWritable(settings.receiveDirectory),
      interfaceCount: this.interfaceManager.list().length
    }
  }

  /**
   * Real manual-connection protocol probe (spec §10 "Manual connection
   * ... Protocol probe"). Attempts the real v1 registration handshake
   * against the entered address/ports and records the real result —
   * never assumes a manually-entered peer is reachable or compatible
   * just because the user typed an address.
   */
  async probeManualPeer(address: string, transferPort: number, authPort: number): Promise<void> {
    const settings = await this.settingsStore.get()
    const identity = await this.identityStore.get()
    await this.handleDiscoveredPeer(
      {
        connectId: '',
        hostname: address,
        addresses: [address],
        transferPort,
        authPort,
        apiVersion: 1
      },
      identity.connectId,
      settings
    )
  }

  private async handleDiscoveredPeer(
    discovered: DiscoveredLanSharePeer,
    ownConnectId: string,
    settings: LanShareSettings
  ): Promise<void> {
    if (discovered.connectId === ownConnectId) return
    const address = discovered.addresses[0]
    if (!address) return

    try {
      const own = await this.buildOwnRegistration(settings, ownConnectId)
      const response = await this.registrationClient.registerWithPeer(
        address,
        discovered.authPort,
        own
      )
      await this.peerStore.upsertSeen(
        {
          id: response.service_id,
          displayName: response.hostname,
          addresses: [address],
          transferPort: discovered.transferPort,
          authPort: response.auth_port,
          registrationVersion: response.api_version >= 2 ? 2 : 1,
          platform: 'unknown',
          status: 'online'
        },
        'mdns'
      )
    } catch {
      // A real registration failure (unreachable, refused, incompatible
      // peer) is still worth recording — honestly, as `incompatible`,
      // not silently dropped and not fabricated as a successful peer.
      await this.peerStore.upsertSeen(
        {
          id: `${address}:${discovered.transferPort}`,
          displayName: discovered.hostname,
          addresses: [address],
          transferPort: discovered.transferPort,
          authPort: discovered.authPort,
          registrationVersion: 'unknown',
          platform: 'unknown',
          status: 'incompatible'
        },
        'mdns'
      )
    }
  }

  private async recordPeerFromRegistration(
    registration: NdxServiceRegistration,
    peerAddress: string
  ): Promise<void> {
    const address = parsePeerHost(peerAddress) ?? registration.ip
    await this.peerStore.upsertSeen(
      {
        id: registration.service_id,
        displayName: registration.hostname,
        addresses: [address],
        transferPort: registration.port,
        authPort: registration.auth_port,
        registrationVersion: registration.api_version >= 2 ? 2 : 1,
        platform: 'unknown',
        status: 'online'
      },
      'history'
    )
  }

  private async buildOwnRegistration(
    settings: LanShareSettings,
    connectId: string
  ): Promise<NdxServiceRegistration> {
    const interfaces = this.interfaceManager.list()
    const ipv4 = interfaces.find((iface) => iface.family === 'IPv4')?.address ?? '0.0.0.0'
    const ipv6 = interfaces.find((iface) => iface.family === 'IPv6')?.address ?? ''
    return {
      service_id: connectId,
      ip: ipv4,
      port: settings.transferPort,
      hostname: settings.deviceDisplayName,
      api_version: SELF_REPORTED_API_VERSION,
      auth_port: settings.authPort,
      ipv6
    }
  }

  private async checkReceiveDirectoryWritable(directory: string): Promise<boolean> {
    try {
      await mkdir(directory, { recursive: true })
      await access(directory, fsConstants.W_OK)
      return true
    } catch {
      return false
    }
  }

  private listenOn(port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
      const server = createServer((socket: Socket) => {
        socket.destroy()
      })
      const onError = (error: Error): void => reject(error)
      server.once('error', onError)
      server.listen(port, () => {
        server.removeListener('error', onError)
        resolve(server)
      })
    })
  }

  private closeServers(): void {
    this.transferServer?.close()
    this.transferServer = null
  }

  private setStatus(status: LanShareServiceStatus): void {
    this.status = status
    for (const listener of this.listeners) listener(status)
  }
}

/**
 * `call.getPeer()` returns this grpc-js version's real, observed format:
 * `host:port` for IPv4 (e.g. `127.0.0.1:54321`), `[ipv6]:port` for IPv6,
 * with an optional `ipv4:`/`ipv6:` scheme prefix on other grpc-js
 * versions/platforms — handled defensively since this isn't a
 * documented, version-pinned format.
 */
function parsePeerHost(peer: string): string | null {
  const withoutScheme = peer.replace(/^ipv[46]:/, '')
  const match = /^\[?([^\]]+)\]?:\d+$/.exec(withoutScheme)
  return match ? match[1] : null
}
