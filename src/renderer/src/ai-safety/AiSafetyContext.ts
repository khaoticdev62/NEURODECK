import { createContext } from 'react'
import type { ActionQueue } from './ActionQueue'
import type { AuditLog } from './AuditLog'
import type { PermissionBroker } from './PermissionBroker'
import type { ToolRegistry } from './ToolRegistry'

export interface AiSafetyContextValue {
  registry: ToolRegistry
  broker: PermissionBroker
  audit: AuditLog
  queue: ActionQueue
}

export const AiSafetyContext = createContext<AiSafetyContextValue | null>(null)
