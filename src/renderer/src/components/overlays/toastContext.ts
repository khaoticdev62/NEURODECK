import { createContext } from 'react'

export type ToastCategory =
  | 'information'
  | 'success'
  | 'warning'
  | 'error'
  | 'approval-required'
  | 'background-task-complete'

export interface ToastInput {
  category: ToastCategory
  title: string
  description?: string
  /** ms before auto-dismiss; omit for categories that should persist until the user acts. */
  durationMs?: number
}

export interface ToastRecord extends ToastInput {
  id: string
}

export interface ToastContextValue {
  toasts: ToastRecord[]
  push: (toast: ToastInput) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
