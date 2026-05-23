import { state } from './state.js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { 
    restartTerminalSession, 
    renderSshProfilesSettings, 
    renderFtpProfilesSettings, 
    renderSftpProfilesSettings 
} from './terminal.js';

let settingsOverlay = null;
let settingsBtn = null;
let closeSettings = null;
let closeSettingsX = null;

// ==========================================================================
// SETTINGS AND PERSISTENCE IMPLEMENTATION
// ==========================================================================
function applySettings() {
    // 1. Font Style
    const font = localStorage.getItem("selectedFont") || "inter";
    const fontSelect = document.getElementById("font-select");
    if (fontSelect) fontSelect.value = font;
    const fontClasses = ["font-inter", "font-outfit", "font-jetbrains", "font-vt323", "font-sharetech", "font-orbitron", "font-pressstart"];
    fontClasses.forEach(cls => document.body.classList.remove(cls));
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
    document.querySelectorAll(".bg-gallery-card").forEach(c => {
        const cardId = c.getAttribute("data-id");
        const cardUrl = c.getAttribute("data-url");
        let isActive = false;
        if (bgUrl.startsWith("live:")) {
            const liveType = bgUrl.substring(5);
            isActive = (cardId === liveType && (cardUrl === null || cardUrl === undefined));
        } else {
            if (!bgUrl) {
                isActive = (!cardUrl && !cardId);
            } else {
                isActive = (cardUrl === bgUrl);
            }
        }
        if (isActive) {
            c.classList.add("active");
        } else {
            c.classList.remove("active");
        }
    });

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
    const scrollback = scrollbackValStr !== null ? parseInt(scrollbackValStr, 10) : 2000;
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
    const ollamaModelsSec = document.getElementById("settings-ollama-models-section");
    if (provider === "gemini") {
        if (geminiGroup) geminiGroup.style.display = "block";
        if (ollamaGroup) ollamaGroup.style.display = "none";
        if (ollamaLabel) ollamaLabel.style.display = "none";
        if (ollamaModelsSec) ollamaModelsSec.style.display = "none";
    } else {
        if (geminiGroup) geminiGroup.style.display = "none";
        if (ollamaGroup) ollamaGroup.style.display = "block";
        if (ollamaLabel) ollamaLabel.style.display = "block";
        if (ollamaModelsSec) {
            ollamaModelsSec.style.display = "block";
            refreshOllamaModels();
        }
    }
}

function handleLlmProviderChange() {
    toggleSettingsLlmGroups(this.value);
}

function handleTestConnectionClick() {
    const provider = document.getElementById("llm-provider-select")?.value;
    const geminiKey = document.getElementById("settings-gemini-key")?.value.trim();
    const geminiModel = document.getElementById("settings-gemini-model")?.value.trim();
    const ollamaUrl = document.getElementById("settings-ollama-url")?.value.trim();
    const ollamaModel = document.getElementById("settings-ollama-model")?.value.trim();

    const statusEl = document.getElementById("settings-llm-status");
    if (statusEl) {
        statusEl.style.color = "var(--accent-color)";
        statusEl.innerText = "Connecting & testing...";
    }

    const model = provider === "gemini" ? geminiModel : ollamaModel;
    const url = provider === "gemini" ? "" : ollamaUrl;

    invoke("test_llm_connection", { provider, model, url, key: geminiKey })
        .then(res => {
            if (statusEl) {
                statusEl.style.color = "var(--response-color)";
                statusEl.innerText = res;
            }
        })
        .catch(err => {
            if (statusEl) {
                statusEl.style.color = "var(--error-color)";
                statusEl.innerText = `Error: ${err}`;
            }
        });
}

