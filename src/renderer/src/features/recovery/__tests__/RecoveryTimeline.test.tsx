import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { RecoveryTimeline } from '../RecoveryTimeline'

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

function renderTimeline(active = true): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceContext.Provider value={workspaceValue(active)}>
            <RecoveryTimeline />
          </WorkspaceContext.Provider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('RecoveryTimeline', () => {
  it('requires an active workspace', () => {
    renderTimeline(false)
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })

  it('shows the real empty state when there are no checkpoints', async () => {
    stubBridge({ recovery: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never })

    renderTimeline()

    expect(await screen.findByText('No recovery checkpoints yet')).toBeInTheDocument()
  })

  it('lists real checkpoints and loads a real diff on selection', async () => {
    const checkpoint = {
      id: 'c1',
      workspaceId: 'w1',
      kind: 'file-write' as const,
      relativePath: 'src/app.ts',
      description: 'edit app.ts',
      reversibility: 'fully-reversible' as const,
      hadPreviousContent: true,
      createdAt: Date.now()
    }
    const diff = vi.fn().mockResolvedValue({
      ok: true,
      data: { diff: '@@ -1 +1 @@\n-old\n+new', hadPreviousContent: true }
    })
    stubBridge({
      recovery: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [checkpoint] }),
        diff
      } as never
    })

    const user = userEvent.setup()
    renderTimeline()

    await user.click(await screen.findByText('edit app.ts'))

    expect(diff).toHaveBeenCalledWith({ workspaceId: 'w1', checkpointId: 'c1' })
    expect(await screen.findByText('+new')).toBeInTheDocument()
  })

  it('reviews the exact restore before invoking it, then refreshes', async () => {
    const checkpoint = {
      id: 'c1',
      workspaceId: 'w1',
      kind: 'file-write' as const,
      relativePath: 'src/app.ts',
      description: 'edit app.ts',
      reversibility: 'fully-reversible' as const,
      hadPreviousContent: true,
      createdAt: Date.now()
    }
    const restore = vi.fn().mockResolvedValue({ ok: true, data: null })
    const list = vi.fn().mockResolvedValue({ ok: true, data: [checkpoint] })
    stubBridge({
      recovery: {
        list,
        diff: vi.fn().mockResolvedValue({ ok: true, data: { diff: '', hadPreviousContent: true } }),
        restore
      } as never
    })

    const user = userEvent.setup()
    renderTimeline()
    await user.click(await screen.findByText('edit app.ts'))
    await user.click(screen.getByRole('button', { name: 'Restore to this point' }))

    expect(screen.getByText('Restore recovery checkpoint')).toBeInTheDocument()
    expect(restore).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(restore).toHaveBeenCalledWith({ workspaceId: 'w1', checkpointId: 'c1' })
    expect(list).toHaveBeenCalledTimes(2)
  })
})
