import { state } from "./state.js";
import { invoke } from "./neurobridge.js";
import { listen } from "./neurobridge.js";
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
let tsFocusTrap = null;
let closeSettings = null;
let closeSettingsX = null;

// ==========================================================================
// SETTINGS AND PERSISTENCE IMPLEMENTATION
// ==========================================================================
function _applyFontSettings() {
  const font = localStorage.getItem("selectedFont") || "spacegrotesk";
  const fontSelect = document.getElementById("font-select");
  if (fontSelect) fontSelect.value = font;
  [
    "font-spacegrotesk",
    "font-syne",
    "font-inter",
    "font-outfit",
    "font-jetbrains",
    "font-vt323",
    "font-sharetech",
    "font-orbitron",
    "font-pressstart",
  ].forEach((cls) => document.body.classList.remove(cls));
  document.body.classList.add(`font-${font}`);
}

function _applyBgGallery(bgUrl) {
  document.querySelectorAll(".bg-gallery-card").forEach((c) => {
    const cardId = c.getAttribute("data-id");
    const cardUrl = c.getAttribute("data-url");
    let isActive = false;
    if (bgUrl.startsWith("live:")) {
      const liveType = bgUrl.substring(5);
      isActive = cardId === liveType && (cardUrl === null || cardUrl === undefined);
    } else {
      isActive = !bgUrl ? !cardUrl && !cardId : cardUrl === bgUrl;
    }
    c.classList.toggle("active", isActive);
  });
}

function _applyBgSettings() {
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
    if (bgImgEl) {
      bgImgEl.style.backgroundImage = "none";
      bgImgEl.style.opacity = "0";
    }
    if (window.liveBgManager) window.liveBgManager.start(bgUrl.substring(5));
  } else {
    if (window.liveBgManager) window.liveBgManager.stop();
    if (bgImgEl) {
      bgImgEl.style.backgroundImage = bgUrl ? `url('${bgUrl}')` : "none";
      bgImgEl.style.opacity = bgUrl ? (opacity / 100).toString() : "0";
    }
  }
  _applyBgGallery(bgUrl);
}

function _applyCrtSettings() {
  invoke("get_config")
    .then((cfg) => {
      const toggle = document.getElementById("minimize-to-tray-toggle");
      if (toggle) {
        toggle.checked = cfg?.prefs?.minimize_to_tray_on_close !== false;
        toggle.setAttribute("aria-checked", toggle.checked ? "true" : "false");
      }
    })
    .catch(() => {});
  const scanlines = localStorage.getItem("scanlinesEnabled") === "true";
  const scanlinesToggle = document.getElementById("scanlines-toggle");
  if (scanlinesToggle) {
    scanlinesToggle.checked = scanlines;
    scanlinesToggle.setAttribute("aria-checked", scanlines ? "true" : "false");
  }
  document.body.classList.toggle("crt-scanlines-disabled", !scanlines);
  const flicker = localStorage.getItem("flickerEnabled") === "true";
  const flickerToggle = document.getElementById("flicker-toggle");
  if (flickerToggle) {
    flickerToggle.checked = flicker;
    flickerToggle.setAttribute("aria-checked", flicker ? "true" : "false");
  }
  document.body.classList.toggle("crt-flicker-disabled", !flicker);
}

function _applyTerminalSettings() {
  const shell = localStorage.getItem("selectedShell") || "default";
  const shellSelect = document.getElementById("shell-select");
  if (shellSelect) shellSelect.value = shell;
  const customShell = localStorage.getItem("customShell") || "";
  const customShellInput = document.getElementById("custom-shell-input");
  if (customShellInput) customShellInput.value = customShell;
  const customShellGroup = document.getElementById("custom-shell-group");
  if (customShellGroup) customShellGroup.style.display = shell === "custom" ? "block" : "none";
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
    const scrollbackValStr = localStorage.getItem("terminalScrollback");
    const scrollback = scrollbackValStr !== null ? parseInt(scrollbackValStr, 10) : 2000;
    const termScrollbackInput = document.getElementById("term-scrollback-input");
    if (termScrollbackInput) termScrollbackInput.value = scrollback;
    window.ptyTerminal.options.scrollback = scrollback;
  } else {
    const scrollbackValStr = localStorage.getItem("terminalScrollback");
    const scrollback = scrollbackValStr !== null ? parseInt(scrollbackValStr, 10) : 2000;
    const termScrollbackInput = document.getElementById("term-scrollback-input");
    if (termScrollbackInput) termScrollbackInput.value = scrollback;
  }
}

function applySettings() {
  _applyFontSettings();
  _applyBgSettings();
  _applyCrtSettings();
  _applyTerminalSettings();
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

function _syncToggleAria(el) {
  if (!el) return;
  el.setAttribute("aria-checked", el.checked ? "true" : "false");
  const label =
    el.closest(".stv-toggle-row")?.querySelector(".stv-toggle-label")?.textContent || "Setting";
  const announcer = document.getElementById("sr-announcer");
  if (announcer) {
    announcer.textContent = "";
    requestAnimationFrame(() => {
      announcer.textContent = `${label}: ${el.checked ? "on" : "off"}`;
    });
  }
}

function handleScanlinesToggle() {
  localStorage.setItem("scanlinesEnabled", this.checked ? "true" : "false");
  _syncToggleAria(this);
  applySettings();
}

function handleFlickerToggle() {
  localStorage.setItem("flickerEnabled", this.checked ? "true" : "false");
  _syncToggleAria(this);
  applySettings();
}

function handleShellSelect() {
  localStorage.setItem("selectedShell", this.value);
  applySettings();
}

const _LLM_GROUP_VISIBILITY = {
  gemini: { groups: ["settings-gemini-group"], labels: [] },
  openai_compat: { groups: ["settings-openai-compat-group"], labels: ["stv-openai-compat-label"] },
  kimi: { groups: ["settings-kimi-group"], labels: ["stv-kimi-label"] },
  huggingface: { groups: ["settings-hf-group"], labels: ["stv-hf-label"] },
};
const _LLM_ALL_GROUP_IDS = [
  "settings-gemini-group",
  "settings-ollama-group",
  "settings-kimi-group",
  "settings-hf-group",
  "settings-openai-compat-group",
];
const _LLM_ALL_LABEL_IDS = [
  "stv-ollama-label",
  "stv-kimi-label",
  "stv-hf-label",
  "stv-openai-compat-label",
];

function _llmHideAll() {
  _LLM_ALL_GROUP_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  _LLM_ALL_LABEL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const ollamaModelsSec = document.getElementById("settings-ollama-models-section");
  if (ollamaModelsSec) ollamaModelsSec.style.display = "none";
}

function _llmShowOllama() {
  const ollamaGroup = document.getElementById("settings-ollama-group");
  const ollamaLabel = document.getElementById("stv-ollama-label");
  const ollamaModelsSec = document.getElementById("settings-ollama-models-section");
  if (ollamaGroup) ollamaGroup.style.display = "block";
  if (ollamaLabel) ollamaLabel.style.display = "block";
  if (ollamaModelsSec) {
    ollamaModelsSec.style.display = "block";
    refreshOllamaModels();
  }
}

function toggleSettingsLlmGroups(provider) {
  _llmHideAll();
  const config = _LLM_GROUP_VISIBILITY[provider];
  if (config) {
    config.groups.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "block";
    });
    config.labels.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "block";
    });
  } else {
    _llmShowOllama();
  }
}

function handleLlmProviderChange() {
  toggleSettingsLlmGroups(this.value);
}

function getLlmSettingsFromDom() {
  return {
    provider: document.getElementById("llm-provider-select")?.value,
    geminiKey: document.getElementById("settings-gemini-key")?.value.trim(),
    geminiModel: document.getElementById("settings-gemini-model")?.value.trim(),
    ollamaUrl: document.getElementById("settings-ollama-url")?.value.trim(),
    ollamaModel: document.getElementById("settings-ollama-model")?.value.trim(),
    kimiKey: document.getElementById("settings-kimi-key")?.value.trim(),
    kimiModel: document.getElementById("settings-kimi-model")?.value.trim(),
    kimiUrl: document.getElementById("settings-kimi-url")?.value.trim(),
    hfKey: document.getElementById("settings-hf-key")?.value.trim(),
    hfModel: document.getElementById("settings-hf-model")?.value.trim(),
    hfUrl: document.getElementById("settings-hf-url")?.value.trim(),
    oaKey: document.getElementById("settings-openai-compat-key")?.value.trim(),
    oaModel: document.getElementById("settings-openai-compat-model")?.value.trim(),
    oaUrl: document.getElementById("settings-openai-compat-url")?.value.trim(),
  };
}

