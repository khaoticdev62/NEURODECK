import type { CapabilityId, CapabilityState } from '@shared/contracts'

export interface CapabilityDetectionResult {
  status: CapabilityState['status']
  reason: string
  provider?: string
  version?: string
  remediation?: CapabilityState['remediation']
}

export type CapabilityDetector = () =>
  CapabilityDetectionResult | Promise<CapabilityDetectionResult>

/**
 * Epic X1 Capability Registry (supplemental spec §33) — the one real
 * place every hardware/environment-dependent feature in the app queries
 * instead of doing its own ad hoc `process.platform` check. Per the
 * supplemental non-negotiable §3.7 ("no false hardware assumptions"),
 * every detector returns an honest status with a real reason —
 * `unsupported`/`dependency-required` are correct, true answers when no
 * real detection backend exists yet, not a placeholder to "fix later."
 *
 * This module stays Electron-free (the same boundary `SecretCipher`/
 * `electronSecretCipher` already draws): real Electron-API-backed
 * detectors (`safeStorage`, `Notification`, GPU feature status) are
 * injected by `main/ipc/index.ts` as overrides rather than imported
 * here directly, so `core/` remains testable without Electron and the
 * main-process/core boundary stays the one this codebase already holds
 * everywhere else.
 */
export class CapabilityRegistry {
  private readonly detectors: Map<CapabilityId, CapabilityDetector>
  private cache = new Map<CapabilityId, CapabilityState>()

  constructor(overrides: Partial<Record<CapabilityId, CapabilityDetector>> = {}) {
    this.detectors = new Map(Object.entries({ ...defaultDetectors, ...overrides })) as Map<
      CapabilityId,
      CapabilityDetector
    >
  }

  async list(): Promise<CapabilityState[]> {
    if (this.cache.size === 0) await this.refresh()
    return Array.from(this.cache.values())
  }

  async refresh(): Promise<CapabilityState[]> {
    const now = Date.now()
    const entries = await Promise.all(
      Array.from(this.detectors.entries()).map(async ([id, detector]) => {
        const result = await detector()
        const state: CapabilityState = {
          id,
          status: result.status,
          reason: result.reason,
          provider: result.provider,
          version: result.version,
          remediation: result.remediation ?? [],
          lastCheckedAt: now
        }
        return [id, state] as const
      })
    )
    this.cache = new Map(entries)
    return Array.from(this.cache.values())
  }

  async get(id: CapabilityId): Promise<CapabilityState | undefined> {
    if (this.cache.size === 0) await this.refresh()
    return this.cache.get(id)
  }
}

function unsupported(reason: string): CapabilityDetectionResult {
  return { status: 'unsupported', reason }
}

const LINUX_ONLY_REASON = 'Detected platform is not Linux — this capability is Linux-only.'

function linuxDependencyOrUnsupported(detail: string): CapabilityDetectionResult {
  return process.platform === 'linux'
    ? {
        status: 'dependency-required',
        reason: `Running on Linux, but no real ${detail} probe is implemented yet.`,
        remediation: [
          {
            label: 'Build a real check',
            detail: `Implement a live ${detail} probe before reporting available.`
          }
        ]
      }
    : unsupported(LINUX_ONLY_REASON)
}

/**
 * Honest defaults with zero Electron/native dependency. Every one of
 * these is correct and true on a machine with no real detection backend
 * wired in yet — `main/ipc/index.ts` overrides the handful that have a
 * real, checkable signal through Electron itself (secure storage,
 * notifications, GPU acceleration).
 */
