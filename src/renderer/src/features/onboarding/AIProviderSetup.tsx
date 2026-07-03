import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ModelProvider, ModelProviderKind } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxSpatialLockup } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { addModelProvider, listModelProviders } from '../../services/ipc/modelClient'

interface ProviderCategory {
  id: string
  name: string
  /** Only set for categories that map to a real backend provider kind. */
  kind?: ModelProviderKind
  capabilities: string
  privacy: string
  costControl: string
  supported: boolean
  reason?: string
}

const CATEGORIES: ProviderCategory[] = [
  {
    id: 'local-runtime',
    name: 'Local runtime',
    kind: 'ollama',
    capabilities: 'Chat · Code',
    privacy: 'On-device processing',
    costControl: 'No usage charges',
    supported: true
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI-compatible provider',
    kind: 'local-openai-compatible',
    capabilities: 'Chat · Code',
    privacy: 'Local or self-hosted',
    costControl: 'Depends on endpoint',
    supported: true
  },
  {
    id: 'cloud-coding',
    name: 'Cloud coding model',
    kind: 'cloud-openai-compatible',
    capabilities: 'Chat · Code',
    privacy: 'Cloud processing',
    costControl: 'API usage billing',
    supported: true
  },
  {
    id: 'speech',
    name: 'Speech provider',
    capabilities: 'Speech-to-text · Text-to-speech',
    privacy: 'Cloud or local',
    costControl: 'Not configured',
    supported: false,
    reason: 'Speech pipeline not built yet'
  },
  {
    id: 'vision',
    name: 'Vision provider',
    capabilities: 'Image understanding',
    privacy: 'Cloud or local',
    costControl: 'Not configured',
    supported: false,
    reason: 'Vision pipeline not built yet'
  },
  {
    id: 'embedding',
    name: 'Embedding provider',
    capabilities: 'Text embeddings',
    privacy: 'Cloud or local',
    costControl: 'Not configured',
    supported: false,
    reason: 'Embedding pipeline not built yet'
  }
]

/**
 * ND-005 AI Provider Setup.
 *
 * First-run onboarding screen for configuring the AI providers NeuroDeck will
 * route requests to. Reuses the real provider IPC from ND-035: credentials are
 * encrypted in the main process and the renderer only sees `hasApiKey`.
 *
 * Provider categories that already have backend support (local runtime,
 * OpenAI-compatible, cloud coding) can be configured here. Speech, vision, and
 * embedding providers are shown honestly disabled because those pipelines do
 * not exist yet — they are not hidden behind fake controls.
 */
export function AIProviderSetup(): React.JSX.Element {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [error, setError] = useState<string | null>(null)
  const [configuringId, setConfiguringId] = useState<string | null>(null)
  const [explainCategory, setExplainCategory] = useState<ProviderCategory | null>(null)
  const [addedCategoryId, setAddedCategoryId] = useState<string | null>(null)

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
  }, [addedCategoryId])

  const { ref: continueRef, isFocused: continueFocused } = useFocusable<HTMLButtonElement>({
    id: 'provider-setup:continue',
    groupId: 'provider-setup',
    priority: 1,
    initialFocus: true,
    onActivate: () => navigate('/onboarding/workspaces')
  })

  function isConnected(category: ProviderCategory): boolean {
    if (!category.supported) return false
    return providers.some((provider) => provider.kind === category.kind)
  }

  function handleConfigure(category: ProviderCategory): void {
    if (!category.supported) return
    setConfiguringId(category.id)
    setAddedCategoryId(null)
    setError(null)
  }

  function handleAdded(): void {
    setConfiguringId(null)
    setAddedCategoryId(configuringId)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-display font-semibold text-text-primary">AI Provider Setup</p>
        <p className="text-body text-text-secondary">
          Choose how NeuroDeck reaches AI models. You can skip this and add providers later from
          Settings.
        </p>
      </div>

      {error && <ErrorState title="Provider setup error" description={error} />}

      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
        {CATEGORIES.map((category) => {
          const connected = isConnected(category)
          const isConfiguring = configuringId === category.id
          return (
            <ProviderCategoryCard
              key={category.id}
              category={category}
              connected={connected}
              isConfiguring={isConfiguring}
              justAdded={addedCategoryId === category.id}
              onConfigure={() => handleConfigure(category)}
              onExplain={() => setExplainCategory(category)}
              onAdded={handleAdded}
              onError={setError}
              onCancel={() => setConfiguringId(null)}
            />
          )
        })}
      </div>

      <div className="flex gap-3">
        <ControllerButton
          ref={continueRef}
          variant="primary"
          className={continueFocused ? 'ring-2 ring-border-focus' : undefined}
          onClick={() => navigate('/onboarding/workspaces')}
        >
          Continue
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={() => navigate('/onboarding/workspaces')}>
          Skip for now
        </ControllerButton>
      </div>

      {explainCategory && (
        <ExplanationDialog category={explainCategory} onClose={() => setExplainCategory(null)} />
      )}
    </div>
  )
}