function handleTestConnectionClick() {
  const {
    provider,
    geminiKey,
    geminiModel,
    ollamaUrl,
    ollamaModel,
    hfKey,
    hfModel,
    hfUrl,
    oaKey,
    oaModel,
    oaUrl,
  } = getLlmSettingsFromDom();

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

function _saveLlmChainConfigs(s) {
  return invoke("set_config", { key: "llm.default_provider", value: s.provider })
    .then(() => invoke("set_config", { key: "llm.gemini_model", value: s.geminiModel }))
    .then(() => invoke("set_config", { key: "llm.ollama_base_url", value: s.ollamaUrl }))
    .then(() => invoke("set_config", { key: "llm.ollama_model", value: s.ollamaModel }))
    .then(() => invoke("set_config", { key: "llm.kimi_model", value: s.kimiModel }))
    .then(() =>
      invoke("set_config", {
        key: "llm.kimi_base_url",
        value: s.kimiUrl || "https://api.moonshot.ai/v1",
      })
    )
    .then(() => invoke("set_config", { key: "llm.hf_model", value: s.hfModel }))
    .then(() =>
      invoke("set_config", {
        key: "llm.hf_base_url",
        value: s.hfUrl || "https://api-inference.huggingface.co",
      })
    )
    .then(() =>
      invoke("set_config", { key: "llm.openai_compat_model", value: s.oaModel || "gpt-4o-mini" })
    )
    .then(() =>
      invoke("set_config", {
        key: "llm.openai_compat_base_url",
        value: s.oaUrl || "https://api.groq.com/openai/v1",
      })
    )
    .then(() => {
      const pToggle = document.getElementById("privacy-workspace-toggle");
      const pPath = document.getElementById("privacy-workspace-path");
      const promises = [];
      if (pToggle)
        promises.push(
          invoke("set_config", {
            key: "security.agent_workspace_only",
            value: pToggle.checked.toString(),
          })
        );
      if (pPath)
        promises.push(
          invoke("set_config", {
            key: "security.agent_workspace_path",
            value: pPath.value.toString(),
          })
        );
      return Promise.all(promises);
    });
}

function _llmSaveSuccess(statusEl, s) {
  if (statusEl) {
    statusEl.style.color = "var(--response-color)";
    statusEl.innerText = "Config updated and applied!";
  }
  let activeModelName;
  if (s.provider === "gemini") activeModelName = s.geminiModel;
  else if (s.provider === "openai_compat") activeModelName = s.oaModel || "openai-compat";
  else if (s.provider === "kimi") activeModelName = s.kimiModel;
  else if (s.provider === "huggingface") activeModelName = s.hfModel;
  else activeModelName = s.ollamaModel;
  document.getElementById("model-name").innerText = `[ MODEL: ${activeModelName.toUpperCase()} ]`;
  if (typeof updateContextDrawer === "function") updateContextDrawer();
}

function handleSaveLlmClick() {
  const s = getLlmSettingsFromDom();
  const statusEl = document.getElementById("settings-llm-status");
  if (statusEl) {
    statusEl.style.color = "var(--accent-color)";
    statusEl.innerText = "Applying changes...";
  }
  let saveKeyPromise = Promise.resolve();
  if (s.provider === "gemini" && s.geminiKey)
    saveKeyPromise = invoke("save_gemini_api_key", { key: s.geminiKey });
  else if (s.provider === "openai_compat" && s.oaKey)
    saveKeyPromise = invoke("save_openai_compat_api_key", { key: s.oaKey });
  else if (s.provider === "kimi" && s.kimiKey)
    saveKeyPromise = invoke("save_kimi_api_key", { key: s.kimiKey });
  else if (s.provider === "huggingface" && s.hfKey)
    saveKeyPromise = invoke("save_hf_api_key", { key: s.hfKey });
  saveKeyPromise
    .then(() => _saveLlmChainConfigs(s))
    .then(() => _llmSaveSuccess(statusEl, s))
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
  const modalCard = document.querySelector("#settings-overlay .settings-modal-card");
  document.querySelectorAll(".stv-nav-item").forEach((b) => {
    b.classList.remove("active");
    b.removeAttribute("aria-selected");
  });
  document.querySelectorAll(".settings-panel").forEach((p) => {
    p.classList.remove("active");
    p.toggleAttribute("hidden", true);
    p.toggleAttribute("inert", true);
  });

  const fallbackPanelId = "sp-general";
  const requestedButton = document.querySelector(`.stv-nav-item[data-panel="${panelId}"]`);
  const requestedPanel = document.getElementById(panelId);
  const resolvedPanelId = requestedButton && requestedPanel ? panelId : fallbackPanelId;
  const activeButton = document.querySelector(`.stv-nav-item[data-panel="${resolvedPanelId}"]`);
  const activePanel = document.getElementById(resolvedPanelId);
  if (activeButton) {
    activeButton.classList.add("active");
    activeButton.removeAttribute("aria-selected");
  }
  if (activePanel) {
    activePanel.classList.add("active");
    activePanel.toggleAttribute("hidden", false);
    activePanel.toggleAttribute("inert", false);
  }

  const resolvedTheme =
    themeName ||
    activeButton?.dataset.settingsTheme ||
    activePanel?.dataset.settingsTheme ||
    "general";
  if (modalCard) {
    modalCard.dataset.settingsTheme = resolvedTheme;
  }
  localStorage.setItem("settingsActivePanel", resolvedPanelId);
  if (resolvedPanelId === "sp-models") refreshModelsPanel();
}

function initSettingsSidebar() {
  document.querySelectorAll(".stv-nav-item").forEach((btn) => {
    btn.onclick = () => {
      activateSettingsPanel(btn.dataset.panel, btn.dataset.settingsTheme);
    };
  });
}

export function showTrustSafetyModal() {
  const tsModal = document.getElementById("trust-safety-modal");
  if (!tsModal) return;
  tsModal.classList.remove("hidden");
  _tsLoadStats();
  if (!tsFocusTrap) tsFocusTrap = new FocusTrap(tsModal);
  tsFocusTrap.activate();
}

async function _tsLoadStats() {
  const providerBadge = document.getElementById("ts-provider-badge");
  const providerDesc = document.getElementById("ts-provider-desc");
  const cloudItem = document.getElementById("ts-cloud-item");
  try {
    const stats = await invoke("get_dashboard_stats");
    if (providerBadge)
      providerBadge.textContent = `${stats.provider || "—"} / ${stats.model || "—"}`;
    if (providerDesc) {
      const isLocal = stats.provider === "ollama";
      providerDesc.textContent = isLocal
        ? "All inference runs locally. No data leaves this device."
        : "Prompts are sent to the cloud provider. Memory and history stay local.";
    }
    if (cloudItem) {
      cloudItem.textContent = stats.provider === "ollama" ? "No cloud calls" : "LLM inference only";
    }
    const pb = stats.privacy_breakdown || {};
    const els = {
      standard: document.getElementById("ts-privacy-standard"),
      private: document.getElementById("ts-privacy-private"),
      sensitive: document.getElementById("ts-privacy-sensitive"),
      sealed: document.getElementById("ts-privacy-sealed"),
    };
    if (els.standard) els.standard.textContent = String(pb.standard ?? 0);
    if (els.private) els.private.textContent = String(pb.private ?? 0);
    if (els.sensitive) els.sensitive.textContent = String(pb.sensitive ?? 0);
    if (els.sealed) els.sealed.textContent = String(pb.sealed ?? 0);
    const statusEl = document.getElementById("ts-sealed-status");
    if (statusEl) statusEl.textContent = `${pb.sealed || 0} sealed records in memory.`;
  } catch (e) {
    console.error("Trust modal stats load failed", e);
  }
}

function _populateLlmConfig([config, apiKey, kimiApiKey, hfApiKey, oaApiKey]) {
  const $ = (id) => document.getElementById(id);
  const set = (id, val) => {
    const el = $(id);
    if (el) el.value = val;
  };
  set("llm-provider-select", config.llm.default_provider);
  set("settings-gemini-key", apiKey);
  set("settings-gemini-model", config.llm.gemini_model);
  set("settings-ollama-url", config.llm.ollama_base_url);
  set("settings-ollama-model", config.llm.ollama_model);
  set("settings-kimi-key", kimiApiKey);
  set("settings-kimi-model", config.llm.kimi_model);
  set("settings-kimi-url", config.llm.kimi_base_url);
  set("settings-hf-key", hfApiKey);
  set("settings-hf-model", config.llm.hf_model);
  set("settings-hf-url", config.llm.hf_base_url);
  set("settings-openai-compat-key", oaApiKey || "");
  set("settings-openai-compat-model", config.llm.openai_compat_model || "");
  set("settings-openai-compat-url", config.llm.openai_compat_base_url || "");
  const privacyToggle = $("privacy-workspace-toggle");
  const privacyPath = $("privacy-workspace-path");
  if (privacyToggle) {
    privacyToggle.checked = config.security?.agent_workspace_only || false;
    privacyToggle.setAttribute("aria-checked", privacyToggle.checked ? "true" : "false");
  }
  if (privacyPath)
    privacyPath.value = config.security?.agent_workspace_path || "~/.neurodeck_workspace";
  toggleSettingsLlmGroups(config.llm.default_provider);
}

let _stSettingsThemeCache = null;

function _themeApplyPreview(tc) {
  const el = document.getElementById("theme-preview-overlay");
  if (!el) return;
  el.style.setProperty("--preview-bg", tc.Background || tc.background || "#050505");
  el.style.setProperty("--preview-fg", tc.Foreground || tc.foreground || "#D9F7FF");
  el.style.setProperty("--preview-accent", tc.Accent || tc.accent || "#00F0FF");
  el.style.setProperty("--preview-response", tc.Response || tc.response || "#00FF88");
  el.style.setProperty("--preview-warning", tc.Warning || tc.warning || "#FFB000");
  el.style.setProperty("--preview-error", tc.Error || tc.error || "#FF3C5A");
}

function _themeWireCardHover(card, cardData, allCards, tCtx) {
  card.addEventListener("mouseenter", () => _themeApplyPreview(cardData.tc));
  card.addEventListener("mouseleave", () => {
    const selected = allCards.find((c) => c.name === tCtx.hoveredTheme);
    if (selected) _themeApplyPreview(selected.tc);
  });
  card.addEventListener("click", () => {
    document
      .querySelectorAll(".onboarding-theme-card")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    tCtx.hoveredTheme = card.dataset.name;
    _themeApplyPreview(cardData.tc);
  });
}

function _themeWireApplyBtn(applyBtn, customThemes, tCtx) {
  if (!applyBtn) return;
  applyBtn.onclick = () => {
    const selectedTheme = tCtx.hoveredTheme;
    const custom = customThemes.find((t) => t.name === selectedTheme);
    if (custom) {
      _ctApplyThemeObj(custom);
      localStorage.setItem("selectedTheme", selectedTheme);
    } else {
      invoke("set_theme", { name: selectedTheme }).then((theme) => {
        if (theme) {
          window.applyThemeColors(theme);
          localStorage.setItem("selectedTheme", selectedTheme);
          _refreshThemeCards();
        }
      });
    }
    if (typeof addNotification === "function")
      addNotification("Theme Applied", `"${selectedTheme}" is now active.`, "success");
  };
}

function _themeWireResetBtn(resetBtn, cards, allCards, savedTheme, tCtx) {
  if (!resetBtn) return;
  resetBtn.onclick = () => {
    tCtx.hoveredTheme = savedTheme;
    cards.forEach((c) => c.classList.toggle("active", c.dataset.name === savedTheme));
    const originalCard = allCards.find((c) => c.name === savedTheme);
    if (originalCard) _themeApplyPreview(originalCard.tc);
  };
}

async function _refreshThemeCards() {
  const grid = document.getElementById("theme-cards-grid");
  if (!grid) return;

  let presetNames = [];
  try {
    presetNames = await invoke("get_themes");
  } catch (_) {}

  if (!_stSettingsThemeCache) {
    _stSettingsThemeCache = {};
    for (const tname of presetNames) {
      try {
        const colors = await invoke("set_theme", { name: tname });
        if (colors) _stSettingsThemeCache[tname] = colors;
      } catch (_) {}
    }
  }

  const savedTheme = localStorage.getItem("selectedTheme") || "BLACKSITE";
  const customThemes = _ctLoadThemes();
  const allCards = [];
  presetNames.forEach((tname) => {
    const tc = _stSettingsThemeCache[tname] || {};
    allCards.push({ name: tname, bg: tc.Background, fg: tc.Foreground, accent: tc.Accent, tc });
  });
  customThemes.forEach((t) => {
    allCards.push({
      name: t.name,
      bg: t.background,
      fg: t.foreground,
      accent: t.accent,
      tc: {
        Background: t.background,
        Foreground: t.foreground,
        Accent: t.accent,
        Response: t.response,
        Warning: t.warning,
        Error: t.error,
      },
    });
  });

  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    const currentVal = themeSelect.value || savedTheme;
    themeSelect.innerHTML = allCards
      .map(
        (c) =>
          `<option value="${c.name}" ${c.name === currentVal ? "selected" : ""}>${c.name}</option>`
      )
      .join("");
  }

  grid.innerHTML = allCards
    .map(
      (c) => `
    <div class="onboarding-theme-card ${c.name === savedTheme ? "active" : ""}" data-name="${c.name}" role="button" tabindex="0">
      <div style="font-weight:bold;margin-bottom:4px;font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
      <div class="onboarding-theme-swatch">
         <span style="background:${c.accent || "#00f0ff"}"></span>
         <span style="background:${c.bg || "#050505"}"></span>
         <span style="background:${c.fg || "#d9f7ff"}"></span>
      </div>
    </div>
  `
    )
    .join("");

  const cards = Array.from(grid.querySelectorAll(".onboarding-theme-card"));
  const tCtx = { hoveredTheme: savedTheme };

  const currentCard = allCards.find((c) => c.name === savedTheme);
  if (currentCard) _themeApplyPreview(currentCard.tc);

  cards.forEach((card) => {
    const cardData = allCards.find((c) => c.name === card.dataset.name);
    _themeWireCardHover(card, cardData, allCards, tCtx);
  });

  _themeWireApplyBtn(document.getElementById("theme-apply-btn"), customThemes, tCtx);
  _themeWireResetBtn(document.getElementById("theme-reset-btn"), cards, allCards, savedTheme, tCtx);
}

