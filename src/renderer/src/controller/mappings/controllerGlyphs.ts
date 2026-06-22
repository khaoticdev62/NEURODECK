export type ControllerKind = 'xbox' | 'dualsense' | 'generic'

/**
 * Controller glyph adaptation (mega-prompt §9.2). Face-button labels differ
 * by controller family even though the underlying standard-mapping button
 * index (0-3) is identical — Steam Deck's built-in pad reports as Xbox-style.
 */
const FACE_BUTTON_GLYPHS: Record<ControllerKind, [string, string, string, string]> = {
  xbox: ['A', 'B', 'X', 'Y'],
  dualsense: ['Cross', 'Circle', 'Square', 'Triangle'],
  generic: ['A', 'B', 'X', 'Y']
}

export function detectControllerKind(gamepadId: string): ControllerKind {
  const id = gamepadId.toLowerCase()
  if (id.includes('dualsense') || id.includes('054c')) return 'dualsense'
  if (id.includes('xbox') || id.includes('045e')) return 'xbox'
  return 'generic'
}

export function faceButtonGlyph(kind: ControllerKind, index: 0 | 1 | 2 | 3): string {
  return FACE_BUTTON_GLYPHS[kind][index]
}
