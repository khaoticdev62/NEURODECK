import { useEffect, useState } from 'react'
import type { DiagnosticsInfo } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { getDiagnosticsInfo } from '../../services/ipc/diagnosticsClient'
import { collectSystemMetrics } from '../../services/ipc/systemClient'

/**
 * ND-056 About and Diagnostics. Every field is a real runtime value
 * (`app.getVersion()`, `process.versions`, `process.platform`/`arch`,
 * configured providers) — there is no separate core-service process or
 * database in this architecture, so "Core version"/"Database version"
 * aren't shown rather than being filled with an invented value. Diagnostic
 * export copies real version info plus a real system metrics snapshot to
 * the clipboard (the same `navigator.clipboard.writeText` path
 * `CommandBuilder`'s copy action already uses) — nothing here ever
 * includes an API key or other secret, since none of this data source
 * holds one.
 */
export function AboutDiagnostics(): React.JSX.Element {
  const [info, setInfo] = useState<DiagnosticsInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getDiagnosticsInfo().then((result) => {
      if (!active) return
      if (result.ok) {
        setInfo(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleExport(): Promise<void> {
    if (!info) return
    const metricsResult = await collectSystemMetrics()
    const payload = {
      diagnostics: info,
      systemMetrics: metricsResult.ok ? metricsResult.data : null,
      exportedAt: new Date().toISOString()
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopyStatus('Diagnostics copied to clipboard.')
  }

  if (error) return <ErrorState title="Diagnostics error" description={error} />
  if (!info) return <p className="p-4 text-meta text-text-secondary">Loading…</p>

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">About and Diagnostics</p>

      <section className="flex flex-col gap-1 border border-border bg-surface p-3">
        <Field label="App version" value={info.appVersion} />
        <Field label="Electron" value={info.electronVersion} />
        <Field label="Chromium" value={info.chromeVersion} />
        <Field label="Node.js" value={info.nodeVersion} />
        <Field label="Platform" value={`${info.platform} (${info.arch})`} />
        <Field label="License" value={info.license} />
        <Field
          label="Installed integrations"
          value={
            info.modelProviderNames.length ? info.modelProviderNames.join(', ') : 'None configured'
          }
        />
      </section>

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Diagnostic export</p>
        <p className="text-meta text-text-tertiary">
          Copies the above plus a live system metrics snapshot to the clipboard. Contains no API
          keys or other secrets.
        </p>
        <ControllerButton variant="primary" onClick={() => void handleExport()}>
          Copy diagnostics to clipboard
        </ControllerButton>
        {copyStatus && <p className="text-meta text-status-success">{copyStatus}</p>}
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <p className="text-meta text-text-secondary">
      {label}: <span className="text-text-primary">{value}</span>
    </p>
  )
}
