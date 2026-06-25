import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useFocusable } from '../../controller/focus/useFocusable'

export interface PaneGroupProps {
  /** Focus-group namespace prefix for the divider node — keep unique per `PaneGroup` instance on screen. */
  id: string
  orientation: 'horizontal' | 'vertical'
  first: ReactNode
  second: ReactNode
  /** Fraction (0..1) the first pane occupies. */
  initialSplit?: number
  minSplit?: number
  maxSplit?: number
  onSplitChange?: (split: number) => void
}

const STEP = 0.02

/**
 * Real, minimal two-pane resizable primitive (wireframe §Universal Terminal
 * "Split mode: two equal or weighted panes") — no nested pane tree, no
 * layout persistence. The divider is a real `useFocusable` node (role
 * `slider`) so it's reachable via the Spatial Focus Engine like any other
 * control; its own Arrow-key value adjustment is handled locally rather
 * than routed through `FocusRegistry.move()`, since nudging a slider's
 * value is a different concern from changing which node has focus —
 * reusing `move()` for both would conflate them.
 */
export function PaneGroup({
  id,
  orientation,
  first,
  second,
  initialSplit = 0.5,
  minSplit = 0.2,
  maxSplit = 0.8,
  onSplitChange
}: PaneGroupProps): React.JSX.Element {
  const [split, setSplit] = useState(initialSplit)
  const draggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const clamp = useCallback(
    (value: number) => Math.min(maxSplit, Math.max(minSplit, value)),
    [minSplit, maxSplit]
  )

  const applySplit = useCallback(
    (next: number) => {
      const clamped = clamp(next)
      setSplit(clamped)
      onSplitChange?.(clamped)
    },
    [clamp, onSplitChange]
  )

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const fraction =
        orientation === 'horizontal'
          ? (clientX - rect.left) / rect.width
          : (clientY - rect.top) / rect.height
      applySplit(fraction)
    },
    [orientation, applySplit]
  )

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    // Not implemented in jsdom's test environment; real browsers always
    // support it on a real pointer-event target, but guard anyway rather
    // than assume.
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      updateFromPointer(event.clientX, event.clientY)
    },
    [updateFromPointer]
  )

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const decreaseKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
      const increaseKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
      if (event.key === decreaseKey) {
        event.preventDefault()
        applySplit(split - STEP)
      } else if (event.key === increaseKey) {
        event.preventDefault()
        applySplit(split + STEP)
      }
    },
    [orientation, split, applySplit]
  )

  const { ref: dividerRef } = useFocusable<HTMLDivElement>({
    id: `${id}-divider`,
    groupId: `${id}-divider`,
    role: 'slider',
    onActivate: () => {
      // A divider has no "open" action — Activate is a no-op.
    }
  })

  const template =
    orientation === 'horizontal'
      ? { gridTemplateColumns: `${split * 100}% 6px ${(1 - split) * 100}%` }
      : { gridTemplateRows: `${split * 100}% 6px ${(1 - split) * 100}%` }

  return (
    <div
      ref={containerRef}
      className={orientation === 'horizontal' ? 'grid h-full min-h-0' : 'grid h-full min-w-0'}
      style={template}
    >
      <div className="min-h-0 min-w-0 overflow-hidden">{first}</div>
      <div
        ref={dividerRef}
        role="separator"
        aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(split * 100)}
        aria-valuemin={Math.round(minSplit * 100)}
        aria-valuemax={Math.round(maxSplit * 100)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`border-border-focus/40 bg-border hover:bg-border-focus focus-visible:bg-border-focus ${
          orientation === 'horizontal' ? 'cursor-col-resize' : 'cursor-row-resize'
        }`}
      />
      <div className="min-h-0 min-w-0 overflow-hidden">{second}</div>
    </div>
  )
}
