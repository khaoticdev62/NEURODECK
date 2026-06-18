import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Server,
  TestTube,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { Skeleton } from "../../components/primitives/Skeleton";
import { TextInput } from "../../components/primitives/TextInput";
import { bridgeInvoke, neurodeckApi } from "../../services/bridgeAdapter";
import type { ProviderHealth } from "../../services/bridgeAdapter";
import type {
  AIProvider,
  CredentialStatus,
  NeuroDeckAction,
  NeuroDeckState,
} from "../../types/neurodeck";
import type { ProviderRuntimeProfile } from "../../shared/contracts/models.contracts";

type ProviderStatus = "connected" | "key_missing" | "disconnected";

type ProviderViewItem = {
  runtimeId: string;
  runtimeType: string;
  label: string;
  baseUrl: string;
  authRequired: boolean;
  supportsModelListing: boolean;
  health?: ProviderHealth;
};

const EMPTY_CREDENTIALS: CredentialStatus = {
  gemini: false,
  huggingface: false,
  openai_compat: false,
};

const KNOWN_PROVIDERS: ProviderViewItem[] = [
  {
    runtimeId: "gemini",
    runtimeType: "custom_http_provider",
    label: "Gemini",
    baseUrl: "https://api.gemini.ai",
    authRequired: true,
    supportsModelListing: true,
  },
  {
    runtimeId: "ollama",
    runtimeType: "ollama",
    label: "Ollama",
    baseUrl: "http://localhost:11434",
    authRequired: false,
    supportsModelListing: true,
  },
  {
    runtimeId: "openai_compat",
    runtimeType: "openai_compatible_remote",
    label: "OpenAI-compatible",
    baseUrl: "https://api.openai.com/v1",
    authRequired: true,
    supportsModelListing: true,
  },
  {
    runtimeId: "kimi",
    runtimeType: "custom_http_provider",
    label: "Kimi",
    baseUrl: "https://api.moonshot.ai",
    authRequired: true,
    supportsModelListing: true,
  },
];

function mergeProviders(
  runtimes: ProviderRuntimeProfile[],
  health: ProviderHealth[]
): ProviderViewItem[] {
  const healthById = new Map(health.map((h) => [h.runtime_id, h]));
  return runtimes.map((rt) => {
    const h = healthById.get(rt.id);
    return {
      runtimeId: rt.id,
      runtimeType: rt.type,
      label: rt.label || rt.id,
      baseUrl: rt.baseUrl || h?.base_url || "",
      authRequired: rt.auth.required,
      supportsModelListing: rt.supports.modelListing,
      health: h,
    };
  });
}

function hasKeyFor(item: ProviderViewItem, credentials: CredentialStatus): boolean {
  if (!item.authRequired) return true;
  if (item.runtimeId === "gemini") return credentials.gemini;
  if (item.runtimeId === "openai_compat") return credentials.openai_compat;
  return false;
}

function getProviderStatus(item: ProviderViewItem, credentials: CredentialStatus): ProviderStatus {
  if (item.health?.state === "connected") return "connected";
  if (!hasKeyFor(item, credentials)) return "key_missing";
  return "disconnected";
}

function statusDotClass(status: ProviderStatus): string {
  switch (status) {
    case "connected":
      return "bg-nd-accent-success";
    case "key_missing":
      return "bg-nd-accent-warning";
    case "disconnected":
      return "bg-nd-accent-error";
    default:
      return "bg-nd-text-muted";
  }
}

function statusText(item: ProviderViewItem, credentials: CredentialStatus): string {
  const status = getProviderStatus(item, credentials);
  if (status === "connected") {
    return `Connected · ${item.health?.latency_ms ?? 0}ms`;
  }
  if (status === "key_missing") return "API key required";
  return item.health?.error || item.health?.state || "Disconnected";
}

