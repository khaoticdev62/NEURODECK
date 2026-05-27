import { Page, Locator, expect } from "@playwright/test";

export class AppPage {
  readonly page: Page;

  // Navigation
  readonly navTabChat: Locator;
  readonly navTabCanvas: Locator;
  readonly navTabTerminal: Locator;
  readonly navTabSsh: Locator;
  readonly navTabTunnel: Locator;
  readonly navTabShare: Locator;
  readonly navTabBrowser: Locator;
  readonly navTabAgent: Locator;
  readonly navTabMemory: Locator;
  readonly navTabPromptLab: Locator;
  readonly navTabRemote: Locator;
  readonly navTabDocs: Locator;

  // Views
  readonly viewChat: Locator;
  readonly viewCanvas: Locator;
  readonly viewTerminal: Locator;
  readonly viewSsh: Locator;
  readonly viewTunnel: Locator;
  readonly viewShare: Locator;
  readonly viewBrowser: Locator;
  readonly viewAgent: Locator;
  readonly viewMemory: Locator;
  readonly viewPromptLab: Locator;
  readonly viewRemote: Locator;
  readonly viewDocs: Locator;

  // Global chrome
  readonly settingsBtn: Locator;
  readonly settingsOverlay: Locator;
  readonly commandPaletteBtn: Locator;
  readonly commandPaletteOverlay: Locator;
  readonly notifBtn: Locator;
  readonly notifModal: Locator;
  readonly shortcutsOverlay: Locator;
  readonly quickSwitcherOverlay: Locator;

  constructor(page: Page) {
    this.page = page;

    this.navTabChat = page.getByTestId("nav-tab-chat");
    this.navTabCanvas = page.getByTestId("nav-tab-canvas");
    this.navTabTerminal = page.getByTestId("nav-tab-terminal");
    this.navTabSsh = page.getByTestId("nav-tab-ssh");
    this.navTabTunnel = page.getByTestId("nav-tab-tunnel");
    this.navTabShare = page.getByTestId("nav-tab-share");
    this.navTabBrowser = page.getByTestId("nav-tab-browser");
    this.navTabAgent = page.getByTestId("nav-tab-agent");
    this.navTabMemory = page.getByTestId("nav-tab-memory");
    this.navTabPromptLab = page.getByTestId("nav-tab-prompt-lab");
    this.navTabRemote = page.getByTestId("nav-tab-remote");
    this.navTabDocs = page.getByTestId("nav-tab-docs");

    this.viewChat = page.getByTestId("view-chat");
    this.viewCanvas = page.getByTestId("view-canvas");
    this.viewTerminal = page.getByTestId("view-terminal");
    this.viewSsh = page.getByTestId("view-ssh");
    this.viewTunnel = page.getByTestId("view-tunnel");
    this.viewShare = page.getByTestId("view-share");
    this.viewBrowser = page.getByTestId("view-browser");
    this.viewAgent = page.getByTestId("view-agent");
    this.viewMemory = page.getByTestId("view-memory");
    this.viewPromptLab = page.getByTestId("view-prompt-lab");
    this.viewRemote = page.getByTestId("view-remote");
    this.viewDocs = page.getByTestId("view-docs");

    this.settingsBtn = page.locator("#settings-btn");
    this.settingsOverlay = page.locator("#settings-overlay");
    this.commandPaletteBtn = page.locator("#command-palette-btn");
    this.commandPaletteOverlay = page.locator("#command-palette-overlay");
    this.notifBtn = page.locator("#notif-btn");
    this.notifModal = page.locator("#notif-modal");
    this.shortcutsOverlay = page.locator("#shortcuts-overlay");
    this.quickSwitcherOverlay = page.locator("#quick-switcher-overlay");
  }

  async goto() {
    await this.page.goto("/");
    await this.page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});
  }

  async navigateTo(view: string) {
    const tab = this.page.getByTestId(`nav-tab-${view}`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(this.page.getByTestId(`view-${view}`)).toHaveClass(/active/);
  }

  async openSettings() {
    await this.settingsBtn.click();
    await expect(this.settingsOverlay).toHaveClass(/active/);
  }

  async closeSettings() {
    await this.page.keyboard.press("Escape");
    await expect(this.settingsOverlay).not.toHaveClass(/active/);
  }

  async openCommandPalette() {
    await this.page.keyboard.press("Control+K");
    await expect(this.commandPaletteOverlay).toHaveClass(/active/);
  }

  async closeCommandPalette() {
    await this.page.keyboard.press("Escape");
    await expect(this.commandPaletteOverlay).not.toHaveClass(/active/);
  }

  async openShortcuts() {
    await this.page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
    await this.page.keyboard.press("?");
    await expect(this.shortcutsOverlay).not.toHaveClass(/hidden/);
  }

  async closeShortcuts() {
    await this.page.keyboard.press("Escape");
    await expect(this.shortcutsOverlay).toHaveClass(/hidden/);
  }

  async openQuickSwitcher() {
    await this.page.keyboard.press("Control+Tab");
    await expect(this.quickSwitcherOverlay).toHaveClass(/active/);
  }

  async closeQuickSwitcher() {
    await this.page.keyboard.press("Escape");
    await expect(this.quickSwitcherOverlay).not.toHaveClass(/active/);
  }

  async mockTauriBackend() {
    await this.page.addInitScript(() => {
      // Inline the shared mock so Playwright can inject it without bundling
      const buildTauriMock = (options: any = {}) => {
        const { overrides = {}, geminiApiKey = "" } = options;
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
        const listeners = new Map<string, any[]>();
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
          if (overrides[cmd]) return await overrides[cmd](args);
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
                const updated = (listeners.get(event) ?? []).filter((c: any) => c !== callback);
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
      };
      buildTauriMock();
    });
  }
}