function _loadThemesForSettings() {
  _refreshThemeCards();
}

export function openSettingsModal() {
  if (settingsOverlay) {
    settingsOverlay.classList.add("active");
    settingsOverlay.setAttribute("aria-hidden", "false");
    settingsOverlay.toggleAttribute("inert", false);
  }
  activateSettingsPanel(localStorage.getItem("settingsActivePanel") || "sp-general");
  if (!settingsFocusTrap) settingsFocusTrap = new FocusTrap(settingsOverlay);
  settingsFocusTrap.activate();
  const statusEl = document.getElementById("settings-llm-status");
  if (statusEl) statusEl.innerText = "";
  Promise.all([
    invoke("get_config"),
    invoke("get_gemini_api_key"),
    invoke("get_kimi_api_key"),
    invoke("get_hf_api_key"),
    invoke("get_openai_compat_api_key"),
  ])
    .then(_populateLlmConfig)
    .catch((err) => console.error("Error loading LLM config in settings:", err));
  if (typeof refreshSettingsPersonaDropdown === "function") refreshSettingsPersonaDropdown();
  _loadThemesForSettings();
  renderSshProfilesSettings();
  renderFtpProfilesSettings();
  renderSftpProfilesSettings();
  if (typeof loadPluginsList === "function") loadPluginsList();
  if (typeof loadCustomPersonas === "function") loadCustomPersonas();
  if (window._customThemes) {
    window._customThemes.renderList();
    window._customThemes.refreshThemeSelect();
  }
  if (window._syncSettings) window._syncSettings.refresh();
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

function _buildPersonaItem(p) {
  const item = document.createElement("div");
  item.className = "ssh-profile-item";
  item.style.cssText =
    "padding: 6px 8px; background: rgba(255,255,255,0.02); border-radius: 4px; border: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px;";
  const info = document.createElement("div");
  info.style.cssText =
    "display: flex; flex-direction: column; gap: 2px; align-items: flex-start; overflow: hidden;";
  const nameEl = document.createElement("span");
  nameEl.style.cssText = "font-weight: 500; color: var(--foreground-color);";
  nameEl.textContent = p.name;
  const promptEl = document.createElement("span");
  promptEl.style.cssText =
    "font-size: 0.7rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;";
  promptEl.textContent = p.prompt;
  promptEl.title = p.prompt;
  info.append(nameEl, promptEl);
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "canvas-btn persona-delete-btn";
  deleteBtn.setAttribute("data-name", p.name);
  deleteBtn.style.cssText =
    "padding: 3px 8px; font-size: 0.75rem; border-color: var(--error-color); color: var(--error-color);";
  deleteBtn.title = `Delete ${p.name}`;
  deleteBtn.setAttribute("aria-label", `Delete ${p.name}`);
  deleteBtn.innerHTML = createIcon("trash2", { size: 14 });
  item.append(info, deleteBtn);
  return item;
}

async function _wirePersonaDeleteBtn(btn) {
  btn.onclick = async () => {
    const name = btn.getAttribute("data-name");
    if (
      await showConfirm(`Are you sure you want to delete custom persona '${name}'?`, {
        confirmText: "Delete",
        cancelText: "Keep",
      })
    ) {
      const statusEl = document.getElementById("settings-persona-status");
      if (statusEl) statusEl.innerText = "Deleting custom persona...";
      invoke("delete_custom_persona", { name })
        .then(() => {
          if (statusEl) statusEl.innerText = `Custom persona '${name}' deleted successfully.`;
          loadCustomPersonas();
          refreshSettingsPersonaDropdown();
        })
        .catch((err) => {
          if (statusEl) statusEl.innerText = `Failed to delete: ${err}`;
        });
    }
  };
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
      personas.forEach((p) => listEl.appendChild(_buildPersonaItem(p)));
      listEl.querySelectorAll(".persona-delete-btn").forEach((btn) => _wirePersonaDeleteBtn(btn));
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
        addNotification("Missing Fields", "Please enter a name and system prompt.", "warning");
        return;
      }

      if (statusEl) statusEl.innerText = "Creating custom persona...";
      createBtn.disabled = true;

      invoke("add_custom_persona", { name, prompt })
        .then(() => {
          if (statusEl) statusEl.innerText = `Persona '${name}' created successfully!`;
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

// ── Custom Themes helpers ─────────────────────────────────────────────────────
const _CT_LS_KEY = "neurodeckCustomThemes";
const _CT_HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
function _ctLoadThemes() {
  try {
    return JSON.parse(localStorage.getItem(_CT_LS_KEY) || "[]");
  } catch (_) {
    return [];
  }
}
function _ctSaveThemes(themes) {
  localStorage.setItem(_CT_LS_KEY, JSON.stringify(themes));
  if (window.__TAURI_INTERNALS__)
    invoke("save_custom_themes", { data: JSON.stringify(themes) }).catch(() => {});
}
function _ctApplyThemeObj(t) {
  applyThemeColors(t);
  localStorage.setItem("selectedTheme", t.name);
  if (typeof _refreshThemeCards === "function") _refreshThemeCards();
}
function _ctIsValidHex(v) {
  return _CT_HEX_RE.test(v.trim());
}
function _ctUpdatePreview() {
  const map = {
    "ct-preview-bg": "ct-bg",
    "ct-preview-accent": "ct-accent",
    "ct-preview-response": "ct-response",
    "ct-preview-warning": "ct-warning",
    "ct-preview-error": "ct-error",
  };
  Object.entries(map).forEach(([previewId, inputId]) => {
    const el = document.getElementById(previewId),
      inp = document.getElementById(inputId);
    if (!el || !inp) return;
    if (_ctIsValidHex(inp.value)) {
      el.style.background = inp.value.trim();
      inp.style.borderColor = "";
    } else {
      inp.style.borderColor = "var(--error-color)";
    }
  });
}
function _ctBuildThemeRow(t, idx) {
  const row = document.createElement("div");
  row.style.cssText =
    "display:flex; align-items:center; gap:8px; padding:5px 6px; background:rgba(255,255,255,0.03); border-radius:4px;";
  const swatch = document.createElement("div");
  swatch.style.cssText = `width:16px; height:16px; border-radius:3px; background:${t.accent}; border:1px solid rgba(255,255,255,0.15); flex-shrink:0;`;
  const nameEl = document.createElement("span");
  nameEl.style.cssText = "flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
  nameEl.textContent = t.name;
  const applyBtn = document.createElement("button");
  applyBtn.textContent = "Apply";
  applyBtn.className = "send-prompt-btn";
  applyBtn.style.cssText =
    "margin:0; height:22px; padding:0 8px; font-size:0.7rem; justify-content:center;";
  applyBtn.onclick = () => {
    _ctApplyThemeObj(t);
    if (typeof addNotification === "function")
      addNotification("Theme Applied", `"${t.name}" is now active.`, "success");
  };
  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "canvas-btn";
  editBtn.style.cssText = "height:22px; padding:0 8px; font-size:0.7rem;";
  editBtn.onclick = () => {
    ["ct-name", "ct-bg", "ct-fg", "ct-accent", "ct-response", "ct-warning", "ct-error"].forEach(
      (id) => {
        const fieldKey = id === "ct-name" ? "name" : id.replace("ct-", "");
        const el = document.getElementById(id);
        if (el) el.value = t[fieldKey] || t[id.replace("ct-", "")] || "";
      }
    );
    document.getElementById("ct-name").value = t.name;
    document.getElementById("ct-bg").value = t.background;
    _ctUpdatePreview();
    const themes2 = _ctLoadThemes();
    themes2.splice(idx, 1);
    _ctSaveThemes(themes2);
    _ctRenderList();
    _ctRefreshThemeSelect();
  };
  const delBtn = document.createElement("button");
  delBtn.className = "canvas-btn";
  delBtn.style.cssText =
    "height:22px; padding:0 6px; font-size:0.7rem; border-color:var(--error-color);";
  delBtn.title = `Delete ${t.name}`;
  delBtn.setAttribute("aria-label", `Delete ${t.name}`);
  delBtn.innerHTML = createIcon("trash2", { size: 14 });
  delBtn.onclick = () => {
    const themes2 = _ctLoadThemes();
    themes2.splice(idx, 1);
    _ctSaveThemes(themes2);
    _ctRenderList();
    _ctRefreshThemeSelect();
    if (typeof addNotification === "function")
      addNotification("Theme Deleted", `"${t.name}" removed.`, "info");
  };
  row.append(swatch, nameEl, applyBtn, editBtn, delBtn);
  return row;
}
function _ctRenderList() {
  const container = document.getElementById("ct-list");
  if (!container) return;
  const themes = _ctLoadThemes();
  if (themes.length === 0) {
    container.innerHTML =
      '<div style="opacity:0.5; font-style:italic;">No custom themes saved yet.</div>';
    return;
  }
  container.innerHTML = "";
  themes.forEach((t, idx) => container.appendChild(_ctBuildThemeRow(t, idx)));
}
function _ctRefreshThemeSelect() {
  if (typeof _refreshThemeCards === "function") _refreshThemeCards();
}
function _ctWireSaveBtn() {
  const saveBtn = document.getElementById("ct-save-btn");
  if (!saveBtn) return;
  saveBtn.addEventListener("click", () => {
    const name = (document.getElementById("ct-name")?.value || "").trim();
    const s = document.getElementById("ct-status");
    const showStatus = (msg, delay) => {
      if (s) {
        s.textContent = msg;
        setTimeout(() => {
          s.textContent = "";
        }, delay);
      }
    };
    if (!name) {
      showStatus("Enter a theme name.", 2000);
      return;
    }
    const colorFields = ["ct-bg", "ct-fg", "ct-accent", "ct-response", "ct-warning", "ct-error"];
    const invalidField = colorFields.find((id) => {
      const v = document.getElementById(id)?.value;
      return v && !_ctIsValidHex(v);
    });
    if (invalidField) {
      showStatus("Fix invalid hex color values (must be #RGB or #RRGGBB).", 3000);
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
    const themes = _ctLoadThemes().filter((t) => t.name !== name);
    themes.push(theme);
    _ctSaveThemes(themes);
    _ctRenderList();
    _ctRefreshThemeSelect();
    showStatus(`"${name}" saved!`, 2500);
    if (typeof addNotification === "function")
      addNotification("Theme Saved", `"${name}" added to custom themes.`, "success");
  });
}
function _ctWireThemeSelect() {
  // Theme selector dropdown replaced by theme cards
}
function _ctLoadThemesFromDisk() {
  if (!window.__TAURI_INTERNALS__) return;
  invoke("load_custom_themes")
    .then((raw) => {
      if (raw && raw !== "[]" && !localStorage.getItem(_CT_LS_KEY)) {
        localStorage.setItem(_CT_LS_KEY, raw);
        _ctRefreshThemeSelect();
      }
    })
    .catch(() => {});
}

function initCustomThemes() {
  _ctLoadThemesFromDisk();
  ["ct-bg", "ct-fg", "ct-accent", "ct-response", "ct-warning", "ct-error"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", _ctUpdatePreview);
  });
  _ctWireSaveBtn();
  _ctWireThemeSelect();
  window._customThemes = { renderList: _ctRenderList, refreshThemeSelect: _ctRefreshThemeSelect };
  _ctRenderList();
  _ctUpdatePreview();
}

// ==========================================================================
// MCP SERVER SETTINGS
// ==========================================================================

const _MCP_TOOL_META = [
  { name: "neurodeck_chat", label: "neurodeck_chat", desc: "LLM chat (always safe)" },
  { name: "get_status", label: "get_status", desc: "Server info" },
  { name: "memory_add_fact", label: "memory_add_fact", desc: "Add pinned memory fact" },
  { name: "memory_list_all", label: "memory_list_all", desc: "List all memory records" },
  { name: "read_file", label: "read_file", desc: "Read file from disk" },
  { name: "write_file", label: "write_file", desc: "Write file to disk" },
  { name: "run_shell", label: "run_shell", desc: "Shell exec (needs NEURODECK_ENABLE_MCP_EXEC)" },
  { name: "run_code", label: "run_code", desc: "Code exec (needs NEURODECK_ENABLE_MCP_EXEC)" },
];

async function _mcpLoadWhitelistUI(els) {
  if (!els.whitelistEl) return;
  let current = [];
  try {
    current = await invoke("get_mcp_tool_whitelist");
  } catch (_) {}
  els.whitelistEl.innerHTML = "";
  _MCP_TOOL_META.forEach(({ name, label, desc }) => {
    const checked = current.includes(name);
    const row = document.createElement("label");
    row.className = "mcp-tool-check-row";
    row.title = desc;
    row.innerHTML = `<input type="checkbox" name="${window.escapeHtml(name)}"${checked ? " checked" : ""}> <span class="mcp-tool-check-name">${window.escapeHtml(label)}</span> <span class="mcp-tool-check-desc">${window.escapeHtml(desc)}</span>`;
    row.querySelector("input").addEventListener("change", async () => {
      const enabled = Array.from(els.whitelistEl.querySelectorAll("input[type=checkbox]"))
        .filter((cb) => cb.checked)
        .map((cb) => cb.name);
      try {
        await invoke("set_mcp_tool_whitelist", { tools: enabled });
      } catch (e) {
        if (typeof window.addNotification === "function")
          window.addNotification("Whitelist Error", String(e), "error");
      }
    });
    els.whitelistEl.appendChild(row);
  });
}

function _mcpSetRunningUI(port, token, discovery, els) {
  els.startBtn.disabled = true;
  els.stopBtn.disabled = false;
  els.statusLine.innerHTML = `<span style="color: var(--response-color);">● Running</span> &nbsp;·&nbsp; <span style="color: var(--accent-color);">http://127.0.0.1:${window.escapeHtml(String(port))}</span>`;
  if (els.tokenRow) els.tokenRow.style.display = "";
  if (els.tokenDisplay && token) els.tokenDisplay.textContent = token;
  if (els.discoveryEl && discovery) els.discoveryEl.textContent = discovery;
  if (els.claudeConfig) els.claudeConfig.style.display = "block";
  if (els.configSnippet) {
    const snippet = {
      mcpServers: {
        neurodeck: {
          url: `http://127.0.0.1:${port}/`,
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        },
      },
    };
    els.configSnippet.textContent = JSON.stringify(snippet, null, 2);
  }
}

function _mcpSetStoppedUI(els) {
  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;
  els.statusLine.textContent = "Server is not running.";
  if (els.tokenRow) els.tokenRow.style.display = "none";
  if (els.claudeConfig) els.claudeConfig.style.display = "none";
}

function _mcpWireCopyToken(els) {
  if (!els.copyTokenBtn || !els.tokenDisplay) return;
  els.copyTokenBtn.addEventListener("click", () => {
    const tok = els.tokenDisplay.textContent;
    if (tok)
      navigator.clipboard
        .writeText(tok)
        .then(() => {
          els.copyTokenBtn.textContent = "Copied!";
          setTimeout(() => {
            els.copyTokenBtn.textContent = "Copy";
          }, 1500);
        })
        .catch(() => {});
  });
}

function _mcpWireSettingsBtn(els) {
  const settingsBtn = document.getElementById("settings-btn");
  if (!settingsBtn) return;
  settingsBtn.addEventListener("click", async () => {
    try {
      const status = await invoke("get_mcp_status", { execToken: state.execToken });
      if (status.running === "true") {
        els.portInput.value = status.port || "13337";
        _mcpSetRunningUI(status.port, status.token, status.discovery, els);
      } else {
        _mcpSetStoppedUI(els);
      }
    } catch (_) {
      _mcpSetStoppedUI(els);
    }
    _mcpLoadWhitelistUI(els);
  });
}

function _mcpHandleError(err, statusLine, btn) {
  statusLine.innerHTML = "";
  const span = document.createElement("span");
  span.style.color = "var(--error-color)";
  span.textContent = `Error: ${err}`;
  statusLine.appendChild(span);
  if (btn) btn.disabled = false;
}

function _mcpWireStartBtn(els) {
  els.startBtn.addEventListener("click", async () => {
    const port = parseInt(els.portInput.value, 10) || 13337;
    els.startBtn.disabled = true;
    els.statusLine.textContent = "Starting...";
    try {
      const result = await invoke("start_mcp_server", { port, execToken: state.execToken });
      _mcpSetRunningUI(port, result.token, result.discovery, els);
      if (typeof window.addNotification === "function")
        window.addNotification(
          "MCP Server Started",
          `Listening on port ${port}. Copy the config snippet below.`,
          "success"
        );
    } catch (err) {
      _mcpHandleError(err, els.statusLine, els.startBtn);
    }
  });
}

function _mcpWireStopBtn(els) {
  els.stopBtn.addEventListener("click", async () => {
    els.stopBtn.disabled = true;
    try {
      await invoke("stop_mcp_server", { execToken: state.execToken });
      _mcpSetStoppedUI(els);
      if (typeof window.addNotification === "function")
        window.addNotification("MCP Server Stopped", "The MCP server has been shut down.", "info");
    } catch (err) {
      _mcpHandleError(err, els.statusLine, els.stopBtn);
    }
  });
}

function initMcpSettings() {
  const els = {
    startBtn: document.getElementById("mcp-start-btn"),
    stopBtn: document.getElementById("mcp-stop-btn"),
    portInput: document.getElementById("mcp-port-input"),
    statusLine: document.getElementById("mcp-status-line"),
    claudeConfig: document.getElementById("mcp-claude-config"),
    configSnippet: document.getElementById("mcp-claude-config-snippet"),
    tokenRow: document.getElementById("mcp-token-row"),
    tokenDisplay: document.getElementById("mcp-token-display"),
    copyTokenBtn: document.getElementById("mcp-copy-token-btn"),
    discoveryEl: document.getElementById("mcp-discovery-url"),
    whitelistEl: document.getElementById("mcp-tool-whitelist"),
  };
  if (!els.startBtn) return;
  _mcpWireCopyToken(els);
  _mcpWireSettingsBtn(els);
  _mcpWireStartBtn(els);
  _mcpWireStopBtn(els);
  invoke("get_mcp_status", { execToken: state.execToken })
    .then((status) => {
      if (status && status.running === "true") {
        els.portInput.value = status.port || "13337";
        _mcpSetRunningUI(status.port, status.token, status.discovery, els);
      } else {
        _mcpSetStoppedUI(els);
      }
    })
    .catch(() => _mcpSetStoppedUI(els));
  _mcpLoadWhitelistUI(els);
}

// --- PERSONAL KNOWLEDGE BASE (RAG) SETTINGS ---
function _ragUpdateProgress(data, els) {
  const { indexed, total, file, done } = data;
  if (els.progressContainer) els.progressContainer.style.display = "block";
  if (done) {
    if (els.progressLabel) els.progressLabel.innerText = "Complete!";
    if (els.progressPct) els.progressPct.innerText = "100%";
    if (els.progressBar) els.progressBar.style.width = "100%";
    setTimeout(() => {
      if (els.progressContainer) els.progressContainer.style.display = "none";
      if (els.indexBtn) els.indexBtn.disabled = false;
      invoke("get_doc_count")
        .then((c) => {
          if (els.docCount) els.docCount.innerText = c || 0;
        })
        .catch(() => {});
    }, 1200);
  } else {
    const pct = total > 0 ? Math.round((indexed / total) * 100) : 0;
    if (els.progressLabel)
      els.progressLabel.innerText = file
        ? `Indexing: ${file}`
        : `Indexing... (${indexed}/${total})`;
    if (els.progressPct) els.progressPct.innerText = `${pct}%`;
    if (els.progressBar) els.progressBar.style.width = `${pct}%`;
  }
}

async function _ragDoIndex(els) {
  const folder = els.folderInput ? els.folderInput.value.trim() : "";
  if (!folder) {
    if (els.statusLine) {
      els.statusLine.innerHTML = "";
      const s = document.createElement("span");
      s.style.color = "var(--warning-color)";
      s.textContent = "Enter a folder path to index.";
      els.statusLine.appendChild(s);
    }
    return;
  }
  els.indexBtn.disabled = true;
  if (els.statusLine) {
    els.statusLine.innerHTML = "";
    const s = document.createElement("span");
    s.style.opacity = "0.7";
    s.textContent = "Starting indexer...";
    els.statusLine.appendChild(s);
  }
  if (els.progressContainer) els.progressContainer.style.display = "block";
  if (els.progressBar) els.progressBar.style.width = "0%";
  if (els.progressPct) els.progressPct.innerText = "0%";
  if (els.progressLabel) els.progressLabel.innerText = "Scanning folder...";
  try {
    const result = await invoke("index_directory", { path: folder });
    const count =
      typeof result === "number" ? `Indexed ${result} document${result !== 1 ? "s" : ""}.` : result;
    if (els.statusLine) {
      els.statusLine.innerHTML = "";
      const s = document.createElement("span");
      s.style.color = "var(--response-color)";
      s.textContent = count;
      els.statusLine.appendChild(s);
    }
    if (typeof addNotification === "function")
      addNotification("RAG Index Complete", count, "success");
    invoke("get_doc_count")
      .then((c) => {
        if (els.docCount) els.docCount.innerText = c || 0;
      })
      .catch(() => {});
  } catch (err) {
    if (els.statusLine) {
      els.statusLine.innerHTML = "";
      const s = document.createElement("span");
      s.style.color = "var(--error-color)";
      s.textContent = `Error: ${err}`;
      els.statusLine.appendChild(s);
    }
  } finally {
    els.indexBtn.disabled = false;
  }
}

function initDocRag() {
  const els = {
    folderInput: document.getElementById("rag-folder-input"),
    indexBtn: document.getElementById("rag-index-btn"),
    clearBtn: document.getElementById("rag-clear-btn"),
    progressContainer: document.getElementById("rag-progress-container"),
    progressLabel: document.getElementById("rag-progress-label"),
    progressPct: document.getElementById("rag-progress-pct"),
    progressBar: document.getElementById("rag-progress-bar"),
    statusLine: document.getElementById("rag-status-line"),
    docCount: document.getElementById("rag-doc-count"),
  };
  if (!els.indexBtn) return;
  const provSel = document.getElementById("llm-provider-select");
  if (provSel && provSel.value === "ollama") {
    if (els.statusLine)
      els.statusLine.innerHTML = `<span style="color:var(--warning-color);">⚠️ Document RAG requires Gemini (for embeddings). Switch provider in LLM Settings.</span>`;
    els.indexBtn.disabled = true;
  }
  invoke("get_doc_count")
    .then((count) => {
      if (els.docCount) {
        // count may be a number, string, or object like { count: N }
        const n =
          typeof count === "object" && count !== null
            ? (count.count ?? count.total ?? Object.values(count)[0] ?? 0)
            : parseInt(count, 10) || 0;
        els.docCount.innerText = `${n} chunk${n !== 1 ? "s" : ""}`;
      }
    })
    .catch(() => {});

  listen("doc_index_progress", (event) => {
    try {
      const data = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
      _ragUpdateProgress(data, els);
    } catch {
      /* malformed event payload — ignore */
    }
  }).catch(() => {});
  els.indexBtn.addEventListener("click", () => _ragDoIndex(els));
  els.clearBtn.addEventListener("click", async () => {
    try {
      const result = await invoke("clear_doc_index");
      if (els.statusLine)
        els.statusLine.innerHTML = `<span style="color: var(--accent-color);">${result}</span>`;
      if (els.docCount) els.docCount.innerText = "0";
      if (typeof addNotification === "function")
        addNotification("RAG Index Cleared", "All indexed documents removed from memory.", "info");
    } catch (err) {
      if (els.statusLine)
        els.statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
    }
  });
}

async function _memDbExport(exportBtn, statusLine) {
  if (statusLine) {
    statusLine.innerHTML = `<span style="opacity:0.6;">Exporting memory database...</span>`;
  }
  exportBtn.disabled = true;
  try {
    const path = await window.electronAPI?.showSaveDialog({
      title: "Export Vector Database",
      defaultPath: "memory_export.ndmem",
      filters: [{ name: "NEURODECK Memory", extensions: ["ndmem"] }],
    });
    if (!path) {
      if (statusLine) statusLine.innerHTML = "";
      return;
    }

    await invoke("memory_export", { path });
    if (statusLine) {
      statusLine.innerHTML = `<span style="color:var(--response-color);">${createIcon("shieldCheck", { size: 14 })} Exported successfully.</span>`;
    }
    if (typeof addNotification === "function") {
      addNotification("Memory Exported", `Database exported to ${path}`, "success");
    }
  } catch (err) {
    if (statusLine) {
      statusLine.innerHTML = `<span style="color:var(--error-color);">Error: ${err}</span>`;
    }
  } finally {
    exportBtn.disabled = false;
  }
}

async function _memDbImport(importBtn, statusLine) {
  importBtn.disabled = true;
  try {
    const paths = await window.electronAPI?.showOpenDialog({
      title: "Import Vector Database",
      properties: ["openFile"],
      filters: [{ name: "NEURODECK Memory", extensions: ["ndmem"] }],
    });
    if (!paths || paths.length === 0) {
      return;
    }

    const merge = await showConfirm(
      "Do you want to merge the imported data with your existing memory, or overwrite it completely?",
      { confirmText: "Merge", cancelText: "Overwrite" }
    );

    if (statusLine) {
      statusLine.innerHTML = `<span style="opacity:0.6;">Importing database...</span>`;
    }

    await invoke("memory_import", { path: paths[0], merge: merge !== false });

    if (statusLine) {
      statusLine.innerHTML = `<span style="color:var(--response-color);">${createIcon("shieldCheck", { size: 14 })} Imported successfully.</span>`;
    }
    if (typeof addNotification === "function") {
      addNotification("Memory Imported", `Database imported from ${paths[0]}`, "success");
    }
  } catch (err) {
    if (statusLine) {
      statusLine.innerHTML = `<span style="color:var(--error-color);">Error: ${err}</span>`;
    }
  } finally {
    importBtn.disabled = false;
  }
}

function initMemoryDb() {
  const exportBtn = document.getElementById("memory-export-btn");
  const importBtn = document.getElementById("memory-import-btn");
  const statusLine = document.getElementById("memory-db-status-line");

  if (!exportBtn || !importBtn) return;

  exportBtn.addEventListener("click", () => _memDbExport(exportBtn, statusLine));
  importBtn.addEventListener("click", () => _memDbImport(importBtn, statusLine));
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
      addNotification("BMAD Installed", `Framework installed to ${dir}`, "success");
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

function _whHandleProgressEvent(event, els, model, unlistenRef) {
  let data;
  try {
    data = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
  } catch {
    return;
  }
  const { done, pct, path, skipped } = data;
  if (els.dlPct) els.dlPct.textContent = `${pct || 0}%`;
  if (els.dlBar) els.dlBar.style.width = `${pct || 0}%`;
  if (done) {
    _whOnDownloadDone(els, model, path, skipped, unlistenRef);
  } else {
    if (els.dlLabel)
      els.dlLabel.textContent = skipped ? "Already downloaded" : `Downloading ggml-${model}.bin...`;
  }
}

function _whOnDownloadDone(els, model, path, skipped, unlistenRef) {
  unlistenRef.fn();
  if (els.dlWrap) els.dlWrap.style.display = "none";
  els.downloadBtn.disabled = false;
  if (path) {
    if (els.modelInput) els.modelInput.value = path;
    if (els.statusLine)
      els.statusLine.innerHTML = `<span style="color:var(--response-color);display:inline-flex;align-items:center;gap:6px;">${createIcon("shieldCheck", { size: 14 })}<span>${skipped ? "Model already exists" : "Downloaded"}: ${path}<br>Click Save Config to activate.</span></span>`;
    if (typeof addNotification === "function")
      addNotification("Whisper Model Ready", `ggml-${model}.bin downloaded.`, "success");
  }
}

function _whOnDownloadError(err, els, unlistenRef) {
  unlistenRef.fn();
  els.downloadBtn.disabled = false;
  if (els.dlWrap) els.dlWrap.style.display = "none";
  if (els.statusLine)
    els.statusLine.innerHTML = `<span style="color:var(--error-color);">Download failed: ${err}</span>`;
}

async function _whHandleDownloadClick(els) {
  const model = els.modelSelect.value;
  els.downloadBtn.disabled = true;
  if (els.dlWrap) els.dlWrap.style.display = "block";
  if (els.dlLabel) els.dlLabel.textContent = `Downloading ggml-${model}.bin...`;
  if (els.dlPct) els.dlPct.textContent = "0%";
  if (els.dlBar) els.dlBar.style.width = "0%";
  if (els.statusLine)
    els.statusLine.innerHTML = `<span style="opacity:0.6;">Downloading ${model}...</span>`;
  const unlistenRef = { fn: () => {} };
  unlistenRef.fn = await listen("whisper_download_progress", (event) =>
    _whHandleProgressEvent(event, els, model, unlistenRef)
  ).catch(() => () => {});
  try {
    await invoke("download_whisper_model", { model });
  } catch (err) {
    _whOnDownloadError(err, els, unlistenRef);
  }
}

function _whWireDownloadBtn(els) {
  if (!els.downloadBtn || !els.modelSelect) return;
  els.downloadBtn.addEventListener("click", () => _whHandleDownloadClick(els));
}

function _whLoadConfig(els) {
  invoke("get_whisper_status")
    .then((status) => {
      if (!status) return;
      if (els.binaryInput) els.binaryInput.value = status.binary || "";
      if (els.modelInput) els.modelInput.value = status.model || "";
      if (status.configured) {
        if (els.statusLine)
          setStatusMarkup(
            els.statusLine,
            "shieldCheck",
            "Whisper configured and ready.",
            "var(--response-color)"
          );
      } else if (status.model) {
        if (els.statusLine)
          setStatusMarkup(
            els.statusLine,
            "bell",
            "Model file not found at configured path.",
            "var(--warning-color)"
          );
      }
    })
    .catch(() => {});
}

function _whWireSaveBtn(els) {
  els.saveBtn.addEventListener("click", async () => {
    const binary = els.binaryInput ? els.binaryInput.value.trim() : "";
    const model = els.modelInput ? els.modelInput.value.trim() : "";
    try {
      await invoke("set_whisper_config", { binary, model });
      const status = await invoke("get_whisper_status");
      if (status.configured) {
        if (els.statusLine)
          setStatusMarkup(
            els.statusLine,
            "shieldCheck",
            "Saved. Whisper ready - mic button will use offline STT.",
            "var(--response-color)"
          );
        if (typeof addNotification === "function")
          addNotification(
            "Whisper STT Configured",
            "Offline transcription is now active.",
            "success"
          );
      } else if (!status.model_exists) {
        if (els.statusLine)
          els.statusLine.innerHTML = `<span style="color: var(--warning-color);">Saved, but model file not found at that path.</span>`;
      } else if (!status.binary_found) {
        if (els.statusLine)
          els.statusLine.innerHTML = `<span style="color: var(--warning-color);">Saved, but whisper binary not found. Check the path.</span>`;
      } else {
        if (els.statusLine)
          els.statusLine.innerHTML = `<span style="opacity: 0.6;">Config saved.</span>`;
      }
    } catch (err) {
      if (els.statusLine)
        els.statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
    }
  });
}

function _whWireTestBtn(els) {
  els.testBtn.addEventListener("click", async () => {
    if (els.statusLine)
      els.statusLine.innerHTML = `<span style="opacity: 0.6;">Transcribing record.wav...</span>`;
    els.testBtn.disabled = true;
    try {
      const text = await invoke("transcribe_audio_whisper");
      if (els.statusLine)
        els.statusLine.innerHTML = `<span style="color: var(--response-color);">Result: "${text}"</span>`;
    } catch (err) {
      if (els.statusLine)
        els.statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
    } finally {
      els.testBtn.disabled = false;
    }
  });
}

function _whWireTtsMode() {
  const ttsModeGroup = document.getElementById("tts-mode-group");
  if (!ttsModeGroup) return;
  const saved = localStorage.getItem("neurodeck_tts_mode") || "complete";
  const radio = ttsModeGroup.querySelector(`input[value="${saved}"]`);
  if (radio) radio.checked = true;
  ttsModeGroup.querySelectorAll("input[type=radio]").forEach((r) => {
    r.addEventListener("change", () => {
      if (r.checked) localStorage.setItem("neurodeck_tts_mode", r.value);
    });
  });
}

function initWhisperSettings() {
  const els = {
    binaryInput: document.getElementById("whisper-binary-input"),
    modelInput: document.getElementById("whisper-model-input"),
    saveBtn: document.getElementById("whisper-save-btn"),
    testBtn: document.getElementById("whisper-test-btn"),
    statusLine: document.getElementById("whisper-status-line"),
    downloadBtn: document.getElementById("whisper-download-btn"),
    modelSelect: document.getElementById("whisper-model-select"),
    dlWrap: document.getElementById("whisper-dl-progress-wrap"),
    dlLabel: document.getElementById("whisper-dl-label"),
    dlPct: document.getElementById("whisper-dl-pct"),
    dlBar: document.getElementById("whisper-dl-bar"),
  };
  if (!els.saveBtn) return;
  _whWireDownloadBtn(els);
  _whLoadConfig(els);
  _whWireSaveBtn(els);
  _whWireTestBtn(els);
  _whWireTtsMode();
}

// ==========================================================================

function _syncSetStatus(statusLine, text, color = "") {
  if (!statusLine) return;
  statusLine.textContent = text;
  statusLine.style.color = color;
}

function _syncRenderStatus(status, els) {
  if (!status) return;
  if (els.enabledToggle) {
    els.enabledToggle.checked = !!status.enabled;
    els.enabledToggle.setAttribute("aria-checked", els.enabledToggle.checked ? "true" : "false");
  }
  if (els.memoryToggle) {
    els.memoryToggle.checked = status.sync_memory !== false;
    els.memoryToggle.setAttribute("aria-checked", els.memoryToggle.checked ? "true" : "false");
  }
  if (els.sessionsToggle) {
    els.sessionsToggle.checked = status.sync_sessions !== false;
    els.sessionsToggle.setAttribute("aria-checked", els.sessionsToggle.checked ? "true" : "false");
  }
  if (els.apiUrlInput) els.apiUrlInput.value = status.api_base_url || "";
  if (els.deviceId) els.deviceId.textContent = status.device_id || "-";
  if (els.lastAt)
    els.lastAt.textContent = status.last_sync_at
      ? new Date(status.last_sync_at).toLocaleString()
      : "Never";
  if (els.pendingCount) els.pendingCount.textContent = String(status.pending_records || 0);
  if (els.conflictCount) els.conflictCount.textContent = String(status.conflict_count || 0);
  if (status.last_error) _syncSetStatus(els.statusLine, status.last_error, "var(--error-color)");
}

async function _syncDoSave(els) {
  els.saveBtn.disabled = true;
  _syncSetStatus(els.statusLine, "Saving sync settings...", "var(--accent-color)");
  try {
    const status = await invoke("configure_sync", {
      request: {
        enabled: !!els.enabledToggle?.checked,
        sync_memory: els.memoryToggle?.checked !== false,
        sync_sessions: els.sessionsToggle?.checked !== false,
        api_base_url: els.apiUrlInput?.value?.trim() || "",
      },
    });
    _syncRenderStatus(status, els);
    _syncSetStatus(els.statusLine, "Sync settings saved.", "var(--response-color)");
  } catch (err) {
    _syncSetStatus(els.statusLine, `Save failed: ${err}`, "var(--error-color)");
  } finally {
    els.saveBtn.disabled = false;
  }
}

async function _syncDoNow(els) {
  els.syncNowBtn.disabled = true;
  _syncSetStatus(els.statusLine, "Starting encrypted sync...", "var(--accent-color)");
  try {
    const status = await invoke("sync_now");
    _syncRenderStatus(status, els);
    _syncSetStatus(
      els.statusLine,
      `Sync complete. Pushed ${status.pushed_records || 0}, pulled ${status.pulled_records || 0}.`,
      "var(--response-color)"
    );
    if (typeof addNotification === "function")
      addNotification(
        "Cloud Sync Complete",
        `Pushed ${status.pushed_records || 0}, pulled ${status.pulled_records || 0}.`,
        "success"
      );
  } catch (err) {
    _syncSetStatus(els.statusLine, `Sync failed: ${err}`, "var(--error-color)");
  } finally {
    els.syncNowBtn.disabled = false;
  }
}

function initSyncSettings() {
  const els = {
    enabledToggle: document.getElementById("sync-enabled-toggle"),
    memoryToggle: document.getElementById("sync-memory-toggle"),
    sessionsToggle: document.getElementById("sync-sessions-toggle"),
    apiUrlInput: document.getElementById("sync-api-url-input"),
    saveBtn: document.getElementById("sync-save-btn"),
    syncNowBtn: document.getElementById("sync-now-btn"),
    statusLine: document.getElementById("sync-status-line"),
    deviceId: document.getElementById("sync-device-id"),
    lastAt: document.getElementById("sync-last-at"),
    pendingCount: document.getElementById("sync-pending-count"),
    conflictCount: document.getElementById("sync-conflict-count"),
  };
  if (!els.saveBtn) return;
  const refresh = async () => {
    try {
      _syncRenderStatus(await invoke("get_sync_status"), els);
    } catch (err) {
      _syncSetStatus(els.statusLine, `Sync status unavailable: ${err}`, "var(--error-color)");
    }
  };
  els.saveBtn.addEventListener("click", () => _syncDoSave(els));
  els.syncNowBtn?.addEventListener("click", () => _syncDoNow(els));
  listen("sync_progress", (event) => {
    const label = String(event.payload || "");
    if (label) _syncSetStatus(els.statusLine, `Sync ${label}...`, "var(--accent-color)");
  }).catch(() => {});
  refresh();
  window._syncSettings = { refresh };
}

// ==========================================================================
// LSP SETTINGS
// ==========================================================================

function _lspLoadConf() {
  try {
    const raw = localStorage.getItem("neurodeck_lsp_config");
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function _lspSaveConf(cfg) {
  localStorage.setItem("neurodeck_lsp_config", JSON.stringify(cfg));
}

function _lspEsc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function _lspBuildServerHtml(s, cfg, statusMap) {
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
          <span class="lsp-server-name">${_lspEsc(s.label)}</span>
        </label>
        <span class="lsp-server-status"><span class="${dotCls}"></span>${status}</span>
      </div>
      <div class="lsp-server-fields" ${enabled ? "" : 'style="display:none"'}>
        <label class="lsp-field-label">Command
          <input class="lsp-field-input lsp-cmd-input" data-lang="${s.language}" type="text" value="${_lspEsc(command)}" placeholder="${_lspEsc(s.command)}">
        </label>
        <label class="lsp-field-label">Args (space-separated)
          <input class="lsp-field-input lsp-args-input" data-lang="${s.language}" type="text" value="${_lspEsc(args)}" placeholder="${_lspEsc(s.args.join(" "))}">
        </label>
        <div class="lsp-hint">${_lspEsc(s.install_hint)}</div>
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
}

function _lspWireToggles(container) {
  container.querySelectorAll(".lsp-toggle-input").forEach((cb) => {
    cb.addEventListener("change", () => {
      const row = container.querySelector(`.lsp-server-row[data-lang="${cb.dataset.lang}"]`);
      const fields = row?.querySelector(".lsp-server-fields");
      if (fields) fields.style.display = cb.checked ? "" : "none";
    });
  });
}

function _lspWireSaveBtns(container) {
  container.querySelectorAll(".lsp-btn-save").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      const row = container.querySelector(`.lsp-server-row[data-lang="${lang}"]`);
      const enabled = row.querySelector(".lsp-toggle-input").checked;
      const cmd = row.querySelector(".lsp-cmd-input").value.trim();
      const argsRaw = row.querySelector(".lsp-args-input").value.trim();
      const args = argsRaw ? argsRaw.split(/\s+/) : [];
      const cfg = _lspLoadConf();
      cfg[lang] = { enabled, command: cmd, args };
      _lspSaveConf(cfg);
      addNotification({ type: "success", title: "LSP", message: `'${lang}' config saved.` });
    });
  });
}

function _lspWireStartBtns(container, knownServers, renderFn) {
  container.querySelectorAll(".lsp-btn-start").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      const cfg = _lspLoadConf();
      const saved = cfg[lang] || {};
      const known = knownServers.find((s) => s.language === lang) || {};
      const cmd = saved.command || known.command || lang;
      const args = saved.args || known.args || [];
      try {
        await invoke("lsp_start", { language: lang, command: cmd, args });
        addNotification({ type: "success", title: "LSP", message: `Starting '${lang}'…` });
        setTimeout(renderFn, 1500);
      } catch (e) {
        addNotification({ type: "error", title: "LSP", message: `Failed to start: ${e}` });
      }
    });
  });
}

