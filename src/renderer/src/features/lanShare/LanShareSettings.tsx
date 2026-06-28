import { useEffect, useState } from 'react'
import type {
  LanShareCompressionMode,
  LanShareNetworkInterface,
  LanShareSettings as LanShareSettingsType
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import {
  getLanShareSettings,
  listLanShareInterfaces,
  setLanShareGroupCode,
  updateLanShareSettings
} from '../../services/ipc/lanShareClient'

/**
 * ND-LAN-017 Settings, folding in ND-LAN-012 Group Code and Secure Mode,
 * ND-LAN-014 Network Interface Selection (shown read-only — there is no
 * real per-interface bind preference enforced yet, only the
 * `preferredInterfaceId` field on settings, which nothing reads back
 * out; wiring that through the service is future work, not fabricated
 * here), ND-LAN-015 Receive Destination Rules (the single
 * `receiveDirectory` field — there is no real per-source-pattern rules
 * engine), and ND-LAN-016 Compression and Performance.
 */
export function LanShareSettings(): React.JSX.Element {
  const [settings, setSettings] = useState<LanShareSettingsType | null>(null)
  const [interfaces, setInterfaces] = useState<LanShareNetworkInterface[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [groupCode, setGroupCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([getLanShareSettings(), listLanShareInterfaces()]).then(
      ([settingsResult, interfacesResult]) => {
        if (!active) return
        if (settingsResult.ok) setSettings(settingsResult.data)
        else setError(settingsResult.error.userMessage)
        if (interfacesResult.ok) setInterfaces(interfacesResult.data)
      }
    )
    return () => {
      active = false
    }
  }, [])

  async function saveSettings(patch: Partial<LanShareSettingsType>): Promise<void> {
    setSaving(true)
    setMessage(null)
    const result = await updateLanShareSettings(patch)
    setSaving(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setSettings(result.data)
    setError(null)
    setMessage('Saved.')
  }

  async function handleSetGroupCode(): Promise<void> {
    if (groupCode.trim().length < 8) {
      setError('The group code must be at least 8 characters.')
      return
    }
    setSaving(true)
    const result = await setLanShareGroupCode({ groupCode: groupCode.trim() })
    setSaving(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setSettings(result.data)
    setGroupCode('')
    setError(null)
    setMessage('Group code set — secure mode is now active.')
  }

  if (!settings) {
    return <p className="p-4 text-meta text-text-secondary">{error ?? 'Loading settings…'}</p>
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">LAN Share Settings</p>
      {error && <ErrorState title="Settings error" description={error} />}
      {message && <p className="text-meta text-status-success">{message}</p>}

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Group code (secure mode)</p>
        <p className="text-meta text-text-secondary">
          {settings.groupCodeConfigured
            ? 'A real, non-default group code is set — secure mode is active.'
            : 'Still using the default group code — incoming approval is always required until you set one.'}
        </p>
        <div className="flex gap-2">
          <input
            value={groupCode}
            onChange={(event) => setGroupCode(event.target.value)}
            placeholder="New group code (8-32 characters)"
            type="password"
            className="flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
          <ControllerButton
            variant="primary"
            disabled={saving}
            onClick={() => void handleSetGroupCode()}
          >
            Set code
          </ControllerButton>
        </div>
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Device name</p>
        <div className="flex gap-2">
          <input
            defaultValue={settings.deviceDisplayName}
            onBlur={(event) => {
              const value = event.target.value.trim()
              if (value && value !== settings.deviceDisplayName) {
                void saveSettings({ deviceDisplayName: value })
              }
            }}
            className="flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Network</p>
        <label className="flex items-center gap-2 text-meta text-text-secondary">
          Transfer port
          <input
            defaultValue={settings.transferPort}
            inputMode="numeric"
            onBlur={(event) => {
              const value = Number(event.target.value)
              if (value && value !== settings.transferPort)
                void saveSettings({ transferPort: value })
            }}
            className="w-24 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
        </label>
        <label className="flex items-center gap-2 text-meta text-text-secondary">
          Registration port
          <input
            defaultValue={settings.authPort}
            inputMode="numeric"
            onBlur={(event) => {
              const value = Number(event.target.value)
              if (value && value !== settings.authPort) void saveSettings({ authPort: value })
            }}
            className="w-24 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
        </label>
        {interfaces.length > 0 && (
          <ul className="flex flex-col gap-1">
            {interfaces.map((iface) => (
              <li key={iface.id} className="text-meta text-text-tertiary">
                {iface.name} · {iface.address} ({iface.family}, {iface.inferredType})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Receive directory</p>
        <input
          defaultValue={settings.receiveDirectory}
          onBlur={(event) => {
            const value = event.target.value.trim()
            if (value && value !== settings.receiveDirectory) {
              void saveSettings({ receiveDirectory: value })
            }
          }}
          className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Compression</p>
        <select
          value={settings.compressionMode}
          onChange={(event) =>
            void saveSettings({ compressionMode: event.target.value as LanShareCompressionMode })
          }
          className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        >
          <option value="auto">Auto</option>
          <option value="off">Off</option>
          <option value="compatible">Compatible (always on)</option>
        </select>
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Auto-start</p>
        <p className="text-meta text-text-secondary">
          Requires secure mode (a real, non-default group code) — enforced by the backend, not just
          this screen.
        </p>
        <ControllerButton
          variant={settings.autoStartEnabled ? 'destructive' : 'primary'}
          disabled={saving || (!settings.groupCodeConfigured && !settings.autoStartEnabled)}
          onClick={() => void saveSettings({ autoStartEnabled: !settings.autoStartEnabled })}
        >
          {settings.autoStartEnabled ? 'Disable auto-start' : 'Enable auto-start'}
        </ControllerButton>
      </section>
    </div>
  )
}
