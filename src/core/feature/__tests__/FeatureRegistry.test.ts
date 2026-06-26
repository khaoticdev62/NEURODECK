import { describe, expect, it } from 'vitest'
import type { CapabilityState, FeatureDescriptor } from '@shared/contracts'
import { FeatureRegistry } from '../FeatureRegistry'

const baseDescriptor: FeatureDescriptor = {
  id: 'demo',
  route: '/demo',
  name: 'Demo',
  capabilityDependencies: [],
  permissionRequirements: [],
  profileVisibility: []
}

function capability(overrides: Partial<CapabilityState>): CapabilityState {
  return {
    id: 'bluetooth',
    status: 'available',
    reason: 'test',
    remediation: [],
    lastCheckedAt: Date.now(),
    ...overrides
  }
}

describe('FeatureRegistry', () => {
  it('is visible when it has no dependencies at all', () => {
    const registry = new FeatureRegistry([baseDescriptor])
    const [state] = registry.list({ capabilities: [] })
    expect(state.visibility).toBe('visible')
  })

  it('hides a feature whose required capability is unsupported', () => {
    const registry = new FeatureRegistry([
      { ...baseDescriptor, capabilityDependencies: ['bluetooth'] }
    ])
    const [state] = registry.list({
      capabilities: [capability({ status: 'unsupported' })]
    })
    expect(state.visibility).toBe('hidden')
    expect(state.reason).toMatch(/unsupported/)
  })

  it('disables (does not hide) a feature whose capability needs permission or a dependency', () => {
    const registry = new FeatureRegistry([
      { ...baseDescriptor, capabilityDependencies: ['bluetooth'] }
    ])
    const [state] = registry.list({
      capabilities: [capability({ status: 'permission-required' })]
    })
    expect(state.visibility).toBe('disabled')
  })

  it('treats a capability the registry has not checked yet as dependency-required, never silently visible', () => {
    const registry = new FeatureRegistry([
      { ...baseDescriptor, capabilityDependencies: ['bluetooth'] }
    ])
    const [state] = registry.list({ capabilities: [] })
    expect(state.visibility).toBe('disabled')
  })

  it('hides everything when Safe Mode is active', () => {
    const registry = new FeatureRegistry([baseDescriptor])
    const [state] = registry.list({ capabilities: [], safeModeActive: true })
    expect(state.visibility).toBe('hidden')
    expect(state.reason).toMatch(/Safe Mode/)
  })

  it('hides a feature owned by a disabled extension', () => {
    const registry = new FeatureRegistry([{ ...baseDescriptor, extensionOwnerId: 'ext-1' }])
    const [state] = registry.list({
      capabilities: [],
      enabledExtensionIds: new Set(['ext-2'])
    })
    expect(state.visibility).toBe('hidden')
    expect(state.reason).toMatch(/extension/)
  })

  it('hides a profile-scoped feature when the active profile is not in its visibility list', () => {
    const registry = new FeatureRegistry([{ ...baseDescriptor, profileVisibility: ['work'] }])
    const [state] = registry.list({ capabilities: [], activeProfileId: 'personal' })
    expect(state.visibility).toBe('hidden')
  })
})
