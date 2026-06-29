import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, ScreenshotRecord } from '@shared/contracts'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { ScreenshotCenter } from '../ScreenshotCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

const noWorkspaceValue: WorkspaceContextValue = {
  workspaces: [],
  activeWorkspaceId: null,
  activeWorkspace: null,
  loading: false,
  error: null,
  refresh: vi.fn(),
  addFromPicker: vi.fn(),
  remove: vi.fn(),
  setActive: vi.fn()
}

function renderCenter(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <WorkspaceContext.Provider value={noWorkspaceValue}>
        <ScreenshotCenter />
      </WorkspaceContext.Provider>
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleRecord: ScreenshotRecord = {
  id: 'shot-1',
  path: '/home/deck/.config/NeuroDeck/screenshots/screenshot-1-shot-1.png',
  capturedAt: Date.now(),
  source: 'current-window',
  bytes: 12345
}

describe('ScreenshotCenter', () => {
  it('shows an empty state when no screenshots exist', async () => {
    stubBridge({
      screenshot: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    renderCenter()

    expect(await screen.findByText('No screenshots yet')).toBeInTheDocument()
  })

  it('lists real screenshot records', async () => {
    stubBridge({
      screenshot: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleRecord] }) } as never
    })

    renderCenter()

    expect(await screen.findByText('Current window')).toBeInTheDocument()
    expect(screen.getByText(sampleRecord.path)).toBeInTheDocument()
  })

  it('captures with the real selected delay and refreshes the list', async () => {
    const capture = vi.fn().mockResolvedValue({ ok: true, data: sampleRecord })
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: true, data: [sampleRecord] })
    stubBridge({ screenshot: { capture, list } as never })
    const user = userEvent.setup()

    renderCenter()
    await screen.findByText('No screenshots yet')

    await user.click(screen.getByRole('button', { name: '5s' }))
    await user.click(screen.getByRole('button', { name: 'Capture current window' }))

    expect(capture).toHaveBeenCalledWith({ source: 'current-window', delaySeconds: 5 })
    expect(await screen.findByText('Current window')).toBeInTheDocument()
  })

  it('disables Add to workspace when there is no active workspace', async () => {
    stubBridge({
      screenshot: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleRecord] }) } as never
    })

    renderCenter()
    await screen.findByText('Current window')

    expect(screen.getByRole('button', { name: 'Add to workspace' })).toBeDisabled()
  })

  it('deletes a screenshot only after confirmation', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      screenshot: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleRecord] }),
        remove
      } as never
    })
    const user = userEvent.setup()

    renderCenter()
    await screen.findByText('Current window')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(remove).not.toHaveBeenCalled()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(remove).toHaveBeenCalledWith({ id: 'shot-1' })
  })
})
