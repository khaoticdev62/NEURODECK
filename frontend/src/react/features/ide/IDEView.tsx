import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Code, FileCode, FolderOpen, Plus, Save, Trash2, RefreshCw,
  X, FilePlus, FolderPlus, AlertCircle
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { PredictionResult, CommandTemplate, IdeMode } from '../../../shared/ide/ideContracts';
import { getProfileForFile } from '../../../shared/ide/languageProfiles';
import { getTopCommands } from '../../../shared/ide/languageCommands';
import { getControllerFriendlySnippets } from '../../../shared/ide/predictiveSnippets';
import { PredictiveBar } from './PredictiveBar';
import { ControllerHintBar } from './ControllerHintBar';
import { LanguageModeBadge } from './LanguageModeBadge';
import { RadialCommandWheel } from './RadialCommandWheel';
import { SafeCommandConfirmModal } from './SafeCommandConfirmModal';
import { Modal } from '../../components/primitives/Modal';
import type { DiagnosticFix } from './DiagnosticFixPanel';
import { DiagnosticFixPanel } from './DiagnosticFixPanel';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  lang: string;
  lspVersion: number;
}

interface LspDiagnostic {
  message: string;
  severity: number;
  line: number;
  character: number;
}

interface PendingCommand {
  cmd: CommandTemplate;
  resolveRun: () => void;
  resolveCancel: () => void;
}

function getLanguage(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
    rs: 'rust', py: 'python', lua: 'lua', html: 'html',
    css: 'css', scss: 'scss', json: 'json', md: 'markdown',
    toml: 'toml', yaml: 'yaml', yml: 'yaml', sh: 'bash',
    bash: 'bash', zsh: 'bash', c: 'c', cpp: 'cpp',
    h: 'c', hpp: 'cpp', go: 'go', java: 'java',
    kt: 'kotlin', swift: 'swift', rb: 'ruby', php: 'php',
    sql: 'sql', dockerfile: 'dockerfile',
  };
  return map[ext] || 'text';
}

function getLangIcon(lang: string) {
  const map: Record<string, string> = {
    rust: '🦀', javascript: '📜', typescript: '📘', python: '🐍',
    lua: '🌙', html: '🌐', css: '🎨', json: '📋',
    markdown: '📝', bash: '💲', go: '🐹', java: '☕',
    c: '🔧', cpp: '🔧',
  };
  return map[lang] || '📄';
}

function fileUri(path: string): string {
  return `file:///${path.replace(/\\/g, '/')}`;
}

