import type { AIChatPayload, AIChatResponse, AIProviderHealth } from "../../../types/neurodeck";
import { bridgeInvoke } from "../http";
import { runtimeTypeToProvider } from "../mappers";
import { listenBridge, _waitForWsOpen } from "../transport";
import type { ProviderHealth } from "./models";

const offlineHealthFallback: AIProviderHealth[] = [
  {
    provider: "offline-draft",
    label: "Backend unreachable",
    available: false,
    endpoint: "",
    detail:
      "Offline fallback: cannot determine provider status. Start a local runtime or check the bridge connection.",
    checkedAt: new Date().toISOString(),
  },
];

function browserDraft(payload: AIChatPayload): AIChatResponse {
  const projectLine = payload.projectContext
    ? `Attached context: ${payload.projectContext.summary}`
    : "No project context attached yet.";
  return {
    ok: true,
    provider: "offline-draft",
    model: "offline-draft",
    latencyMs: 0,
    contextSources: payload.projectContext?.files.map((f) => f.path) ?? [],
    message: {
      id: `offline-fallback-${Date.now()}`,
      role: "assistant",
      content: [
        "[OFFLINE FALLBACK] No AI backend is currently reachable.",
        "",
        projectLine,
        "",
        "Recommended next action:",
        `1. Tighten the ask: ${payload.prompt.slice(0, 160)}`,
        "2. Attach project context if this is a codebase task.",
        "3. Start Ollama, LM Studio, or another configured provider.",
      ].join("\n"),
      createdAt: new Date().toISOString(),
      provider: "offline-draft",
      model: "offline-draft",
      latencyMs: 0,
    },
  };
}

export interface ChatStreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export const ai = {
  async health(): Promise<AIProviderHealth[]> {
    try {
      const health = await bridgeInvoke<ProviderHealth[]>("get_provider_health");
      const offline: AIProviderHealth = {
        provider: "offline-draft",
        label: "Offline Draft Engine",
        available: true,
        endpoint: "renderer-local",
        detail: "Always available",
        checkedAt: new Date().toISOString(),
      };
      const mapped = health.map((h): AIProviderHealth => {
        const connected = h.state === "connected";
        return {
          provider: runtimeTypeToProvider(h.runtime_type),
          label: h.label || h.runtime_id,
          available: connected,
          endpoint: h.base_url || h.runtime_id,
          detail: connected ? `${h.models.length} model(s) listed` : h.error || h.state,
          checkedAt: h.checked_at,
          latencyMs: Number(h.latency_ms),
        };
      });
      return [offline, ...mapped];
    } catch (_) {
      return offlineHealthFallback;
    }
  },
  async chat(payload: AIChatPayload): Promise<AIChatResponse> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.models) {
      const res = await neurodeck.models.runPrompt(
        payload.prompt,
        payload.provider === "offline-draft" ? undefined : payload.provider,
        payload.model === "NeuroDraft" ? undefined : payload.model
      );
      if (!res.ok) {
        return browserDraft(payload);
      }
      const response = res.data;
      return {
        ok: true,
        provider: payload.provider,
        model: payload.model,
        latencyMs: res.durationMs || 0,
        contextSources: [],
        message: {
          id: `bridge-${Date.now()}`,
          role: "assistant",
          content: response?.text || response?.content || "",
          createdAt: new Date().toISOString(),
          provider: payload.provider,
          model: payload.model,
        },
      };
    }
    try {
      const response = await bridgeInvoke<{ text?: string; content?: string }>("send_command", {
        message: payload.prompt,
        provider: payload.provider === "offline-draft" ? undefined : payload.provider,
        model: payload.model === "NeuroDraft" ? undefined : payload.model,
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
          role: "assistant",
          content: response.text || response.content || "",
          createdAt: new Date().toISOString(),
          provider: payload.provider,
          model: payload.model,
        },
      };
    } catch (e) {
      return browserDraft(payload);
    }
  },
  async chatStream(payload: AIChatPayload, callbacks: ChatStreamCallbacks): Promise<void> {
    const { onToken, onDone, onError } = callbacks;

    // For offline-draft, bypass the bridge and return the draft immediately
    if (payload.provider === "offline-draft") {
      const draft = browserDraft(payload);
      if (draft.ok) onToken(draft.message.content);
      onDone();
      return;
    }

    // Interrupt any in-progress TTS before starting a new response
    bridgeInvoke("tts_interrupt", {}).catch(() => {});

    const ttsMode = localStorage.getItem("neurodeck_tts_mode") ?? "off";
    let ttsActive = ttsMode !== "off";

    const unsubToken = listenBridge("command_token", (msg: unknown) => {
      const token = (msg as Record<string, string>)?.token ?? "";
      if (token) onToken(token);
    });

    // Streaming TTS: speak each sentence as it arrives from the backend
    const unsubTtsChunk =
      ttsMode === "stream"
        ? listenBridge("tts_chunk", (msg: unknown) => {
            if (!ttsActive) return;
            const text = (msg as Record<string, string>)?.text ?? "";
            if (text.trim()) bridgeInvoke("speak_text_stream", { text }).catch(() => {});
          })
        : () => {};

    const unsubDone = listenBridge("command_done", (msg: unknown) => {
      unsubToken();
      unsubTtsChunk();
      unsubDone();
      // After-complete TTS: speak full response once generation finishes
      if (ttsMode === "complete") {
        const fullText = (msg as Record<string, string>)?.full_text ?? "";
        if (fullText.trim()) bridgeInvoke("speak_text", { text: fullText }).catch(() => {});
      }
      onDone();
    });

    const unsubError = listenBridge("command_error", (msg: unknown) => {
      const errorMsg = (msg as Record<string, string>)?.error ?? "Streaming error";
      ttsActive = false;
      unsubToken();
      unsubTtsChunk();
      unsubDone();
      unsubError();
      onError(errorMsg);
    });

    try {
      // Make sure the WebSocket is actually open before triggering the backend,
      // otherwise the streaming events can be emitted (and dropped) before we
      // are subscribed.
      await _waitForWsOpen();

      const neurodeck = (window as any).neurodeck;
      if (neurodeck?.models) {
        const res = await neurodeck.models.runPrompt(
          payload.prompt,
          payload.provider,
          payload.model === "NeuroDraft" ? undefined : payload.model
        );
        if (!res.ok) {
          throw new Error(res.error?.message || "Prompt execution failed");
        }
      } else {
        await bridgeInvoke<{ status: string }>("send_command", {
          message: payload.prompt,
          provider: payload.provider,
          model: payload.model === "NeuroDraft" ? undefined : payload.model,
          persona: payload.persona,
        });
      }
    } catch (e) {
      ttsActive = false;
      unsubToken();
      unsubTtsChunk();
      unsubDone();
      unsubError();
      onError(String(e));
    }
  },
  async setProvider(provider: string): Promise<void> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set("llm.provider", provider);
      if (!res.ok) throw new Error(res.error?.message || "Failed to set provider");
      return;
    }
    await bridgeInvoke("set_provider", { provider });
  },
  async setModel(model: string): Promise<void> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set("llm.model", model);
      if (!res.ok) throw new Error(res.error?.message || "Failed to set model");
      return;
    }
    await bridgeInvoke("set_model", { model });
  },
};
