import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Command, Loader2, Sparkles, X } from 'lucide-react';
import { wallpaperManager } from './features/settings/wallpaperManager';
import { CommandPalette } from './components/command/CommandPalette';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { PrimarySidebar } from './components/layout/PrimarySidebar';
import { SecondaryRail } from './components/layout/SecondaryRail';
import { TitleBar } from './components/layout/TitleBar';
import { Badge } from './components/primitives/Badge';
import { fontOptions, themes } from './types/seed';
import { AgentsView } from './features/agents/AgentsView';
import { ApiLabView } from './features/api-lab/ApiLabView';
import { BrowserView } from './features/browser/BrowserView';
import { CacheView } from './features/cache/CacheView';
import { CanvasView } from './features/canvas/CanvasView';
import { CliMakerView } from './features/cli-maker/CliMakerView';
import { DiagnosticsView } from './features/diagnostics/DiagnosticsView';
import { DocsView } from './features/docs/DocsView';
import { ExecutionView } from './features/execution/ExecutionView';
import { GitView } from './features/git/GitView';
import { GraphView } from './features/graph/GraphView';
import { IDEView } from './features/ide/IDEView';
import { MemoryView } from './features/memory/MemoryView';
import { ModelsView } from './features/models/ModelsView';
import { OrchestratorView } from './features/orchestrator/OrchestratorView';
import { PluginsView } from './features/plugins/PluginsView';
import { ProjectView } from './features/project/ProjectView';
import { PromptLabView } from './features/prompt-lab/PromptLabView';
import { RemoteView } from './features/remote/RemoteView';
import { SchedulerView } from './features/scheduler/SchedulerView';
import { SessionsView } from './features/sessions/SessionsView';
import { SettingsView } from './features/settings/SettingsView';
import { ShareView } from './features/share/ShareView';
import { TorrentView } from './features/torrent/TorrentView';
import { SSHView } from './features/ssh/SSHView';
import { TerminalView } from './features/terminal/TerminalView';
import { TunnelView } from './features/tunnel/TunnelView';
import { FontManagerView } from './features/fonts/FontManagerView';
import { WorkspaceView } from './features/workspace/WorkspaceView';
import { neurodeckApi } from './services/bridgeAdapter';
import { useNeuroDeckState } from './state/useNeuroDeckState';
import type { AIMessage, ExportSessionPayload, NeuroDeckAppActions, SavedSessionPayload, ViewId } from './types/neurodeck';

