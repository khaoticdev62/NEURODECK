import { state, wireDragAndDrop } from './state.js';
import { invoke } from './neurobridge.js';
import { listen } from './neurobridge.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { createIcon } from './icons.js';
import { addNotification } from './notifications.js';
import { FocusTrap } from './focus-trap.js';

// --- PTY TERMINAL SYSTEM ---
// let terminalSessions = []; (Moved to state.js) // list of { id, shell, term, fitAddon, containerEl }
// let activeTerminalSessionId = null; (Moved to state.js)
// let ptySessionId = null; (Moved to state.js) // compatibility pointer for active session id
const MAX_TERMINAL_SESSIONS = 5;

function iconButtonMarkup(icon, label, extraClass = "", iconOnly = false) {
    const classes = [iconOnly ? "nd-icon-button nd-icon-only" : "nd-icon-button", extraClass].filter(Boolean).join(" ");
    const labelMarkup = iconOnly ? "" : `<span class="nd-button-label">${window.sanitizeHtml(label)}</span>`;
    return `<span class="${classes}">${createIcon(icon, { size: 14 })}${labelMarkup}</span>`;
}

function profileActionButton(className, index, icon, label, { danger = false, iconOnly = false } = {}) {
    const style = danger ? "padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;color:#ff6b81;" : "padding:3px 8px;font-size:0.75rem;";
    const title = window.sanitizeHtml(label);
    return `<button class="canvas-btn ${className}" style="${style}" data-index="${index}" title="${title}" aria-label="${title}">${iconButtonMarkup(icon, label, "", iconOnly)}</button>`;
}

function getActiveShellPath() {
    const selectedShell = localStorage.getItem("selectedShell") || "default";
    if (selectedShell === "default") {
        return null;
    }
    if (selectedShell === "custom") {
        const custom = localStorage.getItem("customShell") || "";
        return custom.trim() !== "" ? custom.trim() : null;
    }
    return selectedShell;
}

function syncShellPillsForSession(shell) {
    const targetShell = shell || "default";
    document.querySelectorAll(".term-shell-btn").forEach(p => {
        p.classList.toggle("active", p.getAttribute("data-shell") === targetShell);
    });
}

function createXtermInstance(containerEl, fontSize, scrollback = 2000) {
    const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'var(--font-mono)',
        fontSize: fontSize,
        scrollback: scrollback,
        theme: {
            background: getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim() || '#000000',
            foreground: getComputedStyle(document.documentElement).getPropertyValue('--fg-color').trim() || '#e2e8f0',
            cursor: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#00F0FF',
            selectionBackground: 'rgba(255, 255, 255, 0.15)'
        }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerEl);

    try {
        fitAddon.fit();
    } catch (e) {
        console.warn("Could not fit xterm immediately:", e);
    }
    return { term, fitAddon };
}

function createTerminalSession(shellPath) {
    if (state.terminalSessions.length >= MAX_TERMINAL_SESSIONS) {
        addNotification('Tab Limit Reached', `Maximum of ${MAX_TERMINAL_SESSIONS} active terminal tabs allowed.`, 'warning');
        return;
    }

    const container = document.getElementById("pty-terminal-container");
    if (!container) return;

    const id = "pty_session_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const shell = shellPath !== undefined ? shellPath : getActiveShellPath();

    // Create container div for this terminal
    const containerEl = document.createElement("div");
    containerEl.className = "pty-terminal-instance";
    containerEl.id = `pty-terminal-instance-${id}`;
    containerEl.style.display = "none"; // hidden until switched to
    container.appendChild(containerEl);

    // Initialize xterm
    const savedFontSizeStr = localStorage.getItem("terminalFontSize");
    const fontSize = savedFontSizeStr !== null ? parseInt(savedFontSizeStr, 10) : 14;
    const savedScrollbackStr = localStorage.getItem("terminalScrollback");
    const scrollback = savedScrollbackStr !== null ? parseInt(savedScrollbackStr, 10) : 2000;

    const { term, fitAddon } = createXtermInstance(containerEl, fontSize, scrollback);

    // Spawn Backend PTY
    const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
    invoke("pty_spawn", {
        id: id,
        cols: dims.cols,
        rows: dims.rows,
        shell: shell
    }).then(() => {
        term.write("\r\n\x1b[1;36mNEURODECK Interactive Shell Started\x1b[0m\r\n");
    }).catch(err => {
        term.write(`\r\n\x1b[1;31mError starting PTY: ${err}\x1b[0m\r\n`);
    });

    term.onData(data => {
        invoke("pty_write", { id: id, data: data }).catch(err => {
            console.error("PTY Write error:", err);
        });
    });

    const sessionObj = { id, shell, term, fitAddon, containerEl };
    state.terminalSessions.push(sessionObj);

    // Wire up Category B autocomplete if the function is already defined
    if (typeof patchTerminalSessionWithAutocomplete === "function") {
        patchTerminalSessionWithAutocomplete(sessionObj);
    }

    renderTerminalTabs();
    switchTerminalSession(id);
}

