/**
 * Onboarding wizard E2E tests — verifies the first-run experience:
 * - Detects empty API key and missing completion flag
 * - Renders all 11 slides
 * - Provider selection, verification, and key storage
 * - Persona and theme selection
 * - System diagnostics run and complete
 * - Completion sets the dismissal flag
 */
import { test, expect } from "@playwright/test";
import { buildTauriMock } from "../support/tauri-mock";

test.describe("Onboarding Wizard", () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend WITHOUT completing onboarding
    await page.addInitScript(() => {
      const noop = async () => {};
      const listeners = new Map<string, ((payload: any) => void)[]>();

      const defaultInvoke = async (cmd: string, args?: any) => {
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
            return {
              llm: {
                default_provider: "gemini",
                gemini_model: "gemini-1.5-flash",
                ollama_base_url: "http://localhost:11434",
                ollama_model: "llama3.2:1b",
                active_agent_id: "default",
              },
            };
          case "get_gemini_api_key":
            return ""; // Empty key triggers onboarding
          case "get_personas":
            return ["Default", "Developer", "Cyberpunk"];
          case "get_themes":
            return ["BLACKSITE", "Neurodeck", "Midnight"];
          case "list_plugins":
            return [];
          case "get_doc_count":
            return 0;
          case "get_context_stats":
            return {
              active_model: "gemini-1.5-flash",
              active_provider: "gemini",
              memory_records_count: 0,
              memory_pinned_count: 0,
              memory_last_store: "Never",
              session_id: "test-session",
              session_messages_count: 0,
            };
          case "get_mcp_status":
            return { running: "false", port: "13337" };
          case "test_llm_connection":
            return "Connection Successful!";
          case "save_gemini_api_key":
            return "saved";
          case "set_config":
            return true;
          case "set_persona":
            return true;
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
          case "run_onboarding_diagnostics":
            return {
              pty_ok: true,
              pty_details: "Shell Subsystem active (Default: bash)",
              network_ok: true,
              network_details: "Gemini API endpoint reachable",
              keychain_ok: true,
              keychain_details: "Secure credential storage active",
              audio_ok: true,
              audio_details: "ALSA audio (arecord) available",
              ssh_ok: true,
              ssh_details: "OpenSSH_9.0",
              tts_ok: true,
              tts_details: "espeak-ng TTS available",
            };
          case "start_recording":
            return "Recording started";
          case "stop_recording":
            return "Test transcription";
          case "speak_text":
            return "spoken";
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
        if (cmd === "send_command") {
          setTimeout(() => {
            const chunkCbs = listeners.get("stream_chunk") ?? [];
            const doneCbs = listeners.get("stream_done") ?? [];
            for (const cb of chunkCbs) {
              cb({ payload: "Hello from mock" });
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

      const hideBg = () => {
        const bg = document.getElementById("app-background-container");
        if (bg) bg.style.display = "none";
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hideBg);
      } else {
        hideBg();
      }
    });
  });

  test("onboarding appears when no API key and not completed", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const overlay = page.locator("#onboarding-overlay");
    await expect(overlay).toBeVisible();
  });

  test("slide 1: welcome renders with typing animation", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const overlay = page.locator("#onboarding-overlay");
    await expect(overlay).toBeVisible();

    const slide1 = page.locator("#slide-1");
    await expect(slide1).toHaveClass(/active/);
    await expect(page.locator("#onboarding-title")).toContainText("INITIAL_BOOT_SETUP");
  });

  test("slide 2: feature tour has 12 cards", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const nextBtn = page.locator("#ob-btn-next");
    await nextBtn.click(); // slide 1 -> 2

    const slide2 = page.locator("#slide-2");
    await expect(slide2).toHaveClass(/active/);

    const cards = slide2.locator(".ob-feature-card");
    await expect(cards).toHaveCount(12);
  });

  test("slide 3: provider selection and verification flow", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const nextBtn = page.locator("#ob-btn-next");
    await nextBtn.click(); // 1 -> 2
    await nextBtn.click(); // 2 -> 3

    const slide3 = page.locator("#slide-3");
    await expect(slide3).toHaveClass(/active/);

    // Default provider is gemini-key
    const keyInput = page.locator("#ob-gemini-key");
    await expect(keyInput).toBeVisible();

    // Enter a fake key
    await keyInput.fill("AIzaSy-test-key-12345");

    // Click verify
    const verifyBtn = page.locator("#ob-btn-verify");
    await verifyBtn.click();

    // Wait for log to show success
    const log = page.locator("#ob-validation-log");
    await expect(log).toContainText("Success!");

    // Next should now be enabled
    await expect(nextBtn).toBeEnabled();
  });

  test("slide 4: persona and theme selection", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const nextBtn = page.locator("#ob-btn-next");
    await nextBtn.click(); // 1 -> 2
    await nextBtn.click(); // 2 -> 3

    // Skip provider verification for speed
    await page.locator("#ob-btn-skip-setup").click();

    const slide4 = page.locator("#slide-4");
    await expect(slide4).toHaveClass(/active/);

    // Persona cards should be present
    const personaCards = slide4.locator(".onboarding-persona-card");
    await expect(personaCards).toHaveCount(3);

    // Theme cards should be present
    const themeCards = slide4.locator(".onboarding-theme-card");
    await expect(themeCards).toHaveCount(3);
  });

  test("slide 11: diagnostics run and complete", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const nextBtn = page.locator("#ob-btn-next");

    // Explicitly navigate through each slide with validation
    await expect(page.locator("#slide-1")).toHaveClass(/active/);
    await nextBtn.click(); // 1 -> 2
    await expect(page.locator("#slide-2")).toHaveClass(/active/);
    await nextBtn.click(); // 2 -> 3
    await expect(page.locator("#slide-3")).toHaveClass(/active/);
    await page.locator("#ob-btn-skip-setup").click(); // skip provider -> 4
    await expect(page.locator("#slide-4")).toHaveClass(/active/);
    await nextBtn.click(); // 4 -> 5
    await expect(page.locator("#slide-5")).toHaveClass(/active/);
    await nextBtn.click(); // 5 -> 6
    await expect(page.locator("#slide-6")).toHaveClass(/active/);
    await nextBtn.click(); // 6 -> 7
    await expect(page.locator("#slide-7")).toHaveClass(/active/);
    await nextBtn.click(); // 7 -> 8
    await expect(page.locator("#slide-8")).toHaveClass(/active/);
    await nextBtn.click(); // 8 -> 9
    await expect(page.locator("#slide-9")).toHaveClass(/active/);
    await nextBtn.click(); // 9 -> 10
    await expect(page.locator("#slide-10")).toHaveClass(/active/);
    await nextBtn.click(); // 10 -> 11

    const slide11 = page.locator("#slide-11");
    await expect(slide11).toHaveClass(/active/);

    // Wait for diagnostics to complete
    const diagLog = page.locator("#ob-diagnostic-log");
    await expect(diagLog).toContainText("NOMINAL", { timeout: 15000 });

    // All 6 checks should show OK
    const statuses = slide11.locator(".onboarding-diagnostic-status");
    const count = await statuses.count();
    expect(count).toBe(6);
    for (let i = 0; i < count; i++) {
      await expect(statuses.nth(i)).toContainText("OK", { timeout: 15000 });
    }

    // Launch button should be enabled
    await expect(nextBtn).toBeEnabled();
    await expect(nextBtn).toContainText("Launch");
  });

  test("completing onboarding sets localStorage flag", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    const nextBtn = page.locator("#ob-btn-next");

    // Navigate through slides
    await nextBtn.click(); // 1 -> 2
    await nextBtn.click(); // 2 -> 3
    await page.locator("#ob-btn-skip-setup").click(); // skip -> 4
    await nextBtn.click(); // 4 -> 5
    await nextBtn.click(); // 5 -> 6
    await nextBtn.click(); // 6 -> 7
    await nextBtn.click(); // 7 -> 8
    await nextBtn.click(); // 8 -> 9
    await nextBtn.click(); // 9 -> 10
    await nextBtn.click(); // 10 -> 11

    // Wait for diagnostics
    await expect(page.locator("#ob-diagnostic-log")).toContainText("NOMINAL", { timeout: 15000 });

    // Click Launch
    await nextBtn.click();

    // Overlay should disappear
    const overlay = page.locator("#onboarding-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 3000 });

    // Verify localStorage flag
    const completed = await page.evaluate(() =>
      localStorage.getItem("neurodeck_onboarding_complete")
    );
    expect(completed).toBe("true");
  });
});
