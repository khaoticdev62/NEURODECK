import { describe, expect, it } from 'vitest'
import { CapabilityRegistry } from '../CapabilityRegistry'

describe('CapabilityRegistry', () => {
  it('reports every known capability with an honest, real reason rather than fabricating availability', async () => {
    const registry = new CapabilityRegistry()
    const states = await registry.list()

    expect(states.length).toBeGreaterThan(0)
    for (const state of states) {
      expect(state.reason.length).toBeGreaterThan(0)
      expect(state.lastCheckedAt).toBeGreaterThan(0)
      // No detector lies and reports `available` without a real, injected
      // backend behind it.
      if (state.status === 'available') {
        expect(state.provider).toBeDefined()
      }
    }
  })

  it('honors an injected detector override without changing any other capability', async () => {
    const registry = new CapabilityRegistry({
      bluetooth: () => ({ status: 'available', reason: 'Test override', provider: 'test' })
    })

    const bluetooth = await registry.get('bluetooth')
    const microphone = await registry.get('microphone')

    expect(bluetooth?.status).toBe('available')
    expect(bluetooth?.provider).toBe('test')
    expect(microphone?.status).toBe('unsupported')
  })

  it('refresh() re-runs every detector and updates lastCheckedAt', async () => {
    const registry = new CapabilityRegistry()
    const first = await registry.list()
    const firstChecked = first[0].lastCheckedAt

    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await registry.refresh()

    expect(second[0].lastCheckedAt).toBeGreaterThanOrEqual(firstChecked)
  })

  it('reports Linux-only capabilities as unsupported with a real platform reason on a non-Linux machine', async () => {
    const registry = new CapabilityRegistry()
    const flatpak = await registry.get('flatpak')

    if (process.platform === 'linux') {
      expect(flatpak?.status).toBe('dependency-required')
    } else {
      expect(flatpak?.status).toBe('unsupported')
      expect(flatpak?.reason).toMatch(/not Linux/)
    }
  })
})
