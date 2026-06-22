import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../WorkspaceContext'
import { WorkspaceSwitcherOverlay } from '../WorkspaceSwitcherOverlay'

function makeValue(overrides: Partial<WorkspaceContextValue> = {}): WorkspaceContextValue {
  return {
    workspaces: [],
    activeWorkspaceId: null,
    activeWorkspace: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn(),
    ...overrides
  }
}

function renderOverlay(
  adapter: TestAdapter,
  value: WorkspaceContextValue
): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[adapter]}>
      <AiSafetyProvider>
        <WorkspaceContext.Provider value={value}>
          <WorkspaceSwitcherOverlay />
        </WorkspaceContext.Provider>
      </AiSafetyProvider>
    </FocusEngineProvider>
  )
}

describe('WorkspaceSwitcherOverlay', () => {
  it('opens on the real "workspace.switcher" action (LT+RT chord)', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter, makeValue())

    act(() => adapter.inject('workspace.switcher', 'press'))

    expect(screen.getByRole('dialog', { name: 'Workspace Switcher' })).toBeInTheDocument()
  })

  it('toggles closed on a second activation', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter, makeValue())

    act(() => adapter.inject('workspace.switcher', 'press'))
    expect(screen.getByRole('dialog', { name: 'Workspace Switcher' })).toBeInTheDocument()

    act(() => adapter.inject('workspace.switcher', 'press'))
    expect(screen.queryByRole('dialog', { name: 'Workspace Switcher' })).not.toBeInTheDocument()
  })

  it('shows the real empty state when no workspaces exist', () => {
    const adapter = new TestAdapter()
    renderOverlay(adapter, makeValue())

    act(() => adapter.inject('workspace.switcher', 'press'))

    expect(screen.getByText('No workspaces yet')).toBeInTheDocument()
  })

  it('switches the active workspace when a card is activated', async () => {
    const setActive = vi.fn()
    const adapter = new TestAdapter()
    renderOverlay(
      adapter,
      makeValue({
        workspaces: [
          { id: 'w1', name: 'alpha', rootPath: '/a', createdAt: Date.now() },
          { id: 'w2', name: 'beta', rootPath: '/b', createdAt: Date.now() }
        ],
        activeWorkspaceId: 'w1',
        setActive
      })
    )

    act(() => adapter.inject('workspace.switcher', 'press'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'beta' }))

    expect(setActive).toHaveBeenCalledWith('w2')
    expect(screen.queryByRole('dialog', { name: 'Workspace Switcher' })).not.toBeInTheDocument()
  })
})
