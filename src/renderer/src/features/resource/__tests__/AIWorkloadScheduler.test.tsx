import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, SystemMetricsSnapshot } from '@shared/contracts'
import { AIWorkloadScheduler } from '../AIWorkloadScheduler'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('AIWorkloadScheduler', () => {
  it('renders workload classes and scheduling factors', async () => {
    stubBridge({
      system: { collectMetrics: vi.fn().mockResolvedValue({ ok: true, data: snapshot }) } as never
    })

    render(<AIWorkloadScheduler />)

    expect(await screen.findByText('AI Workload Scheduler')).toBeInTheDocument()
    expect(screen.getByText('Interactive inference')).toBeInTheDocument()
    expect(screen.getByText('Provider rate limits')).toBeInTheDocument()
    expect(screen.getByText(/Queue, priority, pause, resume/)).toBeInTheDocument()
  })

  it('refreshes capacity signals through IPC', async () => {
    const collectMetrics = vi.fn().mockResolvedValue({ ok: true, data: snapshot })
    stubBridge({ system: { collectMetrics } as never })
    const user = userEvent.setup()

    render(<AIWorkloadScheduler />)
    await screen.findByText('AI Workload Scheduler')
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
