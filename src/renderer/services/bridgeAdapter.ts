/**
 * Bridge Adapter — public barrel for the v6 neurodeckApi interface.
 *
 * Domain implementations live in ./bridge/domains/*; this file only
 * re-exports primitives, constants, the assembled API object, and types.
 */

import { BridgeError, isBridgeError } from "./bridge/errors";
import { bridgeInvoke } from "./bridge/http";
import { listenBridge } from "./bridge/transport";
import { computeBackoff, isSafeReadCommand } from "./bridge/utils";
import { runtimeTypeToProvider } from "./bridge/mappers";

import { store } from "./bridge/domains/store";
import { projects } from "./bridge/domains/projects";
import { models } from "./bridge/domains/models";
import { ai } from "./bridge/domains/ai";
import { agents } from "./bridge/domains/agents";
import { permissions } from "./bridge/domains/permissions";
import { sessions } from "./bridge/domains/sessions";
import { memory } from "./bridge/domains/memory";
import { diagnostics } from "./bridge/domains/diagnostics";
import { dependency } from "./bridge/domains/dependency";
import { dashboard } from "./bridge/domains/dashboard";
import { voice } from "./bridge/domains/voice";
import { terminal } from "./bridge/domains/terminal";
import { browser } from "./bridge/domains/browser";
import { ide } from "./bridge/domains/ide";
import { plugins } from "./bridge/domains/plugins";
import { npm } from "./bridge/domains/npm";
import { remote } from "./bridge/domains/remote";
import { canvas } from "./bridge/domains/canvas";
import { scheduler } from "./bridge/domains/scheduler";
import { transfer } from "./bridge/domains/transfer";
import { git } from "./bridge/domains/git";
import { promptLab } from "./bridge/domains/promptLab";
import { promptDrive } from "./bridge/domains/promptDrive";
import { docs } from "./bridge/domains/docs";
import { share } from "./bridge/domains/share";
import { tunnel } from "./bridge/domains/tunnel";
import { apiLab } from "./bridge/domains/apiLab";
import { workflow } from "./bridge/domains/workflow";
import { orchestrator } from "./bridge/domains/orchestrator";
import { ssh } from "./bridge/domains/ssh";
import { torrent } from "./bridge/domains/torrent";
import { cliMaker } from "./bridge/domains/cliMaker";
import { academy } from "./bridge/domains/academy";
import { lsp } from "./bridge/domains/lsp";
import { mcp } from "./bridge/domains/mcp";

import type { ToolStatus, StatusBarState } from "../types/neurodeck";

export { BridgeError, isBridgeError };
export { listenBridge };
export { getBridgeConnectionState } from "./bridge/transport";
export type { BridgeStatus } from "./bridge/transport";
export { computeBackoff, isSafeReadCommand };
export { runtimeTypeToProvider };
export { bridgeInvoke };
export type { BridgeInvokeOptions } from "./bridge/http";

// ─────────────────────────────────────────────────────────────────────────────
// Bridge client configuration constants (re-exported for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TIMEOUT_MS = 30_000;
export const WS_INITIAL_RECONNECT_DELAY_MS = 1_000;
export const WS_MAX_RECONNECT_DELAY_MS = 30_000;
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_INITIAL_DELAY_MS = 500;
export const RETRY_MAX_DELAY_MS = 8_000;

// ─────────────────────────────────────────────────────────────────────────────
// Domain type re-exports (public API preserved)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  ProjectScanResponse,
  ProjectContextResponse,
  Project,
} from "./bridge/domains/projects";
export type {
  ModelDetectionResponse,
  ScoreOptions,
  ProviderHealth,
  DiscoveredModelEntry,
  ModelProbeResult,
  ModelCompatibilityScore,
  AgentScoredModel,
  AgentModelAllowance,
  RecoveryEvaluation,
  RecoveryEvent,
} from "./bridge/domains/models";
export type { ChatStreamCallbacks } from "./bridge/domains/ai";
export type {
  PermissionProfile,
  PermissionRegistry,
  AgentPermissionProfile,
} from "./bridge/domains/permissions";
export type { MemoryRecord } from "./bridge/domains/memory";
export type {
  ConnectionMatrixEntry,
  ConnectionEvidence,
} from "./bridge/domains/diagnostics";
export type {
  DependencyStatus,
  DependencyProgress,
} from "./bridge/domains/dependency";
export type { DashboardStats } from "./bridge/domains/dashboard";
export type { TerminalSpawnOptions } from "./bridge/domains/terminal";
export type { PluginInfo } from "./bridge/domains/plugins";
export type { RemoteNotificationPayload } from "./bridge/domains/remote";
export type { CodeLang } from "./bridge/domains/canvas";
export type { ScheduledTask } from "./bridge/domains/scheduler";
export type {
  TransferPeer,
  DiscoveredPeer,
  FileTransfer,
  TrustedPeer,
  SyncProfile,
  TransferDiagnostics,
} from "./bridge/types/transfer";
export type { GitRepo, GitBranch, GitCommit, GitFile } from "./bridge/domains/git";
export type {
  PromptSlot,
  PromptTemplate,
  PromptPack,
  PromptPreview,
  SavedPrompt,
  MacroStep,
  MacroDefinition,
  Suggestion,
} from "./bridge/domains/promptDrive";
export type { ApiRequest, ApiResponse } from "./bridge/domains/apiLab";
export type { WorkflowDoc, WorkflowSummary } from "./bridge/domains/workflow";
export type { TorrentItem, TorrentClientStatus } from "./bridge/domains/torrent";
export type {
  AcademyLearnerProgress,
  AcademyPortfolioEntry,
  AcademyCompletionPayload,
  AcademyCompletionResult,
} from "./bridge/domains/academy";
export type {
  LspDiagnostic,
  LspCompletionItem,
  LspHover,
  LspLocation,
  LspServerInfo,
  KnownLspServer,
} from "./bridge/domains/lsp";
export type { McpStatus } from "./bridge/domains/mcp";

// ─────────────────────────────────────────────────────────────────────────────
// Standalone API helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getInitialState() {
  return bridgeInvoke<{
    model: string;
    provider: string;
    active_agent_id: string;
    session_id: string;
    active_persona: string;
    memory_status: string;
    tool_status: ToolStatus;
    boot_health_status: string;
    boot_health_summary: string;
    boot_health_recovered_count: string;
    boot_health_warning_count: string;
    game_name: string;
    game_app_id: number;
    game_running: string;
    active_theme_name: string | null;
  }>("get_initial_state");
}

export async function getStatusBarState(): Promise<StatusBarState> {
  return bridgeInvoke<StatusBarState>("get_status_bar_state");
}

export async function setTheme(name: string): Promise<{ active_theme_name: string }> {
  return bridgeInvoke<{ active_theme_name: string }>("set_theme", { name });
}

// ─────────────────────────────────────────────────────────────────────────────
// Assembled API surface (matches v6 neurodeckApi exactly)
// ─────────────────────────────────────────────────────────────────────────────

export const neurodeckApi = {
  getInitialState,
  getStatusBarState,
  setTheme,
  store,
  projects,
  dashboard,
  models,
  ai,
  voice,
  agents,
  permissions,
  sessions,
  memory,
  diagnostics,
  terminal,
  browser,
  ide,
  plugins,
  npm,
  remote,
  canvas,
  scheduler,
  transfer,
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
  lsp,
  cliMaker,
  dependency,
  academy,
  mcp,
};
