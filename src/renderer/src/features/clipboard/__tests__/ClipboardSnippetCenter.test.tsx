import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClipboardEntry, NdxBridge, Snippet } from '@shared/contracts'
import { ShareSheetProvider } from '../../../state/shareSheet'
import { ClipboardSnippetCenter } from '../ClipboardSnippetCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof render> {
  return render(
    <ShareSheetProvider>
      <ClipboardSnippetCenter />
    </ShareSheetProvider>
  )
}

const sampleEntry: ClipboardEntry = {
  id: 'entry-1',
  kind: 'text',
  content: 'Recovery checkpoints protect edited files.',
  pinned: false,
  sensitive: false,
  createdAt: Date.UTC(2026, 5, 28, 12, 0, 0)
}

const sampleSnippet: Snippet = {
  id: 'snippet-1',
  name: 'Greeting',
  type: 'text',
  content: 'Hello {{name}}',
  variables: ['name'],
  createdAt: Date.UTC(2026, 5, 28, 12, 0, 0),
  updatedAt: Date.UTC(2026, 5, 28, 12, 0, 0)
}

describe('ClipboardSnippetCenter', () => {
  it('shows empty states for both clipboard history and snippets', async () => {
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true })
      } as never,
      snippets: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderScreen()

    expect(await screen.findByText('No clipboard entries')).toBeInTheDocument()
    expect(await screen.findByText('No snippets yet')).toBeInTheDocument()
  })

  it('lists real clipboard entries and toggles pin state', async () => {
    const setPinned = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { ...sampleEntry, pinned: true } })
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [sampleEntry] })
      .mockResolvedValueOnce({ ok: true, data: [{ ...sampleEntry, pinned: true }] })
    stubBridge({
      clipboard: {
        list,
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true }),
        setPinned
      } as never,
      snippets: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText(sampleEntry.content)

    await user.click(screen.getByRole('button', { name: 'Pin' }))

    expect(setPinned).toHaveBeenCalledWith({ id: 'entry-1', pinned: true })
  })

  it('removes a clipboard entry only after confirmation', async () => {
    const removeClipboardEntry = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleEntry] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true }),
        remove: removeClipboardEntry
      } as never,
      snippets: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText(sampleEntry.content)

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(removeClipboardEntry).not.toHaveBeenCalled()

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
    await user.click(removeButtons[removeButtons.length - 1])

    expect(removeClipboardEntry).toHaveBeenCalledWith({ id: 'entry-1' })
  })

  it('toggles clipboard monitoring', async () => {
    const setMonitoring = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true }),
        setMonitoring
      } as never,
      snippets: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByRole('button', { name: 'Monitoring: On' })

    await user.click(screen.getByRole('button', { name: 'Monitoring: On' }))

    expect(setMonitoring).toHaveBeenCalledWith({ enabled: false })
  })

  it('lists real snippets with risk classification', async () => {
    const riskySnippet: Snippet = {
      ...sampleSnippet,
      id: 'snippet-2',
      type: 'shell',
      content: 'rm -rf {{path}}',
      variables: ['path'],
      riskLevel: 'critical',
      riskReason: 'Destructive shell command'
    }
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true })
      } as never,
      snippets: { list: vi.fn().mockResolvedValue({ ok: true, data: [riskySnippet] }) } as never
    })

    renderScreen()

    expect(await screen.findByText(/Risk: critical/)).toBeInTheDocument()
    expect(screen.getByText(/Destructive shell command/)).toBeInTheDocument()
  })

  it('creates a new snippet from the form', async () => {
    const upsertSnippet = vi.fn().mockResolvedValue({ ok: true, data: sampleSnippet })
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true })
      } as never,
      snippets: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        upsert: upsertSnippet
      } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText('No snippets yet')

    await user.type(screen.getByLabelText('Snippet name'), 'Greeting')
    await user.type(screen.getByLabelText('Snippet content'), 'Hello {{{{name}}')
    await user.click(screen.getByRole('button', { name: 'Add snippet' }))

    expect(upsertSnippet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Greeting', type: 'text', content: 'Hello {{name}}' })
    )
  })

  it('renders a snippet preview with variable values and reports missing variables', async () => {
    const renderSnippet = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { text: 'Hello Ada', missingVariables: [] } })
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true })
      } as never,
      snippets: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleSnippet] }),
        render: renderSnippet
      } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText('Greeting')

    await user.click(screen.getByRole('button', { name: 'Fill variables' }))
    await user.type(screen.getByLabelText('Value for name'), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    expect(renderSnippet).toHaveBeenCalledWith({ id: 'snippet-1', values: { name: 'Ada' } })
    expect(await screen.findByText('Hello Ada')).toBeInTheDocument()
  })

  it('deletes a snippet only after confirmation', async () => {
    const removeSnippet = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      clipboard: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getMonitoring: vi.fn().mockResolvedValue({ ok: true, data: true })
      } as never,
      snippets: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleSnippet] }),
        remove: removeSnippet
      } as never
    })
    const user = userEvent.setup()

    renderScreen()
    await screen.findByText('Greeting')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(removeSnippet).not.toHaveBeenCalled()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(removeSnippet).toHaveBeenCalledWith({ id: 'snippet-1' })
  })
})
