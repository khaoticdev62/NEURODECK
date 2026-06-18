import type {
  DiagnosticsPayload,
  DiagnosticLog,
  SecurityReport,
  CredentialStatus,
  DiagnosticsBundleResponse,
} from "../../../types/neurodeck";
import type { OnboardingDiagnosticResult } from "../../../types/onboarding";
import { bridgeInvoke } from "../http";
import { categoryForRuntimeType, stateFromHealth } from "../mappers";
import type { ProviderHealth } from "./models";

const offlineDiagnosticsFallback: DiagnosticsPayload = {
  platform: navigator.platform,
  arch: "unknown",
  electron: "unavailable",
  chrome: "unavailable",
  node: "unavailable",
  packaged: false,
  userData: "unavailable",
  storeFile: "unavailable",
  exportsDir: "unavailable",
  logCount: 0,
};

export type ConnectionMatrixEntry = {
  id: string;
  label: string;
  category: "api" | "ipc" | "lsp" | "storage" | "plugin" | "system";
  state: "connected" | "offline" | "warning" | "error" | "unprobed";
  latencyMs: number | null;
  requestCount: number;
  successCount: number;
  evidence: ConnectionEvidence[];
};

export type ConnectionEvidence = {
  requestId: string;
  timestamp: string;
  status: "passed" | "failed" | "skipped";
  summary: string;
  durationMs: number;
  bytesSent: number;
  bytesReceived: number;
  realTransportUsed: boolean;
};

export const diagnostics = {
  async get(): Promise<DiagnosticsPayload> {
    try {
      const health = await bridgeInvoke<{
        status?: string;
        provider?: string;
        model?: string;
        memory_doc_count?: number;
        plugin_count?: number;
      }>("get_system_health");
      return {
        platform: navigator.platform,
        arch: "unknown",
        electron: "unavailable",
        chrome: "unavailable",
        node: "unavailable",
        packaged: false,
        appVersion: "1.8.0",
        userData: "unavailable",
        storeFile: "unavailable",
        exportsDir: "unavailable",
        logCount: health.memory_doc_count ?? 0,
      };
    } catch (_) {
      return offlineDiagnosticsFallback;
    }
  },
  async runOnboardingDiagnostics(): Promise<OnboardingDiagnosticResult> {
    return bridgeInvoke<OnboardingDiagnosticResult>("run_onboarding_diagnostics");
  },
  async logs(): Promise<DiagnosticLog[]> {
    try {
      return await bridgeInvoke<DiagnosticLog[]>("get_logs");
    } catch (_) {
      return [];
    }
  },
  async securityReport(): Promise<SecurityReport> {
    try {
      return await bridgeInvoke<SecurityReport>("security_report");
    } catch (_) {
      return {
        keychain_ok: false,
        safe_mode: false,
        agent_workspace_only: false,
        permission_registry_count: 0,
      };
    }
  },
  async getCredentialStatus(): Promise<CredentialStatus> {
    try {
      return await bridgeInvoke<CredentialStatus>("get_credential_status");
    } catch (_) {
      return { gemini: false, huggingface: false, openai_compat: false };
    }
  },
  async exportBundle(): Promise<DiagnosticsBundleResponse> {
    try {
      const file = await bridgeInvoke<string>("generate_support_bundle");
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  async getConnectionMatrix(): Promise<{ ok: boolean; data: ConnectionMatrixEntry[] }> {
    try {
      const health = await bridgeInvoke<ProviderHealth[]>("get_provider_health");
      const data: ConnectionMatrixEntry[] = health.map((h) => {
        const latency = Number(h.latency_ms) || 0;
        const connected = h.state === "connected";
        const evidence: ConnectionEvidence = {
          requestId: `probe-${h.runtime_id}`,
          timestamp: h.checked_at || new Date().toISOString(),
          status: connected ? "passed" : "failed",
          summary: connected
            ? `${h.label || h.runtime_id} responded with ${h.models.length} model(s)`
            : h.error || `${h.label || h.runtime_id} is ${h.state}`,
          durationMs: latency,
          bytesSent: 0,
          bytesReceived: 0,
          realTransportUsed: true,
        };
        return {
          id: h.runtime_id,
          label: h.label || h.runtime_id,
          category: categoryForRuntimeType(h.runtime_type),
          state: stateFromHealth(h.state),
          latencyMs: latency || null,
          requestCount: 1,
          successCount: connected ? 1 : 0,
          evidence: [evidence],
        };
      });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, data: [] };
    }
  },

  async runHealthProbe(id?: string): Promise<{ ok: boolean; data: ConnectionMatrixEntry[] }> {
    try {
      const health = await bridgeInvoke<ProviderHealth[]>(
        "get_provider_health",
        id ? { runtimeId: id } : {}
      );
      const data: ConnectionMatrixEntry[] = health.map((h) => {
        const latency = Number(h.latency_ms) || 0;
        const connected = h.state === "connected";
        return {
          id: h.runtime_id,
          label: h.label || h.runtime_id,
          category: categoryForRuntimeType(h.runtime_type),
          state: stateFromHealth(h.state),
          latencyMs: latency || null,
          requestCount: 1,
          successCount: connected ? 1 : 0,
          evidence: [
            {
              requestId: `probe-${h.runtime_id}-${Date.now()}`,
              timestamp: h.checked_at || new Date().toISOString(),
              status: connected ? "passed" : "failed",
              summary: connected
                ? `${h.label || h.runtime_id} probe passed`
                : h.error || `${h.label || h.runtime_id} probe failed (${h.state})`,
              durationMs: latency,
              bytesSent: 0,
              bytesReceived: 0,
              realTransportUsed: true,
            },
          ],
        };
      });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, data: [] };
    }
  },

  subscribeConnectionEvents(
    _callback: (data: { id: string; connection: ConnectionMatrixEntry }) => void
  ): () => void {
    // The bridge currently does not emit real-time connection events over the
    // WebSocket. Returning a no-op keeps the UI stable; callers refresh via
    // getConnectionMatrix / runHealthProbe.
    return () => {};
  },

  async memoryUsage(): Promise<{ rss_mb: number }> {
    try {
      return await bridgeInvoke<{ rss_mb: number }>("get_memory_usage");
    } catch (_) {
      return { rss_mb: 0 };
    }
  },
  async geminiKeyStatus(): Promise<{ set: boolean }> {
    try {
      const key = await bridgeInvoke<string>("get_gemini_api_key");
      return { set: !!key };
    } catch (_) {
      return { set: false };
    }
  },
  async contextStats(): Promise<{ message_count: number; total_tokens: number }> {
    try {
      return await bridgeInvoke<{ message_count: number; total_tokens: number }>(
        "get_context_stats"
      );
    } catch (_) {
      return { message_count: 0, total_tokens: 0 };
    }
  },
};
