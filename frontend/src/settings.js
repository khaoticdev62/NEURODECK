import { state } from "./state.js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  restartTerminalSession,
  renderSshProfilesSettings,
  renderFtpProfilesSettings,
  renderSftpProfilesSettings,
} from "./terminal.js";
import { applyButtonIcon, createIcon } from "./icons.js";
import { addNotification } from "./notifications.js";
import { FocusTrap } from "./focus-trap.js";

function setStatusMarkup(el, icon, text, color) {
  if (!el) return;
  el.style.color = color || "";
  el.innerHTML = `${createIcon(icon, { size: 14 })}<span>${text}</span>`;
}

let settingsOverlay = null;
let settingsBtn = null;
let settingsFocusTrap = null;
let closeSettings = null;
let closeSettingsX = null;

// ==========================================================================
// SETTINGS AND PERSISTENCE IMPLEMENTATION
// ==========================================================================
function applySettings() {
  // 1. Font Style
  const font = localStorage.getItem("selectedFont") || "spacegrotesk";
  const fontSelect = document.getElementById("font-select");
  if (fontSelect) fontSelect.value = font;
  const fontClasses = [
    "font-spacegrotesk",
    "font-syne",
    "font-inter",
    "font-outfit",
    "font-jetbrains",
    "font-vt323",
    "font-sharetech",
    "font-orbitron",
    "font-pressstart",
  ];
  fontClasses.forEach((cls) => document.body.classList.remove(cls));
  document.body.classList.add(`font-${font}`);

  // 2. Custom Background URL & Live backgrounds setup
  const bgUrl = localStorage.getItem("bgUrl") || "";
  const bgUrlInput = document.getElementById("bg-url-input");
  if (bgUrlInput) bgUrlInput.value = bgUrl;

  const bgImgEl = document.getElementById("app-background-image");
  const opacityValStr = localStorage.getItem("bgOpacity");
  const opacity = opacityValStr !== null ? parseInt(opacityValStr, 10) : 10;

  const bgOpacitySlider = document.getElementById("bg-opacity-slider");
  if (bgOpacitySlider) bgOpacitySlider.value = opacity;
  const bgOpacityVal = document.getElementById("bg-opacity-val");
  if (bgOpacityVal) bgOpacityVal.innerText = `${opacity}%`;

  if (bgUrl.startsWith("live:")) {
    const liveType = bgUrl.substring(5);
    if (bgImgEl) {
      bgImgEl.style.backgroundImage = "none";
      bgImgEl.style.opacity = "0";
    }
    if (window.liveBgManager) {
      window.liveBgManager.start(liveType);
    }
  } else {
    if (window.liveBgManager) {
      window.liveBgManager.stop();
    }
    if (bgImgEl) {
      if (bgUrl) {
        bgImgEl.style.backgroundImage = `url('${bgUrl}')`;
        bgImgEl.style.opacity = (opacity / 100).toString();
      } else {
        bgImgEl.style.backgroundImage = "none";
        bgImgEl.style.opacity = "0";
      }
    }
  }

  // Highlight active card in gallery
  document.querySelectorAll(".bg-gallery-card").forEach((c) => {
    const cardId = c.getAttribute("data-id");
    const cardUrl = c.getAttribute("data-url");
    let isActive = false;
    if (bgUrl.startsWith("live:")) {
      const liveType = bgUrl.substring(5);
      isActive =
        cardId === liveType && (cardUrl === null || cardUrl === undefined);
    } else {
      if (!bgUrl) {
        isActive = !cardUrl && !cardId;
      } else {
        isActive = cardUrl === bgUrl;
      }
    }
    if (isActive) {
      c.classList.add("active");
    } else {
      c.classList.remove("active");
    }
  });

  // 3b. Minimize-to-tray toggle — reads from backend config
  invoke("get_config").then((cfg) => {
    const toggle = document.getElementById("minimize-to-tray-toggle");
    if (toggle) toggle.checked = cfg?.prefs?.minimize_to_tray_on_close !== false;
  }).catch(() => {});

  // 4. CRT Scanlines (default to false / disabled for "remove crt animation")
  const scanlinesStr = localStorage.getItem("scanlinesEnabled");
  const scanlines = scanlinesStr === "true"; // default false
  const scanlinesToggle = document.getElementById("scanlines-toggle");
  if (scanlinesToggle) scanlinesToggle.checked = scanlines;
  if (scanlines) {
    document.body.classList.remove("crt-scanlines-disabled");
  } else {
    document.body.classList.add("crt-scanlines-disabled");
  }

  // 5. CRT Flicker (default to false / disabled for "remove crt animation")
  const flickerStr = localStorage.getItem("flickerEnabled");
  const flicker = flickerStr === "true"; // default false
  const flickerToggle = document.getElementById("flicker-toggle");
  if (flickerToggle) flickerToggle.checked = flicker;
  if (flicker) {
    document.body.classList.remove("crt-flicker-disabled");
  } else {
    document.body.classList.add("crt-flicker-disabled");
  }

  // 6. Terminal Shell
  const shell = localStorage.getItem("selectedShell") || "default";
  const shellSelect = document.getElementById("shell-select");
  if (shellSelect) shellSelect.value = shell;

  const customShell = localStorage.getItem("customShell") || "";
  const customShellInput = document.getElementById("custom-shell-input");
  if (customShellInput) customShellInput.value = customShell;

  const customShellGroup = document.getElementById("custom-shell-group");
  if (customShellGroup) {
    customShellGroup.style.display = shell === "custom" ? "block" : "none";
  }

  // 7. Terminal Font Size
  const fontSizeValStr = localStorage.getItem("terminalFontSize");
  const fontSize = fontSizeValStr !== null ? parseInt(fontSizeValStr, 10) : 14;
  const termFontSizeSlider = document.getElementById("term-fontsize-slider");
  if (termFontSizeSlider) termFontSizeSlider.value = fontSize;
  const termFontSizeVal = document.getElementById("term-fontsize-val");
  if (termFontSizeVal) termFontSizeVal.innerText = `${fontSize}px`;
  if (window.ptyTerminal) {
    window.ptyTerminal.options.fontSize = fontSize;
    if (window.ptyTerminalFitAddon) {
      try {
        window.ptyTerminalFitAddon.fit();
      } catch (e) {
        console.warn("Could not refit terminal:", e);
      }
    }
  }

  // 8. Terminal Scrollback Limit
  const scrollbackValStr = localStorage.getItem("terminalScrollback");
  const scrollback =
    scrollbackValStr !== null ? parseInt(scrollbackValStr, 10) : 2000;
  const termScrollbackInput = document.getElementById("term-scrollback-input");
  if (termScrollbackInput) termScrollbackInput.value = scrollback;
  if (window.ptyTerminal) {
    window.ptyTerminal.options.scrollback = scrollback;
  }
}

function handleFontSelect() {
  localStorage.setItem("selectedFont", this.value);
  applySettings();
}

function handleBgUrlInput() {
  localStorage.setItem("bgUrl", this.value);
  applySettings();
}

function handleBgOpacitySlider() {
  localStorage.setItem("bgOpacity", this.value);
  applySettings();
}

function handleScanlinesToggle() {
  localStorage.setItem("scanlinesEnabled", this.checked ? "true" : "false");
  applySettings();
}

function handleFlickerToggle() {
  localStorage.setItem("flickerEnabled", this.checked ? "true" : "false");
  applySettings();
}

function handleShellSelect() {
  localStorage.setItem("selectedShell", this.value);
  applySettings();
}

function toggleSettingsLlmGroups(provider) {
  const geminiGroup = document.getElementById("settings-gemini-group");
  const ollamaGroup = document.getElementById("settings-ollama-group");
  const ollamaLabel = document.getElementById("stv-ollama-label");
  const ollamaModelsSec = document.getElementById(
    "settings-ollama-models-section",
  );
  const kimiGroup = document.getElementById("settings-kimi-group");
  const kimiLabel = document.getElementById("stv-kimi-label");
  const hfGroup = document.getElementById("settings-hf-group");
  const hfLabel = document.getElementById("stv-hf-label");
  const oaGroup = document.getElementById("settings-openai-compat-group");
  const oaLabel = document.getElementById("stv-openai-compat-label");

  // Hide everything first, then show only what belongs to the selected provider
  const allGroups = [geminiGroup, ollamaGroup, kimiGroup, hfGroup, oaGroup];
  const allLabels = [ollamaLabel, kimiLabel, hfLabel, oaLabel];
  allGroups.forEach(g => g && (g.style.display = "none"));
  allLabels.forEach(l => l && (l.style.display = "none"));
  if (ollamaModelsSec) ollamaModelsSec.style.display = "none";

  if (provider === "gemini") {
    if (geminiGroup) geminiGroup.style.display = "block";
  } else if (provider === "openai_compat") {
    if (oaGroup) oaGroup.style.display = "block";
    if (oaLabel) oaLabel.style.display = "block";
  } else if (provider === "kimi") {
    if (kimiGroup) kimiGroup.style.display = "block";
    if (kimiLabel) kimiLabel.style.display = "block";
  } else if (provider === "huggingface") {
    if (hfGroup) hfGroup.style.display = "block";
    if (hfLabel) hfLabel.style.display = "block";
  } else {
    if (geminiGroup) geminiGroup.style.display = "none";
    if (kimiGroup) kimiGroup.style.display = "none";
    if (kimiLabel) kimiLabel.style.display = "none";
    if (ollamaGroup) ollamaGroup.style.display = "block";
    if (ollamaLabel) ollamaLabel.style.display = "block";
    if (ollamaModelsSec) {
      ollamaModelsSec.style.display = "block";
      refreshOllamaModels();
    }
    if (hfGroup) hfGroup.style.display = "none";
    if (hfLabel) hfLabel.style.display = "none";
  }
}

function handleLlmProviderChange() {
  toggleSettingsLlmGroups(this.value);
}

