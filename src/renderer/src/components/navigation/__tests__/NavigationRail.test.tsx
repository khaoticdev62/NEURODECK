import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FeatureState, NdxBridge } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ToastProvider } from '../../overlays/Toast'
import { NavigationRail } from '../NavigationRail'

function stubBridge(states: FeatureState[]): void {
  window.ndx = {
    features: { list: vi.fn().mockResolvedValue({ ok: true, data: states }) }
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderRail(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <MemoryRouter>
          <NavigationRail />
        </MemoryRouter>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('NavigationRail', () => {
  it('shows every destination when the real Feature Registry reports them all visible', async () => {
    stubBridge(
      [
        'home',
        'search',
        'ai',
        'workspaces',
        'build',
        'files',
        'terminal',
        'browser',
        'automations',
        'models',
        'learn',
        'system'
      ].map((id) => ({
        descriptor: {
          id,
          route: '/',
          name: id,
          capabilityDependencies: [],
          permissionRequirements: [],
          profileVisibility: []
        },
        visibility: 'visible'
      }))
    )

    renderRail()

    expect(await screen.findByLabelText('Terminal')).toBeInTheDocument()
    expect(screen.getByLabelText('Browser')).toBeInTheDocument()
  })

  it('hides a destination the real Feature Registry reports as hidden', async () => {
    stubBridge([
      {
        descriptor: {
          id: 'home',
          route: '/',
          name: 'Home',
          capabilityDependencies: [],
          permissionRequirements: [],
          profileVisibility: []
        },
        visibility: 'visible'
      },
      {
        descriptor: {
          id: 'browser',
          route: '/browser',
          name: 'Browser',
          capabilityDependencies: [],
          permissionRequirements: [],
          profileVisibility: []
        },
        visibility: 'hidden',
        reason: 'Test: forced hidden'
      }
    ])

    renderRail()

    expect(await screen.findByLabelText('Home')).toBeInTheDocument()
    expect(screen.queryByLabelText('Browser')).not.toBeInTheDocument()
  })

  it('fails open and shows every destination before the Feature Registry has responded', () => {
    window.ndx = {
      features: { list: vi.fn(() => new Promise(() => undefined)) }
    } as unknown as NdxBridge

    renderRail()

    expect(screen.getByLabelText('Terminal')).toBeInTheDocument()
  })
})
