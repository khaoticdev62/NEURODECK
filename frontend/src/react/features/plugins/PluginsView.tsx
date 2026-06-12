import { useEffect, useState, type Dispatch } from 'react';
import {
  Plug, RefreshCw, ShieldCheck, ShieldAlert, Download, Trash2,
  ToggleLeft, ToggleRight, Tag, User, FileCode, AlertTriangle,
  Copy, Shield
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { PluginInfo } from '../../services/bridgeAdapter';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
import { EmptyState } from '../../components/primitives/EmptyState';
import { LoadingState } from '../../components/primitives/LoadingState';
import { Modal } from '../../components/primitives/Modal';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function PluginsView({ state, dispatch }: { state?: NeuroDeckState; dispatch?: Dispatch<NeuroDeckAction> }) {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Install / search state
  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  
  // Selected plugin detail state
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
  const [validating, setValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Validation caching for all plugins
  const [validationStatuses, setValidationStatuses] = useState<
    Record<string, { passed: boolean; errors: string[]; warnings: string[] }>
  >({});

  // Filter criteria
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled' | 'error'>('all');
  const [runtimeFilter, setRuntimeFilter] = useState<'all' | 'lua' | 'javascript' | 'typescript' | 'external'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Confirmation modals state
  const [confirmUninstallId, setConfirmUninstallId] = useState<string | null>(null);
  const [showPermissionWarning, setShowPermissionWarning] = useState<PluginInfo | null>(null);

  // Helper to determine security risk level for a single permission
  const getPermissionRisk = (perm: string): 'high' | 'medium' | 'low' => {
    const p = perm.toLowerCase();
    if (p === 'shell_execution' || p === 'filesystem_write' || p.includes('shell') || p.includes('write')) {
      return 'high';
    }
    if (p === 'network_access' || p === 'filesystem_read' || p === 'clipboard_access' || p.includes('network') || p.includes('read') || p.includes('clip')) {
      return 'medium';
    }
    return 'low';
  };

  // Helper to guess runtime based on extension
  const getPluginRuntime = (fileName: string): 'lua' | 'javascript' | 'typescript' | 'external' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'lua') return 'lua';
    if (ext === 'js') return 'javascript';
    if (ext === 'ts') return 'typescript';
    return 'external';
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await neurodeckApi.plugins.list();
      const list = res.plugins || [];
      setPlugins(list);
      
      // Keep selection if it still exists
      if (list.length > 0) {
        setSelectedPlugin(prev => {
          const stillExists = prev && list.some(p => p.file_name === prev.file_name);
          return stillExists ? list.find(p => p.file_name === prev.file_name)! : null;
        });
      } else {
        setSelectedPlugin(null);
      }

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

      // Background validate all loaded plugins to populate error metrics
      void validateAll(list);
    } catch (e) {
      setError(String(e));
      if (state?.plugins) {
        const fallbackList = state.plugins.map(p => ({
          name: p.name,
          file_name: p.id,
          enabled: p.status === 'enabled',
          id: p.id,
          author: 'System',
          version: '1.0.0',
          description: p.description,
          tags: [] as string[],
          marketplace: false,
          permissions: p.permissions
        }));
        setPlugins(fallbackList);
        if (fallbackList.length > 0) {
          setSelectedPlugin(fallbackList[0]);
        }
      }
    }
    setLoading(false);
  };

  const validateAll = async (list: PluginInfo[]) => {
    const results: Record<string, { passed: boolean; errors: string[]; warnings: string[] }> = {};
    await Promise.all(list.map(async (p) => {
      try {
        const report = await neurodeckApi.plugins.validate(p.file_name);
        results[p.file_name] = {
          passed: report.passed,
          errors: report.errors || [],
          warnings: report.warnings || []
        };
      } catch (_) {
        results[p.file_name] = {
          passed: false,
          errors: ['Validation failed to execute'],
          warnings: []
        };
      }
    }));
    setValidationStatuses(results);
  };

  useEffect(() => {
    void load();
  }, []);

  // Run validation on a specific plugin (used when user selects a plugin or clicks Run Audit)
  const validatePlugin = async (fileName: string) => {
    setValidating(true);
    try {
      const report = await neurodeckApi.plugins.validate(fileName);
      setValidationStatuses(prev => ({
        ...prev,
        [fileName]: {
          passed: report.passed,
          errors: report.errors || [],
          warnings: report.warnings || []
        }
      }));
    } catch (e) {
      setError(`Validation failed: ${e}`);
    } finally {
      setValidating(false);
    }
  };

  // Perform single validation check on selection
  const handleSelectPlugin = (p: PluginInfo) => {
    setSelectedPlugin(p);
    void validatePlugin(p.file_name);
  };

  const handleToggle = async (plugin: PluginInfo) => {
    const targetState = !plugin.enabled;
    
    // Safety check for enabling plugins with high risk
    if (targetState) {
      const hasHighRisk = plugin.permissions.some(perm => getPermissionRisk(perm) === 'high');
      if (hasHighRisk) {
        setShowPermissionWarning(plugin);
        return;
      }
    }
    
    await executeToggle(plugin.file_name, targetState);
  };

  const executeToggle = async (fileName: string, targetState: boolean) => {
    try {
      await neurodeckApi.plugins.toggle(fileName, targetState);
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

  const copyDiagnostics = () => {
    if (!selectedPlugin) return;
    const diagnosticsData = {
      plugin: selectedPlugin,
      validation: validationStatuses[selectedPlugin.file_name] || null,
      runtime: getPluginRuntime(selectedPlugin.file_name),
    };
    void navigator.clipboard.writeText(JSON.stringify(diagnosticsData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stats calculation
  const totalInstalled = plugins.length;
  const totalEnabled = plugins.filter((p) => p.enabled).length;
  const totalDisabled = plugins.filter((p) => !p.enabled).length;
  const totalErrors = Object.values(validationStatuses).filter((v) => !v.passed).length;

  // Filter application
  const filteredPlugins = plugins.filter((p) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(searchLower) ||
      (p.description || '').toLowerCase().includes(searchLower) ||
      (p.author || '').toLowerCase().includes(searchLower) ||
      p.file_name.toLowerCase().includes(searchLower);

    const validation = validationStatuses[p.file_name];
    const hasErrors = validation ? !validation.passed : false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'enabled' && p.enabled) ||
      (statusFilter === 'disabled' && !p.enabled) ||
      (statusFilter === 'error' && hasErrors);

    const runtime = getPluginRuntime(p.file_name);
    const matchesRuntime =
      runtimeFilter === 'all' ||
      runtimeFilter === runtime;

    const risks = p.permissions.map(getPermissionRisk);
    const maxRisk = risks.includes('high') ? 'high' : risks.includes('medium') ? 'medium' : 'low';
    const matchesRisk =
      riskFilter === 'all' ||
      riskFilter === maxRisk;

    return matchesSearch && matchesStatus && matchesRuntime && matchesRisk;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Title bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Plug className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Plugins</h2>
          <p className="text-xs text-nd-text-muted">Extension manager — loaded at sidecar startup</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={reload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reload Runtime
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-nd-text-muted">Total Installed</p>
          <p className="text-xl font-bold text-nd-text mt-0.5">{totalInstalled}</p>
        </div>
        <div className="rounded-xl border border-nd-success/20 bg-nd-success/[0.02] px-4 py-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-nd-success/80">Active Scripts</p>
          <p className="text-xl font-bold text-nd-success mt-0.5">{totalEnabled}</p>
        </div>
        <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-3">
          <p className="text-[10px] uppercase font-bold tracking-wider text-nd-text-muted">Disabled</p>
          <p className="text-xl font-bold text-nd-text/80 mt-0.5">{totalDisabled}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 transition ${totalErrors > 0 ? 'border-nd-danger/30 bg-nd-danger/[0.02]' : 'border-nd-text-muted/15 bg-nd-surface/30'}`}>
          <p className={`text-[10px] uppercase font-bold tracking-wider ${totalErrors > 0 ? 'text-nd-danger/80' : 'text-nd-text-muted'}`}>QA Failures</p>
          <p className={`text-xl font-bold mt-0.5 ${totalErrors > 0 ? 'text-nd-danger' : 'text-nd-text'}`}>{totalErrors}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins by name, desc, author..."
            className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 pl-3 pr-9 py-2 text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <option value="all">All Statuses</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
          <option value="error">Validation Error</option>
        </select>

        {/* Runtime Filter */}
        <select
          value={runtimeFilter}
          onChange={(e) => setRuntimeFilter(e.target.value as any)}
          className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <option value="all">All Runtimes</option>
          <option value="lua">Lua Script</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="external">External Runtime</option>
        </select>

        {/* Permission Risk Filter */}
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value as any)}
          className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <option value="all">All Risk Levels</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
      </div>

      {/* Install input */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={installUrl}
          onChange={(e) => setInstallUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && installFromUrl()}
          placeholder="Install plugin from Git URL or Registry ID..."
          className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        />
        <button
          type="button"
          onClick={installFromUrl}
          disabled={installing || !installUrl.trim()}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 text-xs font-semibold text-nd-success hover:bg-nd-success/15 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-nd-success/40"
        >
          <Download className="h-3.5 w-3.5" /> {installing ? 'Installing...' : 'Install'}
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-nd-danger/20 bg-nd-danger/5 px-4 py-2.5 text-xs text-nd-danger">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-nd-text-muted hover:text-nd-text text-[10px] uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Split pane container */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* LEFT COLUMN: PLUGIN LIST */}
        <div className="flex-1 flex flex-col min-h-0 border border-nd-text-muted/10 bg-nd-surface/10 rounded-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
            {loading && plugins.length === 0 ? (
              <LoadingState label="Scanning plugins..." />
            ) : filteredPlugins.length === 0 ? (
              <EmptyState
                icon={Plug}
                title="No Plugins Match"
                description={plugins.length === 0 ? "Place Lua scripts in the plugins folder or install via URL." : "Try adjusting your filters or search terms."}
              />
            ) : (
              filteredPlugins.map((p) => {
                const isSelected = selectedPlugin?.file_name === p.file_name;
                const validation = validationStatuses[p.file_name];
                const hasErrors = validation ? !validation.passed : false;
                
                return (
                  <div
                    key={p.file_name}
                    onClick={() => handleSelectPlugin(p)}
                    className={`rounded-xl border p-4 transition duration-200 cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-nd-accent bg-nd-accent/[0.03]'
                        : 'border-nd-text-muted/15 bg-nd-surface/30 hover:border-nd-accent/25 hover:bg-nd-surface/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileCode className={`h-4 w-4 shrink-0 ${p.enabled ? 'text-nd-accent' : 'text-nd-text-muted'}`} />
                          <h4 className="font-semibold text-xs text-nd-text truncate">{p.name}</h4>
                          {hasErrors && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-nd-danger/10 px-1.5 py-0.5 text-[9px] font-bold text-nd-danger">
                              Failed QA
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-nd-text-muted mt-0.5 font-mono truncate">{p.file_name}</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggle(p);
                        }}
                        aria-label={p.enabled ? `Disable ${p.name}` : `Enable ${p.name}`}
                        className="text-nd-accent hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded shrink-0"
                      >
                        {p.enabled ? (
                          <ToggleRight className="h-6 w-6 text-nd-success" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-nd-text-muted" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-nd-text-muted/80 line-clamp-1">{p.description || 'No description provided.'}</p>

                    <div className="flex items-center justify-between text-[10px] text-nd-text-muted/70 mt-1 border-t border-nd-text-muted/5 pt-2">
                      <div className="flex items-center gap-3">
                        {p.version && <span>v{p.version}</span>}
                        {p.author && <span className="truncate max-w-[80px]">By {p.author}</span>}
                        <span>{p.permissions.length} perms</span>
                      </div>
                      
                      {p.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmUninstallId(p.id!);
                          }}
                          aria-label={`Uninstall ${p.name}`}
                          className="text-nd-text-muted hover:text-nd-danger p-0.5 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                          title="Uninstall Plugin"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILS DRAWER */}
        <div className="w-full md:w-[380px] shrink-0 flex flex-col border border-nd-text-muted/10 bg-nd-surface/20 rounded-2xl overflow-hidden">
          {!selectedPlugin ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-nd-text-muted select-none">
              <Plug className="h-10 w-10 text-nd-text-muted/30 mb-3" />
              <p className="text-xs font-semibold">No Plugin Selected</p>
              <p className="text-[10px] mt-1 max-w-[200px]">Select any active or installed plugin to inspect its manifest, permissions, and security audit log.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-nd-text-muted/10 bg-nd-surface/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-nd-text truncate">{selectedPlugin.name}</h3>
                    <p className="text-[10px] text-nd-text-muted font-mono truncate mt-0.5">{selectedPlugin.file_name}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    selectedPlugin.enabled
                      ? 'bg-nd-success/10 text-nd-success border border-nd-success/20'
                      : 'bg-nd-text-muted/10 text-nd-text-muted border border-nd-text-muted/20'
                  }`}>
                    {selectedPlugin.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                
                {/* Description */}
                <div className="space-y-1.5">
                  <h5 className="text-[10px] uppercase font-bold tracking-wider text-nd-text-muted">Description</h5>
                  <p className="text-xs text-nd-text/90 leading-normal">{selectedPlugin.description || 'No description provided.'}</p>
                </div>

                {/* Metadata Details */}
                <div className="space-y-1.5 border-t border-nd-text-muted/10 pt-4">
                  <h5 className="text-[10px] uppercase font-bold tracking-wider text-nd-text-muted mb-2">Manifest Details</h5>
                  <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                    <div>
                      <span className="text-nd-text-muted block">Author</span>
                      <span className="text-nd-text font-semibold">{selectedPlugin.author || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-nd-text-muted block">Version</span>
                      <span className="text-nd-text font-semibold">v{selectedPlugin.version || '1.0.0'}</span>
                    </div>
                    <div>
                      <span className="text-nd-text-muted block">Runtime</span>
                      <span className="text-nd-text font-semibold capitalize">{getPluginRuntime(selectedPlugin.file_name)}</span>
                    </div>
                    <div>
                      <span className="text-nd-text-muted block">Marketplace</span>
                      <span className="text-nd-text font-semibold">{selectedPlugin.marketplace ? 'Yes' : 'Local'}</span>
                    </div>
                  </div>
                </div>

                {/* Validation Status card */}
                <div className="space-y-2 border-t border-nd-text-muted/10 pt-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] uppercase font-bold tracking-wider text-nd-text-muted">QA Validation Check</h5>
                    <button
                      type="button"
                      onClick={() => validatePlugin(selectedPlugin.file_name)}
                      disabled={validating}
                      className="text-[10px] font-bold text-nd-accent hover:brightness-110 flex items-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded px-1 py-0.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${validating ? 'animate-spin' : ''}`} /> Run Audit
                    </button>
                  </div>
                  
                  {validating ? (
                    <div className="p-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 flex items-center gap-2.5 text-xs text-nd-text-muted">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-nd-accent" />
                      <span>Auditing script contents...</span>
                    </div>
                  ) : validationStatuses[selectedPlugin.file_name] ? (
                    (() => {
                      const report = validationStatuses[selectedPlugin.file_name];
                      if (report.passed) {
                        return (
                          <div className="p-3 rounded-xl border border-nd-success/20 bg-nd-success/[0.03] space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-nd-success">
                              <ShieldCheck className="h-4 w-4" /> Passed QA Gate
                            </div>
                            <p className="text-[10px] text-nd-text-muted">No security or compiler syntax issues discovered inside the script.</p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-3 rounded-xl border border-nd-danger/20 bg-nd-danger/[0.03] space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-nd-danger">
                              <AlertTriangle className="h-4 w-4" /> Validation Warnings/Errors
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[10px] text-nd-text-muted">
                              {report.errors.map((err, i) => (
                                <li key={i} className="text-nd-danger/90">{err}</li>
                              ))}
                              {report.warnings.map((warn, i) => (
                                <li key={i} className="text-nd-warning">{warn}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div className="p-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 text-[10px] text-nd-text-muted">
                      Validation not yet performed. Click 'Run Audit' above to scan the plugin's code integrity.
                    </div>
                  )}
                </div>

                {/* Permissions list */}
                <div className="space-y-2 border-t border-nd-text-muted/10 pt-4">
                  <h5 className="text-[10px] uppercase font-bold tracking-wider text-nd-text-muted">Requested Permissions</h5>
                  {selectedPlugin.permissions.length === 0 ? (
                    <p className="text-xs text-nd-text-muted">No security permissions requested by this plugin.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedPlugin.permissions.map((perm) => {
                        const risk = getPermissionRisk(perm);
                        return (
                          <div
                            key={perm}
                            className={`rounded-lg border p-2 flex items-start gap-2.5 text-xs ${
                              risk === 'high'
                                ? 'border-nd-danger/20 bg-nd-danger/[0.02]'
                                : risk === 'medium'
                                ? 'border-nd-warning/20 bg-nd-warning/[0.02]'
                                : 'border-nd-text-muted/10 bg-nd-surface/30'
                            }`}
                          >
                            <span className={`font-bold uppercase tracking-wider text-[8px] rounded px-1.5 py-0.5 mt-0.5 border ${
                              risk === 'high'
                                ? 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger'
                                : risk === 'medium'
                                ? 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning'
                                : 'border-nd-text-muted/20 bg-nd-surface-raised text-nd-text-muted'
                            }`}>
                              {risk}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-nd-text font-mono truncate">{perm}</p>
                              <p className="text-[10px] text-nd-text-muted mt-0.5">
                                {perm === 'shell_execution' && 'Executes system shell binary commands and utilities.'}
                                {perm === 'filesystem_write' && 'Creates, deletes, or writes content to local codebase files.'}
                                {perm === 'filesystem_read' && 'Reads content from local codebase directory paths.'}
                                {perm === 'network_access' && 'Makes outgoing HTTP requests to remote network addresses.'}
                                {perm === 'clipboard_access' && 'Reads or writes to the operating system copy/paste buffer.'}
                                {perm === 'model_access' && 'Queries configured LLMs for completions.'}
                                {perm === 'session_access' && 'Inspects chat logging and session state databases.'}
                                {perm === 'memory_access' && 'Queries and pins SQLite vector database facts.'}
                                {perm === 'notification_access' && 'Displays desktop notifications and warning alerts.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="px-5 py-4 border-t border-nd-text-muted/10 bg-nd-surface/30 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={copyDiagnostics}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 py-2 text-xs font-semibold text-nd-text transition hover:bg-nd-surface/60 focus-visible:ring-2 focus-visible:ring-nd-accent/40 focus-visible:outline-none"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copied Details!' : 'Copy Diagnostics'}
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Dangerous Permission Warning Modal */}
      <Modal
        open={!!showPermissionWarning}
        onClose={() => setShowPermissionWarning(null)}
        size="md"
        title="Dangerous Permission Request"
        closeOnBackdrop={false}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowPermissionWarning(null)}
              className="inline-flex h-9 items-center rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-4 text-xs font-semibold text-nd-text transition hover:bg-nd-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              Cancel / Keep Disabled
            </button>
            <button
              type="button"
              onClick={async () => {
                if (showPermissionWarning) {
                  const p = showPermissionWarning;
                  setShowPermissionWarning(null);
                  await executeToggle(p.file_name, true);
                }
              }}
              className="inline-flex h-9 items-center rounded-xl bg-nd-danger px-4 text-xs font-bold text-nd-bg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
            >
              Enable Anyway
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-nd-danger">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <p className="font-semibold text-sm text-nd-text">Allow high-risk access permissions?</p>
              <p className="mt-1 text-xs text-nd-text-muted">
                The plugin <strong className="text-nd-text font-semibold">"{showPermissionWarning?.name}"</strong> requests elevated security access. Enabling it will grant these permissions immediately.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-nd-danger/20 bg-nd-danger/[0.03] p-4 space-y-3">
            <h6 className="text-[10px] uppercase font-bold tracking-wider text-nd-danger">Requested High-Risk Items:</h6>
            <div className="space-y-2">
              {showPermissionWarning?.permissions.filter(perm => getPermissionRisk(perm) === 'high').map(perm => (
                <div key={perm} className="text-xs">
                  <p className="font-semibold text-nd-text font-mono">{perm}</p>
                  <p className="text-[10px] text-nd-text-muted mt-0.5">
                    {perm === 'shell_execution' && 'Allows the script to invoke host operating system binary CLI commands and scripts.'}
                    {perm === 'filesystem_write' && 'Allows the script to create, modify, or delete local files.'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-nd-text-muted leading-relaxed">
            Only enable plugins from authors you completely trust. Malicious scripts can read, write, or execute arbitrary operations on your local machine.
          </p>
        </div>
      </Modal>

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