function handleTestConnectionClick() {
  const provider = document.getElementById("llm-provider-select")?.value;
  const geminiKey = document
    .getElementById("settings-gemini-key")
    ?.value.trim();
  const geminiModel = document
    .getElementById("settings-gemini-model")
    ?.value.trim();
  const ollamaUrl = document
    .getElementById("settings-ollama-url")
    ?.value.trim();
  const ollamaModel = document
    .getElementById("settings-ollama-model")
    ?.value.trim();
  const hfKey = document.getElementById("settings-hf-key")?.value.trim();
  const hfModel = document.getElementById("settings-hf-model")?.value.trim();
  const hfUrl = document.getElementById("settings-hf-url")?.value.trim();
  const oaKey = document.getElementById("settings-openai-compat-key")?.value.trim();
  const oaModel = document.getElementById("settings-openai-compat-model")?.value.trim();
  const oaUrl = document.getElementById("settings-openai-compat-url")?.value.trim();

  const statusEl = document.getElementById("settings-llm-status");
  const testBtn = document.getElementById("settings-test-connection-btn");

  if (statusEl) {
    statusEl.style.color = "var(--accent-color)";
    statusEl.innerText = "Connecting & testing...";
  }
  if (testBtn) testBtn.disabled = true;

  let model, url, key;
  if (provider === "gemini") {
    model = geminiModel;
    url = "";
    key = geminiKey;
  } else if (provider === "openai_compat") {
    model = oaModel;
    url = oaUrl;
    key = oaKey;
  } else if (provider === "huggingface") {
    model = hfModel;
    url = hfUrl;
    key = hfKey;
  } else {
    model = ollamaModel;
    url = ollamaUrl;
    key = "";
  }

  invoke("test_llm_connection", { provider, model, url, key })
    .then((res) => {
      if (statusEl) {
        statusEl.style.color = "var(--response-color)";
        statusEl.innerText = res;
      }
    })
    .catch((err) => {
      if (statusEl) {
        statusEl.style.color = "var(--error-color)";
        statusEl.innerText = `Error: ${err}`;
      }
    })
    .finally(() => {
      if (testBtn) testBtn.disabled = false;
    });
}

function handleSaveLlmClick() {
  const provider = document.getElementById("llm-provider-select")?.value;
  const geminiKey = document
    .getElementById("settings-gemini-key")
    ?.value.trim();
  const geminiModel = document
    .getElementById("settings-gemini-model")
    ?.value.trim();
  const ollamaUrl = document
    .getElementById("settings-ollama-url")
    ?.value.trim();
  const ollamaModel = document
    .getElementById("settings-ollama-model")
    ?.value.trim();
  const kimiKey = document.getElementById("settings-kimi-key")?.value.trim();
  const kimiModel = document.getElementById("settings-kimi-model")?.value.trim();
  const kimiUrl = document.getElementById("settings-kimi-url")?.value.trim();
  const hfKey = document.getElementById("settings-hf-key")?.value.trim();
  const hfModel = document.getElementById("settings-hf-model")?.value.trim();
  const hfUrl = document.getElementById("settings-hf-url")?.value.trim();
  const oaKey = document.getElementById("settings-openai-compat-key")?.value.trim();
  const oaModel = document.getElementById("settings-openai-compat-model")?.value.trim();
  const oaUrl = document.getElementById("settings-openai-compat-url")?.value.trim();

  const statusEl = document.getElementById("settings-llm-status");
  if (statusEl) {
    statusEl.style.color = "var(--accent-color)";
    statusEl.innerText = "Applying changes...";
  }

  let saveKeyPromise = Promise.resolve();
  if (provider === "gemini" && geminiKey) {
    saveKeyPromise = invoke("save_gemini_api_key", { key: geminiKey });
  } else if (provider === "openai_compat" && oaKey) {
    saveKeyPromise = invoke("save_openai_compat_api_key", { key: oaKey });
  } else if (provider === "kimi" && kimiKey) {
    saveKeyPromise = invoke("save_kimi_api_key", { key: kimiKey });
  } else if (provider === "huggingface" && hfKey) {
    saveKeyPromise = invoke("save_hf_api_key", { key: hfKey });
  }

  saveKeyPromise
    .then(() =>
      invoke("set_config", { key: "llm.default_provider", value: provider }),
    )
    .then(() =>
      invoke("set_config", { key: "llm.gemini_model", value: geminiModel }),
    )
    .then(() =>
      invoke("set_config", { key: "llm.ollama_base_url", value: ollamaUrl }),
    )
    .then(() =>
      invoke("set_config", { key: "llm.ollama_model", value: ollamaModel }),
    )
    .then(() =>
      invoke("set_config", { key: "llm.kimi_model", value: kimiModel }),
    )
    .then(() =>
      invoke("set_config", {
        key: "llm.kimi_base_url",
        value: kimiUrl || "https://api.moonshot.ai/v1",
      }),
    )
    .then(() => invoke("set_config", { key: "llm.hf_model", value: hfModel }))
    .then(() =>
      invoke("set_config", {
        key: "llm.hf_base_url",
        value: hfUrl || "https://api-inference.huggingface.co",
      }),
    )
    .then(() => invoke("set_config", { key: "llm.openai_compat_model", value: oaModel || "gpt-4o-mini" }))
    .then(() =>
      invoke("set_config", {
        key: "llm.openai_compat_base_url",
        value: oaUrl || "",
      }),
    )
    .then(() => {
      if (statusEl) {
        statusEl.style.color = "var(--response-color)";
        statusEl.innerText = "Config updated and applied!";
      }
      let activeModelName;
      if (provider === "gemini") activeModelName = geminiModel;
      else if (provider === "openai_compat") activeModelName = oaModel || "openai-compat";
      else if (provider === "kimi") activeModelName = kimiModel;
      else if (provider === "huggingface") activeModelName = hfModel;
      else activeModelName = ollamaModel;
      document.getElementById("model-name").innerText =
        `[ MODEL: ${activeModelName.toUpperCase()} ]`;

      if (typeof updateContextDrawer === "function") {
        updateContextDrawer();
      }
    })
    .catch((err) => {
      if (statusEl) {
        statusEl.style.color = "var(--error-color)";
        statusEl.innerText = `Save error: ${err}`;
      }
    });
}

// Shell Switcher (terminal top bar) event handlers registered in initSettings()

// Settings sliders and inputs registered in initSettings()

// Settings Modal Event Listeners registered in initSettings()

// ── Apple TV sidebar nav ──────────────────────────────────────────────
export function activateSettingsPanel(panelId, themeName) {
  const modalCard = document.querySelector(
    "#settings-overlay .settings-modal-card",
  );
  document
    .querySelectorAll(".stv-nav-item")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".settings-panel")
    .forEach((p) => p.classList.remove("active"));

  const fallbackPanelId = "sp-general";
  const requestedButton = document.querySelector(
    `.stv-nav-item[data-panel="${panelId}"]`,
  );
  const requestedPanel = document.getElementById(panelId);
  const resolvedPanelId =
    requestedButton && requestedPanel ? panelId : fallbackPanelId;
  const activeButton = document.querySelector(
    `.stv-nav-item[data-panel="${resolvedPanelId}"]`,
  );
  const activePanel = document.getElementById(resolvedPanelId);
  if (activeButton) activeButton.classList.add("active");
  if (activePanel) activePanel.classList.add("active");

  const resolvedTheme =
    themeName ||
    activeButton?.dataset.settingsTheme ||
    activePanel?.dataset.settingsTheme ||
    "general";
  if (modalCard) {
    modalCard.dataset.settingsTheme = resolvedTheme;
  }
  localStorage.setItem("settingsActivePanel", resolvedPanelId);
}

function initSettingsSidebar() {
  document.querySelectorAll(".stv-nav-item").forEach((btn) => {
    btn.onclick = () => {
      activateSettingsPanel(btn.dataset.panel, btn.dataset.settingsTheme);
    };
  });
}

