import { useEffect, useState } from 'react'
import type { ClipboardEntry, RenderedSnippet, Snippet, SnippetType } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import {
  clearClipboard,
  getClipboardMonitoring,
  listClipboardEntries,
  removeClipboardEntry,
  setClipboardMonitoring,
  setClipboardPinned
} from '../../services/ipc/clipboardClient'
import {
  listSnippets,
  removeSnippet,
  renderSnippet,
  upsertSnippet
} from '../../services/ipc/snippetClient'
import { useShareSheet } from '../../state/useShareSheet'

const SNIPPET_TYPES: SnippetType[] = [
  'text',
  'code',
  'shell',
  'prompt',
  'path',
  'url',
  'workflow-input',
  'structured-data'
]

const SNIPPET_TYPE_LABELS: Record<SnippetType, string> = {
  text: 'Text',
  code: 'Code',
  shell: 'Shell',
  prompt: 'Prompt',
  path: 'Path',
  url: 'URL',
  'workflow-input': 'Workflow input',
  'structured-data': 'Structured data'
}

const RISK_CLASSES: Record<string, string> = {
  low: 'text-status-info',
  medium: 'text-status-warning',
  high: 'text-status-warning',
  critical: 'text-status-error'
}

interface SnippetFormState {
  id: string | null
  name: string
  type: SnippetType
  content: string
}

const EMPTY_SNIPPET_FORM: SnippetFormState = { id: null, name: '', type: 'text', content: '' }

/**
 * ND-X022 Clipboard and Snippet Center (supplemental spec §17.1–17.3),
 * the one renderer screen the checklist named as the real remaining gap
 * for Epic X6 — `ClipboardStore`/`SnippetStore` and their typed IPC were
 * already real, just never surfaced. Reuses the existing real Share
 * Sheet for "send elsewhere" instead of building a second dispatcher.
 */
