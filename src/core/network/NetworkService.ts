import { networkInterfaces } from 'os'
import { getServers } from 'dns'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { NetworkDiagnostics } from '@shared/contracts'

export interface NetworkServiceDependencies {
  platform: string
  getNetworkInterfaces: typeof networkInterfaces
  getDnsServers: typeof getServers
  env: NodeJS.ProcessEnv
  execFile: typeof execFile
}

function unavailable(
  source: string,
  reason: string
): { available: false; source: string; reason: string } {
  return { available: false, source, reason }
}

function available<T>(value: T, source: string): { available: true; value: T; source: string } {
  return { available: true, value, source }
}

export class NetworkService {
  constructor(private readonly deps: NetworkServiceDependencies = defaultDependencies()) {}

  async getDiagnostics(): Promise<NetworkDiagnostics> {
    return {
      interfaces: this.collectInterfaces(),
      connections: await this.collectConnections(),
      dns: this.collectDns(),
      proxy: this.collectProxy(),
      vpn: unavailable('vpn', 'No VPN adapter integration is implemented yet.'),
      firewall: unavailable('firewall', 'No firewall status adapter is implemented yet.')
    }
  }

  private collectInterfaces(): NetworkDiagnostics['interfaces'] {
    try {
      const raw = this.deps.getNetworkInterfaces()
      const interfaces = Object.entries(raw).flatMap(([name, addresses]) =>
        (addresses ?? []).map((address) => ({
          name,
          addressCount: 1,
          internal: address.internal,
          families: [address.family]
        }))
      )
      const merged = new Map<
        string,
        { name: string; addressCount: number; internal: boolean; families: Set<string> }
      >()
      interfaces.forEach((iface) => {
        const existing = merged.get(iface.name)
        if (existing) {
          existing.addressCount += 1
          existing.internal = existing.internal && iface.internal
          iface.families.forEach((family) => existing.families.add(family))
        } else {
          merged.set(iface.name, { ...iface, families: new Set(iface.families) })
        }
      })
      return available(
        Array.from(merged.values()).map((iface) => ({
          name: iface.name,
          addressCount: iface.addressCount,
          internal: iface.internal,
          families: Array.from(iface.families)
        })),
        'os.networkInterfaces'
      )
    } catch (error) {
      return unavailable(
        'os.networkInterfaces',
        `Could not read network interfaces: ${String(error)}`
      )
    }
  }

  private async collectConnections(): Promise<NetworkDiagnostics['connections']> {
    if (this.deps.platform !== 'linux') {
      return unavailable(
        'nmcli',
        'Connection state detection is only implemented on Linux via NetworkManager.'
      )
    }
    try {
      const execFileAsync = promisify(this.deps.execFile)
      const result = await execFileAsync('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE', 'device'], {
        timeout: 3000
      })
      const stdout = typeof result === 'string' ? result : result.stdout
      const lines = stdout.split('\n').filter((line) => line.trim().length > 0)
      const connections: {
        name: string
        type: 'ethernet' | 'wifi' | 'loopback' | 'other'
        state: 'connected' | 'disconnected' | 'unknown'
      }[] = lines
        .map((line) => {
          const [device, type, state] = line.split(':')
          if (!device || !type) return null
          const normalizedType = type.toLowerCase()
          const mappedType: 'ethernet' | 'wifi' | 'loopback' | 'other' =
            normalizedType === 'ethernet'
              ? 'ethernet'
              : normalizedType === 'wifi' || normalizedType === 'wireless'
                ? 'wifi'
                : device.startsWith('lo')
                  ? 'loopback'
                  : 'other'
          const mappedState: 'connected' | 'disconnected' | 'unknown' =
            state?.toLowerCase() === 'connected'
              ? 'connected'
              : state?.toLowerCase() === 'disconnected'
                ? 'disconnected'
                : 'unknown'
          return { name: device, type: mappedType, state: mappedState }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
      return available(connections, 'nmcli')
    } catch {
      return unavailable('nmcli', 'NetworkManager (nmcli) is not available on this system.')
    }
  }

  private collectDns(): NetworkDiagnostics['dns'] {
    try {
      const servers = this.deps.getDnsServers()
      return available(servers, 'dns.getServers')
    } catch (error) {
      return unavailable('dns.getServers', `Could not read DNS servers: ${String(error)}`)
    }
  }

  private collectProxy(): NetworkDiagnostics['proxy'] {
    try {
      const http = this.deps.env.HTTP_PROXY || this.deps.env.http_proxy || null
      const https = this.deps.env.HTTPS_PROXY || this.deps.env.https_proxy || null
      const socks = this.deps.env.ALL_PROXY || this.deps.env.all_proxy || null
      const noProxy = this.deps.env.NO_PROXY || this.deps.env.no_proxy || null
      return available({ http, https, socks, noProxy }, 'process.env')
    } catch (error) {
      return unavailable('process.env', `Could not read proxy environment: ${String(error)}`)
    }
  }
}

function defaultDependencies(): NetworkServiceDependencies {
  return {
    platform: process.platform,
    getNetworkInterfaces: networkInterfaces,
    getDnsServers: getServers,
    env: process.env,
    execFile
  }
}