export function openSettingsModal() {
  if (settingsOverlay) settingsOverlay.classList.add("active");
  const lastPanel = localStorage.getItem("settingsActivePanel") || "sp-general";
  activateSettingsPanel(lastPanel);
  if (!settingsFocusTrap) settingsFocusTrap = new FocusTrap(settingsOverlay);
  settingsFocusTrap.activate();

  // Clear status text
  const statusEl = document.getElementById("settings-llm-status");
  if (statusEl) statusEl.innerText = "";

  // Load active LLM config and API keys
  Promise.all([
    invoke("get_config"),
    invoke("get_gemini_api_key"),
    invoke("get_kimi_api_key"),
    invoke("get_hf_api_key"),
    invoke("get_openai_compat_api_key"),
  ])
    .then(([config, apiKey, kimiApiKey, hfApiKey, oaApiKey]) => {
      const providerSelect = document.getElementById("llm-provider-select");
      const geminiKeyInput = document.getElementById("settings-gemini-key");
      const geminiModelInput = document.getElementById("settings-gemini-model");
      const ollamaUrlInput = document.getElementById("settings-ollama-url");
      const ollamaModelInput = document.getElementById("settings-ollama-model");
      const kimiKeyInput = document.getElementById("settings-kimi-key");
      const kimiModelInput = document.getElementById("settings-kimi-model");
      const kimiUrlInput = document.getElementById("settings-kimi-url");
      const hfKeyInput = document.getElementById("settings-hf-key");
      const hfModelInput = document.getElementById("settings-hf-model");
      const hfUrlInput = document.getElementById("settings-hf-url");
      const oaKeyInput = document.getElementById("settings-openai-compat-key");
      const oaModelInput = document.getElementById("settings-openai-compat-model");
      const oaUrlInput = document.getElementById("settings-openai-compat-url");

      if (providerSelect) providerSelect.value = config.llm.default_provider;
      if (geminiKeyInput) geminiKeyInput.value = apiKey;
      if (geminiModelInput) geminiModelInput.value = config.llm.gemini_model;
      if (ollamaUrlInput) ollamaUrlInput.value = config.llm.ollama_base_url;
      if (ollamaModelInput) ollamaModelInput.value = config.llm.ollama_model;
      if (kimiKeyInput) kimiKeyInput.value = kimiApiKey;
      if (kimiModelInput) kimiModelInput.value = config.llm.kimi_model;
      if (kimiUrlInput) kimiUrlInput.value = config.llm.kimi_base_url;
      if (hfKeyInput) hfKeyInput.value = hfApiKey;
      if (hfModelInput) hfModelInput.value = config.llm.hf_model;
      if (hfUrlInput) hfUrlInput.value = config.llm.hf_base_url;
      if (oaKeyInput) oaKeyInput.value = oaApiKey || "";
      if (oaModelInput) oaModelInput.value = config.llm.openai_compat_model || "";
      if (oaUrlInput) oaUrlInput.value = config.llm.openai_compat_base_url || "";

      toggleSettingsLlmGroups(config.llm.default_provider);
    })
    .catch((err) => {
      console.error("Error loading LLM config in settings:", err);
    });

  // Populate personas
  if (typeof refreshSettingsPersonaDropdown === "function") {
    refreshSettingsPersonaDropdown();
  }

  // Populate themes + live preview
  invoke("get_themes").then((themes) => {
    let select = document.getElementById("theme-select");
    if (select) {
      select.innerHTML = "";
      let savedTheme = localStorage.getItem("selectedTheme");
      themes.forEach((t) => {
        let option = document.createElement("option");
        option.value = t;
        option.innerText = t;
        if (t === savedTheme) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      initThemeLivePreview(select, savedTheme);
    }
  });

  renderSshProfilesSettings();
  renderFtpProfilesSettings();
  renderSftpProfilesSettings();
  if (typeof loadPluginsList === "function") {
    loadPluginsList();
  }
  if (typeof loadCustomPersonas === "function") {
    loadCustomPersonas();
  }
  if (window._customThemes) {
    window._customThemes.renderList();
    window._customThemes.refreshThemeSelect();
  }
  if (window._syncSettings) {
    window._syncSettings.refresh();
  }

  refreshModelsPanel();
}

// --- CUSTOM PERSONA CREATOR SYSTEM ---
function refreshSettingsPersonaDropdown() {
  invoke("get_personas").then((personas) => {
    let select = document.getElementById("persona-select");
    if (!select) return;
    select.innerHTML = "";
    personas.forEach((p) => {
      let option = document.createElement("option");
      option.value = p;
      option.innerText = p;
      if (p === state.activePersona) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });
}

function loadCustomPersonas() {
  const listEl = document.getElementById("settings-personas-list-custom");
  if (!listEl) return;

  listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic;">Loading custom personas...</div>`;

  invoke("list_custom_personas")
    .then((personas) => {
      if (personas.length === 0) {
        listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic; padding: 5px;">No custom personas found.</div>`;
        return;
      }

      listEl.innerHTML = "";
      personas.forEach((p) => {
        const item = document.createElement("div");
        item.className = "ssh-profile-item";
        item.style.cssText =
          "padding: 6px 8px; background: rgba(255,255,255,0.02); border-radius: 4px; border: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px;";

        const info = document.createElement("div");
        info.style.cssText =
          "display: flex; flex-direction: column; gap: 2px; align-items: flex-start; overflow: hidden;";

        const name = document.createElement("span");
        name.style.cssText =
          "font-weight: 500; color: var(--foreground-color);";
        name.textContent = p.name;

        const prompt = document.createElement("span");
        prompt.style.cssText =
          "font-size: 0.7rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;";
        prompt.textContent = p.prompt;
        prompt.title = p.prompt;

        info.appendChild(name);
        info.appendChild(prompt);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "canvas-btn persona-delete-btn";
        deleteBtn.setAttribute("data-name", p.name);
        deleteBtn.style.cssText =
          "padding: 3px 8px; font-size: 0.75rem; border-color: var(--error-color); color: var(--error-color);";
        deleteBtn.title = `Delete ${p.name}`;
        deleteBtn.setAttribute("aria-label", `Delete ${p.name}`);
        deleteBtn.innerHTML = createIcon("trash2", { size: 14 });

        item.appendChild(info);
        item.appendChild(deleteBtn);
        listEl.appendChild(item);
      });

      // Wire delete button listeners
      listEl.querySelectorAll(".persona-delete-btn").forEach((btn) => {
        btn.onclick = () => {
          const name = btn.getAttribute("data-name");
          if (
            confirm(`Are you sure you want to delete custom persona '${name}'?`)
          ) {
            const statusEl = document.getElementById("settings-persona-status");
            if (statusEl) statusEl.innerText = "Deleting custom persona...";

            invoke("delete_custom_persona", { name })
              .then(() => {
                if (statusEl)
                  statusEl.innerText = `Custom persona '${name}' deleted successfully.`;
                loadCustomPersonas();
                refreshSettingsPersonaDropdown();
              })
              .catch((err) => {
                if (statusEl) statusEl.innerText = `Failed to delete: ${err}`;
              });
          }
        };
      });
    })
    .catch((err) => {
      listEl.innerHTML = "";
      const div = document.createElement("div");
      div.style.cssText = "color: var(--error-color); padding: 5px;";
      div.textContent = `Failed to load custom personas: ${err}`;
      listEl.appendChild(div);
    });
}

function initCustomPersonas() {
  const createBtn = document.getElementById("settings-persona-create-btn");
  const nameInput = document.getElementById("settings-persona-name");
  const promptInput = document.getElementById("settings-persona-prompt");
  const statusEl = document.getElementById("settings-persona-status");

  if (createBtn && nameInput && promptInput) {
    createBtn.onclick = () => {
      const name = nameInput.value.trim();
      const prompt = promptInput.value.trim();

      if (!name || !prompt) {
        alert("Please enter a name and system prompt.");
        return;
      }

      if (statusEl) statusEl.innerText = "Creating custom persona...";
      createBtn.disabled = true;

      invoke("add_custom_persona", { name, prompt })
        .then(() => {
          if (statusEl)
            statusEl.innerText = `Persona '${name}' created successfully!`;
          nameInput.value = "";
          promptInput.value = "";
          loadCustomPersonas();
          refreshSettingsPersonaDropdown();
        })
        .catch((err) => {
          if (statusEl) statusEl.innerText = `Failed to create: ${err}`;
        })
        .finally(() => {
          createBtn.disabled = false;
        });
    };
  }
}

// Initialize Custom Personas event handlers (called in initSettings)

// ==========================================================================
// ==========================================================================
// CUSTOM THEMES EDITOR (P22)
// ==========================================================================

function initCustomThemes() {
  const LS_KEY = "neurodeckCustomThemes";

  function loadThemes() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveThemes(themes) {
    localStorage.setItem(LS_KEY, JSON.stringify(themes));
    if (window.__TAURI_INTERNALS__) {
      invoke("save_custom_themes", { data: JSON.stringify(themes) }).catch(
        () => {},
      );
    }
  }

  // Seed from disk if localStorage is empty
  if (window.__TAURI_INTERNALS__) {
    invoke("load_custom_themes")
      .then((raw) => {
        if (raw && raw !== "[]" && !localStorage.getItem(LS_KEY)) {
          localStorage.setItem(LS_KEY, raw);
          refreshThemeSelect();
        }
      })
      .catch(() => {});
  }

  function applyThemeObj(t) {
    applyThemeColors(t);
    localStorage.setItem("selectedTheme", t.name);
    const sel = document.getElementById("theme-select");
    if (sel) sel.value = t.name;
  }

  function renderList() {
    const container = document.getElementById("ct-list");
    if (!container) return;
    const themes = loadThemes();
    if (themes.length === 0) {
      container.innerHTML =
        '<div style="opacity:0.5; font-style:italic;">No custom themes saved yet.</div>';
      return;
    }
    container.innerHTML = "";
    themes.forEach((t, idx) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex; align-items:center; gap:8px; padding:5px 6px; background:rgba(255,255,255,0.03); border-radius:4px;";

      const swatch = document.createElement("div");
      swatch.style.cssText = `width:16px; height:16px; border-radius:3px; background:${t.accent}; border:1px solid rgba(255,255,255,0.15); flex-shrink:0;`;

      const name = document.createElement("span");
      name.style.cssText =
        "flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
      name.textContent = t.name;

      const applyBtn = document.createElement("button");
      applyBtn.textContent = "Apply";
      applyBtn.className = "send-prompt-btn";
      applyBtn.style.cssText =
        "margin:0; height:22px; padding:0 8px; font-size:0.7rem; justify-content:center;";
      applyBtn.onclick = () => {
        applyThemeObj(t);
        if (typeof addNotification === "function") {
          addNotification(
            "Theme Applied",
            `"${t.name}" is now active.`,
            "success",
          );
        }
      };

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "canvas-btn";
      editBtn.style.cssText = "height:22px; padding:0 8px; font-size:0.7rem;";
      editBtn.onclick = () => {
        document.getElementById("ct-name").value = t.name;
        document.getElementById("ct-bg").value = t.background;
        document.getElementById("ct-fg").value = t.foreground;
        document.getElementById("ct-accent").value = t.accent;
        document.getElementById("ct-response").value = t.response;
        document.getElementById("ct-warning").value = t.warning;
        document.getElementById("ct-error").value = t.error;
        updatePreview();
        // Remove the old entry so saving replaces it
        const themes2 = loadThemes();
        themes2.splice(idx, 1);
        saveThemes(themes2);
        renderList();
        refreshThemeSelect();
      };

      const delBtn = document.createElement("button");
      delBtn.className = "canvas-btn";
      delBtn.style.cssText =
        "height:22px; padding:0 6px; font-size:0.7rem; border-color:var(--error-color);";
      delBtn.title = `Delete ${t.name}`;
      delBtn.setAttribute("aria-label", `Delete ${t.name}`);
      delBtn.innerHTML = createIcon("trash2", { size: 14 });
      delBtn.onclick = () => {
        const themes2 = loadThemes();
        themes2.splice(idx, 1);
        saveThemes(themes2);
        renderList();
        refreshThemeSelect();
        if (typeof addNotification === "function") {
          addNotification("Theme Deleted", `"${t.name}" removed.`, "info");
        }
      };

      row.appendChild(swatch);
      row.appendChild(name);
      row.appendChild(applyBtn);
      row.appendChild(editBtn);
      row.appendChild(delBtn);
      container.appendChild(row);
    });
  }

  function refreshThemeSelect() {
    // Rebuild the theme-select to include custom themes alongside hardcoded ones
    invoke("get_themes")
      .then((themes) => {
        const sel = document.getElementById("theme-select");
        if (!sel) return;
        const savedTheme = localStorage.getItem("selectedTheme");
        sel.innerHTML = "";
        // Hardcoded themes group
        const group1 = document.createElement("optgroup");
        group1.label = "Built-in";
        themes.forEach((t) => {
          const opt = document.createElement("option");
          opt.value = t;
          opt.textContent = t;
          if (t === savedTheme) opt.selected = true;
          group1.appendChild(opt);
        });
        sel.appendChild(group1);
        // Custom themes group
        const customThemes = loadThemes();
        if (customThemes.length > 0) {
          const group2 = document.createElement("optgroup");
          group2.label = "Custom";
          customThemes.forEach((t) => {
            const opt = document.createElement("option");
            opt.value = t.name;
            opt.textContent = t.name;
            if (t.name === savedTheme) opt.selected = true;
            group2.appendChild(opt);
          });
          sel.appendChild(group2);
        }
      })
      .catch(() => {});
  }

  const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

  function isValidHex(v) {
    return HEX_RE.test(v.trim());
  }

  function updatePreview() {
    const map = {
      "ct-preview-bg": "ct-bg",
      "ct-preview-accent": "ct-accent",
      "ct-preview-response": "ct-response",
      "ct-preview-warning": "ct-warning",
      "ct-preview-error": "ct-error",
    };
    Object.entries(map).forEach(([previewId, inputId]) => {
      const el = document.getElementById(previewId);
      const inp = document.getElementById(inputId);
      if (!el || !inp) return;
      if (isValidHex(inp.value)) {
        el.style.background = inp.value.trim();
        inp.style.borderColor = "";
      } else {
        inp.style.borderColor = "var(--error-color)";
      }
    });
  }

  // Wire color picker preview
  [
    "ct-bg",
    "ct-fg",
    "ct-accent",
    "ct-response",
    "ct-warning",
    "ct-error",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updatePreview);
  });

  // Save button
  const saveBtn = document.getElementById("ct-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const name = (document.getElementById("ct-name")?.value || "").trim();
      if (!name) {
        const s = document.getElementById("ct-status");
        if (s) {
          s.textContent = "Enter a theme name.";
          setTimeout(() => {
            s.textContent = "";
          }, 2000);
        }
        return;
      }
      const colorFields = [
        "ct-bg",
        "ct-fg",
        "ct-accent",
        "ct-response",
        "ct-warning",
        "ct-error",
      ];
      const invalidField = colorFields.find((id) => {
        const v = document.getElementById(id)?.value;
        return v && !isValidHex(v);
      });
      if (invalidField) {
        const s = document.getElementById("ct-status");
        if (s) {
          s.textContent =
            "Fix invalid hex color values (must be #RGB or #RRGGBB).";
          setTimeout(() => {
            s.textContent = "";
          }, 3000);
        }
        return;
      }
      const theme = {
        name,
        background: document.getElementById("ct-bg")?.value || "#050505",
        foreground: document.getElementById("ct-fg")?.value || "#D9F7FF",
        accent: document.getElementById("ct-accent")?.value || "#00F0FF",
        response: document.getElementById("ct-response")?.value || "#00FF88",
        warning: document.getElementById("ct-warning")?.value || "#FFB000",
        error: document.getElementById("ct-error")?.value || "#FF3C5A",
      };
      const themes = loadThemes().filter((t) => t.name !== name); // replace if exists
      themes.push(theme);
      saveThemes(themes);
      renderList();
      refreshThemeSelect();
      const s = document.getElementById("ct-status");
      if (s) {
        s.textContent = `"${name}" saved!`;
        setTimeout(() => {
          s.textContent = "";
        }, 2500);
      }
      if (typeof addNotification === "function") {
        addNotification(
          "Theme Saved",
          `"${name}" added to custom themes.`,
          "success",
        );
      }
    });
  }

  // Patch theme-select onchange to handle custom themes
  const origOnchange = document.getElementById("theme-select")?.onchange;
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    themeSelect.onchange = function () {
      const val = this.value;
      const custom = loadThemes().find((t) => t.name === val);
      if (custom) {
        applyThemeObj(custom);
        localStorage.setItem("selectedTheme", val);
      } else if (origOnchange) {
        origOnchange.call(this);
      } else {
        invoke("set_theme", { name: val }).then((theme) => {
          if (theme) {
            applyThemeColors(theme);
            localStorage.setItem("selectedTheme", val);
          }
        });
      }
    };
  }

  // Expose helpers for the settings modal open handler
  window._customThemes = { renderList, refreshThemeSelect };

  // Init
  renderList();
  updatePreview();
}

