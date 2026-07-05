import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { WorkspaceHub } from '../WorkspaceHub'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = {
    git: { status: vi.fn().mockResolvedValue({ ok: false, error: { userMessage: 'no repo' } }) },
    ...partial
  } as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('WorkspaceHub', () => {
  it('shows the real empty state when no workspaces exist', async () => {
    stubBridge({ workspaces: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never })

    renderWithProviders(<WorkspaceHub />)

    expect(await screen.findByText('No workspaces yet')).toBeInTheDocument()
  })

  it('lists real workspaces returned by the IPC bridge', async () => {
    stubBridge({
      workspaces: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'w1',
              name: 'my-project',
              rootPath: '/home/deck/my-project',
              createdAt: Date.now()
            }
          ]
        })
      } as never
    })

    renderWithProviders(<WorkspaceHub />)

    expect(await screen.findByText('my-project')).toBeInTheDocument()
    expect(screen.getByText('/home/deck/my-project')).toBeInTheDocument()
  })

  it('calls the real folder picker and create flow when "Add workspace" is activated', async () => {
    const pickFolder = vi.fn().mockResolvedValue({ ok: true, data: '/home/deck/new-project' })
    const create = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'w2',
        name: 'new-project',
        rootPath: '/home/deck/new-project',
        createdAt: Date.now()
      }
    })
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'w2',
            name: 'new-project',
            rootPath: '/home/deck/new-project',
            createdAt: Date.now()
          }
        ]
      })
    stubBridge({ workspaces: { list, pickFolder, create } as never })

    const user = userEvent.setup()
    renderWithProviders(<WorkspaceHub />)
    await screen.findByText('No workspaces yet')

    await user.click(screen.getByRole('button', { name: 'Add workspace' }))

    await waitFor(() => expect(create).toHaveBeenCalledWith({ rootPath: '/home/deck/new-project' }))
    expect(await screen.findByText('new-project')).toBeInTheDocument()
  })

  it('removes a workspace when "Remove" is activated', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: [
          { id: 'w1', name: 'my-project', rootPath: '/home/deck/my-project', createdAt: Date.now() }
        ]
      })
      .mockResolvedValueOnce({ ok: true, data: [] })
    stubBridge({ workspaces: { list, remove } as never })

    const user = userEvent.setup()
    renderWithProviders(<WorkspaceHub />)
    await screen.findByText('my-project')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith('w1'))
    expect(await screen.findByText('No workspaces yet')).toBeInTheDocument()
  })
})
