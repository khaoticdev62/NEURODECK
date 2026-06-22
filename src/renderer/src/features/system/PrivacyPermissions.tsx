import { useState } from 'react'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { useAuditEntries } from '../../ai-safety/useAuditEntries'
import type { PermissionCapability } from '../../ai-safety/contracts/permission'

interface DeferredView {
  title: string
  reason: string
}

const DEFERRED_VIEWS: DeferredView[] = [
  {
    title: 'Provider data policy',
    reason:
      'No per-provider data-handling policy store exists — see the cloud-processing warning already shown in Model Control Center for the one real signal that exists today.'
  },
  {
    title: 'Workspace boundaries',
    reason:
      'File access is already path-confined per workspace (FileService); there is no separate, user-editable boundary policy beyond that.'
  },
  {
    title: 'Network destinations',
    reason:
      'No allowlist/denylist of network destinations is tracked — network.request is a single capability, not a per-destination policy.'
  },
  {
    title: 'Consent rules',
    reason:
      'No standing consent-rule engine exists — every grant today is a direct, explicit grant or approval.'
  }
]

/**
 * ND-046 Privacy and Permissions. Real: every capability/scope/grant shown
 * here comes from the live `PermissionBroker`/`AuditLog` (Epic 4) — the
 * actual safety pipeline every tool call goes through, not a simulated
 * policy display. The spec's "permission matrix" (rows: agents/tools/
 * providers) isn't fully real yet: `PermissionBroker` grants a capability
 * broker-wide, not per-actor, so there's no way to show "agent X has Y but
 * tool Z doesn't" — only "is this capability currently granted at all."
 * The real per-tool view below (`ToolRegistry.requiredCapability`) is the
 * honest substitute. Revoking here calls the real `broker.revoke()`, which
 * takes effect immediately — the next `evaluate()` call (e.g. the next time
 * that tool is invoked) genuinely requires approval again.
 */
export function PrivacyPermissions(): React.JSX.Element {
  const { registry, broker } = useAiSafety()
  const entries = useAuditEntries()
  const [revokeTarget, setRevokeTarget] = useState<PermissionCapability | null>(null)
  const tools = registry.list()

  function handleRevoke(): void {
    if (!revokeTarget) return
    broker.revoke(revokeTarget)
    setRevokeTarget(null)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Privacy and Permissions</p>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Effective access by tool</p>
        <p className="text-meta text-text-tertiary">
          Capability grants are broker-wide, not per-agent — this shows what each registered tool
          currently needs and whether that capability is presently granted.
        </p>
        {tools.length === 0 ? (
          <p className="text-meta text-text-tertiary">No tools registered.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tools.map((tool) => {
              const decision = broker.evaluate(tool.requiredCapability)
              return (
                <li
                  key={tool.id}
                  className="flex items-center justify-between border-t border-border pt-2 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-meta font-semibold text-text-primary">{tool.title}</p>
                    <p className="text-meta text-text-tertiary">{tool.requiredCapability}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-meta text-text-secondary">
                      {decision === 'granted' ? 'Granted' : 'Requires approval'}
                    </span>
                    {decision === 'granted' && (
                      <ControllerButton
                        variant="ghost"
                        onClick={() => setRevokeTarget(tool.requiredCapability)}
                      >
                        Revoke
                      </ControllerButton>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Audit history</p>
        {entries.length === 0 ? (
          <p className="text-meta text-text-tertiary">
            No audited actions yet — past access stays here once anything runs.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {entries
              .slice()
              .reverse()
              .map((entry) => (
                <li key={entry.id} className="text-meta text-text-secondary">
                  {new Date(entry.timestamp).toLocaleTimeString()} · {entry.tool} ·{' '}
                  {entry.capability} · <span className="text-text-primary">{entry.outcome}</span>
                  {entry.detail ? ` — ${entry.detail}` : ''}
                </li>
              ))}
          </ul>
        )}
      </section>

      {DEFERRED_VIEWS.map((view) => (
        <section key={view.title} className="border border-border bg-surface p-3 opacity-60">
          <p className="text-body font-semibold text-text-primary">{view.title}</p>
          <p className="text-meta text-text-tertiary">Not available: {view.reason}</p>
        </section>
      ))}

      <ConfirmationDialog
        open={revokeTarget !== null}
        title="Revoke permission"
        action={`Revoke ${revokeTarget ?? ''}`}
        consequence="Any tool requiring this capability will need approval again before it can run."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
