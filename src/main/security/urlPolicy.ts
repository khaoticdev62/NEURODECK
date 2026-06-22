const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:'])

/** Pure, Electron-free predicate so navigation/external-link policy is unit-testable. */
export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    return ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(rawUrl).protocol)
  } catch {
    return false
  }
}

export function safeOrigin(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin
  } catch {
    return null
  }
}

export function isAllowedNavigation(rawUrl: string, allowedOrigins: readonly string[]): boolean {
  const origin = safeOrigin(rawUrl)
  return origin !== null && allowedOrigins.includes(origin)
}