// ==========================================================================
// MCP SERVER SETTINGS
// ==========================================================================

function initMcpSettings() {
  const startBtn = document.getElementById("mcp-start-btn");
  const stopBtn = document.getElementById("mcp-stop-btn");
  const portInput = document.getElementById("mcp-port-input");
  const statusLine = document.getElementById("mcp-status-line");
  const claudeConfig = document.getElementById("mcp-claude-config");
  const configSnippet = document.getElementById("mcp-claude-config-snippet");
  const tokenRow = document.getElementById("mcp-token-row");
  const tokenDisplay = document.getElementById("mcp-token-display");
  const copyTokenBtn = document.getElementById("mcp-copy-token-btn");
  const discoveryEl = document.getElementById("mcp-discovery-url");
  const whitelistEl = document.getElementById("mcp-tool-whitelist");

  if (!startBtn) return;

  // All known tool names with friendly labels
  const TOOL_META = [
    { name: "neurodeck_chat",  label: "neurodeck_chat",  desc: "LLM chat (always safe)" },
    { name: "get_status",      label: "get_status",      desc: "Server info" },
    { name: "memory_add_fact", label: "memory_add_fact", desc: "Add pinned memory fact" },
    { name: "memory_list_all", label: "memory_list_all", desc: "List all memory records" },
    { name: "read_file",       label: "read_file",       desc: "Read file from disk" },
    { name: "write_file",      label: "write_file",      desc: "Write file to disk" },
    { name: "run_shell",       label: "run_shell",       desc: "Shell exec (needs NEURODECK_ENABLE_MCP_EXEC)" },
    { name: "run_code",        label: "run_code",        desc: "Code exec (needs NEURODECK_ENABLE_MCP_EXEC)" },
  ];

  async function loadWhitelistUI() {
    if (!whitelistEl) return;
    let current = [];
    try { current = await invoke("get_mcp_tool_whitelist"); } catch (_) {}
    whitelistEl.innerHTML = "";
    TOOL_META.forEach(({ name, label, desc }) => {
      const checked = current.includes(name);
      const row = document.createElement("label");
      row.className = "mcp-tool-check-row";
      row.title = desc;
      row.innerHTML = `<input type="checkbox" name="${window.escapeHtml(name)}"${checked ? " checked" : ""}> <span class="mcp-tool-check-name">${window.escapeHtml(label)}</span> <span class="mcp-tool-check-desc">${window.escapeHtml(desc)}</span>`;
      row.querySelector("input").addEventListener("change", async () => {
        const enabled = Array.from(whitelistEl.querySelectorAll("input[type=checkbox]"))
          .filter((cb) => cb.checked)
          .map((cb) => cb.name);
        try {
          await invoke("set_mcp_tool_whitelist", { tools: enabled });
        } catch (e) {
          if (typeof window.addNotification === "function") {
            window.addNotification("Whitelist Error", String(e), "error");
          }
        }
      });
      whitelistEl.appendChild(row);
    });
  }

  function setRunningUI(port, token, discovery) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusLine.innerHTML = `<span style="color: var(--response-color);">● Running</span> &nbsp;·&nbsp; <span style="color: var(--accent-color);">http://127.0.0.1:${window.escapeHtml(String(port))}</span>`;
    if (tokenRow) tokenRow.style.display = "";
    if (tokenDisplay && token) tokenDisplay.textContent = token;
    if (discoveryEl && discovery) discoveryEl.textContent = discovery;
    if (claudeConfig) claudeConfig.style.display = "block";
    if (configSnippet) {
      const snippet = {
        mcpServers: {
          neurodeck: {
            url: `http://127.0.0.1:${port}/`,
            ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
          },
        },
      };
      configSnippet.textContent = JSON.stringify(snippet, null, 2);
    }
  }

  function setStoppedUI() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusLine.textContent = "Server is not running.";
    if (tokenRow) tokenRow.style.display = "none";
    if (claudeConfig) claudeConfig.style.display = "none";
  }

  // Copy token button
  if (copyTokenBtn && tokenDisplay) {
    copyTokenBtn.addEventListener("click", () => {
      const tok = tokenDisplay.textContent;
      if (tok) {
        navigator.clipboard.writeText(tok).then(() => {
          copyTokenBtn.textContent = "Copied!";
          setTimeout(() => { copyTokenBtn.textContent = "Copy"; }, 1500);
        }).catch(() => {});
      }
    });
  }

  // Sync UI on settings modal open
  document.getElementById("settings-btn") &&
    document.getElementById("settings-btn").addEventListener("click", async () => {
      try {
        const status = await invoke("get_mcp_status", { execToken: state.execToken });
        if (status.running === "true") {
          portInput.value = status.port || "13337";
          setRunningUI(status.port, status.token, status.discovery);
        } else {
          setStoppedUI();
        }
      } catch (_) {
        setStoppedUI();
      }
      loadWhitelistUI();
    });

  startBtn.addEventListener("click", async () => {
    const port = parseInt(portInput.value, 10) || 13337;
    startBtn.disabled = true;
    statusLine.textContent = "Starting...";
    try {
      const result = await invoke("start_mcp_server", { port, execToken: state.execToken });
      setRunningUI(port, result.token, result.discovery);
      if (typeof window.addNotification === "function") {
        window.addNotification(
          "MCP Server Started",
          `Listening on port ${port}. Copy the config snippet below.`,
          "success",
        );
      }
    } catch (err) {
      statusLine.innerHTML = "";
      const span = document.createElement("span");
      span.style.color = "var(--error-color)";
      span.textContent = `Error: ${err}`;
      statusLine.appendChild(span);
      startBtn.disabled = false;
    }
  });

  stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true;
    try {
      await invoke("stop_mcp_server", { execToken: state.execToken });
      setStoppedUI();
      if (typeof window.addNotification === "function") {
        window.addNotification("MCP Server Stopped", "The MCP server has been shut down.", "info");
      }
    } catch (err) {
      statusLine.innerHTML = "";
      const span = document.createElement("span");
      span.style.color = "var(--error-color)";
      span.textContent = `Error: ${err}`;
      statusLine.appendChild(span);
      stopBtn.disabled = false;
    }
  });

  // Init state on load
  invoke("get_mcp_status", { execToken: state.execToken })
    .then((status) => {
      if (status && status.running === "true") {
        portInput.value = status.port || "13337";
        setRunningUI(status.port, status.token, status.discovery);
      } else {
        setStoppedUI();
      }
    })
    .catch(() => setStoppedUI());

  loadWhitelistUI();
}

