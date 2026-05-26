import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("neurodeck_onboarding_complete", "true");
    const noop = async () => {};
    const listeners = new Map();
    const defaultConfig = {
      llm: {
        default_provider: "gemini",
        gemini_model: "gemini-1.5-flash",
        ollama_base_url: "http://localhost:11434",
        ollama_model: "llama3.2:1b",
        active_agent_id: "default",
      },
    };

    const invoke = async (cmd: string, args?: any) => {
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
          return "test-api-key";
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
        case "test_llm_connection":
          return "Gemini Connection Successful!";
        case "send_command":
          // Trigger mock streaming after a short delay
          setTimeout(() => {
            const chunkCb = listeners.get("stream_chunk");
            const doneCb = listeners.get("stream_done");
            if (chunkCb) {
              chunkCb({ payload: "Hello" });
              chunkCb({ payload: " from" });
              chunkCb({ payload: " the" });
              chunkCb({ payload: " mock" });
              chunkCb({ payload: " stream!" });
            }
            if (doneCb) doneCb({ payload: null });
          }, 100);
          return null;
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
        default:
          return args ?? null;
      }
    };

    window.__TAURI_INTERNALS__ = {
      invoke,
      transformCallback: (callback: any) => callback,
      convertFileSrc: (value: string) => value,
    };
    window.__TAURI__ = {
      core: { invoke },
      event: {
        listen: async (event: string, callback: any) => {
          listeners.set(event, callback);
          return async () => listeners.delete(event);
        },
        emit: (event: string, payload: any) => {
          const cb = listeners.get(event);
          if (cb) cb({ payload });
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

    // Expose mock emitter for tests
    (window as any).__mock_emit = (event: string, payload: any) => {
      const cb = listeners.get(event);
      if (cb) cb({ payload });
    };
  });

  await page.goto("/");
  await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});
});

test("user can send a message and receive a streamed response", async ({ page }) => {
  const chatViewport = page.locator("#chat-viewport");
  await expect(chatViewport).toBeVisible();

  const input = page.locator("#user-input");
  await input.fill("Hello AI");
  await input.press("Enter");

  // User message should appear immediately
  await expect(chatViewport.locator(".message.user")).toContainText("Hello AI");

  // AI thinking placeholder should appear
  await expect(chatViewport.locator(".message.ai")).toBeVisible();

  // Wait for streamed response to complete
  await expect(chatViewport.locator(".message.ai .message-card")).toContainText("Hello from the mock stream!", { timeout: 10000 });

  // Metadata footer should be injected after stream_done
  await expect(chatViewport.locator(".msg-meta")).toBeVisible();
});

test("chat stream error is rendered as a system error message", async ({ page }) => {
  await page.addInitScript(() => {
    const invoke = window.__TAURI_INTERNALS__.invoke;
    window.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: any) => {
      if (cmd === "send_command") {
        setTimeout(() => {
          const errCb = (window as any).__mock_emit;
          if (errCb) errCb("stream_error", "Mock LLM failure");
        }, 50);
        return null;
      }
      return invoke(cmd, args);
    };
  });

  const chatViewport = page.locator("#chat-viewport");
  await page.locator("#user-input").fill("Trigger error");
  await page.locator("#user-input").press("Enter");

  await expect(chatViewport.locator(".message.system.error")).toContainText("Mock LLM failure", { timeout: 10000 });
});