export function ClipboardSnippetCenter(): React.JSX.Element {
  const { openShareSheet } = useShareSheet()

  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const [search, setSearch] = useState('')
  const [monitoringEnabled, setMonitoringEnabledState] = useState<boolean | null>(null)
  const [clipboardLoading, setClipboardLoading] = useState(true)
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const [clearReview, setClearReview] = useState(false)
  const [removeEntryReview, setRemoveEntryReview] = useState<ClipboardEntry | null>(null)

  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [snippetsLoading, setSnippetsLoading] = useState(true)
  const [snippetsError, setSnippetsError] = useState<string | null>(null)
  const [snippetForm, setSnippetForm] = useState<SnippetFormState>(EMPTY_SNIPPET_FORM)
  const [removeSnippetReview, setRemoveSnippetReview] = useState<Snippet | null>(null)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})
  const [previewResult, setPreviewResult] = useState<RenderedSnippet | null>(null)
  const [previewSnippetId, setPreviewSnippetId] = useState<string | null>(null)

  const [status, setStatus] = useState<string | null>(null)

  async function refreshClipboard(query?: string): Promise<void> {
    const result = await listClipboardEntries(query ? { search: query } : undefined)
    if (result.ok) {
      setEntries(result.data)
      setClipboardError(null)
    } else {
      setClipboardError(result.error.userMessage)
    }
  }

  async function refreshSnippets(): Promise<void> {
    const result = await listSnippets()
    if (result.ok) {
      setSnippets(result.data)
      setSnippetsError(null)
    } else {
      setSnippetsError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void Promise.all([listClipboardEntries(), getClipboardMonitoring()]).then(
      ([entriesResult, monitoringResult]) => {
        if (!active) return
        if (entriesResult.ok) setEntries(entriesResult.data)
        else setClipboardError(entriesResult.error.userMessage)
        if (monitoringResult.ok) setMonitoringEnabledState(monitoringResult.data)
        setClipboardLoading(false)
      }
    )
    void listSnippets().then((result) => {
      if (!active) return
      if (result.ok) setSnippets(result.data)
      else setSnippetsError(result.error.userMessage)
      setSnippetsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleSearch(value: string): Promise<void> {
    setSearch(value)
    await refreshClipboard(value)
  }

  async function handleTogglePin(entry: ClipboardEntry): Promise<void> {
    const result = await setClipboardPinned({ id: entry.id, pinned: !entry.pinned })
    if (result.ok) await refreshClipboard(search)
    else setClipboardError(result.error.userMessage)
  }

  async function handleRemoveEntry(entry: ClipboardEntry): Promise<void> {
    setRemoveEntryReview(null)
    const result = await removeClipboardEntry({ id: entry.id })
    if (result.ok) await refreshClipboard(search)
    else setClipboardError(result.error.userMessage)
  }

  async function handleClearClipboard(): Promise<void> {
    setClearReview(false)
    const result = await clearClipboard()
    if (result.ok) await refreshClipboard(search)
    else setClipboardError(result.error.userMessage)
  }

  async function handleToggleMonitoring(): Promise<void> {
    if (monitoringEnabled === null) return
    const next = !monitoringEnabled
    const result = await setClipboardMonitoring({ enabled: next })
    if (result.ok) setMonitoringEnabledState(next)
    else setClipboardError(result.error.userMessage)
  }

  async function handleCopyEntry(entry: ClipboardEntry): Promise<void> {
    await navigator.clipboard.writeText(entry.content)
    setStatus('Copied to clipboard.')
  }

  function handleShareEntry(entry: ClipboardEntry): void {
    openShareSheet({ text: entry.content, sourceLabel: 'Clipboard entry' })
  }

  async function handleSaveSnippet(): Promise<void> {
    if (!snippetForm.name.trim() || !snippetForm.content.trim()) return
    const result = await upsertSnippet({
      id: snippetForm.id ?? crypto.randomUUID(),
      name: snippetForm.name.trim(),
      type: snippetForm.type,
      content: snippetForm.content
    })
    if (result.ok) {
      setSnippetForm(EMPTY_SNIPPET_FORM)
      await refreshSnippets()
    } else {
      setSnippetsError(result.error.userMessage)
    }
  }

  function handleEditSnippet(snippet: Snippet): void {
    setSnippetForm({
      id: snippet.id,
      name: snippet.name,
      type: snippet.type,
      content: snippet.content
    })
  }

  async function handleRemoveSnippet(snippet: Snippet): Promise<void> {
    setRemoveSnippetReview(null)
    if (previewSnippetId === snippet.id) {
      setPreviewSnippetId(null)
      setPreviewResult(null)
    }
    const result = await removeSnippet({ id: snippet.id })
    if (result.ok) await refreshSnippets()
    else setSnippetsError(result.error.userMessage)
  }

  function handleStartPreview(snippet: Snippet): void {
    setPreviewSnippetId(snippet.id)
    setPreviewResult(null)
    setPreviewValues(Object.fromEntries(snippet.variables.map((name) => [name, ''])))
  }

  async function handleRenderPreview(snippet: Snippet): Promise<void> {
    const result = await renderSnippet({ id: snippet.id, values: previewValues })
    if (result.ok) setPreviewResult(result.data)
    else setSnippetsError(result.error.userMessage)
  }

  async function handleCopyPreview(): Promise<void> {
    if (!previewResult) return
    await navigator.clipboard.writeText(previewResult.text)
    setStatus('Copied rendered snippet to clipboard.')
  }

  function handleSharePreview(): void {
    if (!previewResult) return
    openShareSheet({ text: previewResult.text, sourceLabel: 'Snippet' })
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <p className="text-title font-semibold text-text-primary">Clipboard and Snippet Center</p>
        <p className="text-meta text-text-tertiary">
          Manage recent clipboard history and reusable text/code/shell snippets.
        </p>
      </div>

      {status && <p className="text-meta text-status-success">{status}</p>}

      <section className="flex flex-col gap-3">
        <p className="text-body font-semibold text-text-primary">Clipboard History</p>
        {clipboardError && <ErrorState title="Clipboard error" description={clipboardError} />}

        <NdxSpatialLockup>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(event) => void handleSearch(event.target.value)}
              placeholder="Search clipboard history..."
              aria-label="Search clipboard history"
              className="min-w-[16rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
            />
            <ControllerButton
              variant={monitoringEnabled ? 'primary' : 'secondary'}
              disabled={monitoringEnabled === null}
              onClick={() => void handleToggleMonitoring()}
            >
              Monitoring: {monitoringEnabled === null ? '...' : monitoringEnabled ? 'On' : 'Off'}
            </ControllerButton>
            <ControllerButton variant="destructive" onClick={() => setClearReview(true)}>
              Clear history
            </ControllerButton>
          </div>
        </NdxSpatialLockup>

        {clipboardLoading ? (
          <p className="text-meta text-text-secondary">Loading clipboard history...</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No clipboard entries"
            description="Copy text on this device to see it appear here, or turn monitoring on if it's off."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <NdxSpatialLockup key={entry.id}>
                <article className="flex h-full flex-col gap-2">
                  <p className="max-h-24 overflow-auto break-words text-meta text-text-secondary">
                    {entry.content}
                  </p>
                  <p className="text-caption text-text-tertiary">
                    {new Date(entry.createdAt).toLocaleString()}
                    {entry.pinned ? ' · pinned' : ''}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <ControllerButton onClick={() => void handleCopyEntry(entry)}>
                      Copy
                    </ControllerButton>
                    <ControllerButton onClick={() => handleShareEntry(entry)}>
                      Share
                    </ControllerButton>
                    <ControllerButton
                      variant={entry.pinned ? 'primary' : 'secondary'}
                      onClick={() => void handleTogglePin(entry)}
                    >
                      {entry.pinned ? 'Unpin' : 'Pin'}
                    </ControllerButton>
                    <ControllerButton
                      variant="destructive"
                      onClick={() => setRemoveEntryReview(entry)}
                    >
                      Remove
                    </ControllerButton>
                  </div>
                </article>
              </NdxSpatialLockup>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-body font-semibold text-text-primary">Snippets</p>
        {snippetsError && <ErrorState title="Snippet error" description={snippetsError} />}

        <NdxSpatialLockup>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveSnippet()
            }}
          >
            <p className="text-meta font-semibold text-text-primary">
              {snippetForm.id ? 'Edit snippet' : 'New snippet'}
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={snippetForm.name}
                onChange={(event) =>
                  setSnippetForm((form) => ({ ...form, name: event.target.value }))
                }
                placeholder="Snippet name"
                aria-label="Snippet name"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <select
                value={snippetForm.type}
                onChange={(event) =>
                  setSnippetForm((form) => ({
                    ...form,
                    type: event.target.value as SnippetType
                  }))
                }
                aria-label="Snippet type"
                className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              >
                {SNIPPET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SNIPPET_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={snippetForm.content}
              onChange={(event) =>
                setSnippetForm((form) => ({ ...form, content: event.target.value }))
              }
              placeholder="Snippet content — use {{variable}} placeholders for reusable values"
              aria-label="Snippet content"
              rows={3}
              className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
            />
            <div className="flex flex-wrap gap-2">
              <ControllerButton
                type="submit"
                variant="primary"
                disabled={!snippetForm.name.trim() || !snippetForm.content.trim()}
              >
                {snippetForm.id ? 'Save changes' : 'Add snippet'}
              </ControllerButton>
              {snippetForm.id && (
                <ControllerButton
                  variant="ghost"
                  onClick={() => setSnippetForm(EMPTY_SNIPPET_FORM)}
                >
                  Cancel edit
                </ControllerButton>
              )}
            </div>
          </form>
        </NdxSpatialLockup>

        {snippetsLoading ? (
          <p className="text-meta text-text-secondary">Loading snippets...</p>
        ) : snippets.length === 0 ? (
          <EmptyState
            title="No snippets yet"
            description="Add reusable text, code, shell, prompt, or structured-data snippets above."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {snippets.map((snippet) => (
              <NdxSpatialLockup key={snippet.id}>
                <article className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body font-semibold text-text-primary">{snippet.name}</p>
                    <span className="text-caption uppercase tracking-wide text-text-tertiary">
                      {SNIPPET_TYPE_LABELS[snippet.type]}
                    </span>
                  </div>
                  {snippet.riskLevel && (
                    <p
                      className={`text-caption font-semibold uppercase tracking-wide ${
                        RISK_CLASSES[snippet.riskLevel] ?? 'text-text-tertiary'
                      }`}
                    >
                      Risk: {snippet.riskLevel}
                      {snippet.riskReason ? ` — ${snippet.riskReason}` : ''}
                    </p>
                  )}
                  <p className="max-h-24 overflow-auto break-words text-meta text-text-secondary">
                    {snippet.content}
                  </p>

                  {previewSnippetId === snippet.id && (
                    <div className="flex flex-col gap-2 border-t border-border pt-2">
                      {snippet.variables.map((name) => (
                        <input
                          key={name}
                          type="text"
                          value={previewValues[name] ?? ''}
                          onChange={(event) =>
                            setPreviewValues((values) => ({
                              ...values,
                              [name]: event.target.value
                            }))
                          }
                          placeholder={name}
                          aria-label={`Value for ${name}`}
                          className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
                        />
                      ))}
                      <ControllerButton onClick={() => void handleRenderPreview(snippet)}>
                        Preview
                      </ControllerButton>
                      {previewResult && (
                        <div className="flex flex-col gap-1">
                          <p className="whitespace-pre-wrap break-words text-meta text-text-secondary">
                            {previewResult.text}
                          </p>
                          {previewResult.missingVariables.length > 0 && (
                            <p className="text-caption text-status-warning">
                              Missing values: {previewResult.missingVariables.join(', ')}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <ControllerButton onClick={() => void handleCopyPreview()}>
                              Copy rendered text
                            </ControllerButton>
                            <ControllerButton onClick={handleSharePreview}>Share</ControllerButton>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2">
                    <ControllerButton onClick={() => handleStartPreview(snippet)}>
                      {snippet.variables.length > 0 ? 'Fill variables' : 'Preview'}
                    </ControllerButton>
                    <ControllerButton onClick={() => handleEditSnippet(snippet)}>
                      Edit
                    </ControllerButton>
                    <ControllerButton
                      variant="destructive"
                      onClick={() => setRemoveSnippetReview(snippet)}
                    >
                      Delete
                    </ControllerButton>
                  </div>
                </article>
              </NdxSpatialLockup>
            ))}
          </div>
        )}
      </section>

      <ConfirmationDialog
        open={clearReview}
        title="Clear clipboard history?"
        action="Remove every unpinned clipboard entry."
        scope="This device's clipboard history only."
        consequence="Pinned entries are kept. This cannot be undone."
        confirmLabel="Clear history"
        onConfirm={() => void handleClearClipboard()}
        onCancel={() => setClearReview(false)}
      />

      <ConfirmationDialog
        open={removeEntryReview !== null}
        title="Remove clipboard entry?"
        action="Remove this entry from clipboard history."
        consequence="This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => removeEntryReview && void handleRemoveEntry(removeEntryReview)}
        onCancel={() => setRemoveEntryReview(null)}
      />

      <ConfirmationDialog
        open={removeSnippetReview !== null}
        title="Delete snippet?"
        action={`Delete "${removeSnippetReview?.name ?? ''}".`}
        consequence="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => removeSnippetReview && void handleRemoveSnippet(removeSnippetReview)}
        onCancel={() => setRemoveSnippetReview(null)}
      />
    </div>
  )
}
