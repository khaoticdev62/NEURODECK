import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, SystemMetricsSnapshot } from '@shared/contracts'
import { ResourceGovernor } from '../ResourceGovernor'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('ResourceGovernor', () => {
  it('renders live resource metrics and policy profile status', async () => {
    stubBridge({
      system: { collectMetrics: vi.fn().mockResolvedValue({ ok: true, data: snapshot }) } as never
    })

    render(<ResourceGovernor />)

    expect(await screen.findByText('Resource Governor')).toBeInTheDocument()
    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getByText(/No resource policy engine exists yet/)).toBeInTheDocument()
  })

  it('refreshes metrics through IPC', async () => {
    const collectMetrics = vi.fn().mockResolvedValue({ ok: true, data: snapshot })
    stubBridge({ system: { collectMetrics } as never })
    const user = userEvent.setup()

    render(<ResourceGovernor />)
    await screen.findByText('Resource Governor')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(collectMetrics).toHaveBeenCalledTimes(2)
  })
})

const snapshot: SystemMetricsSnapshot = {
  collectedAt: Date.now(),
  hostPlatform: 'linux',
  core: { pid: 1, uptimeSeconds: 60 },
  cpu: {
    available: true,
    source: 'node:os',
    value: { usagePercent: 12, logicalCores: 8, model: 'CPU' }
  },
  memory: {
    available: true,
    source: 'node:os',
    value: { totalBytes: 100, usedBytes: 40, availableBytes: 60, usagePercent: 40 }
  },
  swap: { available: false, source: '/proc/meminfo', reason: 'No swap.' },
  storage: {
    available: true,
    source: 'fs.statfs',
    value: { path: '/', totalBytes: 100, usedBytes: 50, availableBytes: 50, usagePercent: 50 }
  },
  battery: { available: false, source: 'sysfs', reason: 'No battery.' },
  thermal: { available: false, source: 'sysfs', reason: 'No thermal.' },
  fans: { available: false, source: 'sysfs', reason: 'No fans.' },
  gpu: { available: false, source: 'sysfs', reason: 'No GPU.' },
  network: { available: true, source: 'node:os', value: [] },
  processes: { available: true, source: '/proc', value: [] }
}
