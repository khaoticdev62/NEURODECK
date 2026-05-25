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
  await expect(page.locator(".stv-sidebar-brand-chip")).toBeVisible();

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

test("command palette opens and drives view and settings shortcuts", async ({ page }) => {
  await page.keyboard.press("Control+K");
  await expect(page.locator("#command-palette-overlay")).toHaveClass(/active/);

  await page.locator("#command-palette-input").fill("prompt lab");
  await page.locator("#command-palette-list .command-palette-item").first().click();
  await expect(page.locator('.nav-tab[data-view="prompt-lab"]')).toHaveClass(/active/);
  await expect(page.locator("#view-prompt-lab")).toHaveClass(/active/);

  await page.keyboard.press("Control+K");
  await page.locator("#command-palette-input").fill("appearance");
  await page.locator("#command-palette-list .command-palette-item").first().click();

  const modal = page.locator("#settings-overlay .settings-modal-card");
  await expect(page.locator("#settings-overlay")).toHaveClass(/active/);
  await expect(modal).toHaveAttribute("data-settings-theme", "appearance");
  await expect(page.locator("#sp-appearance")).toHaveClass(/active/);
});

test("all primary nav tabs remain clickable across the full strip", async ({ page }) => {
  const tabs = [
    ["chat", "#view-chat"],
    ["canvas", "#view-canvas"],
    ["terminal", "#view-terminal"],
    ["ssh", "#view-ssh"],
    ["tunnel", "#view-tunnel"],
    ["share", "#view-share"],
    ["browser", "#view-browser"],
    ["agent", "#view-agent"],
    ["memory", "#view-memory"],
    ["prompt-lab", "#view-prompt-lab"],
    ["remote", "#view-remote"],
    ["docs", "#view-docs"],
  ] as const;

  for (const [view, panel] of tabs) {
    const tab = page.locator(`.nav-tab[data-view="${view}"]`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(tab).toHaveClass(/active/);
    await expect(page.locator(panel)).toHaveClass(/active/);
  }
});

test("settings modal remains in viewport on compact window sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await page.reload();
  await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

  await page.locator("#settings-btn").click();
  const modal = page.locator("#settings-overlay .settings-modal-card");
  await expect(modal).toBeVisible();

  const box = await modal.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1180);
  expect(box!.y + box!.height).toBeLessThanOrEqual(720);

  const panel = page.locator("#sp-network");
  await page.locator("#settings-overlay").getByRole("button", { name: "Network" }).click();
  await expect(panel).toHaveClass(/active/);
  await expect(panel).toBeVisible();
});

test("docs and remote views stay usable without horizontal overflow on narrow windows", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.reload();
  await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

  await page.locator('.nav-tab[data-view="remote"]').click();
  await expect(page.locator("#view-remote")).toHaveClass(/active/);
  await expect(page.locator(".remote-kicker")).toBeVisible();
  const remoteMetrics = await page.locator(".remote-container").evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(remoteMetrics.scrollWidth).toBeLessThanOrEqual(remoteMetrics.clientWidth + 2);
  await expect(page.locator("#view-remote .remote-status-badge")).toBeVisible();

  await page.locator('.nav-tab[data-view="docs"]').click();
  await expect(page.locator("#view-docs")).toHaveClass(/active/);
  await expect(page.locator(".docs-kicker")).toBeVisible();
  const docsMetrics = await page.locator(".docs-container").evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(docsMetrics.scrollWidth).toBeLessThanOrEqual(docsMetrics.clientWidth + 2);
  await expect(page.locator(".docs-search-shell")).toBeVisible();
  await expect(page.locator("#view-docs .docs-search-input")).toBeVisible();
});

test("tool-heavy tabs stay horizontally centered on wide viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

  const centeredTabs = [
    ["browser", ".browser-container"],
    ["agent", ".agent-shell"],
    ["memory", ".memory-shell"],
    ["remote", ".remote-container"],
    ["docs", ".docs-container"],
  ] as const;

  for (const [view, shellSelector] of centeredTabs) {
    await page.locator(`.nav-tab[data-view="${view}"]`).click();
    await expect(page.locator(`#view-${view}`)).toHaveClass(/active/);
    await page.waitForTimeout(350);

    const metrics = await page.locator(shellSelector).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        width: rect.width,
        centerX: rect.left + rect.width / 2,
        viewportCenterX: window.innerWidth / 2,
      };
    });

    expect(Math.abs(metrics.centerX - metrics.viewportCenterX)).toBeLessThanOrEqual(2);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
  }
});