function switchTerminalSession(id) {
    const session = state.terminalSessions.find(s => s.id === id);
    if (!session) return;

    // Clear any pending autocomplete from the previous session
    if (typeof clearAutocompleteGhost === "function") clearAutocompleteGhost();

    state.activeTerminalSessionId = id;
    state.ptySessionId = id; // update for backwards compatibility

    // Update globals for resize handler
    window.ptyTerminal = session.term;
    window.ptyTerminalFitAddon = session.fitAddon;

    // Toggle display of containers
    state.terminalSessions.forEach(s => {
        if (s.id === id) {
            s.containerEl.style.display = "block";
            // Refit
            setTimeout(() => {
                try {
                    s.fitAddon.fit();
                    const dims = s.fitAddon.proposeDimensions();
                    if (dims) {
                        invoke("pty_resize", { id: s.id, cols: dims.cols, rows: dims.rows }).catch(console.error);
                    }
                } catch (e) {}
                s.term.focus();
            }, 50);
        } else {
            s.containerEl.style.display = "none";
        }
    });

    // Update tab bar buttons active state
    const list = document.getElementById("terminal-tabs-list");
    if (list) {
        list.querySelectorAll(".terminal-tab").forEach(btn => {
            const btnId = btn.getAttribute("data-session-id");
            if (btnId === id) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    // Update shell pills to match this session's shell
    syncShellPillsForSession(session.shell);
}

function closeTerminalSession(id) {
    if (state.terminalSessions.length <= 1) {
        restartTerminalSession(id);
        return;
    }

    const idx = state.terminalSessions.findIndex(s => s.id === id);
    if (idx === -1) return;

    const sessionObj = state.terminalSessions[idx];

    // Kill backend process
    invoke("pty_kill", { id: id }).catch(() => {});

    // Dispose xterm
    try {
        sessionObj.term.dispose();
    } catch (e) {}

    // Remove container from DOM
    sessionObj.containerEl.remove();

    // Remove from array
    state.terminalSessions.splice(idx, 1);

    renderTerminalTabs();

    // Switch to another active tab
    if (state.activeTerminalSessionId === id) {
        const nextActiveIdx = Math.max(0, idx - 1);
        const nextSession = state.terminalSessions[nextActiveIdx];
        if (nextSession) {
            switchTerminalSession(nextSession.id);
        }
    }
}

function restartTerminalSession(id) {
    const session = state.terminalSessions.find(s => s.id === id);
    if (!session) return;

    session.term.write("\r\n\x1b[1;33mRestarting shell session...\x1b[0m\r\n");
    // Brief delay after kill lets the old reader thread exit before the new
    // one starts, preventing a transient window where both emit pty_output
    // events on the same session ID and corrupt the terminal display.
    invoke("pty_kill", { id: id }).catch(() => {}).then(() => new Promise(r => setTimeout(r, 150))).then(() => {
        const dims = session.fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
        invoke("pty_spawn", {
            id: id,
            cols: dims.cols,
            rows: dims.rows,
            shell: session.shell
        }).then(() => {
            session.term.write("\r\n\x1b[1;36mNEURODECK Interactive Shell Started\x1b[0m\r\n");
        }).catch(err => {
            session.term.write(`\r\n\x1b[1;31mError starting PTY: ${err}\x1b[0m\r\n`);
        });
    });
}

function renderTerminalTabs() {
    const list = document.getElementById("terminal-tabs-list");
    if (!list) return;

    if (!state.terminalSessions.length) {
        list.innerHTML = `
            <div class="terminal-tab active terminal-tab--placeholder" aria-disabled="true">
                <span class="terminal-tab-label">${createIcon("squareTerminal", { size: 14 })}<span>Shell initializing</span></span>
            </div>
        `;
        return;
    }

    list.innerHTML = state.terminalSessions.map((s, idx) => {
        const defaultLabel = `Shell ${idx + 1}`;
        const label = s.name || defaultLabel;
        const activeClass = s.id === state.activeTerminalSessionId ? "active" : "";
        return `
            <div class="terminal-tab ${activeClass}" data-session-id="${s.id}">
                <span class="terminal-tab-label" data-session-id="${s.id}" title="Double-click to rename">${createIcon("squareTerminal", { size: 14 })}<span>${window.sanitizeHtml(label)}</span></span>
                <button class="terminal-tab-close" data-session-id="${s.id}" aria-label="Close terminal tab">${createIcon("x", { size: 12 })}</button>
            </div>
        `;
    }).join("");

    // Tab clicks
    list.querySelectorAll(".terminal-tab").forEach(tab => {
        tab.onclick = (e) => {
            if (e.target.classList.contains("terminal-tab-close")) return;
            if (e.target.tagName === "INPUT") return;
            const sid = tab.getAttribute("data-session-id");
            switchTerminalSession(sid);
        };
    });

    // Double-click tab label to rename
    list.querySelectorAll(".terminal-tab-label").forEach(lbl => {
        lbl.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            const sid = lbl.getAttribute("data-session-id");
            const session = state.terminalSessions.find(s => s.id === sid);
            if (!session) return;
            const input = document.createElement("input");
            input.value = lbl.textContent;
            input.style.cssText = "width:80px;background:rgba(0,0,0,0.6);border:1px solid var(--accent-color);color:inherit;border-radius:3px;padding:1px 4px;font-size:0.75rem;font-family:var(--font-mono);outline:none;";
            lbl.replaceWith(input);
            input.focus();
            input.select();
            const commit = () => { const n = input.value.trim(); if (n) session.name = n; renderTerminalTabs(); };
            input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") { ev.preventDefault(); commit(); }
                if (ev.key === "Escape") { renderTerminalTabs(); }
            });
            input.addEventListener("blur", commit);
        });
    });

    // Close clicks
    list.querySelectorAll(".terminal-tab-close").forEach(closeBtn => {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            const sid = closeBtn.getAttribute("data-session-id");
            closeTerminalSession(sid);
        };
    });
}

function initPtyTerminal() {
    if (state.terminalSessions.length > 0) {
        if (state.activeTerminalSessionId) {
            switchTerminalSession(state.activeTerminalSessionId);
        }
        return;
    }

    const addBtn = document.getElementById("terminal-add-tab-btn");
    if (addBtn) {
        addBtn.onclick = () => {
            createTerminalSession();
        };
    }

    const reconnectBtn = document.getElementById("pty-reconnect-btn");
    if (reconnectBtn) {
        reconnectBtn.onclick = () => {
            if (state.activeTerminalSessionId) restartTerminalSession(state.activeTerminalSessionId);
        };
    }

    // Font size controls — apply to all live sessions immediately
    const fontDecBtn = document.getElementById("term-font-dec-btn");
    const fontIncBtn = document.getElementById("term-font-inc-btn");
    function adjustFontSize(delta) {
        const current = parseInt(localStorage.getItem("terminalFontSize") || "14", 10);
        const next = Math.min(24, Math.max(8, current + delta));
        localStorage.setItem("terminalFontSize", String(next));
        state.terminalSessions.forEach(s => {
            s.term.options.fontSize = next;
            try { s.fitAddon.fit(); } catch (_) {}
        });
        const slider = document.getElementById("term-fontsize-slider");
        if (slider) slider.value = String(next);
    }
    if (fontDecBtn) fontDecBtn.onclick = () => adjustFontSize(-1);
    if (fontIncBtn) fontIncBtn.onclick = () => adjustFontSize(1);

    // Clear screen — sends Ctrl+L to the active PTY
    const clearBtn = document.getElementById("term-clear-btn");
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (state.activeTerminalSessionId) {
                invoke("pty_write", { id: state.activeTerminalSessionId, data: "\x0C" }).catch(() => {});
            }
        };
    }

    createTerminalSession();
}

window.addEventListener("resize", () => {
    // Resize all active terminal sessions to fit their respective windows
    state.terminalSessions.forEach(s => {
        try {
            s.fitAddon.fit();
            const dims = s.fitAddon.proposeDimensions();
            if (dims) {
                invoke("pty_resize", { id: s.id, cols: dims.cols, rows: dims.rows }).catch(err => {
                    console.error("PTY resize error:", err);
                });
            }
        } catch (e) {}
    });
});

listen("pty_output", (event) => {
    const payload = event.payload;
    const session = state.terminalSessions.find(s => s.id === payload.id);
    if (session) {
        session.term.write(payload.data);
    } else if (payload.id === state.sshSessionId && window.sshTerminal) {
        window.sshTerminal.write(payload.data);
        
        const passInput = document.getElementById("ssh-pass-input");
        const authType = document.getElementById("ssh-auth-type")?.value || "password";
        if (authType === "password" && passInput && passInput.value) {
            const lowerData = payload.data.toLowerCase();
            if (lowerData.includes("password:") || (lowerData.includes("password") && lowerData.trim().endsWith(":"))) {
                if (!window._sshPasswordSent) {
                    window._sshPasswordSent = true;
                    invoke("pty_write", { id: state.sshSessionId, data: passInput.value + "\n" }).catch(err => {
                        console.error("SSH auto-password feeding failed:", err);
                    });
                }
            }
        }
    }
});

listen("pty_exit", (event) => {
    const id = event.payload?.id ?? event.payload;
    const session = state.terminalSessions.find(s => s.id === id);
    if (session) {
        session.term.write("\r\n\x1b[1;31m[Shell Session Exited]\x1b[0m\r\n");
        addNotification("Shell Exited", "Session '" + id + "' has terminated.", "warning");
    } else if (id === state.sshSessionId) {
        window.sshTerminal?.write("\r\n\x1b[1;31m[SSH Session Disconnected]\x1b[0m\r\n");
        setSshStatus(false, "Disconnected");
        state.sshSessionId = null;
        addNotification("SSH Disconnected", "SSH session has terminated.", "warning");
    }
});

// ==========================================================================
// CATEGORY B: SCREENSHOT VISION BRIDGE
// ==========================================================================

