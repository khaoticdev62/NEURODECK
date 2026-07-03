import { useEffect, useState } from 'react'
import { useFocusEngine } from '../focus/useFocusEngine'

/**
 * Development-only focus debug overlay (mega-prompt §10.3). Shows the
 * current focused node, every registered node's group/disabled/hidden
 * state, and active trap depth. Duplicate-ID detection and unreachable-node
 * analysis from the full spec list are deferred — `Map`-backed registration
 * makes duplicate IDs silently overwrite rather than collide, so detecting
 * them needs separate instrumentation this overlay doesn't have yet.
 */
export function FocusDebugOverlay(): React.JSX.Element | null {
  const { registry, controllerKind } = useFocusEngine()
  const [snapshot, setSnapshot] = useState(() => registry.debugSnapshot())

  useEffect(() => {
    return registry.onFocusChange(() => setSnapshot(registry.debugSnapshot()))
  }, [registry])

  if (!import.meta.env.DEV) return null

  return (
    <div
      className="fixed bottom-2 left-2 max-h-64 w-72 overflow-auto rounded-md border border-border bg-surface/95 p-2 font-mono text-[11px] text-text-secondary shadow-elevated"
      style={{ zIndex: 'var(--ndx-z-toast)' }}
    >
      <p className="text-text-primary">
        Focus: <span className="text-status-info">{snapshot.currentId ?? '(none)'}</span> (Reg:{' '}
        {registry.instanceId})
      </p>
      <p>
        Controller: {controllerKind} · Trap depth: {snapshot.trapDepth}
      </p>
      {snapshot.currentId === null && snapshot.nodes.length > 0 && (
        <p className="text-status-warning">No initial focus target claimed yet.</p>
      )}
      <ul className="mt-1 flex flex-col gap-0.5">
        {snapshot.nodes.map((node) => (
          <li
            key={node.id}
            className={node.id === snapshot.currentId ? 'text-status-info' : undefined}
          >
            {node.id} · {node.groupId} · p{node.priority}
            {node.disabled && ' · disabled'}
            {node.hidden && ' · hidden'}
          </li>
        ))}
      </ul>
    </div>
  )
}
