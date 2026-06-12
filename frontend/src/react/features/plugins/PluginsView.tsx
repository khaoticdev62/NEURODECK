import { useEffect, useState } from 'react';
import type { Dispatch } from 'react';
import {
  Plug, RefreshCw, ShieldCheck, ShieldAlert, Download, Trash2,
  ToggleLeft, ToggleRight, Tag, User, FileCode, AlertTriangle
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { PluginInfo } from '../../services/bridgeAdapter';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
import { EmptyState } from '../../components/primitives/EmptyState';
import { LoadingState } from '../../components/primitives/LoadingState';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function PluginsView({ state, dispatch }: { state?: NeuroDeckState; dispatch?: Dispatch<NeuroDeckAction> }) {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [confirmUninstallId, setConfirmUninstallId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await neurodeckApi.plugins.list();
      const list = res.plugins || [];
      setPlugins(list);
      if (dispatch) {
        dispatch({
          type: 'set-plugins',
          plugins: list.map(p => ({
            id: p.id || p.file_name,
            name: p.name,
            description: p.description || '',
            status: p.enabled ? 'enabled' : 'disabled',
            permissions: p.permissions || []
          }))
        });
      }
    } catch (e) {
      setError(String(e));
      if (state?.plugins) {
        setPlugins(state.plugins.map(p => ({
          name: p.name,
          file_name: p.id,
          enabled: p.status === 'enabled',
          id: p.id,
          author: 'System',
          version: '1.0.0',
          description: p.description,
          tags: [],
          marketplace: false,
          permissions: p.permissions
        })));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (fileName: string, enabled: boolean) => {
    try {
      await neurodeckApi.plugins.toggle(fileName, !enabled);
      await neurodeckApi.plugins.reload();
      await load();
    } catch (e) {
      setError(`Toggle failed: ${e}`);
    }
  };

  const confirmAndUninstall = async () => {
    if (!confirmUninstallId) return;
    const pluginId = confirmUninstallId;
    setConfirmUninstallId(null);
    try {
      await neurodeckApi.plugins.uninstall(pluginId);
      await neurodeckApi.plugins.reload();
      await load();
    } catch (e) {
      setError(`Uninstall failed: ${e}`);
    }
  };

  const installFromUrl = async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    try {
      await neurodeckApi.plugins.installFromUrl(installUrl.trim());
      setInstallUrl('');
      await load();
    } catch (e) {
      setError(`Install failed: ${e}`);
    }
    setInstalling(false);
  };

  const reload = async () => {
    try {
      await neurodeckApi.plugins.reload();
      await load();
    } catch (e) {
      setError(`Reload failed: ${e}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Plug className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Plugins</h2>
          <p className="text-xs text-nd-text-muted">Extension manager — {plugins.length} found</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={reload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reload
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh plugin list"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-nd-text-muted/15 text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Install from URL */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={installUrl}
          onChange={(e) => setInstallUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && installFromUrl()}
          placeholder="Plugin URL or registry ID..."
          aria-label="Plugin URL or registry ID"
          className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
        />
        <button
          type="button"
          onClick={installFromUrl}
          disabled={installing || !installUrl.trim()}
          className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-success/40"
        >
          <Download className="h-4 w-4" /> {installing ? 'Installing…' : 'Install'}
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-nd-danger/30 bg-nd-danger/10 px-3 py-2 text-xs text-nd-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Plugin grid */}
      {loading && plugins.length === 0 && <LoadingState label="Loading plugins…" />}
      <div className="grid gap-3 overflow-y-auto pb-2 scrollbar-thin sm:grid-cols-2 lg:grid-cols-3">
        {plugins.length === 0 && !loading && (
          <div className="col-span-full">
            <EmptyState icon={Plug} title="No plugins found" description="Install plugins from a URL or place .lua files in the plugins folder." />
          </div>
        )}
        {plugins.map((p) => (
          <div key={p.file_name} className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 transition hover:border-nd-accent/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-nd-accent shrink-0" />
                  <h3 className="truncate text-sm font-semibold text-nd-text/90">{p.name}</h3>
                </div>
                <p className="mt-1 text-[11px] text-nd-text-muted truncate">{p.file_name}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(p.file_name, p.enabled)}
                aria-label={p.enabled ? `Disable ${p.name}` : `Enable ${p.name}`}
                aria-pressed={p.enabled}
                className="shrink-0 text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded"
              >
                {p.enabled ? <ToggleRight className="h-5 w-5" aria-hidden="true" /> : <ToggleLeft className="h-5 w-5 text-nd-text-muted" aria-hidden="true" />}
              </button>
            </div>

            <p className="mt-2 text-xs text-nd-text-muted/80 line-clamp-2">{p.description || 'No description'}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.version && (
                <span className="rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-2 py-0.5 text-[10px] text-nd-text-muted">v{p.version}</span>
              )}
              {p.author && (
                <span className="flex items-center gap-1 text-[10px] text-nd-text-muted/70">
                  <User className="h-3 w-3" /> {p.author}
                </span>
              )}
              {p.marketplace && (
                <span className="rounded-full border border-nd-accent/20 bg-nd-accent/10 px-2 py-0.5 text-[10px] text-nd-accent">Marketplace</span>
              )}
            </div>

            {p.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-0.5 rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-1.5 py-0.5 text-[10px] text-nd-text-muted">
                    <Tag className="h-2.5 w-2.5" /> {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <div className={`flex items-center gap-1 text-[10px] ${p.enabled ? 'text-nd-success' : 'text-nd-text-muted'}`}>
                {p.enabled ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {p.enabled ? 'Enabled' : 'Disabled'}
              </div>
              {p.id && (
                <button
                  type="button"
                  onClick={() => setConfirmUninstallId(p.id!)}
                  aria-label={`Uninstall ${p.name}`}
                  className="ml-auto rounded-lg p-1.5 text-nd-text-muted transition hover:bg-nd-danger/10 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {p.permissions.length > 0 && (
              <div className="mt-2 border-t border-nd-text-muted/10 pt-2">
                <p className="text-[10px] text-nd-text-muted/60">Permissions: {p.permissions.join(', ')}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!confirmUninstallId}
        onConfirm={() => void confirmAndUninstall()}
        onCancel={() => setConfirmUninstallId(null)}
        title="Uninstall plugin?"
        message={`Remove '${confirmUninstallId ?? ''}' from the plugin directory. This cannot be undone without reinstalling.`}
        confirmLabel="Uninstall"
        destructive
      />
    </div>
  );
}