function initScreenshotVision() {
    const screenshotBtn = document.getElementById("screenshot-btn");
    if (!screenshotBtn) return;

    screenshotBtn.addEventListener("click", async () => {
        // If we already have a screenshot attachment, remove it
        const existingIdx = window.pendingAttachments?.findIndex(a => a.name === 'screenshot.png');
        if (existingIdx !== undefined && existingIdx >= 0) {
            window.pendingAttachments.splice(existingIdx, 1);
            if (typeof renderAttachmentBar === 'function') renderAttachmentBar();
            return;
        }

        screenshotBtn.style.opacity = "0.5";
        screenshotBtn.disabled = true;

        try {
            const result = await invoke("read_last_screenshot");
            window.pendingAttachments = window.pendingAttachments || [];
            window.pendingAttachments.push({
                id: 'att-screenshot-' + Date.now(),
                name: result.path ? result.path.split(/[\\/]/).pop() : 'screenshot.png',
                size: result.data ? Math.round(result.data.length * 0.75) : 0,
                mime: result.mime || 'image/png',
                kind: 'image',
                data: result.data,
            });
            if (typeof renderAttachmentBar === 'function') renderAttachmentBar();
            screenshotBtn.classList.add("has-attachment");

            if (typeof addNotification === "function") {
                addNotification("Screenshot attached", "Vision context added to next message.", "success");
                if (typeof state !== 'undefined' && state.activeProvider === 'ollama') {
                    setTimeout(() => {
                        addNotification("Provider Warning", "Vision requires the Gemini provider. Switch in Settings -> LLM.", "warning");
                    }, 500);
                }
            }
        } catch (err) {
            console.error("[Screenshot] Error:", err);
            if (typeof addNotification === "function") {
                addNotification("Screenshot Error", String(err), "error");
            }
        } finally {
            screenshotBtn.style.opacity = "";
            screenshotBtn.disabled = false;
        }
    });
}

// ==========================================================================
// CATEGORY B: AI SHELL HISTORY SEARCH (Ctrl+H)
// ==========================================================================

let historySearchOpen = false;
let historySearchResults = [];
let historySearchSelectedIdx = -1;
let historySearchDebounce = null;
let historySearchFocusTrap = null;

function openHistorySearch() {
    const overlay = document.getElementById("history-search-overlay");
    if (!overlay) return;
    historySearchOpen = true;
    historySearchSelectedIdx = -1;
    historySearchResults = [];
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    if (!historySearchFocusTrap) historySearchFocusTrap = new FocusTrap(overlay);
    historySearchFocusTrap.activate();
    setTimeout(() => {
        const input = document.getElementById("history-search-input");
        if (input) { input.value = ""; input.focus(); }
        const body = document.getElementById("history-search-body");
        if (body) body.innerHTML = '<div class="history-empty-state">Start typing to search your shell history with AI</div>';
    }, 30);
}

function closeHistorySearch() {
    const overlay = document.getElementById("history-search-overlay");
    if (overlay) { overlay.classList.add("hidden"); overlay.setAttribute("aria-hidden", "true"); }
    historySearchOpen = false;
    historySearchResults = [];
    historySearchSelectedIdx = -1;
    if (historySearchFocusTrap) historySearchFocusTrap.deactivate();
}

function renderHistoryResults(results) {
    const body = document.getElementById("history-search-body");
    if (!body) return;

    if (results.length === 0) {
        body.innerHTML = '<div class="history-empty-state">No matching commands found</div>';
        historySearchSelectedIdx = -1;
        return;
    }

    body.innerHTML = "";
    results.forEach((cmd, idx) => {
        const item = document.createElement("div");
        item.className = "history-result-item" + (idx === historySearchSelectedIdx ? " selected" : "");
        item.dataset.idx = idx;
        item.innerHTML = `
            <span class="history-result-rank">${idx + 1}</span>
            <span class="history-result-cmd"></span>
            <span class="history-result-insert-hint">↵ Insert</span>
        `;
        const cmdEl = item.querySelector(".history-result-cmd");
        cmdEl.textContent = cmd;
        cmdEl.title = cmd;
        item.addEventListener("click", () => {
            insertHistoryCommand(cmd);
        });
        item.addEventListener("mouseenter", () => {
            historySearchSelectedIdx = idx;
            updateHistorySelection();
        });
        body.appendChild(item);
    });
}

function updateHistorySelection() {
    const body = document.getElementById("history-search-body");
    if (!body) return;
    const items = body.querySelectorAll(".history-result-item");
    items.forEach((item, idx) => {
        item.classList.toggle("selected", idx === historySearchSelectedIdx);
    });
    // Scroll selected into view
    if (historySearchSelectedIdx >= 0 && historySearchSelectedIdx < items.length) {
        items[historySearchSelectedIdx].scrollIntoView({ block: "nearest" });
    }
}

function insertHistoryCommand(cmd) {
    // Insert into the active PTY terminal session
    const activeSession = (typeof state.terminalSessions !== "undefined") ?
        state.terminalSessions.find(s => s.id === state.activeTerminalSessionId) : null;

    if (activeSession && activeSession.term) {
        // Write the command to the active PTY terminal
        invoke("pty_write", { id: activeSession.id, data: cmd }).catch(console.error);
        closeHistorySearch();
        // Switch to terminal view
        const termTab = document.querySelector('.nav-tab[data-view="terminal"]');
        if (termTab) termTab.click();
        if (typeof addNotification === "function") {
            addNotification("Command Inserted", `→ ${cmd.substring(0, 50)}${cmd.length > 50 ? '…' : ''}`, "success");
        }
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(cmd).then(() => {
            if (typeof addNotification === "function") {
                addNotification("Copied to Clipboard", "No active terminal. Command copied.", "info");
            }
        }).catch(() => {});
        closeHistorySearch();
    }
}

async function performHistorySearch(query) {
    const statusEl = document.getElementById("history-search-status");
    const body = document.getElementById("history-search-body");

    if (!query.trim()) {
        if (body) body.innerHTML = '<div class="history-empty-state">Start typing to search your shell history with AI</div>';
        if (statusEl) statusEl.textContent = "Press Enter to search • Esc to close";
        return;
    }

    if (body) body.innerHTML = '<div class="history-ai-loading">AI is searching history…</div>';
    if (statusEl) statusEl.textContent = "Searching…";

    try {
        const results = await invoke("search_history_ai", { query });
        historySearchResults = results;
        historySearchSelectedIdx = results.length > 0 ? 0 : -1;
        renderHistoryResults(results);
        if (statusEl) statusEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
        updateHistorySelection();
    } catch (err) {
        console.error("[History Search] Error:", err);
        if (body) body.innerHTML = `<div class="history-empty-state" style="color:var(--error-color);">Error: ${err}</div>`;
        if (statusEl) statusEl.textContent = "Error occurred";
    }
}

// History search input event wiring (DOM already exists at this point)
function wireHistorySearchInput() {
    const hsInput = document.getElementById("history-search-input");
    if (hsInput) {
        hsInput.addEventListener("keydown", (e) => {
            if (!historySearchOpen) return;
            if (e.key === "Escape") {
                e.preventDefault();
                closeHistorySearch();
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (historySearchSelectedIdx >= 0 && historySearchResults[historySearchSelectedIdx]) {
                    insertHistoryCommand(historySearchResults[historySearchSelectedIdx]);
                } else {
                    // Submit search
                    clearTimeout(historySearchDebounce);
                    performHistorySearch(hsInput.value);
                }
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                historySearchSelectedIdx = Math.min(historySearchSelectedIdx + 1, historySearchResults.length - 1);
                updateHistorySelection();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                historySearchSelectedIdx = Math.max(historySearchSelectedIdx - 1, 0);
                updateHistorySelection();
            }
        });

        hsInput.addEventListener("input", () => {
            clearTimeout(historySearchDebounce);
            historySearchDebounce = setTimeout(() => {
                performHistorySearch(hsInput.value);
            }, 500);
        });
    }
}

