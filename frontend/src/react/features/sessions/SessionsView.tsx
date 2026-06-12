import { useEffect, useState, useCallback } from "react";
import { FileDown, FileJson, RefreshCw, Archive, History } from "lucide-react";
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
    <Panel eyebrow="Session History" title="Saved Sessions" className="h-full overflow-hidden">
      <div className="grid h-full gap-4 overflow-y-auto p-4 scrollbar-thin xl:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-nd-accent/25 bg-nd-accent/[0.045] p-5">
          <Archive className="h-8 w-8 text-nd-accent" />
          <h3 className="mt-4 text-xl font-semibold text-nd-text">Session History</h3>
          <p className="mt-2 text-sm leading-6 text-nd-text-muted">
            A chronological trail of your interactions. View, export, or audit past sessions.
          </p>
          <button
            type="button"
            onClick={() => void fetchSessions()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh List
          </button>

          <div className="mt-8 border-t border-nd-text-muted/15 pt-5">
            <h4 className="text-sm font-semibold text-nd-text">Active Session Actions</h4>
            <button
              type="button"
              onClick={() => void actions.exportSession()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15"
            >
              <FileDown className="h-4 w-4" /> Export Markdown
            </button>
            <button
              type="button"
              onClick={() => void actions.saveSession()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent"
            >
              <FileJson className="h-4 w-4" /> Save JSON Session
            </button>
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
              title="No saved sessions"
              description="Your conversation sessions will appear here once saved."
            />
          )}
          {!loading && !error && sessionsList.map((node) => (
            <SessionCard key={node.id} node={node} onRefresh={fetchSessions} />
          ))}
        </div>
      </div>
    </Panel>
  );
}
