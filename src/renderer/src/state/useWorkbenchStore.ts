import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

export interface WorkbenchState {
  primaryTitle: string
  primarySubtitle: string | undefined
  primaryContent: ReactNode | null
  secondaryContent: ReactNode | null
  bottomContent: ReactNode | null
  setPrimary: (title: string, subtitle: string | undefined, content: ReactNode | null) => void
  setSecondary: (content: ReactNode | null) => void
  setBottom: (content: ReactNode | null) => void
}

// Only the pure data fields. Setters live outside so they never change identity.
interface WorkbenchData {
  primaryTitle: string
  primarySubtitle: string | undefined
  primaryContent: ReactNode | null
  secondaryContent: ReactNode | null
  bottomContent: ReactNode | null
}

let _data: WorkbenchData = {
  primaryTitle: 'Command Deck',
  primarySubtitle: undefined,
  primaryContent: null,
  secondaryContent: null,
  bottomContent: null
}

// Snapshot object is rebuilt after each mutation so subscribers detect changes,
// but the *setter* slots point to the same stable functions below.
let _snapshot: WorkbenchState

const listeners = new Set<() => void>()

function _notify(): void {
  _snapshot = { ..._data, setPrimary, setSecondary, setBottom }
  listeners.forEach((l) => l())
}

// Stable setter identities — defined once, never replaced.
export const setPrimary = (
  title: string,
  subtitle: string | undefined,
  content: ReactNode | null
): void => {
  _data = { ..._data, primaryTitle: title, primarySubtitle: subtitle, primaryContent: content }
  _notify()
}

export const setSecondary = (content: ReactNode | null): void => {
  _data = { ..._data, secondaryContent: content }
  _notify()
}

export const setBottom = (content: ReactNode | null): void => {
  _data = { ..._data, bottomContent: content }
  _notify()
}

// Build the initial snapshot now that the setters exist.
_snapshot = { ..._data, setPrimary, setSecondary, setBottom }

export function useWorkbenchStore<T = WorkbenchState>(selector?: (state: WorkbenchState) => T): T {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => _snapshot
  )
  return selector ? selector(state) : (state as unknown as T)
}

/** Reset store to blank state — call in afterEach in unit tests. */
export function resetWorkbenchStore(): void {
  _data = {
    primaryTitle: 'Command Deck',
    primarySubtitle: undefined,
    primaryContent: null,
    secondaryContent: null,
    bottomContent: null
  }
  _snapshot = { ..._data, setPrimary, setSecondary, setBottom }
}
