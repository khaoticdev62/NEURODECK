import { useEffect, useState } from 'react'
import type { VaultAccessLogEntry, VaultItem, VaultItemType } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import {
  createVaultItem,
  deleteVaultItem,
  listVaultAccessLog,
  listVaultItems,
  revealVaultItem,
  rotateVaultItem
} from '../../services/ipc/vaultClient'
import { useKioskMode } from '../../state/useKioskMode'
import { usePresentationMode } from '../../state/usePresentationMode'

const ITEM_TYPE_LABELS: Record<VaultItemType, string> = {
  'api-credential': 'API credential',
  'ssh-key-reference': 'SSH key reference',
  certificate: 'Certificate',
  passphrase: 'Passphrase',
  'oauth-token': 'OAuth token',
  'provider-secret': 'Provider secret',
  'remote-host-credential': 'Remote host credential',
  'signing-key-reference': 'Signing key reference',
  'encryption-key': 'Encryption key'
}

const ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as VaultItemType[]
const CLIPBOARD_CLEAR_MS = 20_000

/**
 * Epic X10 Secrets Vault (supplemental spec §31), scoped to a
 * reference-based vault for opaque secret strings. Sits behind
 * `ShellLayout`'s existing full-screen Lock Screen gate like every
 * other route — there is no separate IPC-level lock check anywhere in
 * this codebase, so this screen does not invent one uniquely for
 * itself. "Reveal" is a distinct, explicit action from listing (spec
 * §31.2 "Copy requires explicit reveal/copy action"); copying a
 * revealed secret schedules a real clipboard auto-clear rather than
 * leaving it there indefinitely.
 */
