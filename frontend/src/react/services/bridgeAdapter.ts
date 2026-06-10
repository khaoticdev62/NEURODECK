/**
 * Bridge Adapter — translates the v6 neurodeckApi interface into
 * HTTP POST + WebSocket calls to the existing Rust bridge server.
 *
 * This replaces the Electron IPC (`window.neurodeck.*`) layer with
 * bridge-compatible communication, allowing the v6 React UI to run
 * against the existing NEURODECK Rust sidecar.
 */

import type {
  AIChatPayload,
  AIChatResponse,
  AIProviderHealth,
  AgentRunRequest,
  AgentRunResponse,
  DiagnosticsPayload,
  DiagnosticLog,
  ExportSessionPayload,
  ModelDetectionResult,
  ProjectContextSnapshot,
  ProjectScanResult,
  SavedSessionPayload,
  SecurityReport,
  SessionExportResponse,
  SaveSessionResponse,
  DiagnosticsBundleResponse,
} from '../types/neurodeck';

const BRIDGE_PORT = parseInt(import.meta.env.VITE_BRIDGE_PORT || '9477', 10);
const BRIDGE_ORIGIN = `http://127.0.0.1:${BRIDGE_PORT}`;

let _ws: WebSocket | null = null;
let _wsListeners: Map<string, Set<(payload: unknown) => void>> = new Map();

function _ensureWs(): WebSocket {
  if (_ws && _ws.readyState === WebSocket.OPEN) return _ws;
  if (_ws && _ws.readyState === WebSocket.CONNECTING) return _ws;

  _ws = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}`);
  _ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      const eventName = msg.event || msg.type;
      if (eventName) {
        const handlers = _wsListeners.get(eventName);
        if (handlers) handlers.forEach((h) => h(msg.payload ?? msg));
      }
    } catch (_) {
      /* ignore non-JSON ws messages */
    }
  };
  _ws.onclose = () => {
    _ws = null;
    setTimeout(() => _ensureWs(), 2000);
  };
  return _ws;
}

_ensureWs();

export function listenBridge(event: string, handler: (payload: unknown) => void): () => void {
  const runtime = window as unknown as {
    __TAURI__?: {
      event?: {
        listen?: (name: string, callback: (event: { payload: unknown }) => void) => Promise<() => void>;
      };
    };
  };
  const tauriListen = runtime.__TAURI__?.event?.listen;
  if (tauriListen) {
    let unlisten: (() => void) | null = null;
    void tauriListen(event, (ev) => handler(ev.payload)).then((fn) => {
      unlisten = fn;
    }).catch(() => {});
    return () => {
      unlisten?.();
    };
  }

  _ensureWs();
  if (!_wsListeners.has(event)) _wsListeners.set(event, new Set());
  _wsListeners.get(event)!.add(handler);
  return () => {
    _wsListeners.get(event)?.delete(handler);
  };
}

async function bridgeInvoke<T>(cmd: string, args?: unknown): Promise<T> {
  const res = await fetch(`${BRIDGE_ORIGIN}/api/${cmd}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Bridge error');
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

async function appInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const runtime = window as unknown as {
    __TAURI__?: { core?: { invoke?: <R>(command: string, payload?: Record<string, unknown>) => Promise<R> } };
    __TAURI_INTERNALS__?: { invoke?: <R>(command: string, payload?: Record<string, unknown>) => Promise<R> };
  };
  const tauriInvoke = runtime.__TAURI__?.core?.invoke ?? runtime.__TAURI_INTERNALS__?.invoke;
  if (tauriInvoke) return tauriInvoke<T>(cmd, args);
  return bridgeInvoke<T>(cmd, args);
}

/* ── Store (bridge-backed via localStorage fallback) ─────────────────────── */

const store = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await bridgeInvoke<T>('get_store', { key });
    } catch (_) {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
  },
  async set(key: string, value: unknown) {
    try {
      await bridgeInvoke('set_store', { key, value });
    } catch (_) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return { ok: true, updatedAt: new Date().toISOString() };
  },
  async reset(key: string) {
    try {
      await bridgeInvoke('reset_store', { key });
    } catch (_) {
      localStorage.removeItem(key);
    }
    return { ok: true, updatedAt: new Date().toISOString() };
  },
};