test("chat, memory, and prompt lab expose the refined shell hierarchy", async ({ page }) => {
  await page.locator('.nav-tab[data-view="chat"]').click();
  await expect(page.locator("#view-chat")).toHaveClass(/active/);
  await expect(page.locator(".chat-session-kicker")).toBeVisible();

  await page.locator('.nav-tab[data-view="memory"]').click();
  await expect(page.locator("#view-memory")).toHaveClass(/active/);
  await expect(page.locator(".memory-kicker")).toBeVisible();
  await expect(page.locator(".memory-search-shell")).toBeVisible();

  await page.locator('.nav-tab[data-view="prompt-lab"]').click();
  await expect(page.locator("#view-prompt-lab")).toHaveClass(/active/);
  await expect(page.locator(".pl-header-kicker")).toBeVisible();
  await expect(page.locator("#pl-open-gallery-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#pl-optimize-ai-btn .nd-icon-svg")).toBeVisible();
});

test("agent, browser, and tunnel expose the refined shell hierarchy", async ({ page }) => {
  await page.locator('.nav-tab[data-view="agent"]').click();
  await expect(page.locator("#view-agent")).toHaveClass(/active/);
  await expect(page.locator(".agent-kicker")).toBeVisible();
  await page.locator("#model-name").click();
  await expect(page.locator("#agent-switcher-panel")).not.toHaveClass(/hidden/);
  await expect(page.locator(".agent-switcher-title .nd-icon-svg")).toBeVisible();
  await expect(page.locator(".agent-switcher-close .nd-icon-svg")).toBeVisible();
  await page.locator(".agent-switcher-close").click();
  await expect(page.locator("#agent-switcher-panel")).toHaveClass(/hidden/);

  await page.locator('.nav-tab[data-view="browser"]').click();
  await expect(page.locator("#view-browser")).toHaveClass(/active/);
  await expect(page.locator(".browser-kicker")).toBeVisible();
  await expect(page.locator(".browser-home-kicker")).toBeVisible();

  await page.locator('.nav-tab[data-view="tunnel"]').click();
  await expect(page.locator("#view-tunnel")).toHaveClass(/active/);
  await expect(page.locator(".tunnel-kicker").first()).toBeVisible();
});

test("ssh and share transfer surfaces expose the refined shell hierarchy", async ({ page }) => {
  await page.locator('.nav-tab[data-view="ssh"]').click();
  await expect(page.locator("#view-ssh")).toHaveClass(/active/);
  await expect(page.locator(".ssh-kicker")).toBeVisible();

  await page.locator('.nav-tab[data-view="share"]').click();
  await expect(page.locator("#view-share")).toHaveClass(/active/);
  await expect(page.locator(".share-view-kicker")).toBeVisible();

  await page.locator('.share-inner-tab[data-panel="torrent"]').click();
  await expect(page.locator("#share-panel-torrent")).toHaveClass(/active/);
  await expect(page.locator(".torrent-kicker")).toBeVisible();
});

test("notification center opens with the refined modal hierarchy", async ({ page }) => {
  await page.locator("#notif-btn").click();
  const modal = page.locator("#notif-modal");
  await expect(modal).toHaveClass(/active/);
  await expect(modal.locator(".notif-modal-card").last()).toBeVisible();
});

test("controller prompt picker and history search expose refined utility chrome", async ({ page }) => {
  await page.keyboard.press("Control+Shift+P");
  await expect(page.locator("#ctrl-prompt-overlay")).toHaveClass(/active/);
  await expect(page.locator(".ctrl-prompt-title .nd-icon-svg")).toBeVisible();
  await expect(page.locator(".ctrl-prompt-cat-icon .nd-icon-svg").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#ctrl-prompt-overlay")).not.toHaveClass(/active/);

  await page.evaluate(() => {
    document.getElementById("history-search-overlay")?.classList.remove("hidden");
  });
  await expect(page.locator(".history-search-title .nd-icon-svg")).toBeVisible();
  await expect(page.locator(".history-empty-icon .nd-icon-svg")).toBeVisible();
});

test("canvas toolbar exposes shared icon actions", async ({ page }) => {
  await page.locator('.nav-tab[data-view="canvas"]').click();
  await expect(page.locator("#view-canvas")).toHaveClass(/active/);
  await expect(page.locator("#canvas-run-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-copy-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-clear-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-ai-edit-btn .nd-icon-svg")).toBeVisible();
  await expect(page.locator("#canvas-collab-btn .nd-icon-svg")).toBeVisible();
});
