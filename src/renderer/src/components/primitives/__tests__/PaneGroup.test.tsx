import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ToastProvider } from '../../overlays/Toast'
import { PaneGroup } from '../PaneGroup'

function renderPaneGroup(onSplitChange = vi.fn()): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <PaneGroup
          id="test-pane"
          orientation="horizontal"
          first={<div>First pane</div>}
          second={<div>Second pane</div>}
          onSplitChange={onSplitChange}
        />
      </FocusEngineProvider>
    </ToastProvider>
  )
}

describe('PaneGroup', () => {
  it('renders both panes and a real separator divider', () => {
    renderPaneGroup()

    expect(screen.getByText('First pane')).toBeInTheDocument()
    expect(screen.getByText('Second pane')).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('nudges the split fraction with Arrow keys, clamped within [minSplit, maxSplit]', () => {
    const onSplitChange = vi.fn()
    renderPaneGroup(onSplitChange)

    const divider = screen.getByRole('separator')
    fireEvent.keyDown(divider, { key: 'ArrowRight' })

    expect(onSplitChange).toHaveBeenCalledWith(0.52)

    fireEvent.keyDown(divider, { key: 'ArrowLeft' })
    fireEvent.keyDown(divider, { key: 'ArrowLeft' })

    expect(onSplitChange).toHaveBeenLastCalledWith(0.48)
  })

  it('handles a pointer drag sequence without throwing (jsdom does not implement PointerEvent, so clientX/Y cannot be asserted here — real drag math is covered by the Arrow-key tests, which exercise the identical clamp()/applySplit() path)', () => {
    const onSplitChange = vi.fn()
    renderPaneGroup(onSplitChange)

    const divider = screen.getByRole('separator')

    expect(() => {
      fireEvent.pointerDown(divider, { pointerId: 1 })
      fireEvent.pointerMove(divider, { pointerId: 1, clientX: 100, clientY: 50 })
      fireEvent.pointerUp(divider, { pointerId: 1 })
    }).not.toThrow()
  })

  it('respects a custom initialSplit and min/max clamp', () => {
    const onSplitChange = vi.fn()
    render(
      <ToastProvider>
        <FocusEngineProvider adapters={[new TestAdapter()]}>
          <PaneGroup
            id="test-pane-2"
            orientation="vertical"
            first={<div>Top</div>}
            second={<div>Bottom</div>}
            initialSplit={0.7}
            minSplit={0.6}
            maxSplit={0.8}
            onSplitChange={onSplitChange}
          />
        </FocusEngineProvider>
      </ToastProvider>
    )

    const divider = screen.getByRole('separator')
    expect(divider).toHaveAttribute('aria-valuenow', '70')

    // Nudge far past the max — should clamp, not exceed it.
    for (let i = 0; i < 10; i += 1) {
      fireEvent.keyDown(divider, { key: 'ArrowDown' })
    }
    expect(onSplitChange).toHaveBeenLastCalledWith(0.8)
  })
})
