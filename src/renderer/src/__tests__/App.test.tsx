import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import App from '../App'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

beforeEach(() => {
  stubBridge({
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never,
    modelProviders: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never,
    controllerSettings: {
      get: vi.fn().mockResolvedValue({ ok: true, data: { hapticsIntensity: 'medium' } })
    } as never,
    system: {
      collectMetrics: vi.fn().mockResolvedValue({ ok: true, data: {} })
    } as never,
    power: {
      quitApp: vi.fn().mockResolvedValue({ ok: true, data: null })
    } as never,
    agentRuns: {
      onToolRequest: vi.fn().mockReturnValue(() => {})
    } as never
  })
})

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('App', () => {
  it('boots and then renders the shell', async () => {
    render(<App />)

    expect(screen.getByText('NeuroDeck')).toBeInTheDocument()
    expect(screen.getByText('Loading core services')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('renders a real, distinguishable icon for every primary nav destination', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    })
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const icons = nav.querySelectorAll('svg')
    const links = nav.querySelectorAll('a')
    const distinctIconShapes = new Set(Array.from(icons).map((icon) => icon.innerHTML))
    expect(icons.length).toBe(links.length)
    expect(icons.length).toBeGreaterThan(0)
    expect(distinctIconShapes.size).toBe(icons.length)
  })

  it('navigates between primary destinations', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('link', { name: /AI/i }))

    // AICommandCanvas (ND-013) is real now and requires an active workspace,
    // same as every other workspace-scoped screen — with none active here,
    // its honest empty state is what should render, not a fabricated title.
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })
})
