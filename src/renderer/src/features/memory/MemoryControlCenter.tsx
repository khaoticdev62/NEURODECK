import { useEffect, useState } from 'react'
import type { MemoryItem, MemoryScope, MemoryType } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import {
  clearMemoryScope,
  deleteMemory,
  exportMemory,
  getMemoryDisabledState,
  listMemory,
  setMemoryDisabled,
  updateMemory
} from '../../services/ipc/memoryClient'

const MEMORY_SCOPES: MemoryScope[] = [
  'turn',
  'conversation',
  'task',
  'workspace',
  'profile',
  'global'
]

const MEMORY_TYPES: MemoryType[] = [
  'user-preference',
  'workspace-convention',
  'tool-preference',
  'reusable-correction',
  'recent-task-state',
  'pinned-fact',
  'avoidance-rule'
]

interface EditFormState {
  content: string
  scope: MemoryScope
  pinned: boolean
  expiresInHours: string
}

function computeExpiresAt(hours: number): number | undefined {
  return hours > 0 ? Date.now() + hours * 3_600_000 : undefined
}

function toEditForm(item: MemoryItem): EditFormState {
  const hours = item.expiresAt
    ? Math.max(0, Math.round((item.expiresAt - Date.now()) / 3_600_000))
    : 0
  return {
    content: item.content,
    scope: item.scope,
    pinned: item.pinned,
    expiresInHours: hours > 0 ? String(hours) : ''
  }
}

/**
 * ND-X014 AI Memory Control Center + ND-X015 Memory Item Inspector
 * (supplemental spec §13), folded into one screen — the inspector is
 * the per-card inline edit panel rather than a separate route, the
 * same folding pattern already established elsewhere in this app
 * (e.g. Nearby Devices folding in Trusted Devices). `MemoryStore` and
 * its typed IPC were already real with no renderer consumer; this
 * closes that gap. There is deliberately no "add memory item" control
 * — spec §13.3's allowed-actions list (view/search/edit/pin/change
 * scope/expire/export/delete/disable category/disable all/exclude
 * workspace/clear conversation/clear global) never includes creating
 * one from this screen; memory items are written by the AI runtime as
 * it operates, not authored here. "Exclude workspace" (§13.3) is
 * honestly not built — `MemoryStore.write()` has no per-workspace
 * write-blocking mechanism today, only the real category/all-disable
 * flags this screen does expose.
 */
