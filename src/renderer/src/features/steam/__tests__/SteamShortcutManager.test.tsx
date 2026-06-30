import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, SteamShortcutEntry } from '@shared/contracts'
import { SteamShortcutManager } from '../SteamShortcutManager'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const demoEntry: SteamShortcutEntry = {
  index: 0,
  appName: 'Demo Game',
  exe: '"/usr/bin/demo"',
  startDir: '',
  icon: '',
  shortcutPath: '',
  launchOptions: '',
  isHidden: false,
  allowDesktopConfig: true,
  allowOverlay: true,
  openVR: false,
  devkit: false,
  devkitGameId: '',
  devkitOverrideAppId: 0,
  lastPlayTime: 0,
  flatpakAppId: '',
  tags: []
}

function stubSteam(overrides: Partial<NdxBridge['steamShortcuts']> = {}): void {
  stubBridge({
    steamShortcuts: {
      listProfiles: vi
        .fn()
        .mockResolvedValue({ ok: true, data: [{ userId: '123', vdfPath: '/vdf/path' }] }),
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      listBackups: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      restoreBackup: vi.fn(),
      checkRunning: vi.fn().mockResolvedValue({ ok: true, data: 'not-running' }),
      ...overrides
    } as never
  })
}

describe('SteamShortcutManager', () => {
  it('shows an honest empty state when no Steam profile is found', async () => {
    stubBridge({
      steamShortcuts: {
        listProfiles: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    render(<SteamShortcutManager />)

    expect(await screen.findByText('No Steam profiles found')).toBeInTheDocument()
  })

  it('lists real existing shortcuts for the discovered profile', async () => {
    stubSteam({ list: vi.fn().mockResolvedValue({ ok: true, data: [demoEntry] }) })

    render(<SteamShortcutManager />)

    expect(await screen.findByText('Demo Game')).toBeInTheDocument()
  })

  it('warns when Steam is currently running', async () => {
    stubSteam({ checkRunning: vi.fn().mockResolvedValue({ ok: true, data: 'running' }) })

    render(<SteamShortcutManager />)

    expect(await screen.findByText(/Steam is currently running/)).toBeInTheDocument()
  })

  it('creates a real shortcut through the typed bridge', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: [demoEntry] })
    stubSteam({ create })
    const user = userEvent.setup()

    render(<SteamShortcutManager />)
    await user.click(await screen.findByRole('button', { name: 'Add Shortcut' }))
    await user.type(screen.getByPlaceholderText('Name'), 'New Game')
    await user.type(screen.getByPlaceholderText('Executable path'), '/usr/bin/new')
    await user.click(screen.getByRole('button', { name: 'Save Shortcut' }))

    expect(create).toHaveBeenCalledWith({
      vdfPath: '/vdf/path',
      appName: 'New Game',
      exe: '/usr/bin/new',
      startDir: '',
      launchOptions: ''
    })
  })

  it('removes a shortcut only after explicit confirmation', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: [] })
    stubSteam({ list: vi.fn().mockResolvedValue({ ok: true, data: [demoEntry] }), remove })
    const user = userEvent.setup()

    render(<SteamShortcutManager />)
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(remove).not.toHaveBeenCalled()

    const confirmButtons = screen.getAllByRole('button', { name: 'Remove' })
    await user.click(confirmButtons[confirmButtons.length - 1])

    expect(remove).toHaveBeenCalledWith({ vdfPath: '/vdf/path', index: 0 })
  })

  it('lists real backups and restores one only after explicit confirmation', async () => {
    const restoreBackup = vi.fn().mockResolvedValue({ ok: true, data: [] })
    stubSteam({
      listBackups: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ fileName: 'shortcuts-2026.vdf', createdAt: Date.now(), bytes: 100 }]
      }),
      restoreBackup
    })
    const user = userEvent.setup()

    render(<SteamShortcutManager />)
    await user.click(await screen.findByRole('button', { name: 'Restore' }))
    expect(restoreBackup).not.toHaveBeenCalled()

    await user.click(screen.getAllByRole('button', { name: 'Restore' })[1])

    expect(restoreBackup).toHaveBeenCalledWith({
      vdfPath: '/vdf/path',
      fileName: 'shortcuts-2026.vdf'
    })
  })
})
