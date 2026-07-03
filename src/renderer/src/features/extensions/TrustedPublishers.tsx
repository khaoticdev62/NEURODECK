import { useEffect, useState } from 'react'
import type { TrustedPublisherRecord } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import {
  addTrustedPublisher,
  listTrustedPublishers,
  revokeTrustedPublisher,
  unrevokeTrustedPublisher
} from '../../services/ipc/trustedPublisherClient'

/**
 * Real Epic X15 trusted-publisher management (supplemental §39
 * "Extension signing" / "Update signature verification"). A
 * publisher added here is the only way `ExtensionRuntime.install()`
 * can ever mark a manifest `verified-publisher` instead of merely
 * `signed` — there is no real marketplace/CA this codebase queries,
 * so trust is explicit and local, never fabricated.
 */
export function TrustedPublishers(): React.JSX.Element {
  const [publishers, setPublishers] = useState<TrustedPublisherRecord[]>([])
  const [publisherName, setPublisherName] = useState('')
  const [publicKeyPem, setPublicKeyPem] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    const result = await listTrustedPublishers()
    if (result.ok) {
      setPublishers(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void listTrustedPublishers().then((result) => {
      if (!active) return
      if (result.ok) setPublishers(result.data)
      else setError(result.error.userMessage)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleAdd(): Promise<void> {
    if (!publisherName.trim() || !publicKeyPem.trim()) return
    const result = await addTrustedPublisher({
      publisherName: publisherName.trim(),
      publicKeyPem: publicKeyPem.trim()
    })
    if (result.ok) {
      setPublisherName('')
      setPublicKeyPem('')
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleToggleRevoked(publisher: TrustedPublisherRecord): Promise<void> {
    const result = publisher.revoked
      ? await unrevokeTrustedPublisher({ fingerprint: publisher.fingerprint })
      : await revokeTrustedPublisher({ fingerprint: publisher.fingerprint })
    if (result.ok) await refresh()
    else setError(result.error.userMessage)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Trusted Publishers</p>
      <p className="text-meta text-text-secondary">
        Extensions signed with a key listed here install as &ldquo;verified-publisher&rdquo; once
        their signature cryptographically checks out. Anything else stays at &ldquo;signed&rdquo; (a
        signature is present but from an unrecognized key) or &ldquo;unsigned.&rdquo;
      </p>

      {error && <ErrorState title="Trusted publisher error" description={error} />}

      <section className="flex flex-col gap-2 ndx-settings-section">
        <label className="text-meta font-semibold text-text-primary" htmlFor="publisher-name">
          Publisher name
        </label>
        <input
          id="publisher-name"
          value={publisherName}
          onChange={(event) => setPublisherName(event.target.value)}
          className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
        <label className="text-meta font-semibold text-text-primary" htmlFor="publisher-key">
          Public key (PEM)
        </label>
        <textarea
          id="publisher-key"
          value={publicKeyPem}
          onChange={(event) => setPublicKeyPem(event.target.value)}
          rows={4}
          className="rounded-md border border-border bg-canvas p-2 font-mono text-caption text-text-primary"
        />
        <ControllerButton
          variant="primary"
          disabled={!publisherName.trim() || !publicKeyPem.trim()}
          onClick={() => void handleAdd()}
        >
          Add Trusted Publisher
        </ControllerButton>
      </section>

      {publishers.length === 0 ? (
        <EmptyState
          title="No trusted publishers"
          description="Every signed extension currently installs at the 'signed' trust tier."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {publishers.map((publisher) => (
            <li
              key={publisher.fingerprint}
              className="flex items-center justify-between gap-3 ndx-settings-section"
            >
              <div className="min-w-0">
                <p className="truncate text-body font-semibold text-text-primary">
                  {publisher.publisherName}
                </p>
                <p className="truncate text-caption text-text-tertiary">{publisher.fingerprint}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={publisher.revoked ? 'error' : 'success'}
                  label={publisher.revoked ? 'Revoked' : 'Active'}
                />
                <ControllerButton
                  variant={publisher.revoked ? 'secondary' : 'destructive'}
                  onClick={() => void handleToggleRevoked(publisher)}
                >
                  {publisher.revoked ? 'Unrevoke' : 'Revoke'}
                </ControllerButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
