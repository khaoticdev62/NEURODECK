import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/testUtils'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { PlatformHealthOverview } from '../PlatformHealthOverview'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function healthyBridge(): Partial<NdxBridge> {
  return {
    features: {
      list: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            descriptor: {
              id: 'home',
              route: '/',
              name: 'Home',
              capabilityDependencies: [],
              permissionRequirements: [],
              profileVisibility: []
            },
            visibility: 'visible'
          }
        ]
      })
    } as never,
    capabilities: {
      list: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'haptics',
            status: 'available',
            reason: 'Detected.',
            remediation: [],
            lastCheckedAt: 1
          },
          {
            id: 'screen-capture',
            status: 'unsupported',
            reason: 'Privacy review capture UI is not built.',
            remediation: [],
            lastCheckedAt: 1
          }
        ]
      })
    } as never,
    network: {
      getDiagnostics: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          interfaces: {
            available: true,
            value: [{ name: 'eth0', addressCount: 1, internal: false, families: ['IPv4'] }],
            source: 'node:os'
          },
          connections: { available: true, value: [], source: 'NetworkManager' },
          dns: { available: true, value: ['1.1.1.1'], source: 'dns' },
          proxy: {
            available: true,
            value: { http: null, https: null, socks: null, noProxy: null },
            source: 'env'
          },
          vpn: { available: true, value: [], source: 'NetworkManager' },
          firewall: { available: true, value: { enabled: false }, source: 'system' }
        }
      })
    } as never,
    lanShare: {
      getServiceStatus: vi.fn().mockResolvedValue({
        ok: true,
        data: { state: 'running', reason: 'Service running.' }
      }),
      getHealth: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          transferPortBound: true,
          authPortBound: true,
          receiveDirectoryWritable: true,
          interfaceCount: 2
        }
      })
    } as never,
    update: {
      getStatus: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          currentVersion: '0.1.0',
          latestVersion: null,
          channel: 'stable',
          updateAvailable: false,
          changelog: null,
          compatibility: null,
          checkEnabled: true,
          reason: null
        }
      })
    } as never,
    diagnostics: {
      listCrashReports: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never
  }
}

describe('PlatformHealthOverview', () => {
  it('shows aggregate health from real platform sources', async () => {
    stubBridge(healthyBridge())

    renderWithProviders(<PlatformHealthOverview />)

    expect(await screen.findByText('Platform Health Overview')).toBeInTheDocument()
    expect(screen.getByText('Feature Registry')).toBeInTheDocument()
    expect(screen.getByText('1 visible, 0 disabled, 0 hidden.')).toBeInTheDocument()
    expect(screen.getByText('LAN Share')).toBeInTheDocument()
    expect(screen.getByText('running: Service running.')).toBeInTheDocument()
  })

  it('surfaces failed health sources without hiding other sections', async () => {
    const bridge = healthyBridge()
    bridge.network = {
      getDiagnostics: vi.fn().mockResolvedValue({
        ok: false,
        error: { category: 'system', code: 'network-failed', userMessage: 'Network failed.' }
      })
    } as never
    stubBridge(bridge)

    renderWithProviders(<PlatformHealthOverview />)

    expect(await screen.findByText('Network failed.')).toBeInTheDocument()
    expect(screen.getByText('Feature Registry')).toBeInTheDocument()
  })

  it('refreshes all health sources', async () => {
    const bridge = healthyBridge()
    stubBridge(bridge)
    const user = userEvent.setup()

    renderWithProviders(<PlatformHealthOverview />)
    await screen.findByText('Platform Health Overview')

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(bridge.features?.list).toHaveBeenCalledTimes(2)
    expect(bridge.network?.getDiagnostics).toHaveBeenCalledTimes(2)
  })
})
