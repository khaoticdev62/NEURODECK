import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { Activity, ArrowLeftRight, BookOpen, Bot, BrainCircuit, Database, FileDown, FileJson, FolderOpen, Globe, HardDrive, Lock, Paintbrush, Radio, Search, Settings, Share2, ShieldCheck, Sparkles, Terminal, Trash2, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { starterPrompts } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState, ViewId } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';

const RECENT_KEY = 'neurodeck:recent-commands';
const MAX_RECENT = 6;

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function writeRecent(recents: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // Token-based partial matching
  const qTokens = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const token of qTokens) {
    if (t.includes(token)) score += 20;
  }
  return score;
}

function highlightMatch(text: string, query: string): (string | JSX.Element)[] {
  if (!query.trim()) return [text];
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  for (let i = 0; i < t.length; i++) {
    const sub = t.slice(i, i + q.length);
    if (sub === q) {
      if (i > lastIndex) result.push(text.slice(lastIndex, i));
      result.push(<mark key={i} className="rounded bg-nd-accent/20 text-nd-accent">{text.slice(i, i + q.length)}</mark>);
      lastIndex = i + q.length;
      i += q.length - 1;
    }
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex));
  return result;
}

type ActionName = keyof Pick<NeuroDeckAppActions, 'scanProject' | 'buildProjectContext' | 'detectModels' | 'checkAiHealth' | 'refreshDiagnostics' | 'exportSession' | 'saveSession'>;

type CommandItem = {
  label: string;
  hint: string;
  view?: ViewId;
  settingsPanel?: string;
  icon: LucideIcon;
  action?: ActionName;
  prompt?: string;
  runPrompt?: boolean;
};

const commands: CommandItem[] = [
  { label: 'Open Workspace', hint: 'Mission control and composer', view: 'chat', icon: Sparkles },
  { label: 'Open Execution Layer', hint: 'Agent runs and tool audit history', view: 'execution', icon: Workflow },
  { label: 'Open Canvas', hint: 'Live code editor and execution', view: 'canvas', icon: Paintbrush },
  { label: 'Open Terminal', hint: 'PTY shell sessions', view: 'terminal', icon: Terminal },
  { label: 'Open SSH', hint: 'Secure shell connections', view: 'ssh', icon: Lock },
  { label: 'Open Tunnel', hint: 'SteamOS bridge controls', view: 'tunnel', icon: ArrowLeftRight },
  { label: 'Open Share', hint: 'LAN transfer and peer panels', view: 'share', icon: Share2 },
  { label: 'Open Browser', hint: 'Embedded web browser', view: 'browser', icon: Globe },
  { label: 'Open Agent Dock', hint: 'Run specialized AI operators', view: 'agent', icon: Bot },
  { label: 'Open Memory Vault', hint: 'Pinned project knowledge', view: 'memory', icon: Database },
  { label: 'Open Prompt Lab', hint: 'Prompt engineering formulas and PromptDrive', view: 'prompt-lab', icon: Sparkles },
  { label: 'Open Remote', hint: 'Mobile remote control server', view: 'remote', icon: Radio },
  { label: 'Open Docs', hint: 'Knowledge base and indexed docs', view: 'docs', icon: BookOpen },
  { label: 'Scan Project Folder', hint: 'Select a folder and detect stack, risks, scripts, and docs', icon: FolderOpen, action: 'scanProject' },
  { label: 'Build Project Context', hint: 'Read allowlisted files and redact sensitive values', icon: FileJson, action: 'buildProjectContext' },
  { label: 'Open Model Manager', hint: 'Local model inventory', view: 'models', icon: BrainCircuit },
  { label: 'Detect Local Models', hint: 'Check Ollama, LM Studio, llama.cpp, and GGUF folders', icon: BrainCircuit, action: 'detectModels' },
  { label: 'Check AI Health', hint: 'Ping local Ollama and LM Studio endpoints', icon: Activity, action: 'checkAiHealth' },
  { label: 'Open Agent Dock', hint: 'Run specialized AI operators', view: 'agents', icon: Bot },
  { label: 'Open Memory Vault', hint: 'Pinned project knowledge', view: 'memory', icon: Database },
  { label: 'Open Offline Cache', hint: 'Local cache and sync queue', view: 'cache', icon: HardDrive },
  { label: 'Export Session Markdown', hint: 'Write a local markdown export through the main process', icon: FileDown, action: 'exportSession' },
  { label: 'Save Session JSON', hint: 'Persist messages, context, and agent run history', icon: FileJson, action: 'saveSession' },
  { label: 'Refresh Diagnostics', hint: 'Read runtime info and recent IPC logs', icon: Activity, action: 'refreshDiagnostics' },
  { label: 'Open Settings', hint: 'Theme, Deck Mode, provider, privacy', view: 'settings', icon: Settings },
  { label: 'Appearance', hint: 'Open settings on the appearance panel', settingsPanel: 'appearance', icon: Settings },
  { label: 'Run Security Audit Starter', hint: 'Preload, IPC, secrets, renderer boundaries', icon: ShieldCheck, prompt: 'Audit this Electron app for preload safety, IPC validation, secrets exposure, and renderer privilege risk.', runPrompt: true }
];

