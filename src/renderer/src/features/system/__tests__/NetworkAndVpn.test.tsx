import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NetworkDiagnostics, NdxBridge } from '@shared/contracts'
import { NetworkAndVpn } from '../NetworkAndVpn'
import { renderWithProviders } from '../../../__tests__/testUtils'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    ...partial
  } as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleDiagnostics: NetworkDiagnostics = {
  interfaces: {
    available: true,
    source: 'os.networkInterfaces',
    value: [{ name: 'eth0', addressCount: 2, internal: false, families: ['IPv4', 'IPv6'] }]
  },
  connections: {
    available: false,
    source: 'nmcli',
    reason: 'Connection state detection is only implemented on Linux via NetworkManager.'
  },
  dns: {
    available: true,
    source: 'dns.getServers',
    value: ['1.1.1.1', '8.8.8.8']
  },
  proxy: {
    available: true,
    source: 'process.env',
    value: { http: 'http://proxy.example:8080', https: null, socks: null, noProxy: 'localhost' }
  },
  vpn: {
    available: false,
    source: 'vpn',
    reason: 'No VPN adapter integration is implemented yet.'
  },
  firewall: {
    available: false,
    source: 'firewall',
    reason: 'No firewall status adapter is implemented yet.'
  }
}

describe('NetworkAndVpn', () => {
  it('renders read-only diagnostics from the bridge', async () => {
    stubBridge({
      network: {
        getDiagnostics: vi.fn().mockResolvedValue({ ok: true, data: sampleDiagnostics })
      } as never
    })

    renderWithProviders(<NetworkAndVpn />)

    expect(await screen.findByText('Network and VPN')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/eth0:/)).toBeInTheDocument()
    })
    expect(screen.getByText('1.1.1.1')).toBeInTheDocument()
    expect(screen.getByText('8.8.8.8')).toBeInTheDocument()
    expect(screen.getByText(/HTTP: http:\/\/proxy.example:8080/)).toBeInTheDocument()
  })

  it('reports an unavailable adapter honestly instead of fabricating a value', async () => {
    const unavailableDiagnostics: NetworkDiagnostics = {
      ...sampleDiagnostics,
      interfaces: {
        available: false,
        source: 'os.networkInterfaces',
        reason: 'Network interface enumeration is disabled in this test.'
      }
    }
    stubBridge({
      network: {
        getDiagnostics: vi.fn().mockResolvedValue({ ok: true, data: unavailableDiagnostics })
      } as never
    })

    renderWithProviders(<NetworkAndVpn />)

    await screen.findByText('Network and VPN')
    expect(
      screen.getByText('Network interface enumeration is disabled in this test.')
    ).toBeInTheDocument()
  })

  it('shows management actions as disabled with real reasons', async () => {
    stubBridge({
      network: {
        getDiagnostics: vi.fn().mockResolvedValue({ ok: true, data: sampleDiagnostics })
      } as never
    })

    renderWithProviders(<NetworkAndVpn />)

    await screen.findByText('Network and VPN')
    expect(screen.getByText('VPN profiles')).toBeInTheDocument()
    expect(
      screen.getByText('OpenVPN/WireGuard adapter is not implemented yet.')
    ).toBeInTheDocument()
    expect(screen.getByText('No Wi-Fi adapter integration exists yet.')).toBeInTheDocument()
  })

  it('shows an error state when diagnostics fail', async () => {
    stubBridge({
      network: {
        getDiagnostics: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'network-diagnostics-failed',
            userMessage: 'Network check failed.',
            message: 'x',
            category: 'system'
          }
        })
      } as never
    })

    renderWithProviders(<NetworkAndVpn />)

    expect(await screen.findByText('Network diagnostics error')).toBeInTheDocument()
    expect(screen.getByText('Network check failed.')).toBeInTheDocument()
  })
})