// Click outside to close
document.addEventListener("click", (e) => {
    if (!historySearchOpen) return;
    const overlay = document.getElementById("history-search-overlay");
    const panel = overlay && overlay.querySelector(".history-search-panel");
    if (panel && !panel.contains(e.target)) {
        closeHistorySearch();
    }
});

// Global keyboard shortcut Ctrl+H from terminal view
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "h" && !historySearchOpen) {
        // Only trigger if we're in the terminal view or terminal is focused
        const terminalView = document.getElementById("view-terminal");
        const isTerminalActive = terminalView && terminalView.classList.contains("active");
        if (isTerminalActive) {
            e.preventDefault();
            openHistorySearch();
        }
    }
    if (e.key === "Escape" && historySearchOpen) {
        e.preventDefault();
        closeHistorySearch();
    }
});

// ==========================================================================
// CATEGORY B: AI TERMINAL AUTOCOMPLETE (Ctrl+Space)
// ==========================================================================

let autocompleteGhostText = null;
let autocompleteDebounce = null;
let autocompleteActive = false;

function clearAutocompleteGhost() {
    autocompleteGhostText = null;
    autocompleteActive = false;
    const statusBar = document.getElementById("autocomplete-status-bar");
    if (statusBar) statusBar.classList.remove("visible");
}

function showAutocompleteGhost(completion) {
    if (!completion) { clearAutocompleteGhost(); return; }
    autocompleteGhostText = completion;
    autocompleteActive = true;

    let statusBar = document.getElementById("autocomplete-status-bar");
    if (!statusBar) {
        statusBar = document.createElement("div");
        statusBar.id = "autocomplete-status-bar";
        statusBar.className = "autocomplete-status-bar";
        const container = document.getElementById("pty-terminal-container");
        if (container) container.appendChild(statusBar);
    }
    statusBar.innerHTML = `⚡ <strong>${completion}</strong><span class="ac-key-hint">→ Accept &nbsp; Esc Dismiss</span>`;
    statusBar.classList.add("visible");
}

function triggerAutocomplete(sessionId, buffer) {
    if (!buffer || !buffer.trim()) { clearAutocompleteGhost(); return; }
    clearTimeout(autocompleteDebounce);
    autocompleteDebounce = setTimeout(async () => {
        try {
            const completion = await invoke("get_terminal_autocomplete", { partial: buffer.trim() });
            if (completion && completion.trim()) {
                showAutocompleteGhost(completion);
            } else {
                clearAutocompleteGhost();
            }
        } catch (err) {
            console.warn("[Autocomplete] Error:", err);
            clearAutocompleteGhost();
        }
    }, 100);
}

function handleTerminalCtrlH(e) {
    if (e.ctrlKey && e.key === "h" && e.type === "keydown") {
        e.preventDefault();
        if (typeof openHistorySearch === "function") openHistorySearch();
        return false;
    }
    return true;
}

// Hook into xterm onKey to intercept Ctrl+Space and RightArrow when ghost text is visible.
// We patch createTerminalSession to add the key handler after session creation.
const _origCreateTerminalSession = window.createTerminalSession;

function _termAutoOnData(data, buf) {
    if (data === "\r" || data === "\n") { buf.line = ""; clearAutocompleteGhost(); return; }
    if (data === "\x7f" || data === "\b") { buf.line = buf.line.slice(0, -1); clearAutocompleteGhost(); return; }
    if (data === "\x03" || data === "\x1b") { buf.line = ""; clearAutocompleteGhost(); return; }
    if (data === "\x00" || (data === " " && autocompleteActive)) { /* Ctrl+Space / space-while-active placeholder */ }
    if (data.length === 1 && data.charCodeAt(0) >= 32) { buf.line += data; clearAutocompleteGhost(); }
}

function _termAutoKeyHandler(e, session, buf) {
    if (!handleTerminalCtrlH(e)) return false;
    if (e.code === "Tab" && !autocompleteActive && e.type === "keydown") {
        e.preventDefault();
        triggerAutocomplete(session.id, buf.line);
        return false;
    }
    if (autocompleteActive && autocompleteGhostText && e.type === "keydown") {
        if (e.code === "ArrowRight" || e.code === "Tab" || (e.ctrlKey && e.key === "y")) {
            e.preventDefault();
            const ghost = autocompleteGhostText;
            clearAutocompleteGhost();
            buf.line += ghost;
            invoke("pty_write", { id: session.id, data: ghost }).catch(console.error);
            return false;
        }
        if (e.code === "Escape") { clearAutocompleteGhost(); return true; }
    }
    return true;
}

function patchTerminalSessionWithAutocomplete(session) {
    if (!session || !session.term) return;
    const buf = { line: "" };
    session.term.onData(data => _termAutoOnData(data, buf));
    session.term.attachCustomKeyEventHandler(e => _termAutoKeyHandler(e, session, buf));
}

// ==========================================================================
// SSH CLIENT SYSTEM
// ==========================================================================

// let sshSessionId = null; (Moved to state.js)

function initSshTerminal() {
    const container = document.getElementById("ssh-terminal-container");
    if (!container) return;
    container.innerHTML = "";

    const savedFontSize = parseInt(localStorage.getItem("terminalFontSize") || "14", 10);
    const { term, fitAddon } = createXtermInstance(container, savedFontSize, 2000);
    window.sshTerminal = term;
    window.sshTerminalFitAddon = fitAddon;

    term.attachCustomKeyEventHandler((e) => {
        if (!handleTerminalCtrlH(e)) return false;
        return true;
    });

    term.onData(data => {
        if (state.sshSessionId) {
            invoke("pty_write", { id: state.sshSessionId, data }).catch(console.error);
        }
    });
    term.write("\x1b[1;36mNEURODECK SSH Client\x1b[0m — Enter connection details and click Connect.\r\n");
}

function setSshStatus(connected, text) {
    const dot = document.getElementById("ssh-status-dot");
    const label = document.getElementById("ssh-status-text");
    if (dot) {
        dot.className = `ssh-status-dot ${connected ? "connected" : "disconnected"}`;
    }
    if (label) label.textContent = text;
    const disconnectBtn = document.getElementById("ssh-disconnect-btn");
    if (disconnectBtn) {
        disconnectBtn.disabled = !connected;
        disconnectBtn.setAttribute("aria-disabled", String(!connected));
    }
}

function connectSsh() {
    window._sshPasswordSent = false;
    const host = document.getElementById("ssh-host-input")?.value.trim();
    const port = parseInt(document.getElementById("ssh-port-input")?.value || "22", 10);
    const user = document.getElementById("ssh-user-input")?.value.trim();
    const authType = document.getElementById("ssh-auth-type")?.value || "password";
    const keyPath = document.getElementById("ssh-key-path-input")?.value.trim();

    if (!host || !user) {
        window.sshTerminal?.write("\r\n\x1b[1;31mError: Host and Username are required.\x1b[0m\r\n");
        return;
    }

    // Kill existing session
    if (state.sshSessionId) {
        invoke("pty_kill", { id: state.sshSessionId }).catch(() => {});
        state.sshSessionId = null;
    }

    state.sshSessionId = "ssh_session_" + Date.now();
    const dims = window.sshTerminalFitAddon?.proposeDimensions() || { cols: 80, rows: 24 };

    // Use system ssh binary
    const sshBin = "ssh";
    const sshArgs = ["-o", "ConnectTimeout=30", "-p", String(port)];
    if (authType === "key" && keyPath) {
        sshArgs.push("-i", keyPath);
    }
    sshArgs.push(`${user}@${host}`);

    window.sshTerminal?.write(`\r\n\x1b[1;33mConnecting to ${user}@${host}:${port}...\x1b[0m\r\n`);
    setSshStatus(false, `Connecting to ${host}...`);

    invoke("pty_spawn", {
        id: state.sshSessionId,
        cols: dims.cols,
        rows: dims.rows,
        shell: sshBin,
        args: sshArgs
    }).then(() => {
        setSshStatus(true, `${user}@${host}:${port}`);
        addNotification("SSH Connected", "Connected to " + user + "@" + host + ".", "success");
    }).catch(err => {
        window.sshTerminal?.write(`\r\n\x1b[1;31mFailed to launch SSH: ${err}\x1b[0m\r\n`);
        setSshStatus(false, "Connection failed");
        state.sshSessionId = null;
        addNotification("SSH Failed", "Could not connect to " + host + ".", "error");
    });
}