// --- PERSONAL KNOWLEDGE BASE (RAG) SETTINGS ---
function initDocRag() {
  const folderInput = document.getElementById("rag-folder-input");
  const indexBtn = document.getElementById("rag-index-btn");
  const clearBtn = document.getElementById("rag-clear-btn");
  const progressContainer = document.getElementById("rag-progress-container");
  const progressLabel = document.getElementById("rag-progress-label");
  const progressPct = document.getElementById("rag-progress-pct");
  const progressBar = document.getElementById("rag-progress-bar");
  const statusLine = document.getElementById("rag-status-line");
  const docCount = document.getElementById("rag-doc-count");

  if (!indexBtn) return;

  // Warn if Ollama is active (embeddings require Gemini)
  const provSel = document.getElementById("llm-provider-select");
  if (provSel && provSel.value === "ollama") {
    if (statusLine)
      statusLine.innerHTML = `<span style="color:var(--warning-color);">⚠️ Document RAG requires Gemini (for embeddings). Switch provider in LLM Settings.</span>`;
    indexBtn.disabled = true;
  }

  // Load current doc count on open
  invoke("get_doc_count")
    .then((count) => {
      if (docCount) docCount.innerText = count || 0;
    })
    .catch(() => {});

  // Listen for progress events
  listen("doc_index_progress", (event) => {
    let data;
    try {
      data =
        typeof event.payload === "string"
          ? JSON.parse(event.payload)
          : event.payload;
    } catch {
      return;
    }

    const { indexed, total, file, done } = data;

    if (progressContainer) progressContainer.style.display = "block";

    if (done) {
      if (progressLabel) progressLabel.innerText = "Complete!";
      if (progressPct) progressPct.innerText = "100%";
      if (progressBar) progressBar.style.width = "100%";
      setTimeout(() => {
        if (progressContainer) progressContainer.style.display = "none";
        if (indexBtn) indexBtn.disabled = false;
        invoke("get_doc_count")
          .then((c) => {
            if (docCount) docCount.innerText = c || 0;
          })
          .catch(() => {});
      }, 1200);
    } else {
      const pct = total > 0 ? Math.round((indexed / total) * 100) : 0;
      if (progressLabel)
        progressLabel.innerText = file
          ? `Indexing: ${file}`
          : `Indexing... (${indexed}/${total})`;
      if (progressPct) progressPct.innerText = `${pct}%`;
      if (progressBar) progressBar.style.width = `${pct}%`;
    }
  }).catch(() => {});

  indexBtn.addEventListener("click", async () => {
    const folder = folderInput ? folderInput.value.trim() : "";
    if (!folder) {
      if (statusLine) {
        statusLine.innerHTML = "";
        const span = document.createElement("span");
        span.style.color = "var(--warning-color)";
        span.textContent = "Enter a folder path to index.";
        statusLine.appendChild(span);
      }
      return;
    }
    indexBtn.disabled = true;
    if (statusLine) {
      statusLine.innerHTML = "";
      const span = document.createElement("span");
      span.style.opacity = "0.7";
      span.textContent = "Starting indexer...";
      statusLine.appendChild(span);
    }
    if (progressContainer) progressContainer.style.display = "block";
    if (progressBar) progressBar.style.width = "0%";
    if (progressPct) progressPct.innerText = "0%";
    if (progressLabel) progressLabel.innerText = "Scanning folder...";

    try {
      const result = await invoke("index_directory", { path: folder });
      const count =
        typeof result === "number"
          ? `Indexed ${result} document${result !== 1 ? "s" : ""}.`
          : result;
      if (statusLine) {
        statusLine.innerHTML = "";
        const span = document.createElement("span");
        span.style.color = "var(--response-color)";
        span.textContent = count;
        statusLine.appendChild(span);
      }
      if (typeof addNotification === "function") {
        addNotification("RAG Index Complete", count, "success");
      }
      invoke("get_doc_count")
        .then((c) => {
          if (docCount) docCount.innerText = c || 0;
        })
        .catch(() => {});
    } catch (err) {
      if (statusLine) {
        statusLine.innerHTML = "";
        const span = document.createElement("span");
        span.style.color = "var(--error-color)";
        span.textContent = `Error: ${err}`;
        statusLine.appendChild(span);
      }
    } finally {
      indexBtn.disabled = false;
    }
  });

  clearBtn.addEventListener("click", async () => {
    try {
      const result = await invoke("clear_doc_index");
      if (statusLine)
        statusLine.innerHTML = `<span style="color: var(--accent-color);">${result}</span>`;
      if (docCount) docCount.innerText = "0";
      if (typeof addNotification === "function") {
        addNotification(
          "RAG Index Cleared",
          "All indexed documents removed from memory.",
          "info",
        );
      }
    } catch (err) {
      if (statusLine)
        statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
    }
  });
}

// ==========================================================================
// WHISPER OFFLINE STT SETTINGS (P17)
// ==========================================================================
function initBmadInstaller() {
  const targetInput = document.getElementById("bmad-target-dir");
  const installBtn = document.getElementById("bmad-install-btn");
  const docsBtn = document.getElementById("bmad-docs-btn");
  const statusLine = document.getElementById("bmad-status-line");
  if (!installBtn) return;

  installBtn.onclick = async () => {
    const dir = targetInput?.value?.trim();
    if (!dir) {
      statusLine.style.color = "var(--error-color)";
      statusLine.textContent = "Error: Enter a target project directory path.";
      return;
    }
    installBtn.disabled = true;
    statusLine.style.color = "var(--accent-color)";
    statusLine.textContent = "Installing BMAD framework files...";
    try {
      const msg = await invoke("install_bmad_to_dir", { targetDir: dir });
      statusLine.style.color = "var(--response-color)";
      setStatusMarkup(statusLine, "shieldCheck", msg, "var(--response-color)");
      addNotification(
        "BMAD Installed",
        `Framework installed to ${dir}`,
        "success",
      );
    } catch (err) {
      statusLine.style.color = "var(--error-color)";
      statusLine.textContent = "Error: " + err;
    } finally {
      installBtn.disabled = false;
    }
  };

  if (docsBtn) {
    docsBtn.onclick = () =>
      invoke("open_external", { url: "https://bmadcode.com/" }).catch(() => {});
  }
}

function initWhisperSettings() {
  const binaryInput = document.getElementById("whisper-binary-input");
  const modelInput = document.getElementById("whisper-model-input");
  const saveBtn = document.getElementById("whisper-save-btn");
  const testBtn = document.getElementById("whisper-test-btn");
  const statusLine = document.getElementById("whisper-status-line");
  const downloadBtn = document.getElementById("whisper-download-btn");
  const modelSelect = document.getElementById("whisper-model-select");
  const dlWrap = document.getElementById("whisper-dl-progress-wrap");
  const dlLabel = document.getElementById("whisper-dl-label");
  const dlPct = document.getElementById("whisper-dl-pct");
  const dlBar = document.getElementById("whisper-dl-bar");

  if (!saveBtn) return;

  // Wire download button
  if (downloadBtn && modelSelect) {
    downloadBtn.addEventListener("click", async () => {
      const model = modelSelect.value;
      downloadBtn.disabled = true;
      if (dlWrap) dlWrap.style.display = "block";
      if (dlLabel) dlLabel.textContent = `Downloading ggml-${model}.bin...`;
      if (dlPct) dlPct.textContent = "0%";
      if (dlBar) dlBar.style.width = "0%";
      if (statusLine)
        statusLine.innerHTML = `<span style="opacity:0.6;">Downloading ${model}...</span>`;

      const unlisten = await listen("whisper_download_progress", (event) => {
        let data;
        try {
          data =
            typeof event.payload === "string"
              ? JSON.parse(event.payload)
              : event.payload;
        } catch {
          return;
        }
        const { done, pct, path, skipped } = data;
        if (dlPct) dlPct.textContent = `${pct || 0}%`;
        if (dlBar) dlBar.style.width = `${pct || 0}%`;
        if (done) {
          unlisten();
          if (dlWrap) dlWrap.style.display = "none";
          downloadBtn.disabled = false;
          if (path) {
            if (modelInput) modelInput.value = path;
            if (statusLine)
              statusLine.innerHTML = `<span style="color:var(--response-color);display:inline-flex;align-items:center;gap:6px;">${createIcon("shieldCheck", { size: 14 })}<span>${skipped ? "Model already exists" : "Downloaded"}: ${path}<br>Click Save Config to activate.</span></span>`;
            if (typeof addNotification === "function") {
              addNotification(
                "Whisper Model Ready",
                `ggml-${model}.bin downloaded.`,
                "success",
              );
            }
          }
        } else {
          if (dlLabel)
            dlLabel.textContent = skipped
              ? "Already downloaded"
              : `Downloading ggml-${model}.bin...`;
        }
      }).catch(() => () => {});

      try {
        await invoke("download_whisper_model", { model });
      } catch (err) {
        unlisten();
        downloadBtn.disabled = false;
        if (dlWrap) dlWrap.style.display = "none";
        if (statusLine)
          statusLine.innerHTML = `<span style="color:var(--error-color);">Download failed: ${err}</span>`;
      }
    });
  }

  // Load current config on modal open
  invoke("get_whisper_status")
    .then((status) => {
      if (status) {
        if (binaryInput) binaryInput.value = status.binary || "";
        if (modelInput) modelInput.value = status.model || "";
        if (status.configured) {
          if (statusLine)
            setStatusMarkup(
              statusLine,
              "shieldCheck",
              "Whisper configured and ready.",
              "var(--response-color)",
            );
        } else if (status.model) {
          if (statusLine)
            setStatusMarkup(
              statusLine,
              "bell",
              "Model file not found at configured path.",
              "var(--warning-color)",
            );
        }
      }
    })
    .catch(() => {});

  saveBtn.addEventListener("click", async () => {
    const binary = binaryInput ? binaryInput.value.trim() : "";
    const model = modelInput ? modelInput.value.trim() : "";
    try {
      await invoke("set_whisper_config", { binary, model });
      const status = await invoke("get_whisper_status");
      if (status.configured) {
        if (statusLine)
          setStatusMarkup(
            statusLine,
            "shieldCheck",
            "Saved. Whisper ready - mic button will use offline STT.",
            "var(--response-color)",
          );
        if (typeof addNotification === "function") {
          addNotification(
            "Whisper STT Configured",
            "Offline transcription is now active.",
            "success",
          );
        }
      } else if (!status.model_exists) {
        if (statusLine)
          statusLine.innerHTML = `<span style="color: var(--warning-color);">Saved, but model file not found at that path.</span>`;
      } else if (!status.binary_found) {
        if (statusLine)
          statusLine.innerHTML = `<span style="color: var(--warning-color);">Saved, but whisper binary not found. Check the path.</span>`;
      } else {
        if (statusLine)
          statusLine.innerHTML = `<span style="opacity: 0.6;">Config saved.</span>`;
      }
    } catch (err) {
      if (statusLine)
        statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
    }
  });

  testBtn.addEventListener("click", async () => {
    if (statusLine)
      statusLine.innerHTML = `<span style="opacity: 0.6;">Transcribing record.wav...</span>`;
    testBtn.disabled = true;
    try {
      const text = await invoke("transcribe_audio_whisper");
      if (statusLine)
        statusLine.innerHTML = `<span style="color: var(--response-color);">Result: "${text}"</span>`;
    } catch (err) {
      if (statusLine)
        statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
    } finally {
      testBtn.disabled = false;
    }
  });

  // TTS mode radio
  const ttsModeGroup = document.getElementById("tts-mode-group");
  if (ttsModeGroup) {
    const saved = localStorage.getItem("neurodeck_tts_mode") || "complete";
    const radio = ttsModeGroup.querySelector(`input[value="${saved}"]`);
    if (radio) radio.checked = true;
    ttsModeGroup.querySelectorAll("input[type=radio]").forEach(r => {
      r.addEventListener("change", () => {
        if (r.checked) localStorage.setItem("neurodeck_tts_mode", r.value);
      });
    });
  }
}

// ==========================================================================

