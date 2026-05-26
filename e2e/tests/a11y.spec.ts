import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
          return "";
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

const viewTabs = [
  { id: "chat", name: "Chat" },
  { id: "canvas", name: "Canvas" },
  { id: "terminal", name: "Terminal" },
  { id: "ssh", name: "SSH" },
  { id: "tunnel", name: "Tunnel" },
  { id: "share", name: "Share" },
  { id: "browser", name: "Browser" },
  { id: "agent", name: "Agent" },
  { id: "memory", name: "Memory" },
  { id: "prompt-lab", name: "Prompt Lab" },
  { id: "remote", name: "Remote" },
  { id: "docs", name: "Docs" },
];

for (const view of viewTabs) {
  test(`a11y audit on ${view.name} view`, async ({ page }) => {
    const tab = page.locator(`#nav-tab-${view.id}`);
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await expect(page.locator(`#view-${view.id}`)).toHaveClass(/active/);
    }

    const axe = new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"]);

    const results = await axe.analyze();

    // Report violations without failing the suite in Phase 1 —
    // many legacy issues need architectural fixes. Log them for triage.
    if (results.violations.length > 0) {
      console.log(`\n[${view.name}] A11y violations: ${results.violations.length}`);
      for (const v of results.violations) {
        console.log(`  - ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`      ${node.target.join(", ")}`);
        }
      }
    }

    // Hard-fail only on critical / serious violations that are quick wins
    const hardFail = results.violations.filter(
      (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
    );
    expect(hardFail).toEqual([]);
  });
}

test("a11y audit on settings modal", async ({ page }) => {
  await page.locator("#settings-btn").click();
  await expect(page.locator("#settings-overlay")).toHaveClass(/active/);

  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["color-contrast"]);

  const results = await axe.analyze();

  const hardFail = results.violations.filter(
    (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
  );
  expect(hardFail).toEqual([]);
});

test("a11y audit on command palette", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(page.locator("#command-palette")).toHaveClass(/active/);

  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["color-contrast"]);

  const results = await axe.analyze();

  const hardFail = results.violations.filter(
    (v) => (v.impact === "critical" || v.impact === "serious") && v.id !== "color-contrast"
  );
  expect(hardFail).toEqual([]);
});
