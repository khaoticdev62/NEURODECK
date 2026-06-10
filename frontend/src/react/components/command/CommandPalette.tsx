import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { Activity, ArrowLeftRight, BookOpen, Bot, BrainCircuit, Database, FileDown, FileJson, FolderOpen, Globe, HardDrive, Lock, Paintbrush, Radio, Search, Settings, Share2, ShieldCheck, Sparkles, Terminal, Trash2, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { starterPrompts } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState, ViewId } from '../../types/neurodeck';
import { Badge } from '../primitives/Badge';

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

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(normalized));
  }, [query]);
  const isOpen = state.commandOpen;
  const inputRef = useRef<HTMLInputElement>(null);

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

  const runCommand = async (command: CommandItem) => {
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
  };

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
            onKeyDown={(event) => {
              if (event.key === 'Escape') dispatch({ type: 'toggle-command', open: false });
              if (event.key === 'Enter') void runCommand(filteredCommands[0] ?? commands[0]);
            }}
          />
          <Badge tone="accent">Ctrl K</Badge>
        </div>

        <div id="command-palette-list" className="max-h-[62vh] overflow-y-auto p-3 scrollbar-thin">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text0">Executable Commands</p>
          <div className="space-y-1.5">
            {filteredCommands.map((command) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.label}
                  type="button"
                  className="command-palette-item flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.07]"
                  onClick={() => void runCommand(command)}
                >
                  <Icon className="h-5 w-5 text-nd-accent" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-nd-text">{command.label}</span>
                    <span className="block text-xs text-nd-text0">{command.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="px-2 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text0">Starter Actions</p>
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