interface ProviderCategoryCardProps {
  category: ProviderCategory
  connected: boolean
  isConfiguring: boolean
  justAdded: boolean
  onConfigure: () => void
  onExplain: () => void
  onAdded: () => void
  onError: (message: string | null) => void
  onCancel: () => void
}

function ProviderCategoryCard({
  category,
  connected,
  isConfiguring,
  justAdded,
  onConfigure,
  onExplain,
  onAdded,
  onError,
  onCancel
}: ProviderCategoryCardProps): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLDivElement>({
    id: `provider-category:${category.id}`,
    groupId: 'provider-category',
    onActivate: category.supported ? onConfigure : onExplain
  })

  return (
    <div ref={ref} tabIndex={-1} className={category.supported ? '' : 'opacity-60'}>
      <NdxSpatialLockup selected={isFocused}>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-body font-semibold text-text-primary">{category.name}</p>
              <StatusBadge
                tone={connected ? 'success' : category.supported ? 'neutral' : 'error'}
                label={
                  connected
                    ? 'Connected'
                    : category.supported
                      ? justAdded
                        ? 'Added'
                        : 'Not connected'
                      : 'Not available'
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-meta text-text-secondary">
            <p>Capabilities: {category.capabilities}</p>
            <p>Privacy: {category.privacy}</p>
            <p>Cost control: {category.costControl}</p>
            {category.reason && <p className="text-status-error">{category.reason}</p>}
          </div>

          {isConfiguring && category.kind && (
            <AddProviderForm
              kind={category.kind}
              onAdded={onAdded}
              onError={onError}
              onCancel={onCancel}
            />
          )}

          {!isConfiguring && (
            <div className="mt-1 flex gap-2">
              <ControllerButton
                variant="primary"
                disabled={!category.supported}
                onClick={onConfigure}
                aria-label={`Configure ${category.name}`}
              >
                {connected ? 'Reconfigure' : 'Configure'}
              </ControllerButton>
              <ControllerButton
                variant="secondary"
                onClick={onExplain}
                aria-label={`Explain ${category.name}`}
              >
                Explain
              </ControllerButton>
              <ControllerButton variant="ghost" disabled>
                Advanced
              </ControllerButton>
            </div>
          )}
        </div>
      </NdxSpatialLockup>
    </div>
  )
}

function AddProviderForm({
  kind,
  onAdded,
  onError,
  onCancel
}: {
  kind: ModelProviderKind
  onAdded: () => void
  onError: (message: string | null) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  const isCloud = kind === 'cloud-openai-compatible'
  const defaultName =
    kind === 'ollama'
      ? 'Ollama'
      : kind === 'local-openai-compatible'
        ? 'Local provider'
        : 'Cloud provider'
  const placeholder =
    kind === 'ollama'
      ? 'http://localhost:11434/v1'
      : kind === 'local-openai-compatible'
        ? 'http://localhost:8000/v1'
        : 'https://api.openai.com/v1'

  async function handleAdd(): Promise<void> {
    setSaving(true)
    const result = await addModelProvider({
      name: name.trim() || defaultName,
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
    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Provider name"
        className="ndx-input p-2 text-body"
      />
      <input
        value={baseUrl}
        onChange={(event) => setBaseUrl(event.target.value)}
        placeholder={placeholder}
        className="ndx-input p-2 text-body"
      />
      {isCloud && (
        <>
          <p className="text-meta text-status-warning">
            Cloud providers send your requests to a third-party service over the network.
          </p>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="API key (stored encrypted, never shown again)"
            type="password"
            className="ndx-input p-2 text-body"
          />
        </>
      )}
      <div className="flex gap-2">
        <ControllerButton
          variant="primary"
          disabled={saving || !baseUrl.trim()}
          onClick={() => void handleAdd()}
        >
          {saving ? 'Saving…' : 'Save provider'}
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={onCancel}>
          Cancel
        </ControllerButton>
      </div>
    </div>
  )
}

function ExplanationDialog({
  category,
  onClose
}: {
  category: ProviderCategory
  onClose: () => void
}): React.JSX.Element {
  const explanations: Record<string, string> = {
    'local-runtime':
      'A local runtime like Ollama runs models on this device. Nothing leaves the Steam Deck, and there are no usage charges.',
    'openai-compatible':
      'Any server that implements the OpenAI-compatible chat API. This can be a self-hosted model on your local network.',
    'cloud-coding':
      'A cloud API such as OpenAI, Anthropic, or another OpenAI-compatible endpoint. Requests leave this device and may incur charges.',
    speech:
      'Speech providers convert voice to text and text to speech. This capability is not implemented yet.',
    vision: 'Vision providers understand images. This capability is not implemented yet.',
    embedding:
      'Embedding providers convert text into vectors for search and memory. This capability is not implemented yet.'
  }

  return (
    <ConfirmationDialog
      open
      title={category.name}
      action={explanations[category.id] ?? category.reason ?? 'No explanation available.'}
      confirmLabel="Close"
      onConfirm={onClose}
      onCancel={onClose}
    />
  )
}
