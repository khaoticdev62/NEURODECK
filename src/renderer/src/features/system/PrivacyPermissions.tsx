import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxSettingsTree, NdxToolWindow } from '../../components/workbench'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { useAuditEntries } from '../../ai-safety/useAuditEntries'
import type { PermissionCapability } from '../../ai-safety/contracts/permission'
import { listBrowserPermissions, revokeBrowserPermission } from '../../services/ipc/browserClient'
import { removeLockPin, setLockPin } from '../../services/ipc/lockClient'
import { useLockState } from '../../state/useLockState'
import type { BrowserPermission } from '@shared/contracts'

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
  const navigate = useNavigate()
  const { registry, broker } = useAiSafety()
  const { pinConfigured, refreshStatus } = useLockState()
  const entries = useAuditEntries()
  const [revokeTarget, setRevokeTarget] = useState<PermissionCapability | null>(null)
  const [browserPermissions, setBrowserPermissions] = useState<BrowserPermission[]>([])
  const [browserError, setBrowserError] = useState<string | null>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSaved, setPinSaved] = useState(false)
  const tools = registry.list()

  useEffect(() => {
    let active = true
    void listBrowserPermissions().then((result) => {
      if (!active) return
      if (result.ok) {
        setBrowserPermissions(result.data)
        setBrowserError(null)
      } else {
        setBrowserError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  function handleRevoke(): void {
    if (!revokeTarget) return
    broker.revoke(revokeTarget)
    setRevokeTarget(null)
  }

  async function handleSavePin(): Promise<void> {
    setPinError(null)
    setPinSaved(false)
    if (newPin !== confirmPin) {
      setPinError('PIN and confirmation do not match.')
      return
    }
    const result = await setLockPin({
      newPin,
      currentPin: pinConfigured ? currentPin : undefined
    })
    if (!result.ok) {
      setPinError(result.error.userMessage)
      return
    }
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setPinSaved(true)
    await refreshStatus()
  }

  async function handleRemovePin(): Promise<void> {
    setPinError(null)
    setPinSaved(false)
    const result = await removeLockPin({ currentPin })
    if (!result.ok) {
      setPinError(result.error.userMessage)
      return
    }
    setCurrentPin('')
    await refreshStatus()
  }

  return (
    <div className="grid h-full min-w-[76rem] grid-cols-[16rem_minmax(44rem,1fr)_20rem] gap-2 overflow-auto">
      <NdxSettingsTree>
        <div className="space-y-2 text-meta text-text-secondary">
          <p className="text-text-primary">Privacy</p>
          <p>Tool access</p>
          <p>Audit history</p>
          <p>Browser permissions</p>
          <p>Lock PIN</p>
        </div>
      </NdxSettingsTree>

      <NdxEditorShell title="Permission Matrix">
        <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-auto p-4">
          <p className="text-title font-semibold text-text-primary">Privacy and Permissions</p>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body font-semibold text-text-primary">Effective access by tool</p>
              <ControllerButton variant="ghost" onClick={() => navigate('/tools')}>
                Browse Tool Library
              </ControllerButton>
            </div>
            <p className="text-meta text-text-tertiary">
              Capability grants are broker-wide, not per-agent — this shows what each registered
              tool currently needs and whether that capability is presently granted.
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
                      {entry.capability} ·{' '}
                      <span className="text-text-primary">{entry.outcome}</span>
                      {entry.detail ? ` — ${entry.detail}` : ''}
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Browser permissions</p>
            {browserError && <p className="text-meta text-status-error">{browserError}</p>}
            {browserPermissions.length === 0 ? (
              <p className="text-meta text-text-tertiary">
                No browser permission decisions stored yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {browserPermissions.map((permission) => (
                  <li
                    key={`${permission.origin}:${permission.permission}`}
                    className="flex items-center justify-between border-t border-border pt-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-meta font-semibold text-text-primary">
                        {permission.origin}
                      </p>
                      <p className="text-meta text-text-tertiary">{permission.permission}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-meta ${permission.granted ? 'text-status-success' : 'text-status-error'}`}
                      >
                        {permission.granted ? 'Allowed' : 'Denied'}
                      </span>
                      <ControllerButton
                        variant="ghost"
                        onClick={() => {
                          void revokeBrowserPermission({
                            origin: permission.origin,
                            permission: permission.permission
                          }).then((result) => {
                            if (!result.ok) {
                              setBrowserError(result.error.userMessage)
                              return
                            }
                            void listBrowserPermissions().then((next) => {
                              if (next.ok) setBrowserPermissions(next.data)
                            })
                          })
                        }}
                      >
                        Revoke
                      </ControllerButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Lock Screen PIN (ND-002)</p>
            <p className="text-meta text-text-tertiary">
              {pinConfigured
                ? 'A PIN is set. Locking from the Power Menu requires it to unlock again.'
                : 'No PIN set — Lock NeuroDeck is unavailable from the Power Menu until one is configured. Single local PIN only; multi-account authentication needs the profile/credential vault (Phase B Epic X10), not built yet.'}
            </p>
            {pinError && (
              <p role="alert" className="text-meta text-status-error">
                {pinError}
              </p>
            )}
            {pinSaved && <p className="text-meta text-status-success">PIN saved.</p>}
            {pinConfigured && (
              <label className="flex flex-col gap-1 text-meta text-text-secondary">
                Current PIN
                <input
                  type="password"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value)}
                  className="border border-border bg-canvas px-2 py-1 text-body text-text-primary"
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-meta text-text-secondary">
              New PIN (4-8 digits)
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                className="border border-border bg-canvas px-2 py-1 text-body text-text-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-meta text-text-secondary">
              Confirm new PIN
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                className="border border-border bg-canvas px-2 py-1 text-body text-text-primary"
              />
            </label>
            <div className="flex gap-2">
              <ControllerButton
                variant="primary"
                disabled={!newPin || !confirmPin || (pinConfigured && !currentPin)}
                onClick={() => void handleSavePin()}
              >
                {pinConfigured ? 'Change PIN' : 'Set PIN'}
              </ControllerButton>
              {pinConfigured && (
                <ControllerButton
                  variant="ghost"
                  disabled={!currentPin}
                  onClick={() => void handleRemovePin()}
                >
                  Remove PIN
                </ControllerButton>
              )}
            </div>
          </section>

          {DEFERRED_VIEWS.map((view) => (
            <section key={view.title} className="border border-border bg-surface p-3 opacity-60">
              <p className="text-body font-semibold text-text-primary">{view.title}</p>
              <p className="text-meta text-text-tertiary">Not available: {view.reason}</p>
            </section>
          ))}
        </div>
      </NdxEditorShell>

      <NdxToolWindow
        title="Security Scope"
        subtitle={pinConfigured ? 'PIN configured' : 'PIN missing'}
        side="right"
      >
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Capability grants are broker-wide and revoked through the real PermissionBroker.</p>
          <p>Browser permission decisions come from the Browser System permission store.</p>
        </div>
      </NdxToolWindow>

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
