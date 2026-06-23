import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, SystemMetricsSnapshot } from '@shared/contracts'
import { SystemDashboard } from '../SystemDashboard'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderDashboard(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <SystemDashboard />
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleSnapshot: SystemMetricsSnapshot = {
  collectedAt: Date.now(),
  hostPlatform: 'linux',
  core: { pid: 1234, uptimeSeconds: 120 },
  cpu: {
    available: true,
    value: { usagePercent: 12.5, logicalCores: 8, model: 'Steam Deck CPU' },
    source: 'node:os'
  },
  memory: {
    available: true,
    value: {
      totalBytes: 16_000_000_000,
      usedBytes: 8_000_000_000,
      availableBytes: 8_000_000_000,
      usagePercent: 50
    },
    source: 'node:os'
  },
  swap: { available: false, source: '/proc/meminfo', reason: 'Swap metrics require Linux procfs.' },
  storage: {
    available: true,
    value: {
      path: '/',
      totalBytes: 100_000_000_000,
      usedBytes: 40_000_000_000,
      availableBytes: 60_000_000_000,
      usagePercent: 40
    },
    source: 'fs.statfs'
  },
  battery: {
    available: true,
    value: [
      {
        name: 'BAT0',
        capacityPercent: 72,
        status: 'Discharging',
        energyNowMicrowattHours: null,
        energyFullMicrowattHours: null,
        powerNowMicrowatts: null
      }
    ],
    source: 'sysfs'
  },
  thermal: { available: false, source: 'sysfs', reason: 'No thermal sensors were exposed.' },
  fans: { available: false, source: 'sysfs', reason: 'No fan sensors were exposed.' },
  gpu: { available: false, source: 'sysfs', reason: 'No supported GPU usage sensor was exposed.' },
  network: {
    available: true,
    value: [{ name: 'eth0', addressCount: 1, internal: false, families: ['IPv4'] }],
    source: 'node:os'
  },
  processes: {
    available: true,
    value: [{ pid: 1, name: 'init', residentBytes: null }],
    source: '/proc'
  }
}

describe('SystemDashboard', () => {
  it('shows real collected metrics', async () => {
    stubBridge({
      system: {
        collectMetrics: vi.fn().mockResolvedValue({ ok: true, data: sampleSnapshot })
      } as never
    })
    renderDashboard()

    expect(await screen.findByText('System Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/12\.5%/)).toBeInTheDocument()
    expect(screen.getByText(/Steam Deck CPU/)).toBeInTheDocument()
  })

  it('reports an unavailable sensor honestly instead of fabricating a value', async () => {
    stubBridge({
      system: {
        collectMetrics: vi.fn().mockResolvedValue({ ok: true, data: sampleSnapshot })
      } as never
    })
    renderDashboard()

    await screen.findByText('System Dashboard')
    expect(screen.getByText(/No thermal sensors were exposed\./)).toBeInTheDocument()
  })

  it('shows a real error state when collection fails', async () => {
    stubBridge({
      system: {
        collectMetrics: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            category: 'system',
            code: 'system-metrics-failed',
            userMessage: 'Metrics failed.'
          }
        })
      } as never
    })
    renderDashboard()

    expect(await screen.findByText('Metrics failed.')).toBeInTheDocument()
  })

  it('refreshes real metrics via IPC', async () => {
    const collectMetrics = vi.fn().mockResolvedValue({ ok: true, data: sampleSnapshot })
    stubBridge({ system: { collectMetrics } as never })

    const user = userEvent.setup()
    renderDashboard()
    await screen.findByText('System Dashboard')

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(collectMetrics).toHaveBeenCalledTimes(2)
  })
})
