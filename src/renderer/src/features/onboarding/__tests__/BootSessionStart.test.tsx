import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { BootSessionStart } from '../BootSessionStart'
import { FirstRunWelcome } from '../FirstRunWelcome'
import { HomeCommandCenter } from '../../home/HomeCommandCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderBoot(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/boot" element={<BootSessionStart />} />
      <Route path="/onboarding/welcome" element={<FirstRunWelcome />} />
      <Route path="/" element={<HomeCommandCenter />} />
    </Routes>,
    { initialEntries: ['/boot'] }
  )
}

interface BridgeOptions {
  workspaces?: { id: string; name: string; rootPath: string; createdAt: number }[]
  providers?: { id: string; name: string }[]
  workspaceFails?: boolean
  /** When true, the workspace list call's promise rejects (e.g. a dropped IPC invoke) rather than resolving to an `{ ok: false }` result. */
  workspaceRejects?: boolean
  providerFails?: boolean
  controllerFails?: boolean
  metricsFails?: boolean
  /** When true, the workspace list call never resolves so the boot screen stays mounted. */
  hang?: boolean
}

function makeBridge(options: BridgeOptions = {}): Partial<NdxBridge> {
  const workspaces = options.workspaces ?? []
  const providers = options.providers ?? []
  return {
    workspaces: {
      list:
        options.workspaces === undefined && options.hang
          ? vi.fn(() => new Promise(() => {}))
          : options.workspaceRejects
            ? // `mockRejectedValue` pre-creates the rejected promise at setup
              // time rather than call time, which trips Node's unhandled-
              // rejection detector before the test ever awaits it. A factory
              // defers creation until the real call, the same as production.
              vi.fn(() => Promise.reject(new Error('No handler registered for workspace:list')))
            : options.workspaceFails
              ? vi.fn().mockResolvedValue({ ok: false, error: { userMessage: 'workspace error' } })
              : vi.fn().mockResolvedValue({ ok: true, data: workspaces })
    } as never,
    modelProviders: {
      list: options.providerFails
        ? vi.fn().mockResolvedValue({ ok: false, error: { userMessage: 'provider error' } })
        : vi.fn().mockResolvedValue({ ok: true, data: providers })
    } as never,
    controllerSettings: {
      get: options.controllerFails
        ? vi.fn().mockResolvedValue({ ok: false, error: { userMessage: 'controller error' } })
        : vi.fn().mockResolvedValue({ ok: true, data: { hapticsIntensity: 'medium' } })
    } as never,
    system: {
      collectMetrics: options.metricsFails
        ? vi.fn().mockResolvedValue({ ok: false, error: { userMessage: 'metrics error' } })
        : vi.fn().mockResolvedValue({ ok: true, data: {} })
    } as never,
    workflows: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never,
    workflowRuns: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never,
    agents: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never,
    agentRuns: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never,
    power: {
      quitApp: vi.fn().mockResolvedValue({ ok: true, data: null })
    } as never
  }
}

describe('BootSessionStart', () => {
  it('renders the boot brand and step list', () => {
    stubBridge(makeBridge({ hang: true }))
    renderBoot()
    expect(screen.getByText('NeuroDeck')).toBeInTheDocument()
    expect(screen.getByText('Loading core services')).toBeInTheDocument()
    expect(screen.getByText('Restoring workspace')).toBeInTheDocument()
    expect(screen.getByText('Checking model runtime')).toBeInTheDocument()
    expect(screen.getByText('Connecting controller')).toBeInTheDocument()
  })

  it('navigates to onboarding welcome when no workspaces or providers exist', async () => {
    stubBridge(makeBridge())
    renderBoot()

    await waitFor(() => {
      expect(screen.getByText('Controller-native AI')).toBeInTheDocument()
    })
  })

  it('navigates to home when at least one workspace exists', async () => {
    stubBridge(
      makeBridge({
        workspaces: [
          { id: 'w1', name: 'Project', rootPath: '/workspace/project', createdAt: Date.now() }
        ]
      })
    )
    renderBoot()

    await waitFor(() => {
      expect(screen.getByText('Active workspace: Project')).toBeInTheDocument()
    })
  })

  it('navigates to home when at least one provider exists', async () => {
    stubBridge(makeBridge({ providers: [{ id: 'p1', name: 'Local' }] }))
    renderBoot()

    await waitFor(() => {
      expect(screen.getByText('Create or discover a workspace')).toBeInTheDocument()
    })
  })

  it('degrades gracefully into the shell when workspace loading fails, rather than blocking boot', async () => {
    stubBridge(makeBridge({ workspaceFails: true }))
    renderBoot()

    // A failed workspace read is treated the same as the already-optional
    // model/controller checks — zero workspaces (real or because the read
    // failed) is a normal first-run state, not a fatal one. The user must
    // never be permanently walled out behind a "Boot failed" screen by a
    // single non-fatal store read failing, since Retry would just hit the
    // same failure again.
    await waitFor(() => {
      expect(screen.getByText('Controller-native AI')).toBeInTheDocument()
    })
    expect(screen.queryByText('Boot failed')).not.toBeInTheDocument()
  })

  it('degrades into the shell when the workspace IPC call rejects, instead of silently stalling boot', async () => {
    // A rejected promise (e.g. a dropped IPC invoke) is a different failure
    // shape than a resolved `{ ok: false }` result — `runStep` used to have
    // no try/catch around this, so a rejection propagated out of `runBoot`'s
    // unguarded body and silently aborted the rest of the boot sequence with
    // no further state updates, leaving "Restoring workspace" stuck on
    // "running" until the unrelated 15s global timeout.
    stubBridge(makeBridge({ workspaceRejects: true }))
    renderBoot()

    await waitFor(() => {
      expect(screen.getByText('Controller-native AI')).toBeInTheDocument()
    })
    expect(screen.queryByText('Boot failed')).not.toBeInTheDocument()
  })

  it('offers Return to SteamOS during boot', async () => {
    stubBridge(makeBridge({ hang: true }))
    renderBoot()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Return to SteamOS' }))

    expect(window.ndx?.power?.quitApp).toHaveBeenCalled()
  })

  it('toggles detailed status on Show details', async () => {
    stubBridge(makeBridge({ hang: true }))
    renderBoot()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Show details' }))

    expect(screen.getByText('Details')).toBeInTheDocument()
  })
})
