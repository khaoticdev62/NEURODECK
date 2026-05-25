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

    const invoke = async (cmd, args) => {
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
          return "";
        case "get_personas":
          return ["Default", "Developer"];
        case "get_themes":
          return ["Neurodeck", "Midnight"];
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
      transformCallback: (callback) => callback,
      convertFileSrc: (value) => value,
    };
    window.__TAURI__ = {
      core: { invoke },
      event: {
        listen: async (event, callback) => {
          listeners.set(event, callback);
          return async () => listeners.delete(event);
        },
        emit: noop,
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
  });

  await page.goto("/");
  await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});
});

test("settings shell opens, switches themed tabs, and closes", async ({ page }) => {
  await page.locator("#settings-btn").click();

  const modal = page.locator("#settings-overlay .settings-modal-card");
  const settingsOverlay = page.locator("#settings-overlay");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("data-settings-theme", "general");

  await settingsOverlay.getByRole("button", { name: "Appearance" }).click();
  await expect(modal).toHaveAttribute("data-settings-theme", "appearance");
  await expect(page.locator("#sp-appearance")).toHaveClass(/active/);

  await settingsOverlay.getByRole("button", { name: "Terminal" }).click();
  await expect(modal).toHaveAttribute("data-settings-theme", "terminal");
  await expect(page.locator("#sp-terminal")).toHaveClass(/active/);

  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-overlay")).not.toHaveClass(/active/);
});

test("stale settings tab state falls back to General", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("settingsActivePanel", "sp-does-not-exist"));
  await page.reload();
  await page.locator("#settings-btn").click();

  const modal = page.locator("#settings-overlay .settings-modal-card");
  await expect(modal).toHaveAttribute("data-settings-theme", "general");
  await expect(page.locator("#sp-general")).toHaveClass(/active/);
});
