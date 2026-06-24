import type { NetworkInterfaceInfo } from 'node:os'
import type { ChildProcess } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { NetworkService, type NetworkServiceDependencies } from '../NetworkService'

describe('NetworkService', () => {
  it('collects real OS-level network diagnostics on the current host', async () => {
    const diagnostics = await new NetworkService().getDiagnostics()

    expect(diagnostics.interfaces.available).toBe(true)
    expect(diagnostics.interfaces.value?.length).toBeGreaterThan(0)
    expect(diagnostics.dns.available).toBe(true)
    expect(diagnostics.proxy.available).toBe(true)
    expect(diagnostics.vpn.available).toBe(false)
    expect(diagnostics.firewall.available).toBe(false)
  })

  it('merges network interfaces by name and preserves address families', async () => {
    const service = new NetworkService(fakeDependencies())
    const diagnostics = await service.getDiagnostics()

    expect(diagnostics.interfaces.available).toBe(true)
    expect(diagnostics.interfaces.value).toEqual([
      { name: 'eth0', addressCount: 2, internal: false, families: ['IPv4', 'IPv6'] },
      { name: 'lo', addressCount: 1, internal: true, families: ['IPv4'] }
    ])
  })

  it('returns DNS servers from the dependency', async () => {
    const service = new NetworkService(fakeDependencies())
    const diagnostics = await service.getDiagnostics()

    expect(diagnostics.dns.available).toBe(true)
    expect(diagnostics.dns.value).toEqual(['1.1.1.1', '8.8.8.8'])
  })

  it('returns proxy settings from environment variables', async () => {
    const service = new NetworkService(fakeDependencies())
    const diagnostics = await service.getDiagnostics()

    expect(diagnostics.proxy.available).toBe(true)
    expect(diagnostics.proxy.value).toEqual({
      http: 'http://proxy.example:8080',
      https: null,
      socks: 'socks://proxy.example:1080',
      noProxy: 'localhost,127.0.0.1'
    })
  })

  it('reports connections unavailable on non-Linux platforms', async () => {
    const service = new NetworkService(fakeDependencies({ platform: 'win32' }))
    const diagnostics = await service.getDiagnostics()

    expect(diagnostics.connections.available).toBe(false)
    expect(diagnostics.connections.reason).toContain('only implemented on Linux')
  })

  it('parses nmcli output on Linux when NetworkManager is available', async () => {
    const execFile = fakeExecFile({
      stdout: 'eth0:ethernet:connected\nwlan0:wifi:disconnected\nlo:loopback:connected\n'
    })
    const service = new NetworkService(fakeDependencies({ platform: 'linux', execFile }))
    const diagnostics = await service.getDiagnostics()

    expect(diagnostics.connections.available).toBe(true)
    expect(diagnostics.connections.value).toEqual([
      { name: 'eth0', type: 'ethernet', state: 'connected' },
      { name: 'wlan0', type: 'wifi', state: 'disconnected' },
      { name: 'lo', type: 'loopback', state: 'connected' }
    ])
  })

  it('reports an honest reason when nmcli cannot be executed on Linux', async () => {
    const execFile = fakeExecFile(new Error('Command not found'))
    const service = new NetworkService(fakeDependencies({ platform: 'linux', execFile }))
    const diagnostics = await service.getDiagnostics()

    expect(diagnostics.connections.available).toBe(false)
    expect(diagnostics.connections.reason).toContain('NetworkManager (nmcli) is not available')
  })
})

function fakeDependencies(
  overrides: Partial<NetworkServiceDependencies> = {}
): NetworkServiceDependencies {
  return {
    platform: 'linux',
    getNetworkInterfaces: () => ({
      eth0: [networkAddress('IPv4', false), networkAddress('IPv6', false)],
      lo: [networkAddress('IPv4', true)]
    }),
    getDnsServers: () => ['1.1.1.1', '8.8.8.8'],
    env: {
      HTTP_PROXY: 'http://proxy.example:8080',
      ALL_PROXY: 'socks://proxy.example:1080',
      NO_PROXY: 'localhost,127.0.0.1'
    },
    execFile: fakeExecFile({ stdout: '' }),
    ...overrides
  }
}

function networkAddress(
  family: NetworkInterfaceInfo['family'],
  internal: boolean
): NetworkInterfaceInfo {
  return family === 'IPv4'
    ? {
        address: '192.0.2.1',
        netmask: '255.255.255.0',
        family: 'IPv4',
        mac: '00:00:00:00:00:00',
        internal,
        cidr: null
      }
    : {
        address: '2001:db8::1',
        netmask: 'ffff:ffff:ffff:ffff::',
        family: 'IPv6',
        mac: '00:00:00:00:00:00',
        internal,
        cidr: null,
        scopeid: 0
      }
}

function fakeExecFile(result: { stdout: string } | Error): NetworkServiceDependencies['execFile'] {
  return ((
    _file: string,
    _args: readonly string[] | undefined,
    _options: object,
    callback: (error: Error | null, stdout: string, stderr: string) => void
  ): ChildProcess => {
    if (result instanceof Error) {
      process.nextTick(() => callback(result, '', ''))
    } else {
      process.nextTick(() => callback(null, result.stdout, ''))
    }
    return {} as ChildProcess
  }) as NetworkServiceDependencies['execFile']
}