document.getElementById("ssh-connect-btn")?.addEventListener("click", connectSsh);

document.getElementById("ssh-disconnect-btn")?.addEventListener("click", () => {
    if (state.sshSessionId) {
        invoke("pty_kill", { id: state.sshSessionId }).catch(() => {});
        state.sshSessionId = null;
    }
    window.sshTerminal?.write("\r\n\x1b[1;31m[Disconnected]\x1b[0m\r\n");
    setSshStatus(false, "Disconnected");
});

// --- SSH Profile Management ---
function getSshProfiles() {
    try { return JSON.parse(localStorage.getItem("sshProfiles") || "[]"); } catch { return []; }
}

function saveSshProfiles(profiles) {
    localStorage.setItem("sshProfiles", JSON.stringify(profiles));
    invoke("save_profiles", { key: "ssh", data: JSON.stringify(profiles) }).catch(() => {});
}

async function initSshProfilesFromDisk() {
    try {
        const raw = await invoke("load_profiles", { key: "ssh" });
        // Disk is always authoritative — overwrite localStorage unconditionally
        // so data survives WebView cache wipes on Steam Deck.
        if (raw && raw !== "[]") {
            localStorage.setItem("sshProfiles", raw);
        }
    } catch (_) {}
}

function renderSshProfiles() {
    renderConnectionProfiles("ssh");
}

function renderSshProfilesSettings() {
    renderConnectionProfilesSettings("ssh");
}

async function saveKeychainCredential(type, profileName, password) {
    if (password && window.__TAURI_INTERNALS__) {
        try {
            await invoke(`save_${type}_credential`, { profileName, password });
        } catch (err) {
            console.error(`Failed to save ${type.toUpperCase()} credential to keychain:`, err);
        }
    }
}

async function promptAndSaveProfileName(type, host, user, auth_type, password) {
    if (!host || !user) {
        addNotification("SSH Config Missing", "Enter host and username first.", "warning");
        return null;
    }
    const name = await showPrompt("Profile name:", `${user}@${host}`, { title: "Save Profile" });
    if (!name) return null;

    if (auth_type === "password") {
        await saveKeychainCredential(type, name, password);
    }
    return name;
}

function initSshProfileListeners() {
    document.getElementById("ssh-save-profile-btn")?.addEventListener("click", async () => {
        const host = document.getElementById("ssh-host-input")?.value.trim();
        const port = parseInt(document.getElementById("ssh-port-input")?.value || "22", 10);
        const user = document.getElementById("ssh-user-input")?.value.trim();
        const auth_type = document.getElementById("ssh-auth-type")?.value || "password";
        const key_path = document.getElementById("ssh-key-path-input")?.value.trim();
        const password = document.getElementById("ssh-pass-input")?.value || "";
        const name = await promptAndSaveProfileName("ssh", host, user, auth_type, password);
        if (!name) return;

        const profiles = getSshProfiles();
        profiles.push({ name, host, port, user, auth_type, key_path });
        saveSshProfiles(profiles);
        renderSshProfiles();
    });

    document.getElementById("settings-clear-ssh-profiles")?.addEventListener("click", async () => {
        if (window.__TAURI_INTERNALS__) {
            const profiles = getSshProfiles();
            for (const p of profiles) {
                try {
                    await invoke("delete_ssh_credential", { profileName: p.name });
                } catch (err) {
                    console.error("Failed to delete SSH credential from keychain:", err);
                }
            }
        }
        localStorage.removeItem("sshProfiles");
        saveSshProfiles([]);
        renderSshProfiles();
        renderSshProfilesSettings();
    });

    document.getElementById("ssh-auth-type")?.addEventListener("change", (e) => {
        const isKey = e.target.value === "key";
        const passGroup = document.getElementById("ssh-pass-group");
        const keyPathGroup = document.getElementById("ssh-key-path-group");
        if (passGroup) passGroup.style.display = isKey ? "none" : "block";
        if (keyPathGroup) keyPathGroup.style.display = isKey ? "block" : "none";
    });
}

// --- FTP Profile Management ---
function getFtpProfiles() {
    try { return JSON.parse(localStorage.getItem("ftpProfiles") || "[]"); } catch { return []; }
}

function saveFtpProfiles(profiles) {
    localStorage.setItem("ftpProfiles", JSON.stringify(profiles));
    invoke("save_profiles", { key: "ftp", data: JSON.stringify(profiles) }).catch(() => {});
}

async function initFtpProfilesFromDisk() {
    try {
        const raw = await invoke("load_profiles", { key: "ftp" });
        // Disk is always authoritative — overwrite localStorage unconditionally.
        if (raw && raw !== "[]") {
            localStorage.setItem("ftpProfiles", raw);
        }
    } catch (_) {}
}

function renderFtpProfiles() {
    renderConnectionProfiles("ftp");
}

function renderFtpProfilesSettings() {
    renderConnectionProfilesSettings("ftp");
}

function initFtpProfileListeners() {
    document.getElementById("ftp-save-profile-btn")?.addEventListener("click", async () => {
        const host = document.getElementById("ftp-host-input")?.value.trim();
        const port = parseInt(document.getElementById("ftp-port-input")?.value || "21", 10);
        const user = document.getElementById("ftp-user-input")?.value.trim();
        const path = document.getElementById("ftp-path-input")?.value.trim() || "/";
        if (!host || !user) { addNotification('SSH Config Missing', 'Enter host and username first.', 'warning'); return; }
        const name = await showPrompt("Profile name:", `${user}@${host}`, { title: "Save FTP Profile" });
        if (!name) return;
        const profiles = getFtpProfiles();
        profiles.push({ name, host, port, user, path });
        saveFtpProfiles(profiles);
        renderFtpProfiles();
    });

    document.getElementById("settings-clear-ftp-profiles")?.addEventListener("click", () => {
        localStorage.removeItem("ftpProfiles");
        saveFtpProfiles([]);
        renderFtpProfiles();
        renderFtpProfilesSettings();
    });
}

// ==========================================================================
// FTP CLIENT SYSTEM
// ==========================================================================

function getFtpInputValues() {
    return {
        host: document.getElementById("ftp-host-input")?.value.trim(),
        port: parseInt(document.getElementById("ftp-port-input")?.value || "21", 10),
        user: document.getElementById("ftp-user-input")?.value.trim(),
        password: document.getElementById("ftp-pass-input")?.value || "",
        path: document.getElementById("ftp-path-input")?.value.trim() || "/"
    };
}

