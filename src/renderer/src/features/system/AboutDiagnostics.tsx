import { useEffect, useState } from 'react'
import type { DiagnosticsInfo, LanShareHealth, LanShareServiceStatus } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { createSupportBundle, getDiagnosticsInfo } from '../../services/ipc/diagnosticsClient'
import { getLanShareHealth, getLanShareServiceStatus } from '../../services/ipc/lanShareClient'
import { collectSystemMetrics } from '../../services/ipc/systemClient'

/**
 * ND-056 About and Diagnostics. Every field is a real runtime value
 * (`app.getVersion()`, `process.versions`, `process.platform`/`arch`,
 * configured providers). Diagnostic export copies real version info, LAN
 * Share status, and a real system metrics snapshot to the clipboard. It
 * never includes API keys or other secrets, since none of these data sources
 * hold one.
 */
export function AboutDiagnostics(): React.JSX.Element {
  const [info, setInfo] = useState<DiagnosticsInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [bundleStatus, setBundleStatus] = useState<string | null>(null)
  const [bundleError, setBundleError] = useState<string | null>(null)
  const [creatingBundle, setCreatingBundle] = useState(false)
  const [lanShareStatus, setLanShareStatus] = useState<LanShareServiceStatus | null>(null)
  const [lanShareHealth, setLanShareHealth] = useState<LanShareHealth | null>(null)

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
    void Promise.all([getLanShareServiceStatus(), getLanShareHealth()]).then(
      ([statusResult, healthResult]) => {
        if (!active) return
        if (statusResult.ok) setLanShareStatus(statusResult.data)
        if (healthResult.ok) setLanShareHealth(healthResult.data)
      }
    )
    return () => {
      active = false
    }
  }, [])

  async function handleExport(): Promise<void> {
    if (!info) return
    const metricsResult = await collectSystemMetrics()
    const payload = {
      diagnostics: info,
      lanShare: {
        status: lanShareStatus,
        health: lanShareHealth
      },
      systemMetrics: metricsResult.ok ? metricsResult.data : null,
      exportedAt: new Date().toISOString()
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopyStatus('Diagnostics copied to clipboard.')
  }

  async function handleCreateSupportBundle(): Promise<void> {
    setCreatingBundle(true)
    setBundleStatus(null)
    setBundleError(null)
    const result = await createSupportBundle()
    setCreatingBundle(false)
    if (result.ok) {
      setBundleStatus(`Support bundle saved to ${result.data.path}. SHA-256: ${result.data.sha256}`)
    } else {
      setBundleError(result.error.userMessage)
    }
  }

  if (error) return <ErrorState title="Diagnostics error" description={error} />
  if (!info) return <p className="p-4 text-meta text-text-secondary">Loading...</p>

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

      {lanShareStatus && lanShareHealth && (
        <section className="flex flex-col gap-1 border border-border bg-surface p-3">
          <p className="text-body font-semibold text-text-primary">LAN Share</p>
          <Field label="Service" value={`${lanShareStatus.state}: ${lanShareStatus.reason}`} />
          <Field
            label="Sockets"
            value={`Transfer ${lanShareHealth.transferPortBound ? 'bound' : 'not bound'}; registration ${
              lanShareHealth.authPortBound ? 'bound' : 'not bound'
            }`}
          />
          <Field
            label="Receive directory"
            value={lanShareHealth.receiveDirectoryWritable ? 'Writable' : 'Not writable'}
          />
          <Field label="Network interfaces" value={String(lanShareHealth.interfaceCount)} />
        </section>
      )}

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

      <section className="flex flex-col gap-2 border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Support bundle</p>
        <p className="text-meta text-text-tertiary">
          Writes a local JSON support bundle with diagnostics, system metrics, network diagnostics,
          collector errors, and explicit redaction notes. It excludes vault secrets, provider keys,
          clipboard entries, memory content, workspace files, and environment variables.
        </p>
        <ControllerButton
          variant="secondary"
          disabled={creatingBundle}
          onClick={() => void handleCreateSupportBundle()}
        >
          {creatingBundle ? 'Creating support bundle...' : 'Create support bundle'}
        </ControllerButton>
        {bundleStatus && <p className="text-meta text-status-success">{bundleStatus}</p>}
        {bundleError && <p className="text-meta text-status-error">{bundleError}</p>}
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