function _lspWireStopBtns(container, renderFn) {
  container.querySelectorAll(".lsp-btn-stop").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      try {
        await invoke("lsp_stop", { language: lang });
        addNotification({ type: "info", title: "LSP", message: `'${lang}' stopped.` });
        setTimeout(renderFn, 400);
      } catch (e) {
        addNotification({ type: "error", title: "LSP", message: `Stop failed: ${e}` });
      }
    });
  });
}

async function _lspRender(container, knownServers) {
  const cfg = _lspLoadConf();
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
      ${knownServers.map((s) => _lspBuildServerHtml(s, cfg, statusMap)).join("")}
    </div>`;
  _lspWireToggles(container);
  _lspWireSaveBtns(container);
  _lspWireStartBtns(container, knownServers, () => _lspRender(container, knownServers));
  _lspWireStopBtns(container, () => _lspRender(container, knownServers));
}

async function initLspSettings() {
  const container = document.getElementById("lsp-settings-container");
  if (!container) return;
  let knownServers = [];
  try {
    knownServers = await invoke("lsp_known_servers");
  } catch (_) {}
  await _lspRender(container, knownServers);
  window._lspSettingsRefresh = () => _lspRender(container, knownServers);
}

// ==========================================================================
// THEME LIVE PREVIEW
// initThemeLivePreview logic replaced by _refreshThemeCards

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
  initMemoryDb,
  initBmadInstaller,
  initWhisperSettings,
  initSyncSettings,
  toggleSettingsLlmGroups,
};

// ── initSettings helpers ──────────────────────────────────────────────────────
function _stWireAppearanceInputs() {
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
  if (trayToggle)
    trayToggle.onchange = function () {
      _syncToggleAria(this);
      invoke("set_config", {
        key: "prefs.minimize_to_tray_on_close",
        value: this.checked ? "true" : "false",
      }).catch((e) => console.error("Failed to save tray preference:", e));
    };
  const shellSelect = document.getElementById("shell-select");
  if (shellSelect) shellSelect.onchange = handleShellSelect;
}
function _stWireLlmSettings() {
  document
    .getElementById("llm-provider-select")
    ?.addEventListener("change", handleLlmProviderChange);
  document
    .getElementById("settings-test-connection-btn")
    ?.addEventListener("click", handleTestConnectionClick);
  document.getElementById("settings-save-llm-btn")?.addEventListener("click", handleSaveLlmClick);
  applyButtonIcon("#settings-test-connection-btn", { icon: "globe", label: "Test Connection" });
  applyButtonIcon("#settings-save-llm-btn", { icon: "shieldCheck", label: "Save & Apply" });
}
function _stWireShellSwitcher() {
  document.querySelectorAll(".term-shell-btn").forEach((pill) => {
    pill.onclick = function () {
      const shell = this.getAttribute("data-shell");
      document.querySelectorAll(".term-shell-btn").forEach((p) => p.classList.remove("active"));
      this.classList.add("active");
      localStorage.setItem("selectedShell", shell === "default" ? "default" : shell);
      const sel = document.getElementById("shell-select");
      if (sel) {
        const opt = sel.querySelector(`option[value="${shell}"]`);
        if (opt) sel.value = shell;
      }
      if (state.activeTerminalSessionId) {
        const session = state.terminalSessions.find((s) => s.id === state.activeTerminalSessionId);
        if (session) {
          session.shell = shell === "default" ? null : shell;
          restartTerminalSession(state.activeTerminalSessionId);
        }
      }
    };
  });
  const savedShell = localStorage.getItem("selectedShell") || "default";
  const pill = document.querySelector(`.term-shell-btn[data-shell="${savedShell}"]`);
  if (pill) {
    document.querySelectorAll(".term-shell-btn").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
  }
}
function _stWireTerminalSettings() {
  const customShellInput = document.getElementById("custom-shell-input");
  if (customShellInput)
    customShellInput.oninput = function () {
      localStorage.setItem("customShell", this.value);
      applySettings();
    };
  const termFontSizeSlider = document.getElementById("term-fontsize-slider");
  if (termFontSizeSlider)
    termFontSizeSlider.oninput = function () {
      localStorage.setItem("terminalFontSize", this.value);
      applySettings();
    };
  const termScrollbackInput = document.getElementById("term-scrollback-input");
  if (termScrollbackInput)
    termScrollbackInput.oninput = function () {
      localStorage.setItem("terminalScrollback", this.value);
      applySettings();
    };
}
function _stWireSettingsModal() {
  settingsOverlay = document.getElementById("settings-overlay");
  settingsBtn = document.getElementById("settings-btn");
  closeSettings = document.getElementById("close-settings");
  closeSettingsX = document.getElementById("close-settings-x");
  if (settingsBtn) settingsBtn.onclick = openSettingsModal;
  const closeOverlay = () => {
    if (settingsOverlay) {
      settingsOverlay.classList.remove("active");
      settingsOverlay.setAttribute("aria-hidden", "true");
      settingsOverlay.toggleAttribute("inert", true);
    }
    if (settingsFocusTrap) settingsFocusTrap.deactivate();
  };
  if (closeSettings) closeSettings.onclick = closeOverlay;
  if (closeSettingsX) closeSettingsX.onclick = closeOverlay;
  if (settingsOverlay)
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) closeOverlay();
    });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsOverlay?.classList.contains("active")) closeOverlay();
  });
}
function _stWireLegacyThemeSelect() {
  const themeSelect = document.getElementById("theme-select");
  if (!themeSelect) return;
  themeSelect.value = localStorage.getItem("selectedTheme") || themeSelect.value;
  themeSelect.addEventListener("change", () => {
    const selectedTheme = themeSelect.value;
    localStorage.setItem("selectedTheme", selectedTheme);
    invoke("set_theme", { name: selectedTheme })
      .then((theme) => {
        if (theme && window.applyThemeColors) window.applyThemeColors(theme);
      })
      .catch(() => {});
  });
}
function _stWireTrustSafety() {
  const tsBtn = document.getElementById("trust-safety-btn");
  if (tsBtn) tsBtn.onclick = showTrustSafetyModal;
  const tsModal = document.getElementById("trust-safety-modal");
  const closeTsBtn = document.getElementById("close-trust-safety-btn");
  const closeTsX = document.getElementById("close-trust-safety-x");
  const unlockBtn = document.getElementById("ts-unlock-all-btn");
  const lockBtn = document.getElementById("ts-lock-all-btn");
  const closeTs = () => {
    if (tsModal) tsModal.classList.add("hidden");
    if (tsFocusTrap) tsFocusTrap.deactivate();
  };
  if (closeTsBtn) closeTsBtn.onclick = closeTs;
  if (closeTsX) closeTsX.onclick = closeTs;
  if (tsModal)
    tsModal.addEventListener("click", (e) => {
      if (e.target === tsModal) closeTs();
    });
  if (unlockBtn) {
    unlockBtn.addEventListener("click", async () => {
      unlockBtn.disabled = true;
      unlockBtn.textContent = "Unlocking…";
      try {
        const res = await invoke("unlock_sealed_records", { ids: [] });
        const statusEl = document.getElementById("ts-sealed-status");
        if (statusEl) statusEl.textContent = `Unlocked ${res.unlocked || 0} sealed records.`;
      } catch (e) {
        console.error(e);
      }
      unlockBtn.disabled = false;
      unlockBtn.textContent = "🔓 Unlock All Sealed";
    });
  }
  if (lockBtn) {
    lockBtn.addEventListener("click", async () => {
      lockBtn.disabled = true;
      lockBtn.textContent = "Locking…";
      try {
        await invoke("lock_all_sealed");
        const statusEl = document.getElementById("ts-sealed-status");
        if (statusEl) statusEl.textContent = "All sealed records are now locked.";
      } catch (e) {
        console.error(e);
      }
      lockBtn.disabled = false;
      lockBtn.textContent = "🔒 Lock All Sealed";
    });
  }
}

function _stWirePrivacyPanel() {
  const saveDefaultBtn = document.getElementById("privacy-default-save-btn");
  const unlockBtn = document.getElementById("settings-unlock-sealed-btn");
  const lockBtn = document.getElementById("settings-lock-sealed-btn");
  const statusEl = document.getElementById("settings-privacy-status");

  const _loadPrivacyBreakdown = async () => {
    try {
      const stats = await invoke("get_dashboard_stats");
      const pb = stats.privacy_breakdown || {};
      const els = {
        standard: document.getElementById("settings-privacy-standard"),
        private: document.getElementById("settings-privacy-private"),
        sensitive: document.getElementById("settings-privacy-sensitive"),
        sealed: document.getElementById("settings-privacy-sealed"),
      };
      if (els.standard) els.standard.textContent = String(pb.standard ?? 0);
      if (els.private) els.private.textContent = String(pb.private ?? 0);
      if (els.sensitive) els.sensitive.textContent = String(pb.sensitive ?? 0);
      if (els.sealed) els.sealed.textContent = String(pb.sealed ?? 0);
    } catch (e) {
      console.error(e);
    }
  };

  // Load breakdown when privacy panel becomes active
  document.querySelectorAll('.stv-nav-item[data-panel="sp-privacy"]').forEach((btn) => {
    btn.addEventListener("click", () => _loadPrivacyBreakdown());
  });

  if (saveDefaultBtn) {
    saveDefaultBtn.addEventListener("click", () => {
      const select = document.getElementById("privacy-default-select");
      if (select) {
        localStorage.setItem("privacy_default_level", select.value);
        if (statusEl) statusEl.textContent = `Default privacy set to ${select.value}.`;
      }
    });
    // Restore saved default
    const saved = localStorage.getItem("privacy_default_level");
    if (saved) {
      const select = document.getElementById("privacy-default-select");
      if (select) select.value = saved;
    }
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", async () => {
      unlockBtn.disabled = true;
      try {
        const res = await invoke("unlock_sealed_records", { ids: [] });
        if (statusEl) statusEl.textContent = `Unlocked ${res.unlocked || 0} sealed records.`;
        await _loadPrivacyBreakdown();
      } catch (e) {
        if (statusEl) statusEl.textContent = String(e);
      }
      unlockBtn.disabled = false;
    });
  }
  if (lockBtn) {
    lockBtn.addEventListener("click", async () => {
      lockBtn.disabled = true;
      try {
        await invoke("lock_all_sealed");
        if (statusEl) statusEl.textContent = "All sealed records are now locked.";
        await _loadPrivacyBreakdown();
      } catch (e) {
        if (statusEl) statusEl.textContent = String(e);
      }
      lockBtn.disabled = false;
    });
  }
}

// ==========================================================================
// Permission Profiles UI
// ==========================================================================

const PERM_CAPABILITIES = [
  { key: "shell_exec", label: "Shell Execution", desc: "Run code" },
  { key: "file_system_read", label: "File Read", desc: "Read outside workspace" },
  { key: "file_system_write", label: "File Write", desc: "Write outside workspace" },
  { key: "network", label: "Network", desc: "External APIs" },
  { key: "browser", label: "Browser", desc: "Web automation" },
  { key: "computer", label: "Computer", desc: "Desktop automation" },
  { key: "memory_read", label: "Memory Read", desc: "Search context" },
  { key: "memory_write", label: "Memory Write", desc: "Store context" },
  { key: "plugin_load", label: "Plugins", desc: "Load Lua scripts" },
];

let _permProfilesCache = null;

async function _stLoadPermissionProfiles() {
  try {
    const config = await invoke("get_config");
    const registry = config.security?.permission_registry;
    if (!registry) return;
    _permProfilesCache = registry;
    _stRenderPermissionProfiles(registry);
  } catch (e) {
    console.error("Failed to load permission profiles:", e);
  }
}

function _stRenderPermissionProfiles(registry) {
  const container = document.getElementById("permission-profiles-list");
  if (!container) return;
  container.innerHTML = "";

  const defaultId = registry.default_profile_id;
  const profiles = registry.profiles || [];

  profiles.forEach((profile) => {
    const isDefault = profile.id === defaultId;
    const grantedSet = new Set(profile.granted || []);
    const capLabels =
      PERM_CAPABILITIES.filter((c) => grantedSet.has(c.key))
        .map((c) => c.label)
        .join(", ") || "None";

    const card = document.createElement("div");
    card.style.cssText =
      "border: 1px solid rgba(148,163,184,0.12); border-radius: 8px; padding: 12px; background: rgba(15,23,42,0.4);";
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">${_escHtml(profile.name)} ${isDefault ? '<span style="font-size:0.7rem; color:var(--response-color); margin-left:6px;">DEFAULT</span>' : ""}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">${_escHtml(profile.description || "")}</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="perm-profile-edit stv-btn-ghost" data-id="${_escHtml(profile.id)}" type="button" style="padding: 2px 8px; font-size: 0.7rem;">Edit</button>
          ${!isDefault ? `<button class="perm-profile-del stv-btn-ghost" data-id="${_escHtml(profile.id)}" type="button" style="padding: 2px 8px; font-size: 0.7rem; color: var(--error-color);">Delete</button>` : ""}
          ${!isDefault ? `<button class="perm-profile-default stv-btn-ghost" data-id="${_escHtml(profile.id)}" type="button" style="padding: 2px 8px; font-size: 0.7rem;">Set Default</button>` : ""}
        </div>
      </div>
      <div style="font-size: 0.72rem; color: var(--text-dim);">Capabilities: ${capLabels}</div>
    `;
    container.appendChild(card);
  });

  // Wire buttons
  container.querySelectorAll(".perm-profile-edit").forEach((btn) => {
    btn.onclick = () => _stOpenPermEdit(btn.dataset.id);
  });
  container.querySelectorAll(".perm-profile-del").forEach((btn) => {
    btn.onclick = () => _stDeletePermProfile(btn.dataset.id);
  });
  container.querySelectorAll(".perm-profile-default").forEach((btn) => {
    btn.onclick = () => _stSetDefaultPermProfile(btn.dataset.id);
  });
}