/* ── Projects (bridge-backed; fallback to browser) ───────────────────────── */

export type ProjectScanResponse =
  | { canceled: true }
  | { canceled: false; project?: ProjectScanResult; error?: string };

export type ProjectContextResponse =
  | { ok: true; context: ProjectContextSnapshot }
  | { ok: false; error: string };

const unsupportedProjectScan: ProjectScanResponse = {
  canceled: false,
  error: 'Project scanning requires the NEURODECK bridge server.',
};

const projects = {
  async selectAndScan(): Promise<ProjectScanResponse> {
    try {
      const result = await bridgeInvoke<ProjectScanResult>('scan_project');
      return { canceled: false, project: result };
    } catch (e) {
      return { canceled: false, error: String(e) };
    }
  },
  async buildContext(projectPath: string): Promise<ProjectContextResponse> {
    try {
      const context = await bridgeInvoke<ProjectContextSnapshot>('build_project_context', {
        path: projectPath,
      });
      return { ok: true, context };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

/* ── Models ──────────────────────────────────────────────────────────────── */

export type ModelDetectionResponse =
  | { ok: true; detection: ModelDetectionResult }
  | { ok: false; error: string };

const models = {
  async detectLocal(): Promise<ModelDetectionResponse> {
    try {
      const ollama = await bridgeInvoke<string[]>('ollama_list_models', {
        baseUrl: 'http://localhost:11434',
      }).catch(() => []);
      const discovered: ModelDetectionResult['discoveredModels'] = ollama.map((m: any) => ({
        id: m.name,
        name: m.name,
        provider: 'ollama',
        size: m.size ? String(m.size) : 'unknown',
        quantization: 'Q4_K_M',
        context: 8192,
        bestFor: ['chat', 'code'],
        status: 'ready',
        ramEstimate: '4-6 GB',
      }));
      return {
        ok: true,
        detection: {
          scannedAt: new Date().toISOString(),
          runtimes: [
            { name: 'Ollama', path: 'http://localhost:11434', type: 'api', exists: discovered.length > 0, status: discovered.length > 0 ? 'detected' : 'missing' },
          ],
          discoveredModels: discovered,
          summary: discovered.length
            ? `${discovered.length} model(s) discovered via Ollama`
            : 'No local model runtimes detected.',
        },
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

/* ── AI ──────────────────────────────────────────────────────────────────── */

const fallbackHealth: AIProviderHealth[] = [
  { provider: 'offline-draft', label: 'Offline Draft Engine', available: true, endpoint: 'renderer-local', detail: 'Bridge fallback mode', checkedAt: new Date().toISOString() },
  { provider: 'ollama', label: 'Ollama', available: false, endpoint: 'http://127.0.0.1:11434', detail: 'Bridge fallback', checkedAt: new Date().toISOString() },
  { provider: 'lmstudio', label: 'LM Studio', available: false, endpoint: 'http://127.0.0.1:1234', detail: 'Bridge fallback', checkedAt: new Date().toISOString() },
];

function browserDraft(payload: AIChatPayload): AIChatResponse {
  const projectLine = payload.projectContext
    ? `Attached context: ${payload.projectContext.summary}`
    : 'No project context attached yet.';
  return {
    ok: true,
    provider: 'offline-draft',
    model: 'NeuroDraft',
    latencyMs: 12,
    contextSources: payload.projectContext?.files.map((f) => f.path) ?? [],
    message: {
      id: `bridge-draft-${Date.now()}`,
      role: 'assistant',
      content: [
        `Offline draft response for ${payload.persona}.`,
        '',
        projectLine,
        '',
        'Recommended next action:',
        `1. Tighten the ask: ${payload.prompt.slice(0, 160)}`,
        '2. Attach project context if this is a codebase task.',
        '3. Switch provider to Ollama or LM Studio when a local runtime is running.',
      ].join('\n'),
      createdAt: new Date().toISOString(),
      provider: 'offline-draft',
      model: 'NeuroDraft',
      latencyMs: 12,
    },
  };
}

const ai = {
  async health(): Promise<AIProviderHealth[]> {
    try {
      const config = await bridgeInvoke<{ llm?: { provider?: string } }>('get_config');
      const provider = config?.llm?.provider || 'gemini';
      return [
        { provider: 'offline-draft', label: 'Offline Draft Engine', available: true, endpoint: 'renderer-local', detail: 'Always available', checkedAt: new Date().toISOString() },
        { provider: 'ollama', label: 'Ollama', available: provider === 'ollama', endpoint: 'http://127.0.0.1:11434', detail: provider === 'ollama' ? 'Active provider' : 'Not active', checkedAt: new Date().toISOString() },
        { provider: 'lmstudio', label: 'LM Studio', available: false, endpoint: 'http://127.0.0.1:1234', detail: 'Not configured', checkedAt: new Date().toISOString() },
      ];
    } catch (_) {
      return fallbackHealth;
    }
  },
  async chat(payload: AIChatPayload): Promise<AIChatResponse> {
    try {
      const response = await bridgeInvoke<{ text?: string; content?: string }>('send_command', {
        message: payload.prompt,
        provider: payload.provider === 'offline-draft' ? undefined : payload.provider,
        model: payload.model === 'NeuroDraft' ? undefined : payload.model,
        persona: payload.persona,
      });
      return {
        ok: true,
        provider: payload.provider,
        model: payload.model,
        latencyMs: 0,
        contextSources: [],
        message: {
          id: `bridge-${Date.now()}`,
          role: 'assistant',
          content: response.text || response.content || '',
          createdAt: new Date().toISOString(),
          provider: payload.provider,
          model: payload.model,
        },
      };
    } catch (e) {
      return browserDraft(payload);
    }
  },
};

/* ── Agents ──────────────────────────────────────────────────────────────── */

const agents = {
  async run(payload: AgentRunRequest): Promise<AgentRunResponse> {
    try {
      const result = await bridgeInvoke<{ status: string; output?: string; error?: string }>('agent_step', {
        agent_id: payload.agentId,
        prompt: payload.prompt,
      });
      const run = {
        id: `agent-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: (result.error ? 'failed' : 'complete') as import('../types/neurodeck').AIRunStatus,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        prompt: payload.prompt,
        result: result.output || '',
        error: result.error,
        usedProjectContext: Boolean(payload.projectContext),
      };
      if (result.error) {
        return { ok: false, run, error: result.error };
      }
      return { ok: true, run };
    } catch (e) {
      const run = {
        id: `agent-failed-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: 'failed' as const,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        prompt: payload.prompt,
        error: String(e),
        usedProjectContext: Boolean(payload.projectContext),
      };
      return { ok: false, run, error: String(e) };
    }
  },
};

/* ── Sessions ────────────────────────────────────────────────────────────── */

const sessions = {
  async exportMarkdown(payload: ExportSessionPayload): Promise<SessionExportResponse> {
    try {
      const file = await bridgeInvoke<string>('export_session_markdown', { payload });
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async save(payload: SavedSessionPayload): Promise<SaveSessionResponse> {
    try {
      const file = await bridgeInvoke<string>('save_session', { payload });
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

/* ── Diagnostics ─────────────────────────────────────────────────────────── */

const fallbackDiagnostics: DiagnosticsPayload = {
  platform: 'neurodeck-bridge',
  arch: 'unknown',
  electron: 'available',
  chrome: 'available',
  node: 'available',
  packaged: true,
  userData: 'bridge',
  storeFile: 'bridge',
  exportsDir: 'bridge',
  logCount: 0,
};

const diagnostics = {
  async get(): Promise<DiagnosticsPayload> {
    try {
      const health = await bridgeInvoke<{
        status?: string;
        provider?: string;
        model?: string;
        memory_doc_count?: number;
        plugin_count?: number;
      }>('get_system_health');
      return {
        ...fallbackDiagnostics,
        platform: navigator.platform,
        arch: 'unknown',
        appVersion: '1.8.0',
        logCount: health.memory_doc_count ?? 0,
      };
    } catch (_) {
      return fallbackDiagnostics;
    }
  },
  async logs(): Promise<DiagnosticLog[]> {
    try {
      return await bridgeInvoke<DiagnosticLog[]>('get_logs');
    } catch (_) {
      return [];
    }
  },
  async securityReport(): Promise<SecurityReport> {
    try {
      return await bridgeInvoke<SecurityReport>('security_report');
    } catch (_) {
      return {
        checkedAt: new Date().toISOString(),
        ipcPayloadLimitBytes: 0,
        aiProviders: ['offline-draft'],
        rendererPolicy: { mode: 'bridge' },
        guardrails: ['Bridge security report unavailable.'],
      };
    }
  },
  async exportBundle(): Promise<DiagnosticsBundleResponse> {
    try {
      const file = await bridgeInvoke<string>('generate_support_bundle');
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async memoryUsage(): Promise<{ rss_mb: number }> {
    try {
      return await bridgeInvoke<{ rss_mb: number }>('get_memory_usage');
    } catch (_) {
      return { rss_mb: 0 };
    }
  },
  async geminiKeyStatus(): Promise<{ set: boolean }> {
    try {
      const key = await bridgeInvoke<string>('get_gemini_api_key');
      return { set: !!key };
    } catch (_) {
      return { set: false };
    }
  },
  async contextStats(): Promise<{ message_count: number; total_tokens: number }> {
    try {
      return await bridgeInvoke<{ message_count: number; total_tokens: number }>('get_context_stats');
    } catch (_) {
      return { message_count: 0, total_tokens: 0 };
    }
  },
};

/* ── Voice / STT ─────────────────────────────────────────────────────────── */

const voice = {
  async start(): Promise<{ ok: boolean }> {
    try {
      await bridgeInvoke<string>('start_recording');
      return { ok: true };
    } catch (_) {
      return { ok: false };
    }
  },
  async stop(): Promise<{ transcript: string }> {
    try {
      const result = await bridgeInvoke<string>('stop_recording');
      return { transcript: typeof result === 'string' ? result : '' };
    } catch (_) {
      return { transcript: '' };
    }
  },
};

/* ── Terminal / PTY ──────────────────────────────────────────────────────── */

const terminal = {
  async spawn(sessionId: string = 'main_pty_session', shell?: string) {
    return bridgeInvoke<{ success: boolean }>('pty_spawn', { session_id: sessionId, shell });
  },
  async kill(sessionId: string = 'main_pty_session') {
    return bridgeInvoke<{ success: boolean }>('pty_kill', { session_id: sessionId });
  },
  async write(sessionId: string, data: string) {
    return bridgeInvoke<{ success: boolean }>('pty_write', { session_id: sessionId, data });
  },
  async resize(sessionId: string, cols: number, rows: number) {
    return bridgeInvoke<{ success: boolean }>('pty_resize', { session_id: sessionId, cols, rows });
  },
  async listSessions() {
    return bridgeInvoke<string[]>('get_pty_sessions');
  },
};

/* ── Browser ─────────────────────────────────────────────────────────────── */

const browser = {
  async open(url: string) {
    return bridgeInvoke<{ success: boolean }>('browser_open', { url });
  },
  async navigate(url: string) {
    return bridgeInvoke<{ success: boolean }>('browser_navigate', { url });
  },
  async back() {
    return bridgeInvoke<{ success: boolean }>('browser_back');
  },
  async forward() {
    return bridgeInvoke<{ success: boolean }>('browser_forward');
  },
  async getUrl() {
    return bridgeInvoke<{ url: string }>('get_browser_url');
  },
  async hide() {
    return bridgeInvoke<{ success: boolean }>('browser_hide');
  },
  async show() {
    return bridgeInvoke<{ success: boolean }>('browser_show');
  },
  async getContent() {
    return bridgeInvoke<{ content: string }>('browser_get_content');
  },
  async saveToMemory() {
    return bridgeInvoke<{ success: boolean }>('browser_save_to_memory');
  },
};

/* ── IDE / Workspace Files ───────────────────────────────────────────────── */

const ide = {
  async listWorkspaceFiles(path?: string) {
    return bridgeInvoke<{ files: Array<{ name: string; path: string; is_dir: boolean; size: number }>; count: number }>('list_workspace_files', path ? { path } : undefined);
  },
  async readWorkspaceFile(path: string) {
    return bridgeInvoke<{ path: string; content: string; bytes: number }>('read_workspace_file', { path });
  },
  async writeWorkspaceFile(path: string, content: string) {
    return bridgeInvoke<{ status: string; path: string; bytes: number }>('write_workspace_file', { path, content });
  },
  async createWorkspaceFile(path: string) {
    return bridgeInvoke<{ status: string; path: string }>('create_workspace_file', { path });
  },
  async deleteWorkspaceFile(path: string) {
    return bridgeInvoke<{ status: string }>('delete_workspace_file', { path });
  },
};

/* ── Plugins ─────────────────────────────────────────────────────────────── */

export interface PluginInfo {
  name: string;
  file_name: string;
  enabled: boolean;
  id: string | null;
  author: string | null;
  version: string | null;
  description: string | null;
  tags: string[];
  marketplace: boolean;
  permissions: string[];
}

const plugins = {
  async list() {
    return bridgeInvoke<{ plugins: PluginInfo[]; count: number; enabled: number }>('list_plugins');
  },
  async toggle(fileName: string, enabled: boolean) {
    return bridgeInvoke<{ status: string; file_name: string }>('toggle_plugin', { file_name: fileName, enabled });
  },
  async validate(fileName: string) {
    return bridgeInvoke<{ file_name: string; passed: boolean; warnings: string[]; errors: string[] }>('validate_plugin', { file_name: fileName });
  },
  async installFromUrl(url: string) {
    return bridgeInvoke<{ status: string; url: string }>('install_plugin', { url });
  },
  async installFromRegistry(pluginId: string) {
    return bridgeInvoke<{ status: string; plugin_id: string }>('install_plugin_from_registry', { plugin_id: pluginId });
  },
  async uninstall(pluginId: string) {
    return bridgeInvoke<{ status: string; plugin_id: string }>('uninstall_plugin', { plugin_id: pluginId });
  },
  async reload() {
    return bridgeInvoke<{ status: string }>('reload_plugins');
  },
};

/* ── Remote Control ──────────────────────────────────────────────────────── */

const remote = {
  async start(port: number = 9090) {
    return bridgeInvoke<{ success: boolean; url?: string; pin?: string }>('start_remote_server', { port });
  },
  async stop() {
    return bridgeInvoke<{ success: boolean }>('stop_remote_server');
  },
  async getInfo() {
    return bridgeInvoke<{ running: boolean; url?: string; clients?: number; pin?: string; ip?: string; port?: number; ttl_seconds_remaining?: number }>('get_remote_server_info');
  },
};

/* ── Canvas / Code Execution ─────────────────────────────────────────────── */

export type CodeLang = 'python' | 'bash' | 'powershell' | 'javascript' | 'js' | 'html';

const canvas = {
  async execStream(code: string, lang: CodeLang) {
    return bridgeInvoke<{ success: boolean; exec_id?: string }>('exec_code_stream', { code, lang });
  },
  async cancelExec() {
    return bridgeInvoke<{ success: boolean }>('cancel_exec');
  },
};

/* ── Scheduler ───────────────────────────────────────────────────────────── */

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  goal: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

const scheduler = {
  async listTasks(): Promise<ScheduledTask[]> {
    return bridgeInvoke<ScheduledTask[]>('list_scheduled_tasks');
  },
  async addTask(task: Omit<ScheduledTask, 'id'>): Promise<ScheduledTask> {
    return bridgeInvoke<ScheduledTask>('add_scheduled_task', task);
  },
  async deleteTask(id: string) {
    return bridgeInvoke<{ success: boolean }>('delete_scheduled_task', { id });
  },
  async toggleTask(id: string) {
    return bridgeInvoke<{ success: boolean; enabled: boolean }>('toggle_scheduled_task', { id });
  },
  async runTaskNow(id: string) {
    return bridgeInvoke<{ success: boolean }>('run_task_now', { id });
  },
};

/* ── Git ─────────────────────────────────────────────────────────────────── */

export interface GitRepo {
  path: string;
  name: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitFile {
  path: string;
  status: 'staged' | 'unstaged' | 'untracked';
}

const git = {
  async listRepos(): Promise<GitRepo[]> {
    return bridgeInvoke<GitRepo[]>('git_list_repos');
  },
  async openRepo(path: string) {
    return bridgeInvoke<{ success: boolean }>('git_open_repo', { path });
  },
  async status() {
    return bridgeInvoke<{ staged: GitFile[]; unstaged: GitFile[]; untracked: GitFile[] }>('git_status');
  },
  async log(limit: number = 50) {
    return bridgeInvoke<GitCommit[]>('git_log', { limit });
  },
  async branchList() {
    return bridgeInvoke<GitBranch[]>('git_branch_list');
  },
  async branchCreate(name: string) {
    return bridgeInvoke<{ success: boolean }>('git_branch_create', { name });
  },
  async branchCheckout(name: string) {
    return bridgeInvoke<{ success: boolean }>('git_branch_checkout', { name });
  },
  async stage(files: string[]) {
    return bridgeInvoke<{ success: boolean }>('git_stage', { files });
  },
  async unstage(files: string[]) {
    return bridgeInvoke<{ success: boolean }>('git_unstage', { files });
  },
  async commit(message: string) {
    return bridgeInvoke<{ success: boolean; hash?: string }>('git_commit', { message });
  },
  async diff(file?: string) {
    return bridgeInvoke<{ diff: string }>('git_diff', { file });
  },
  async push(remote?: string, branch?: string) {
    return bridgeInvoke<{ success: boolean }>('git_push', { remote, branch });
  },
  async pull(remote?: string, branch?: string) {
    return bridgeInvoke<{ success: boolean }>('git_pull', { remote, branch });
  },
};

/* ── Prompt Lab ──────────────────────────────────────────────────────────── */

const promptLab = {
  async generateJPE(prompt: string, level: 'grade8' | 'college' | 'expert' = 'college') {
    return bridgeInvoke<{ explanation: string }>('generate_jpe_explanation_with_level', { prompt, level });
  },
  async optimizePrompt(prompt: string) {
    return bridgeInvoke<{ optimized: string }>('optimize_raw_prompt', { prompt });
  },
};

/* ── Docs / Knowledge Base ───────────────────────────────────────────────── */

export interface PromptSlot {
  id: string;
  label: string;
  required: boolean;
  kind: 'text' | 'textarea' | 'select' | 'file' | 'multi';
  default?: string;
  options?: string[];
  suggestions?: string[];
}

export interface PromptTemplate {
  id: string;
  pack_id: string;
  title: string;
  description: string;
  category: string;
  agent_hint: string;
  slots: PromptSlot[];
  template: string;
  risk_level: string;
  intent?: string;
  role?: string;
  autocomplete_terms?: string[];
  requires_confirmation?: boolean;
}

export interface PromptPack {
  id: string;
  title: string;
  description: string;
  templates?: PromptTemplate[];
}

export interface PromptPreview {
  valid: boolean;
  missing_slots: string[];
  errors: string[];
  rendered_prompt: string | null;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  template_id?: string;
  pack_id?: string;
  slot_values?: Record<string, string>;
}

export interface MacroStep {
  kind: string;
  timestamp: string;
  payload: Record<string, unknown>;
  requires_confirmation?: boolean;
}

export interface MacroDefinition {
  id: string;
  name: string;
  created_at: string;
  steps: MacroStep[];
  risk_level: string;
}

export interface Suggestion {
  id: string;
  label: string;
  source: string;
  insert_text: string;
  score: number;
}

const promptDrive = {
  async listPacks() {
    return bridgeInvoke<PromptPack[]>('promptdrive_list_packs');
  },
  async listTemplates(packId?: string) {
    return bridgeInvoke<PromptTemplate[]>('promptdrive_list_templates', { pack_id: packId });
  },
  async getTemplate(templateId: string) {
    return bridgeInvoke<PromptTemplate>('promptdrive_get_template', { template_id: templateId });
  },
  async previewPrompt(templateId: string, slotValues: Record<string, string>) {
    return bridgeInvoke<PromptPreview>('promptdrive_preview_prompt', { template_id: templateId, slot_values: slotValues });
  },
  async executePrompt(templateId: string, slotValues: Record<string, string>, prompt: string) {
    return bridgeInvoke<{ status: string; validation?: PromptPreview }>('promptdrive_execute_prompt', {
      template_id: templateId,
      slot_values: slotValues,
      prompt,
    });
  },
  async savePrompt(payload: {
    title: string;
    template_id?: string;
    pack_id?: string;
    slot_values: Record<string, string>;
    prompt: string;
  }) {
    return bridgeInvoke<SavedPrompt>('promptdrive_save_prompt', payload);
  },
  async listSavedPrompts() {
    return bridgeInvoke<SavedPrompt[]>('promptdrive_list_saved_prompts');
  },
  async macroStart() {
    return bridgeInvoke<{ recording_id: string; status: string }>('promptdrive_macro_start');
  },
  async macroStop(recordingId: string, name: string, steps: MacroStep[]) {
    return bridgeInvoke<MacroDefinition>('promptdrive_macro_stop', {
      recording_id: recordingId,
      name,
      steps,
    });
  },
  async macroExecute(macroId: string) {
    return bridgeInvoke<{ status: string; safe_replay: boolean; macro: MacroDefinition }>('promptdrive_macro_execute', { macro_id: macroId });
  },
  async listMacros() {
    return bridgeInvoke<MacroDefinition[]>('promptdrive_list_macros');
  },
  async deleteMacro(macroId: string) {
    return bridgeInvoke<{ status: string; macro_id: string }>('promptdrive_delete_macro', { macro_id: macroId });
  },
  async getSuggestions(query: string, templateId?: string, slotId?: string) {
    return bridgeInvoke<Suggestion[]>('promptdrive_get_suggestions', {
      query,
      template_id: templateId,
      slot_id: slotId,
    });
  },
};

const docs = {
  async indexDirectory(path: string) {
    return bridgeInvoke<{ success: boolean; count?: number }>('index_directory', { path });
  },
  async getIndexedDocs() {
    return bridgeInvoke<{ docs: Array<{ id: string; title: string; path: string }> }>('get_indexed_docs');
  },
  async searchDocs(query: string) {
    return bridgeInvoke<{ results: Array<{ id: string; title: string; snippet: string; score: number }> }>('search_docs_semantic', { query });
  },
  async clearIndex() {
    return bridgeInvoke<{ success: boolean }>('clear_doc_index');
  },
};

/* ── Share / Transfer ────────────────────────────────────────────────────── */

const share = {
  async getPeers() {
    return bridgeInvoke<Array<{ id: string; name: string; address: string }>>('get_discovered_peers');
  },
  async getActiveTransfers() {
    return bridgeInvoke<Array<{ id: string; filename: string; progress: number; status: string }>>('get_active_transfers');
  },
  async startTransfer(filePath: string, peerId?: string) {
    return bridgeInvoke<{ success: boolean; transfer_id?: string }>('start_file_transfer', { file_path: filePath, peer_id: peerId });
  },
};

/* ── Tunnel ──────────────────────────────────────────────────────────────── */

const tunnel = {
  async start() {
    return bridgeInvoke<{ success: boolean }>('start_tunnel_server');
  },
  async stop() {
    return bridgeInvoke<{ success: boolean }>('stop_tunnel_server');
  },
  async sendRequest(command: string) {
    return bridgeInvoke<{ output: string }>('send_tunnel_request', { command });
  },
};

/* ── API Lab ─────────────────────────────────────────────────────────────── */

export interface ApiRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

const apiLab = {
  async sendRequest(req: ApiRequest): Promise<ApiResponse> {
    return bridgeInvoke<ApiResponse>('api_request', req);
  },
  async listCollections() {
    return bridgeInvoke<string[]>('api_list_collections');
  },
  async saveCollection(name: string, requests: ApiRequest[]) {
    return bridgeInvoke<{ success: boolean }>('api_save_collection', { name, requests });
  },
  async importCurl(curl: string) {
    return bridgeInvoke<ApiRequest>('api_curl_import', { curl });
  },
};

/* ── Workflow / Orchestrator ─────────────────────────────────────────────── */

const workflow = {
  async list() {
    return bridgeInvoke<Array<{ id: string; name: string }>>('list_workflows');
  },
  async load(id: string) {
    return bridgeInvoke<{ workflow: unknown }>('load_workflow', { id });
  },
  async save(id: string, name: string, workflow: unknown) {
    return bridgeInvoke<{ success: boolean }>('save_workflow', { id, name, workflow });
  },
  async delete(id: string) {
    return bridgeInvoke<{ success: boolean }>('delete_workflow', { id });
  },
  async run(id: string, inputs?: Record<string, unknown>) {
    return bridgeInvoke<{ run_id: string; status: string }>('workflow_run', { id, inputs });
  },
};

const orchestrator = {
  async startTask(goal: string) {
    return bridgeInvoke<{ task_id: string }>('start_orchestrated_task', { goal });
  },
  async getStatus(taskId: string) {
    return bridgeInvoke<{ status: string; steps: unknown[] }>('get_orchestration_status', { task_id: taskId });
  },
  async stop(taskId: string) {
    return bridgeInvoke<{ success: boolean }>('stop_orchestration', { task_id: taskId });
  },
};

/* ── SSH Credentials ─────────────────────────────────────────────────────── */

const ssh = {
  async saveCredential(host: string, user: string, password?: string, keyPath?: string) {
    return bridgeInvoke<{ success: boolean }>('save_ssh_credential', { host, user, password, key_path: keyPath });
  },
  async getCredential(host: string) {
    return bridgeInvoke<{ user?: string; has_key?: boolean }>('get_ssh_credential', { host });
  },
};

/* ── Torrent ─────────────────────────────────────────────────────────────── */

export interface TorrentItem {
  id: string;
  name: string;
  source_kind: string;
  source_display: string;
  source_value: string;
  status: string;
  progress_pct: number;
  pieces_done: number;
  pieces_total: number;
  peers: number;
  trackers: number;
  paused: boolean;
  completed: boolean;
  metadata_known: boolean;
  download_root: string;
  save_path: string | null;
  added_at_utc: string;
  info_hash: string;
  download_rate_bps: number;
  upload_rate_bps: number;
  downloaded_bytes?: number;
  uploaded_bytes?: number;
  bytes_remaining?: number;
  eta_seconds?: number | null;
  ratio?: number | null;
}

export interface TorrentClientStatus {
  download_root: string;
  torrent_count: number;
  torrents: TorrentItem[];
}

const torrent = {
  async list(): Promise<TorrentItem[]> {
    return bridgeInvoke<TorrentItem[]>('torrent_list');
  },
  async add(magnetOrPath: string) {
    return bridgeInvoke<{ success: boolean; id?: string }>('torrent_add', { source: magnetOrPath });
  },
  async pause(id: string) {
    return bridgeInvoke<{ success: boolean }>('torrent_pause', { id });
  },
  async resume(id: string) {
    return bridgeInvoke<{ success: boolean }>('torrent_resume', { id });
  },
  async remove(id: string) {
    return bridgeInvoke<{ success: boolean }>('torrent_remove', { id });
  },
  async getStatus(): Promise<TorrentClientStatus> {
    return bridgeInvoke<TorrentClientStatus>('torrent_get_status');
  },
  async openDownloadRoot() {
    return bridgeInvoke<{ status: string }>('torrent_open_download_root');
  },
  async openSavePath(id: string) {
    return bridgeInvoke<{ status: string }>('torrent_open_save_path', { id });
  },
};

/* ── Exported API surface (matches v6 neurodeckApi exactly) ──────────────── */

export { bridgeInvoke };

export const neurodeckApi = {
  store,
  projects,
  models,
  ai,
  voice,
  agents,
  sessions,
  diagnostics,
  terminal,
  browser,
  ide,
  plugins,
  remote,
  canvas,
  scheduler,
  git,
  promptLab,
  promptDrive,
  docs,
  share,
  tunnel,
  apiLab,
  workflow,
  orchestrator,
  ssh,
  torrent,
};
