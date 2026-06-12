/// <reference types="vite/client" />
/// <reference path="./electron.d.ts" />

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
  SaveSessionResponse,
  SessionExportResponse,
} from './types/neurodeck';

type NeuroDeckStoreResult = { ok: boolean; updatedAt?: string; reason?: string };
type ProjectScanResponse = { canceled: true } | { canceled: false; project?: ProjectScanResult; error?: string };
type ProjectContextResponse = { ok: true; context: ProjectContextSnapshot } | { ok: false; error: string };
type ModelDetectionResponse = { ok: true; detection: ModelDetectionResult } | { ok: false; error: string };

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
      browser: {
        createTab: (url?: string, profileId?: string) => Promise<any>;
        closeTab: (tabId: string) => Promise<{ success: boolean }>;
        switchTab: (tabId: string) => Promise<{ success: boolean }>;
        duplicateTab: (tabId: string) => Promise<any>;
        getTabs: () => Promise<any[]>;
        getActiveTab: () => Promise<any>;
        navigate: (tabId: string, url: string) => Promise<any>;
        goBack: (tabId: string) => Promise<{ success: boolean }>;
        goForward: (tabId: string) => Promise<{ success: boolean }>;
        reload: (tabId: string) => Promise<{ success: boolean }>;
        stop: (tabId: string) => Promise<{ success: boolean }>;
        findInPage: (tabId: string, text: string, findNext?: boolean) => Promise<{ success: boolean }>;
        setZoom: (tabId: string, zoomFactor: number) => Promise<{ success: boolean }>;
        setBounds: (bounds: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean }>;
        hide: () => Promise<{ success: boolean }>;
        show: () => Promise<{ success: boolean }>;
        getProfiles: () => Promise<any[]>;
        setProfile: (tabId: string, profileId: string) => Promise<{ success: boolean }>;
        clearData: (profileId: string, options: any) => Promise<{ success: boolean }>;
        getHistory: (profileId?: string) => Promise<any[]>;
        deleteHistory: (id: string) => Promise<{ success: boolean }>;
        clearHistory: (profileId?: string) => Promise<{ success: boolean }>;
        getBookmarks: (profileId?: string) => Promise<any[]>;
        addBookmark: (url: string, title: string, profileId: string) => Promise<{ success: boolean; bookmark?: any }>;
        deleteBookmark: (id: string) => Promise<{ success: boolean }>;
        getDownloads: () => Promise<any[]>;
        cancelDownload: (id: string) => Promise<{ success: boolean }>;
        openDownload: (id: string) => Promise<{ success: boolean }>;
        showDownload: (id: string) => Promise<{ success: boolean }>;
        getPermissions: () => Promise<any[]>;
        setPermission: (payload: any) => Promise<{ success: boolean }>;
        respondToPermission: (requestId: string, decision: string) => Promise<{ success: boolean }>;
        openDevTools: (tabId: string) => Promise<{ success: boolean }>;
        getDiagnostics: () => Promise<any>;
        normalizeUrl: (url: string) => Promise<{ url: string }>;
        saveToMemory: () => Promise<any>;
        onBrowserEvent: (callback: (data: { event: string; payload: Record<string, unknown> }) => void) => () => void;
      };
    };
  }
}

export {};
