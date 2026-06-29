import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, VaultItem } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { KioskModeProvider } from '../../../state/kioskMode'
import { PresentationModeProvider } from '../../../state/presentationMode'
import { Vault } from '../Vault'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderVault(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <DisplaySettingsProvider>
        <PresentationModeProvider>
          <KioskModeProvider>
            <MemoryRouter>
              <Vault />
            </MemoryRouter>
          </KioskModeProvider>
        </PresentationModeProvider>
      </DisplaySettingsProvider>
    </ToastProvider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleItem: VaultItem = {
  id: 'item-1',
  type: 'api-credential',
  label: 'Production API key',
  notes: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastAccessedAt: null,
  expiresAt: null,
  rotationReminderDays: null,
  isExpired: false,
  needsRotation: false
}

describe('Vault', () => {
  it('shows an empty state when no items exist', async () => {
    stubBridge({
      vault: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listAccessLog: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderVault()

    expect(await screen.findByText('Vault is empty')).toBeInTheDocument()
  })

  it('lists real vault items by label and type', async () => {
    stubBridge({
      vault: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        listAccessLog: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderVault()

    expect(await screen.findByText('Production API key')).toBeInTheDocument()
    expect(screen.getByText('API credential')).toBeInTheDocument()
  })

  it('reveals a secret only after an explicit Reveal action, never on list alone', async () => {
    const reveal = vi.fn().mockResolvedValue({ ok: true, data: { secret: 'sk-real-value' } })
    stubBridge({
      vault: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        listAccessLog: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        reveal
      } as never
    })
    const user = userEvent.setup()

    renderVault()
    await screen.findByText('Production API key')
    expect(screen.queryByText('sk-real-value')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(reveal).toHaveBeenCalledWith({ id: 'item-1' })
    expect(await screen.findByText('sk-real-value')).toBeInTheDocument()
  })

  it('creates a new item through the real create form', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: sampleItem })
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: true, data: [sampleItem] })
    stubBridge({
      vault: {
        list,
        listAccessLog: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        create
      } as never
    })
    const user = userEvent.setup()

    renderVault()
    await screen.findByText('Vault is empty')

    await user.click(screen.getByRole('button', { name: 'Add Secret' }))
    await user.type(screen.getByPlaceholderText('Label (e.g. Production API key)'), 'New key')
    await user.type(screen.getByPlaceholderText('Secret value'), 'sk-new-value')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'New key', secret: 'sk-new-value' })
    )
    expect(await screen.findByText('Production API key')).toBeInTheDocument()
  })

  it('deletes an item only after confirmation', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      vault: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        listAccessLog: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        remove
      } as never
    })
    const user = userEvent.setup()

    renderVault()
    await screen.findByText('Production API key')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(remove).not.toHaveBeenCalled()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(remove).toHaveBeenCalledWith({ id: 'item-1' })
  })

  it('disables Reveal while real Presentation Mode is active', async () => {
    stubBridge({
      vault: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleItem] }),
        listAccessLog: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never,
      presentationMode: {
        get: vi.fn().mockResolvedValue({ ok: true, data: { enabled: true, keepScreenAwake: true } })
      } as never
    })

    renderVault()

    expect(await screen.findByRole('button', { name: 'Reveal' })).toBeDisabled()
    expect(
      screen.getByText('Reveal is disabled while Presentation Mode or Kiosk Mode is active.')
    ).toBeInTheDocument()
  })
})
