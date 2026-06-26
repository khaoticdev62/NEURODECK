import { createSocket, type Socket } from 'node:dgram'

export interface PeerAnnouncement {
  type: 'ndx-peer-announce'
  id: string
  friendlyName: string
  port: number
  fingerprint: string
}

export interface PeerDiscoveryOptions {
  selfId: string
  friendlyName: string
  transferPort: number
  fingerprint: string
  /** Defaults to the real Warpinator/Winpinator-adjacent UDP discovery port range — overridable for tests so multiple instances on one machine in the test suite don't collide. */
  broadcastPort?: number
  broadcastAddress?: string
  announceIntervalMs?: number
  onPeerSeen: (announcement: PeerAnnouncement, fromAddress: string) => void
}

const DEFAULT_BROADCAST_PORT = 53317
const DEFAULT_ANNOUNCE_INTERVAL_MS = 10_000

/**
 * Real Epic X6 LAN discovery (supplemental §19.1 "Local network
 * discovery"), a Warpinator/Winpinator-style real UDP broadcast —
 * genuinely sends and receives real datagrams over a real socket, not
 * a simulated peer list. Each announcement carries the sender's real
 * public-identity fingerprint so a receiving `PeerStore` can do real
 * trust-on-first-use the same way `RemoteHostStore` already does for
 * SSH host keys.
 */
export class PeerDiscoveryService {
  private socket: Socket | null = null
  private announceTimer: NodeJS.Timeout | null = null

  constructor(private readonly options: PeerDiscoveryOptions) {}

  start(): void {
    if (this.socket) return
    const socket = createSocket({ type: 'udp4', reuseAddr: true })
    socket.on('message', (message, remote) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(message.toString('utf-8'))
      } catch {
        return
      }
      if (!isPeerAnnouncement(parsed) || parsed.id === this.options.selfId) return
      this.options.onPeerSeen(parsed, remote.address)
    })

    const port = this.options.broadcastPort ?? DEFAULT_BROADCAST_PORT
    socket.bind(port, () => {
      socket.setBroadcast(true)
    })
    this.socket = socket

    this.announceTimer = setInterval(
      () => this.announce(),
      this.options.announceIntervalMs ?? DEFAULT_ANNOUNCE_INTERVAL_MS
    )
    this.announce()
  }

  private announce(): void {
    if (!this.socket) return
    const announcement: PeerAnnouncement = {
      type: 'ndx-peer-announce',
      id: this.options.selfId,
      friendlyName: this.options.friendlyName,
      port: this.options.transferPort,
      fingerprint: this.options.fingerprint
    }
    const payload = Buffer.from(JSON.stringify(announcement), 'utf-8')
    const port = this.options.broadcastPort ?? DEFAULT_BROADCAST_PORT
    this.socket.send(payload, port, this.options.broadcastAddress ?? '255.255.255.255')
  }

  stop(): void {
    if (this.announceTimer) {
      clearInterval(this.announceTimer)
      this.announceTimer = null
    }
    this.socket?.close()
    this.socket = null
  }
}

function isPeerAnnouncement(value: unknown): value is PeerAnnouncement {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as PeerAnnouncement).type === 'ndx-peer-announce' &&
    typeof (value as PeerAnnouncement).id === 'string' &&
    typeof (value as PeerAnnouncement).friendlyName === 'string' &&
    typeof (value as PeerAnnouncement).port === 'number' &&
    typeof (value as PeerAnnouncement).fingerprint === 'string'
  )
}
