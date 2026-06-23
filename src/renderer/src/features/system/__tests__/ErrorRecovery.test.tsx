import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import type { DiagnosticsInfo, NdxBridge } from '@shared/contracts'
import { ErrorRecovery, ErrorRecoveryContent } from '../ErrorRecovery'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ToastProvider } from '../../../components/overlays/Toast'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderContent(element: ReactElement): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>{element}</FocusEngineProvider>
    </ToastProvider>
  )
}

const sampleError = {
  code: 'WORKSPACE_LOAD_FAILED',
  category: 'system' as const,
  userMessage: 'Could not load the selected workspace.',
  retryable: true,
  correlationId: 'corr-123',
  affectedFeature: 'Workspace hub',
  whatStillWorks: 'Navigation and other workspaces still work.',
  details: { workspaceId: 'ws-1' },
  recoveryActions: [
    { kind: 'navigate' as const, label: 'Return home', to: '/' },
    { kind: 'export-diagnostics' as const, label: 'Export diagnostics' },
    { kind: 'quit' as const, label: 'Quit' }
  ]
}

const sampleInfo: DiagnosticsInfo = {
  appVersion: '0.0.0',
  electronVersion: '39.0.0',
  chromeVersion: '128.0.0',
  nodeVersion: '22.0.0',
  platform: 'linux',
  arch: 'x64',
  license: 'Not specified',
  modelProviderNames: []
}

beforeEach(() => {
  stubBridge({
    workspaces: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
  })
})

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('ErrorRecovery', () => {
  it('renders error details from location state', () => {
    renderWithProviders(<ErrorRecovery />, {
      initialEntries: [{ pathname: '/error-recovery', state: { error: sampleError } }]
    })

    expect(screen.getByText('Could not load the selected workspace.')).toBeInTheDocument()
    expect(screen.getByText(/WORKSPACE_LOAD_FAILED/)).toBeInTheDocument()
    expect(screen.getByText(/Workspace hub/)).toBeInTheDocument()
    expect(screen.getByText(/corr-123/)).toBeInTheDocument()
    expect(screen.getByText('Navigation and other workspaces still work.')).toBeInTheDocument()
  })

  it('renders the empty state when no error payload is present', () => {
    renderWithProviders(<ErrorRecovery />)
    expect(screen.getByText('No error details')).toBeInTheDocument()
  })

  it('navigates to the target route when a navigate action is activated', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderContent(
      <ErrorRecoveryContent error={sampleError} onNavigate={onNavigate} onQuit={() => undefined} />
    )

    await user.click(screen.getByRole('button', { name: 'Return home' }))

    expect(onNavigate).toHaveBeenCalledWith('/')
  })

  it('exports diagnostics to the clipboard', async () => {
    stubBridge({
      workspaces: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never,
      diagnostics: { get: vi.fn().mockResolvedValue({ ok: true, data: sampleInfo }) } as never,
      system: {
        collectMetrics: vi.fn().mockResolvedValue({
          ok: false,
          error: { category: 'system', code: 'x', userMessage: 'n/a' }
        })
      } as never
    })

    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderWithProviders(<ErrorRecovery />, {
      initialEntries: [{ pathname: '/error-recovery', state: { error: sampleError } }]
    })

    await user.click(screen.getByRole('button', { name: 'Export diagnostics' }))

    expect(await screen.findByText('Diagnostics copied to clipboard.')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('WORKSPACE_LOAD_FAILED')
  })

  it('calls the quit callback when quit is activated', async () => {
    stubBridge({
      workspaces: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never,
      power: { quitApp: vi.fn().mockResolvedValue({ ok: true, data: null }) } as never
    })

    const user = userEvent.setup()
    renderWithProviders(<ErrorRecovery />, {
      initialEntries: [{ pathname: '/error-recovery', state: { error: sampleError } }]
    })

    await user.click(screen.getByRole('button', { name: 'Quit' }))

    await waitFor(() => {
      expect(window.ndx?.power?.quitApp).toHaveBeenCalled()
    })
  })

  it('runs retry callback when provided in content mode', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    renderContent(
      <ErrorRecoveryContent
        error={{
          ...sampleError,
          recoveryActions: [{ kind: 'retry' as const, label: 'Try again', run: retry }]
        }}
        onNavigate={() => undefined}
        onQuit={() => undefined}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
  })
})
