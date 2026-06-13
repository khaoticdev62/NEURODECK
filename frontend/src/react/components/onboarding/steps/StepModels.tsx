import { Loader2, Play, Eye, EyeOff } from 'lucide-react';
import type { AIProvider } from '../../../types/neurodeck';

interface TestResult {
  success: boolean;
  message: string;
}

interface StepModelsProps {
  providerType: AIProvider | 'skip';
  endpointUrl: string;
  modelId: string;
  apiKey: string;
  showApiKey: boolean;
  testingConnection: boolean;
  testResult: TestResult | null;
  onProviderChange: (p: AIProvider | 'skip') => void;
  onEndpointChange: (url: string) => void;
  onModelIdChange: (id: string) => void;
  onApiKeyChange: (key: string) => void;
  onToggleShowApiKey: () => void;
  onTestConnection: () => void;
}

export function StepModels({
  providerType,
  endpointUrl,
  modelId,
  apiKey,
  showApiKey,
  testingConnection,
  testResult,
  onProviderChange,
  onEndpointChange,
  onModelIdChange,
  onApiKeyChange,
  onToggleShowApiKey,
  onTestConnection,
}: StepModelsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-nd-text">AI Provider Setup</h2>
        <p className="text-xs text-nd-text-muted">Link your local or remote LLM endpoint sources.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-nd-text">Provider Type</label>
            <select
              data-controller-default="true"
              value={providerType}
              onChange={(e) => onProviderChange(e.target.value as AIProvider | 'skip')}
              className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="lmstudio">LM Studio (Local)</option>
              <option value="openai_compat">OpenAI-Compatible Endpoint</option>
              <option value="skip">Skip / Offline planning engine</option>
            </select>
          </div>

          {providerType !== 'skip' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-nd-text">Endpoint URL</label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => onEndpointChange(e.target.value)}
                  className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-nd-text">Model Identifier</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => onModelIdChange(e.target.value)}
                  className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                />
              </div>
            </>
          )}

          {providerType === 'openai_compat' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-nd-text">API Token / key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="OpenAI or Custom Provider API key..."
                  className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 pl-3 pr-10 py-2 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                />
                <button
                  type="button"
                  onClick={onToggleShowApiKey}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nd-text-muted hover:text-nd-text"
                >
                  {showApiKey
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-nd-text-muted/10 bg-nd-surface/20 p-4">
          <div className="space-y-2 text-xs text-nd-text-muted">
            <h4 className="font-semibold text-nd-text text-sm">Provider Advice</h4>
            {providerType === 'ollama' && (
              <p className="leading-relaxed">Ollama runs models locally on your system. Ensure Ollama is running in the background and you have pulled your target model (e.g. <code>ollama pull llama3</code>).</p>
            )}
            {providerType === 'lmstudio' && (
              <p className="leading-relaxed">LM Studio lets you host local models with an OpenAI-compatible server. Start LM Studio and run the local server on port 1234.</p>
            )}
            {providerType === 'openai_compat' && (
              <p className="leading-relaxed">Use any custom API provider following the OpenAI spec (e.g., OpenRouter, TogetherAI, Groq). An API key is required.</p>
            )}
            {providerType === 'skip' && (
              <p className="leading-relaxed text-nd-warning">Selecting offline planning skips model setup. You can still use code terminals and files, but LLM chat requests will return offline fallback responses.</p>
            )}
          </div>

          <div className="space-y-2 mt-4">
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'border-nd-success/20 bg-nd-success/10 text-nd-success' : 'border-nd-danger/20 bg-nd-danger/10 text-nd-danger'}`}>
                {testResult.message}
              </div>
            )}
            <button
              type="button"
              onClick={onTestConnection}
              disabled={testingConnection || (providerType === 'openai_compat' && !apiKey)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 py-2.5 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/15"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Testing...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" /> Test Connection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
