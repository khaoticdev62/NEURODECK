import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Code, FileCode, FolderOpen, Plus, Save, Trash2, RefreshCw,
  X, FilePlus, FolderPlus, AlertCircle
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

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

export function IDEView() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ text: string; tone: 'info' | 'ok' | 'error' | 'warn' }[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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

  const openFile = useCallback(async (path: string, name: string) => {
    const existing = openTabs.find((t) => t.path === path);
    if (existing) {
      setActiveTab(path);
      return;
    }
    try {
      const res = await neurodeckApi.ide.readWorkspaceFile(path);
      const tab: OpenTab = { path, name, content: res.content, dirty: false, lang: getLanguage(name) };
      setOpenTabs((prev) => [...prev, tab]);
      setActiveTab(path);
    } catch (e) {
      log(`Cannot open ${name}: ${e}`, 'error');
    }
  }, [openTabs, log]);

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

  const closeTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      if (activeTab === path) {
        setActiveTab(next[idx]?.path ?? next[next.length - 1]?.path ?? null);
      }
      return next;
    });
  }, [activeTab]);

  const onEditorInput = useCallback(() => {
    if (!activeTab || !editorRef.current) return;
    const value = editorRef.current.value;
    setOpenTabs((prev) => prev.map((t) => t.path === activeTab ? { ...t, content: value, dirty: true } : t));
    updateLineNumbers();
  }, [activeTab]);

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

  const activeTabData = openTabs.find((t) => t.path === activeTab);

  useEffect(() => {
    if (editorRef.current && activeTabData) {
      editorRef.current.value = activeTabData.content;
      updateLineNumbers();
    }
  }, [activeTab, activeTabData?.content, updateLineNumbers]);

  const newFile = useCallback(async () => {
    const name = window.prompt('Enter filename (with extension):', 'untitled.txt');
    if (!name) return;
    const path = currentPath ? `${currentPath}/${name}` : name;
    try {
      await neurodeckApi.ide.createWorkspaceFile(path);
      log(`Created ${path}`, 'ok');
      await loadFiles(currentPath);
      await openFile(path, name);
    } catch (e) {
      log(`Cannot create file: ${e}`, 'error');
    }
  }, [currentPath, loadFiles, openFile, log]);

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

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Code className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">IDE</h2>
          <p className="text-xs text-nd-text-muted">Integrated code workspace</p>
        </div>
        <div className="flex gap-1">
          <IconBtn title="New file" onClick={newFile}><FilePlus className="h-4 w-4" /></IconBtn>
          <IconBtn title="Save" onClick={saveActiveFile}><Save className="h-4 w-4" /></IconBtn>
          <IconBtn title="Delete" onClick={deleteFile}><Trash2 className="h-4 w-4" /></IconBtn>
          <IconBtn title="Refresh" onClick={() => loadFiles(currentPath)}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></IconBtn>
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
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-nd-text-muted hover:bg-nd-surface/50"
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
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
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
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                    activeTab === tab.path
                      ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
                      : 'border-nd-text-muted/15 bg-nd-surface/30 text-nd-text-muted hover:bg-nd-surface/50'
                  }`}
                >
                  <span>{getLangIcon(tab.lang)}</span>
                  <span className="truncate max-w-[120px]">{tab.name}{tab.dirty ? ' ●' : ''}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
                    className="ml-1 rounded p-0.5 hover:bg-nd-surface/60"
                  >
                    <X className="h-3 w-3" />
                  </span>
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
                </div>
                <div className="relative flex min-h-0 flex-1">
                  <div ref={lineNumbersRef} className="w-10 shrink-0 overflow-hidden py-3" aria-hidden="true" />
                  <textarea
                    ref={editorRef}
                    onInput={onEditorInput}
                    onScroll={onEditorScroll}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        saveActiveFile();
                      }
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const el = e.currentTarget;
                        const start = el.selectionStart;
                        const end = el.selectionEnd;
                        el.value = el.value.slice(0, start) + '  ' + el.value.slice(end);
                        el.selectionStart = el.selectionEnd = start + 2;
                        onEditorInput();
                      }
                    }}
                    className="min-h-0 flex-1 resize-none bg-transparent py-3 pr-3 font-mono text-sm leading-5 text-nd-text/90 outline-none"
                    spellCheck={false}
                    aria-label="Code editor"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-nd-text-muted/50">
                <Code className="h-10 w-10" />
                <p className="text-sm">Select a file from the explorer to start editing</p>
                <div className="flex gap-2">
                  <button type="button" onClick={newFile} className="flex items-center gap-1.5 rounded-lg border border-nd-accent/30 bg-nd-accent/10 px-3 py-2 text-xs text-nd-accent hover:bg-nd-accent/20">
                    <FilePlus className="h-3.5 w-3.5" /> New File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Output log */}
          <div className="h-28 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">Output</span>
              <button type="button" onClick={() => setLogs([])} className="text-[10px] text-nd-text-muted hover:text-nd-text">Clear</button>
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
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text/80 active:scale-95"
      aria-label={title}
    >
      {children}
    </button>
  );
}
