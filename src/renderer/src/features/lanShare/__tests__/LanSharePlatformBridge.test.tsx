import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LanShareTransferJob, NdxBridge } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { LanSharePlatformBridge } from '../LanSharePlatformBridge'

let transferListener: ((jobs: LanShareTransferJob[]) => void) | null = null

function makeJob(overrides: Partial<LanShareTransferJob> = {}): LanShareTransferJob {
  return {
    id: 'job-1',
    direction: 'receive',
    peerId: 'peer-1',
    displayName: 'photo.png',
    itemCount: 1,
    totalBytes: 100,
    transferredBytes: 0,
    status: 'waiting-for-approval',
    useCompression: false,
    createdAt: Date.now(),
    ...overrides
  }
}

function stubBridge(initialJobs: LanShareTransferJob[] = []): void {
  transferListener = null
  window.ndx = {
    lanShare: {
      listTransferJobs: vi.fn().mockResolvedValue({ ok: true, data: initialJobs }),
      onTransferJobUpdate: vi.fn((listener: (jobs: LanShareTransferJob[]) => void) => {
        transferListener = listener
        return () => {
          transferListener = null
        }
      })
    }
  } as unknown as NdxBridge
}

function renderBridge(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <LanSharePlatformBridge />
    </ToastProvider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of preload global
  delete window.ndx
  transferListener = null
})

describe('LanSharePlatformBridge', () => {
  it('does not replay persisted transfer history as fresh notifications', async () => {
    stubBridge([makeJob()])
    renderBridge()

    await waitFor(() => expect(transferListener).not.toBeNull())

    expect(screen.queryByText('Incoming LAN Share approval required')).not.toBeInTheDocument()
  })

  it('pushes incoming approval and completion through the shared Notification Center history', async () => {
    stubBridge([])
    renderBridge()

    await waitFor(() => expect(transferListener).not.toBeNull())

    transferListener?.([makeJob()])
    expect(await screen.findByText('Incoming LAN Share approval required')).toBeInTheDocument()

    transferListener?.([makeJob({ status: 'completed', transferredBytes: 100 })])
    expect(await screen.findByText('LAN Share transfer completed')).toBeInTheDocument()
  })

  it('pushes failed transfers as shared error notifications', async () => {
    stubBridge([])
    renderBridge()

    await waitFor(() => expect(transferListener).not.toBeNull())

    transferListener?.([makeJob({ status: 'failed', errorMessage: 'Peer went offline' })])

    expect(await screen.findByText('LAN Share transfer failed')).toBeInTheDocument()
    expect(screen.getByText('Peer went offline')).toBeInTheDocument()
  })
})