function handleSaveLlmClick() {
    const provider = document.getElementById("llm-provider-select")?.value;
    const geminiKey = document.getElementById("settings-gemini-key")?.value.trim();
    const geminiModel = document.getElementById("settings-gemini-model")?.value.trim();
    const ollamaUrl = document.getElementById("settings-ollama-url")?.value.trim();
    const ollamaModel = document.getElementById("settings-ollama-model")?.value.trim();

    const statusEl = document.getElementById("settings-llm-status");
    if (statusEl) {
        statusEl.style.color = "var(--accent-color)";
        statusEl.innerText = "Applying changes...";
    }

    const saveKeyPromise = geminiKey 
        ? invoke("save_gemini_api_key", { key: geminiKey })
        : Promise.resolve();

    saveKeyPromise
        .then(() => invoke("set_config", { key: "llm.default_provider", value: provider }))
        .then(() => invoke("set_config", { key: "llm.gemini_model", value: geminiModel }))
        .then(() => invoke("set_config", { key: "llm.ollama_base_url", value: ollamaUrl }))
        .then(() => invoke("set_config", { key: "llm.ollama_model", value: ollamaModel }))
        .then(() => {
            if (statusEl) {
                statusEl.style.color = "var(--response-color)";
                statusEl.innerText = "Config updated and applied!";
            }
            const activeModelName = provider === "gemini" ? geminiModel : ollamaModel;
            document.getElementById("model-name").innerText = `[ MODEL: ${activeModelName.toUpperCase()} ]`;
            
            if (typeof updateContextDrawer === "function") {
                updateContextDrawer();
            }
        })
        .catch(err => {
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
function initSettingsSidebar() {
    document.querySelectorAll(".stv-nav-item").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".stv-nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const panel = document.getElementById(btn.dataset.panel);
            if (panel) panel.classList.add("active");
        };
    });
}

