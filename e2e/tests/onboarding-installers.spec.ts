import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard Dependency Installers", () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock implementations for diagnostics and dependency installer
    await page.addInitScript(() => {
      const listeners = new Map<string, ((payload: any) => void)[]>();
      let isInstalled = { ssh: false, tts: false, ollama: false, openvpn: false, wireguard: false };

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
              game_running: "false",
            };
          case "get_config":
            return {
              llm: { default_provider: "gemini" }
            };
          case "get_gemini_api_key":
            return ""; // Trigger onboarding
          case "get_system_health":
            return {
              status: "Healthy",
              provider: "gemini",
              model: "gemini-1.5-flash",
              memory_doc_count: 0,
              plugin_count: 0
            };
          case "get_terminal_environment":
            return {
              environment: {
                platform: "win32",
                arch: "x64",
                steamDeckHost: false,
                cwd: "",
                shell: "",
                probes: [],
                missingTools: [],
                readyProfiles: [],
                warnings: []
              }
            };
          case "pty_spawn":
          case "pty_kill":
            return { success: true };
          case "list_plugins":
            return { plugins: [], count: 0 };
          case "validate_plugin":
            return { file_name: args?.file_name ?? "", passed: true, warnings: [], errors: [] };
          case "run_onboarding_diagnostics":
            return {
              pty_ok: true,
              pty_details: "Shell Subsystem active",
              network_ok: true,
              network_details: "Connected",
              keychain_ok: true,
              keychain_details: "Active",
              audio_ok: true,
              audio_details: "Detected",
              ssh_ok: isInstalled.ssh,
              ssh_details: isInstalled.ssh ? "OpenSSH ready" : "Missing",
              tts_ok: isInstalled.tts,
              tts_details: isInstalled.tts ? "TTS ready" : "Missing",
            };
          default:
            return null;
        }
      };

      // Mock window.neurodeck interface exposed by preload
      (window as any).neurodeck = {
        dependency: {
          getStatus: async () => ({
            payload: { ssh: isInstalled.ssh, tts: isInstalled.tts, ollama: isInstalled.ollama, openvpn: isInstalled.openvpn, wireguard: isInstalled.wireguard }
          }),
          install: async (req: any) => {
            const id = req.payload?.id;
            // Simulate async download progress ticks
            setTimeout(() => {
              const progressCbs = listeners.get("dependency:progress") || [];
              
              // Tick 1: 50%
              progressCbs.forEach(cb => cb({
                id,
                state: "downloading",
                percent: 50,
                speed: 1024 * 1024 * 5 // 5 MB/s
              }));

              // Tick 2: Completed
              setTimeout(() => {
                isInstalled[id as keyof typeof isInstalled] = true;
                progressCbs.forEach(cb => cb({
                  id,
                  state: "completed"
                }));
              }, 150);
            }, 50);

            return { payload: { success: true } };
          },
          cancel: async (req: any) => {
            return { payload: true };
          },
          onProgress: (callback: any) => {
            const list = listeners.get("dependency:progress") || [];
            list.push(callback);
            listeners.set("dependency:progress", list);
            return () => {
              const updated = (listeners.get("dependency:progress") || []).filter(c => c !== callback);
              listeners.set("dependency:progress", updated);
            };
          }
        },
        diagnostics: {
          get: () => invoke("get_initial_state"),
        },
        settings: {
          get: (req: any) => {
            if (req.payload?.key === "themeSettings") return { payload: null };
            return invoke("get_config");
          }
        }
      };

      // Intercept bridgeInvoke HTTP calls
      const _originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : (input as any).url;
        if (url.includes("/api/")) {
          const match = url.match(/\/api\/([^?#/]+)/);
          const cmd = match?.[1];
          if (cmd) {
            try {
              let args = {};
              if (init?.body) {
                try { args = JSON.parse(init.body as string); } catch {}
              }
              const result = await invoke(cmd, args);
              return new Response(JSON.stringify(result), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            } catch (error) {
              return new Response(String(error), { status: 500 });
            }
          }
        }
        return _originalFetch(input, init);
      };

      // Polyfill bridge invoke and listener APIs
      (window as any).__TAURI__ = {
        core: { invoke },
        event: {
          listen: async (event: string, callback: any) => {
            const list = listeners.get(event) || [];
            list.push(callback);
            listeners.set(event, list);
            return () => {};
          }
        }
      };
    });
  });

  test("Step 2 displays Install Subsystem button and handles progress state to success", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot-overlay").waitFor({ state: "detached", timeout: 12000 }).catch(() => {});

    // Ensure onboarding modal is visible
    const overlay = page.locator("#onboarding-overlay");
    await expect(overlay).toBeVisible();

    // Welcome -> Step 2 (Environment)
    const nextBtn = page.getByRole("button", { name: /Next/i });
    await nextBtn.click();

    // Verify Environment slide is active by checking its header text
    await expect(page.getByRole("heading", { name: "Environment Integrity Check" })).toBeVisible();

    // Verify "Install Subsystem" buttons are shown for missing dependencies (SSH, TTS, Ollama, OpenVPN, WireGuard)
    const installButtons = page.getByRole("button", { name: "Install Subsystem" });
    await expect(installButtons).toHaveCount(5);

    // Trigger installation on SSH
    await installButtons.first().click();

    // Verify progress UI updates
    const progressContainer = page.locator('span:has-text("downloading...")').first();
    await expect(progressContainer).toBeVisible();

    // Wait for mock install completion to execute and verify status switches to Ready/Detected
    const successStatus = page.locator('span:has-text("Detected")');
    await expect(successStatus.first()).toBeVisible({ timeout: 5000 });
  });
});
