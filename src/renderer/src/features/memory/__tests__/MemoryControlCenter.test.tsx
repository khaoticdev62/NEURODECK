import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MemoryItem, NdxBridge } from '@shared/contracts'
import { MemoryControlCenter } from '../MemoryControlCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleItem: MemoryItem = {
  id: 'memory-1',
  scope: 'workspace',
  type: 'user-preference',
  content: 'Prefers concise commit messages.',
  attributedTo: 'user',
  pinned: false,
  createdAt: Date.UTC(2026, 5, 28, 12, 0, 0),
  updatedAt: Date.UTC(2026, 5, 28, 12, 0, 0)
}

const disabledState = { allDisabled: false, disabledTypes: [] }

describe('MemoryControlCenter', () => {
  it('shows an empty state when no memory items exist', async () => {
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState })
      } as never
    })

    render(<MemoryControlCenter />)

    expect(await screen.findByText('No memory items')).toBeInTheDocument()
  })

  it('lists real memory items with scope, type, and attribution', async () => {
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState })
      } as never
    })

    render(<MemoryControlCenter />)

    expect(await screen.findByText(sampleItem.content)).toBeInTheDocument()
    expect(screen.getByText('workspace · user-preference')).toBeInTheDocument()
    expect(screen.getByText(/Attributed to user/)).toBeInTheDocument()
  })

  it('toggles pin state on a memory item', async () => {
    const updateMemory = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { ...sampleItem, pinned: true } })
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        update: updateMemory
      } as never
    })
    const user = userEvent.setup()

    render(<MemoryControlCenter />)
    await screen.findByText(sampleItem.content)

    await user.click(screen.getByRole('button', { name: 'Pin' }))

    expect(updateMemory).toHaveBeenCalledWith({ id: 'memory-1', pinned: true })
  })

  it('edits content and scope through the inline inspector', async () => {
    const updateMemory = vi.fn().mockResolvedValue({ ok: true, data: sampleItem })
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        update: updateMemory
      } as never
    })
    const user = userEvent.setup()

    render(<MemoryControlCenter />)
    await screen.findByText(sampleItem.content)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const contentBox = screen.getByLabelText('Edit content for memory item memory-1')
    await user.clear(contentBox)
    await user.type(contentBox, 'Updated preference text.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'memory-1', content: 'Updated preference text.' })
    )
  })

  it('removes a memory item only after confirmation', async () => {
    const deleteMemory = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        delete: deleteMemory
      } as never
    })
    const user = userEvent.setup()

    render(<MemoryControlCenter />)
    await screen.findByText(sampleItem.content)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteMemory).not.toHaveBeenCalled()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(deleteMemory).toHaveBeenCalledWith({ id: 'memory-1' })
  })

  it('toggles disable-all', async () => {
    const setDisabled = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        setDisabled
      } as never
    })
    const user = userEvent.setup()

    render(<MemoryControlCenter />)
    await screen.findByRole('button', { name: 'Disable all: Off' })

    await user.click(screen.getByRole('button', { name: 'Disable all: Off' }))

    expect(setDisabled).toHaveBeenCalledWith({ disabled: true })
  })

  it('toggles a per-category disable', async () => {
    const setDisabled = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        setDisabled
      } as never
    })
    const user = userEvent.setup()

    render(<MemoryControlCenter />)
    await screen.findByText('No memory items')

    await user.click(screen.getByRole('button', { name: 'user-preference' }))

    expect(setDisabled).toHaveBeenCalledWith({ type: 'user-preference', disabled: true })
  })

  it('clears conversation memory only after confirmation', async () => {
    const clearScope = vi.fn().mockResolvedValue({ ok: true, data: 3 })
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        clearScope
      } as never
    })
    const user = userEvent.setup()

    render(<MemoryControlCenter />)
    await screen.findByText('No memory items')

    await user.click(screen.getByRole('button', { name: 'Clear conversation memory' }))
    expect(clearScope).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(clearScope).toHaveBeenCalledWith({ scope: 'conversation' })
    expect(await screen.findByText(/Cleared 3 conversation memory items/)).toBeInTheDocument()
  })

  it('exports the current filtered view as JSON to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const exported = {
      schemaVersion: '1.0.0',
      exportedAt: Date.now(),
      query: {},
      itemCount: 1,
      items: [sampleItem]
    }
    stubBridge({
      memory: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        getDisabledState: vi.fn().mockResolvedValue({ ok: true, data: disabledState }),
        export: vi.fn().mockResolvedValue({ ok: true, data: exported })
      } as never
    })

    render(<MemoryControlCenter />)
    await screen.findByText(sampleItem.content)

    await user.click(screen.getByRole('button', { name: 'Export (copy JSON)' }))

    expect(await screen.findByText(/Copied 1 memory item/)).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(exported, null, 2))
  })
})
