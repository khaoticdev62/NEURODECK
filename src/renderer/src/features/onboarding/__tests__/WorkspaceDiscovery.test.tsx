import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { WorkspaceDiscovery } from '../WorkspaceDiscovery'
import { ControllerCalibration } from '../ControllerCalibration'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof render> {
  return renderWithProviders(
    <Routes>
      <Route path="/onboarding/workspaces" element={<WorkspaceDiscovery />} />
      <Route path="/onboarding/calibration" element={<ControllerCalibration />} />
    </Routes>,
    { initialEntries: ['/onboarding/workspaces'] }
  )
}

function makeBridge(
  options: { workspaces?: { id: string; rootPath: string; name: string }[] } = {}
): Partial<NdxBridge> {
  return {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: options.workspaces ?? [] }),
      create: vi.fn().mockResolvedValue({ ok: true, data: { id: 'w1', name: 'Project' } }),
      pickFolder: vi.fn().mockResolvedValue({ ok: true, data: null }),
      discover: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never
  }
}

describe('WorkspaceDiscovery', () => {
  it('renders source toggles and scans on mount', async () => {
    const discover = vi.fn().mockResolvedValue({ ok: true, data: [] })
    stubBridge({
      workspaces: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        create: vi.fn().mockResolvedValue({ ok: true, data: { id: 'w1' } }),
        pickFolder: vi.fn().mockResolvedValue({ ok: true, data: null }),
        discover
      } as never
    })
    renderScreen()

    expect(screen.getByText('Home projects')).toBeInTheDocument()
    expect(screen.getByText('Git repositories')).toBeInTheDocument()
    await waitFor(() => {
      expect(discover).toHaveBeenCalled()
    })
  })

  it('renders discovered items and adds a local workspace', async () => {
    const discover = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'home-project',
          name: 'my-project',
          rootPath: '/home/deck/my-project',
          source: 'home',
          reachable: true
        },
        {
          id: 'ssh-host',
          name: 'Deck dev box',
          rootPath: 'deck@deck.local:22',
          source: 'ssh',
          reachable: true,
          reason: 'Saved SSH host'
        }
      ]
    })
    const create = vi.fn().mockResolvedValue({ ok: true, data: { id: 'w1' } })
    stubBridge({
      workspaces: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        create,
        pickFolder: vi.fn().mockResolvedValue({ ok: true, data: null }),
        discover
      } as never
    })
    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('my-project')).toBeInTheDocument()
    })
    expect(screen.getByText('Deck dev box')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add my-project' }))

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ rootPath: '/home/deck/my-project' })
    })
  })

  it('disables add for SSH sources and already-added workspaces', async () => {
    stubBridge({
      workspaces: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [{ id: 'existing', name: 'existing', rootPath: '/home/deck/existing' }]
        }),
        create: vi.fn().mockResolvedValue({ ok: true, data: { id: 'w1' } }),
        pickFolder: vi.fn().mockResolvedValue({ ok: true, data: null }),
        discover: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'existing-discovery',
              name: 'existing',
              rootPath: '/home/deck/existing',
              source: 'home',
              reachable: true
            },
            {
              id: 'ssh-discovery',
              name: 'Remote',
              rootPath: 'user@host:22',
              source: 'ssh',
              reachable: true
            }
          ]
        })
      } as never
    })
    renderScreen()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'existing already added' })).toBeDisabled()
    })
    expect(screen.getByRole('button', { name: 'Remote is remote only' })).toBeDisabled()
  })

  it('navigates to calibration on Continue', async () => {
    stubBridge(makeBridge())
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByText('Controller Calibration')).toBeInTheDocument()
    })
  })
})