function _escHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function _stOpenPermEdit(profileId) {
  const registry = _permProfilesCache;
  if (!registry) return;
  const profile = (registry.profiles || []).find((p) => p.id === profileId);
  if (!profile && profileId !== "__new__") return;

  const modal = document.getElementById("permission-profile-edit-modal");
  const titleEl = document.getElementById("perm-edit-title");
  const idInput = document.getElementById("perm-edit-id");
  const nameInput = document.getElementById("perm-edit-name");
  const descInput = document.getElementById("perm-edit-desc");
  const capsContainer = document.getElementById("perm-edit-capabilities");

  const isNew = profileId === "__new__";
  titleEl.textContent = isNew ? "New Permission Profile" : `Edit ${profile.name}`;
  idInput.value = isNew ? "" : profile.id;
  nameInput.value = isNew ? "" : profile.name;
  descInput.value = isNew ? "" : profile.description || "";

  const grantedSet = new Set(isNew ? [] : profile.granted || []);
  capsContainer.innerHTML = PERM_CAPABILITIES.map(
    (cap) => `
    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; cursor: pointer; padding: 4px; border-radius: 4px; background: rgba(148,163,184,0.06);">
      <input type="checkbox" class="perm-cap-checkbox" value="${cap.key}" ${grantedSet.has(cap.key) ? "checked" : ""} />
      <span title="${cap.desc}">${cap.label}</span>
    </label>
  `
  ).join("");

  modal.classList.remove("hidden");
}

