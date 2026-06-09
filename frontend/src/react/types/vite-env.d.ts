/// <reference types="vite/client" />

import type {
  AgentRunRequest,
  AgentRunResponse,
  AIChatPayload,
  AIChatResponse,
  AIProviderHealth,
  DiagnosticLog,
  DiagnosticsPayload,
  DiagnosticsBundleResponse,
  SecurityReport,
  ExportSessionPayload,
  ModelDetectionResult,
  ProjectContextSnapshot,
  ProjectScanResult,
  SavedSessionPayload,
  SaveSessionResponse
} from './types/neurodeck';

type NeuroDeckStoreResult = { ok: boolean; updatedAt?: string; reason?: string };
type ProjectScanResponse = { canceled: true } | { canceled: false; project?: ProjectScanResult; error?: string };
type ProjectContextResponse = { ok: true; context: ProjectContextSnapshot } | { ok: false; error: string };
type ModelDetectionResponse = { ok: true; detection: ModelDetectionResult } | { ok: false; error: string };
type SessionExportResponse = { ok: true; file: string } | { ok: false; error: string };

declare global {
  interface Window {
    neurodeck?: {
      window: {
        minimize: () => Promise<void>;
        maximizeToggle: () => Promise<boolean>;
        close: () => Promise<void>;
      };
      store: {
        get: <T = unknown>(key: string) => Promise<T | null>;
        set: (key: string, value: unknown) => Promise<NeuroDeckStoreResult>;
        reset: (key: string) => Promise<NeuroDeckStoreResult>;
      };
      projects: {
        selectAndScan: () => Promise<ProjectScanResponse>;
        buildContext: (projectPath: string) => Promise<ProjectContextResponse>;
      };
      models: {
        detectLocal: () => Promise<ModelDetectionResponse>;
      };
      ai: {
        health: () => Promise<AIProviderHealth[]>;
        chat: (payload: AIChatPayload) => Promise<AIChatResponse>;
      };
      agents: {
        run: (payload: AgentRunRequest) => Promise<AgentRunResponse>;
      };
      sessions: {
        exportMarkdown: (payload: ExportSessionPayload) => Promise<SessionExportResponse>;
        save: (payload: SavedSessionPayload) => Promise<SaveSessionResponse>;
      };
      diagnostics: {
        get: () => Promise<DiagnosticsPayload>;
        logs: () => Promise<DiagnosticLog[]>;
        securityReport: () => Promise<SecurityReport>;
        exportBundle: () => Promise<DiagnosticsBundleResponse>;
      };
    };
  }
}

export {};