export function MemoryControlCenter(): React.JSX.Element {
  const [items, setItems] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<MemoryScope | 'all'>('all')
  const [status, setStatus] = useState<string | null>(null)

  const [allDisabled, setAllDisabled] = useState<boolean | null>(null)
  const [disabledTypes, setDisabledTypes] = useState<MemoryType[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [deleteReview, setDeleteReview] = useState<MemoryItem | null>(null)
  const [clearScopeReview, setClearScopeReview] = useState<'conversation' | 'global' | null>(null)

  async function refresh(): Promise<void> {
    const query = {
      ...(scopeFilter !== 'all' ? { scope: scopeFilter } : {}),
      ...(search ? { search } : {})
    }
    const result = await listMemory(query)
    if (result.ok) {
      setItems(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void Promise.all([listMemory(), getMemoryDisabledState()]).then(
      ([itemsResult, disabledResult]) => {
        if (!active) return
        if (itemsResult.ok) setItems(itemsResult.data)
        else setError(itemsResult.error.userMessage)
        if (disabledResult.ok) {
          setAllDisabled(disabledResult.data.allDisabled)
          setDisabledTypes(disabledResult.data.disabledTypes)
        }
        setLoading(false)
      }
    )
    return () => {
      active = false
    }
  }, [])

  async function handleSearch(value: string): Promise<void> {
    setSearch(value)
    const result = await listMemory({
      ...(scopeFilter !== 'all' ? { scope: scopeFilter } : {}),
      ...(value ? { search: value } : {})
    })
    if (result.ok) setItems(result.data)
    else setError(result.error.userMessage)
  }

  async function handleScopeFilter(value: MemoryScope | 'all'): Promise<void> {
    setScopeFilter(value)
    const result = await listMemory({
      ...(value !== 'all' ? { scope: value } : {}),
      ...(search ? { search } : {})
    })
    if (result.ok) setItems(result.data)
    else setError(result.error.userMessage)
  }

  async function handleToggleAllDisabled(): Promise<void> {
    if (allDisabled === null) return
    const next = !allDisabled
    const result = await setMemoryDisabled({ disabled: next })
    if (result.ok) setAllDisabled(next)
    else setError(result.error.userMessage)
  }

  async function handleToggleTypeDisabled(type: MemoryType): Promise<void> {
    const next = !disabledTypes.includes(type)
    const result = await setMemoryDisabled({ type, disabled: next })
    if (result.ok) {
      setDisabledTypes((current) =>
        next ? [...current, type] : current.filter((candidate) => candidate !== type)
      )
    } else {
      setError(result.error.userMessage)
    }
  }

  function handleStartEdit(item: MemoryItem): void {
    setEditingId(item.id)
    setEditForm(toEditForm(item))
  }

  async function handleSaveEdit(item: MemoryItem): Promise<void> {
    if (!editForm || !editForm.content.trim()) return
    const hours = Number(editForm.expiresInHours)
    const result = await updateMemory({
      id: item.id,
      content: editForm.content.trim(),
      scope: editForm.scope,
      pinned: editForm.pinned,
      expiresAt: editForm.expiresInHours.trim() ? computeExpiresAt(hours) : undefined
    })
    if (result.ok) {
      setEditingId(null)
      setEditForm(null)
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleTogglePin(item: MemoryItem): Promise<void> {
    const result = await updateMemory({ id: item.id, pinned: !item.pinned })
    if (result.ok) await refresh()
    else setError(result.error.userMessage)
  }

  async function handleDelete(item: MemoryItem): Promise<void> {
    setDeleteReview(null)
    const result = await deleteMemory({ id: item.id })
    if (result.ok) await refresh()
    else setError(result.error.userMessage)
  }

  async function handleClearScope(scope: 'conversation' | 'global'): Promise<void> {
    setClearScopeReview(null)
    const result = await clearMemoryScope({ scope })
    if (result.ok) {
      setStatus(`Cleared ${result.data} ${scope} memory item${result.data === 1 ? '' : 's'}.`)
      await refresh()
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleExport(): Promise<void> {
    const query = {
      ...(scopeFilter !== 'all' ? { scope: scopeFilter } : {}),
      ...(search ? { search } : {})
    }
    const result = await exportMemory(query)
    if (result.ok) {
      await navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))
      setStatus(`Copied ${result.data.itemCount} memory item(s) to clipboard as JSON.`)
    } else {
      setError(result.error.userMessage)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <p className="text-title font-semibold text-text-primary">AI Memory Control Center</p>
        <p className="text-meta text-text-tertiary">
          Inspect, edit, pin, and delete scoped AI memory. Memory writes are always attributable and
          never store secrets.
        </p>
      </div>

      {error && <ErrorState title="Memory error" description={error} />}
      {status && <p className="text-meta text-status-success">{status}</p>}

      <NdxSpatialLockup>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(event) => void handleSearch(event.target.value)}
              placeholder="Search memory content..."
              aria-label="Search memory"
              className="min-w-[16rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
            />
            <select
              value={scopeFilter}
              onChange={(event) =>
                void handleScopeFilter(event.target.value as MemoryScope | 'all')
              }
              aria-label="Filter by scope"
              className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
            >
              <option value="all">All scopes</option>
              {MEMORY_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
            <ControllerButton
              variant={allDisabled ? 'primary' : 'secondary'}
              disabled={allDisabled === null}
              onClick={() => void handleToggleAllDisabled()}
            >
              Disable all: {allDisabled === null ? '...' : allDisabled ? 'On' : 'Off'}
            </ControllerButton>
            <ControllerButton onClick={() => void handleExport()}>
              Export (copy JSON)
            </ControllerButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-text-tertiary">Disable category:</span>
            {MEMORY_TYPES.map((type) => (
              <ControllerButton
                key={type}
                variant={disabledTypes.includes(type) ? 'primary' : 'secondary'}
                onClick={() => void handleToggleTypeDisabled(type)}
              >
                {type}
              </ControllerButton>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <ControllerButton
              variant="destructive"
              onClick={() => setClearScopeReview('conversation')}
            >
              Clear conversation memory
            </ControllerButton>
            <ControllerButton variant="destructive" onClick={() => setClearScopeReview('global')}>
              Clear global memory
            </ControllerButton>
          </div>
        </div>
      </NdxSpatialLockup>

      {loading ? (
        <p className="text-meta text-text-secondary">Loading memory...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No memory items"
          description="Memory items appear here once the AI runtime writes attributable, scoped facts during use."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <NdxSpatialLockup key={item.id}>
              <article className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption font-semibold uppercase tracking-wide text-text-tertiary">
                    {item.scope} · {item.type}
                  </span>
                  {item.pinned && (
                    <span className="text-caption font-semibold text-status-info">Pinned</span>
                  )}
                </div>
                <p className="max-h-24 overflow-auto break-words text-meta text-text-secondary">
                  {item.content}
                </p>
                <p className="text-caption text-text-tertiary">
                  Attributed to {item.attributedTo} · {new Date(item.createdAt).toLocaleString()}
                  {item.expiresAt ? ` · expires ${new Date(item.expiresAt).toLocaleString()}` : ''}
                </p>

                {editingId === item.id && editForm && (
                  <div className="flex flex-col gap-2 border-t border-border pt-2">
                    <textarea
                      value={editForm.content}
                      onChange={(event) =>
                        setEditForm((form) =>
                          form ? { ...form, content: event.target.value } : form
                        )
                      }
                      aria-label={`Edit content for memory item ${item.id}`}
                      rows={3}
                      className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
                    />
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={editForm.scope}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form ? { ...form, scope: event.target.value as MemoryScope } : form
                          )
                        }
                        aria-label={`Edit scope for memory item ${item.id}`}
                        className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
                      >
                        {MEMORY_SCOPES.map((scope) => (
                          <option key={scope} value={scope}>
                            {scope}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={editForm.expiresInHours}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form ? { ...form, expiresInHours: event.target.value } : form
                          )
                        }
                        placeholder="Expires in hours"
                        aria-label={`Expires in hours for memory item ${item.id}`}
                        className="w-40 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-meta text-text-secondary">
                      <input
                        type="checkbox"
                        checked={editForm.pinned}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form ? { ...form, pinned: event.target.checked } : form
                          )
                        }
                      />
                      Pinned
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <ControllerButton
                        variant="primary"
                        disabled={!editForm.content.trim()}
                        onClick={() => void handleSaveEdit(item)}
                      >
                        Save changes
                      </ControllerButton>
                      <ControllerButton
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null)
                          setEditForm(null)
                        }}
                      >
                        Cancel
                      </ControllerButton>
                    </div>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <ControllerButton onClick={() => handleStartEdit(item)}>Edit</ControllerButton>
                  <ControllerButton
                    variant={item.pinned ? 'primary' : 'secondary'}
                    onClick={() => void handleTogglePin(item)}
                  >
                    {item.pinned ? 'Unpin' : 'Pin'}
                  </ControllerButton>
                  <ControllerButton variant="destructive" onClick={() => setDeleteReview(item)}>
                    Delete
                  </ControllerButton>
                </div>
              </article>
            </NdxSpatialLockup>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={deleteReview !== null}
        title="Delete memory item?"
        action="Delete this memory item."
        consequence="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteReview && void handleDelete(deleteReview)}
        onCancel={() => setDeleteReview(null)}
      />

      <ConfirmationDialog
        open={clearScopeReview !== null}
        title={`Clear ${clearScopeReview ?? ''} memory?`}
        action={`Delete every memory item in the "${clearScopeReview ?? ''}" scope.`}
        consequence="This cannot be undone."
        confirmLabel="Clear"
        onConfirm={() => clearScopeReview && void handleClearScope(clearScopeReview)}
        onCancel={() => setClearScopeReview(null)}
      />
    </div>
  )
}