function getSftpInputValues() {
    return {
        host: document.getElementById("sftp-host-input")?.value.trim(),
        port: parseInt(document.getElementById("sftp-port-input")?.value || "22", 10),
        user: document.getElementById("sftp-user-input")?.value.trim(),
        auth_type: document.getElementById("sftp-auth-type")?.value || "password",
        password: document.getElementById("sftp-pass-input")?.value || "",
        key_path: document.getElementById("sftp-key-path-input")?.value.trim(),
        path: document.getElementById("sftp-path-input")?.value.trim() || "/"
    };
}

function _buildRemoteFileItem(e, prefix) {
    const item = document.createElement("div");
    item.className = "ftp-file-item" + (e.is_dir ? " is-dir" : "");
    item.setAttribute("data-name", e.name);
    item.setAttribute("data-is-dir", e.is_dir ? "true" : "false");
    const icon = document.createElement("span");
    icon.className = "ftp-file-icon";
    icon.innerHTML = createIcon(e.is_dir ? "folder" : "file", { size: 16 });
    const nameEl = document.createElement("span");
    nameEl.className = "ftp-file-name";
    nameEl.textContent = e.name;
    const sizeEl = document.createElement("span");
    sizeEl.className = "ftp-file-size";
    sizeEl.textContent = e.is_dir ? "—" : formatBytes(e.size);
    item.append(icon, nameEl, sizeEl);
    if (!e.is_dir) {
        const btn = document.createElement("button");
        btn.className = `canvas-btn ${prefix}-download-btn`;
        btn.style.cssText = "padding:3px 8px;font-size:0.75rem;";
        btn.setAttribute("data-name", e.name);
        btn.title = "Download";
        btn.setAttribute("aria-label", `Download ${e.name}`);
        btn.innerHTML = iconButtonMarkup("download", "Download");
        item.appendChild(btn);
    }
    return item;
}

function _wireRemoteDownloadBtn(btn, isSftp) {
    btn.onclick = ev => {
        ev.stopPropagation();
        const name = btn.getAttribute("data-name");
        if (isSftp) {
            const { host, port, user, auth_type, password, key_path } = getSftpInputValues();
            const remotePath = state.sftpCurrentPath.replace(/\/$/, "") + "/" + name;
            const localPath = (localStorage.getItem("downloadDir") || "/tmp") + "/" + name;
            setSftpStatus(`Downloading ${name}...`);
            invoke("sftp_download_file", { host, port, user, authType: auth_type, password, keyPath: key_path, remotePath, localPath })
                .then(() => { setSftpStatus(`Downloaded to ${localPath}`); if (typeof addNotification === "function") addNotification("SFTP Download Complete", `Downloaded file '${name}' to: ${localPath}`, "success"); })
                .catch(err => { setSftpStatus(`Download error: ${err}`); if (typeof addNotification === "function") addNotification("SFTP Download Failed", `Failed to download file '${name}': ${err}`, "error"); });
        } else {
            const { host, port, user, password } = getFtpInputValues();
            const remotePath = state.ftpCurrentPath.replace(/\/$/, "") + "/" + name;
            const localPath = (localStorage.getItem("downloadDir") || "/tmp") + "/" + name;
            setFtpStatus(`Downloading ${name}...`);
            invoke("ftp_download_file", { host, port, user, password, remotePath, localPath })
                .then(() => { setFtpStatus(`Downloaded to ${localPath}`); if (typeof addNotification === "function") addNotification("FTP Download Complete", `Downloaded file '${name}' to: ${localPath}`, "success"); })
                .catch(err => { setFtpStatus(`Download error: ${err}`); if (typeof addNotification === "function") addNotification("FTP Download Failed", `Failed to download file '${name}': ${err}`, "error"); });
        }
    };
}

function renderRemoteFiles(type, entries) {
    const isSftp = type === "sftp";
    const prefix = isSftp ? "sftp" : "ftp";
    const list = document.getElementById(`${prefix}-file-list`);
    if (!list) return;
    if (!entries || entries.length === 0) { list.innerHTML = `<div class="ftp-empty-state">Directory is empty.</div>`; return; }
    list.innerHTML = "";
    entries.forEach(e => list.appendChild(_buildRemoteFileItem(e, prefix)));
    list.querySelectorAll(".ftp-file-item.is-dir").forEach(item => {
        item.style.cursor = "pointer";
        item.onclick = () => {
            const name = item.getAttribute("data-name");
            if (isSftp) { state.sftpCurrentPath = state.sftpCurrentPath.replace(/\/$/, "") + "/" + name; loadSftpDir(state.sftpCurrentPath); }
            else { state.ftpCurrentPath = state.ftpCurrentPath.replace(/\/$/, "") + "/" + name; loadFtpDir(state.ftpCurrentPath); }
        };
    });
    list.querySelectorAll(`.${prefix}-download-btn`).forEach(btn => _wireRemoteDownloadBtn(btn, isSftp));
}

function getConnectionTypeMappers(type) {
    if (type === "ssh") {
        return {
            getProfilesFn: getSshProfiles,
            saveProfilesFn: saveSshProfiles,
            delCredentialFnName: "delete_ssh_credential",
            updateFn1: renderSshProfilesSettings,
            updateFn2: renderSshProfiles
        };
    }
    if (type === "ftp") {
        return {
            getProfilesFn: getFtpProfiles,
            saveProfilesFn: saveFtpProfiles,
            delCredentialFnName: null,
            updateFn1: renderFtpProfilesSettings,
            updateFn2: renderFtpProfiles
        };
    }
    if (type === "sftp") {
        return {
            getProfilesFn: getSftpProfiles,
            saveProfilesFn: fn_sftp_save_profiles,
            delCredentialFnName: "delete_sftp_credential",
            updateFn1: renderSftpProfilesSettings,
            updateFn2: renderSftpProfiles
        };
    }
    return {};
}

async function deleteProfile(type, index) {
    const { getProfilesFn, saveProfilesFn, delCredentialFnName, updateFn1, updateFn2 } = getConnectionTypeMappers(type);
    if (!getProfilesFn) return;
    
    const currentProfiles = getProfilesFn();
    const p = currentProfiles[index];
    if (p && delCredentialFnName && window.__TAURI_INTERNALS__) {
        try {
            await invoke(delCredentialFnName, { profileName: p.name });
        } catch (err) {
            console.error(`Failed to delete credential from keychain:`, err);
        }
    }
    currentProfiles.splice(index, 1);
    saveProfilesFn(currentProfiles);
    updateFn1();
    updateFn2();
}

async function _sshLoadProfile(p) {
    const $ = id => document.getElementById(id);
    $("ssh-host-input").value = p.host || "";
    $("ssh-port-input").value = p.port || "22";
    $("ssh-user-input").value = p.user || "";
    $("ssh-auth-type").value = p.auth_type || "password";
    $("ssh-key-path-input").value = p.key_path || "";
    $("ssh-auth-type").dispatchEvent(new Event("change"));
    $("ssh-pass-input").value = "";
    if (p.auth_type === "password" && window.__TAURI_INTERNALS__) {
        try { const pwd = await invoke("get_ssh_credential", { profileName: p.name }); if (pwd) $("ssh-pass-input").value = pwd; }
        catch (err) { console.error("Failed to load SSH credential from keychain:", err); }
    }
}

function _ftpLoadProfile(p) {
    const $ = id => document.getElementById(id);
    $("ftp-host-input").value = p.host || ""; $("ftp-port-input").value = p.port || "21";
    $("ftp-user-input").value = p.user || ""; $("ftp-pass-input").value = ""; $("ftp-path-input").value = p.path || "/";
}

