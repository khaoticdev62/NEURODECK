import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type {
  ConnectionTestResult,
  LocalModelStatus,
  ModelBenchmarkResult,
  ModelProvider
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxFocusSurface, NdxToolWindow } from '../../components/workbench'
import {
  benchmarkLocalModel,
  getLocalModelStatus,
  listModelProviders,
  loadLocalModel,
  removeModelProvider,
  testModelProviderConnection,
  unloadLocalModel
} from '../../services/ipc/modelClient'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

export function ModelDetail(): React.JSX.Element {
  const { providerId } = useParams<{ providerId: string }>()
  const navigate = useNavigate()
  const [provider, setProvider] = useState<ModelProvider | null>(null)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [runtime, setRuntime] = useState<LocalModelStatus | null>(null)
  const [benchmark, setBenchmark] = useState<ModelBenchmarkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void listModelProviders().then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) return setError(result.error.userMessage)
      const found = result.data.find((candidate) => candidate.id === providerId) ?? null
      setProvider(found)
      if (!found) setError('That provider no longer exists.')
    })
    return () => {
      active = false
    }
  }, [providerId])

  async function refreshRuntime(): Promise<void> {
    if (!providerId || provider?.kind !== 'ollama') return
    const status = await getLocalModelStatus({ providerId })
    if (status.ok) setRuntime(status.data)
  }

  async function handleTest(): Promise<void> {
    if (!providerId) return
    setBusy(true)
    const result = await testModelProviderConnection({ providerId })
    if (result.ok) {
      setTestResult(result.data)
      setError(null)
      await refreshRuntime()
    } else setError(result.error.userMessage)
    setBusy(false)
  }

  async function handleRuntime(
    action: 'load' | 'unload' | 'benchmark',
    modelId: string
  ): Promise<void> {
    if (!providerId) return
    setBusy(true)
    const request = { providerId, modelId }
    const result =
      action === 'load'
        ? await loadLocalModel(request)
        : action === 'unload'
          ? await unloadLocalModel(request)
          : await benchmarkLocalModel(request)
    if (!result.ok) setError(result.error.userMessage)
    else if (action === 'benchmark' && result.data) setBenchmark(result.data)
    await refreshRuntime()
    setBusy(false)
  }

  async function handleRemove(): Promise<void> {
    if (!providerId) return
    const result = await removeModelProvider({ providerId })
    if (result.ok) navigate('/models')
    else setError(result.error.userMessage)
  }



  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    if (!provider) return
    setPrimary(
      'Provider',
      provider.kind === 'cloud-openai-compatible' ? 'Cloud' : 'Local',
      <NdxToolWindow
        title="Provider"
        subtitle={provider.kind === 'cloud-openai-compatible' ? 'Cloud' : 'Local'}
      >
        <p className="text-body font-semibold text-text-primary">{provider.name}</p>
        <p className="break-all text-meta text-text-secondary">{provider.baseUrl}</p>
        <ControllerButton variant="ghost" onClick={() => navigate('/models')}>
          Back
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={() => void handleRemove()}>
          Remove provider
        </ControllerButton>
      </NdxToolWindow>
    )
    return () => setPrimary('Command Deck', undefined, null)
  }, [provider, navigate, setPrimary])

  useEffect(() => {
    if (!provider) return
    setSecondary(
      <NdxToolWindow
        title="Provider Policy"
        subtitle={provider.enabled ? 'Enabled' : 'Disabled'}
        side="right"
      >
        <div>
          <p className="text-meta font-semibold text-text-primary">Credential</p>
          <p className="text-meta text-text-tertiary">
            {provider.hasApiKey
              ? 'API key stored with OS-backed encryption'
              : 'No API key configured'}
          </p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Created</p>
          <p className="text-meta text-text-tertiary">
            {new Date(provider.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Runtime controls</p>
          <p className="text-meta text-text-tertiary">
            Load, unload, and benchmark actions are shown only for managed Ollama runtimes that
            report support.
          </p>
        </div>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [provider, setSecondary])

  if (loading) return <p className="p-4 text-meta text-text-secondary">Loading...</p>
  if (!provider)
    return <ErrorState title="Provider not found" description={error ?? 'Unknown provider.'} />

  return (
    <div className="h-full flex-1">
      <NdxEditorShell title="Model Provider Detail">
        <div className="flex min-h-full flex-col gap-3 p-3">
          {error && <ErrorState title="Model provider error" description={error} />}

          <NdxFocusSurface active density="comfortable" className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-text-primary">Models and capabilities</p>
                <p className="text-meta text-text-tertiary">
                  Probe the real endpoint to discover models. Capabilities are not inferred from
                  model names.
                </p>
              </div>
              <ControllerButton variant="primary" disabled={busy} onClick={() => void handleTest()}>
                {busy ? 'Working...' : 'Probe provider'}
              </ControllerButton>
            </div>
          </NdxFocusSurface>

          {testResult && <p className="text-meta text-text-secondary">{testResult.message}</p>}
          {testResult?.models.map((model) => (
            <div
              key={model.id}
              className="flex flex-wrap items-center justify-between gap-2 ndx-settings-section"
            >
              <span className="text-meta text-text-primary">
                {model.id}
                {runtime?.runningModelIds.includes(model.id) ? ' - Loaded' : ''}
              </span>
              {provider.kind === 'ollama' && runtime?.supported && (
                <span className="flex gap-1">
                  <ControllerButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void handleRuntime('load', model.id)}
                  >
                    Load
                  </ControllerButton>
                  <ControllerButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void handleRuntime('unload', model.id)}
                  >
                    Unload
                  </ControllerButton>
                  <ControllerButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void handleRuntime('benchmark', model.id)}
                  >
                    Benchmark
                  </ControllerButton>
                </span>
              )}
            </div>
          ))}
          {provider.kind === 'ollama' && runtime && !runtime.supported && (
            <p className="text-meta text-status-warning">
              Runtime controls unavailable: {runtime.reason}
            </p>
          )}
          {benchmark && (
            <section className="ndx-settings-section text-meta text-text-secondary">
              Measured benchmark for {benchmark.modelId}: {benchmark.durationMs} ms
              {benchmark.tokensPerSecond !== undefined
                ? ` - ${benchmark.tokensPerSecond.toFixed(1)} tok/s`
                : ' - token timing not reported'}
            </section>
          )}
        </div>
      </NdxEditorShell>
    </div>
  )
}