function openSettingsModal() {
    if (settingsOverlay) settingsOverlay.classList.add("active");
    
    // Clear status text
    const statusEl = document.getElementById("settings-llm-status");
    if (statusEl) statusEl.innerText = "";

    // Load active LLM config and API key
    Promise.all([
        invoke("get_config"),
        invoke("get_gemini_api_key")
    ]).then(([config, apiKey]) => {
        const providerSelect = document.getElementById("llm-provider-select");
        const geminiKeyInput = document.getElementById("settings-gemini-key");
        const geminiModelInput = document.getElementById("settings-gemini-model");
        const ollamaUrlInput = document.getElementById("settings-ollama-url");
        const ollamaModelInput = document.getElementById("settings-ollama-model");

        if (providerSelect) providerSelect.value = config.llm.default_provider;
        if (geminiKeyInput) geminiKeyInput.value = apiKey;
        if (geminiModelInput) geminiModelInput.value = config.llm.gemini_model;
        if (ollamaUrlInput) ollamaUrlInput.value = config.llm.ollama_base_url;
        if (ollamaModelInput) ollamaModelInput.value = config.llm.ollama_model;

        toggleSettingsLlmGroups(config.llm.default_provider);
    }).catch(err => {
        console.error("Error loading LLM config in settings:", err);
    });

    // Populate personas
    if (typeof refreshSettingsPersonaDropdown === 'function') {
        refreshSettingsPersonaDropdown();
    }
    
    // Populate themes
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
        }
    });
    
    renderSshProfilesSettings();
    renderFtpProfilesSettings();
    renderSftpProfilesSettings();
    if (typeof loadPluginsList === 'function') {
        loadPluginsList();
    }
    if (typeof loadCustomPersonas === 'function') {
        loadCustomPersonas();
    }
    if (window._customThemes) {
        window._customThemes.renderList();
        window._customThemes.refreshThemeSelect();
    }
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
    
    invoke("list_custom_personas").then((personas) => {
        if (personas.length === 0) {
            listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic; padding: 5px;">No custom personas found.</div>`;
            return;
        }
        
        listEl.innerHTML = personas.map((p) => {
            return `
                <div class="ssh-profile-item" style="padding: 6px 8px; background: rgba(255,255,255,0.02); border-radius: 4px; border: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px;">
                    <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-start; overflow: hidden;">
                        <span style="font-weight: 500; color: var(--foreground-color);">${p.name}</span>
                        <span style="font-size: 0.7rem; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;" title="${p.prompt.replace(/"/g, '&quot;')}">${p.prompt}</span>
                    </div>
                    <button class="canvas-btn persona-delete-btn" data-name="${p.name}" style="padding: 3px 8px; font-size: 0.75rem; border-color: var(--error-color); color: var(--error-color);">✕</button>
                </div>
            `;
        }).join("");
        
        // Wire delete button listeners
        listEl.querySelectorAll(".persona-delete-btn").forEach(btn => {
            btn.onclick = () => {
                const name = btn.getAttribute("data-name");
                if (confirm(`Are you sure you want to delete custom persona '${name}'?`)) {
                    const statusEl = document.getElementById("settings-persona-status");
                    if (statusEl) statusEl.innerText = "Deleting custom persona...";
                    
                    invoke("delete_custom_persona", { name }).then(() => {
                        if (statusEl) statusEl.innerText = `Custom persona '${name}' deleted successfully.`;
                        loadCustomPersonas();
                        refreshSettingsPersonaDropdown();
                    }).catch(err => {
                        if (statusEl) statusEl.innerText = `Failed to delete: ${err}`;
                    });
                }
            };
        });
    }).catch(err => {
        listEl.innerHTML = `<div style="color: var(--error-color); padding: 5px;">Failed to load custom personas: ${err}</div>`;
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

            invoke("add_custom_persona", { name, prompt }).then(() => {
                if (statusEl) statusEl.innerText = `Persona '${name}' created successfully!`;
                nameInput.value = "";
                promptInput.value = "";
                loadCustomPersonas();
                refreshSettingsPersonaDropdown();
            }).catch((err) => {
                if (statusEl) statusEl.innerText = `Failed to create: ${err}`;
            }).finally(() => {
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
        try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
        catch (_) { return []; }
    }

    function saveThemes(themes) {
        localStorage.setItem(LS_KEY, JSON.stringify(themes));
        if (window.__TAURI_INTERNALS__) {
            invoke("save_custom_themes", { data: JSON.stringify(themes) }).catch(() => {});
        }
    }

    // Seed from disk if localStorage is empty
    if (window.__TAURI_INTERNALS__) {
        invoke("load_custom_themes").then(raw => {
            if (raw && raw !== "[]" && !localStorage.getItem(LS_KEY)) {
                localStorage.setItem(LS_KEY, raw);
                refreshThemeSelect();
            }
        }).catch(() => {});
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
            container.innerHTML = '<div style="opacity:0.5; font-style:italic;">No custom themes saved yet.</div>';
            return;
        }
        container.innerHTML = "";
        themes.forEach((t, idx) => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; gap:8px; padding:5px 6px; background:rgba(255,255,255,0.03); border-radius:4px;";

            const swatch = document.createElement("div");
            swatch.style.cssText = `width:16px; height:16px; border-radius:3px; background:${t.accent}; border:1px solid rgba(255,255,255,0.15); flex-shrink:0;`;

            const name = document.createElement("span");
            name.style.cssText = "flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
            name.textContent = t.name;

            const applyBtn = document.createElement("button");
            applyBtn.textContent = "Apply";
            applyBtn.className = "send-prompt-btn";
            applyBtn.style.cssText = "margin:0; height:22px; padding:0 8px; font-size:0.7rem; justify-content:center;";
            applyBtn.onclick = () => {
                applyThemeObj(t);
                if (typeof addNotification === "function") {
                    addNotification("Theme Applied", `"${t.name}" is now active.`, "success");
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
            delBtn.textContent = "✕";
            delBtn.className = "canvas-btn";
            delBtn.style.cssText = "height:22px; padding:0 6px; font-size:0.7rem; border-color:var(--error-color);";
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
        invoke("get_themes").then(themes => {
            const sel = document.getElementById("theme-select");
            if (!sel) return;
            const savedTheme = localStorage.getItem("selectedTheme");
            sel.innerHTML = "";
            // Hardcoded themes group
            const group1 = document.createElement("optgroup");
            group1.label = "Built-in";
            themes.forEach(t => {
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
                customThemes.forEach(t => {
                    const opt = document.createElement("option");
                    opt.value = t.name;
                    opt.textContent = t.name;
                    if (t.name === savedTheme) opt.selected = true;
                    group2.appendChild(opt);
                });
                sel.appendChild(group2);
            }
        }).catch(() => {});
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
            if (el && inp) el.style.background = inp.value;
        });
    }

    // Wire color picker preview
    ["ct-bg","ct-fg","ct-accent","ct-response","ct-warning","ct-error"].forEach(id => {
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
                if (s) { s.textContent = "Enter a theme name."; setTimeout(() => { s.textContent = ""; }, 2000); }
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
            const themes = loadThemes().filter(t => t.name !== name); // replace if exists
            themes.push(theme);
            saveThemes(themes);
            renderList();
            refreshThemeSelect();
            const s = document.getElementById("ct-status");
            if (s) { s.textContent = `"${name}" saved!`; setTimeout(() => { s.textContent = ""; }, 2500); }
            if (typeof addNotification === "function") {
                addNotification("Theme Saved", `"${name}" added to custom themes.`, "success");
            }
        });
    }

    // Patch theme-select onchange to handle custom themes
    const origOnchange = document.getElementById("theme-select")?.onchange;
    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) {
        themeSelect.onchange = function () {
            const val = this.value;
            const custom = loadThemes().find(t => t.name === val);
            if (custom) {
                applyThemeObj(custom);
                localStorage.setItem("selectedTheme", val);
            } else if (origOnchange) {
                origOnchange.call(this);
            } else {
                invoke("set_theme", { name: val }).then(theme => {
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
    const stopBtn  = document.getElementById("mcp-stop-btn");
    const portInput = document.getElementById("mcp-port-input");
    const statusLine = document.getElementById("mcp-status-line");
    const toolsInfo = document.getElementById("mcp-tools-info");
    const claudeConfig = document.getElementById("mcp-claude-config");
    const configSnippet = document.getElementById("mcp-claude-config-snippet");

    if (!startBtn) return;

    function setRunningUI(port) {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusLine.innerHTML = `<span style="color: var(--response-color);">● Running</span> &nbsp;·&nbsp; <a href="http://127.0.0.1:${port}" style="color: var(--accent-color); text-decoration: none;" onclick="return false;">http://127.0.0.1:${port}</a>`;
        toolsInfo.style.display = "block";
        claudeConfig.style.display = "block";
        if (configSnippet) {
            configSnippet.textContent = JSON.stringify({
                mcpServers: {
                    neurodeck: {
                        url: `http://127.0.0.1:${port}/`
                    }
                }
            }, null, 2);
        }
    }

    function setStoppedUI() {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusLine.textContent = "Server is not running.";
        toolsInfo.style.display = "none";
        claudeConfig.style.display = "none";
    }

    // Sync UI on settings modal open
    document.getElementById("settings-btn") && document.getElementById("settings-btn").addEventListener("click", async () => {
        try {
            const status = await invoke("get_mcp_status");
            if (status.running === "true") {
                portInput.value = status.port || "13337";
                setRunningUI(status.port);
            } else {
                setStoppedUI();
            }
        } catch (_) { setStoppedUI(); }
    });

    startBtn.addEventListener("click", async () => {
        const port = parseInt(portInput.value, 10) || 13337;
        startBtn.disabled = true;
        statusLine.textContent = "Starting...";
        try {
            const msg = await invoke("start_mcp_server", { port });
            setRunningUI(port);
            if (typeof addNotification === "function") {
                addNotification("MCP Server Started", `Listening on port ${port}. Add to Claude Desktop config.`, "success");
            }
        } catch (err) {
            statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
            startBtn.disabled = false;
        }
    });

    stopBtn.addEventListener("click", async () => {
        stopBtn.disabled = true;
        try {
            await invoke("stop_mcp_server");
            setStoppedUI();
            if (typeof addNotification === "function") {
                addNotification("MCP Server Stopped", "The MCP server has been shut down.", "info");
            }
        } catch (err) {
            statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
            stopBtn.disabled = false;
        }
    });

    // Init state on load
    invoke("get_mcp_status").then(status => {
        if (status && status.running === "true") {
            portInput.value = status.port || "13337";
            setRunningUI(status.port);
        } else {
            setStoppedUI();
        }
    }).catch(() => setStoppedUI());
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

    // Load current doc count on open
    invoke("get_doc_count").then(count => {
        if (docCount) docCount.innerText = count || 0;
    }).catch(() => {});

    // Listen for progress events
    listen("doc_index_progress", (event) => {
        let data;
        try { data = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload; }
        catch { return; }

        const { indexed, total, file, done } = data;

        if (progressContainer) progressContainer.style.display = "block";

        if (done) {
            if (progressLabel) progressLabel.innerText = "Complete!";
            if (progressPct) progressPct.innerText = "100%";
            if (progressBar) progressBar.style.width = "100%";
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = "none";
                if (indexBtn) indexBtn.disabled = false;
                invoke("get_doc_count").then(c => { if (docCount) docCount.innerText = c || 0; }).catch(() => {});
            }, 1200);
        } else {
            const pct = total > 0 ? Math.round((indexed / total) * 100) : 0;
            if (progressLabel) progressLabel.innerText = file ? `Indexing: ${file}` : `Indexing... (${indexed}/${total})`;
            if (progressPct) progressPct.innerText = `${pct}%`;
            if (progressBar) progressBar.style.width = `${pct}%`;
        }
    }).catch(() => {});

    indexBtn.addEventListener("click", async () => {
        const folder = folderInput ? folderInput.value.trim() : "";
        if (!folder) {
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--warning-color);">Enter a folder path to index.</span>`;
            return;
        }
        indexBtn.disabled = true;
        if (statusLine) statusLine.innerHTML = `<span style="opacity: 0.7;">Starting indexer...</span>`;
        if (progressContainer) progressContainer.style.display = "block";
        if (progressBar) progressBar.style.width = "0%";
        if (progressPct) progressPct.innerText = "0%";
        if (progressLabel) progressLabel.innerText = "Scanning folder...";

        try {
            const result = await invoke("index_directory", { path: folder });
            const count = typeof result === "number" ? `Indexed ${result} document${result !== 1 ? "s" : ""}.` : result;
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--response-color);">${count}</span>`;
            if (typeof addNotification === "function") {
                addNotification("RAG Index Complete", count, "success");
            }
            invoke("get_doc_count").then(c => { if (docCount) docCount.innerText = c || 0; }).catch(() => {});
        } catch (err) {
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
        } finally {
            indexBtn.disabled = false;
        }
    });

    clearBtn.addEventListener("click", async () => {
        try {
            const result = await invoke("clear_doc_index");
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--accent-color);">${result}</span>`;
            if (docCount) docCount.innerText = "0";
            if (typeof addNotification === "function") {
                addNotification("RAG Index Cleared", "All indexed documents removed from memory.", "info");
            }
        } catch (err) {
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
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
            statusLine.textContent = "✓ " + msg;
            addNotification("BMAD Installed", `Framework installed to ${dir}`, "success");
        } catch (err) {
            statusLine.style.color = "var(--error-color)";
            statusLine.textContent = "Error: " + err;
        } finally {
            installBtn.disabled = false;
        }
    };

    if (docsBtn) {
        docsBtn.onclick = () => invoke("open_external", { url: "https://bmadcode.com/" }).catch(() => {});
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
            if (statusLine) statusLine.innerHTML = `<span style="opacity:0.6;">Downloading ${model}...</span>`;

            const unlisten = await listen("whisper_download_progress", (event) => {
                let data;
                try { data = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload; }
                catch { return; }
                const { done, pct, path, skipped } = data;
                if (dlPct) dlPct.textContent = `${pct || 0}%`;
                if (dlBar) dlBar.style.width = `${pct || 0}%`;
                if (done) {
                    unlisten();
                    if (dlWrap) dlWrap.style.display = "none";
                    downloadBtn.disabled = false;
                    if (path) {
                        if (modelInput) modelInput.value = path;
                        if (statusLine) statusLine.innerHTML = `<span style="color:var(--response-color);">✓ ${skipped ? "Model already exists" : "Downloaded"}: ${path}<br>Click Save Config to activate.</span>`;
                        if (typeof addNotification === "function") {
                            addNotification("Whisper Model Ready", `ggml-${model}.bin downloaded.`, "success");
                        }
                    }
                } else {
                    if (dlLabel) dlLabel.textContent = skipped ? "Already downloaded" : `Downloading ggml-${model}.bin...`;
                }
            }).catch(() => () => {});

            try {
                await invoke("download_whisper_model", { model });
            } catch (err) {
                unlisten();
                downloadBtn.disabled = false;
                if (dlWrap) dlWrap.style.display = "none";
                if (statusLine) statusLine.innerHTML = `<span style="color:var(--error-color);">Download failed: ${err}</span>`;
            }
        });
    }

    // Load current config on modal open
    invoke("get_whisper_status").then(status => {
        if (status) {
            if (binaryInput) binaryInput.value = status.binary || '';
            if (modelInput) modelInput.value = status.model || '';
            if (status.configured) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--response-color);">✓ Whisper configured and ready.</span>`;
            } else if (status.model) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--warning-color);">⚠ Model file not found at configured path.</span>`;
            }
        }
    }).catch(() => {});

    saveBtn.addEventListener("click", async () => {
        const binary = binaryInput ? binaryInput.value.trim() : '';
        const model = modelInput ? modelInput.value.trim() : '';
        try {
            await invoke("set_whisper_config", { binary, model });
            const status = await invoke("get_whisper_status");
            if (status.configured) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--response-color);">✓ Saved. Whisper ready — mic button will use offline STT.</span>`;
                if (typeof addNotification === "function") {
                    addNotification("Whisper STT Configured", "Offline transcription is now active.", "success");
                }
            } else if (!status.model_exists) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--warning-color);">Saved, but model file not found at that path.</span>`;
            } else if (!status.binary_found) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--warning-color);">Saved, but whisper binary not found. Check the path.</span>`;
            } else {
                if (statusLine) statusLine.innerHTML = `<span style="opacity: 0.6;">Config saved.</span>`;
            }
        } catch (err) {
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
        }
    });

    testBtn.addEventListener("click", async () => {
        if (statusLine) statusLine.innerHTML = `<span style="opacity: 0.6;">Transcribing record.wav...</span>`;
        testBtn.disabled = true;
        try {
            const text = await invoke("transcribe_audio_whisper");
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--response-color);">Result: "${text}"</span>`;
        } catch (err) {
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
        } finally {
            testBtn.disabled = false;
        }
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
    toggleSettingsLlmGroups
};

