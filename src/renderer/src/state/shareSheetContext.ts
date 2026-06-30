import { createContext } from 'react'

/**
 * Real Epic X6 Universal Share Sheet payload (supplemental §17.4).
 * Renderer-only — never crosses IPC itself, so it lives in renderer
 * state rather than `shared/contracts` (matching `recordingMedia.ts`'s
 * precedent for renderer-only shapes).
 */
export interface SharePayload {
  text?: string
  url?: string
  filePaths?: string[]
  /** Shown in the sheet and used as a default title/origin label for targets that need one (e.g. Knowledge Vault). */
  sourceLabel: string
}

export interface ShareSheetContextValue {
  payload: SharePayload | null
  openShareSheet: (payload: SharePayload) => void
  closeShareSheet: () => void
}

export const ShareSheetContext = createContext<ShareSheetContextValue | null>(null)