function initSyncSettings() {
  const enabledToggle = document.getElementById("sync-enabled-toggle");
  const memoryToggle = document.getElementById("sync-memory-toggle");
  const sessionsToggle = document.getElementById("sync-sessions-toggle");
  const apiUrlInput = document.getElementById("sync-api-url-input");
  const saveBtn = document.getElementById("sync-save-btn");
  const syncNowBtn = document.getElementById("sync-now-btn");
  const statusLine = document.getElementById("sync-status-line");
  const deviceId = document.getElementById("sync-device-id");
  const lastAt = document.getElementById("sync-last-at");
  const pendingCount = document.getElementById("sync-pending-count");
  const conflictCount = document.getElementById("sync-conflict-count");

  if (!saveBtn) return;

  function setStatus(text, color = "") {
    if (!statusLine) return;
    statusLine.textContent = text;
    statusLine.style.color = color;
  }

  function renderStatus(status) {
    if (!status) return;
    if (enabledToggle) enabledToggle.checked = !!status.enabled;
    if (memoryToggle) memoryToggle.checked = status.sync_memory !== false;
    if (sessionsToggle) sessionsToggle.checked = status.sync_sessions !== false;
    if (apiUrlInput) apiUrlInput.value = status.api_base_url || "";
    if (deviceId) deviceId.textContent = status.device_id || "-";
    if (lastAt)
      lastAt.textContent = status.last_sync_at
        ? new Date(status.last_sync_at).toLocaleString()
        : "Never";
    if (pendingCount)
      pendingCount.textContent = String(status.pending_records || 0);
    if (conflictCount)
      conflictCount.textContent = String(status.conflict_count || 0);
    if (status.last_error) setStatus(status.last_error, "var(--error-color)");
  }

  async function refresh() {
    try {
      renderStatus(await invoke("get_sync_status"));
    } catch (err) {
      setStatus(`Sync status unavailable: ${err}`, "var(--error-color)");
    }
  }

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    setStatus("Saving sync settings...", "var(--accent-color)");
    try {
      const status = await invoke("configure_sync", {
        request: {
          enabled: !!enabledToggle?.checked,
          sync_memory: memoryToggle?.checked !== false,
          sync_sessions: sessionsToggle?.checked !== false,
          api_base_url: apiUrlInput?.value?.trim() || "",
        },
      });
      renderStatus(status);
      setStatus("Sync settings saved.", "var(--response-color)");
    } catch (err) {
      setStatus(`Save failed: ${err}`, "var(--error-color)");
    } finally {
      saveBtn.disabled = false;
    }
  });

  syncNowBtn?.addEventListener("click", async () => {
    syncNowBtn.disabled = true;
    setStatus("Starting encrypted sync...", "var(--accent-color)");
    try {
      const status = await invoke("sync_now");
      renderStatus(status);
      setStatus(
        `Sync complete. Pushed ${status.pushed_records || 0}, pulled ${status.pulled_records || 0}.`,
        "var(--response-color)",
      );
      if (typeof addNotification === "function") {
        addNotification(
          "Cloud Sync Complete",
          `Pushed ${status.pushed_records || 0}, pulled ${status.pulled_records || 0}.`,
          "success",
        );
      }
    } catch (err) {
      setStatus(`Sync failed: ${err}`, "var(--error-color)");
    } finally {
      syncNowBtn.disabled = false;
    }
  });

  listen("sync_progress", (event) => {
    const label = String(event.payload || "");
    if (label) setStatus(`Sync ${label}...`, "var(--accent-color)");
  }).catch(() => {});

  refresh();
  window._syncSettings = { refresh };
}

// ==========================================================================
// LSP SETTINGS
// ==========================================================================

async function initLspSettings() {
  const container = document.getElementById("lsp-settings-container");
  if (!container) return;

  let knownServers = [];
  try {
    knownServers = await invoke("lsp_known_servers");
  } catch (_) {}

  function loadLspConf() {
    try {
      const raw = localStorage.getItem("neurodeck_lsp_config");
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveLspConf(cfg) {
    localStorage.setItem("neurodeck_lsp_config", JSON.stringify(cfg));
  }

  function escLsp(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function render() {
    const cfg = loadLspConf();
    let running = [];
    try {
      running = await invoke("lsp_list");
    } catch (_) {}
    const statusMap = Object.fromEntries(running.map((s) => [s.language, s.status]));

    container.innerHTML = `
      <p class="lsp-settings-hint">
        Language servers run locally and provide real-time completions, hover docs, and diagnostics
        in the IDE tab. Each server must be installed separately. Trigger completions with
        <kbd>Ctrl+Space</kbd>.
      </p>
      <div class="lsp-server-list">
        ${knownServers
          .map((s) => {
            const saved = cfg[s.language] || {};
            const enabled = saved.enabled || false;
            const command = saved.command || s.command;
            const args = (saved.args || s.args).join(" ");
            const status = statusMap[s.language] || "stopped";
            const dotCls = `lsp-dot lsp-dot-${status}`;
            return `
              <div class="lsp-server-row" data-lang="${s.language}">
                <div class="lsp-server-row-header">
                  <label class="lsp-server-toggle">
                    <input type="checkbox" class="lsp-toggle-input" data-lang="${s.language}" ${enabled ? "checked" : ""}>
                    <span class="lsp-server-name">${escLsp(s.label)}</span>
                  </label>
                  <span class="lsp-server-status">
                    <span class="${dotCls}"></span>${status}
                  </span>
                </div>
                <div class="lsp-server-fields" ${enabled ? "" : 'style="display:none"'}>
                  <label class="lsp-field-label">Command
                    <input class="lsp-field-input lsp-cmd-input" data-lang="${s.language}" type="text"
                      value="${escLsp(command)}" placeholder="${escLsp(s.command)}">
                  </label>
                  <label class="lsp-field-label">Args (space-separated)
                    <input class="lsp-field-input lsp-args-input" data-lang="${s.language}" type="text"
                      value="${escLsp(args)}" placeholder="${escLsp(s.args.join(" "))}">
                  </label>
                  <div class="lsp-hint">${escLsp(s.install_hint)}</div>
                  <div class="lsp-server-actions">
                    <button class="lsp-btn lsp-btn-save" data-lang="${s.language}">Save</button>
                    ${
                      status === "stopped" || status === "error"
                        ? `<button class="lsp-btn lsp-btn-start" data-lang="${s.language}">Start</button>`
                        : `<button class="lsp-btn lsp-btn-stop" data-lang="${s.language}">Stop</button>`
                    }
                  </div>
                </div>
              </div>`;
          })
          .join("")}
      </div>`;

    // Toggle field visibility when enabling/disabling.
    container.querySelectorAll(".lsp-toggle-input").forEach((cb) => {
      cb.addEventListener("change", () => {
        const row = container.querySelector(`.lsp-server-row[data-lang="${cb.dataset.lang}"]`);
        const fields = row?.querySelector(".lsp-server-fields");
        if (fields) fields.style.display = cb.checked ? "" : "none";
      });
    });

    // Save config for a server.
    container.querySelectorAll(".lsp-btn-save").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.dataset.lang;
        const row = container.querySelector(`.lsp-server-row[data-lang="${lang}"]`);
        const enabled = row.querySelector(".lsp-toggle-input").checked;
        const cmd = row.querySelector(".lsp-cmd-input").value.trim();
        const argsRaw = row.querySelector(".lsp-args-input").value.trim();
        const args = argsRaw ? argsRaw.split(/\s+/) : [];
        const newCfg = loadLspConf();
        newCfg[lang] = { enabled, command: cmd, args };
        saveLspConf(newCfg);
        addNotification({
          type: "success",
          title: "LSP",
          message: `'${lang}' config saved.`,
        });
      });
    });

    // Start a server.
    container.querySelectorAll(".lsp-btn-start").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lang = btn.dataset.lang;
        const cfg2 = loadLspConf();
        const saved = cfg2[lang] || {};
        const known = knownServers.find((s) => s.language === lang) || {};
        const cmd = saved.command || known.command || lang;
        const args = saved.args || known.args || [];
        try {
          await invoke("lsp_start", { language: lang, command: cmd, args });
          addNotification({ type: "success", title: "LSP", message: `Starting '${lang}'…` });
          setTimeout(render, 1500);
        } catch (e) {
          addNotification({ type: "error", title: "LSP", message: `Failed to start: ${e}` });
        }
      });
    });

    // Stop a server.
    container.querySelectorAll(".lsp-btn-stop").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lang = btn.dataset.lang;
        try {
          await invoke("lsp_stop", { language: lang });
          addNotification({ type: "info", title: "LSP", message: `'${lang}' stopped.` });
          setTimeout(render, 400);
        } catch (e) {
          addNotification({ type: "error", title: "LSP", message: `Stop failed: ${e}` });
        }
      });
    });
  }

  await render();
  window._lspSettingsRefresh = render;
}

// ==========================================================================
// THEME LIVE PREVIEW
// ==========================================================================

function initThemeLivePreview(selectEl, savedThemeName) {
  // Build a small preview row under the select
  const card = selectEl.closest(".stv-card");
  if (!card) return;

  let previewRow = card.querySelector(".theme-live-preview");
  if (!previewRow) {
    previewRow = document.createElement("div");
    previewRow.className = "theme-live-preview";
    previewRow.innerHTML = `
      <span class="theme-live-swatch" id="tlp-accent"></span>
      <span class="theme-live-swatch" id="tlp-bg"></span>
      <span class="theme-live-swatch" id="tlp-response"></span>
      <span class="theme-live-name" id="tlp-name"></span>
      <button class="theme-reset-btn" id="tlp-reset-btn" title="Reset to saved theme">Reset</button>
    `;
    selectEl.parentNode.insertBefore(previewRow, selectEl.nextSibling);
  }

  let _savedTheme = savedThemeName || localStorage.getItem("selectedTheme") || "";

  function updateSwatches(theme) {
    if (!theme) return;
    const accentSwatch = document.getElementById("tlp-accent");
    const bgSwatch = document.getElementById("tlp-bg");
    const respSwatch = document.getElementById("tlp-response");
    const nameEl = document.getElementById("tlp-name");
    if (accentSwatch) accentSwatch.style.background = theme.accent || theme.color || "";
    if (bgSwatch) bgSwatch.style.background = theme.background || "";
    if (respSwatch) respSwatch.style.background = theme.response || "";
    if (nameEl) nameEl.textContent = theme.name || "";
  }

  // Preview on select change (without immediately persisting)
  const origOnchange = selectEl.onchange;
  selectEl.onchange = function () {
    const val = this.value;
    invoke("set_theme", { name: val }).then((theme) => {
      if (theme) {
        window.applyThemeColors(theme);
        updateSwatches(theme);
        // Persist immediately (consistent with existing behaviour)
        localStorage.setItem("selectedTheme", val);
        _savedTheme = val;
      }
    });
  };

  // Load current theme swatches
  invoke("set_theme", { name: _savedTheme }).then((theme) => {
    if (theme) updateSwatches(theme);
  }).catch(() => {});

  // Reset button — revert to last saved theme
  document.getElementById("tlp-reset-btn")?.addEventListener("click", () => {
    if (!_savedTheme) return;
    invoke("set_theme", { name: _savedTheme }).then((theme) => {
      if (theme) {
        window.applyThemeColors(theme);
        updateSwatches(theme);
        selectEl.value = _savedTheme;
      }
    });
  });
}

// ==========================================================================