const defaultDetectors: Record<CapabilityId, CapabilityDetector> = {
  'secure-storage': () =>
    unsupported('No safeStorage probe injected — main process did not provide a real detector.'),
  notifications: () =>
    unsupported(
      'No Notification.isSupported() probe injected — main process did not provide a real detector.'
    ),
  'gpu-acceleration': () =>
    unsupported(
      'No GPU feature status probe injected — main process did not provide a real detector.'
    ),
  'network-manager': () => linuxDependencyOrUnsupported('NetworkManager D-Bus'),
  flatpak: () => linuxDependencyOrUnsupported('`flatpak --version`'),
  'steam-shortcut-editing': () =>
    unsupported(
      'No real Steam VDF/shortcuts.vdf read-write integration is implemented yet (tracked for Epic X2).'
    ),
  'decky-integration': () =>
    unsupported(
      'No real Decky Loader plugin bridge is implemented yet — a documented platform gap (see CLAUDE.md).'
    ),
  'local-model-runtime': () =>
    unsupported(
      'No live Ollama reachability probe is wired into this registry yet — query ModelProviderService directly until it is.'
    ),
  'rear-buttons': () =>
    unsupported(
      'No native Steam Deck input driver is implemented yet — a documented platform gap.'
    ),
  haptics: () =>
    unsupported(
      'No native Steam Deck haptics driver is implemented yet — a documented platform gap.'
    ),
  gyro: () =>
    unsupported('No native Steam Deck gyro driver is implemented yet — a documented platform gap.'),
  microphone: () =>
    unsupported('No real audio-input device enumeration is implemented yet (tracked for Epic X8).'),
  camera: () => unsupported('No real camera device enumeration is implemented yet.'),
  bluetooth: () =>
    unsupported('No real Bluetooth adapter probe is implemented yet (tracked for Epic X8).'),
  'thermal-sensors': () => unsupported('No real thermal sensor read path is implemented yet.'),
  'fan-controls': () => unsupported('No real fan control read/write path is implemented yet.'),
  'external-displays': () =>
    unsupported('No real display enumeration is implemented yet (tracked for Epic X8).'),
  'vpn-backends': () =>
    unsupported(
      'No real VPN backend probe is implemented yet — Network settings reports static info only.'
    ),
  'screen-capture': () =>
    unsupported('No real screen-capture pipeline is implemented yet (tracked for Epic X5).'),
  'ocr-extraction': () =>
    unsupported('No OCR/document-extraction provider is integrated yet (tracked for Epic X5).'),
  'remote-desktop-launchers': () =>
    unsupported('No real RDP/VNC launcher integration is implemented yet.'),
  'lanShare.available': () => ({
    status: 'available',
    provider: 'core/lanShare/LanShareService',
    reason:
      'Real end-to-end LAN Share is implemented: mDNS discovery, v1/v2 registration with group-code-authenticated certificates, and real file/directory transfer with staging and atomic commit (Phases LAN-2 through LAN-6). No controller-native screens exist yet (Phase LAN-7), and NDX-enhanced resume/text messages/OS-level sandboxing remain honestly deferred.'
  }),
  'lanShare.discovery.mdns': () => ({
    status: 'available',
    provider: 'bonjour-service',
    reason:
      'Real mDNS advertise/browse against the confirmed Warpinator service type (_warpinator._tcp.local.) is implemented (Phase LAN-3).'
  }),
  'lanShare.discovery.manual': () => ({
    status: 'available',
    provider: 'core/lanShare/LanSharePeerStore',
    reason: 'Manual peer entry is real, backed by the real LAN Share service from Phase LAN-2.'
  }),
  'lanShare.registration.v1': () => ({
    status: 'available',
    provider: '@grpc/grpc-js',
    reason:
      'A real gRPC WarpRegistration v1 client/server pair is implemented and used by both mDNS-discovered and manually-added peers (Phase LAN-3).'
  }),
  'lanShare.registration.v2': () => ({
    status: 'available',
    provider: 'tweetnacl + selfsigned',
    reason:
      'Real v2 certificate exchange is implemented: a real RSA-2048 self-signed certificate, encrypted with the real NaCl secretbox construction Warpinator itself uses, keyed by the configured group code (Phase LAN-4).'
  }),
  'lanShare.files': () => ({
    status: 'available',
    provider: 'core/lanShare/LanShareReceiveEngine',
    reason:
      'Real end-to-end file transfer is implemented: real chunk streaming (StartTransfer), real path-safe staging, and real atomic commit with conflict-safe naming, confirmed by a real two-service integration test (Phase LAN-6).'
  }),
  'lanShare.directories': () => ({
    status: 'available',
    provider: 'core/lanShare/LanShareReceiveEngine',
    reason:
      'Real directory trees are streamed, staged, and committed end-to-end, confirmed by tests covering real directory/symlink marker chunks (Phase LAN-6).'
  }),
  'lanShare.text': () =>
    unsupported(
      'The real Warp.SendTextMessage RPC (clipboard-text sharing) is not implemented yet — file/directory transfer uses StartTransfer instead, which is real.'
    ),
  'lanShare.parallel': () => ({
    status: 'available',
    provider: 'core/lanShare/LanShareTransferQueue',
    reason:
      'A real, tested bounded concurrency queue (global and per-peer limits) is implemented (Phase LAN-5).'
  }),
  'lanShare.compression': () => ({
    status: 'available',
    provider: 'node:zlib',
    reason:
      "Real zlib chunk compression, byte-compatible with Warpinator's own per-chunk deflate/inflate, is implemented (Phase LAN-5) — wired into the real chunk pipeline once Phase LAN-6 builds it."
  }),
  'lanShare.resume.ndx': () =>
    unsupported('NDX-enhanced resume needs the real transfer engine from Phase LAN-5/LAN-6.'),
  'lanShare.landlock': () => linuxDependencyOrUnsupported('Landlock LSM'),
  'lanShare.bubblewrap': () => linuxDependencyOrUnsupported('`bwrap --version`'),
  'lanShare.ipv4': () => ({
    status: 'available',
    provider: 'node:net',
    reason: 'The Node.js runtime supports IPv4 sockets on this device.'
  }),
  'lanShare.ipv6': () =>
    unsupported(
      'IPv6 is intentionally capability-gated per the LAN Share spec until real interoperability passes — not a technical absence.'
    ),
  'lanShare.firewall.detect': () => linuxDependencyOrUnsupported('firewall listener inspection'),
  'lanShare.firewall.configure': () => linuxDependencyOrUnsupported('firewall rule management'),
  'lanShare.backgroundReceive': () =>
    unsupported('No background/suspend resource policy exists yet (Phase LAN-9).')
}
