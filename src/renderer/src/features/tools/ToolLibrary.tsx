import { useState } from 'react'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { useAuditEntries } from '../../ai-safety/useAuditEntries'
import type { ToolDefinition } from '../../ai-safety/ToolRegistry'
import type { RiskLevel } from '../../ai-safety/contracts/plan'

const RISK_TONE: Record<RiskLevel, StatusTone> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
}

/**
 * Real Epic X4 Tool Library (supplemental §14.3). The data this
 * screen shows — `ToolRegistry.list()`, `PermissionBroker.evaluate()`,
 * and `AuditLog` entries filtered by tool id — already existed and
 * was already real (Privacy and Permissions consumes the same
 * registry/broker for its own per-tool grant view); this is the first
 * dedicated reference screen for browsing the full tool catalog
 * itself, rather than only managing grants.
 *
 * Honestly out of scope, by architecture rather than by omission:
 * "Provider" (built-in tools have no provider-attribution model —
 * unlike Extensions, these are core safety-pipeline tools, not
 * provider-sourced), "Health"/"Version" (no fault-tracking or
 * versioning exists for built-in tools, unlike Extensions' real
 * quarantine/fault state), and "Disable control" (there is no
 * enable/disable mechanism for a registered safety tool today —
 * adding one would change `ActionQueue`'s submission semantics and
 * deserves its own deliberate design, not a button bolted on here).
 */
export function ToolLibrary(): React.JSX.Element {
  const { registry, broker } = useAiSafety()
  const auditEntries = useAuditEntries()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const tools = registry.list()
  const selected = tools.find((tool) => tool.id === selectedId) ?? tools[0] ?? null

  if (tools.length === 0) {
    return <EmptyState title="No tools registered" description="No tools are registered yet." />
  }

  const selectedUsage = selected
    ? auditEntries
        .filter((entry) => entry.tool === selected.id)
        .slice()
        .reverse()
    : []

  return (
    <div className="grid h-full min-h-0 grid-cols-[20rem_minmax(28rem,1fr)] gap-2 overflow-auto p-4">
      <section className="flex flex-col gap-2 overflow-auto border border-border bg-surface p-3">
        <p className="text-title font-semibold text-text-primary">Tool Library</p>
        <p className="text-meta text-text-secondary">
          Every tool NeuroDeck&rsquo;s AI safety pipeline can invoke.
        </p>
        <ul className="flex flex-col gap-1">
          {tools.map((tool, index) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              index={index}
              selected={tool.id === selected?.id}
              decision={broker.evaluate(tool.requiredCapability)}
              onSelect={() => setSelectedId(tool.id)}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 overflow-auto border border-border bg-surface p-3">
        {selected ? (
          <>
            <div>
              <p className="text-title font-semibold text-text-primary">{selected.title}</p>
              <p className="text-meta text-text-secondary">{selected.description}</p>
            </div>

            <dl className="grid grid-cols-2 gap-2 text-meta">
              <dt className="text-text-tertiary">Tool ID</dt>
              <dd className="text-text-primary">{selected.id}</dd>
              <dt className="text-text-tertiary">Required capability</dt>
              <dd className="text-text-primary">{selected.requiredCapability}</dd>
              <dt className="text-text-tertiary">Risk</dt>
              <dd>
                <StatusBadge tone={RISK_TONE[selected.risk]} label={selected.risk} />
              </dd>
              <dt className="text-text-tertiary">Reversible</dt>
              <dd className="text-text-primary">{selected.reversible ? 'Yes' : 'No'}</dd>
              <dt className="text-text-tertiary">Current permission</dt>
              <dd>
                <StatusBadge
                  tone={
                    broker.evaluate(selected.requiredCapability) === 'granted'
                      ? 'success'
                      : 'warning'
                  }
                  label={broker.evaluate(selected.requiredCapability)}
                />
              </dd>
            </dl>

            <div>
              <p className="text-meta font-semibold text-text-primary">Recent audit usage</p>
              {selectedUsage.length === 0 ? (
                <p className="text-meta text-text-tertiary">No recorded invocations yet.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1 text-caption text-text-secondary">
                  {selectedUsage.slice(0, 10).map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-2">
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      <StatusBadge
                        tone={
                          entry.outcome === 'executed'
                            ? 'success'
                            : entry.outcome === 'failed' || entry.outcome === 'denied'
                              ? 'error'
                              : 'neutral'
                        }
                        label={entry.outcome}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <EmptyState title="Select a tool" description="Choose a tool to inspect it." />
        )}
      </section>
    </div>
  )
}

function ToolRow({
  tool,
  index,
  selected,
  decision,
  onSelect
}: {
  tool: ToolDefinition
  index: number
  selected: boolean
  decision: 'granted' | 'requires-approval'
  onSelect: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `tool-library-row:${tool.id}`,
    groupId: 'tool-library',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate: onSelect
  })

  return (
    <li>
      <ControllerButton
        ref={ref}
        variant={selected ? 'primary' : 'secondary'}
        className={`flex w-full items-center justify-between gap-2 text-left ${
          isFocused ? 'ring-2 ring-border-focus' : ''
        }`}
        onClick={onSelect}
      >
        <span className="truncate">{tool.title}</span>
        <StatusBadge tone={decision === 'granted' ? 'success' : 'warning'} label={decision} />
      </ControllerButton>
    </li>
  )
}
