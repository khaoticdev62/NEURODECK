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

  const defaultConfig = {
    llm: {
      default_provider: "gemini",
      gemini_model: "gemini-1.5-flash",
      ollama_base_url: "http://localhost:11434",
      ollama_model: "llama3.2:1b",
      active_agent_id: "default",
    },
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

  if (extraInit) extraInit();
}