export function Vault(): React.JSX.Element {
  const { enabled: presentationModeEnabled } = usePresentationMode()
  const { enabled: kioskModeEnabled } = useKioskMode()
  const [items, setItems] = useState<VaultItem[]>([])
  const [accessLog, setAccessLog] = useState<VaultAccessLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteReview, setDeleteReview] = useState<VaultItem | null>(null)
  const [revealed, setRevealed] = useState<Record<string, string>>({})

  async function refresh(): Promise<void> {
    const [itemsResult, logResult] = await Promise.all([listVaultItems(), listVaultAccessLog()])
    if (itemsResult.ok) setItems(itemsResult.data)
    if (logResult.ok) setAccessLog(logResult.data)
    if (!itemsResult.ok) setError(itemsResult.error.userMessage)
    else setError(null)
  }

  useEffect(() => {
    let active = true
    void Promise.all([listVaultItems(), listVaultAccessLog()]).then(([itemsResult, logResult]) => {
      if (!active) return
      if (itemsResult.ok) setItems(itemsResult.data)
      else setError(itemsResult.error.userMessage)
      if (logResult.ok) setAccessLog(logResult.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleCreate(input: {
    type: VaultItemType
    label: string
    secret: string
    notes: string
  }): Promise<void> {
    const result = await createVaultItem({
      type: input.type,
      label: input.label,
      secret: input.secret,
      notes: input.notes || undefined
    })
    if (result.ok) {
      setCreating(false)
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleReveal(item: VaultItem): Promise<void> {
    const result = await revealVaultItem({ id: item.id })
    if (result.ok) {
      setRevealed((current) => ({ ...current, [item.id]: result.data.secret }))
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleCopy(itemId: string, secret: string): Promise<void> {
    await navigator.clipboard.writeText(secret)
    setTimeout(() => {
      void navigator.clipboard.readText().then((current) => {
        if (current === secret) void navigator.clipboard.writeText('')
      })
    }, CLIPBOARD_CLEAR_MS)
    setRevealed((current) => {
      const next = { ...current }
      delete next[itemId]
      return next
    })
  }

  async function handleRotate(item: VaultItem, newSecret: string): Promise<void> {
    const result = await rotateVaultItem({ id: item.id, newSecret })
    if (result.ok) await refresh()
    else setError(result.error.userMessage)
  }

  async function handleDelete(item: VaultItem): Promise<void> {
    setDeleteReview(null)
    const result = await deleteVaultItem({ id: item.id })
    if (result.ok) {
      setRevealed((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Secrets Vault</p>
          <p className="text-meta text-text-secondary">
            Encrypted at rest. Reveal and copy are explicit, audited actions.
          </p>
        </div>
        <ControllerButton variant="primary" onClick={() => setCreating(true)} disabled={creating}>
          Add Secret
        </ControllerButton>
      </header>

      {error && <ErrorState title="Vault request failed" description={error} />}

      {creating && (
        <CreateItemForm
          onCancel={() => setCreating(false)}
          onSubmit={(input) => void handleCreate(input)}
        />
      )}

      <section className="grid gap-3 overflow-auto">
        {loading ? (
          <p className="text-meta text-text-secondary">Loading vault...</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="Vault is empty"
            description="Add a credential, key reference, or other secret to store it encrypted at rest."
          />
        ) : (
          items.map((item) => (
            <VaultItemCard
              key={item.id}
              item={item}
              revealedSecret={revealed[item.id]}
              revealDisabled={presentationModeEnabled || kioskModeEnabled}
              onReveal={() => void handleReveal(item)}
              onCopy={(secret) => void handleCopy(item.id, secret)}
              onRotate={(newSecret) => void handleRotate(item, newSecret)}
              onDelete={() => setDeleteReview(item)}
            />
          ))
        )}
      </section>

      {accessLog.length > 0 && (
        <section className="border border-border bg-surface p-3">
          <p className="text-meta font-semibold text-text-primary">Access log</p>
          <ul className="mt-2 grid gap-1 text-caption text-text-tertiary">
            {accessLog
              .slice(-10)
              .reverse()
              .map((entry) => (
                <li key={entry.id}>
                  {new Date(entry.timestamp).toLocaleString()} — {entry.action} &ldquo;
                  {entry.itemLabel}&rdquo;
                </li>
              ))}
          </ul>
        </section>
      )}

      <ConfirmationDialog
        open={deleteReview !== null}
        title="Delete vault item"
        action={`Delete "${deleteReview?.label ?? 'this item'}"`}
        scope={deleteReview ? ITEM_TYPE_LABELS[deleteReview.type] : undefined}
        consequence="The encrypted secret is permanently removed and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteReview) void handleDelete(deleteReview)
        }}
        onCancel={() => setDeleteReview(null)}
      />
    </div>
  )
}

function CreateItemForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (input: { type: VaultItemType; label: string; secret: string; notes: string }) => void
  onCancel: () => void
}): React.JSX.Element {
  const [type, setType] = useState<VaultItemType>('api-credential')
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <section className="flex flex-col gap-2 border border-border bg-surface p-3">
      <p className="text-meta font-semibold text-text-primary">Add a new secret</p>
      <select
        value={type}
        onChange={(event) => setType(event.target.value as VaultItemType)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        {ITEM_TYPES.map((value) => (
          <option key={value} value={value}>
            {ITEM_TYPE_LABELS[value]}
          </option>
        ))}
      </select>
      <input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Label (e.g. Production API key)"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <textarea
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
        placeholder="Secret value"
        rows={3}
        className="rounded-md border border-border bg-canvas p-2 font-mono text-body text-text-primary"
      />
      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes (optional)"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <div className="flex gap-2">
        <ControllerButton variant="ghost" onClick={onCancel}>
          Cancel
        </ControllerButton>
        <ControllerButton
          variant="primary"
          disabled={!label.trim() || !secret.trim()}
          onClick={() => onSubmit({ type, label: label.trim(), secret, notes: notes.trim() })}
        >
          Save
        </ControllerButton>
      </div>
    </section>
  )
}

function VaultItemCard({
  item,
  revealedSecret,
  revealDisabled,
  onReveal,
  onCopy,
  onRotate,
  onDelete
}: {
  item: VaultItem
  revealedSecret: string | undefined
  revealDisabled: boolean
  onReveal: () => void
  onCopy: (secret: string) => void
  onRotate: (newSecret: string) => void
  onDelete: () => void
}): React.JSX.Element {
  const [rotating, setRotating] = useState(false)
  const [newSecret, setNewSecret] = useState('')

  return (
    <article className="border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-meta font-semibold text-text-primary">{item.label}</p>
          <p className="text-meta text-text-secondary">{ITEM_TYPE_LABELS[item.type]}</p>
          {item.notes && <p className="mt-1 text-caption text-text-tertiary">{item.notes}</p>}
          <p className="mt-1 text-caption text-text-tertiary">
            Updated {new Date(item.updatedAt).toLocaleDateString()}
            {item.lastAccessedAt
              ? ` · last revealed ${new Date(item.lastAccessedAt).toLocaleDateString()}`
              : ' · never revealed'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {item.isExpired && <span className="text-caption text-status-error">Expired</span>}
          {item.needsRotation && (
            <span className="text-caption text-status-warning">Rotation due</span>
          )}
        </div>
      </div>

      {revealedSecret !== undefined && (
        <p className="mt-2 break-all rounded-md bg-canvas p-2 font-mono text-meta text-text-primary">
          {revealedSecret}
        </p>
      )}

      {rotating && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={newSecret}
            onChange={(event) => setNewSecret(event.target.value)}
            placeholder="New secret value"
            rows={2}
            className="rounded-md border border-border bg-canvas p-2 font-mono text-body text-text-primary"
          />
          <div className="flex gap-2">
            <ControllerButton variant="ghost" onClick={() => setRotating(false)}>
              Cancel
            </ControllerButton>
            <ControllerButton
              variant="primary"
              disabled={!newSecret.trim()}
              onClick={() => {
                onRotate(newSecret)
                setNewSecret('')
                setRotating(false)
              }}
            >
              Rotate
            </ControllerButton>
          </div>
        </div>
      )}

      {revealDisabled && revealedSecret === undefined && (
        <p className="mt-2 text-caption text-status-warning">
          Reveal is disabled while Presentation Mode or Kiosk Mode is active.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {revealedSecret === undefined ? (
          <ControllerButton onClick={onReveal} disabled={revealDisabled}>
            Reveal
          </ControllerButton>
        ) : (
          <ControllerButton onClick={() => onCopy(revealedSecret)}>Copy</ControllerButton>
        )}
        <ControllerButton onClick={() => setRotating((current) => !current)}>
          Rotate
        </ControllerButton>
        <ControllerButton variant="destructive" onClick={onDelete}>
          Delete
        </ControllerButton>
      </div>
    </article>
  )
}
