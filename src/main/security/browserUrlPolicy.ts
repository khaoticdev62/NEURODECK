const ALLOWED_BROWSER_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Pure, Electron-free predicate (mirrors `urlPolicy.ts`'s shape) gating
 * what the embedded Browser System (mega-prompt §24) may navigate to.
 * Unlike the main shell's navigation policy — which allowlists the app's
 * own origin only — a browser tab's whole purpose is navigating to
 * arbitrary `http`/`https` destinations. Everything else (`javascript:`,
 * `file:`, `data:`, `chrome:`, `view-source:`, ...) is rejected: those
 * schemes can read local files, execute script outside any page context,
 * or escape the embedded view's sandbox in ways a real browser tab must
 * not allow.
 */
export function isAllowedBrowserUrl(rawUrl: string): boolean {
  try {
    return ALLOWED_BROWSER_PROTOCOLS.has(new URL(rawUrl).protocol)
  } catch {
    return false
  }
}
