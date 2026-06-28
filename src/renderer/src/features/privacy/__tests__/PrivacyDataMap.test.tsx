import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DataMapEntry, NdxBridge } from '@shared/contracts'
import { PrivacyDataMap } from '../PrivacyDataMap'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderMap(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <PrivacyDataMap />
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleEntries: DataMapEntry[] = [
  {
    id: 'clipboard-history',
    label: 'Clipboard history',
    storageLocation: 'Local JSON',
    encrypted: false,
    retention: 'Until explicitly cleared',
    syncStatus: 'Not synced',
    exportSupport: 'Not supported',
    deleteControl: 'available-here',
    deleteControlDetail: 'Clears every stored clipboard entry.',
    providerInvolvement: 'None — local only',
    itemCount: 3
  },
  {
    id: 'vault-secrets',
    label: 'Vault secrets',
    storageLocation: 'Local JSON, encrypted at rest',
    encrypted: true,
    retention: 'Until explicitly deleted',
    syncStatus: 'Not synced',
    exportSupport: 'Not supported',
    deleteControl: 'available-elsewhere',
    deleteControlDetail: 'Manage from the Secrets Vault screen.',
    providerInvolvement: 'None — local only',
    itemCount: 1,
    linkedRoute: '/vault'
  },
  {
    id: 'terminal-history',
    label: 'Terminal history',
    storageLocation: 'None — not persisted',
    encrypted: false,
    retention: 'Not persisted',
    syncStatus: 'Not synced',
    exportSupport: 'Not supported',
    deleteControl: 'not-applicable',
    deleteControlDetail: 'Nothing to delete.',
    providerInvolvement: 'None',
    itemCount: null
  }
]

describe('PrivacyDataMap', () => {
  it('lists every real data category with its storage location', async () => {
    stubBridge({
      privacy: { getDataMap: vi.fn().mockResolvedValue({ ok: true, data: sampleEntries }) } as never
    })

    renderMap()

    expect(await screen.findByText('Clipboard history')).toBeInTheDocument()
    expect(screen.getByText('Vault secrets')).toBeInTheDocument()
    expect(screen.getByText('Terminal history')).toBeInTheDocument()
  })

  it('shows a Clear action only for categories with a real bulk-delete control here', async () => {
    stubBridge({
      privacy: { getDataMap: vi.fn().mockResolvedValue({ ok: true, data: sampleEntries }) } as never
    })

    renderMap()
    await screen.findByText('Clipboard history')

    expect(screen.getAllByRole('button', { name: 'Clear' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument()
    expect(screen.getByText('No delete control needed')).toBeInTheDocument()
  })

  it('clears a category only after confirmation and shows a real verification result', async () => {
    const clearDataCategory = vi.fn().mockResolvedValue({
      ok: true,
      data: { id: 'clipboard-history', clearedCount: 3, verifiedEmpty: true }
    })
    stubBridge({
      privacy: {
        getDataMap: vi.fn().mockResolvedValue({ ok: true, data: sampleEntries }),
        clearDataCategory
      } as never
    })
    const user = userEvent.setup()

    renderMap()
    await screen.findByText('Clipboard history')

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(clearDataCategory).not.toHaveBeenCalled()

    const clearButtons = screen.getAllByRole('button', { name: 'Clear' })
    await user.click(clearButtons[clearButtons.length - 1])

    expect(clearDataCategory).toHaveBeenCalledWith({ id: 'clipboard-history' })
    expect(await screen.findByText(/verified empty/)).toBeInTheDocument()
  })
})