async function _sftpLoadProfile(p) {
    const $ = id => document.getElementById(id);
    $("sftp-host-input").value = p.host || "";
    $("sftp-port-input").value = p.port || "22";
    $("sftp-user-input").value = p.user || "";
    $("sftp-auth-type").value = p.auth_type || "password";
    $("sftp-key-path-input").value = p.key_path || "";
    $("sftp-auth-type").dispatchEvent(new Event("change"));
    $("sftp-pass-input").value = ""; $("sftp-path-input").value = p.path || "/";
    if (p.auth_type === "password" && window.__TAURI_INTERNALS__) {
        try { const pwd = await invoke("get_sftp_credential", { profileName: p.name }); if (pwd) $("sftp-pass-input").value = pwd; }
        catch (err) { console.error("Failed to load SFTP credential from keychain:", err); }
    }
}

function _rcpGetMappers(type) {
    if (type === "ssh") return { getProfilesFn: getSshProfiles, loadBtnClass: "ssh-profile-load-btn", delBtnClass: "ssh-profile-del-btn", loadHandler: _sshLoadProfile };
    if (type === "ftp") return { getProfilesFn: getFtpProfiles, loadBtnClass: "ftp-profile-load-btn", delBtnClass: "ftp-profile-del-btn", loadHandler: _ftpLoadProfile };
    if (type === "sftp") return { getProfilesFn: getSftpProfiles, loadBtnClass: "sftp-profile-load-btn", delBtnClass: "sftp-profile-del-btn", loadHandler: _sftpLoadProfile };
    return null;
}

