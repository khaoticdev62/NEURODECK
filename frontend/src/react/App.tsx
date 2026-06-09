import { useCallback, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { wallpaperManager } from './features/settings/wallpaperManager';
import { CommandPalette } from './components/command/CommandPalette';
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
  const activeTheme = themes.find((theme) => theme.name === state.selectedTheme) ?? themes[0];
  const selectedModel = state.models.find((model) => model.id === state.selectedModelId) ?? state.models[0];
  const modelName = state.selectedProvider === 'offline-draft' ? 'NeuroDraft' : selectedModel?.name ?? 'default';

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
    const onKeyDown = (event: KeyboardEvent) => {
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (metaK) {
        event.preventDefault();
        dispatch({ type: 'toggle-command' });
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void runAssistant();
        return;
      }
      if (event.key === 'Escape') dispatch({ type: 'toggle-command', open: false });
      if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
      const numberToView: Record<string, ViewId> = {
        '1': 'workspace', '2': 'execution', '3': 'agents', '4': 'memory', '5': 'project', '6': 'models', '7': 'cache', '8': 'plugins', '9': 'sessions', '0': 'settings', d: 'diagnostics', D: 'diagnostics'
      };
      const view = numberToView[event.key];
      if (view) dispatch({ type: 'set-view', view });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, runAssistant]);

  const activeFont = useMemo(() => fontOptions.find((f) => f.id === state.selectedFont) ?? fontOptions[0], [state.selectedFont]);

  const shellStyle = {
    backgroundColor: activeTheme.background,
    color: activeTheme.text,
    '--tw-shadow-color': activeTheme.glow,
    '--font-body': activeFont.family,
  } as CSSProperties & Record<string, string>;

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', activeFont.family);
  }, [activeFont]);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden tactical-grid ${state.deckMode ? 'text-[15px]' : ''}`}
      style={shellStyle}
    >
      {/* Fixed background layers — managed by wallpaperManager */}
      <div className="app-background-container" aria-hidden="true">
        <img id="app-background-image" className="app-background-image" alt="" src="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        <canvas id="app-background-canvas" className="app-background-canvas" />
        <div id="app-background-css" className="app-background-css" />
      </div>
      <TitleBar subtitle={`${state.selectedPersona} • ${state.selectedProvider} • ${state.selectedTheme}`} />
      {state.busyLabel && (
        <div className="pointer-events-none fixed left-1/2 top-14 z-50 -translate-x-1/2 rounded-full border border-neuro/25 bg-[#071016]/95 px-4 py-2 shadow-2xl shadow-neuro/10">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-neuro"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {state.busyLabel}</span>
        </div>
      )}
      {state.lastError && (
        <div className="fixed right-4 top-16 z-50 w-[360px] rounded-3xl border border-danger/30 bg-[#170B10]/95 p-4 shadow-2xl shadow-danger/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <Badge tone="danger">Action needed</Badge>
              <h3 className="mt-2 font-semibold text-slate-50">{state.lastError.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{state.lastError.message}</p>
              {state.lastError.action && <p className="mt-2 text-xs text-slate-500">{state.lastError.action}</p>}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'set-error', error: null })} className="rounded-xl border border-white/10 p-2 text-slate-500 transition hover:text-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <PrimarySidebar state={state} dispatch={dispatch} />
        <main className="min-w-0 flex-1 overflow-hidden p-3 md:p-4">
          <div className="h-full min-h-0">
            {state.activeView === 'workspace' && <WorkspaceView state={state} dispatch={dispatch} selectors={selectors} actions={appActions} />}
            {state.activeView === 'execution' && <ExecutionView state={state} actions={appActions} />}
            {state.activeView === 'project' && <ProjectView state={state} actions={appActions} />}
            {state.activeView === 'models' && <ModelsView state={state} dispatch={dispatch} actions={appActions} />}
            {state.activeView === 'agents' && <AgentsView state={state} dispatch={dispatch} actions={appActions} />}
            {state.activeView === 'memory' && <MemoryView state={state} dispatch={dispatch} />}
            {state.activeView === 'sessions' && <SessionsView state={state} actions={appActions} />}
            {state.activeView === 'cache' && <CacheView state={state} />}
            {state.activeView === 'plugins' && <PluginsView state={state} dispatch={dispatch} />}
            {state.activeView === 'diagnostics' && <DiagnosticsView state={state} actions={appActions} />}
            {state.activeView === 'settings' && <SettingsView state={state} dispatch={dispatch} actions={appActions} />}
            {state.activeView === 'canvas' && <CanvasView />}
            {state.activeView === 'terminal' && <TerminalView />}
            {state.activeView === 'ssh' && <SSHView />}
            {state.activeView === 'ide' && <IDEView />}
            {state.activeView === 'git' && <GitView />}
            {state.activeView === 'api-lab' && <ApiLabView />}
            {state.activeView === 'cli-maker' && <CliMakerView />}
            {state.activeView === 'browser' && <BrowserView />}
            {state.activeView === 'tunnel' && <TunnelView />}
            {state.activeView === 'share' && <ShareView />}
            {state.activeView === 'torrent' && <TorrentView />}
            {state.activeView === 'remote' && <RemoteView />}
            {state.activeView === 'docs' && <DocsView />}
            {state.activeView === 'prompt-lab' && <PromptLabView />}
            {state.activeView === 'graph' && <GraphView />}
            {state.activeView === 'scheduler' && <SchedulerView />}
            {state.activeView === 'orchestrator' && <OrchestratorView />}
            {state.activeView === 'fonts' && <FontManagerView state={state} dispatch={dispatch} />}
          </div>
        </main>
        <SecondaryRail state={state} selectors={selectors} />
      </div>
      <CommandPalette state={state} dispatch={dispatch} actions={appActions} />
    </div>
  );
}
