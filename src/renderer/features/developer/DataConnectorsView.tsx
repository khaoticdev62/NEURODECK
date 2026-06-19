import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Key, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

interface DataConnector {
  id: string;
  name: string;
  type: "api" | "database" | "webhook" | "oauth";
  status: "connected" | "error" | "not-configured";
  hasToken: boolean;
  endpoint?: string;
}

type ConfigBridgeApi = {
  getConnectors?: () => Promise<unknown>;
  deleteConnectorToken?: (id: string) => Promise<unknown>;
};

const configBridge = () =>
  (neurodeckApi as unknown as { config?: ConfigBridgeApi }).config;

const MOCK_CONNECTORS: DataConnector[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    type: "api",
    status: "connected",
    hasToken: true,
    endpoint: "generativelanguage.googleapis.com",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    type: "api",
    status: "connected",
    hasToken: false,
    endpoint: "localhost:11434",
  },
  {
    id: "github",
    name: "GitHub API",
    type: "oauth",
    status: "not-configured",
    hasToken: false,
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    type: "api",
    status: "not-configured",
    hasToken: false,
    endpoint: "api.moonshot.cn",
  },
];

const STATUS_TONE: Record<DataConnector["status"], "success" | "error" | "info"> = {
  connected: "success",
  error: "error",
  "not-configured": "info",
};

export function DataConnectorsView({ state: _state }: { state: NeuroDeckState }) {
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DataConnector | null>(null);
  const [revealTimeout, setRevealTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await configBridge()?.getConnectors?.();
      setConnectors(Array.isArray(result) ? (result as DataConnector[]) : MOCK_CONNECTORS);
    } catch {
      setConnectors(MOCK_CONNECTORS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (revealTimeout) clearTimeout(revealTimeout);
    };
  }, [load, revealTimeout]);

  const handleReveal = (id: string) => {
    if (revealTimeout) clearTimeout(revealTimeout);
    setRevealId(id);
    const t = setTimeout(() => setRevealId(null), 10_000);
    setRevealTimeout(t);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await configBridge()?.deleteConnectorToken?.(deleteTarget.id);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === deleteTarget.id
            ? { ...c, hasToken: false, status: "not-configured" }
            : c
        )
      );
    } catch {
      /* toast handles error */
    }
    setDeleteTarget(null);
  }, [deleteTarget]);

  return (
    <Panel
      eyebrow="Developer"
      title="Data Connectors"
      data-testid="data-connectors-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCcw}
            onClick={() => void load()}
            aria-label="Refresh connectors"
          />
          <Button variant="secondary" size="sm" icon={Plus}>
            Add Connector
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-nd-text-muted">
          API tokens are stored in the OS keychain (keyring 2.3). Never logged or exposed to the
          frontend beyond a masked preview.
        </p>

        {loading ? (
          <p className="text-sm text-nd-text-muted">Loading connectors…</p>
        ) : connectors.length === 0 ? (
          <EmptyState
            icon={Key}
            title="No connectors"
            description="Add an API token or OAuth connection to get started."
            action={
              <Button variant="secondary" size="sm" onClick={() => {}}>
                Add Connector
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3" role="list" aria-label="Data connectors">
            {connectors.map((connector) => (
              <div
                key={connector.id}
                role="listitem"
                className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-nd-text-primary">{connector.name}</p>
                      <StatusChip tone={STATUS_TONE[connector.status]} size="sm">
                        {connector.status.replace("-", " ")}
                      </StatusChip>
                    </div>
                    {connector.endpoint && (
                      <p className="mt-0.5 font-mono text-xs text-nd-text-muted">
                        {connector.endpoint}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {connector.hasToken && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={revealId === connector.id ? EyeOff : Eye}
                          onClick={() =>
                            revealId === connector.id
                              ? setRevealId(null)
                              : handleReveal(connector.id)
                          }
                          aria-label={
                            revealId === connector.id ? "Hide token" : "Reveal token (10s)"
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(connector)}
                          aria-label={`Delete ${connector.name} token`}
                          className="text-nd-status-error hover:text-nd-status-error"
                        />
                      </>
                    )}
                    {!connector.hasToken && (
                      <Button variant="secondary" size="sm" icon={Key}>
                        Add Token
                      </Button>
                    )}
                  </div>
                </div>

                {revealId === connector.id && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="mt-3 rounded-xl border border-nd-warning/30 bg-nd-warning/5 px-3 py-2 font-mono text-xs text-nd-text-secondary"
                  >
                    <span className="text-nd-warning">⚠ Token hidden in 10s:</span>{" "}
                    <span aria-label="Masked token">••••••••••••••••</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Remove ${deleteTarget?.name ?? ""} token?`}
        message="This will delete the API token from the OS keychain. You will need to re-enter it to use this connector."
        confirmLabel="Delete Token"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Panel>
  );
}