export function ProviderManagerView({
  state,
  dispatch,
}: {
  state: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
}) {
  const [items, setItems] = useState<ProviderViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialStatus>(EMPTY_CREDENTIALS);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const initialSelectionDone = useRef(false);
  const prevSelectedId = useRef<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runtimes, health, creds] = await Promise.all([
        neurodeckApi.models.listProviderRuntimes(),
        neurodeckApi.models.getProviderHealth(),
        neurodeckApi.diagnostics.getCredentialStatus(),
      ]);
      const merged = mergeProviders(runtimes, health);
      setItems(merged);
      setCredentials(creds);
      if (!initialSelectionDone.current && merged.length > 0) {
        initialSelectionDone.current = true;
        setSelectedRuntimeId(merged[0].runtimeId);
      }
    } catch (e) {
      setError(String(e));
      setItems(KNOWN_PROVIDERS);
      setCredentials(EMPTY_CREDENTIALS);
      if (!initialSelectionDone.current) {
        initialSelectionDone.current = true;
        setSelectedRuntimeId(KNOWN_PROVIDERS[0].runtimeId);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const selectedItem = useMemo(
    () => items.find((i) => i.runtimeId === selectedRuntimeId) || null,
    [items, selectedRuntimeId]
  );

  useEffect(() => {
    if (selectedRuntimeId && selectedRuntimeId !== prevSelectedId.current) {
      prevSelectedId.current = selectedRuntimeId;
      const item = items.find((i) => i.runtimeId === selectedRuntimeId);
      if (item) {
        setBaseUrl(item.baseUrl);
        setApiKey("");
        setDefaultModel(state.selectedModelId || item.health?.models[0] || "");
        setTestMessage(null);
        setRevealedKey(null);
      }
    }
  }, [selectedRuntimeId, items, state.selectedModelId]);

  useEffect(() => {
    return () => {
      if (revealTimer.current) {
        clearTimeout(revealTimer.current);
      }
    };
  }, []);

  const saveProviderSettings = useCallback(async () => {
    if (!selectedItem) return;
    const key = apiKey.trim();
    if (key) {
      if (selectedItem.runtimeId === "gemini") {
        await bridgeInvoke("save_gemini_api_key", { key });
      } else {
        await bridgeInvoke("set_config", {
          section: "llm",
          key: `${selectedItem.runtimeId}_api_key`,
          value: key,
        });
      }
    }
    const url = baseUrl.trim();
    if (url && url !== selectedItem.baseUrl) {
      await bridgeInvoke("set_config", {
        section: "llm",
        key: `${selectedItem.runtimeId}_base_url`,
        value: url,
      });
    }
  }, [selectedItem, apiKey, baseUrl]);

  const updateHealthForSelection = useCallback((health: ProviderHealth[]) => {
    const updated = health.find((h) => h.runtime_id === selectedRuntimeId);
    if (updated) {
      setItems((prev) =>
        prev.map((item) =>
          item.runtimeId === updated.runtime_id ? { ...item, health: updated } : item
        )
      );
    }
    return updated;
  }, [selectedRuntimeId]);

  const handleTestConnection = useCallback(async () => {
    if (!selectedItem) return;
    setTesting(true);
    setTestMessage(null);
    try {
      await saveProviderSettings();
      const health = await neurodeckApi.models.getProviderHealth(selectedItem.runtimeId);
      const updated = updateHealthForSelection(health);
      if (updated) {
        setTestMessage(
          updated.state === "connected"
            ? `Connected · ${updated.latency_ms}ms · ${updated.models.length} model(s) available`
            : updated.error || `Connection state: ${updated.state}`
        );
      } else {
        setTestMessage("No health data returned for this provider.");
      }
    } catch (e) {
      setTestMessage(String(e));
    } finally {
      setTesting(false);
    }
  }, [selectedItem, saveProviderSettings, updateHealthForSelection]);

  const handleRefreshModels = useCallback(async () => {
    if (!selectedItem) return;
    setTesting(true);
    try {
      const health = await neurodeckApi.models.getProviderHealth(selectedItem.runtimeId);
      updateHealthForSelection(health);
    } catch (e) {
      setTestMessage(String(e));
    } finally {
      setTesting(false);
    }
  }, [selectedItem, updateHealthForSelection]);

  const handleSaveKey = useCallback(async () => {
    if (!selectedItem) return;
    setSavingKey(true);
    try {
      await saveProviderSettings();
      setTestMessage("API key saved.");
      if (selectedItem.runtimeId === "gemini") {
        setCredentials((prev) => ({ ...prev, gemini: true }));
      } else if (selectedItem.runtimeId === "openai_compat") {
        setCredentials((prev) => ({ ...prev, openai_compat: true }));
      }
    } catch (e) {
      setTestMessage(String(e));
    } finally {
      setSavingKey(false);
    }
  }, [selectedItem, saveProviderSettings]);

  const handleSetDefault = useCallback(async () => {
    if (!selectedItem) return;
    setSettingDefault(true);
    try {
      await saveProviderSettings();
      await bridgeInvoke("set_config", {
        section: "llm",
        key: "provider",
        value: selectedItem.runtimeId,
      }).catch(() => {
        /* backend may not implement set_config; local dispatch is sufficient */
      });
      dispatch?.({ type: "set-provider", provider: selectedItem.runtimeId as AIProvider });
      await neurodeckApi.ai.setProvider(selectedItem.runtimeId);
      if (defaultModel) {
        dispatch?.({ type: "set-selected-model", id: defaultModel });
        await neurodeckApi.ai.setModel(defaultModel);
      }
      setTestMessage(`${selectedItem.label} set as default provider.`);
    } catch (e) {
      setTestMessage(String(e));
    } finally {
      setSettingDefault(false);
    }
  }, [selectedItem, defaultModel, dispatch, saveProviderSettings]);

  const handleRevealRequest = useCallback(() => {
    setRevealOpen(true);
  }, []);

  const handleConfirmReveal = useCallback(async () => {
    setRevealOpen(false);
    try {
      const key = await bridgeInvoke<string>("get_gemini_api_key");
      setRevealedKey(key);
      if (revealTimer.current) clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealedKey(null), 10000);
    } catch (e) {
      setTestMessage(String(e));
    }
  }, []);

  const handleAddProvider = useCallback(() => {
    const id = `custom-${Date.now()}`;
    const newItem: ProviderViewItem = {
      runtimeId: id,
      runtimeType: "custom_http_provider",
      label: "Custom Provider",
      baseUrl: "http://localhost:8080/v1",
      authRequired: true,
      supportsModelListing: true,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedRuntimeId(id);
  }, []);

  const modelOptions = useMemo(() => {
    const models = selectedItem?.health?.models ?? [];
    return models.map((m) => ({ value: m, label: m }));
  }, [selectedItem]);

  const leftStatus = (item: ProviderViewItem) => getProviderStatus(item, credentials);

  return (
    <Panel
      eyebrow="Models"
      title="Provider Manager"
      scrollable
      className="h-full min-h-0"
    >
      <div className="grid h-full min-h-0 grid-cols-[280px_1fr] gap-4">
        {/* Provider List */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {loading && (
            <div className="space-y-2" role="status" aria-label="Loading providers">
              <Skeleton className="h-12 rounded-xl" count={4} />
            </div>
          )}

          {!loading && error && items.length === 0 && (
            <ErrorState
              title="Provider load failed"
              message={error}
              onRetry={() => void loadProviders()}
              retryLabel="Retry"
            />
          )}

          {!loading && items.length === 0 && (
            <EmptyState
              icon={Server}
              title="No providers configured"
              description="Add a provider to connect remote AI models."
              variant="compact"
              action={
                <Button variant="primary" size="sm" icon={Plus} onClick={handleAddProvider}>
                  Add Provider
                </Button>
              }
            />
          )}

          {!loading && items.length > 0 && (
            <div
              className="space-y-2"
              role="listbox"
              aria-label="AI providers"
            >
              {items.map((item) => {
                const status = leftStatus(item);
                const selected = item.runtimeId === selectedRuntimeId;
                const isDefault = state.selectedProvider === item.runtimeId;
                return (
                  <button
                    key={item.runtimeId}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => setSelectedRuntimeId(item.runtimeId)}
                    className={[
                      "w-full flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40",
                      selected
                        ? "border-nd-accent-primary/40 bg-nd-accent-primary/[0.07]"
                        : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/25",
                    ].join(" ")}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={[
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          statusDotClass(status),
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium text-nd-text-primary">
                        {item.label}
                      </span>
                    </span>
                    {isDefault && (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-nd-accent-success"
                        aria-label="Default provider"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && items.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              icon={Plus}
              onClick={handleAddProvider}
              className="mt-auto"
            >
              Add Provider
            </Button>
          )}
        </div>

        {/* Provider Detail */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {!selectedItem && (
            <EmptyState
              icon={Server}
              title="No provider selected"
              description="Select a provider from the list or add a new one to configure it."
              variant="compact"
            />
          )}

          {selectedItem && (
            <Panel
              eyebrow={selectedItem.label}
              title="Provider Configuration"
              className="flex flex-col min-h-0"
            >
              <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "h-3 w-3 rounded-full",
                      statusDotClass(leftStatus(selectedItem)),
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-nd-text-secondary">
                    {statusText(selectedItem, credentials)}
                  </span>
                  {leftStatus(selectedItem) === "key_missing" && (
                    <Badge tone="warning" size="sm">
                      API key required
                    </Badge>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  <TextInput
                    label="API Key"
                    type={revealedKey ? "text" : "password"}
                    value={revealedKey || apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••••••"
                    fullWidth
                    readOnly={!!revealedKey}
                    className="flex-1"
                    aria-label={`API key for ${selectedItem.label}`}
                  />
                  {selectedItem.runtimeId === "gemini" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={revealedKey ? EyeOff : Eye}
                      onClick={
                        revealedKey
                          ? () => {
                              setRevealedKey(null);
                              if (revealTimer.current) clearTimeout(revealTimer.current);
                            }
                          : handleRevealRequest
                      }
                      aria-label={revealedKey ? "Hide API key" : "Reveal API key"}
                      aria-pressed={!!revealedKey}
                    >
                      {revealedKey ? "Hide" : "Reveal"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={savingKey ? Loader2 : Save}
                    loading={savingKey}
                    onClick={handleSaveKey}
                  >
                    Save
                  </Button>
                </div>

                <TextInput
                  label="Base URL"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  fullWidth
                />

                <Select
                  label="Default model"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  options={modelOptions}
                  placeholder={
                    selectedItem.supportsModelListing
                      ? "Refresh to load models"
                      : "No model selection"
                  }
                  fullWidth
                />

                <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-nd-text-primary">
                      Available Models
                    </h4>
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={testing ? Loader2 : RefreshCcw}
                      loading={testing}
                      onClick={handleRefreshModels}
                      disabled={!selectedItem.supportsModelListing}
                    >
                      Refresh list
                    </Button>
                  </div>

                  {selectedItem.health && selectedItem.health.models.length > 0 ? (
                    <ul className="mt-3 space-y-2" role="list" aria-label="Available models">
                      {selectedItem.health.models.map((model) => (
                        <li
                          key={model}
                          className="flex items-center gap-2 text-sm text-nd-text-secondary"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-nd-accent-primary" aria-hidden="true" />
                          <span className="min-w-0 truncate">{model}</span>
                          {model === defaultModel && (
                            <Badge tone="accent" size="sm">
                              active
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-nd-text-muted">
                      No models listed yet. Click Refresh list after entering a valid API key
                      and base URL.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={testing ? Loader2 : TestTube}
                    loading={testing}
                    onClick={handleTestConnection}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={settingDefault ? Loader2 : CheckCircle2}
                    loading={settingDefault}
                    onClick={handleSetDefault}
                  >
                    Set as Default
                  </Button>
                </div>

                {testMessage && (
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent-primary" aria-hidden="true" />
                      <p className="text-sm text-nd-text-secondary">{testMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={revealOpen}
        onConfirm={handleConfirmReveal}
        onCancel={() => setRevealOpen(false)}
        title="Reveal API key?"
        message="This will display the saved Gemini API key in plain text. It will be automatically hidden again after 10 seconds."
        confirmLabel="Reveal"
        destructive={false}
      />
    </Panel>
  );
}
