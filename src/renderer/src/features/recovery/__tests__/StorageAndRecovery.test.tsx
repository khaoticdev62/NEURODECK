import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { StorageAndRecovery } from '../StorageAndRecovery'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function workspaceValue(active: boolean): WorkspaceContextValue {
  const workspace = active
    ? { id: 'w1', name: 'project', rootPath: '/workspace/project', createdAt: Date.now() }
    : null
  return {
    workspaces: workspace ? [workspace] : [],
    activeWorkspaceId: workspace?.id ?? null,
    activeWorkspace: workspace,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn()
  }
}

function renderScreen(active = true): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceContext.Provider value={workspaceValue(active)}>
            <MemoryRouter>
              <StorageAndRecovery />
            </MemoryRouter>
          </WorkspaceContext.Provider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('StorageAndRecovery', () => {
  it('requires an active workspace', () => {
    renderScreen(false)
    expect(screen.getByText('No workspace yet')).toBeInTheDocument()
  })

  it('shows the real recovery storage summary', async () => {
    stubBridge({
      recovery: {
        storageSummary: vi
          .fn()
          .mockResolvedValue({ ok: true, data: { checkpointCount: 3, totalBytes: 2048 } })
      } as never,
      system: {
        collectMetrics: vi.fn().mockResolvedValue({
          ok: false,
          error: { userMessage: 'System metrics unavailable in test', code: 'unavailable' }
        })
      } as never
    })

    renderScreen()

    expect(await screen.findByText('3 checkpoints · 2.0 KB of snapshots')).toBeInTheDocument()
  })

  it('navigates to the real Recovery Timeline route', async () => {
    stubBridge({
      recovery: {
        storageSummary: vi
          .fn()
          .mockResolvedValue({ ok: true, data: { checkpointCount: 0, totalBytes: 0 } })
      } as never,
      system: {
        collectMetrics: vi.fn().mockResolvedValue({
          ok: false,
          error: { userMessage: 'System metrics unavailable in test', code: 'unavailable' }
        })
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('0 checkpoints · 0 B of snapshots')

    await user.click(screen.getByRole('button', { name: 'Open Recovery Timeline' }))
  })
})
