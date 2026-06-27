import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ExtensionHealthEvent,
  ExtensionInstallPreview,
  ExtensionRecord,
  NdxBridge
} from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ExtensionManager } from '../ExtensionManager'

let healthListener: ((event: ExtensionHealthEvent) => void) | undefined

function sampleExtension(overrides: Partial<ExtensionRecord> = {}): ExtensionRecord {
  return {
    manifest: {
      schemaVersion: '1.0.0',
      id: 'ext.demo',
      name: 'Demo Extension',
      version: '1.2.3',
      publisher: 'NeuroDeck Labs',
      description: 'Adds a tested extension capability.',
      type: 'command',
      entrypoints: { main: 'dist/index.js' },
      capabilities: [
        { capability: 'show-notification', reason: 'Shows completion alerts.' },
        { capability: 'store-extension-data', reason: 'Persists extension preferences.' }
      ],
      minimumNdxVersion: '0.1.0',
      supportedPlatforms: ['linux']
    },
    installPath: 'C:\\extensions\\demo',
    state: 'installed',
    trust: 'unsigned',
    grantedCapabilities: ['show-notification'],
    faultCount: 0,
    installedAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

function samplePreview(): ExtensionInstallPreview {
  const record = sampleExtension()
  return {
    directoryPath: 'C:\\extensions\\demo',
    manifest: record.manifest,
    trust: record.trust,
    requestedCapabilities: record.manifest.capabilities
  }
}

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderScreen(): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <ExtensionManager />
    </FocusEngineProvider>
  )
}

afterEach(() => {
  healthListener = undefined
  // @ts-expect-error test-only cleanup of preload global
  delete window.ndx
})

describe('ExtensionManager', () => {
  it('shows the honest empty state when no extensions are installed', async () => {
    stubBridge({
      extensions: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        onHealthEvent: vi.fn((listener) => {
          healthListener = listener
          return () => undefined
        })
      } as never
    })

    renderScreen()

    expect(await screen.findByText('No extensions installed')).toBeInTheDocument()
    expect(screen.getByText(/Local unpacked extensions only/)).toBeInTheDocument()
  })

  it('reviews a local unpacked folder before installing selected capability grants', async () => {
    const installed = sampleExtension({ grantedCapabilities: ['show-notification'] })
    const previewInstall = vi.fn().mockResolvedValue({ ok: true, data: samplePreview() })
    const install = vi.fn().mockResolvedValue({ ok: true, data: installed })
    stubBridge({
      extensions: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        previewInstall,
        install,
        onHealthEvent: vi.fn(() => () => undefined)
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('No extensions installed')

    await user.type(
      screen.getByPlaceholderText('Absolute unpacked extension folder'),
      'C:\\extensions\\demo'
    )
    await user.click(screen.getByRole('button', { name: 'Review local folder' }))
    expect(previewInstall).toHaveBeenCalledWith({ directoryPath: 'C:\\extensions\\demo' })
    expect(await screen.findByText('Capability review')).toBeInTheDocument()
    expect(screen.getByText(/denied by default/)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Grant' })[0])
    await user.click(screen.getByRole('button', { name: 'Install reviewed extension' }))

    expect(install).toHaveBeenCalledWith({
      directoryPath: 'C:\\extensions\\demo',
      approvedCapabilities: ['show-notification']
    })
    expect(await screen.findAllByText('Demo Extension')).toHaveLength(2)
    expect(screen.getAllByText('Granted')).toHaveLength(1)
    expect(screen.getAllByText('Denied')).toHaveLength(1)
  })

  it('surfaces preview failures without installing the extension', async () => {
    const previewInstall = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        kind: 'validation',
        code: 'extension-preview-failed',
        userMessage: 'Missing ndx.extension.json.'
      }
    })
    const install = vi.fn()
    stubBridge({
      extensions: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        previewInstall,
        install,
        onHealthEvent: vi.fn(() => () => undefined)
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('No extensions installed')

    await user.type(
      screen.getByPlaceholderText('Absolute unpacked extension folder'),
      'C:\\extensions\\broken'
    )
    await user.click(screen.getByRole('button', { name: 'Review local folder' }))

    expect(await screen.findByText('Missing ndx.extension.json.')).toBeInTheDocument()
    expect(install).not.toHaveBeenCalled()
  })

  it('toggles an installed extension through the real IPC client', async () => {
    const enabled = sampleExtension({ state: 'enabled' })
    const setEnabled = vi.fn().mockResolvedValue({ ok: true, data: enabled })
    stubBridge({
      extensions: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleExtension()] }),
        setEnabled,
        onHealthEvent: vi.fn(() => () => undefined)
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    expect(await screen.findAllByText('Demo Extension')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Enable' }))

    expect(setEnabled).toHaveBeenCalledWith({ id: 'ext.demo', enabled: true })
    expect(await screen.findAllByText('enabled')).toHaveLength(2)
  })

  it('clears quarantine before the extension can be re-enabled', async () => {
    const quarantined = sampleExtension({
      state: 'quarantined',
      faultCount: 4,
      quarantineReason: 'Crashed repeatedly.'
    })
    const cleared = sampleExtension({ state: 'disabled', faultCount: 0 })
    const clearQuarantine = vi.fn().mockResolvedValue({ ok: true, data: cleared })
    stubBridge({
      extensions: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [quarantined] }),
        clearQuarantine,
        onHealthEvent: vi.fn(() => () => undefined)
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    expect(await screen.findByText('Crashed repeatedly.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear quarantine' }))

    expect(clearQuarantine).toHaveBeenCalledWith({ id: 'ext.demo' })
    expect(await screen.findAllByText('disabled')).toHaveLength(2)
  })

  it('applies live health events from the extension runtime', async () => {
    stubBridge({
      extensions: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleExtension()] }),
        onHealthEvent: vi.fn((listener) => {
          healthListener = listener
          return () => undefined
        })
      } as never
    })

    renderScreen()
    expect(await screen.findAllByText('Demo Extension')).toHaveLength(2)

    act(() => {
      healthListener?.({
        id: 'ext.demo',
        state: 'quarantined',
        faultCount: 3,
        quarantineReason: 'Fault threshold exceeded.'
      })
    })

    expect(await screen.findByText('Fault threshold exceeded.')).toBeInTheDocument()
    expect(screen.getAllByText('quarantined')).toHaveLength(2)
  })
})
