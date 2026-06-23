import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GitStatus, NdxBridge } from '@shared/contracts'
import { WorkspaceGitTab } from '../WorkspaceGitTab'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const baseStatus: GitStatus = {
  isRepository: true,
  branch: 'main',
  ahead: 0,
  behind: 0,
  changes: [{ path: 'tracked.txt', status: ' M', staged: false }],
  hasConflicts: false
}

function stubGitBridge(overrides: Partial<NdxBridge['git']> = {}): void {
  stubBridge({
    git: {
      status: vi.fn().mockResolvedValue({ ok: true, data: baseStatus }),
      branches: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ name: 'main', current: true }]
      }),
      log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      remotes: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            name: 'origin',
            fetchUrl: 'git@example.com:repo.git',
            pushUrl: 'git@example.com:repo.git'
          }
        ]
      }),
      stashList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      restore: vi.fn().mockResolvedValue({ ok: true, data: null }),
      createBranch: vi.fn().mockResolvedValue({ ok: true, data: null }),
      deleteBranch: vi.fn().mockResolvedValue({ ok: true, data: null }),
      forcePush: vi.fn().mockResolvedValue({ ok: true, data: null }),
      ...overrides
    } as never
  })
}

describe('WorkspaceGitTab — restore/branch/force-push controls', () => {
  it('discards a tracked change through restore after confirmation', async () => {
    const restore = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubGitBridge({ restore } as never)

    const user = userEvent.setup()
    render(<WorkspaceGitTab workspaceId="w1" />)

    await user.click(await screen.findByRole('button', { name: 'Discard' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }))

    expect(restore).toHaveBeenCalledWith({ workspaceId: 'w1', paths: ['tracked.txt'] })
  })

  it('does not offer Discard for an untracked file (nothing to restore to)', async () => {
    stubGitBridge()
    const untrackedStatus: GitStatus = {
      ...baseStatus,
      changes: [{ path: 'new.txt', status: '??', staged: false }]
    }
    stubBridge({
      git: {
        status: vi.fn().mockResolvedValue({ ok: true, data: untrackedStatus }),
        branches: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        remotes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        stashList: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    render(<WorkspaceGitTab workspaceId="w1" />)

    await screen.findByText('new.txt')
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument()
  })

  it('creates a real branch through the typed bridge', async () => {
    const createBranch = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubGitBridge({ createBranch } as never)

    const user = userEvent.setup()
    render(<WorkspaceGitTab workspaceId="w1" />)

    await user.type(await screen.findByPlaceholderText('New branch name'), 'feature/x')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(createBranch).toHaveBeenCalledWith({ workspaceId: 'w1', name: 'feature/x' })
  })

  it('safely deletes a non-current branch after confirmation', async () => {
    const deleteBranch = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubGitBridge({ deleteBranch } as never)
    stubBridge({
      git: {
        status: vi.fn().mockResolvedValue({ ok: true, data: baseStatus }),
        branches: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            { name: 'main', current: true },
            { name: 'old-feature', current: false }
          ]
        }),
        log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        remotes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        stashList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        deleteBranch
      } as never
    })

    const user = userEvent.setup()
    render(<WorkspaceGitTab workspaceId="w1" />)

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(deleteBranch).toHaveBeenCalledWith({
      workspaceId: 'w1',
      name: 'old-feature',
      force: false
    })
  })

  it('force-pushes through --force-with-lease after a separate, more severe confirmation', async () => {
    const forcePush = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubGitBridge({ forcePush } as never)

    const user = userEvent.setup()
    render(<WorkspaceGitTab workspaceId="w1" />)

    await user.click(await screen.findByRole('button', { name: 'Force push' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/--force-with-lease/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Force push' }))

    expect(forcePush).toHaveBeenCalledWith({ workspaceId: 'w1', remote: 'origin', branch: 'main' })
  })
})
