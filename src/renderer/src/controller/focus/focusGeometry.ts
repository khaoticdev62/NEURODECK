import type { Direction, FocusRect } from './focusTypes'

interface RectCenter {
  x: number
  y: number
}

function center(rect: FocusRect): RectCenter {
  return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
}

function isInDirection(from: RectCenter, to: RectCenter, direction: Direction): boolean {
  switch (direction) {
    case 'up':
      return to.y < from.y
    case 'down':
      return to.y > from.y
    case 'left':
      return to.x < from.x
    case 'right':
      return to.x > from.x
  }
}

/**
 * Geometric directional candidate search (mega-prompt §10.2 step 3).
 * Scores candidates by distance along the movement axis plus a weighted
 * penalty for perpendicular misalignment, so a slightly-further but
 * better-aligned element wins over a closer but diagonally-offset one.
 */
export function findGeometricCandidate<T extends { rect: FocusRect }>(
  fromRect: FocusRect,
  candidates: T[],
  direction: Direction
): T | null {
  const from = center(fromRect)
  let best: T | null = null
  let bestScore = Infinity

  for (const candidate of candidates) {
    const to = center(candidate.rect)
    if (!isInDirection(from, to, direction)) continue

    const primary =
      direction === 'up' || direction === 'down' ? Math.abs(to.y - from.y) : Math.abs(to.x - from.x)
    const perpendicular =
      direction === 'up' || direction === 'down' ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y)
    const score = primary + perpendicular * 2

    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}