function renderConnectionProfiles(type) {
    const list = document.getElementById(`${type}-profiles-list`);
    if (!list) return;
    const mappers = _rcpGetMappers(type);
    if (!mappers) return;
    const { getProfilesFn, loadBtnClass, delBtnClass, loadHandler } = mappers;
    const profiles = getProfilesFn();
    const emptyClass = type === "ssh" ? "ssh-no-profiles" : "ftp-no-profiles";
    if (profiles.length === 0) { list.innerHTML = `<div class="${emptyClass}">No saved profiles.</div>`; return; }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item" data-index="${i}">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${window.sanitizeHtml(p.name)}</span>
                <span class="ssh-profile-host">${window.sanitizeHtml(p.user)}@${window.sanitizeHtml(p.host)}:${window.sanitizeHtml(String(p.port))}</span>
            </div>
            <div class="ssh-profile-actions">
                ${profileActionButton(loadBtnClass, i, "upload", "Load")}
                ${profileActionButton(delBtnClass, i, "trash2", "Delete", { danger: true, iconOnly: true })}
            </div>
        </div>
    `).join("");
    list.querySelectorAll(`.${loadBtnClass}`).forEach(btn => {
        btn.onclick = async () => { const p = getProfilesFn()[parseInt(btn.getAttribute("data-index"))]; if (p) await loadHandler(p); };
    });
    list.querySelectorAll(`.${delBtnClass}`).forEach(btn => {
        btn.onclick = async () => { await deleteProfile(type, parseInt(btn.getAttribute("data-index"))); };
    });
}

function renderConnectionProfilesSettings(type) {
    const list = document.getElementById(`settings-${type}-profiles-list`);
    if (!list) return;
    
    const tabName = type.toUpperCase();
    const { getProfilesFn, saveProfilesFn, delCredentialFnName, updateFn1, updateFn2 } = getConnectionTypeMappers(type);
    if (!getProfilesFn) return;
    
    const profiles = getProfilesFn();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ssh-no-profiles">No saved profiles. Use the ${tabName} tab to add profiles.</div>`;
        return;
    }
    
    const delBtnClass = `${type}-profile-del-btn`;
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${window.sanitizeHtml(p.name)}</span>
                <span class="ssh-profile-host">${window.sanitizeHtml(p.user)}@${window.sanitizeHtml(p.host)}:${window.sanitizeHtml(String(p.port))}</span>
            </div>
            ${profileActionButton(delBtnClass, i, "trash2", "Delete", { danger: true, iconOnly: true })}
        </div>
    `).join("");
    
    list.querySelectorAll(`.${delBtnClass}`).forEach(btn => {
        btn.onclick = async () => {
            const index = parseInt(btn.getAttribute("data-index"));
            await deleteProfile(type, index);
        };
    });
}

function renderFtpFiles(entries) {
    renderRemoteFiles("ftp", entries);
}

function setFtpStatus(msg) {
    const el = document.getElementById("ftp-status-text");
    if (el) el.textContent = msg;
}

function loadFtpDir(path) {
    const { host, port, user, password } = getFtpInputValues();
    if (!host) return;

    setFtpStatus("Loading...");
    const cwdLabel = document.getElementById("ftp-cwd-label");
    if (cwdLabel) cwdLabel.innerHTML = `${createIcon("folder", { size: 14 })}<span>${window.sanitizeHtml(path)}</span>`;

    invoke("ftp_list_dir", { host, port, user, password, path })
        .then(entries => {
            state.ftpCurrentPath = path;
            renderFtpFiles(entries);
            setFtpStatus(`Connected — ${entries.length} items`);
        })
        .catch(err => {
            setFtpStatus(`Error: ${err}`);
            const list = document.getElementById("ftp-file-list");
            if (list) list.innerHTML = `<div class="ftp-empty-state" style="color:#ff6b6b;">Error: ${err}</div>`;
        });
}

function initFtpClientListeners() {
    document.getElementById("ftp-connect-btn")?.addEventListener("click", () => {
        const path = document.getElementById("ftp-path-input")?.value.trim() || "/";
        loadFtpDir(path);
    });

    document.getElementById("ftp-upload-btn")?.addEventListener("click", () => {
        const { host, port, user, password } = getFtpInputValues();
        const localPath = document.getElementById("ftp-local-path-input")?.value.trim();
        const remotePath = document.getElementById("ftp-remote-dest-input")?.value.trim();
        if (!host || !localPath || !remotePath) {
            setFtpStatus("Fill in host, local path, and remote destination.");
            return;
        }
        setFtpStatus("Uploading...");
        const progressWrap = document.getElementById("ftp-upload-progress-wrap");
        const progressFill = document.getElementById("ftp-upload-progress-fill");
        const progressLabel = document.getElementById("ftp-upload-progress-label");
        if (progressWrap) { progressWrap.style.display = "block"; }
        if (progressFill) { progressFill.style.width = "0%"; }
        if (progressLabel) { progressLabel.textContent = ""; }

        invoke("ftp_upload_file", { host, port, user, password, localPath, remotePath })
            .then(() => {
                setFtpStatus("Upload complete.");
                if (progressFill) progressFill.style.width = "100%";
                if (progressLabel) progressLabel.textContent = "Done";
                setTimeout(() => {
                    if (progressWrap) progressWrap.style.display = "none";
                }, 2000);
                if (typeof addNotification === "function") {
                    addNotification("FTP Upload Complete", `Uploaded to: ${remotePath}`, "success");
                }
                loadFtpDir(state.ftpCurrentPath);
            })
            .catch(err => {
                setFtpStatus(`Upload error: ${err}`);
                if (progressWrap) progressWrap.style.display = "none";
                if (typeof addNotification === "function") {
                    addNotification("FTP Upload Failed", `Failed: ${err}`, "error");
                }
            });
    });

    listen("ftp_upload_progress", (event) => {
        const { bytes_sent, total_bytes } = event.payload;
        const pct = total_bytes > 0 ? Math.round((bytes_sent / total_bytes) * 100) : 0;
        const progressFill = document.getElementById("ftp-upload-progress-fill");
        const progressLabel = document.getElementById("ftp-upload-progress-label");
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressLabel) {
            const mb = (bytes_sent / 1048576).toFixed(1);
            const total = (total_bytes / 1048576).toFixed(1);
            progressLabel.textContent = `${mb} / ${total} MB (${pct}%)`;
        }
    });
}

function renderSftpFiles(entries) {
    renderRemoteFiles("sftp", entries);
}

function setSftpStatus(msg) {
    const el = document.getElementById("sftp-status-text");
    if (el) el.textContent = msg;
}

function loadSftpDir(path) {
    const { host, port, user, auth_type, password, key_path } = getSftpInputValues();
    if (!host) return;

    setSftpStatus("Loading...");
    const cwdLabel = document.getElementById("sftp-cwd-label");
    if (cwdLabel) cwdLabel.innerHTML = `${createIcon("folder", { size: 14 })}<span>${window.sanitizeHtml(path)}</span>`;

    invoke("sftp_list_dir", { host, port, user, authType: auth_type, password, keyPath: key_path, path })
        .then(entries => {
            state.sftpCurrentPath = path;
            renderSftpFiles(entries);
            setSftpStatus(`Connected — ${entries.length} items`);
        })
        .catch(err => {
            setSftpStatus(`Error: ${err}`);
            const list = document.getElementById("sftp-file-list");
            if (list) list.innerHTML = `<div class="ftp-empty-state" style="color:#ff6b6b;">Error: ${err}</div>`;
        });
}

function initSftpClientListeners() {
    document.getElementById("sftp-connect-btn")?.addEventListener("click", () => {
        const path = document.getElementById("sftp-path-input")?.value.trim() || "/";
        loadSftpDir(path);
    });

    document.getElementById("sftp-upload-btn")?.addEventListener("click", () => {
        const { host, port, user, auth_type, password, key_path } = getSftpInputValues();
        const localPath = document.getElementById("sftp-local-path-input")?.value.trim();
        const remotePath = document.getElementById("sftp-remote-dest-input")?.value.trim();
        if (!host || !localPath || !remotePath) {
            setSftpStatus("Fill in host, local path, and remote destination.");
            return;
        }
        setSftpStatus("Uploading...");
        invoke("sftp_upload_file", { host, port, user, authType: auth_type, password, keyPath: key_path, localPath, remotePath })
            .then(() => {
                setSftpStatus("Upload complete.");
                if (typeof addNotification === "function") {
                    addNotification("SFTP Upload Complete", `Uploaded file to: ${remotePath}`, "success");
                }
                loadSftpDir(state.sftpCurrentPath);
            })
            .catch(err => {
                setSftpStatus(`Upload error: ${err}`);
                if (typeof addNotification === "function") {
                    addNotification("SFTP Upload Failed", `Failed to upload file: ${err}`, "error");
                }
            });
    });
}

// --- SFTP Profile Management ---
function getSftpProfiles() {
    try { return JSON.parse(localStorage.getItem("sftpProfiles") || "[]"); } catch { return []; }
}

const fn_sftp_save_profiles = (profiles) => {
    localStorage.setItem("sftpProfiles", JSON.stringify(profiles));
    invoke("save_profiles", { key: "sftp", data: JSON.stringify(profiles) }).catch(() => {});
};

async function initSftpProfilesFromDisk() {
    try {
        const raw = await invoke("load_profiles", { key: "sftp" });
        // Disk is always authoritative — overwrite localStorage unconditionally.
        if (raw && raw !== "[]") {
            localStorage.setItem("sftpProfiles", raw);
        }
    } catch (_) {}
}

function renderSftpProfiles() {
    renderConnectionProfiles("sftp");
}

function renderSftpProfilesSettings() {
    renderConnectionProfilesSettings("sftp");
}

function initSftpProfileListeners() {
    document.getElementById("sftp-save-profile-btn")?.addEventListener("click", async () => {
        const { host, port, user, auth_type, key_path, path, password } = getSftpInputValues();
        const name = await promptAndSaveProfileName("sftp", host, user, auth_type, password);
        if (!name) return;

        const profiles = getSftpProfiles();
        profiles.push({ name, host, port, user, auth_type, key_path, path });
        fn_sftp_save_profiles(profiles);
        renderSftpProfiles();
    });

    document.getElementById("settings-clear-sftp-profiles")?.addEventListener("click", async () => {
        const profiles = getSftpProfiles();
        for (const p of profiles) {
            try {
                await invoke("delete_sftp_credential", { profileName: p.name });
            } catch (err) {
                console.error("Failed to delete SFTP credential from keychain:", err);
            }
        }
        localStorage.removeItem("sftpProfiles");
        fn_sftp_save_profiles([]);
        renderSftpProfiles();
        renderSftpProfilesSettings();
    });

    document.getElementById("sftp-auth-type")?.addEventListener("change", (e) => {
        const isKey = e.target.value === "key";
        const passGroup = document.getElementById("sftp-pass-group");
        const keyPathGroup = document.getElementById("sftp-key-path-group");
        if (passGroup) passGroup.style.display = isKey ? "none" : "block";
        if (keyPathGroup) keyPathGroup.style.display = isKey ? "block" : "none";
    });
}

// --- FTP/SFTP DRAG AND DROP UPLOADS ---
function _wireDropzone(dropzone, pathInput, remoteDest, label) {
    if (!dropzone || !pathInput) return;
    wireDragAndDrop(dropzone, pathInput, (file) => {
        if (remoteDest && !remoteDest.value.trim()) remoteDest.value = "/" + file.name;
        addNotification(`${label} File Drop`, `File local path set to: ${file.name}`, "info");
    });
}

function initFtpSftpDragDrop() {
    _wireDropzone(document.getElementById("ftp-dropzone"), document.getElementById("ftp-local-path-input"), document.getElementById("ftp-remote-dest-input"), "FTP");
    _wireDropzone(document.getElementById("sftp-dropzone"), document.getElementById("sftp-local-path-input"), document.getElementById("sftp-remote-dest-input"), "SFTP");
}

// Initialize modules in main.js after DOM load



export {
    getActiveShellPath,
    syncShellPillsForSession,
    createTerminalSession,
    switchTerminalSession,
    closeTerminalSession,
    restartTerminalSession,
    renderTerminalTabs,
    initPtyTerminal,
    openHistorySearch,
    closeHistorySearch,
    renderHistoryResults,
    updateHistorySelection,
    insertHistoryCommand,
    performHistorySearch,
    clearAutocompleteGhost,
    showAutocompleteGhost,
    triggerAutocomplete,
    patchTerminalSessionWithAutocomplete,
    initSshTerminal,
    connectSsh,
    initSshProfilesFromDisk,
    renderSshProfiles,
    renderSshProfilesSettings,
    initFtpProfilesFromDisk,
    renderFtpProfiles,
    renderFtpProfilesSettings,
    renderFtpFiles,
    loadFtpDir,
    renderSftpFiles,
    loadSftpDir,
    initSftpProfilesFromDisk,
    renderSftpProfiles,
    renderSftpProfilesSettings,
    initFtpSftpDragDrop,
    initScreenshotVision,
    wireHistorySearchInput
};

export function initTerminal() {
    initPtyTerminal();
    initScreenshotVision();
    wireHistorySearchInput();
    initFtpSftpDragDrop();

    // Profiles initial render
    renderSshProfiles();
    renderFtpProfiles();
    renderSftpProfiles();

    // Event listeners
    initSshProfileListeners();
    initFtpProfileListeners();
    initFtpClientListeners();
    initSftpClientListeners();
    initSftpProfileListeners();
}
