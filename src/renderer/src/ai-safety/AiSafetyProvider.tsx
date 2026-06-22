import { useMemo, useState, type ReactNode } from 'react'
import { ActionQueue } from './ActionQueue'
import { AiSafetyContext, type AiSafetyContextValue } from './AiSafetyContext'
import { AuditLog } from './AuditLog'
import { PermissionBroker } from './PermissionBroker'
import { ToolRegistry } from './ToolRegistry'

/**
 * Instantiates the real AI safety pipeline (mega-prompt §15/§16): tool
 * registry, permission broker, audit log, and the action queue that ties
 * them together. No tools are registered here — that's the job of whatever
 * feature owns a real capability (see `tools/registerCoreTools.ts`).
 */
export function AiSafetyProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [registry] = useState(() => new ToolRegistry())
  const [broker] = useState(() => new PermissionBroker())
  const [audit] = useState(() => new AuditLog())
  const [queue] = useState(() => new ActionQueue(registry, broker, audit))

  const value: AiSafetyContextValue = useMemo(
    () => ({ registry, broker, audit, queue }),
    [registry, broker, audit, queue]
  )

  return <AiSafetyContext.Provider value={value}>{children}</AiSafetyContext.Provider>
}