function _stClosePermEdit() {
  const modal = document.getElementById("permission-profile-edit-modal");
  if (modal) modal.classList.add("hidden");
}

async function _stSavePermEdit() {
  const idInput = document.getElementById("perm-edit-id");
  const nameInput = document.getElementById("perm-edit-name");
  const descInput = document.getElementById("perm-edit-desc");
  const checkboxes = document.querySelectorAll(".perm-cap-checkbox:checked");

  const id =
    idInput.value.trim() ||
    nameInput.value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
  if (!id) {
    alert("Profile ID is required");
    return;
  }
  const name = nameInput.value.trim() || id;
  const description = descInput.value.trim();
  const granted = Array.from(checkboxes).map((cb) => cb.value);

  try {
    await invoke("set_permission_profile", { id, name, description, granted });
    _stClosePermEdit();
    await _stLoadPermissionProfiles();
  } catch (e) {
    alert("Save failed: " + e);
  }
}

async function _stDeletePermProfile(id) {
  if (!confirm(`Delete permission profile "${id}"?`)) return;
  try {
    await invoke("delete_permission_profile", { id });
    await _stLoadPermissionProfiles();
  } catch (e) {
    alert("Delete failed: " + e);
  }
}

async function _stSetDefaultPermProfile(id) {
  try {
    await invoke("set_default_permission_profile", { id });
    await _stLoadPermissionProfiles();
  } catch (e) {
    alert("Set default failed: " + e);
  }
}

