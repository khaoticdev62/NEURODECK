import { useEffect, useState, useCallback } from "react";
import { FileDown, FileJson, RefreshCw, Archive, History } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { Panel } from "../../components/primitives/Panel";
import { SessionCard } from "../../components/cards/SessionCard";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckAppActions, NeuroDeckState, SessionNode } from "../../types/neurodeck";

export function SessionsView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}) {
  const [sessionsList, setSessionsList] = useState<SessionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meta = await neurodeckApi.sessions.listMeta();
      setSessionsList(meta as SessionNode[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return (
    <Panel eyebrow="Session History" title="Saved Sessions" data-testid="sessions-view" className="h-full overflow-hidden">
      <div className="grid h-full gap-4 overflow-y-auto p-4 scrollbar-thin xl:grid-cols-[360px_1fr]">
        <div
          role="region"
          aria-label="Session actions"
          className="rounded-3xl border border-nd-accent-primary/25 bg-nd-accent-primary/[0.045] p-5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
            <Archive className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-nd-text-primary">Session History</h3>
          <p className="mt-2 text-sm leading-6 text-nd-text-muted">
            A chronological trail of your interactions. View, export, or audit past sessions.
          </p>
          <Button
            variant="secondary"
            fullWidth
            className="mt-5"
            loading={loading}
            onClick={() => void fetchSessions()}
            icon={loading ? undefined : RefreshCw}
          >
            {loading ? "Refreshing…" : "Refresh List"}
          </Button>

          <div className="mt-8 border-t border-nd-text-muted/15 pt-5">
            <h4 className="text-sm font-semibold text-nd-text-primary">Active Session Actions</h4>
            <Button
              variant="primary"
              fullWidth
              className="mt-3"
              onClick={() => void actions.exportSession()}
              icon={FileDown}
            >
              Export Markdown
            </Button>
            <Button
              variant="secondary"
              fullWidth
              className="mt-2"
              onClick={() => void actions.saveSession()}
              icon={FileJson}
            >
              Save JSON Session
            </Button>
            {state.lastExportPath && (
              <p className="mt-3 break-all text-xs text-nd-text-muted">
                Last export: {state.lastExportPath}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {loading && <LoadingState label="Loading sessions…" fullHeight />}
          {!loading && error && (
            <ErrorState
              title="Failed to load sessions"
              message={error}
              onRetry={() => void fetchSessions()}
            />
          )}
          {!loading && !error && sessionsList.length === 0 && (
            <EmptyState
              icon={History}
              title="No sessions yet."
              description="Start a conversation to create your first session."
            />
          )}
          {!loading &&
            !error &&
            sessionsList.map((node, i) => (
              <div
                key={node.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <SessionCard node={node} onRefresh={fetchSessions} />
              </div>
            ))}
        </div>
      </div>
    </Panel>
  );
}
