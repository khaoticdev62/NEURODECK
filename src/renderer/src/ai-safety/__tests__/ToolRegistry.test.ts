import { describe, expect, it, vi } from 'vitest'
import { ToolRegistry } from '../ToolRegistry'

describe('ToolRegistry', () => {
  it('returns undefined for an unregistered tool id', () => {
    const registry = new ToolRegistry()
    expect(registry.get('does-not-exist')).toBeUndefined()
  })

  it('registers and retrieves a tool by id', () => {
    const registry = new ToolRegistry()
    const run = vi.fn().mockResolvedValue({ success: true, message: 'ok' })
    registry.register({
      id: 'demo-tool',
      title: 'Demo Tool',
      description: 'A test tool',
      requiredCapability: 'system.changeSettings',
      risk: 'low',
      reversible: true,
      run
    })

    expect(registry.get('demo-tool')?.title).toBe('Demo Tool')
  })

  it('lists all registered tools', () => {
    const registry = new ToolRegistry()
    registry.register({
      id: 'a',
      title: 'A',
      description: '',
      requiredCapability: 'system.changeSettings',
      risk: 'low',
      reversible: true,
      run: vi.fn()
    })
    registry.register({
      id: 'b',
      title: 'B',
      description: '',
      requiredCapability: 'system.readMetrics',
      risk: 'low',
      reversible: true,
      run: vi.fn()
    })

    expect(registry.list().map((t) => t.id)).toEqual(['a', 'b'])
  })
})
