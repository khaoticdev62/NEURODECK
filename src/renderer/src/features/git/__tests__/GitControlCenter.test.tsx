import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { GitControlCenter } from '../GitControlCenter'

function renderControlCenter(value: WorkspaceContextValue): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <WorkspaceContext.Provider value={value}>
      <GitControlCenter />
    </WorkspaceContext.Provider>
  )
}

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

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('GitControlCenter', () => {
  it('requires an active workspace', () => {
    renderControlCenter(workspaceValue(false))
    expect(screen.getByText('No workspace yet')).toBeInTheDocument()
  })

  it('loads the real Git state and previews the selected file diff', async () => {
    const diff = vi.fn().mockResolvedValue({
      ok: true,
      data: { diff: '@@ -1 +1 @@\n-old line\n+new line' }
    })
    window.ndx = {
      git: {
        status: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            isRepository: true,
            branch: 'main',
            ahead: 0,
            behind: 0,
            changes: [{ path: 'src/app.ts', status: '.M', staged: false }]
          }
        }),
        branches: vi.fn().mockResolvedValue({
          ok: true,
          data: [{ name: 'main', current: true }]
        }),
        log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        remotes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        stashList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        diff
      } as never
    } as Partial<NdxBridge> as NdxBridge

    const user = userEvent.setup()
    renderControlCenter(workspaceValue(true))

    expect(await screen.findByText('Git Control Center')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /src\/app\.ts/ }))

    expect(diff).toHaveBeenCalledWith({ workspaceId: 'w1', path: 'src/app.ts', staged: false })
    expect(await screen.findByText('+new line')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Diff for src/app.ts' })).toBeInTheDocument()
  })

  it('reviews the exact local commit before invoking Git', async () => {
    const commit = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      git: {
        status: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            isRepository: true,
            branch: 'main',
            ahead: 0,
            behind: 0,
            changes: [{ path: 'src/app.ts', status: 'M.', staged: true }]
          }
        }),
        branches: vi.fn().mockResolvedValue({
          ok: true,
          data: [{ name: 'main', current: true }]
        }),
        log: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        remotes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        stashList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        commit
      } as never
    } as Partial<NdxBridge> as NdxBridge

    const user = userEvent.setup()
    renderControlCenter(workspaceValue(true))
    await screen.findByText('Staged (1)')
    await user.type(screen.getByPlaceholderText('Commit message'), 'Fix controller focus')
    await user.click(screen.getByRole('button', { name: 'Review commit' }))

    expect(screen.getByText('Review local commit')).toBeInTheDocument()
    expect(
      screen.getByText('Create a commit with message: “Fix controller focus”')
    ).toBeInTheDocument()
    expect(commit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Commit locally' }))
    expect(commit).toHaveBeenCalledWith({ workspaceId: 'w1', message: 'Fix controller focus' })
  })
})
