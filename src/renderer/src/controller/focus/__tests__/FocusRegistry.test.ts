import { describe, expect, it, vi } from 'vitest'
import { FocusRegistry } from '../FocusRegistry'
import type { FocusNodeRegistration, FocusRect } from '../focusTypes'

function rect(left: number, top: number, width = 40, height = 40): FocusRect {
  return { left, top, right: left + width, bottom: top + height }
}

function makeNode(
  overrides: Partial<FocusNodeRegistration> & { id: string; groupId: string }
): FocusNodeRegistration {
  return {
    role: 'button',
    disabled: false,
    hidden: false,
    priority: 0,
    getRect: () => rect(0, 0),
    focusElement: vi.fn(),
    onActivate: vi.fn(),
    ...overrides
  }
}

describe('FocusRegistry', () => {
  it('never lands on document.body — move() before any focus picks an initial target', () => {
    const registry = new FocusRegistry()
    const a = makeNode({ id: 'a', groupId: 'g1', priority: 1 })
    registry.register(a)

    expect(registry.move('right')).toBe(true)
    expect(registry.getCurrentId()).toBe('a')
  })

  it('moves to the closest geometric candidate in the requested direction within the same group', () => {
    const registry = new FocusRegistry()
    const left = makeNode({ id: 'left', groupId: 'g1', getRect: () => rect(0, 0), priority: 1 })
    const rightNear = makeNode({ id: 'rightNear', groupId: 'g1', getRect: () => rect(100, 0) })
    const rightFar = makeNode({ id: 'rightFar', groupId: 'g1', getRect: () => rect(400, 0) })
    registry.register(left)
    registry.register(rightNear)
    registry.register(rightFar)

    registry.focus('left')
    registry.move('right')

    expect(registry.getCurrentId()).toBe('rightNear')
  })

  it('prefers an explicit neighbor over geometric search (spec §10.2 step 1)', () => {
    const registry = new FocusRegistry()
    const a = makeNode({
      id: 'a',
      groupId: 'g1',
      getRect: () => rect(0, 0),
      explicitNeighbors: { right: 'farAway' }
    })
    const near = makeNode({ id: 'near', groupId: 'g1', getRect: () => rect(50, 0) })
    const farAway = makeNode({ id: 'farAway', groupId: 'g1', getRect: () => rect(500, 0) })
    registry.register(a)
    registry.register(near)
    registry.register(farAway)

    registry.focus('a')
    registry.move('right')

    expect(registry.getCurrentId()).toBe('farAway')
  })

  it('falls through to a different group when no same-group candidate exists in that direction', () => {
    const registry = new FocusRegistry()
    const navItem = makeNode({ id: 'nav', groupId: 'nav-rail', getRect: () => rect(0, 0) })
    const content = makeNode({ id: 'content', groupId: 'content', getRect: () => rect(200, 0) })
    registry.register(navItem)
    registry.register(content)

    registry.focus('nav')
    registry.move('right')

    expect(registry.getCurrentId()).toBe('content')
  })

  it('skips disabled and hidden nodes', () => {
    const registry = new FocusRegistry()
    const a = makeNode({ id: 'a', groupId: 'g1', getRect: () => rect(0, 0) })
    const disabled = makeNode({
      id: 'disabled',
      groupId: 'g1',
      getRect: () => rect(100, 0),
      disabled: true
    })
    const visible = makeNode({ id: 'visible', groupId: 'g1', getRect: () => rect(200, 0) })
    registry.register(a)
    registry.register(disabled)
    registry.register(visible)

    registry.focus('a')
    registry.move('right')

    expect(registry.getCurrentId()).toBe('visible')
  })

  it('uses the registered fallback when no explicit/geometric candidate exists', () => {
    const registry = new FocusRegistry()
    const a = makeNode({
      id: 'a',
      groupId: 'g1',
      getRect: () => rect(0, 0),
      fallbackId: 'fallback'
    })
    const fallback = makeNode({ id: 'fallback', groupId: 'g1', getRect: () => rect(0, 0) })
    registry.register(a)
    registry.register(fallback)

    registry.focus('a')
    // Nothing exists to the left, so geometric search fails and the fallback should win.
    registry.move('left')

    expect(registry.getCurrentId()).toBe('fallback')
  })

  it('transfers focus to the nearest valid sibling when the focused node is removed (spec §5.2 rule 3)', async () => {
    const registry = new FocusRegistry()
    const a = makeNode({ id: 'a', groupId: 'g1', priority: 5 })
    const b = makeNode({ id: 'b', groupId: 'g1', priority: 1 })
    registry.register(a)
    registry.register(b)
    registry.focus('a')

    registry.unregister('a')
    // The reassignment is deferred to a microtask so that ref churn from
    // non-memoized ref-forwarding (e.g. react-router's Link) can cancel it
    // by re-registering the same id before this tick runs — see unregister().
    await Promise.resolve()

    expect(registry.getCurrentId()).toBe('b')
  })

  it('does not reassign focus when the node is re-registered before the microtask runs (ref-churn cancellation)', async () => {
    const registry = new FocusRegistry()
    const a = makeNode({ id: 'a', groupId: 'g1', priority: 5 })
    const b = makeNode({ id: 'b', groupId: 'g1', priority: 1 })
    registry.register(a)
    registry.register(b)
    registry.focus('a')

    registry.unregister('a')
    registry.register(a) // simulates a ref detach immediately followed by reattach
    await Promise.resolve()

    expect(registry.getCurrentId()).toBe('a')
  })

  it('traps focus to the allowed groups and restores the invoker on pop (spec §5.2 rules 2 and 8)', () => {
    const registry = new FocusRegistry()
    const background = makeNode({ id: 'background', groupId: 'shell', priority: 1 })
    const modalButton = makeNode({ id: 'modal-button', groupId: 'modal', priority: 1 })
    registry.register(background)
    registry.register(modalButton)
    registry.focus('background')

    registry.pushTrap(['modal'])
    expect(registry.getCurrentId()).toBe('modal-button')
    expect(registry.move('right')).toBe(false) // nothing else in the trapped group

    registry.popTrap()
    expect(registry.getCurrentId()).toBe('background')
  })

  it('notifies focus-change listeners', () => {
    const registry = new FocusRegistry()
    const a = makeNode({ id: 'a', groupId: 'g1' })
    registry.register(a)
    const listener = vi.fn()
    registry.onFocusChange(listener)

    registry.focus('a')

    expect(listener).toHaveBeenCalledWith('a')
  })

  it('calls onActivate/onContext/onAssist for the currently focused node', () => {
    const registry = new FocusRegistry()
    const a = makeNode({
      id: 'a',
      groupId: 'g1',
      onActivate: vi.fn(),
      onContext: vi.fn(),
      onAssist: vi.fn()
    })
    registry.register(a)
    registry.focus('a')

    registry.activate()
    registry.context()
    registry.assist()

    expect(a.onActivate).toHaveBeenCalledTimes(1)
    expect(a.onContext).toHaveBeenCalledTimes(1)
    expect(a.onAssist).toHaveBeenCalledTimes(1)
  })
})
