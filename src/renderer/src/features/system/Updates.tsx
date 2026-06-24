import { useEffect, useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { checkForUpdates, getUpdateStatus } from '../../services/ipc/updateClient'
import type { UpdateStatus } from '@shared/contracts'

interface UpdateSection {
  id: string
  name: string
  currentVersion: string
  note: string
}

const SECTIONS: UpdateSection[] = [
  {
    id: 'app',
    name: 'NeuroDeck app',
    currentVersion: 'See status panel',
    note: 'Application update check'
  },
  {
    id: 'core',
    name: 'Core service',
    currentVersion: 'n/a',
    note: 'No separate core-service process in this architecture.'
  },
  {
    id: 'controller',
    name: 'Controller profiles',
    currentVersion: 'n/a',
    note: 'Profile store is not implemented yet.'
  },
  {
    id: 'model',
    name: 'Model runtime',
    currentVersion: 'n/a',
    note: 'Managed by configured providers.'
  },
  {
    id: 'plugins',
    name: 'Plugins',
    currentVersion: 'n/a',
    note: 'Plugin system is not implemented yet.'
  },
  {
    id: 'templates',
    name: 'Workflow templates',
    currentVersion: 'n/a',
    note: 'Template registry is not implemented yet.'
  }
]

/**
 * ND-049 Updates. Shows current version info and can check a configured update
 * feed. Download, apply, and rollback are honestly disabled because the signed
 * release pipeline is not configured.
 */
export function Updates(): React.JSX.Element {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let active = true
    void getUpdateStatus().then((result) => {
      if (!active) return
      if (result.ok) {
        setStatus(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleCheck(): Promise<void> {
    setChecking(true)
    const result = await checkForUpdates()
    setChecking(false)
    if (result.ok) {
      setStatus(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <header>
        <p className="text-title font-semibold text-text-primary">Updates</p>
        <p className="text-body text-text-secondary">
          Current versions are shown below. The full download/apply/rollback flow is disabled until
          a signed release pipeline is configured.
        </p>
      </header>

      {error && <ErrorState title="Update check error" description={error} />}

      {status && (
        <section className="space-y-2 border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-semibold text-text-primary">NeuroDeck app</p>
              <p className="text-meta text-text-secondary">
                Current version: {status.currentVersion}
                {status.latestVersion && ` · Latest: ${status.latestVersion}`}
              </p>
              {status.updateAvailable && status.changelog && (
                <p className="text-meta text-text-secondary">Changelog: {status.changelog}</p>
              )}
              {status.compatibility && (
                <p className="text-meta text-text-secondary">
                  Compatibility: {status.compatibility}
                </p>
              )}
              {status.reason && <p className="text-meta text-text-secondary">{status.reason}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <ControllerButton
                variant="primary"
                disabled={checking}
                onClick={() => void handleCheck()}
              >
                {checking ? 'Checking…' : 'Check for updates'}
              </ControllerButton>
              <ControllerButton variant="secondary" disabled>
                Download and apply
              </ControllerButton>
            </div>
          </div>
          {!status.checkEnabled && (
            <p className="text-meta text-status-warning">
              Update checking is disabled: {status.reason}
            </p>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.id} className="space-y-1 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">{section.name}</p>
            <p className="text-meta text-text-secondary">{section.note}</p>
            <p className="text-meta text-text-tertiary">
              Current version: {section.currentVersion}
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
