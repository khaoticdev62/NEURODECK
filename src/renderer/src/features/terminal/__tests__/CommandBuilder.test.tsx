import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { CoreToolsBootstrap } from '../../../ai-safety/CoreToolsBootstrap'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ApprovalQueue } from '../../approvals/ApprovalQueue'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { CommandBuilder } from '../CommandBuilder'

const workspace = {
  id: 'w1',
  name: 'project',
  rootPath: '/workspace/project',
  createdAt: 1
}

const workspaceValue: WorkspaceContextValue = {
  workspaces: [workspace],
  activeWorkspaceId: workspace.id,
  activeWorkspace: workspace,
  loading: false,
  error: null,
  refresh: vi.fn(),
  addFromPicker: vi.fn(),
  remove: vi.fn(),
  setActive: vi.fn()
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('CommandBuilder', () => {
  it('builds an exact command and requires ActionQueue approval before terminal execution', async () => {
    const write = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      terminal: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              workspaceId: 'w1',
              shell: 'bash',
              cwd: '/workspace/project',
              pid: 123,
              cols: 100,
              rows: 30,
              createdAt: 1,
              status: 'running',
              exitCode: null
            }
          ]
        }),
        write,
        onExit: vi.fn().mockReturnValue(vi.fn())
      } as never
    } as Partial<NdxBridge> as NdxBridge

    const user = userEvent.setup()
    render(
      <ToastProvider>
        <FocusEngineProvider adapters={[new TestAdapter()]}>
          <AiSafetyProvider>
            <CoreToolsBootstrap />
            <WorkspaceContext.Provider value={workspaceValue}>
              <MemoryRouter initialEntries={['/terminal/builder']}>
                <Routes>
                  <Route path="/terminal/builder" element={<CommandBuilder />} />
                  <Route path="/ai/approvals" element={<ApprovalQueue />} />
                </Routes>
              </MemoryRouter>
            </WorkspaceContext.Provider>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    )

    await screen.findByText('Command Builder')
    await user.type(screen.getByPlaceholderText(/Executable/), 'git')
    await user.click(screen.getByRole('button', { name: 'Add block' }))
    await user.type(screen.getByPlaceholderText(/Program operation/), 'status')

    expect(screen.getByText('git status')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send to approval review' }))

    expect(await screen.findByText('REQUEST: Run local terminal command')).toBeInTheDocument()
    expect(screen.getByText('Run exact command: git status')).toBeInTheDocument()
    expect(screen.getByText('Exact command')).toBeInTheDocument()
    expect(screen.getByText('git status')).toBeInTheDocument()
    expect(screen.getByText('bash · /workspace/project')).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Approve once' }))
    await waitFor(() =>
      expect(write).toHaveBeenCalledWith({
        sessionId: '00000000-0000-4000-8000-000000000001',
        data: 'git status\r'
      })
    )
  })
})
