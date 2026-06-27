import { Bonjour, type Browser, type Service } from 'bonjour-service'

/** Real mDNS-SD service type confirmed from Warpinator's own source (`SERVICE_TYPE = "_warpinator._tcp.local."` in `src/server.py`, audited in docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md). bonjour-service builds this from `type`+`protocol` separately. */
const SERVICE_NAME = 'warpinator'
const SERVICE_PROTOCOL = 'tcp'

export interface DiscoveredLanSharePeer {
  connectId: string
  hostname: string
  addresses: string[]
  transferPort: number
  authPort: number
  apiVersion: number
}

export interface AdvertiseOptions {
  connectId: string
  hostname: string
  transferPort: number
  authPort: number
  apiVersion: number
}

/**
 * Real mDNS-SD advertise/browse for LAN Share (spec §10.1, Phase
 * LAN-3). Uses the real, confirmed Warpinator service type and the
 * real TXT record keys (`hostname`, `api-version`, `auth-port`)
 * Warpinator's own source publishes, so a genuine Warpinator-ecosystem
 * client on the same network can see this device announce itself, and
 * this device can see real Warpinator-ecosystem peers — not just other
 * NeuroDeck instances.
 */
export class LanShareMdnsDiscovery {
  private bonjour: Bonjour | null = null
  private publishedService: Service | null = null
  private browser: Browser | null = null

  advertise(options: AdvertiseOptions): void {
    this.bonjour ??= new Bonjour()
    this.publishedService = this.bonjour.publish({
      name: options.connectId,
      type: SERVICE_NAME,
      protocol: SERVICE_PROTOCOL,
      port: options.transferPort,
      txt: {
        hostname: options.hostname,
        'api-version': String(options.apiVersion),
        'auth-port': String(options.authPort),
        type: 'real'
      }
    })
  }

  unadvertise(): void {
    this.publishedService?.stop()
    this.publishedService = null
  }

  browse(onPeerSeen: (peer: DiscoveredLanSharePeer) => void): void {
    this.bonjour ??= new Bonjour()
    this.browser = this.bonjour.find(
      { type: SERVICE_NAME, protocol: SERVICE_PROTOCOL },
      (service: Service) => {
        const peer = parseDiscoveredService(service)
        if (peer) onPeerSeen(peer)
      }
    )
  }

  stopBrowsing(): void {
    this.browser?.stop()
    this.browser = null
  }

  destroy(): void {
    this.unadvertise()
    this.stopBrowsing()
    this.bonjour?.destroy()
    this.bonjour = null
  }
}

function parseDiscoveredService(service: Service): DiscoveredLanSharePeer | null {
  if (!service.addresses || service.addresses.length === 0) return null
  const txt = (service.txt ?? {}) as Record<string, unknown>
  const authPort = Number(txt['auth-port'])
  if (!Number.isFinite(authPort)) return null
  const apiVersion = Number(txt['api-version'])
  return {
    connectId: service.name,
    hostname: typeof txt.hostname === 'string' ? txt.hostname : service.host,
    addresses: service.addresses,
    transferPort: service.port,
    authPort,
    apiVersion: Number.isFinite(apiVersion) ? apiVersion : 1
  }
}
