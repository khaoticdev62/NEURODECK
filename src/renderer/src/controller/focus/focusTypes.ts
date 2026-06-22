export type FocusRole =
  | 'button'
  | 'listitem'
  | 'tab'
  | 'field'
  | 'treeitem'
  | 'slider'
  | 'canvas-node'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface FocusRect {
  top: number
  left: number
  right: number
  bottom: number
}

/**
 * Focus node registration contract (wireframe §5.1, mega-prompt §10.1).
 * `getRect` is injected rather than read directly from the DOM so the
 * registry's navigation logic stays pure and testable without a real
 * layout engine (jsdom reports all-zero rects).
 */
export interface FocusNodeRegistration {
  id: string
  groupId: string
  role: FocusRole
  disabled: boolean
  hidden: boolean
  priority: number
  getRect: () => FocusRect
  focusElement: () => void
  explicitNeighbors?: Partial<Record<Direction, string>>
  fallbackId?: string
  onActivate: () => void
  onContext?: () => void
  onAssist?: () => void
}