export function IDEView() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ text: string; tone: 'info' | 'ok' | 'error' | 'warn' }[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // IDE controller state
  const [ideMode, setIdeMode] = useState<IdeMode>('IDE_NAVIGATION');
  const [showHintBar, setShowHintBar] = useState(true);
  const [showRadialWheel, setShowRadialWheel] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [diagnostics, setDiagnostics] = useState<LspDiagnostic[]>([]);
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null);
  const [diagnosticFixes, setDiagnosticFixes] = useState<DiagnosticFix[]>([]);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  const [activeDiagnosticMsg, setActiveDiagnosticMsg] = useState('');
  const [commandOutput, setCommandOutput] = useState<{ type: string; data: string }[]>([]);
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('untitled.txt');

  // Debounce refs
  const lspChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const predictionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const log = useCallback((text: string, tone: 'info' | 'ok' | 'error' | 'warn' = 'info') => {
    setLogs((prev) => [...prev.slice(-99), { text, tone }]);
  }, []);

  const loadFiles = useCallback(async (path = '') => {
    setLoading(true);
    try {
      const res = await neurodeckApi.ide.listWorkspaceFiles(path || undefined);
      setFiles(res.files || []);
      setCurrentPath(path);
    } catch (e) {
      log(`Cannot list files: ${e}`, 'error');
    }
    setLoading(false);
  }, [log]);

  useEffect(() => {
    loadFiles('');
    log('Mini IDE ready. Workspace loaded.', 'ok');
  }, [loadFiles, log]);

  // ── LSP: subscribe to diagnostics & controller mode changes ──────────
  useEffect(() => {
    const nd = (window as any).neurodeck;
    const unsubDiagnostics = nd?.lsp?.onDiagnostics?.((data: { uri: string; diagnostics: LspDiagnostic[] }) => {
      if (activeTab && data.uri === fileUri(activeTab)) {
        setDiagnostics(data.diagnostics ?? []);
      }
    });

    const unsubMode = nd?.controller?.onIdeModeChanged?.((data: { mode: IdeMode }) => {
      if (data?.mode) setIdeMode(data.mode);
    });

    const unsubOutput = neurodeckApi.ide.onCommandOutput((data) => {
      setCommandOutput((prev) => [...prev.slice(-499), { type: data.type, data: data.data }]);
      log(`[${data.type}] ${data.data.trim()}`, data.type === 'stderr' ? 'error' : 'info');
    });

    return () => {
      unsubDiagnostics?.();
      unsubMode?.();
      unsubOutput?.();
    };
  }, [activeTab, log]);

  // ── Open file: notify LSP ─────────────────────────────────────────────
  const openFile = useCallback(async (path: string, name: string) => {
    const existing = openTabs.find((t) => t.path === path);
    if (existing) {
      setActiveTab(path);
      return;
    }
    try {
      const res = await neurodeckApi.ide.readWorkspaceFile(path);
      const lang = getLanguage(name);
      const tab: OpenTab = { path, name, content: res.content, dirty: false, lang, lspVersion: 1 };
      setOpenTabs((prev) => [...prev, tab]);
      setActiveTab(path);
      setDiagnostics([]);
      setPredictions([]);

      const nd = (window as any).neurodeck;
      nd?.lsp?.openDocument?.(lang, fileUri(path), res.content).catch(() => {});
    } catch (e) {
      log(`Cannot open ${name}: ${e}`, 'error');
    }
  }, [openTabs, log]);

  // ── Close tab: notify LSP ─────────────────────────────────────────────
  const closeTab = useCallback((path: string) => {
    const tab = openTabs.find((t) => t.path === path);
    if (tab) {
      const nd = (window as any).neurodeck;
      nd?.lsp?.closeDocument?.(tab.lang, fileUri(path)).catch(() => {});
    }
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      if (activeTab === path) {
        setActiveTab(next[idx]?.path ?? next[next.length - 1]?.path ?? null);
      }
      return next;
    });
  }, [activeTab, openTabs]);

  const saveActiveFile = useCallback(async () => {
    if (!activeTab || !editorRef.current) return;
    const content = editorRef.current.value;
    try {
      await neurodeckApi.ide.writeWorkspaceFile(activeTab, content);
      setOpenTabs((prev) => prev.map((t) => t.path === activeTab ? { ...t, content, dirty: false } : t));
      log(`Saved ${activeTab}`, 'ok');
    } catch (e) {
      log(`Save failed: ${e}`, 'error');
    }
  }, [activeTab, log]);

  const onEditorInput = useCallback(() => {
    if (!activeTab || !editorRef.current) return;
    const value = editorRef.current.value;
    setOpenTabs((prev) => prev.map((t) =>
      t.path === activeTab ? { ...t, content: value, dirty: true, lspVersion: t.lspVersion + 1 } : t
    ));
    updateLineNumbers();

    // LSP changeDocument (debounced 300ms)
    if (lspChangeTimer.current) clearTimeout(lspChangeTimer.current);
    lspChangeTimer.current = setTimeout(() => {
      const tab = openTabs.find((t) => t.path === activeTab);
      if (!tab) return;
      const nd = (window as any).neurodeck;
      nd?.lsp?.changeDocument?.(tab.lang, fileUri(activeTab), value, tab.lspVersion + 1).catch(() => {});
    }, 300);
  }, [activeTab, openTabs]);

  const onEditorScroll = useCallback(() => {
    if (lineNumbersRef.current && editorRef.current) {
      lineNumbersRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  const updateLineNumbers = useCallback(() => {
    if (!editorRef.current || !lineNumbersRef.current) return;
    const lines = editorRef.current.value.split('\n').length;
    lineNumbersRef.current.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<div class="px-2 text-right text-[11px] leading-5 text-nd-text-muted/40 select-none">${i + 1}</div>`
    ).join('');
  }, []);

  // ── Cursor change → fetch predictions (debounced 200ms) ──────────────
  const onEditorCursorChange = useCallback(() => {
    if (!activeTab || !editorRef.current) return;
    const tab = openTabs.find((t) => t.path === activeTab);
    if (!tab) return;

    if (predictionTimer.current) clearTimeout(predictionTimer.current);
    predictionTimer.current = setTimeout(async () => {
      try {
        const el = editorRef.current;
        if (!el) return;
        const textBefore = el.value.slice(0, el.selectionStart);
        const lines = textBefore.split('\n');
        const cursorLine = lines.length - 1;
        const cursorChar = lines[cursorLine]?.length ?? 0;
        const profile = getProfileForFile(tab.name);
        const snippetIds = profile ? getControllerFriendlySnippets(profile.id).map((s) => s.id) : [];

        const results = await neurodeckApi.ide.getPredictions(
          activeTab, tab.lang, cursorLine, cursorChar,
          diagnostics.length, snippetIds, [], [],
        );
        if (Array.isArray(results)) {
          setPredictions(results);
          if (results.length > 0) setShowPredictions(true);
        }
      } catch {
        // Non-fatal — predictions are best-effort
      }
    }, 200);
  }, [activeTab, openTabs, diagnostics.length]);

  const activeTabData = openTabs.find((t) => t.path === activeTab);

  useEffect(() => {
    if (editorRef.current && activeTabData) {
      editorRef.current.value = activeTabData.content;
      updateLineNumbers();
    }
  }, [activeTab, activeTabData?.content, updateLineNumbers]);

  const newFile = useCallback(async () => {
    const name = newFileName.trim();
    if (!name) return;
    const path = currentPath ? `${currentPath}/${name}` : name;
    try {
      await neurodeckApi.ide.createWorkspaceFile(path);
      setNewFileModalOpen(false);
      setNewFileName('untitled.txt');
      log(`Created ${path}`, 'ok');
      await loadFiles(currentPath);
      await openFile(path, name);
    } catch (e) {
      log(`Cannot create file: ${e}`, 'error');
    }
  }, [currentPath, loadFiles, log, newFileName, openFile]);

  const deleteFile = useCallback(async () => {
    if (!activeTab) return;
    const tab = openTabs.find((t) => t.path === activeTab);
    if (!tab) return;
    if (!window.confirm(`Delete '${tab.name}'? This cannot be undone.`)) return;
    try {
      await neurodeckApi.ide.deleteWorkspaceFile(activeTab);
      closeTab(activeTab);
      log(`Deleted ${tab.name}`, 'ok');
      await loadFiles(currentPath);
    } catch (e) {
      log(`Delete failed: ${e}`, 'error');
    }
  }, [activeTab, openTabs, closeTab, currentPath, loadFiles, log]);

  // ── Command execution ─────────────────────────────────────────────────
  const executeCommand = useCallback(async (cmd: CommandTemplate) => {
    if (cmd.safety === 'blocked') {
      log(`[BLOCKED] ${cmd.label} is not permitted`, 'error');
      return;
    }

    if (cmd.safety === 'confirm' || cmd.safety === 'dangerous') {
      await new Promise<void>((resolveRun, resolveCancel) => {
        setPendingCommand({ cmd, resolveRun, resolveCancel });
      });
    }

    const cwd = activeTab
      ? activeTab.replace(/[/\\][^/\\]+$/, '') || '.'
      : '.';

    try {
      log(`Running: ${cmd.label}`, 'info');
      await neurodeckApi.ide.runCommand(cmd.command, cmd.args, cwd, cmd.safety, cmd.label);
    } catch (e) {
      log(`Command failed: ${e}`, 'error');
    }
  }, [activeTab, log]);

  // ── Radial wheel command handler ──────────────────────────────────────
  const handleRadialCommand = useCallback((cmd: CommandTemplate) => {
    setShowRadialWheel(false);
    executeCommand(cmd);
  }, [executeCommand]);

  // ── Prediction accept ─────────────────────────────────────────────────
  const acceptPrediction = useCallback((p: PredictionResult) => {
    if (p.type === 'snippet' || p.type === 'lsp_completion') {
      if (p.insertText && editorRef.current) {
        const el = editorRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = el.value.slice(0, start) + p.insertText + el.value.slice(end);
        el.selectionStart = el.selectionEnd = start + p.insertText.length;
        onEditorInput();
        log(`Applied: ${p.label}`, 'ok');
      }
    } else if (p.type === 'diagnostic_fix') {
      setShowDiagnosticPanel(true);
      setActiveDiagnosticMsg(diagnostics[0]?.message ?? 'Diagnostic');
      setDiagnosticFixes([{ id: 'apply-fix', title: 'Apply suggested fix', kind: 'quickfix' }]);
    }
    setShowPredictions(false);
  }, [onEditorInput, diagnostics, log]);

  // ── Active language profile ───────────────────────────────────────────
  const activeProfile = activeTabData ? getProfileForFile(activeTabData.name) : null;
  const activeCommands: CommandTemplate[] = activeProfile
    ? getTopCommands(activeProfile, { rootPath: currentPath, detectedLanguages: [activeProfile.id], packageManager: 'none', hasGit: false, configFiles: [], availableScripts: {}, detectedAt: '' }, 8)
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Controller hint bar */}
      <ControllerHintBar ideMode={ideMode} visible={showHintBar} />

      <div className="mb-3 mt-2 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Code className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-nd-text">IDE</h2>
            {activeTabData && (
              <LanguageModeBadge
                languageId={activeProfile?.id ?? activeTabData.lang}
                displayName={activeProfile?.displayName ?? activeTabData.lang}
                lspStatus="ready"
                ideMode={ideMode}
              />
            )}
          </div>
          <p className="text-xs text-nd-text-muted">Integrated code workspace</p>
        </div>
        <div className="flex gap-1">
          <IconBtn title="New file" onClick={newFile}><FilePlus className="h-4 w-4" /></IconBtn>
          <IconBtn title="Save (Ctrl+S)" onClick={saveActiveFile}><Save className="h-4 w-4" /></IconBtn>
          <IconBtn title="Delete" onClick={deleteFile}><Trash2 className="h-4 w-4" /></IconBtn>
          <IconBtn title="Command wheel (Y)" onClick={() => setShowRadialWheel(true)}>
            <span className="text-xs font-bold">⊕</span>
          </IconBtn>
          <IconBtn title="Toggle hints" onClick={() => setShowHintBar((v) => !v)}>
            <span className="text-[10px] font-bold">HB</span>
          </IconBtn>
          <IconBtn title="Refresh" onClick={() => loadFiles(currentPath)}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </IconBtn>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* File tree */}
        <div className="flex w-52 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
            <FolderOpen className="h-3.5 w-3.5" /> Explorer
          </div>
          <div className="min-h-0 flex-1 overflow-auto space-y-0.5">
            {currentPath && (
              <button
                type="button"
                onClick={() => {
                  const parts = currentPath.split(/[/\\]/).filter(Boolean);
                  loadFiles(parts.slice(0, -1).join('/'));
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-nd-text-muted hover:bg-nd-surface/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              >
                <FolderOpen className="h-3.5 w-3.5" /> ..
              </button>
            )}
            <div className="px-2 py-1 text-[10px] text-nd-text-muted/60 truncate">{currentPath || 'workspace'}</div>
            {files.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-nd-text-muted/50 italic">No files</div>
            )}
            {files.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => f.is_dir ? loadFiles(f.path) : openFile(f.path, f.name)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${
                  activeTab === f.path ? 'bg-nd-accent/10 text-nd-accent' : 'text-nd-text-muted hover:bg-nd-surface/50'
                }`}
              >
                {f.is_dir ? <FolderOpen className="h-3.5 w-3.5 shrink-0" /> : <span className="shrink-0 text-xs">{getLangIcon(getLanguage(f.name))}</span>}
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex gap-1 overflow-x-auto">
              {openTabs.map((tab) => (
                <button
                  key={tab.path}
                  type="button"
                  onClick={() => setActiveTab(tab.path)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                    activeTab === tab.path
                      ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
                      : 'border-nd-text-muted/15 bg-nd-surface/30 text-nd-text-muted hover:bg-nd-surface/50'
                  }`}
                >
                  <span>{getLangIcon(tab.lang)}</span>
                  <span className="truncate max-w-[120px]">{tab.name}{tab.dirty ? ' ●' : ''}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
                    aria-label={`Close ${tab.name}`}
                    className="ml-1 rounded p-0.5 hover:bg-nd-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/50"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40">
            {activeTabData ? (
              <>
                <div className="flex items-center gap-2 border-b border-nd-text-muted/15 px-3 py-2">
                  <FileCode className="h-3.5 w-3.5 text-nd-text-muted" />
                  <span className="text-xs text-nd-text-muted">{activeTabData.name}</span>
                  {activeTabData.dirty && <span className="text-[10px] text-nd-accent">modified</span>}
                  {diagnostics.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiagnosticPanel(true);
                        setActiveDiagnosticMsg(diagnostics[0]?.message ?? '');
                        setDiagnosticFixes([]);
                      }}
                      className="ml-auto flex items-center gap-1 text-[11px] text-nd-danger hover:text-nd-danger/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-danger/40 rounded px-1"
                    >
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      <span>{diagnostics.length} issue{diagnostics.length !== 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>
                <div className="relative flex min-h-0 flex-1">
                  <div ref={lineNumbersRef} className="w-10 shrink-0 overflow-hidden py-3" aria-hidden="true" />
                  <textarea
                    ref={editorRef}
                    onInput={onEditorInput}
                    onScroll={onEditorScroll}
                    onClick={onEditorCursorChange}
                    onKeyUp={onEditorCursorChange}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        saveActiveFile();
                      }
                      if (e.key === 'Tab' && !showPredictions) {
                        e.preventDefault();
                        const el = e.currentTarget;
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        el.value = el.value.slice(0, start) + '  ' + el.value.slice(end);
                        el.selectionStart = el.selectionEnd = start + 2;
                        onEditorInput();
                      }
                    }}
                    className="min-h-0 flex-1 resize-none bg-transparent py-3 pr-3 font-mono text-sm leading-5 text-nd-text/90 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-nd-accent/40"
                    spellCheck={false}
                    aria-label="Code editor"
                  />

                  {/* Diagnostic fix panel */}
                  <DiagnosticFixPanel
                    fixes={diagnosticFixes}
                    diagnosticMessage={activeDiagnosticMsg}
                    onApply={(fix) => {
                      log(`Applied fix: ${fix.title}`, 'ok');
                      setShowDiagnosticPanel(false);
                    }}
                    onClose={() => setShowDiagnosticPanel(false)}
                    visible={showDiagnosticPanel}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-nd-text-muted/50">
                <Code className="h-10 w-10" />
                <p className="text-sm">Select a file from the explorer to start editing</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewFileModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-nd-accent/30 bg-nd-accent/10 px-3 py-2 text-xs text-nd-accent hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
                    <FilePlus className="h-3.5 w-3.5" /> New File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Predictive bar */}
          <PredictiveBar
            predictions={predictions}
            languageId={activeTabData?.lang ?? null}
            onAccept={acceptPrediction}
            onDismiss={() => setShowPredictions(false)}
            visible={showPredictions && predictions.length > 0}
          />

          {/* Output log */}
          <div className="h-28 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">Output</span>
              <button type="button" onClick={() => setLogs([])} className="text-[11px] text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded px-1">Clear</button>
            </div>
            <div className="h-[calc(100%-1.25rem)] overflow-auto space-y-0.5 px-1">
              {logs.length === 0 && <p className="text-[11px] text-nd-text-muted/40 italic">No output yet</p>}
              {logs.map((l, i) => (
                <div key={i} className={`text-[11px] font-mono ${
                  l.tone === 'error' ? 'text-nd-danger' : l.tone === 'ok' ? 'text-nd-success' : l.tone === 'warn' ? 'text-nd-warning' : 'text-nd-text-muted'
                }`}>
                  [{new Date().toLocaleTimeString('en-US', { hour12: false })}] {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Radial command wheel overlay */}
      <RadialCommandWheel
        visible={showRadialWheel}
        languageId={activeTabData?.lang ?? null}
        commands={activeCommands}
        onRunCommand={handleRadialCommand}
        onClose={() => setShowRadialWheel(false)}
      />

      {/* Safe command confirmation modal */}
      {pendingCommand && (
        <SafeCommandConfirmModal
          command={pendingCommand.cmd.command}
          args={pendingCommand.cmd.args}
          cwd={activeTab ? activeTab.replace(/[/\\][^/\\]+$/, '') || '.' : '.'}
          safety={pendingCommand.cmd.safety}
          label={pendingCommand.cmd.label}
          description={pendingCommand.cmd.description}
          onConfirm={() => {
            pendingCommand.resolveRun();
            setPendingCommand(null);
          }}
          onCancel={() => {
            pendingCommand.resolveCancel();
            setPendingCommand(null);
            log(`Cancelled: ${pendingCommand.cmd.label}`, 'warn');
          }}
        />
      )}
      <Modal
        open={newFileModalOpen}
        onClose={() => setNewFileModalOpen(false)}
        title="Create File"
        description="Create a new workspace file in the current directory."
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setNewFileModalOpen(false)}
              className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void newFile()}
              disabled={!newFileName.trim()}
              className="rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent disabled:opacity-50"
            >
              Create
            </button>
          </>
        }
      >
        <input
          value={newFileName}
          onChange={(event) => setNewFileName(event.target.value)}
          placeholder="untitled.txt"
          className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-bg/60 px-3 py-2 text-sm text-nd-text outline-none"
        />
      </Modal>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
      aria-label={title}
    >
      {children}
    </button>
  );
}
