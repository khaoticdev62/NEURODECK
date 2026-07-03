import { createContext } from 'react'

export type ToastCategory =
  'information' | 'success' | 'warning' | 'error' | 'approval-required' | 'background-task-complete'

export interface ToastInput {
  category: ToastCategory
  title: string
  description?: string
  /** ms before auto-dismiss; omit for categories that should persist until the user acts. */
  durationMs?: number
}

export interface ToastRecord extends ToastInput {
  id: string
  timestamp: number
  /** Repeated identical events collapse into one threaded card (wireframe §6.4/ND-012 rules) rather than stacking. */
  count: number
}

export interface ToastContextValue {
  toasts: ToastRecord[]
  push: (toast: ToastInput) => string
  dismiss: (id: string) => void
  /** Full history (ND-012 Notification Center), including dismissed/auto-dismissed entries. */
  history: ToastRecord[]
  mutedCategories: ReadonlySet<ToastCategory>
  muteCategory: (category: ToastCategory) => void
  unmuteCategory: (category: ToastCategory) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
