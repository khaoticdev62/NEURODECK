import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationRecord, NdxBridge, TransactionRecord } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { ApplicationCenter } from '../ApplicationCenter'

function appRecord(overrides: Partial<ApplicationRecord> = {}): ApplicationRecord {
  const now = 1_735_000_000_000
  return {
    id: 'app-1',
    source: 'flatpak',
    name: 'Demo App',
    executableRef: 'org.demo.App',
    launchArguments: ['--deck'],
    categories: ['Utility'],
    installed: true,
    workspaceIds: [],
    launchMode: 'external',
    capabilityRequirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

function transaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'tx-1',
    kind: 'package-install',
    label: 'Install org.demo.App',
    status: 'running',
    progressPercent: 0,
    cancellable: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function stubApplicationCenter(
  overrides: {
    applications?: Partial<NdxBridge['applications']>
    packages?: Partial<NdxBridge['packages']>
  } = {}
): void {
  stubBridge({
    applications: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [appRecord()] }),
      discover: vi.fn().mockResolvedValue({ ok: true, data: [appRecord({ id: 'discovered' })] }),
      launch: vi.fn().mockResolvedValue({ ok: true, data: { launched: true } }),
      remove: vi.fn().mockResolvedValue({ ok: true, data: null }),
      registerAppImage: vi
        .fn()
        .mockResolvedValue({ ok: true, data: appRecord({ id: 'appimage' }) }),
      upsert: vi.fn(),
      ...overrides.applications
    } as never,
    packages: {
      flatpakSearch: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ ref: 'org.remote.App', name: 'Remote Demo', remote: 'flathub', version: '1.0' }]
      }),
      flatpakPermissions: vi.fn().mockResolvedValue({
        ok: true,
        data: { ref: 'org.remote.App', permissions: ['filesystem=home'] }
      }),
      flatpakInstall: vi.fn().mockResolvedValue({
        ok: true,
        data: transaction({ label: 'Install org.remote.App' })
      }),
      flatpakUpdate: vi
        .fn()
        .mockResolvedValue({ ok: true, data: transaction({ kind: 'package-update' }) }),
      flatpakUninstall: vi
        .fn()
        .mockResolvedValue({ ok: true, data: transaction({ kind: 'package-uninstall' }) }),
      listTransactions: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      cancelTransaction: vi.fn(),
      onTransactionUpdate: vi.fn().mockReturnValue(() => undefined),
      ...overrides.packages
    } as never
  })
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('ApplicationCenter', () => {
  it('lists real registered applications and launches through typed IPC', async () => {
    const launch = vi.fn().mockResolvedValue({ ok: true, data: { launched: true } })
    stubApplicationCenter({ applications: { launch } })
    const user = userEvent.setup()

    renderWithProviders(<ApplicationCenter />)

    expect((await screen.findAllByText('Demo App')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Launch' }))

    expect(launch).toHaveBeenCalledWith({ id: 'app-1' })
  })

  it('runs real discovery and replaces the application list with discovered records', async () => {
    stubApplicationCenter()
    const user = userEvent.setup()

    renderWithProviders(<ApplicationCenter />)
    await user.click(await screen.findByRole('button', { name: 'Discover' }))

    expect(await screen.findByText('Discovered 1 application records.')).toBeInTheDocument()
    expect(screen.getAllByText('org.demo.App').length).toBeGreaterThan(0)
  })

  it('searches Flatpak remotes, previews permissions, and starts install transactions', async () => {
    const flatpakInstall = vi.fn().mockResolvedValue({
      ok: true,
      data: transaction({ label: 'Install org.remote.App' })
    })
    stubApplicationCenter({ packages: { flatpakInstall } })
    const user = userEvent.setup()

    renderWithProviders(<ApplicationCenter />)
    await user.type(
      await screen.findByPlaceholderText('Search Flathub or configured remotes'),
      'demo'
    )
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('button', { name: /Remote Demo/ }))
    await user.click(screen.getByRole('button', { name: 'Install Flatpak' }))

    expect(await screen.findByText('filesystem=home')).toBeInTheDocument()
    await waitFor(() => expect(flatpakInstall).toHaveBeenCalledWith({ ref: 'org.remote.App' }))
    expect(await screen.findByText('Install org.remote.App: running.')).toBeInTheDocument()
  })

  it('subscribes to live package transaction updates', async () => {
    let listener: ((transactions: TransactionRecord[]) => void) | undefined
    stubApplicationCenter({
      packages: {
        onTransactionUpdate: vi.fn((nextListener) => {
          listener = nextListener
          return () => undefined
        }) as never
      }
    })

    renderWithProviders(<ApplicationCenter />)
    await screen.findAllByText('Demo App')

    listener?.([transaction({ status: 'succeeded', progressPercent: 100 })])

    expect(await screen.findByText('Install org.demo.App')).toBeInTheDocument()
    expect(screen.getByText('succeeded')).toBeInTheDocument()
  })
})