export function initSettings() {
    if (typeof renderBackgroundGallery === "function") {
        renderBackgroundGallery();
    }
    applySettings();
    initSettingsSidebar();

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

    const shellSelect = document.getElementById("shell-select");
    if (shellSelect) shellSelect.onchange = handleShellSelect;

    document.getElementById("llm-provider-select")?.addEventListener("change", handleLlmProviderChange);
    document.getElementById("settings-test-connection-btn")?.addEventListener("click", handleTestConnectionClick);
    document.getElementById("settings-save-llm-btn")?.addEventListener("click", handleSaveLlmClick);

    initCustomThemes();
    initMcpSettings();
    initDocRag();
    initBmadInstaller();
    initWhisperSettings();

    // Shell Switcher (terminal top bar)
    document.querySelectorAll(".term-shell-btn").forEach(pill => {
        pill.onclick = function() {
            const shell = this.getAttribute("data-shell");
            document.querySelectorAll(".term-shell-btn").forEach(p => p.classList.remove("active"));
            this.classList.add("active");
            localStorage.setItem("selectedShell", shell === "default" ? "default" : shell);
            // Also sync the settings dropdown
            const shellSelect = document.getElementById("shell-select");
            if (shellSelect) {
                const option = shellSelect.querySelector(`option[value="${shell}"]`);
                if (option) shellSelect.value = shell;
            }
            // Update shell for the active session and restart it
            if (state.activeTerminalSessionId) {
                const session = state.terminalSessions.find(s => s.id === state.activeTerminalSessionId);
                if (session) {
                    session.shell = shell === "default" ? null : shell;
                    restartTerminalSession(state.activeTerminalSessionId);
                }
            }
        };
    });

    // Sync shell buttons on load
    const savedShell = localStorage.getItem("selectedShell") || "default";
    const pill = document.querySelector(`.term-shell-btn[data-shell="${savedShell}"]`);
    if (pill) {
        document.querySelectorAll(".term-shell-btn").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
    }

    const customShellInput = document.getElementById("custom-shell-input");
    if (customShellInput) {
        customShellInput.oninput = function() {
            localStorage.setItem("customShell", this.value);
            applySettings();
        };
    }

    const termFontSizeSlider = document.getElementById("term-fontsize-slider");
    if (termFontSizeSlider) {
        termFontSizeSlider.oninput = function() {
            localStorage.setItem("terminalFontSize", this.value);
            applySettings();
        };
    }

    const termScrollbackInput = document.getElementById("term-scrollback-input");
    if (termScrollbackInput) {
        termScrollbackInput.oninput = function() {
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
        closeSettings.onclick = function() {
            if (settingsOverlay) settingsOverlay.classList.remove("active");
        };
    }

    if (closeSettingsX) {
        closeSettingsX.onclick = function() {
            if (settingsOverlay) settingsOverlay.classList.remove("active");
        };
    }

    initCustomPersonas();
}
