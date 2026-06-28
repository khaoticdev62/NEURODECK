import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { FileManager } from '../FileManager'
import { WorkspaceContext, type WorkspaceContextValue } from '../WorkspaceContext'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const activeWorkspaceValue: WorkspaceContextValue = {
  workspaces: [
    { id: 'w1', name: 'my-project', rootPath: '/home/deck/my-project', createdAt: Date.now() }
  ],
  activeWorkspaceId: 'w1',
  activeWorkspace: {
    id: 'w1',
    name: 'my-project',
    rootPath: '/home/deck/my-project',
    createdAt: Date.now()
  },
  loading: false,
  error: null,
  refresh: vi.fn(),
  addFromPicker: vi.fn(),
  remove: vi.fn(),
  setActive: vi.fn()
}

function renderFileManager(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <MemoryRouter>
            <WorkspaceContext.Provider value={activeWorkspaceValue}>
              <FileManager />
            </WorkspaceContext.Provider>
          </MemoryRouter>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('FileManager', () => {
  it('shows the "no active workspace" empty state when nothing is active', async () => {
    stubBridge({})
    render(
      <ToastProvider>
        <FocusEngineProvider adapters={[new TestAdapter()]}>
          <AiSafetyProvider>
            <MemoryRouter>
              <WorkspaceContext.Provider value={{ ...activeWorkspaceValue, activeWorkspace: null }}>
                <FileManager />
              </WorkspaceContext.Provider>
            </MemoryRouter>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    )

    expect(await screen.findByText('No active workspace')).toBeInTheDocument()
  })

  it('lists real files and folders for the active workspace', async () => {
    const list = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { name: 'src', path: 'src', isDirectory: true, sizeBytes: 0, modifiedAt: Date.now() },
        {
          name: 'readme.md',
          path: 'readme.md',
          isDirectory: false,
          sizeBytes: 42,
          modifiedAt: Date.now()
        }
      ]
    })
    stubBridge({ files: { list, read: vi.fn() } as never })

    renderFileManager()

    expect(await screen.findByText('readme.md')).toBeInTheDocument()
    expect(screen.getByText(/src/)).toBeInTheDocument()
    expect(list).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: '' })
  })

  it('navigates into a subdirectory when a folder row is activated', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: [
          { name: 'src', path: 'src', isDirectory: true, sizeBytes: 0, modifiedAt: Date.now() }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            name: 'index.ts',
            path: 'src/index.ts',
            isDirectory: false,
            sizeBytes: 10,
            modifiedAt: Date.now()
          }
        ]
      })
    stubBridge({ files: { list, read: vi.fn() } as never })

    const user = userEvent.setup()
    renderFileManager()
    await screen.findByText(/src/)

    await user.click(screen.getByText(/src/))

    expect(await screen.findByText('index.ts')).toBeInTheDocument()
    expect(list).toHaveBeenLastCalledWith({ workspaceId: 'w1', relativePath: 'src' })
  })

  it('shows a real preview when a file row is activated', async () => {
    const list = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          name: 'readme.md',
          path: 'readme.md',
          isDirectory: false,
          sizeBytes: 5,
          modifiedAt: Date.now()
        }
      ]
    })
    const read = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { content: 'Hello', truncated: false, sizeBytes: 5 } })
    stubBridge({ files: { list, read } as never })

    const user = userEvent.setup()
    renderFileManager()
    await screen.findByText('readme.md')

    await user.click(screen.getByText('readme.md'))

    expect(await screen.findByText('Hello')).toBeInTheDocument()
    expect(read).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: 'readme.md' })
  })

  it('deletes a file through the typed bridge after confirmation', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            name: 'readme.md',
            path: 'readme.md',
            isDirectory: false,
            sizeBytes: 5,
            modifiedAt: Date.now()
          }
        ]
      })
      .mockResolvedValueOnce({ ok: true, data: [] })
    const deleteFile = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({ files: { list, read: vi.fn(), delete: deleteFile } as never })

    const user = userEvent.setup()
    renderFileManager()
    await screen.findByText('readme.md')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1])

    expect(deleteFile).toHaveBeenCalledWith({ workspaceId: 'w1', relativePath: 'readme.md' })
    expect(await screen.findByText('Empty folder')).toBeInTheDocument()
  })

  it('navigates to the Send Composer with the real resolved absolute path', async () => {
    const list = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          name: 'readme.md',
          path: 'readme.md',
          isDirectory: false,
          sizeBytes: 5,
          modifiedAt: Date.now()
        }
      ]
    })
    stubBridge({ files: { list, read: vi.fn() } as never })

    function LocationProbe(): React.JSX.Element {
      const location = useLocation()
      return (
        <p data-testid="location">
          {location.pathname} {JSON.stringify(location.state)}
        </p>
      )
    }

    const user = userEvent.setup()
    render(
      <ToastProvider>
        <FocusEngineProvider adapters={[new TestAdapter()]}>
          <AiSafetyProvider>
            <MemoryRouter>
              <WorkspaceContext.Provider value={activeWorkspaceValue}>
                <FileManager />
              </WorkspaceContext.Provider>
              <LocationProbe />
            </MemoryRouter>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    )
    await screen.findByText('readme.md')

    await user.click(screen.getByRole('button', { name: 'Send via LAN Share' }))

    const probe = await screen.findByTestId('location')
    expect(probe.textContent).toContain('/lan-share/send')
    expect(probe.textContent).toContain('/home/deck/my-project/readme.md')
  })

  it('does not offer Delete for a directory', async () => {
    const list = vi.fn().mockResolvedValue({
      ok: true,
      data: [{ name: 'src', path: 'src', isDirectory: true, sizeBytes: 0, modifiedAt: Date.now() }]
    })
    stubBridge({ files: { list, read: vi.fn() } as never })

    renderFileManager()

    await screen.findByText(/src/)
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