export {
  applySettings,
  initSettingsSidebar,
  refreshSettingsPersonaDropdown,
  loadCustomPersonas,
  initCustomPersonas,
  initCustomThemes,
  initMcpSettings,
  initDocRag,
  initBmadInstaller,
  initWhisperSettings,
  initSyncSettings,
  toggleSettingsLlmGroups,
};

export function initSettings() {
  if (typeof renderBackgroundGallery === "function") {
    renderBackgroundGallery();
  }
  applySettings();
  initSettingsSidebar();
  activateSettingsPanel(
    localStorage.getItem("settingsActivePanel") || "sp-general",
  );

  // Focus the main input
  const userInput = document.getElementById("user-input");
  if (userInput) userInput.focus();

  // Wire listeners
  const fontSelect = document.getElementById("font-select");
  if (fontSelect) fontSelect.onchange = handleFontSelect;

  const bgUrlInput = document.getElementById("bg-url-input");
  if (bgUrlInput) bgUrlInput.oninput = handleBgUrlInput;

  const bgOpacitySlider = document.getElementById("bg-opacity-slider");
  if (bgOpacitySlider) bgOpacitySlider.oninput = handleBgOpacitySlider;

  const scanlinesToggle = document.getElementById("scanlines-toggle");
  if (scanlinesToggle) scanlinesToggle.onchange = handleScanlinesToggle;

  const flickerToggle = document.getElementById("flicker-toggle");
  if (flickerToggle) flickerToggle.onchange = handleFlickerToggle;

  const trayToggle = document.getElementById("minimize-to-tray-toggle");
  if (trayToggle) {
    trayToggle.onchange = function() {
      invoke("set_config", {
        key: "prefs.minimize_to_tray_on_close",
        value: this.checked ? "true" : "false",
      }).catch((e) => console.error("Failed to save tray preference:", e));
    };
  }

  const shellSelect = document.getElementById("shell-select");
  if (shellSelect) shellSelect.onchange = handleShellSelect;

  document
    .getElementById("llm-provider-select")
    ?.addEventListener("change", handleLlmProviderChange);
  document
    .getElementById("settings-test-connection-btn")
    ?.addEventListener("click", handleTestConnectionClick);
  document
    .getElementById("settings-save-llm-btn")
    ?.addEventListener("click", handleSaveLlmClick);
  applyButtonIcon("#settings-test-connection-btn", {
    icon: "globe",
    label: "Test Connection",
  });
  applyButtonIcon("#settings-save-llm-btn", {
    icon: "shieldCheck",
    label: "Save & Apply",
  });

  initCustomThemes();
  initMcpSettings();
  initDocRag();
  initBmadInstaller();
  initWhisperSettings();
  initSyncSettings();
  initLspSettings();

  // Shell Switcher (terminal top bar)
  document.querySelectorAll(".term-shell-btn").forEach((pill) => {
    pill.onclick = function () {
      const shell = this.getAttribute("data-shell");
      document
        .querySelectorAll(".term-shell-btn")
        .forEach((p) => p.classList.remove("active"));
      this.classList.add("active");
      localStorage.setItem(
        "selectedShell",
        shell === "default" ? "default" : shell,
      );
      // Also sync the settings dropdown
      const shellSelect = document.getElementById("shell-select");
      if (shellSelect) {
        const option = shellSelect.querySelector(`option[value="${shell}"]`);
        if (option) shellSelect.value = shell;
      }
      // Update shell for the active session and restart it
      if (state.activeTerminalSessionId) {
        const session = state.terminalSessions.find(
          (s) => s.id === state.activeTerminalSessionId,
        );
        if (session) {
          session.shell = shell === "default" ? null : shell;
          restartTerminalSession(state.activeTerminalSessionId);
        }
      }
    };
  });

  // Sync shell buttons on load
  const savedShell = localStorage.getItem("selectedShell") || "default";
  const pill = document.querySelector(
    `.term-shell-btn[data-shell="${savedShell}"]`,
  );
  if (pill) {
    document
      .querySelectorAll(".term-shell-btn")
      .forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
  }

  const customShellInput = document.getElementById("custom-shell-input");
  if (customShellInput) {
    customShellInput.oninput = function () {
      localStorage.setItem("customShell", this.value);
      applySettings();
    };
  }

  const termFontSizeSlider = document.getElementById("term-fontsize-slider");
  if (termFontSizeSlider) {
    termFontSizeSlider.oninput = function () {
      localStorage.setItem("terminalFontSize", this.value);
      applySettings();
    };
  }

  const termScrollbackInput = document.getElementById("term-scrollback-input");
  if (termScrollbackInput) {
    termScrollbackInput.oninput = function () {
      localStorage.setItem("terminalScrollback", this.value);
      applySettings();
    };
  }

  // Modal elements
  settingsOverlay = document.getElementById("settings-overlay");
  settingsBtn = document.getElementById("settings-btn");
  closeSettings = document.getElementById("close-settings");
  closeSettingsX = document.getElementById("close-settings-x");

  if (settingsBtn) {
    settingsBtn.onclick = openSettingsModal;
  }

  if (closeSettings) {
    closeSettings.onclick = function () {
      if (settingsOverlay) settingsOverlay.classList.remove("active");
      if (settingsFocusTrap) settingsFocusTrap.deactivate();
    };
  }

  if (closeSettingsX) {
    closeSettingsX.onclick = function () {
      if (settingsOverlay) settingsOverlay.classList.remove("active");
      if (settingsFocusTrap) settingsFocusTrap.deactivate();
    };
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener("click", (event) => {
      if (event.target === settingsOverlay) {
        settingsOverlay.classList.remove("active");
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      settingsOverlay?.classList.contains("active")
    ) {
      settingsOverlay.classList.remove("active");
    }
  });

  initCustomPersonas();
  initModelsPanel();
}

// =============================================================================
// Model Library Panel — HuggingFace Model Downloader
// =============================================================================

function initModelsPanel() {
  // Sub-tab switching
  document.querySelectorAll(".stv-sub-tab[data-models-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.modelsTab;
      if (tabName === "browser") {
        if (settingsOverlay) settingsOverlay.classList.remove("active");
        if (settingsFocusTrap) settingsFocusTrap.deactivate();
        const mainBrowserTab = document.querySelector('.nav-tab[data-view="browser"]');
        if (mainBrowserTab) mainBrowserTab.click();
        if (window.browserNavigateTo) {
          window.browserNavigateTo("https://huggingface.co/models");
        }
        return;
      }

      document
        .querySelectorAll(".stv-sub-tab[data-models-tab]")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".models-tab-panel")
        .forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = document.getElementById(`models-tab-${tabName}`);
      if (panel) panel.classList.add("active");

      if (tabName === "installed") refreshInstalledModels();
      if (tabName === "downloads") refreshDownloadsList();
    });
  });

  // Filter chips
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      applyModelFilter(filter);
    });
  });

  // Search
  const searchBtn = document.getElementById("models-search-btn");
  const searchInput = document.getElementById("models-search-input");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const query = searchInput?.value?.trim() || "";
      if (query) performModelSearch(query);
    });
  }
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim();
        if (query) performModelSearch(query);
      }
    });
  }

  // Download / cancel delegation
  const browseGrid = document.getElementById("models-browse-grid");
  if (browseGrid) {
    browseGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-repo][data-file]");
      if (!btn) return;
      const repo = btn.dataset.repo;
      const file = btn.dataset.file;
      if (!repo || !file) return;
      startModelDownload(repo, file, btn);
    });
  }

  const downloadsList = document.getElementById("models-downloads-list");
  if (downloadsList) {
    downloadsList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (!btn) return;
      const id = btn.dataset.cancel;
      if (id) cancelModelDownload(id);
    });
  }

  const installedList = document.getElementById("models-installed-list");
  if (installedList) {
    installedList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-repo]");
      if (!btn) return;
      const repo = btn.dataset.deleteRepo;
      const file = btn.dataset.deleteFile;
      if (repo && file) deleteInstalledModel(repo, file);
    });
  }

  // ── HuggingFace Model Browser ────────────────────────────────────────
  initHfBrowser();

  // Listen for download progress events
  if (typeof listen === "function") {
    listen("hf_download_progress", (event) => {
      const payload = event.payload;
      updateDownloadProgress(payload);
    }).catch(() => {});
  }
}

