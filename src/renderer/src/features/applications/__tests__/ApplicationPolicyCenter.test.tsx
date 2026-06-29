import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationRecord, NdxBridge } from '@shared/contracts'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { ApplicationPolicyCenter } from '../ApplicationPolicyCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

const noWorkspaceValue: WorkspaceContextValue = {
  workspaces: [{ id: 'w1', name: 'my-project', rootPath: '/home/deck/my-project', createdAt: 0 }],
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
    <WorkspaceContext.Provider value={noWorkspaceValue}>
      <ApplicationPolicyCenter />
    </WorkspaceContext.Provider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleApp: ApplicationRecord = {
  id: 'app-1',
  source: 'internal',
  name: 'Demo App',
  launchArguments: [],
  categories: [],
  installed: true,
  workspaceIds: [],
  launchMode: 'windowed',
  capabilityRequirements: [],
  createdAt: 0,
  updatedAt: 0
}

describe('ApplicationPolicyCenter', () => {
  it('shows an empty state when no applications are registered', async () => {
    stubBridge({
      applications: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    renderCenter()

    expect(await screen.findByText('No applications registered')).toBeInTheDocument()
  })

  it('lists real applications and loads their real policy when selected', async () => {
    const getPolicy = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        applicationId: 'app-1',
        entries: [{ category: 'network', allowed: false }],
        launchEnvironment: { NDX_VAR: 'value' },
        updatedAt: 0
      }
    })
    stubBridge({
      applications: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleApp] }) } as never,
      applicationPolicy: { get: getPolicy } as never
    })
    const user = userEvent.setup()

    renderCenter()
    await user.click(await screen.findByRole('button', { name: 'Demo App' }))

    expect(getPolicy).toHaveBeenCalledWith({ applicationId: 'app-1' })
    expect(await screen.findByText('Network: Denied')).toBeInTheDocument()
    expect(screen.getByText('NDX_VAR=value')).toBeInTheDocument()
  })

  it('toggling an advisory category persists a real policy update', async () => {
    const setPolicy = vi.fn().mockResolvedValue({
      ok: true,
      data: { applicationId: 'app-1', entries: [], launchEnvironment: {}, updatedAt: 0 }
    })
    stubBridge({
      applications: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleApp] }) } as never,
      applicationPolicy: {
        get: vi.fn().mockResolvedValue({ ok: true, data: null }),
        set: setPolicy
      } as never
    })
    const user = userEvent.setup()

    renderCenter()
    await user.click(await screen.findByRole('button', { name: 'Demo App' }))
    await user.click(await screen.findByRole('button', { name: 'Microphone: Allowed' }))

    expect(setPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'app-1',
        entries: expect.arrayContaining([{ category: 'microphone', allowed: false }])
      })
    )
  })
})
