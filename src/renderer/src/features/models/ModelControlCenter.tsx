import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ModelProvider, ModelProviderKind } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  addModelProvider,
  listModelProviders,
  removeModelProvider,
  setModelProviderEnabled,
  testModelProviderConnection
} from '../../services/ipc/modelClient'

/**
 * ND-035 Model Control Center, scoped to "Connected providers" — the only
 * section with a real backing service. There is no bundled local model
 * runtime (no Ollama/llama.cpp wrapper), so "Active models"/"Installed
 * local models" don't apply the way the spec's card mockup implies;
 * connecting to a local provider (e.g. Ollama at
 * `http://localhost:11434/v1`) and discovering its real models via the
 * OpenAI-compatible `/models` endpoint is the honest equivalent.
 * Downloads, Capability matrix (beyond what a provider's real response
 * reports), Resource use, and Routing profiles are deferred — Routing
 * profiles specifically need real measured resource data (battery,
 * thermal, memory pressure) from a System Metrics Service that doesn't
 * exist yet (Epic 11 §27).
 */
export function ModelControlCenter(): React.JSX.Element {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    let active = true
    void listModelProviders().then((result) => {
      if (!active) return
      if (result.ok) {
        setProviders(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function refresh(): Promise<void> {
    const result = await listModelProviders()
    if (result.ok) setProviders(result.data)
  }

  async function handleRemove(providerId: string): Promise<void> {
    const result = await removeModelProvider({ providerId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setProviders((current) => current.filter((provider) => provider.id !== providerId))
  }

  async function handleToggle(provider: ModelProvider): Promise<void> {
    const result = await setModelProviderEnabled({
      providerId: provider.id,
      enabled: !provider.enabled
    })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setProviders((current) => current.map((item) => (item.id === provider.id ? result.data : item)))
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Model Control Center</p>
        <div className="flex gap-2">
          <ControllerButton
            variant="secondary"
            onClick={() => navigate('/models/routing-profiles')}
          >
            Routing profiles
          </ControllerButton>
          <ControllerButton variant="primary" onClick={() => setShowAddForm((current) => !current)}>
            {showAddForm ? 'Cancel' : 'Add provider'}
          </ControllerButton>
        </div>
      </div>

      {error && <ErrorState title="Model provider error" description={error} />}

      {showAddForm && (
        <AddProviderForm
          onAdded={() => {
            setShowAddForm(false)
            void refresh()
          }}
          onError={setError}
        />
      )}

      {providers.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No providers connected"
          description="Add a local (e.g. Ollama) or cloud OpenAI-compatible provider to discover its real models."
        />
      ) : (
        <ul className="flex flex-col gap-2 overflow-auto">
          {providers.map((provider) => (
            <ProviderRow
              key={provider.id}
              provider={provider}
              onOpen={() => navigate(`/models/${provider.id}`)}
              onRemove={() => void handleRemove(provider.id)}
              onToggle={() => void handleToggle(provider)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AddProviderForm({
  onAdded,
  onError
}: {
  onAdded: () => void
  onError: (message: string | null) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ModelProviderKind>('local-openai-compatible')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(): Promise<void> {
    setSaving(true)
    const result = await addModelProvider({
      name: name.trim() || 'New provider',
      kind,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined
    })
    setSaving(false)
    if (!result.ok) {
      onError(result.error.userMessage)
      return
    }
    onError(null)
    onAdded()
  }

  return (
    <div className="flex flex-col gap-2 border border-border bg-surface p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Provider name"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <select
        value={kind}
        onChange={(event) => setKind(event.target.value as ModelProviderKind)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        <option value="local-openai-compatible">Local (e.g. Ollama)</option>
        <option value="ollama">Ollama (managed runtime)</option>
        <option value="cloud-openai-compatible">Cloud</option>
      </select>
      <input
        value={baseUrl}
        onChange={(event) => setBaseUrl(event.target.value)}
        placeholder="Base URL (e.g. http://localhost:11434/v1)"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      {kind === 'cloud-openai-compatible' && (
        <>
          <p className="text-meta text-status-warning">
            Cloud providers send your requests to a third-party service over the network.
          </p>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="API key (stored encrypted, never sent to the renderer)"
            type="password"
            className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
          />
        </>
      )}
      <ControllerButton
        variant="primary"
        disabled={saving || !baseUrl.trim()}
        onClick={() => void handleAdd()}
      >
        {saving ? 'Adding…' : 'Add provider'}
      </ControllerButton>
    </div>
  )
}

function ProviderRow({
  provider,
  onOpen,
  onRemove,
  onToggle
}: {
  provider: ModelProvider
  onOpen: () => void
  onRemove: () => void
  onToggle: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `model-provider:${provider.id}`,
    groupId: 'model-control-center',
    onActivate: onOpen
  })
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  async function handleTest(): Promise<void> {
    setTesting(true)
    const result = await testModelProviderConnection({ providerId: provider.id })
    setTesting(false)
    setTestResult(result.ok ? result.data.message : result.error.userMessage)
  }

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={`border p-3 ${isFocused ? 'border-border-focus' : 'border-border'} bg-surface`}
    >
      <p className="text-body font-semibold text-text-primary">{provider.name}</p>
      <p className="text-meta text-text-secondary">
        {provider.kind === 'cloud-openai-compatible' ? 'Cloud' : 'Local'} · {provider.baseUrl}
        {provider.hasApiKey ? ' · API key set' : ''}
        {provider.enabled ? ' · Enabled' : ' · Disabled'}
      </p>
      {testResult && <p className="text-meta text-text-tertiary">{testResult}</p>}
      <div className="mt-2 flex gap-2">
        <ControllerButton variant="primary" disabled={testing} onClick={() => void handleTest()}>
          {testing ? 'Testing…' : 'Test connection'}
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={onOpen}>
          Open
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={onRemove}>
          Remove
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={onToggle}>
          {provider.enabled ? 'Disable' : 'Enable'}
        </ControllerButton>
      </div>
    </li>
  )
}