function initHfBrowser() {
  const iframe = document.getElementById("hf-browser-iframe");
  const urlInput = document.getElementById("hf-browser-url");
  const backBtn = document.getElementById("hf-browser-back");
  const fwdBtn = document.getElementById("hf-browser-forward");
  const refreshBtn = document.getElementById("hf-browser-refresh");
  const homeBtn = document.getElementById("hf-browser-home");
  const goBtn = document.getElementById("hf-browser-go");
  const downloadBtn = document.getElementById("hf-browser-download");
  const statusEl = document.getElementById("hf-browser-status");

  if (!iframe) return;

  const HOME_URL = "https://huggingface.co/models";

  function navigateTo(url) {
    if (!url.startsWith("http")) url = "https://" + url;
    iframe.src = url;
    if (urlInput) urlInput.value = url;
  }

  backBtn?.addEventListener("click", () => {
    try { iframe.contentWindow.history.back(); } catch (e) { /* cross-origin */ }
  });

  fwdBtn?.addEventListener("click", () => {
    try { iframe.contentWindow.history.forward(); } catch (e) { /* cross-origin */ }
  });

  refreshBtn?.addEventListener("click", () => {
    iframe.src = iframe.src;
  });

  homeBtn?.addEventListener("click", () => {
    navigateTo(HOME_URL);
  });

  goBtn?.addEventListener("click", () => {
    const url = urlInput?.value?.trim() || HOME_URL;
    navigateTo(url);
  });

  if (urlInput) {
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goBtn?.click();
      }
    });
  }

  // Detect model pages and enable download
  iframe.addEventListener("load", () => {
    try {
      const url = iframe.contentWindow?.location?.href || iframe.src;
      if (urlInput) urlInput.value = url;

      // Parse HuggingFace model URL: https://huggingface.co/<org>/<model>
      const match = url.match(/huggingface\.co\/([^\/]+)\/([^\/\?#]+)/);
      if (match && downloadBtn) {
        const org = match[1];
        const model = match[2];
        // Exclude non-model pages (datasets, spaces, etc.)
        if (!["datasets", "spaces", "docs", "blog"].includes(org)) {
          downloadBtn.disabled = false;
          downloadBtn.dataset.repo = `${org}/${model}`;
          if (statusEl) {
            statusEl.innerHTML = `<span>Model detected: <strong>${org}/${model}</strong> — click Download to fetch GGUF files.</span>`;
          }
          return;
        }
      }
      if (downloadBtn) {
        downloadBtn.disabled = true;
        delete downloadBtn.dataset.repo;
      }
      if (statusEl) {
        statusEl.innerHTML = `<span>Navigate to a model page and click Download to fetch GGUF files.</span>`;
      }
    } catch (e) {
      // Cross-origin restrictions may block access
      if (statusEl) {
        statusEl.innerHTML = `<span>Browsing ${escapeHtml(String(iframe.src)).slice(0, 80)}…</span>`;
      }
    }
  });

  downloadBtn?.addEventListener("click", () => {
    const repo = downloadBtn.dataset.repo;
    if (!repo) return;

    // Switch to Browse tab and search for this model
    const browseTab = document.querySelector('.stv-sub-tab[data-models-tab="browse"]');
    if (browseTab) browseTab.click();

    // Trigger search
    const searchInput = document.getElementById("models-search-input");
    if (searchInput) {
      searchInput.value = repo;
      performModelSearch(repo);
    }

    if (statusEl) {
      statusEl.innerHTML = `<span>Switched to Browse tab — search results for <strong>${repo}</strong> loading…</span>`;
    }
  });
}

let _cachedModels = [];
let _currentFilter = "steam-deck";

function refreshModelsPanel() {
  const activePanel = document.querySelector(".settings-panel.active");
  if (!activePanel || activePanel.id !== "sp-models") return;

  if (_currentFilter === "steam-deck") {
    loadSteamDeckModels();
  }
}

function loadSteamDeckModels() {
  const grid = document.getElementById("models-browse-grid");
  if (!grid) return;
  grid.innerHTML =
    '<div class="models-empty-state"><p>Loading Steam Deck compatible models…</p></div>';

  invoke("hf_get_steam_deck_models")
    .then((models) => {
      _cachedModels = models;
      renderModelGrid(models);
    })
    .catch((err) => {
      console.error("Failed to load Steam Deck models:", err);
      if (grid)
        grid.innerHTML = `<div class="models-empty-state"><p>Error loading models: ${escapeHtml(String(err))}</p></div>`;
    });
}

export function performModelSearch(query) {
  const grid = document.getElementById("models-browse-grid");
  if (!grid) return;
  grid.innerHTML = '<div class="models-empty-state"><p>Searching…</p></div>';

  invoke("hf_search_models", { query, limit: 20 })
    .then((models) => {
      _cachedModels = models;
      renderModelGrid(models);
    })
    .catch((err) => {
      console.error("Search failed:", err);
      if (grid)
        grid.innerHTML = `<div class="models-empty-state"><p>Search error: ${escapeHtml(String(err))}</p></div>`;
    });
}

function applyModelFilter(filter) {
  _currentFilter = filter;
  const grid = document.getElementById("models-browse-grid");
  if (!grid) return;

  if (filter === "steam-deck") {
    loadSteamDeckModels();
    return;
  }

  let filtered = _cachedModels;
  if (filter === "1b") {
    filtered = _cachedModels.filter((m) =>
      m.gguf_files.some(
        (f) =>
          f.parameters === "1B" ||
          f.parameters === "1.1B" ||
          f.parameters === "1.5B" ||
          f.parameters === "1.7B",
      ),
    );
  } else if (filter === "3b") {
    filtered = _cachedModels.filter((m) =>
      m.gguf_files.some(
        (f) =>
          f.parameters === "2B" ||
          f.parameters === "3B" ||
          f.parameters === "3.8B",
      ),
    );
  } else if (filter === "7b") {
    filtered = _cachedModels.filter((m) =>
      m.gguf_files.some((f) => f.parameters === "4B" || f.parameters === "7B"),
    );
  } else if (filter === "all") {
    // Show all cached
  }

  if (filtered.length === 0) {
    grid.innerHTML =
      '<div class="models-empty-state"><p>No models match this filter.</p></div>';
    return;
  }
  renderModelGrid(filtered);
}

function renderModelGrid(models) {
  const grid = document.getElementById("models-browse-grid");
  if (!grid) return;

  if (!models || models.length === 0) {
    grid.innerHTML =
      '<div class="models-empty-state"><p>No models found.</p></div>';
    return;
  }

  grid.innerHTML = "";
  models.forEach((model) => {
    const card = document.createElement("div");
    card.className = "model-card";

    const sdBadge = model.steam_deck_compat
      ? '<span class="sd-badge">Steam Deck</span>'
      : "";

    const tagsHtml = (model.tags || [])
      .slice(0, 5)
      .map((t) => `<span class="model-tag">${escapeHtml(t)}</span>`)
      .join("");

    const filesHtml = (model.gguf_files || [])
      .map((f) => {
        const sizeStr = formatBytes(f.size_bytes);
        return `
                <div class="model-file-row">
                    <span class="file-q">${escapeHtml(f.quantization)}</span>
                    <span class="file-size">${sizeStr}</span>
                    <span class="file-params">${escapeHtml(f.parameters)}</span>
                    <button class="stv-btn-primary stv-btn-sm" data-repo="${escapeHtml(model.repo_id)}" data-file="${escapeHtml(f.filename)}">
                        Download
                    </button>
                </div>
            `;
      })
      .join("");

    card.innerHTML = `
            <div class="model-card-header">
                <h4 class="model-name">${escapeHtml(model.name)}</h4>
                ${sdBadge}
            </div>
            <p class="model-author">${escapeHtml(model.author)}</p>
            <p class="model-desc">${escapeHtml(model.description || "")}</p>
            <div class="model-tags">${tagsHtml}</div>
            <div class="model-stats">
                <span>↓ ${formatNumber(model.downloads || 0)}</span>
                <span>♥ ${model.likes || 0}</span>
            </div>
            <div class="model-files">${filesHtml}</div>
        `;
    grid.appendChild(card);
  });
}

function startModelDownload(repoId, filename, btn) {
  btn.disabled = true;
  btn.textContent = "…";

  invoke("hf_download_model", { repoId, filename })
    .then((downloadId) => {
      btn.textContent = "Queued";
      addNotification(`Download started`, `${repoId}/${filename}`, "info");
      // Switch to downloads tab
      const downloadsTab = document.querySelector(
        '.stv-sub-tab[data-models-tab="downloads"]',
      );
      if (downloadsTab) downloadsTab.click();
    })
    .catch((err) => {
      console.error("Download failed:", err);
      btn.disabled = false;
      btn.textContent = "Download";
      addNotification(`Download failed`, String(err), "error");
    });
}

function cancelModelDownload(downloadId) {
  invoke("hf_cancel_download", { downloadId })
    .then(() => {
      refreshDownloadsList();
      addNotification(`Download cancelled`, "", "info");
    })
    .catch((err) => {
      console.error("Cancel failed:", err);
    });
}

function refreshDownloadsList() {
  const list = document.getElementById("models-downloads-list");
  if (!list) return;

  invoke("hf_list_downloads")
    .then((tasks) => {
      if (!tasks || tasks.length === 0) {
        list.innerHTML =
          '<div class="models-empty-state"><p>No active downloads.</p></div>';
        return;
      }
      list.innerHTML = "";
      tasks.forEach((task) => {
        const row = document.createElement("div");
        row.className = "download-row";
        row.dataset.downloadId = task.id;

        const pct =
          task.total_bytes > 0
            ? Math.round((task.bytes_downloaded / task.total_bytes) * 100)
            : 0;
        const speedStr = formatSpeed(task.speed_bps);
        const statusLabel =
          task.status === "Completed"
            ? "Completed"
            : task.status === "Failed"
              ? "Failed"
              : task.status === "Cancelled"
                ? "Cancelled"
                : "Downloading";

        row.innerHTML = `
                    <div class="download-info">
                        <span class="download-name">${escapeHtml(task.repo_id)}/${escapeHtml(task.filename)}</span>
                        <span class="download-size">${formatBytes(task.bytes_downloaded)} / ${formatBytes(task.total_bytes)}</span>
                    </div>
                    <div class="download-progress-bar">
                        <div class="download-progress-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="download-meta">
                        <span class="download-pct">${pct}% · ${statusLabel}</span>
                        <span class="download-speed">${speedStr}</span>
                        ${
                          task.status === "Downloading" ||
                          task.status === "Pending"
                            ? `<button class="stv-btn-ghost stv-btn-sm" data-cancel="${escapeHtml(task.id)}">Cancel</button>`
                            : ""
                        }
                    </div>
                `;
        list.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Failed to list downloads:", err);
    });
}

function updateDownloadProgress(payload) {
  const list = document.getElementById("models-downloads-list");
  if (!list) return;

  // If we're on the downloads tab, update the specific row
  const row = list.querySelector(`[data-download-id="${payload.id}"]`);
  if (row) {
    const pct =
      payload.total_bytes > 0
        ? Math.round((payload.bytes_downloaded / payload.total_bytes) * 100)
        : 0;
    const fill = row.querySelector(".download-progress-fill");
    const pctEl = row.querySelector(".download-pct");
    const speedEl = row.querySelector(".download-speed");
    const sizeEl = row.querySelector(".download-size");

    if (fill) fill.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}% · Downloading`;
    if (speedEl) speedEl.textContent = formatSpeed(payload.speed_bps);
    if (sizeEl)
      sizeEl.textContent = `${formatBytes(payload.bytes_downloaded)} / ${formatBytes(payload.total_bytes)}`;

    if (payload.completed) {
      if (pctEl) pctEl.textContent = "100% · Completed";
      addNotification(
        "Download complete",
        `${payload.repo_id}/${payload.filename}`,
        "success",
      );
    }
  }
}

function refreshInstalledModels() {
  const list = document.getElementById("models-installed-list");
  if (!list) return;

  invoke("hf_list_installed_models")
    .then((models) => {
      if (!models || models.length === 0) {
        list.innerHTML = `
                    <div class="models-empty-state">
                        <p>No models installed yet.</p>
                        <p class="models-empty-hint">Browse the Steam Deck Best tab to find and download models.</p>
                    </div>
                `;
        return;
      }
      list.innerHTML = "";
      models.forEach((m) => {
        const row = document.createElement("div");
        row.className = "installed-model-row";
        row.innerHTML = `
                    <div class="installed-model-info">
                        <span class="installed-model-name">${escapeHtml(m.repo_id)}/${escapeHtml(m.filename)}</span>
                        <span class="installed-model-meta">${escapeHtml(m.quantization)} · ${formatBytes(m.size_bytes)}</span>
                    </div>
                    <div class="installed-model-actions">
                        <button class="stv-btn-ghost stv-btn-sm" data-delete-repo="${escapeHtml(m.repo_id)}" data-delete-file="${escapeHtml(m.filename)}">Delete</button>
                    </div>
                `;
        list.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Failed to list installed models:", err);
    });
}

function deleteInstalledModel(repoId, filename) {
  invoke("hf_delete_model", { repoId, filename })
    .then(() => {
      refreshInstalledModels();
      addNotification("Model deleted", `${repoId}/${filename}`, "info");
    })
    .catch((err) => {
      console.error("Delete failed:", err);
      addNotification("Delete failed", String(err), "error");
    });
}

// Helper utilities
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatSpeed(bps) {
  return formatBytes(bps) + "/s";
}

function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
}
