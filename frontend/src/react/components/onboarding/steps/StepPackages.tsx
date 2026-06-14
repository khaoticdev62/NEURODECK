import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package, AlertTriangle, Check, Download } from 'lucide-react';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import { Button } from '../../primitives/Button';
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
        <h2 className="text-xl font-semibold text-nd-text">Recommended Packages</h2>
        <p className="text-xs text-nd-text-muted">
          Install npm feature tools to power the IDE, terminal, and agent capabilities.
        </p>
      </div>

      {status && (
        <div className="flex items-center gap-2">
          <StatusBadge ok={status.node} label={`Node ${status.nodeVersion ?? 'missing'}`} />
          <StatusBadge ok={status.npm} label={`npm ${status.npmVersion ?? 'missing'}`} />
        </div>
      )}

      {!nodeAvailable && status && (
        <div className="rounded-xl border border-nd-warning/20 bg-nd-warning/10 p-3 text-xs text-nd-warning flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Node.js and npm were not detected. You can skip this step; package management is
            available in Settings once Node is installed.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-nd-accent" aria-hidden="true" />
          <p className="text-xs text-nd-text-muted font-medium">Loading recommended packages...</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {recommended.map((pkg) => {
            const isSelected = selected.has(pkg.id);
            const prog = progress[pkg.name];
            return (
              <div
                key={pkg.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                  isSelected
                    ? 'border-nd-accent/30 bg-nd-accent/[0.05]'
                    : 'border-nd-text-muted/10 bg-nd-surface/30'
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
                    <Package className="h-4 w-4 text-nd-accent shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-sm text-nd-text truncate">{pkg.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nd-surface/60 text-nd-text-muted">
                      {pkg.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-nd-text-muted mt-0.5">{pkg.description}</p>
                  {prog && (
                    <p className="text-[10px] text-nd-text-muted truncate mt-1">
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
      )}

      {error && (
        <div className="rounded-xl border border-nd-danger/20 bg-nd-danger/10 p-3 text-xs text-nd-danger flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-all">{error}</span>
        </div>
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
        ok
          ? 'border-nd-success/20 bg-nd-success/10 text-nd-success'
          : 'border-nd-danger/20 bg-nd-danger/10 text-nd-danger'
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}