export function CommandPalette({
  state,
  dispatch,
  actions,
  onOpenSettings,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
  onOpenSettings?: (panel?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>(readRecent);
  const isOpen = state.commandOpen;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      // Sort by recent usage first, then alphabetical
      const recentSet = new Set(recentCommands);
      return [...commands].sort((a, b) => {
        const aRecent = recentSet.has(a.label) ? recentCommands.indexOf(a.label) : Infinity;
        const bRecent = recentSet.has(b.label) ? recentCommands.indexOf(b.label) : Infinity;
        return aRecent - bRecent || a.label.localeCompare(b.label);
      });
    }
    return commands
      .map((cmd) => ({ cmd, score: fuzzyScore(normalized, `${cmd.label} ${cmd.hint}`) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.cmd);
  }, [query, recentCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    });
  }, [isOpen]);

  const runCommand = useCallback(async (command: CommandItem) => {
    setRecentCommands((prev) => {
      const next = [command.label, ...prev.filter((l) => l !== command.label)];
      writeRecent(next);
      return next;
    });
    if (command.settingsPanel) {
      dispatch({ type: 'toggle-command', open: false });
      onOpenSettings?.(command.settingsPanel);
      return;
    }
    dispatch({ type: 'toggle-command', open: false });
    if (command.view) dispatch({ type: 'set-view', view: command.view });
    if (command.prompt && !command.runPrompt) dispatch({ type: 'run-starter', prompt: command.prompt });
    if (command.prompt && command.runPrompt) {
      await actions.runAssistant(command.prompt);
    }
    if (command.action) {
      await actions[command.action]();
    }
  }, [actions, dispatch, onOpenSettings]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      dispatch({ type: 'toggle-command', open: false });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = filteredCommands[selectedIndex];
      if (cmd) void runCommand(cmd);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
  }, [filteredCommands, selectedIndex, runCommand, dispatch]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(`[data-cmd-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const normalizedQuery = query.trim().toLowerCase();
  const showRecents = !normalizedQuery && recentCommands.length > 0;

  return (
    <div id="command-palette-overlay" className={`${isOpen ? 'active' : 'hidden'} fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-20 backdrop-blur-sm`} onMouseDown={() => dispatch({ type: 'toggle-command', open: false })}>
      <div className="no-drag w-full max-w-2xl overflow-hidden rounded-3xl border border-nd-accent/25 bg-nd-bg/95 shadow-2xl shadow-nd-accent/10" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-nd-text-muted/15 px-4 py-3">
          <Search className="h-5 w-5 text-nd-accent" />
          <input
            ref={inputRef}
            id="command-palette-input"
            placeholder="Run command, open panel, execute local AI workflow..."
            className="h-10 flex-1 bg-transparent text-sm text-nd-text outline-none placeholder:text-nd-text-muted/70"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={filteredCommands[selectedIndex] ? `cmd-${selectedIndex}` : undefined}
          />
          <Badge tone="accent">Ctrl K</Badge>
        </div>

        <div ref={listRef} id="command-palette-list" className="max-h-[62vh] overflow-y-auto p-3 scrollbar-thin">
          {showRecents && (
            <>
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Recent</p>
              <div className="space-y-1.5">
                {recentCommands.slice(0, 4).map((label) => {
                  const command = commands.find((c) => c.label === label);
                  if (!command) return null;
                  const Icon = command.icon;
                  return (
                    <button
                      key={`recent-${label}`}
                      type="button"
                      className="command-palette-item flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.07]"
                      onClick={() => void runCommand(command)}
                    >
                      <Icon className="h-5 w-5 text-nd-accent" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-nd-text">{command.label}</span>
                        <span className="block text-xs text-nd-text-muted">{command.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <Divider />
            </>
          )}

          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">{normalizedQuery ? `Results (${filteredCommands.length})` : 'All Commands'}</p>
          <div className="space-y-1.5" role="listbox">
            {filteredCommands.map((command, index) => {
              const Icon = command.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={command.label}
                  type="button"
                  id={`cmd-${index}`}
                  data-cmd-index={index}
                  role="option"
                  aria-selected={isSelected}
                  className={`command-palette-item flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    isSelected
                      ? 'border-nd-accent/30 bg-nd-accent/[0.07]'
                      : 'border-transparent hover:border-nd-accent/30 hover:bg-nd-accent/[0.07]'
                  }`}
                  onClick={() => void runCommand(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon className="h-5 w-5 text-nd-accent" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-nd-text">{highlightMatch(command.label, query)}</span>
                    <span className="block text-xs text-nd-text-muted">{highlightMatch(command.hint, query)}</span>
                  </span>
                </button>
              );
            })}
            {filteredCommands.length === 0 && (
              <p className="px-3 py-4 text-sm text-nd-text-muted">No commands match "{query}"</p>
            )}
          </div>

          <Divider className="my-3" />

          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Starter Actions</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => dispatch({ type: 'run-starter', prompt })} className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-left text-xs text-nd-text/80 transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.06]">
                {prompt}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => void actions.resetLocalState()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-3 text-sm text-nd-danger transition hover:bg-nd-danger/15">
            <Trash2 className="h-4 w-4" /> Reset local UI state
          </button>
        </div>
      </div>
    </div>
  );
}

function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-nd-text-muted/15 ${className}`} />;
}
