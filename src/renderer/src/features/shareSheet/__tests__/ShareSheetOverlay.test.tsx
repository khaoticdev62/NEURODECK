import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { ShareSheetProvider } from '../../../state/shareSheet'
import { useShareSheet } from '../../../state/useShareSheet'
import { ShareSheetOverlay } from '../ShareSheetOverlay'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const noWorkspaceValue: WorkspaceContextValue = {
  workspaces: [],
  activeWorkspaceId: null,
  activeWorkspace: null,
  loading: false,
  error: null,
  refresh: vi.fn(),
  addFromPicker: vi.fn(),
  remove: vi.fn(),
  setActive: vi.fn()
}

function OpenButton({
  payload
}: {
  payload: { text?: string; url?: string; filePaths?: string[]; sourceLabel: string }
}): React.JSX.Element {
  const { openShareSheet } = useShareSheet()
  return (
    <button type="button" onClick={() => openShareSheet(payload)}>
      Trigger share
    </button>
  )
}

function renderOverlay(payload: {
  text?: string
  url?: string
  filePaths?: string[]
  sourceLabel: string
}): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <WorkspaceContext.Provider value={noWorkspaceValue}>
        <ShareSheetProvider>
          <OpenButton payload={payload} />
          <ShareSheetOverlay />
        </ShareSheetProvider>
      </WorkspaceContext.Provider>
    </MemoryRouter>
  )
}

describe('ShareSheetOverlay', () => {
  it('renders nothing until a share is requested', () => {
    renderOverlay({ text: 'hello', sourceLabel: 'Test' })
    expect(screen.queryByText('Share: Test')).not.toBeInTheDocument()
  })

  it('offers only the targets relevant to the real payload contents', async () => {
    const user = userEvent.setup()
    renderOverlay({ url: 'https://example.com', sourceLabel: 'A link' })

    await user.click(screen.getByRole('button', { name: 'Trigger share' }))

    expect(await screen.findByText('Share: A link')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in Browser' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in External App' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send to Nearby Device' })).not.toBeInTheDocument()
  })

  it('copies real text content to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderOverlay({ text: 'shared content', sourceLabel: 'Selection' })

    await user.click(screen.getByRole('button', { name: 'Trigger share' }))
    await user.click(await screen.findByRole('button', { name: 'Copy to Clipboard' }))

    expect(writeText).toHaveBeenCalledWith('shared content')
    expect(await screen.findByText('Copied to clipboard.')).toBeInTheDocument()
  })

  it('adds real text content to the Knowledge Vault through the typed IPC', async () => {
    const addNote = vi.fn().mockResolvedValue({ ok: true, data: { id: 'src-1' } })
    stubBridge({ knowledge: { addNote } as never })
    const user = userEvent.setup()
    renderOverlay({ text: 'shared content', sourceLabel: 'Selection' })

    await user.click(screen.getByRole('button', { name: 'Trigger share' }))
    await user.click(await screen.findByRole('button', { name: 'Add to Knowledge Vault' }))

    expect(addNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Selection', text: 'shared content' })
    )
    expect(await screen.findByText('Added to Knowledge Vault.')).toBeInTheDocument()
  })

  it('offers Send to Nearby Device only when file paths are present', async () => {
    const user = userEvent.setup()
    renderOverlay({ filePaths: ['/tmp/file.txt'], sourceLabel: 'file.txt' })

    await user.click(screen.getByRole('button', { name: 'Trigger share' }))

    expect(await screen.findByRole('button', { name: 'Send to Nearby Device' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy to Clipboard' })).not.toBeInTheDocument()
  })
})