function makeUserMessage(content: string): AIMessage {
  return { id: `user-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
}

export default function App() {
  const { state, dispatch, resetLocalState, selectors } = useNeuroDeckState();
  const shellRef = useRef<HTMLDivElement>(null);
  const shortcutSinkRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState('general');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [ctrlPromptOpen, setCtrlPromptOpen] = useState(false);
  const [recentViews, setRecentViews] = useState<ViewId[]>([]);

  useEffect(() => {
    const loader = document.getElementById('boot-loader');
    if (loader) {
      const t = setTimeout(() => { loader.classList.add('done'); }, 100);
      const t2 = setTimeout(() => { loader.remove(); }, 700);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, []);
  const activeTheme = themes.find((theme) => theme.name === state.selectedTheme) ?? themes[0];
  const selectedModel = state.models.find((model) => model.id === state.selectedModelId) ?? state.models[0];
  const modelName = state.selectedProvider === 'offline-draft' ? 'NeuroDraft' : selectedModel?.name ?? 'default';

  useEffect(() => {
    setRecentViews((current) => {
      const next = current.filter((view) => view !== state.activeView);
      return [state.activeView, ...next].slice(0, 8);
    });
  }, [state.activeView]);

  const scanProject = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Scanning selected project folder…' });
    const response = await neurodeckApi.projects.selectAndScan();
    if ('canceled' in response && response.canceled) {
      dispatch({ type: 'set-busy', label: null });
      return;
    }
    if (response.error || !response.project) {
      dispatch({ type: 'set-error', error: { title: 'Project scan failed', message: response.error ?? 'No project data returned.', action: 'Try another folder or open Diagnostics.' } });
      return;
    }
    dispatch({ type: 'set-project-scan', project: response.project });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch]);

  const buildProjectContext = useCallback(async () => {
    if (!state.activeProject?.path) {
      dispatch({ type: 'set-error', error: { title: 'No project attached', message: 'Scan a project folder before building AI context.', action: 'Use Scan Project from Workspace or Command Palette.' } });
      return;
    }
    dispatch({ type: 'set-busy', label: 'Building redacted project context…' });
    const response = await neurodeckApi.projects.buildContext(state.activeProject.path);
    if (!response.ok) {
      dispatch({ type: 'set-error', error: { title: 'Context build failed', message: response.error, action: 'Open Diagnostics and verify the project folder is readable.' } });
      return;
    }
    dispatch({ type: 'set-project-context', context: response.context });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch, state.activeProject?.path]);

  const detectModels = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Detecting local model runtimes…' });
    const response = await neurodeckApi.models.detectLocal();
    if (!response.ok) {
      dispatch({ type: 'set-error', error: { title: 'Model detection failed', message: response.error, action: 'Check known model folders or open Diagnostics.' } });
      return;
    }
    dispatch({ type: 'set-model-detection', detection: response.detection });
    if (response.detection.discoveredModels.length) {
      dispatch({ type: 'merge-detected-models', models: response.detection.discoveredModels });
      dispatch({ type: 'set-selected-model', id: response.detection.discoveredModels[0].id });
    }
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch]);

  const checkAiHealth = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Checking local AI runtimes…' });
    const health = await neurodeckApi.ai.health();
    dispatch({ type: 'set-ai-health', health });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch]);

  const runAssistant = useCallback(async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? state.composerValue).trim();
    if (!prompt) {
      dispatch({ type: 'set-error', error: { title: 'Prompt is empty', message: 'Type a task or choose a prompt template before running the assistant.', action: 'Try the Command Palette templates.' } });
      return;
    }
    const userMessage = makeUserMessage(prompt);
    dispatch({ type: 'append-message', message: userMessage });
    dispatch({ type: 'set-busy', label: `${state.selectedProvider} is generating…` });
    const response = await neurodeckApi.ai.chat({
      provider: state.selectedProvider,
      model: modelName,
      persona: state.selectedPersona,
      prompt,
      messages: [...state.messages, userMessage],
      projectContext: state.projectContext,
      activeProjectName: state.activeProject?.name
    });
    if (!response.ok) {
      dispatch({ type: 'set-error', error: { title: 'AI execution failed', message: response.error, action: 'Check AI Health or switch to Offline Draft provider.' } });
      return;
    }
    dispatch({ type: 'append-message', message: response.message });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch, modelName, state.activeProject?.name, state.composerValue, state.messages, state.projectContext, state.selectedPersona, state.selectedProvider]);

  const runAgent = useCallback(async (agentId: string, overridePrompt?: string) => {
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) return;
    const prompt = (overridePrompt || state.composerValue || agent.task || `Run ${agent.name} review.`).trim();
    dispatch({ type: 'set-agent-status', id: agent.id, status: 'thinking', lastAction: 'Agent execution started', task: prompt.slice(0, 100) });
    dispatch({ type: 'set-busy', label: `${agent.name} agent running…` });
    const response = await neurodeckApi.agents.run({
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      provider: state.selectedProvider,
      model: modelName,
      persona: state.selectedPersona,
      prompt,
      projectContext: state.projectContext
    });
    dispatch({ type: 'add-ai-run', run: response.run });
    if (!response.ok) {
      dispatch({ type: 'set-agent-status', id: agent.id, status: 'blocked', lastAction: response.error, task: 'Execution blocked' });
      dispatch({ type: 'set-error', error: { title: `${agent.name} agent failed`, message: response.error, action: 'Switch provider, check local runtime, or use Offline Draft.' } });
      return;
    }
    dispatch({ type: 'set-agent-status', id: agent.id, status: 'complete', lastAction: 'Agent execution complete', task: 'Ready' });
    dispatch({ type: 'append-message', message: { id: `agent-${response.run.id}`, role: 'assistant', content: response.run.result ?? 'Agent run complete.', createdAt: new Date().toISOString(), provider: response.run.provider, model: response.run.model } });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch, modelName, state.agents, state.composerValue, state.projectContext, state.selectedPersona, state.selectedProvider]);

  const refreshDiagnostics = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Refreshing diagnostics…' });
    const [diagnostics, logs] = await Promise.all([
      neurodeckApi.diagnostics.get(),
      neurodeckApi.diagnostics.logs()
    ]);
    dispatch({ type: 'set-diagnostics', diagnostics, logs });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch]);

  const exportSession = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Exporting session markdown…' });
    const payload: ExportSessionPayload = {
      title: 'NEURODECK Workspace Export',
      persona: state.selectedPersona,
      theme: state.selectedTheme,
      lines: [
        `Active view: ${state.activeView}`,
        `Provider: ${state.selectedProvider}`,
        `Model: ${modelName}`,
        `Messages: ${selectors.messageCount}`,
        `Agent runs: ${state.aiRuns.length}`,
        `Composer draft: ${state.composerValue || 'empty'}`,
        `Pinned memories: ${selectors.pinnedMemories}`,
        `Ready/indexed models: ${selectors.readyModels}`,
        `Enabled plugins: ${selectors.enabledPlugins}`
      ],
      projectName: state.activeProject?.name,
      modelSummary: state.modelDetection?.summary
    };
    const response = await neurodeckApi.sessions.exportMarkdown(payload);
    if (!response.ok) {
      dispatch({ type: 'set-error', error: { title: 'Session export failed', message: response.error, action: 'Open Diagnostics and verify the exports directory.' } });
      return;
    }
    dispatch({ type: 'set-export-path', path: response.file });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch, modelName, selectors.enabledPlugins, selectors.messageCount, selectors.pinnedMemories, selectors.readyModels, state.activeProject?.name, state.activeView, state.aiRuns.length, state.composerValue, state.modelDetection?.summary, state.selectedPersona, state.selectedProvider, state.selectedTheme]);

  const saveSession = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Saving session JSON…' });
    const payload: SavedSessionPayload = {
      title: state.activeProject ? `${state.activeProject.name} Session` : 'NEURODECK Session',
      state: {
        selectedPersona: state.selectedPersona,
        selectedProvider: state.selectedProvider,
        selectedModelId: state.selectedModelId,
        messages: state.messages,
        aiRuns: state.aiRuns,
        activeProject: state.activeProject,
        projectContext: state.projectContext
      }
    };
    const response = await neurodeckApi.sessions.save(payload);
    if (!response.ok) {
      dispatch({ type: 'set-error', error: { title: 'Session save failed', message: response.error, action: 'Open Diagnostics and verify userData permissions.' } });
      return;
    }
    dispatch({ type: 'set-export-path', path: response.file });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch, state.activeProject, state.aiRuns, state.messages, state.projectContext, state.selectedModelId, state.selectedPersona, state.selectedProvider]);

  const exportDiagnosticsBundle = useCallback(async () => {
    dispatch({ type: 'set-busy', label: 'Exporting sanitized diagnostics bundle…' });
    const response = await neurodeckApi.diagnostics.exportBundle();
    if (!response.ok) {
      dispatch({ type: 'set-error', error: { title: 'Diagnostics export failed', message: response.error, action: 'Refresh Diagnostics, then retry. Verify userData write permissions.' } });
      return;
    }
    dispatch({ type: 'set-export-path', path: response.file });
    dispatch({ type: 'set-busy', label: null });
  }, [dispatch]);

  const appActions: NeuroDeckAppActions = {
    scanProject,
    buildProjectContext,
    detectModels,
    checkAiHealth,
    runAssistant,
    runAgent,
    refreshDiagnostics,
    exportSession,
    saveSession,
    exportDiagnosticsBundle,
    resetLocalState
  };

  const openSettings = useCallback((panel = 'general') => {
    localStorage.setItem('settingsActivePanel', `sp-${panel}`);
    setSettingsPanel(panel);
    setSettingsOpen(true);
  }, []);

  // Initialize wallpaper manager and restore saved background on mount
  useEffect(() => {
    wallpaperManager.init();
    const saved = localStorage.getItem('bgUrl');
    if (saved) wallpaperManager.start(saved);
    return () => wallpaperManager.destroy();
  }, []);

  useEffect(() => {
    void checkAiHealth();
  }, [checkAiHealth]);

  useEffect(() => {
    if (!state.hydrated) return;
    requestAnimationFrame(() => shortcutSinkRef.current?.focus({ preventScroll: true }));
  }, [state.hydrated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      const editingField = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (document.activeElement as HTMLElement | null)?.isContentEditable;
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (metaK) {
        event.preventDefault();
        dispatch({ type: 'toggle-command' });
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setCtrlPromptOpen(true);
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === '?' && !editingField) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Tab') {
        event.preventDefault();
        if (recentViews.length > 1) setQuickSwitcherOpen(true);
        return;
      }
      if (quickSwitcherOpen && event.key === 'Enter') {
        event.preventDefault();
        const target = recentViews[1];
        if (target) dispatch({ type: 'set-view', view: target });
        setQuickSwitcherOpen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void runAssistant();
        return;
      }
      if (event.key === 'Escape') {
        if (state.commandOpen) {
          dispatch({ type: 'toggle-command', open: false });
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (notificationsOpen) {
          setNotificationsOpen(false);
          return;
        }
        if (quickSwitcherOpen) {
          setQuickSwitcherOpen(false);
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (ctrlPromptOpen) {
          setCtrlPromptOpen(false);
        }
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
      const numberToView: Record<string, ViewId> = {
        '1': 'chat', '2': 'execution', '3': 'agents', '4': 'memory', '5': 'project', '6': 'models', '7': 'cache', '8': 'plugins', '9': 'sessions', '0': 'settings', d: 'diagnostics', D: 'diagnostics'
      };
      const view = numberToView[event.key];
      if (view) dispatch({ type: 'set-view', view });
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [dispatch, runAssistant, recentViews, settingsOpen, notificationsOpen, shortcutsOpen, quickSwitcherOpen, ctrlPromptOpen, state.commandOpen]);

  const activeFont = useMemo(() => fontOptions.find((f) => f.id === state.selectedFont) ?? fontOptions[0], [state.selectedFont]);

  // Inject runtime design tokens as CSS custom properties on the app shell
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    // Helper: hex → "r, g, b"
    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const bigint = parseInt(clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `${r}, ${g}, ${b}`;
    };

    shell.style.setProperty('--nd-bg', activeTheme.background);
    shell.style.setProperty('--nd-surface', activeTheme.surface);
    shell.style.setProperty('--nd-surface-raised', activeTheme.surfaceRaised);
    shell.style.setProperty('--nd-accent', activeTheme.accent);
    shell.style.setProperty('--nd-accent-rgb', hexToRgb(activeTheme.accent));
    shell.style.setProperty('--nd-success', activeTheme.success);
    shell.style.setProperty('--nd-warning', activeTheme.warning);
    shell.style.setProperty('--nd-danger', activeTheme.danger);
    shell.style.setProperty('--nd-text', activeTheme.text);
    shell.style.setProperty('--nd-text-muted', activeTheme.muted);
    shell.style.setProperty('--nd-glow', activeTheme.glow);
    shell.style.setProperty('--font-body', activeFont.family);
    shell.style.setProperty('--tw-shadow-color', activeTheme.glow);

    document.documentElement.style.setProperty('--font-body', activeFont.family);
  }, [activeTheme, activeFont]);

  const renderView = (id: ViewId, node: ReactNode) => (
    <div data-testid={`view-${id}`} className="view-content active h-full min-h-0 animate-view-enter">
      {node}
    </div>
  );

  if (!state.hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-nd-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-nd-accent/30 border-t-nd-accent" />
          <p className="text-sm text-nd-text-muted">Loading NEURODECK...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="app-shell"
      ref={shellRef}
      tabIndex={0}
      className={`flex h-full flex-col overflow-hidden tactical-grid outline-none ${state.deckMode ? 'text-[15px]' : ''}`}
      style={{ color: 'var(--nd-text)' }}
    >
      <input
        ref={shortcutSinkRef}
        tabIndex={0}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-2 w-2 opacity-0"
        onKeyDown={(event) => {
          const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
          if (metaK) {
            event.preventDefault();
            dispatch({ type: 'toggle-command' });
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            setCtrlPromptOpen(true);
            return;
          }
          if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === '?') {
            event.preventDefault();
            setShortcutsOpen(true);
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.key === 'Tab') {
            event.preventDefault();
            if (recentViews.length > 1) setQuickSwitcherOpen(true);
          }
        }}
        onKeyUp={(event) => {
          const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
          if (metaK) {
            event.preventDefault();
            dispatch({ type: 'toggle-command' });
          }
        }}
      />
      {/* Fixed background layers — managed by wallpaperManager */}
      <div className="app-background-container" aria-hidden="true">
        <img id="app-background-image" className="app-background-image" alt="" src="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        <canvas id="app-background-canvas" className="app-background-canvas" />
        <div id="app-background-css" className="app-background-css" />
      </div>
      <TitleBar
        subtitle={`${state.selectedPersona} • ${state.selectedProvider} • ${state.selectedTheme}`}
        onOpenCommandPalette={() => dispatch({ type: 'toggle-command', open: true })}
        onOpenNotifications={() => setNotificationsOpen((current) => !current)}
        onOpenSettings={() => openSettings('general')}
      />
      {state.busyLabel && (
        <div className="pointer-events-none fixed left-1/2 top-14 z-toast -translate-x-1/2 rounded-full border border-nd-accent/25 bg-nd-bg/95 px-4 py-2 shadow-2xl shadow-nd-accent/10">
          <span className="inline-flex items-center gap-2 text-2xs font-semibold text-nd-accent"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {state.busyLabel}</span>
        </div>
      )}
      {state.lastError && (
        <div className="fixed right-4 top-16 z-toast w-[360px] rounded-3xl border border-nd-danger/30 bg-nd-bg/95 p-4 shadow-2xl shadow-nd-danger/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-nd-danger" />
            <div className="min-w-0 flex-1">
              <Badge tone="danger">Action needed</Badge>
              <h3 className="mt-2 font-semibold text-nd-text">{state.lastError.title}</h3>
              <p className="mt-1 text-sm leading-6 text-nd-text-muted">{state.lastError.message}</p>
              {state.lastError.action && <p className="mt-2 text-2xs text-nd-text-muted">{state.lastError.action}</p>}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'set-error', error: null })} className="rounded-xl border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:text-nd-text">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <PrimarySidebar state={state} dispatch={dispatch} />
        <main className="min-w-0 flex-1 overflow-hidden p-3 md:p-4">
          <div className="view-container h-full min-h-0">
            {(state.activeView === 'chat' || state.activeView === 'workspace') && renderView('chat', <WorkspaceView state={state} dispatch={dispatch} selectors={selectors} actions={appActions} />)}
            {state.activeView === 'execution' && renderView('execution', <ExecutionView state={state} actions={appActions} />)}
            {state.activeView === 'project' && renderView('project', <ProjectView state={state} actions={appActions} />)}
            {state.activeView === 'models' && renderView('models', <ModelsView state={state} dispatch={dispatch} actions={appActions} />)}
            {(state.activeView === 'agent' || state.activeView === 'agents') && renderView('agent', <AgentsView state={state} dispatch={dispatch} actions={appActions} />)}
            {state.activeView === 'memory' && renderView('memory', <MemoryView state={state} dispatch={dispatch} />)}
            {state.activeView === 'sessions' && renderView('sessions', <SessionsView state={state} actions={appActions} />)}
            {state.activeView === 'cache' && renderView('cache', <CacheView state={state} />)}
            {state.activeView === 'plugins' && renderView('plugins', <PluginsView state={state} dispatch={dispatch} />)}
            {state.activeView === 'diagnostics' && renderView('diagnostics', <DiagnosticsView state={state} actions={appActions} />)}
            {state.activeView === 'settings' && renderView('settings', <SettingsView state={state} dispatch={dispatch} actions={appActions} />)}
            {state.activeView === 'canvas' && renderView('canvas', <CanvasView />)}
            {state.activeView === 'terminal' && renderView('terminal', <TerminalView />)}
            {state.activeView === 'ssh' && renderView('ssh', <SSHView />)}
            {state.activeView === 'ide' && renderView('ide', <IDEView />)}
            {state.activeView === 'git' && renderView('git', <GitView />)}
            {state.activeView === 'api-lab' && renderView('api-lab', <ApiLabView />)}
            {state.activeView === 'cli-maker' && renderView('cli-maker', <CliMakerView />)}
            {state.activeView === 'browser' && renderView('browser', <BrowserView />)}
            {state.activeView === 'tunnel' && renderView('tunnel', <TunnelView />)}
            {state.activeView === 'share' && renderView('share', <ShareView />)}
            {state.activeView === 'torrent' && renderView('torrent', <TorrentView />)}
            {state.activeView === 'remote' && renderView('remote', <RemoteView />)}
            {state.activeView === 'docs' && renderView('docs', <DocsView />)}
            {state.activeView === 'prompt-lab' && renderView('prompt-lab', <PromptLabView />)}
            {state.activeView === 'graph' && renderView('graph', <GraphView />)}
            {state.activeView === 'scheduler' && renderView('scheduler', <SchedulerView />)}
            {state.activeView === 'orchestrator' && renderView('orchestrator', <OrchestratorView />)}
            {state.activeView === 'fonts' && renderView('fonts', <FontManagerView state={state} dispatch={dispatch} />)}
          </div>
        </main>
        <SecondaryRail state={state} selectors={selectors} />
      </div>
      <CommandPalette state={state} dispatch={dispatch} actions={appActions} onOpenSettings={openSettings} />
      <div id="settings-overlay" className={`${settingsOpen ? 'active' : 'hidden'} fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm`}>
          <div className="settings-modal-card absolute inset-3 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-0 shadow-2xl shadow-nd-accent/10" data-settings-theme={settingsPanel}>
            <div className="h-full min-h-0">
              <SettingsView key={settingsPanel} state={state} dispatch={dispatch} actions={appActions} onPanelChange={setSettingsPanel} />
            </div>
          </div>
      </div>
      <div id="notif-modal" className={`${notificationsOpen ? 'active' : 'hidden'} fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm`} onMouseDown={() => setNotificationsOpen(false)}>
          <div className="notif-modal-card absolute right-4 top-14 w-[360px] rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-nd-text">Notifications</h2>
              <button type="button" id="close-notif-btn" onClick={() => setNotificationsOpen(false)} className="rounded-lg border border-nd-text-muted/15 px-2 py-1 text-2xs text-nd-text-muted">Close</button>
            </div>
            <p className="mt-3 text-sm text-nd-text-muted">No notifications.</p>
          </div>
      </div>
      <div id="shortcuts-overlay" className={`${shortcutsOpen ? 'active' : 'hidden'} fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm`} onMouseDown={() => setShortcutsOpen(false)}>
          <div className="absolute left-1/2 top-16 z-modal w-[760px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10" onMouseDown={(event) => event.stopPropagation()}>
            <h2 className="text-sm font-semibold text-nd-text">Keyboard shortcuts</h2>
            <p className="mt-2 text-sm text-nd-text-muted">Ctrl/Cmd+K opens command palette, Ctrl+Shift+P opens the controller prompt, Ctrl+Tab opens quick switcher, and Escape closes overlays.</p>
          </div>
      </div>
      <div id="ctrl-prompt-overlay" className={`${ctrlPromptOpen ? 'active' : 'hidden'} fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm`} onMouseDown={() => setCtrlPromptOpen(false)}>
          <div className="absolute left-1/2 top-20 z-modal w-[720px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ctrl-prompt-title flex items-center gap-2 text-sm font-semibold text-nd-text">
              <Sparkles className="nd-icon-svg h-4 w-4 text-nd-accent" />
              <span className="ctrl-prompt-cat-icon inline-flex h-6 w-6 items-center justify-center rounded-lg border border-nd-text-muted/15 bg-nd-surface/50">
                <Command className="nd-icon-svg h-3.5 w-3.5 text-nd-text/90" />
              </span>
              Controller Prompt
            </div>
            <p className="mt-2 text-sm text-nd-text-muted">Press B to close, R4 to accept suggestions, R5 hold to execute, and L5 to save or record PromptDrive macros.</p>
          </div>
      </div>
      <div id="quick-switcher-overlay" className={`${quickSwitcherOpen ? 'active' : 'hidden'} fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm`} onMouseDown={() => setQuickSwitcherOpen(false)}>
          <div className="absolute left-1/2 top-20 z-modal w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10" onMouseDown={(event) => event.stopPropagation()}>
            <h2 className="text-sm font-semibold text-nd-text">Quick Switcher</h2>
            <div id="quick-switcher-list" className="mt-3 space-y-2">
              {recentViews.slice(1).map((view, index) => (
                <button
                  key={view}
                  type="button"
                  className={`quick-switcher-item flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left ${index === 0 ? 'active border-nd-accent/35 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 bg-nd-surface/40 text-nd-text/80'}`}
                  onClick={() => {
                    dispatch({ type: 'set-view', view });
                    setQuickSwitcherOpen(false);
                  }}
                >
                  <span>{view}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-nd-text-muted">{index === 0 ? 'active' : 'recent'}</span>
                </button>
              ))}
              {!recentViews.slice(1).length && <p className="text-sm text-nd-text-muted">Visit two or more views to use quick switcher.</p>}
            </div>
          </div>
      </div>
      <OnboardingModal />
    </div>
  );
}
