import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  PackagePlus,
  RefreshCw,
  TerminalSquare,
} from "lucide-react";
import { neurodeckApi } from "../../../services/bridgeAdapter";
import { Button } from "../../primitives/Button";
import { ErrorState } from "../../primitives/ErrorState";
import { LoadingState } from "../../primitives/LoadingState";
import { Panel } from "../../primitives/Panel";
import { StatusChip } from "../../primitives/StatusChip";
import { TextInput } from "../../primitives/TextInput";
import type { NpmInstallProgress, NpmPackage, NpmStatus } from "../../../types/neurodeck";

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;

export function StepNpmInstaller() {
  const [status, setStatus] = useState<NpmStatus | null>(null);
  const [packages, setPackages] = useState<NpmPackage[]>([]);
  const [packageName, setPackageName] = useState("");
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<NpmInstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nodeAvailable = !!status?.node && !!status?.npm;
  const trimmedName = packageName.trim();
  const trimmedVersion = version.trim();
  const packageNameValid = !trimmedName || PACKAGE_NAME_PATTERN.test(trimmedName);
  const canInstall =
    nodeAvailable && packageNameValid && trimmedName.length > 0 && !loading && !installing;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextStatus, installed] = await Promise.all([
        neurodeckApi.npm.getStatus(),
        neurodeckApi.npm.list(),
      ]);
      setStatus(nextStatus);
      setPackages(installed);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = neurodeckApi.npm.onProgress((data) => {
      setProgress(data);
      if (data.state === "completed") void load();
    });
    return unsubscribe;
  }, [load]);

  const handleInstall = async () => {
    if (!canInstall) return;
    setInstalling(true);
    setError(null);
    setProgress({ name: trimmedName, state: "installing", details: "Starting npm install..." });
    try {
      await neurodeckApi.npm.install(trimmedName, trimmedVersion || undefined);
      setPackageName("");
      setVersion("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  const installLabel = useMemo(() => {
    if (installing && progress?.name) return `Installing ${progress.name}...`;
    if (trimmedName) return `Install ${trimmedName}`;
    return "Install npm package";
  }, [installing, progress?.name, trimmedName]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">NPM Installer</h2>
          <p className="text-xs leading-5 text-[var(--nd-text-muted)]">
            Install one npm tool into NEURODECK&apos;s isolated package prefix before choosing the
            curated tool bundle.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={loading}
          disabled={loading || installing}
          onClick={() => void load()}
          className={loading ? "[&_svg]:animate-spin" : ""}
        >
          Refresh
        </Button>
      </div>

      {status && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge ok={status.node} label={`Node ${status.nodeVersion ?? "missing"}`} />
          <StatusBadge ok={status.npm} label={`npm ${status.npmVersion ?? "missing"}`} />
          <StatusChip tone="info" size="sm" icon={TerminalSquare}>
            Isolated prefix
          </StatusChip>
        </div>
      )}

      {!nodeAvailable && status && (
        <div className="flex items-start gap-3 rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-yellow-rgb),0.22)] bg-[rgba(var(--nd-yellow-rgb),0.08)] p-4 text-xs leading-5 text-[var(--nd-accent-warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Node.js and npm are required before package installation.
            </p>
            <p className="mt-1 text-[var(--nd-text-muted)]">
              Install the current Node.js LTS from nodejs.org or your OS package manager, then
              return here and refresh.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState label="Checking npm runtime..." size="lg" />
      ) : (
        <Panel variant="surface" className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
            <TextInput
              label="Package"
              value={packageName}
              onChange={(event) => setPackageName(event.target.value)}
              placeholder="typescript-language-server"
              disabled={!nodeAvailable || installing}
              aria-invalid={!packageNameValid}
            />
            <TextInput
              label="Version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="latest"
              disabled={!nodeAvailable || installing}
            />
          </div>

          {!packageNameValid && (
            <p className="text-xs text-[var(--nd-accent-error)]">
              Enter a valid npm package name, with an optional scope such as @scope/name.
            </p>
          )}

          {progress && (
            <div className="rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-cyan-rgb),0.18)] bg-[rgba(var(--nd-cyan-rgb),0.05)] p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-[var(--nd-text-primary)]">
                  {progress.name}
                </span>
                <StatusChip
                  tone={
                    progress.state === "failed"
                      ? "error"
                      : progress.state === "completed"
                        ? "success"
                        : "info"
                  }
                  size="sm"
                >
                  {progress.state}
                </StatusChip>
              </div>
              {(progress.details || progress.error) && (
                <p className="mt-1 truncate text-[11px] text-[var(--nd-text-muted)]">
                  {progress.error ?? progress.details}
                </p>
              )}
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            icon={installing ? undefined : PackagePlus}
            loading={installing}
            disabled={!canInstall}
            onClick={() => void handleInstall()}
          >
            {installLabel}
          </Button>
        </Panel>
      )}

      {error && (
        <ErrorState
          title="NPM installer failed"
          message={error}
          onRetry={load}
          retryLabel="Recheck npm"
        />
      )}

      <Panel variant="surface" className="p-4">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-[var(--nd-accent-primary)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--nd-text-primary)]">
            Installed onboarding tools
          </h3>
        </div>
        {packages.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--nd-text-muted)]">
            No npm tools are installed in NEURODECK&apos;s isolated prefix yet.
          </p>
        ) : (
          <div className="mt-3 max-h-28 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            {packages.slice(0, 8).map((pkg) => (
              <div
                key={pkg.name}
                className="flex items-center justify-between gap-3 rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs font-medium text-[var(--nd-text-primary)]">
                  {pkg.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--nd-text-muted)]">
                  {pkg.installedVersion ?? pkg.versionConstraint ?? "installed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <StatusChip tone={ok ? "success" : "error"} size="sm" icon={ok ? Check : AlertTriangle}>
      {label}
    </StatusChip>
  );
}
