import { findGeometricCandidate } from './focusGeometry'
import type { Direction, FocusNodeRegistration } from './focusTypes'

/**
 * Spatial Focus Engine registry (wireframe §5, mega-prompt §10). Implements
 * the deterministic directional-navigation priority order from §10.2:
 *
 * 1. Explicit neighbor
 * 2. Valid node in the same focus group (geometric, scoped)
 * 3. Geometric candidate in requested direction (broader, all groups)
 * 4. Registered fallback
 * 5. Last known valid focus (no-op — stay put)
 * 6. Screen initial focus
 *
 * "Group-level transition" (spec step 4) is folded into step 3's broader
 * search rather than implemented as a separate heuristic — documented as a
 * deliberate scope simplification in the Epic 2 ledger entry, not silently
 * skipped.
 */
export class FocusRegistry {
  private nodes = new Map<string, FocusNodeRegistration>()
  private currentId: string | null = null
  private lastFocusedByGroup = new Map<string, string>()
  private modalTrapStack: Array<{ allowedGroupIds: Set<string>; previousFocusId: string | null }> =
    []
  private focusChangeListeners = new Set<(id: string | null) => void>()

  /** Lets React (or any consumer) re-render when the focused node changes. */
  onFocusChange(listener: (id: string | null) => void): () => void {
    this.focusChangeListeners.add(listener)
    return () => this.focusChangeListeners.delete(listener)
  }

  private notifyFocusChange(): void {
    this.focusChangeListeners.forEach((listener) => listener(this.currentId))
  }

  register(node: FocusNodeRegistration): void {
    this.nodes.set(node.id, node)
  }

  /**
   * Several real `ref`-forwarding implementations (e.g. react-router's
   * `Link`, which builds a fresh `mergeRefs()` closure on every render)
   * detach and reattach the DOM ref on every re-render even when the
   * underlying element never changes. Reacting to that detach as a real
   * removal — reassigning focus immediately — causes the reassignment's own
   * state update to re-render the *next* node, whose ref then churns the
   * same way, cascading forever. Deferring the "is this still gone" check to
   * a microtask lets the synchronous re-registration that follows ref churn
   * cancel the removal before it has any effect.
   */
  unregister(id: string): void {
    this.nodes.delete(id)
    if (this.currentId !== id) return

    queueMicrotask(() => {
      if (this.nodes.has(id)) return // re-registered before the microtask ran — just ref churn.
      if (this.currentId !== id) return // focus already moved on for an unrelated reason.

      // Rule: removing a focused element transfers focus to the nearest valid sibling.
      this.currentId = null
      const next = this.resolveInitial()
      if (next) {
        this.focus(next)
      } else {
        this.notifyFocusChange()
      }
    })
  }

  getCurrentId(): string | null {
    return this.currentId
  }

  private isFocusable(node: FocusNodeRegistration): boolean {
    if (node.disabled || node.hidden) return false
    if (this.modalTrapStack.length > 0) {
      const trap = this.modalTrapStack[this.modalTrapStack.length - 1]
      return trap.allowedGroupIds.has(node.groupId)
    }
    return true
  }

  private focusableNodes(): FocusNodeRegistration[] {
    return [...this.nodes.values()].filter((node) => this.isFocusable(node))
  }

  private resolveInitial(groupId?: string): string | null {
    const pool = this.focusableNodes().filter((node) => !groupId || node.groupId === groupId)
    if (pool.length === 0) return null
    return pool.reduce((best, node) => (node.priority > best.priority ? node : best)).id
  }

  /** Focus never lands on document.body — callers get null if nothing focusable exists. */
  focus(id: string): boolean {
    const node = this.nodes.get(id)
    if (!node || !this.isFocusable(node)) return false
    this.currentId = id
    this.lastFocusedByGroup.set(node.groupId, id)
    node.focusElement()
    this.notifyFocusChange()
    return true
  }

  /** Pushes a modal focus trap restricted to the given group IDs (spec §5.2 rule 8). */
  pushTrap(allowedGroupIds: string[]): void {
    this.modalTrapStack.push({
      allowedGroupIds: new Set(allowedGroupIds),
      previousFocusId: this.currentId
    })
    const initial = this.resolveInitial(allowedGroupIds[0])
    if (initial) this.focus(initial)
  }

  /** Pops the trap and restores focus to the invoking element (spec §5.2 rule 2). */
  popTrap(): void {
    const trap = this.modalTrapStack.pop()
    if (trap?.previousFocusId && this.nodes.has(trap.previousFocusId)) {
      this.focus(trap.previousFocusId)
    }
  }

  move(direction: Direction): boolean {
    const current = this.currentId ? this.nodes.get(this.currentId) : null
    if (!current) {
      const initial = this.resolveInitial()
      return initial ? this.focus(initial) : false
    }

    const explicitId = current.explicitNeighbors?.[direction]
    if (explicitId) {
      const target = this.nodes.get(explicitId)
      if (target && this.isFocusable(target)) return this.focus(explicitId)
    }

    const pool = this.focusableNodes().filter((node) => node.id !== current.id)
    const currentRect = current.getRect()

    const sameGroupCandidates = pool
      .filter((node) => node.groupId === current.groupId)
      .map((node) => ({ id: node.id, rect: node.getRect() }))
    const sameGroupMatch = findGeometricCandidate(currentRect, sameGroupCandidates, direction)
    if (sameGroupMatch) return this.focus(sameGroupMatch.id)

    const allCandidates = pool.map((node) => ({ id: node.id, rect: node.getRect() }))
    const broadMatch = findGeometricCandidate(currentRect, allCandidates, direction)
    if (broadMatch) return this.focus(broadMatch.id)

    if (current.fallbackId) {
      const fallback = this.nodes.get(current.fallbackId)
      if (fallback && this.isFocusable(fallback)) return this.focus(current.fallbackId)
    }

    // Last known valid focus / screen initial focus: nothing better found, stay put.
    return false
  }

  activate(): void {
    if (this.currentId) this.nodes.get(this.currentId)?.onActivate()
  }

  context(): void {
    if (this.currentId) this.nodes.get(this.currentId)?.onContext?.()
  }

  assist(): void {
    if (this.currentId) this.nodes.get(this.currentId)?.onAssist?.()
  }

  /** Debug-overlay support (mega-prompt §10.3) — current registry contents, not for feature use. */
  debugSnapshot(): {
    currentId: string | null
    nodes: Array<{
      id: string
      groupId: string
      disabled: boolean
      hidden: boolean
      priority: number
    }>
    trapDepth: number
  } {
    return {
      currentId: this.currentId,
      nodes: [...this.nodes.values()].map((node) => ({
        id: node.id,
        groupId: node.groupId,
        disabled: node.disabled,
        hidden: node.hidden,
        priority: node.priority
      })),
      trapDepth: this.modalTrapStack.length
    }
  }
}
