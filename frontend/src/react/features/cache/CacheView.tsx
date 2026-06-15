import { HardDrive, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { NeuroDeckState } from "../../types/neurodeck";

export function CacheView({ state }: { state: NeuroDeckState }) {
  const entries = state.cacheEntries;
  const readyCount = entries.filter((e) => e.status === "ready").length;
  const staleCount = entries.filter((e) => e.status === "stale").length;

  return (
    <Panel
      eyebrow="Offline Cache"
      title="Local Readiness Center"
      className="h-full overflow-hidden"
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No cached items"
          description="Cached models, docs, and sessions will appear here."
        />
      ) : (
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Total Items"
              value={entries.length}
              icon={HardDrive}
              hint="Cached assets"
            />
            <MetricCard label="Ready" value={readyCount} icon={CheckCircle2} hint="Available now" />
            <MetricCard
              label="Stale"
              value={staleCount}
              icon={AlertTriangle}
              hint="Needs refresh"
            />
          </div>

          <div className="grid flex-1 gap-3 overflow-y-auto pb-1 scrollbar-thin lg:grid-cols-2">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-border-subtle bg-surface-secondary/40 p-4 transition duration-fast hover:border-accent-primary/30 hover:bg-surface-tertiary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-primary/25 bg-accent-primary/10 text-accent-primary">
                      <HardDrive className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{entry.label}</h3>
                      <p className="text-xs text-text-muted">
                        {entry.size} • {entry.updatedAt}
                      </p>
                    </div>
                  </div>
                  <StatusChip
                    tone={
                      entry.status === "ready"
                        ? "success"
                        : entry.status === "stale"
                          ? "warning"
                          : "info"
                    }
                    size="sm"
                  >
                    {entry.status}
                  </StatusChip>
                </div>
                <Button variant="secondary" size="sm" icon={RotateCcw} className="mt-4">
                  Queue Refresh
                </Button>
              </article>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
