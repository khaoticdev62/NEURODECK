import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DiagnosticsInfo, NdxBridge } from '@shared/contracts'
import { AboutDiagnostics } from '../AboutDiagnostics'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleInfo: DiagnosticsInfo = {
  appVersion: '0.0.0',
  electronVersion: '39.0.0',
  chromeVersion: '128.0.0',
  nodeVersion: '22.0.0',
  platform: 'linux',
  arch: 'x64',
  license: 'Not specified',
  modelProviderNames: ['Local Ollama']
}

const diagnosticsBridge = {
  get: vi.fn().mockResolvedValue({ ok: true, data: sampleInfo }),
  listCrashReports: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  recordRendererCrashReport: vi.fn(),
  createSupportBundle: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      id: 'bundle-1',
      createdAt: '2026-06-28T12:00:00.000Z',
      path: '/tmp/ndx-support-bundle.json',
      byteSize: 512,
      sha256: 'a'.repeat(64),
      includes: ['diagnostics'],
      redactions: ['No provider API keys']
    }
  })
}

describe('AboutDiagnostics', () => {
  it('shows real diagnostics info', async () => {
    stubBridge({
      diagnostics: diagnosticsBridge as never
    })
    render(<AboutDiagnostics />)

    expect(await screen.findByText('0.0.0')).toBeInTheDocument()
    expect(screen.getByText('Local Ollama')).toBeInTheDocument()
  })

  it('shows a real error state when diagnostics fail', async () => {
    stubBridge({
      diagnostics: {
        get: vi.fn().mockResolvedValue({
          ok: false,
          error: { category: 'system', code: 'x', userMessage: 'Failed.' }
        }),
        listCrashReports: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })
    render(<AboutDiagnostics />)

    expect(await screen.findByText('Failed.')).toBeInTheDocument()
  })

  it('copies real diagnostics to the clipboard via the real export action', async () => {
    stubBridge({
      diagnostics: diagnosticsBridge as never,
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
    render(<AboutDiagnostics />)
    await screen.findByText('0.0.0')

    await user.click(screen.getByRole('button', { name: 'Copy diagnostics to clipboard' }))

    expect(await screen.findByText('Diagnostics copied to clipboard.')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('"appVersion": "0.0.0"')
  })

  it('creates a support bundle through the diagnostics bridge', async () => {
    const createSupportBundle = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'bundle-2',
        createdAt: '2026-06-28T12:00:00.000Z',
        path: '/tmp/ndx-support-bundle.json',
        byteSize: 512,
        sha256: 'b'.repeat(64),
        includes: ['diagnostics', 'systemMetrics'],
        redactions: ['No provider API keys', 'No workspace file contents']
      }
    })
    stubBridge({
      diagnostics: {
        get: vi.fn().mockResolvedValue({ ok: true, data: sampleInfo }),
        listCrashReports: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        createSupportBundle
      } as never
    })

    const user = userEvent.setup()
    render(<AboutDiagnostics />)
    await screen.findByText('0.0.0')

    await user.click(screen.getByRole('button', { name: 'Create support bundle' }))

    expect(createSupportBundle).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/Support bundle saved to/)).toHaveTextContent(
      '/tmp/ndx-support-bundle.json'
    )
  })

  it('shows recent local crash reports', async () => {
    stubBridge({
      diagnostics: {
        get: vi.fn().mockResolvedValue({ ok: true, data: sampleInfo }),
        createSupportBundle: vi.fn(),
        recordRendererCrashReport: vi.fn(),
        listCrashReports: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'crash-1',
              kind: 'renderer-error-boundary',
              createdAt: '2026-06-28T12:00:00.000Z',
              message: 'Render failed',
              code: 'TypeError',
              correlationId: 'corr-1',
              storedLocallyOnly: true
            }
          ]
        })
      } as never
    })

    render(<AboutDiagnostics />)

    expect(await screen.findByText('Render failed')).toBeInTheDocument()
    expect(screen.getByText('Correlation: corr-1')).toBeInTheDocument()
  })
})
