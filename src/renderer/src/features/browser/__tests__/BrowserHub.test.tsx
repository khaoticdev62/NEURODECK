import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserTab, NdxBridge } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { BrowserHub } from '../BrowserHub'

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

function renderHub(active = true): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <WorkspaceContext.Provider value={workspaceValue(active)}>
        <MemoryRouter>
          <BrowserHub />
        </MemoryRouter>
      </WorkspaceContext.Provider>
    </FocusEngineProvider>
  )
}

const sampleTab: BrowserTab = {
  id: 't1',
  workspaceId: 'w1',
  url: 'https://example.com',
  title: 'Example',
  loading: false,
  canGoBack: false,
  canGoForward: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

describe('BrowserHub', () => {
  it('requires an active workspace', () => {
    renderHub(false)
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })

  it('shows the real empty state when there are no tabs', async () => {
    stubBridge({
      browserTabs: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    renderHub()
    expect(await screen.findByText('No tabs open')).toBeInTheDocument()
  })

  it('lists a real tab', async () => {
    stubBridge({
      browserTabs: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleTab] }) } as never
    })
    renderHub()

    expect(await screen.findByText('Example')).toBeInTheDocument()
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
  })

  it('removes a tab via the real IPC call', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      browserTabs: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleTab] }),
        remove
      } as never
    })

    const user = userEvent.setup()
    renderHub()
    await screen.findByText('Example')

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(remove).toHaveBeenCalledWith({ tabId: 't1' })
    expect(await screen.findByText('No tabs open')).toBeInTheDocument()
  })
})