function _stInitPermissionProfiles() {
  const addBtn = document.getElementById("permission-profile-add-btn");
  const cancelBtn = document.getElementById("perm-edit-cancel");
  const saveBtn = document.getElementById("perm-edit-save");

  if (addBtn) addBtn.onclick = () => _stOpenPermEdit("__new__");
  if (cancelBtn) cancelBtn.onclick = _stClosePermEdit;
  if (saveBtn) saveBtn.onclick = _stSavePermEdit;

  // Load when privacy panel is shown
  document.querySelectorAll('.stv-nav-item[data-panel="sp-privacy"]').forEach((btn) => {
    btn.addEventListener("click", () => _stLoadPermissionProfiles());
  });

  // Initial load if privacy panel is already active
  const privacyPanel = document.getElementById("sp-privacy");
  if (privacyPanel && privacyPanel.classList.contains("active")) {
    _stLoadPermissionProfiles();
  }
}

export function initSettings() {
  if (typeof renderBackgroundGallery === "function") renderBackgroundGallery();
  applySettings();
  initSettingsSidebar();
  activateSettingsPanel(localStorage.getItem("settingsActivePanel") || "sp-general");
  const userInput = document.getElementById("user-input");
  if (userInput) userInput.focus();
  _stWireAppearanceInputs();
  _stWireLlmSettings();
  initCustomThemes();
  initMcpSettings();
  initDocRag();
  initMemoryDb();
  initBmadInstaller();
  initWhisperSettings();
  initSyncSettings();
  initLspSettings();
  _stWireShellSwitcher();
  _stWireTerminalSettings();
  _stWireSettingsModal();
  _stWireLegacyThemeSelect();
  _stWireTrustSafety();
  initCustomPersonas();
  initModelsPanel();
  _stWirePrivacyPanel();
  _stInitPermissionProfiles();
}

