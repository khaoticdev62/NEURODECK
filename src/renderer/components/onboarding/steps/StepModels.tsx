import { Play, Eye, EyeOff } from "lucide-react";
import { Button } from "../../primitives/Button";
import { IconButton } from "../../primitives/IconButton";
import { Panel } from "../../primitives/Panel";
import { Select } from "../../primitives/Select";
import { TextInput } from "../../primitives/TextInput";
import type { AIProvider } from "../../../types/neurodeck";

interface TestResult {
  success: boolean;
  message: string;
}

interface StepModelsProps {
  providerType: AIProvider | "skip";
  endpointUrl: string;
  modelId: string;
  apiKey: string;
  showApiKey: boolean;
  testingConnection: boolean;
  testResult: TestResult | null;
  onProviderChange: (p: AIProvider | "skip") => void;
  onEndpointChange: (url: string) => void;
  onModelIdChange: (id: string) => void;
  onApiKeyChange: (key: string) => void;
  onToggleShowApiKey: () => void;
  onTestConnection: () => void;
}

const PROVIDER_OPTIONS = [
  { value: "ollama", label: "Ollama (Local)" },
  { value: "lmstudio", label: "LM Studio (Local)" },
  { value: "openai_compat", label: "OpenAI-Compatible Endpoint" },
  { value: "skip", label: "Skip / Offline planning engine" },
];

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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">AI Provider Setup</h2>
        <p className="text-xs text-[var(--nd-text-muted)]">
          Link your local or remote LLM endpoint sources.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <Select
            label="Provider Type"
            data-controller-default="true"
            value={providerType}
            options={PROVIDER_OPTIONS}
            onChange={(e) => onProviderChange(e.target.value as AIProvider | "skip")}
            fullWidth
          />

          {providerType !== "skip" && (
            <>
              <TextInput
                label="Endpoint URL"
                value={endpointUrl}
                onChange={(e) => onEndpointChange(e.target.value)}
                fullWidth
              />

              <TextInput
                label="Model Identifier"
                value={modelId}
                onChange={(e) => onModelIdChange(e.target.value)}
                fullWidth
              />
            </>
          )}

          {providerType === "openai_compat" && (
            <div className="relative">
              <TextInput
                id="step-models-api-key"
                label="API Token / key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="OpenAI or Custom Provider API key..."
                fullWidth
                style={{ paddingRight: "44px" }}
              />
              <div className="absolute right-1 top-[22px]">
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  onClick={onToggleShowApiKey}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconButton>
              </div>
            </div>
          )}
        </div>

        <Panel title="Provider Advice" variant="surface" className="flex flex-col justify-between">
          <div className="space-y-2 text-xs leading-relaxed text-[var(--nd-text-muted)]">
            {providerType === "ollama" && (
              <p>
                Ollama runs models locally on your system. Ensure Ollama is running in the
                background and you have pulled your target model (e.g.{" "}
                <code className="rounded bg-[var(--nd-surface-tertiary)] px-1 py-0.5 text-[var(--nd-text-code)]">
                  ollama pull llama3
                </code>
                ).
              </p>
            )}
            {providerType === "lmstudio" && (
              <p>
                LM Studio lets you host local models with an OpenAI-compatible server. Start LM
                Studio and run the local server on port 1234.
              </p>
            )}
            {providerType === "openai_compat" && (
              <p>
                Use any custom API provider following the OpenAI spec (e.g., OpenRouter, TogetherAI,
                Groq). An API key is required.
              </p>
            )}
            {providerType === "skip" && (
              <p className="text-[var(--nd-accent-warning)]">
                Selecting offline planning skips model setup. You can still use code terminals and
                files, but LLM chat requests will return offline fallback responses.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {testResult && (
              <div
                className={`rounded-[var(--nd-radius-md)] border p-3 text-xs ${
                  testResult.success
                    ? "border-[rgba(var(--nd-green-rgb),0.2)] bg-[rgba(var(--nd-green-rgb),0.1)] text-[var(--nd-accent-success)]"
                    : "border-[rgba(var(--nd-red-rgb),0.2)] bg-[rgba(var(--nd-red-rgb),0.1)] text-[var(--nd-accent-error)]"
                }`}
              >
                {testResult.message}
              </div>
            )}
            <Button
              variant="primary"
              fullWidth
              icon={testingConnection ? undefined : Play}
              loading={testingConnection}
              disabled={testingConnection || (providerType === "openai_compat" && !apiKey)}
              onClick={() => void onTestConnection()}
            >
              {testingConnection ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
