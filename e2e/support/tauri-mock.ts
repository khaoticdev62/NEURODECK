/**
 * Shared Tauri backend mock for E2E tests.
 *
 * Usage:
 *   import { buildTauriMock } from "../support/tauri-mock";
 *   await page.addInitScript(buildTauriMock);
 *
 * To override specific commands:
 *   await page.addInitScript(() => {
 *     buildTauriMock({
 *       overrides: {
 *         send_command: async () => { ... }
 *       }
 *     });
 *   });
 */

export interface TauriMockOptions {
  /** Override specific invoke commands. Key = command name, Value = handler function. */
  overrides?: Record<string, (args?: any) => Promise<any> | any>;
  /** Value returned by get_gemini_api_key. Default: "" */
  geminiApiKey?: string;
  /** Extra init to run after the mock is set up. */
  extraInit?: () => void;
}

export function buildTauriMock(options: TauriMockOptions = {}) {
  const {
    overrides = {},
    geminiApiKey = "",
    extraInit,
  } = options;

  localStorage.setItem("neurodeck_onboarding_complete", "true");

  const hideBg = () => {
    const bg = document.getElementById("app-background-container");
    if (bg) bg.style.display = "none";
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideBg);
  } else {
    hideBg();
  }

  const noop = async () => {};
  const listeners = new Map<string, ((payload: any) => void)[]>();
  const savedPrompts: any[] = [];
  const promptDriveMacros: any[] = [];

  const defaultConfig = {
    llm: {
      default_provider: "gemini",
      gemini_model: "gemini-1.5-flash",
      ollama_base_url: "http://localhost:11434",
      ollama_model: "llama3.2:1b",
      active_agent_id: "default",
    },
  };

  const promptDriveTemplates = [
    {
      id: "core.jpe_explain",
      pack_id: "core",
      title: "JPE Explainer",
      description: "Explain a technical idea in Just Plain English.",
      category: "Explain",
      agent_hint: "technical-writer",
      risk_level: "low",
      slots: [
        { id: "topic", label: "Topic", required: true, kind: "textarea", default: "", suggestions: ["Rust ownership", "SQLite migration"] },
        { id: "audience", label: "Audience", required: true, kind: "text", default: "solo developer", suggestions: ["beginner", "technical founder"] },
        { id: "format", label: "Output Format", required: false, kind: "text", default: "short checklist", suggestions: ["short checklist", "decision table"] },
      ],
      template: "Explain {{topic}} to a {{audience}}. End with {{format}}.",
    },
  ];

  const renderPromptDrivePrompt = (args?: any) => {
    const values = args?.slot_values ?? {};
    const topic = values.topic ?? "";
    const audience = values.audience ?? "solo developer";
    const format = values.format ?? "short checklist";
    const missing = topic.trim() ? [] : ["topic"];
    return {
      valid: missing.length === 0,
      missing_slots: missing,
      errors: [],
      rendered_prompt: missing.length ? null : `Explain ${topic} to a ${audience}. End with ${format}.`,
    };
  };

  const defaultInvoke = async (cmd: string, args?: any) => {
    if (overrides[cmd]) {
      return await overrides[cmd](args);
    }

    switch (cmd) {
      case "get_initial_state":
        return {
          model: "gemini-1.5-flash",
          provider: "gemini",
          active_agent_id: "default",
          session_id: "test-session",
          active_persona: "Default",
          memory_status: "Stable",
          tool_status: "Idle",
          game_name: "",
          game_app_id: "",
          game_running: "false",
        };
      case "get_config":
        return defaultConfig;
      case "get_gemini_api_key":
        return geminiApiKey;
      case "get_personas":
        return ["Default", "Developer"];
      case "get_themes":
        return ["Neurodeck", "Midnight"];
      case "list_plugins":
        return [];
      case "get_doc_count":
        return 0;
      case "get_mcp_status":
        return { running: "false", port: "13337" };
      case "get_boot_diagnostics":
        return {
          pipeline: [],
          memory_ready: true,
          provider: "gemini",
          model: "gemini-1.5-flash",
          ollama_base_url: "http://localhost:11434",
        };
      case "test_llm_connection":
        return "Gemini Connection Successful!";
      case "list_custom_personas":
      case "get_themes_list":
      case "get_plugins":
      case "load_plugins":
      case "get_themes_metadata":
        return [];
      case "get_sync_status":
        return {
          device_id: "test-device",
          last_sync_at: null,
          pending_count: 0,
          conflict_count: 0,
        };
      case "torrent_get_status":
        return {
          download_root: "C:/tmp/torrents",
          torrent_count: 0,
          torrents: [],
        };
      case "promptdrive_list_packs":
        return [{ id: "core", title: "Core PromptDrive", description: "Production-safe templates.", templates: promptDriveTemplates }];
      case "promptdrive_list_templates":
        return promptDriveTemplates;
      case "promptdrive_get_template":
        return promptDriveTemplates.find((template) => template.id === args?.template_id) ?? promptDriveTemplates[0];
      case "promptdrive_validate_slots":
      case "promptdrive_preview_prompt":
        return renderPromptDrivePrompt(args);
      case "promptdrive_execute_prompt":
        return { status: "streaming", validation: renderPromptDrivePrompt(args) };
      case "promptdrive_save_prompt": {
        const saved = {
          id: `saved-${savedPrompts.length + 1}`,
          title: args?.title ?? "Saved Prompt",
          prompt: args?.prompt ?? "",
          template_id: args?.template_id,
          pack_id: args?.pack_id,
          slot_values: args?.slot_values ?? {},
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
        savedPrompts.push(saved);
        return saved;
      }
      case "promptdrive_list_saved_prompts":
        return [...savedPrompts];
      case "promptdrive_macro_start":
        return { recording_id: "draft-1", status: "recording" };
      case "promptdrive_macro_stop": {
        const macro = {
          id: `macro-${promptDriveMacros.length + 1}`,
          name: args?.name ?? "PromptDrive Macro",
          created_at: "2026-01-01T00:00:00Z",
          steps: args?.steps ?? [],
          risk_level: "low",
        };
        promptDriveMacros.push(macro);
        return macro;
      }
      case "promptdrive_list_macros":
        return [...promptDriveMacros];
      case "promptdrive_macro_execute":
        return {
          status: "ready",
          safe_replay: true,
          macro:
            promptDriveMacros.find((macro) => macro.id === args?.macro_id) ?? {
              id: args?.macro_id,
              name: "Macro",
              steps: [],
              risk_level: "low",
            },
        };
      case "promptdrive_delete_macro": {
        const index = promptDriveMacros.findIndex((macro) => macro.id === args?.macro_id);
        if (index >= 0) {
          promptDriveMacros.splice(index, 1);
        }
        return { status: "deleted", macro_id: args?.macro_id };
      }
      case "promptdrive_get_suggestions":
        return [
          { id: "s1", label: "Rust ownership", source: "Topic", insert_text: "Rust ownership", score: 9 },
          { id: "s2", label: "SQLite migration", source: "Topic", insert_text: "SQLite migration", score: 7 },
        ];
      case "set_theme":
        return {
          Name: args?.name ?? "BLACKSITE",
          Color: "#00F0FF",
          Pulse: JSON.stringify(["#00F0FF"]),
          Background: "#050505",
          Foreground: "#D9F7FF",
          Accent: "#00F0FF",
          Response: "#00FF88",
          Warning: "#FFB000",
          Error: "#FF3C5A",
        };
      case "plugin:event|listen": {
        const evtName = args?.event;
        const handler = args?.handler;
        if (evtName && handler) {
          const list = listeners.get(evtName) ?? [];
          list.push(handler);
          listeners.set(evtName, list);
        }
        return `mock-event-id-${evtName}`;
      }
      default:
        return args ?? null;
    }
  };

  const invoke = async (cmd: string, args?: any) => {
    if (cmd === "send_command" && overrides["send_command"]) {
      return await overrides["send_command"](args);
    }
    // Default streaming mock for send_command
    if (cmd === "send_command") {
      setTimeout(() => {
        const chunkCbs = listeners.get("stream_chunk") ?? [];
        const doneCbs = listeners.get("stream_done") ?? [];
        for (const cb of chunkCbs) {
          cb({ payload: "Hello" });
          cb({ payload: " from" });
          cb({ payload: " the" });
          cb({ payload: " mock" });
          cb({ payload: " stream!" });
        }
        for (const cb of doneCbs) cb({ payload: null });
      }, 100);
      return null;
    }
    return defaultInvoke(cmd, args);
  };

  (window as any).__TAURI_INTERNALS__ = {
    invoke,
    transformCallback: (callback: any) => callback,
    convertFileSrc: (value: string) => value,
  };
  (window as any).__TAURI__ = {
    core: { invoke },
    event: {
      listen: async (event: string, callback: any) => {
        const list = listeners.get(event) ?? [];
        list.push(callback);
        listeners.set(event, list);
        return async () => {
          const updated = (listeners.get(event) ?? []).filter((c) => c !== callback);
          listeners.set(event, updated);
        };
      },
      emit: (event: string, payload: any) => {
        for (const cb of listeners.get(event) ?? []) {
          cb({ payload });
        }
      },
    },
    path: {},
    webviewWindow: {
      getCurrentWebviewWindow: () => ({
        label: "main",
        listen: async () => async () => {},
        emit: noop,
        onCloseRequested: noop,
      }),
    },
    window: {
      getCurrentWindow: () => ({
        label: "main",
        listen: async () => async () => {},
        emit: noop,
      }),
    },
  };

  (window as any).__mock_emit = (event: string, payload: any) => {
    for (const cb of listeners.get(event) ?? []) {
      cb({ payload });
    }
  };

  // Intercept bridgeInvoke HTTP calls so promptDrive.* and other bridge-only APIs
  // work in tests without a running sidecar.
  const _originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes('/api/')) {
      const match = url.match(/\/api\/([^?#/]+)/);
      const cmd = match?.[1];
      if (cmd) {
        try {
          let args: any = {};
          if (init?.body) {
            try { args = JSON.parse(init.body as string); } catch { /* ignore */ }
          }
          const result = await defaultInvoke(cmd, args);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(String(error), { status: 500 });
        }
      }
    }
    return _originalFetch(input, init);
  };

  if (extraInit) extraInit();
}