// =============================================================================
// Model Library Panel — HuggingFace Model Downloader
// =============================================================================

function _modelsWireSubTabs() {
  document.querySelectorAll(".stv-sub-tab[data-models-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.modelsTab;
      if (tabName === "browser") {
        if (settingsOverlay) settingsOverlay.classList.remove("active");
        if (settingsFocusTrap) settingsFocusTrap.deactivate();
        const mainBrowserTab = document.querySelector('.nav-tab[data-view="browser"]');
        if (mainBrowserTab) mainBrowserTab.click();
        if (window.browserNavigateTo) window.browserNavigateTo("https://huggingface.co/models");
        return;
      }
      document
        .querySelectorAll(".stv-sub-tab[data-models-tab]")
        .forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".models-tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = document.getElementById(`models-tab-${tabName}`);
      if (panel) panel.classList.add("active");
      if (tabName === "installed") refreshInstalledModels();
      if (tabName === "downloads") refreshDownloadsList();
    });
  });
}

function _modelsWireDelegation() {
  const browseGrid = document.getElementById("models-browse-grid");
  if (browseGrid) {
    browseGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-repo][data-file]");
      if (!btn) return;
      const { repo, file } = btn.dataset;
      if (repo && file) startModelDownload(repo, file, btn);
    });
  }
  const downloadsList = document.getElementById("models-downloads-list");
  if (downloadsList) {
    downloadsList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (btn?.dataset.cancel) cancelModelDownload(btn.dataset.cancel);
    });
  }
  const installedList = document.getElementById("models-installed-list");
  if (installedList) {
    installedList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-repo]");
      if (!btn) return;
      const { deleteRepo: repo, deleteFile: file } = btn.dataset;
      if (repo && file) deleteInstalledModel(repo, file);
    });
  }
}

function initModelsPanel() {
  _modelsWireSubTabs();
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      applyModelFilter(chip.dataset.filter);
    });
  });
  const searchBtn = document.getElementById("models-search-btn");
  const searchInput = document.getElementById("models-search-input");
  if (searchBtn)
    searchBtn.addEventListener("click", () => {
      const q = searchInput?.value?.trim() || "";
      if (q) performModelSearch(q);
    });
  if (searchInput)
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = searchInput.value.trim();
        if (q) performModelSearch(q);
      }
    });
  _modelsWireDelegation();
  initHfBrowser();
  if (typeof listen === "function")
    listen("hf_download_progress", (event) => updateDownloadProgress(event.payload)).catch(
      () => {}
    );
}

function _hfWireNav(iframe, urlInput, backBtn, fwdBtn, refreshBtn, homeBtn, goBtn, HOME_URL) {
  const navigateTo = (url) => {
    if (!url.startsWith("http")) url = "https://" + url;
    iframe.src = url;
    if (urlInput) urlInput.value = url;
  };
  backBtn?.addEventListener("click", () => {
    try {
      iframe.contentWindow.history.back();
    } catch (_) {}
  });
  fwdBtn?.addEventListener("click", () => {
    try {
      iframe.contentWindow.history.forward();
    } catch (_) {}
  });
  refreshBtn?.addEventListener("click", () => {
    iframe.src = iframe.src;
  });
  homeBtn?.addEventListener("click", () => navigateTo(HOME_URL));
  goBtn?.addEventListener("click", () => navigateTo(urlInput?.value?.trim() || HOME_URL));
  if (urlInput)
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        goBtn?.click();
      }
    });
}

function _hfIframeLoad(iframe, urlInput, downloadBtn, statusEl) {
  iframe.addEventListener("load", () => {
    try {
      const url = iframe.contentWindow?.location?.href || iframe.src;
      if (urlInput) urlInput.value = url;
      const match = url.match(/huggingface\.co\/([^\/]+)\/([^\/\?#]+)/);
      if (match && downloadBtn) {
        const [, org, model] = match;
        if (!["datasets", "spaces", "docs", "blog"].includes(org)) {
          downloadBtn.disabled = false;
          downloadBtn.dataset.repo = `${org}/${model}`;
          if (statusEl)
            statusEl.innerHTML = `<span>Model detected: <strong>${org}/${model}</strong> — click Download to fetch GGUF files.</span>`;
          return;
        }
      }
      if (downloadBtn) {
        downloadBtn.disabled = true;
        delete downloadBtn.dataset.repo;
      }
      if (statusEl)
        statusEl.innerHTML = `<span>Navigate to a model page and click Download to fetch GGUF files.</span>`;
    } catch (_) {
      if (statusEl)
        statusEl.innerHTML = `<span>Browsing ${escapeHtml(String(iframe.src)).slice(0, 80)}…</span>`;
    }
  });
}

function initHfBrowser() {
  const iframe = document.getElementById("hf-browser-iframe");
  const urlInput = document.getElementById("hf-browser-url");
  const downloadBtn = document.getElementById("hf-browser-download");
  const statusEl = document.getElementById("hf-browser-status");
  if (!iframe) return;
  const HOME_URL = "https://huggingface.co/models";
  _hfWireNav(
    iframe,
    urlInput,
    document.getElementById("hf-browser-back"),
    document.getElementById("hf-browser-forward"),
    document.getElementById("hf-browser-refresh"),
    document.getElementById("hf-browser-home"),
    document.getElementById("hf-browser-go"),
    HOME_URL
  );
  _hfIframeLoad(iframe, urlInput, downloadBtn, statusEl);
  downloadBtn?.addEventListener("click", () => {
    const repo = downloadBtn.dataset.repo;
    if (!repo) return;
    switchToBrowseTabAndSearch(repo);
    if (statusEl)
      statusEl.innerHTML = `<span>Switched to Browse tab — search results for <strong>${repo}</strong> loading…</span>`;
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

export function switchToBrowseTabAndSearch(repo) {
  const browseTab = document.querySelector('.stv-sub-tab[data-models-tab="browse"]');
  if (browseTab) browseTab.click();

  const searchInput = document.getElementById("models-search-input");
  if (searchInput) {
    searchInput.value = repo;
    performModelSearch(repo);
  }
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
          f.parameters === "1.7B"
      )
    );
  } else if (filter === "3b") {
    filtered = _cachedModels.filter((m) =>
      m.gguf_files.some(
        (f) => f.parameters === "2B" || f.parameters === "3B" || f.parameters === "3.8B"
      )
    );
  } else if (filter === "7b") {
    filtered = _cachedModels.filter((m) =>
      m.gguf_files.some((f) => f.parameters === "4B" || f.parameters === "7B")
    );
  } else if (filter === "all") {
    // Show all cached
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="models-empty-state"><p>No models match this filter.</p></div>';
    return;
  }
  renderModelGrid(filtered);
}

function renderModelGrid(models) {
  const grid = document.getElementById("models-browse-grid");
  if (!grid) return;

  if (!models || models.length === 0) {
    grid.innerHTML = '<div class="models-empty-state"><p>No models found.</p></div>';
    return;
  }

  grid.innerHTML = "";
  models.forEach((model) => {
    const card = document.createElement("div");
    card.className = "model-card";

    const sdBadge = model.steam_deck_compat ? '<span class="sd-badge">Steam Deck</span>' : "";

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
      const downloadsTab = document.querySelector('.stv-sub-tab[data-models-tab="downloads"]');
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
        list.innerHTML = '<div class="models-empty-state"><p>No active downloads.</p></div>';
        return;
      }
      list.innerHTML = "";
      tasks.forEach((task) => {
        const row = document.createElement("div");
        row.className = "download-row";
        row.dataset.downloadId = task.id;

        const pct =
          task.total_bytes > 0 ? Math.round((task.bytes_downloaded / task.total_bytes) * 100) : 0;
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
                          task.status === "Downloading" || task.status === "Pending"
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
      addNotification("Download complete", `${payload.repo_id}/${payload.filename}`, "success");
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
