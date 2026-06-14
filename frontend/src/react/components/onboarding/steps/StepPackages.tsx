import { useCallback, useEffect, useState } from 'react';
import { Package, AlertTriangle, Check, Download } from 'lucide-react';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import { Button } from '../../primitives/Button';
import { ErrorState } from '../../primitives/ErrorState';
import { LoadingState } from '../../primitives/LoadingState';
import { Panel } from '../../primitives/Panel';
import { StatusChip } from '../../primitives/StatusChip';
import { Toggle } from '../../primitives/Toggle';
import type { NpmRecommendedPackage, NpmInstallProgress, NpmStatus } from '../../../types/neurodeck';

export interface StepPackagesProps {
  onInstallComplete?: () => void;
}

export function StepPackages({ onInstallComplete }: StepPackagesProps) {
  const [status, setStatus] = useState<NpmStatus | null>(null);
  const [recommended, setRecommended] = useState<NpmRecommendedPackage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<Record<string, NpmInstallProgress>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, rec] = await Promise.all([
        neurodeckApi.npm.getStatus(),
        neurodeckApi.npm.getRecommended(),
      ]);
      setStatus(s);
      setRecommended(rec);
      setSelected(new Set(rec.filter((r) => r.defaultSelected).map((r) => r.id)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = neurodeckApi.npm.onProgress((data) => {
      setProgress((prev) => ({ ...prev, [data.name]: data }));
    });
    return unsubscribe;
  }, [load]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleInstallSelected = async () => {
    if (selected.size === 0) {
      onInstallComplete?.();
      return;
    }
    setInstalling(true);
    setError(null);
    try {
      const toInstall = recommended.filter((r) => selected.has(r.id));
      await Promise.all(
        toInstall.map((r) =>
          neurodeckApi.npm.install(r.name).catch((e) => {
            setProgress((prev) => ({
              ...prev,
              [r.name]: {
                name: r.name,
                state: 'failed',
                error: String(e),
              },
            }));
          })
        )
      );
      onInstallComplete?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  const nodeAvailable = status?.node && status?.npm;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">Recommended Packages</h2>
        <p className="text-xs text-[var(--nd-text-muted)]">
          Install npm feature tools to power the IDE, terminal, and agent capabilities.
        </p>
      </div>

      {status && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge ok={status.node} label={`Node ${status.nodeVersion ?? 'missing'}`} />
          <StatusBadge ok={status.npm} label={`npm ${status.npmVersion ?? 'missing'}`} />
        </div>
      )}

      {!nodeAvailable && status && (
        <div className="flex items-start gap-2 rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-yellow-rgb),0.2)] bg-[rgba(var(--nd-yellow-rgb),0.1)] p-3 text-xs text-[var(--nd-accent-warning)]">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Node.js and npm were not detected. You can skip this step; package management is
            available in Settings once Node is installed.
          </span>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading recommended packages..." size="lg" />
      ) : (
        <Panel variant="surface" className="max-h-[320px] overflow-y-auto pr-1">
          <div className="space-y-2">
            {recommended.map((pkg) => {
              const isSelected = selected.has(pkg.id);
              const prog = progress[pkg.name];
              return (
                <div
                  key={pkg.id}
                  className={`flex items-start gap-3 rounded-[var(--nd-radius-md)] border p-3 transition motion-reduce:transition-none ${
                    isSelected
                      ? 'border-[rgba(var(--nd-cyan-rgb),0.3)] bg-[rgba(var(--nd-cyan-rgb),0.05)]'
                      : 'border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] hover:bg-[var(--nd-surface-hover)]'
                  }`}
                >
                  <div className="pt-0.5">
                    <Toggle
                      checked={isSelected}
                      onChange={() => toggleSelected(pkg.id)}
                      label={`Select ${pkg.name}`}
                      disabled={!nodeAvailable || installing}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 shrink-0 text-[var(--nd-accent-primary)]" aria-hidden="true" />
                      <span className="truncate text-sm font-semibold text-[var(--nd-text-primary)]">{pkg.name}</span>
                      <span className="rounded-full bg-[var(--nd-surface-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--nd-text-muted)]">
                        {pkg.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--nd-text-muted)]">{pkg.description}</p>
                    {prog && (
                      <p className="mt-1 truncate text-[10px] text-[var(--nd-text-muted)]">
                        {prog.state}
                        {prog.details ? `: ${prog.details}` : ''}
                        {prog.error ? ` — ${prog.error}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {error && (
        <ErrorState
          title="Package load failed"
          message={error}
          onRetry={load}
          retryLabel="Retry"
        />
      )}

      <Button
        variant="primary"
        fullWidth
        icon={installing ? undefined : Download}
        loading={installing}
        disabled={loading || installing || selected.size === 0 || !nodeAvailable}
        onClick={() => void handleInstallSelected()}
      >
        {installing
          ? `Installing ${selected.size} package${selected.size === 1 ? '' : 's'}...`
          : `Install ${selected.size} selected package${selected.size === 1 ? '' : 's'}`}
      </Button>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <StatusChip tone={ok ? 'success' : 'error'} size="sm" icon={ok ? Check : AlertTriangle}>
      {label}
    </StatusChip>
  );
}
