import { useCallback, useEffect, useState } from "react";
import { Package, PackagePlus, Trash2, RefreshCw, AlertTriangle, Check } from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { Badge } from "../../components/primitives/Badge";
import { EmptyState } from "../../components/primitives/EmptyState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TextInput } from "../../components/primitives/TextInput";
import { Toggle } from "../../components/primitives/Toggle";
import type { NpmPackage, NpmStatus, NpmInstallProgress } from "../../types/neurodeck";

export function PackagesPanel() {
  const [status, setStatus] = useState<NpmStatus | null>(null);
  const [packages, setPackages] = useState<NpmPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [installName, setInstallName] = useState("");
  const [installVersion, setInstallVersion] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, NpmInstallProgress>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, list] = await Promise.all([neurodeckApi.npm.getStatus(), neurodeckApi.npm.list()]);
      setStatus(s);
      setPackages(list);
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
      if (data.state === "completed" || data.state === "failed") {
        void load();
      }
    });
    return unsubscribe;
  }, [load]);

  const handleInstall = async () => {
    const name = installName.trim();
    if (!name) return;
    setInstalling(name);
    setError(null);
    try {
      await neurodeckApi.npm.install(name, installVersion.trim() || undefined);
      setInstallName("");
      setInstallVersion("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (pkg: NpmPackage) => {
    setInstalling(pkg.name);
    setError(null);
    try {
      await neurodeckApi.npm.uninstall(pkg.name);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  const handleUpdate = async (pkg: NpmPackage) => {
    setUpdating(pkg.name);
    setError(null);
    try {
      await neurodeckApi.npm.update(pkg.name);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdating(null);
    }
  };

  const toggleEnabled = (pkg: NpmPackage) => {
    // Optimistically toggle; persistence can be added later via a dedicated bridge command.
    setPackages((prev) =>
      prev.map((p) => (p.name === pkg.name ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const nodeAvailable = status?.node && status?.npm;

  return (
    <div id="sp-packages" className="settings-panel active space-y-4">
      <Panel eyebrow="Runtime" title="Node.js / npm Status">
        <div className="p-4">
          {status ? (
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip tone={status.node ? "success" : "error"} size="sm">
                Node {status.nodeVersion ?? "not found"}
              </StatusChip>
              <StatusChip tone={status.npm ? "success" : "error"} size="sm">
                npm {status.npmVersion ?? "not found"}
              </StatusChip>
              {!nodeAvailable && (
                <p className="w-full text-xs text-nd-accent-warning">
                  <AlertTriangle className="inline h-3 w-3 mr-1" aria-hidden="true" />
                  Node.js and npm are required to install packages. Install Node from nodejs.org and
                  restart NEURODECK.
                </p>
              )}
            </div>
          ) : (
            <LoadingState size="sm" label="Detecting npm runtime..." />
          )}
        </div>
      </Panel>

      <Panel
        eyebrow="Install"
        title="Add Package"
        action={
          <Button
            variant="primary"
            size="sm"
            icon={PackagePlus}
            loading={!!installing}
            disabled={!nodeAvailable || !installName.trim()}
            onClick={handleInstall}
          >
            Install
          </Button>
        }
      >
        <div className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              placeholder="package-name"
              value={installName}
              onChange={(e) => setInstallName(e.target.value)}
              disabled={!nodeAvailable}
              className="flex-1"
            />
            <TextInput
              placeholder="version (optional)"
              value={installVersion}
              onChange={(e) => setInstallVersion(e.target.value)}
              disabled={!nodeAvailable}
              className="sm:w-40"
            />
          </div>
          <p className="text-xs text-nd-text-muted">
            Installs into the isolated NEURODECK npm prefix. Executables become available in the
            Terminal, IDE, and Agent features.
          </p>
        </div>
      </Panel>

      {error && (
        <div className="rounded-xl border border-nd-accent-error/20 bg-nd-accent-error/10 p-3 text-xs text-nd-accent-error flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="break-all">{error}</span>
        </div>
      )}

      <Panel
        eyebrow="Installed"
        title="Managed Packages"
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            disabled={loading}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        }
      >
        <div className="p-2">
          {loading && packages.length === 0 ? (
            <LoadingState size="sm" label="Loading packages..." />
          ) : packages.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No npm packages installed."
              description="Install language servers, formatters, or utilities above to extend NEURODECK."
            />
          ) : (
            <ul className="space-y-2">
              {packages.map((pkg) => {
                const prog = progress[pkg.name];
                const isBusy = installing === pkg.name || updating === pkg.name;
                return (
                  <li
                    key={pkg.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-nd-text-primary truncate">
                          {pkg.name}
                        </span>
                        {pkg.installedVersion && (
                          <Badge tone="accent" size="sm" variant="outline">
                            {pkg.installedVersion}
                          </Badge>
                        )}
                        {pkg.category && (
                          <Badge tone="neutral" size="sm" variant="outline">
                            {pkg.category}
                          </Badge>
                        )}
                      </div>
                      {pkg.installedVersion ? (
                        <Badge tone="success" size="sm" variant="outline" className="mt-1.5 w-fit">
                          <Check className="h-3 w-3" aria-hidden="true" /> Installed
                        </Badge>
                      ) : (
                        <Badge tone="warning" size="sm" variant="outline" className="mt-1.5 w-fit">
                          Not installed on disk
                        </Badge>
                      )}
                      {prog && isBusy && (
                        <p className="text-[10px] text-nd-text-muted truncate mt-0.5">
                          {prog.state}
                          {prog.details ? `: ${prog.details}` : ""}
                          {prog.error ? ` — ${prog.error}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Toggle
                        checked={pkg.enabled}
                        onChange={() => toggleEnabled(pkg)}
                        label={`Toggle ${pkg.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={RefreshCw}
                        loading={updating === pkg.name}
                        disabled={isBusy || !pkg.installedVersion}
                        onClick={() => void handleUpdate(pkg)}
                        aria-label={`Update ${pkg.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={Trash2}
                        loading={installing === pkg.name}
                        disabled={isBusy}
                        onClick={() => void handleUninstall(pkg)}
                        aria-label={`Uninstall ${pkg.name}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      <Panel eyebrow="About" title="Feature Tools">
        <div className="p-4 space-y-1.5 text-xs text-nd-text-muted">
          {[
            ["Install root", "~/.config/neurodeck/npm/"],
            ["Binaries", "~/.config/neurodeck/npm/node_modules/.bin/"],
            ["Use in Terminal", "Installed CLIs are added to PATH automatically."],
            ["Use in IDE", "Language servers are discovered from the managed prefix."],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 rounded-lg px-2 py-1"
            >
              <span className="text-nd-text-primary/60 shrink-0">{label}</span>
              <span className="font-mono text-nd-text-primary text-right">{value}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
