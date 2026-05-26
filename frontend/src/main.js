import { state } from './state.js';
import { 
    updateMuteButtonUI, toggleMute, refreshSessionsList, 
    loadSession, startNewSession, formatCodeBlocks, appendLineToTerminal, 
    finishRunningProcess, runLuaScript, sendMessage, initChat 
} from './chat.js';
import { 
    initCanvasView, initCanvasCollab, loadCanvasCode, initCanvas 
} from './canvas.js';
import { 
    initSettings, applySettings, toggleSettingsLlmGroups, initSettingsSidebar 
} from './settings.js';
import { 
    initPtyTerminal, initSshTerminal, connectSsh, 
    initSshProfilesFromDisk, renderSshProfiles, renderSshProfilesSettings, 
    initFtpProfilesFromDisk, renderFtpProfiles, renderFtpProfilesSettings, 
    initSftpProfilesFromDisk, renderSftpProfiles, renderSftpProfilesSettings, 
    initFtpSftpDragDrop, createTerminalSession, initTerminal 
} from './terminal.js';

import './style.css';
import './app.css';

import { invoke } from '@tauri-apps/api/core';
import QRCode from 'qrcode';
import { applyNeurodeckIconography, createIcon } from './icons.js';
import { addNotification, updateNotifBadge, renderNotificationsList } from './notifications.js';
import { initAgentView } from './agent.js';
import { initMemoryView } from './memory.js';
import { initTorrentClient } from './torrent.js';
import { FocusTrap } from './focus-trap.js';

// ==========================================================================
// SCREEN-READER ANNOUNCER (a11y)
// ==========================================================================
function announceToScreenReader(message) {
    const announcer = document.getElementById("sr-announcer");
    if (!announcer) return;
    // Clear first so identical messages re-announce
    announcer.textContent = "";
    requestAnimationFrame(() => {
        announcer.textContent = String(message);
    });
}
window.announceToScreenReader = announceToScreenReader;

async function triggerOAuthLogin() {
    let chatViewport = document.getElementById("chat-viewport");
    
    // Add pending message to viewport
    let msg = document.createElement("div");
    msg.className = "message ai";
    msg.innerHTML = `
        <div class="message-card">
            <h3>Login with Provider (OAuth 2.0 Device Flow)</h3>
            <div id="oauth-status" style="color: #00ff41; margin-bottom: 10px;">Requesting authentication...</div>
            <div id="oauth-qr-container" style="background: white; padding: 10px; display: inline-block; border-radius: 8px; display: none;">
                <canvas id="oauth-qr"></canvas>
            </div>
            <p id="oauth-url-text" style="display: none;">Or visit: <a href="#" id="oauth-url" target="_blank" style="color: #00ff41;"></a></p>
            <p id="oauth-code-text" style="display: none;">Enter the following code:</p>
            <h1 id="oauth-code" style="letter-spacing: 4px; background: rgba(0,255,65,0.1); display: inline-block; padding: 10px; display: none;"></h1>
        </div>
    `;
    chatViewport.appendChild(msg);
    chatViewport.scrollTop = chatViewport.scrollHeight;

    try {
        const data = await invoke('start_oauth_flow');
        
        document.getElementById("oauth-status").innerText = "Waiting for mobile approval...";
        
        // Show QR Code and URLs
        document.getElementById("oauth-qr-container").style.display = "inline-block";
        document.getElementById("oauth-url-text").style.display = "block";
        document.getElementById("oauth-code-text").style.display = "block";
        document.getElementById("oauth-code").style.display = "inline-block";
        
        document.getElementById("oauth-url").href = data.verification_uri;
        document.getElementById("oauth-url").innerText = data.verification_uri;
        document.getElementById("oauth-code").innerText = data.user_code;
        
        await QRCode.toCanvas(document.getElementById("oauth-qr"), data.verification_uri_complete || data.verification_uri, {
            width: 200,
            margin: 1
        });
        
        chatViewport.scrollTop = chatViewport.scrollHeight;

        await invoke('poll_oauth_token', { 
            deviceCode: data.device_code, 
            interval: data.interval 
        });

        document.getElementById("oauth-status").innerText = "Authentication successful! Token saved to OS Keychain.";
        document.getElementById("oauth-status").style.color = "#00ff41";
    } catch (err) {
        console.error(err);
        let statusEl = document.getElementById("oauth-status");
        if (statusEl) {
            statusEl.innerText = "Authentication failed: " + String(err);
            statusEl.style.color = "red";
        }
    }
}
import { listen } from '@tauri-apps/api/event';
import { marked } from 'marked';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { getCtrlPromptVisible, getCtrlPromptTemplateMode,
    openCtrlPromptOverlay, closeCtrlPromptOverlay, confirmCtrlPrompt,
    exitTemplateMode, cycleTemplatePlaceholder, navigateTemplatePlaceholder,
    confirmTemplateAndSend, navigateCtrlPromptList, navigateCtrlPromptCat,
    initCtrlPromptPicker } from './ctrl_prompt.js';
import { initRemoteControl } from './remote_control_view.js';

window.neurodeckCanvas = {
    currentLang: 'html',
    currentCode: '',
    loadCode: function(lang, content) {
        if (typeof loadCanvasCode === 'function') {
            loadCanvasCode(lang, content);
        } else {
            console.warn("loadCanvasCode is not defined yet.");
        }
    }
};

window.sanitizeHtml = function(html) {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const allowedTags = new Set([
            'a', 'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
            'ul', 'ol', 'li', 'pre', 'code', 'em', 'strong', 'br', 'img', 
            'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr'
        ]);
        
        const allowedAttrs = new Set(['class', 'href', 'src', 'alt', 'title', 'target']);
        const allowedUrlSchemes = /^(https?:|mailto:|#|\/)/i;
        
        function cleanNode(node) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const tagName = child.tagName.toLowerCase();
                    if (!allowedTags.has(tagName)) {
                        if (['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'meta', 'link'].includes(tagName)) {
                            child.remove();
                        } else {
                            cleanNode(child);
                            while (child.firstChild) {
                                child.parentNode.insertBefore(child.firstChild, child);
                            }
                            child.remove();
                        }
                    } else {
                        const attrs = Array.from(child.attributes);
                        for (const attr of attrs) {
                            const name = attr.name.toLowerCase();
                            if (!allowedAttrs.has(name) || name.startsWith('on')) {
                                child.removeAttribute(attr.name);
                            } else if (name === 'href' || name === 'src') {
                                const val = attr.value.trim();
                                if (!allowedUrlSchemes.test(val)) {
                                    child.removeAttribute(attr.name);
                                }
                            }
                        }
                        if (tagName === 'a') {
                            child.setAttribute('rel', 'noopener noreferrer nofollow');
                            child.setAttribute('target', '_blank');
                        }
                        cleanNode(child);
                    }
                }
            }
        }
        
        cleanNode(doc.body);
        return doc.body.innerHTML;
    } catch (e) {
        console.error("HTML Sanitization failed:", e);
        return '';
    }
};

window.escapeHtml = function(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

window.applyThemeColors = function(theme) {
    if (!theme) return;
    const bg = theme.Background || theme.background || '#000000';
    const fg = theme.Foreground || theme.foreground || '#e2e8f0';
    const accent = theme.Accent || theme.accent || '#5EEBFF';
    const response = theme.Response || theme.response || '#00FF88';
    const warning = theme.Warning || theme.warning || '#FFB000';
    const error = theme.Error || theme.error || '#FF3C5A';
    const name = theme.Name || theme.name || '';
    const color = theme.Color || theme.color || '';
    let pulse = theme.Pulse || theme.pulse || [];
    if (typeof pulse === 'string') {
        try { pulse = JSON.parse(pulse); } catch { pulse = []; }
    }

    document.documentElement.style.setProperty('--bg-color', bg);
    document.documentElement.style.setProperty('--fg-color', fg);
    document.documentElement.style.setProperty('--accent-color', accent);
    document.documentElement.style.setProperty('--response-color', response);
    document.documentElement.style.setProperty('--warning-color', warning);
    document.documentElement.style.setProperty('--error-color', error);
    document.documentElement.style.setProperty('--theme-name', `"${name}"`);
    document.documentElement.style.setProperty('--theme-color', color);

    // Expose pulse gradient stops as CSS variables for animation use
    if (Array.isArray(pulse)) {
        for (let i = 0; i < 10; i++) {
            document.documentElement.style.setProperty(`--pulse-${i}`, pulse[i] || accent);
        }
    }

    const xtermTheme = {
        background: bg,
        foreground: fg,
        cursor: accent,
        selectionBackground: 'rgba(255, 255, 255, 0.15)'
    };
    if (window.ptyTerminal) {
        window.ptyTerminal.options.theme = xtermTheme;
    }
    if (window.sshTerminal) {
        window.sshTerminal.options.theme = xtermTheme;
    }
};

document.querySelector('#app').innerHTML = `
    <!-- ═══════════════════════════════════════════════════════════
         CINEMATIC BOOT SCREEN — removed from DOM after init
         ═══════════════════════════════════════════════════════════ -->
    <div id="boot-overlay">
        <div class="boot-main">
            <div class="boot-ascii-panel">
                <pre class="boot-ascii-art">███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗
████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗
██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║
██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║
██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝
██████╗ ███████╗ ██████╗██╗  ██╗
██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██║  ██║█████╗  ██║     █████╔╝
██║  ██║██╔══╝  ██║     ██╔═██╗
██████╔╝███████╗╚██████╗██║  ██╗
╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝</pre>
                <div class="boot-subtitle">AI TERMINAL OS · LIVE STARTUP DIAGNOSTICS</div>
                <div class="boot-build-tag">BUILD 20260525 · SELF-HEAL ACTIVE · KFMS RA</div>
                <div class="boot-status-dot" id="boot-status-dot"></div>
            </div>
            <div class="boot-log-panel">
                <div class="boot-log-header">SYSTEM BOOT LOG — KERNEL INIT SEQUENCE</div>
                <div class="boot-log-scroll" id="boot-log-scroll"></div>
            </div>
        </div>
        <div class="boot-progress-bar-wrap">
            <div class="boot-progress-label">
                <span id="boot-progress-label-text">INITIALIZING...</span>
                <span id="boot-progress-pct">0%</span>
            </div>
            <div class="boot-progress-track">
                <div class="boot-progress-fill" id="boot-progress-fill"></div>
            </div>
        </div>
    </div>

    <div class="app-layout">
        <!-- Collapsible Sidebar (Left) -->
        <aside class="sidebar collapsed" id="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-brand">
                    <span>NEURODECK</span>
                    <span class="sidebar-brand-version">v0.1.0</span>
                </div>
                <button class="sidebar-toggle-btn" id="sidebar-close-btn" title="Collapse Sidebar">◀</button>
            </div>
            <button class="new-chat-btn" id="new-chat-btn">
                <span>+ New Chat</span>
            </button>
            <div class="sidebar-history" id="sidebar-history">
                <div class="history-group-label">Recent Sessions</div>
                <!-- Sessions will be loaded here -->
            </div>
            <div class="sidebar-diagnostics" id="sidebar-diagnostics">
                <div class="diag-header">SYSTEM DIAGNOSTICS</div>
                <div class="diag-grid">
                    <div class="diag-item" id="diag-pty" title="Shell / PTY Status">
                        <span class="diag-dot offline" id="diag-dot-pty"></span>
                        <span class="diag-label">PTY</span>
                    </div>
                    <div class="diag-item" id="diag-mdns" title="LAN Discovery / mDNS">
                        <span class="diag-dot offline" id="diag-dot-mdns"></span>
                        <span class="diag-label">LAN</span>
                    </div>
                    <div class="diag-item" id="diag-llm" title="LLM Provider Connectivity">
                        <span class="diag-dot offline" id="diag-dot-llm"></span>
                        <span class="diag-label">LLM</span>
                    </div>
                    <div class="diag-item" id="diag-collab" title="Collab Server Status">
                        <span class="diag-dot offline" id="diag-dot-collab"></span>
                        <span class="diag-label">COLLAB</span>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Top Nav -->
            <header class="top-nav">
                <div class="top-nav-left">
                    <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Toggle Sidebar">${createIcon('menu', { size: 18 })}</button>
                    <span class="top-nav-title" id="session-title">Active Session</span>
                </div>
                
                <div class="top-nav-right">
                    <button class="model-selector-indicator" id="model-name" title="Switch Agent (Ctrl+Shift+M)" onclick="toggleAgentSwitcher()">[ MODEL: GEMINI ]</button>
                    <span class="game-context-badge hidden" id="game-badge" title="Steam game detected">
                        <span class="game-badge-dot" id="game-badge-dot"></span>
                        <span id="game-badge-name"></span>
                    </span>
                    <span class="status-badge">
                        <span class="status-dot"></span>
                        <span id="tool-status">Idle</span>
                    </span>
                    <button class="input-btn" id="mute-btn" title="Mute Speech (Ctrl+M)">${createIcon('volume2', { size: 18 })}</button>
                    <button class="input-btn" id="notif-btn" title="Notifications" style="position: relative;">${createIcon('bell', { size: 18 })}<span class="notif-badge hidden" id="notif-badge">0</span></button>
                    <button class="input-btn" id="command-palette-btn" title="Command Palette (Ctrl+K)" aria-label="Open Command Palette">${createIcon('search', { size: 18 })}</button>
                    <button class="input-btn" id="settings-btn" title="Settings">${createIcon('settings2', { size: 18 })}</button>
                </div>
            </header>

            <!-- ═══════════════════════════════════════════════════════════
                 NAVIGATION TAB ROW — full-width row below top-nav
                 ═══════════════════════════════════════════════════════════ -->
            <nav class="nav-tab-row">
                <div class="nav-tab-bar">
                    <button class="nav-tab active" data-view="chat">💬 Chat</button>
                    <button class="nav-tab" data-view="canvas">🎨 Canvas</button>
                    <button class="nav-tab" data-view="terminal">💻 Terminal</button>
                    <button class="nav-tab" data-view="ssh">🔑 SSH</button>
                    <button class="nav-tab" data-view="tunnel">🔗 Tunnel</button>
                    <button class="nav-tab" data-view="share">📤 Share</button>
                    <button class="nav-tab" data-view="browser">🌐 Browser</button>
                    <button class="nav-tab" data-view="agent">🤖 Agent</button>
                    <button class="nav-tab" data-view="memory">🧠 Memory</button>
                    <button class="nav-tab" data-view="prompt-lab">📝 Prompt Lab</button>
                    <button class="nav-tab" data-view="remote">🖥️ Remote</button>
                    <button class="nav-tab" data-view="docs">📚 Docs</button>
                </div>
            </nav>

            <!-- ═══════════════════════════════════════════════════════════
                 AGENT SWITCHER PANEL — drops down from model-name button
                 ═══════════════════════════════════════════════════════════ -->
            <div id="agent-switcher-panel" class="agent-switcher-panel hidden">
                <div class="agent-switcher-header">
                    <span class="agent-switcher-title">${createIcon('zap', { size: 14 })}<span>Agent Switch</span></span>
                    <div class="agent-switcher-tabs">
                        <button class="agent-tab active" data-atab="agents">Agents</button>
                        <button class="agent-tab" data-atab="recommended">Steam Deck Best</button>
                        <button class="agent-tab" data-atab="custom">+ Custom</button>
                    </div>
                    <button class="agent-switcher-close" onclick="toggleAgentSwitcher()">${createIcon('x', { size: 14 })}</button>
                </div>
                <div class="agent-tab-body" id="agent-tab-agents">
                    <div class="agent-card-grid" id="agent-card-grid">
                        <!-- Populated by renderAgentSwitcher() -->
                    </div>
                </div>
                <div class="agent-tab-body hidden" id="agent-tab-recommended">
                    <div class="agent-rec-grid" id="agent-rec-grid">
                        <!-- Populated by renderRecommendedModels() -->
                    </div>
                </div>
                <div class="agent-tab-body hidden" id="agent-tab-custom">
                    <div class="agent-custom-form">
                        <div class="agent-form-row">
                            <label>ID (slug)</label>
                            <input id="new-agent-id" type="text" placeholder="my-agent" maxlength="40" />
                        </div>
                        <div class="agent-form-row">
                            <label>Name</label>
                            <input id="new-agent-name" type="text" placeholder="My Agent" maxlength="30" />
                        </div>
                        <div class="agent-form-row">
                            <label>Provider</label>
                            <select id="new-agent-provider">
                                <option value="gemini">Gemini (Cloud)</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                        </div>
                        <div class="agent-form-row">
                            <label>Model</label>
                            <input id="new-agent-model" type="text" placeholder="gemini-2.0-flash" />
                        </div>
                        <div class="agent-form-row" id="new-agent-url-row" style="display:none">
                            <label>Base URL</label>
                            <input id="new-agent-url" type="text" placeholder="http://localhost:11434" />
                        </div>
                        <div class="agent-form-row">
                            <label>Description</label>
                            <input id="new-agent-desc" type="text" placeholder="Optional description" maxlength="120" />
                        </div>
                        <div class="agent-form-status" id="new-agent-status"></div>
                        <button class="agent-save-btn" onclick="handleAddAgent()">Save Agent</button>
                    </div>
                </div>
            </div>

            <div class="command-palette-overlay hidden" id="command-palette-overlay" aria-hidden="true">
                <div class="command-palette-card" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
                    <div class="command-palette-header">
                        <div class="command-palette-search-shell">
                            <span class="command-palette-search-icon">${createIcon('search', { size: 16 })}</span>
                            <input
                                id="command-palette-input"
                                type="text"
                                autocomplete="off"
                                spellcheck="false"
                                placeholder="Search commands, tabs, and settings…"
                                aria-label="Command palette search"
                            />
                        </div>
                        <button class="command-palette-close" id="command-palette-close" aria-label="Close command palette">${createIcon('x', { size: 16 })}</button>
                    </div>
                    <div class="command-palette-help" id="command-palette-title">
                        Use Enter to run the highlighted action. Esc closes. Ctrl+K reopens the palette.
                    </div>
                    <div class="command-palette-list" id="command-palette-list"></div>
                </div>
            </div>

            <div class="view-container">
                <!-- Chat View -->
                <div class="view-content active" id="view-chat">
                    <!-- Session Context Header -->
                    <div class="chat-session-header" id="chat-session-header">
                        <div class="chat-session-header-left">
                            <span class="chat-session-kicker">Conversation Core</span>
                            <span class="chat-session-status-dot" id="chat-status-dot"></span>
                            <span class="chat-session-name" id="chat-session-name">New Session</span>
                        </div>
                        <div class="chat-session-header-center">
                            <span class="chat-session-model-chip" id="chat-session-model">GEMINI</span>
                        </div>
                        <div class="chat-session-header-right">
                            <span class="chat-session-tokens" id="chat-session-tokens">0 tokens</span>
                            <button class="chat-session-new-btn" id="new-chat-btn-header" title="New Session (Ctrl+N)">+ New</button>
                        </div>
                    </div>
                    <!-- Chat Workspace -->
                    <div class="chat-workspace" id="chat-workspace">
                        <div class="chat-viewport" id="chat-viewport">
                            <!-- Welcome state rendered by initChat() -->
                        </div>
                    </div>

                    <!-- Floating Input Console -->
                    <div class="floating-input-container">
                        <!-- Generating Status Bar -->
                        <div class="chat-gen-bar hidden" id="chat-gen-bar">
                            <div class="chat-gen-bar-dots"><span></span><span></span><span></span></div>
                            <span class="chat-gen-bar-text">Generating</span>
                            <span class="chat-gen-bar-sep">·</span>
                            <span class="chat-gen-bar-model" id="chat-gen-model">GEMINI</span>
                            <span class="chat-gen-bar-sep">·</span>
                            <span class="chat-gen-bar-tokens" id="chat-gen-tokens">0 tokens</span>
                            <div class="chat-gen-bar-spacer"></div>
                            <button class="chat-gen-stop-btn" id="chat-gen-stop">Stop</button>
                        </div>
                        <div class="input-console-bar">
                            <div class="chat-input-context" id="chat-input-context"></div>
                            <div class="input-textarea-wrapper">
                                <div class="chat-attachment-bar hidden" id="chat-attachment-bar"></div>
                                <textarea id="user-input" placeholder="Enter command or type message..." rows="1" autocomplete="off"></textarea>
                            </div>
                            <div class="input-actions-bar">
                                <div class="input-actions-left">
                                    <button class="input-btn mic-btn" id="mic-btn" title="Voice Input">🎙️</button>
                                    <button class="input-btn" id="toggle-drawer-btn" title="Toggle Context Drawer">📊</button>
                                    <button class="input-btn screenshot-btn" id="screenshot-btn" title="Attach Last Screenshot (Vision)">📸</button>
                                </div>
                                <div class="input-actions-right">
                                    <button class="send-prompt-btn" id="send-btn" title="Send Message">
                                        <span>Send</span>
                                        <span>🚀</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History Search Overlay (Ctrl+H) -->
                <div id="history-search-overlay" class="hidden">
                    <div class="history-search-panel">
                        <div class="history-search-header">
                            <div class="history-search-title">${createIcon('zap', { size: 14 })}<span>AI Shell History Search</span></div>
                            <div class="history-search-input-wrap">
                                <span class="history-search-icon">${createIcon('search', { size: 16 })}</span>
                                <input type="text" id="history-search-input" placeholder="Describe the command you're looking for..." autocomplete="off" spellcheck="false">
                            </div>
                            <div class="history-search-status" id="history-search-status">Press Enter to search • Esc to close</div>
                        </div>
                        <div class="history-search-body" id="history-search-body">
                            <div class="history-empty-state">
                                <span class="history-empty-icon">${createIcon('search', { size: 18 })}</span>
                                <span class="history-empty-copy">Start typing to search your shell history with AI</span>
                            </div>
                        </div>
                        <div class="history-search-footer">
                            <span><kbd>↑↓</kbd> navigate</span>
                            <span><kbd>Enter</kbd> insert command</span>
                            <span><kbd>Esc</kbd> close</span>
                        </div>
                    </div>
                </div>

                <!-- Live Code Canvas View -->
                <div class="view-content view-layout-column" id="view-canvas">
                    <div class="canvas-toolbar">
                        <select id="canvas-lang-select" class="canvas-lang-select">
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="javascript">JavaScript</option>
                            <option value="markdown">Markdown</option>
                            <option value="bash">Bash / Shell</option>
                            <option value="python">Python</option>
                            <option value="lua">Lua</option>
                        </select>
                        <button class="canvas-btn" id="canvas-run-btn">${createIcon('play', { size: 14 })}<span>Run</span></button>
                        <button class="canvas-btn" id="canvas-copy-btn">${createIcon('copy', { size: 14 })}<span>Copy</span></button>
                        <button class="canvas-btn" id="canvas-clear-btn">${createIcon('eraser', { size: 14 })}<span>Clear</span></button>
                        <button class="canvas-btn canvas-btn-ai" id="canvas-ai-edit-btn" title="AI inline edit">${createIcon('wand2', { size: 14 })}<span>AI Edit</span></button>
                        <button class="canvas-btn" id="canvas-collab-btn" title="Live Collaboration" style="margin-left: auto;">${createIcon('users', { size: 14 })}<span>Collab</span></button>
                        <span class="canvas-instructions">Ctrl+Enter to run • Live preview updates as you type</span>
                    </div>
                    <div id="canvas-collab-status-bar" class="canvas-collab-status-bar" style="display: none; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(0,255,136,0.06); border-bottom: 1px solid rgba(0,255,136,0.15); font-family: var(--font-mono); font-size: 0.78rem;">
                        <span style="display:inline-block; width:8px; height:8px; background:var(--response-color); border-radius:50%; box-shadow: 0 0 8px var(--response-color);"></span>
                        <span id="canvas-collab-status-text" style="color:var(--response-color);">Collab Active: Syncing edits live</span>
                        <span id="canvas-collab-peer-count" class="canvas-collab-peer-count">0 peers</span>
                        <button class="canvas-btn canvas-btn-sm" id="canvas-collab-resync-btn" style="margin-left: auto; padding: 2px 8px; font-size: 0.72rem;">${createIcon('refreshCw', { size: 12 })}<span>Force Resync</span></button>
                    </div>
                    <div class="canvas-split" id="canvas-split">
                        <div class="canvas-editor-pane" id="canvas-editor-pane">
                            <div class="canvas-pane-header">
                                <span id="canvas-file-title">untitled.html</span>
                            </div>
                            <div id="canvas-monaco" class="canvas-monaco-container"></div>
                        </div>
                        <div class="canvas-divider" id="canvas-divider"></div>
                        <div class="canvas-preview-pane" id="canvas-preview-pane">
                            <div class="canvas-pane-header">
                                <span>Live Preview</span>
                                <button class="canvas-btn canvas-btn-sm" id="canvas-refresh-btn">↺</button>
                            </div>
                            <iframe id="canvas-preview-frame" class="canvas-preview-frame" sandbox="allow-scripts allow-modals" title="Live Preview"></iframe>
                            <pre id="canvas-preview-output" class="canvas-preview-output" style="display: none; flex: 1; margin: 0; padding: 15px; background: #050505; color: #00FF88; font-family: var(--font-mono); font-size: 0.9rem; overflow: auto; white-space: pre-wrap; word-break: break-all; border: none; height: calc(100% - 30px); box-sizing: border-box;"></pre>
                        </div>
                    </div>
                </div>

                <!-- Interactive PTY Terminal View -->
                <div class="view-content view-layout-column" id="view-terminal">
                    <!-- Unified top bar: session tabs + shell selector + actions in one row -->
                    <div class="term-topbar">
                        <div class="term-session-tabs" id="terminal-tabs-list"></div>
                        <button class="term-new-tab-btn" id="terminal-add-tab-btn" title="New Tab">+</button>
                        <div class="term-topbar-sep"></div>
                        <div class="term-shell-group" id="shell-pill-group">
                            <button class="term-shell-btn active" data-shell="default" title="Default Shell">&gt;_</button>
                            <button class="term-shell-btn" data-shell="/bin/bash" title="Bash">bash</button>
                            <button class="term-shell-btn" data-shell="/bin/zsh" title="Zsh">zsh</button>
                            <button class="term-shell-btn" data-shell="/bin/fish" title="Fish">fish</button>
                            <button class="term-shell-btn" data-shell="powershell.exe" title="PowerShell">PS</button>
                            <button class="term-shell-btn" data-shell="cmd.exe" title="CMD">cmd</button>
                        </div>
                        <div class="term-topbar-sep"></div>
                        <div class="term-actions">
                            <button class="term-action-btn" id="term-font-dec-btn" title="Decrease Font Size">A-</button>
                            <button class="term-action-btn" id="term-font-inc-btn" title="Increase Font Size">A+</button>
                            <button class="term-action-btn" id="term-clear-btn" title="Clear Screen">⌫</button>
                            <button class="term-action-btn" id="pty-reconnect-btn" title="Restart Shell">↺</button>
                        </div>
                    </div>
                    <div id="pty-terminal-container"></div>
                </div>

                <!-- SSH Client View -->
                <div class="view-content" id="view-ssh">
                    <div class="ssh-shell">
                    <div class="ssh-layout">
                        <div class="ssh-sidebar">
                            <span class="ssh-kicker">Secure Link</span>
                            <div class="ssh-panel-header">SSH Connection</div>
                            <div class="setting-field-group">
                                <label>Host / IP</label>
                                <input type="text" id="ssh-host-input" class="tunnel-text-input" placeholder="192.168.1.100" style="width:100%;box-sizing:border-box;">
                            </div>
                            <div class="ssh-row-fields">
                                <div class="setting-field-group" style="flex:0 0 80px;">
                                    <label>Port</label>
                                    <input type="number" id="ssh-port-input" class="tunnel-text-input" value="22" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="setting-field-group" style="flex:1;">
                                    <label>Username</label>
                                    <input type="text" id="ssh-user-input" class="tunnel-text-input" placeholder="deck" style="width:100%;box-sizing:border-box;">
                                </div>
                            </div>
                            <div class="setting-field-group">
                                <label>Auth Type</label>
                                <select id="ssh-auth-type" class="canvas-lang-select" style="width:100%;box-sizing:border-box;">
                                    <option value="password">Password</option>
                                    <option value="key">Key File</option>
                                </select>
                            </div>
                            <div class="setting-field-group" id="ssh-pass-group">
                                <label>Password</label>
                                <input type="password" id="ssh-pass-input" class="tunnel-text-input" placeholder="••••••••" style="width:100%;box-sizing:border-box;">
                            </div>
                            <div class="setting-field-group" id="ssh-key-path-group" style="display: none;">
                                <label>Private Key Path</label>
                                <input type="text" id="ssh-key-path-input" class="tunnel-text-input" placeholder="~/.ssh/id_rsa" style="width:100%;box-sizing:border-box;">
                            </div>
                            <button class="send-prompt-btn" id="ssh-connect-btn" style="width:100%;margin-top:8px;">Connect</button>
                            <div class="ssh-panel-header" style="margin-top:20px;">Saved Profiles</div>
                            <div class="ssh-profiles-list" id="ssh-profiles-list">
                                <div class="ssh-no-profiles">No saved profiles.</div>
                            </div>
                            <button class="canvas-btn" id="ssh-save-profile-btn" style="width:100%;margin-top:8px;">+ Save Profile</button>
                        </div>
                        <div class="ssh-terminal-area">
                            <div class="ssh-status-bar">
                                <span class="ssh-status-dot disconnected" id="ssh-status-dot">●</span>
                                <span id="ssh-status-text">Not connected</span>
                                <div style="margin-left:auto;display:flex;gap:8px;">
                                    <button class="canvas-btn" id="ssh-disconnect-btn">Disconnect</button>
                                </div>
                            </div>
                            <div id="ssh-terminal-container"></div>
                        </div>
                    </div>
                    </div>
                </div>

                <!-- SteamOS Tunnel View -->
                <div class="view-content" id="view-tunnel">
                    <div class="tunnel-shell">
                    <div class="tunnel-grid">
                        <div class="tunnel-panel">
                            <span class="tunnel-kicker">Host Bridge</span>
                            <h3>SteamOS Host Tunnel</h3>
                            <p class="tunnel-desc">Enables local TCP loopback command execution and file operations from the sandboxed Game Mode environment to the host Desktop Mode.</p>
                            <div class="setting-field-group">
                                <label>Tunnel Server Connection Status</label>
                                <div class="tunnel-status-bar">
                                    <div class="tunnel-status-indicator offline" id="tunnel-status-indicator">OFFLINE</div>
                                    <button class="canvas-btn" id="tunnel-check-btn">Check Server</button>
                                    <button class="canvas-btn" id="tunnel-toggle-btn">Start Local Server</button>
                                </div>
                            </div>
                            <div class="setting-field-group tunnel-section">
                                <label>Host Command Executor</label>
                                <div class="input-row">
                                    <input type="text" class="tunnel-text-input" id="tunnel-cmd-input" placeholder="e.g. echo 'Hello from S-Term' > test.txt">
                                    <button class="send-prompt-btn" id="tunnel-cmd-send">Execute</button>
                                </div>
                            </div>
                            <div class="setting-field-group tunnel-section">
                                <label>Write Host File</label>
                                <input type="text" class="tunnel-text-input" id="tunnel-filepath-input" placeholder="File path (e.g. /home/deck/Desktop/note.txt)" style="margin-bottom: 8px;">
                                <textarea class="tunnel-text-area" id="tunnel-filecontent-input" placeholder="File content..." rows="3"></textarea>
                                <button class="send-prompt-btn" id="tunnel-file-send" style="margin-top:8px;">Write File</button>
                            </div>
                            <div class="setting-field-group tunnel-section">
                                <label>Query Host Directory</label>
                                <div class="input-row">
                                    <input type="text" class="tunnel-text-input" id="tunnel-dirpath-input" placeholder="/home/deck">
                                    <button class="send-prompt-btn" id="tunnel-dir-send">Read Dir</button>
                                </div>
                            </div>
                        </div>
                        <div class="tunnel-panel">
                            <span class="tunnel-kicker">Telemetry</span>
                            <h3>Tunnel Operations Log</h3>
                            <div class="tunnel-log" id="tunnel-log">
                                <div class="log-entry system">System: Log initialized. Tunnel operates on 127.0.0.1:18337.</div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                <!-- LAN File Sharing / SFTP / FTP View -->
                <div class="view-content view-layout-column" id="view-share">
                    <div class="share-view-header">
                        <span class="share-view-kicker">Transfer Mesh</span>
                        <span class="share-view-title">📤 Share &amp; Transfer</span>
                        <span class="share-view-subtitle">LAN · SFTP · FTP · BT</span>
                    </div>
                    <div class="share-inner-tabs">
                        <button class="share-inner-tab active" data-panel="lan">📡 LAN</button>
                        <button class="share-inner-tab" data-panel="sftp">🔒 SFTP</button>
                        <button class="share-inner-tab" data-panel="ftp">📁 FTP</button>
                        <button class="share-inner-tab nd-icon-button" data-panel="torrent">${createIcon('download', { size: 14 })}<span class="nd-button-label">Torrent</span></button>
                    </div>

                    <!-- LAN Panel -->
                    <div class="share-panel-section active" id="share-panel-lan">
                        <div class="share-grid">
                            <div class="share-panel">
                                <h3>LAN Discovery &amp; Sending</h3>
                                <p class="share-desc">Discovers NEURODECK instances running on your local network. Select a peer, drag/drop a file or enter a path, then send.</p>
                                <div class="setting-field-group">
                                    <label>Warpinator Group Code</label>
                                    <div class="input-row">
                                        <input type="text" class="tunnel-text-input" id="share-group-code-input" placeholder="DEFAULT" style="flex:1;">
                                        <button class="send-prompt-btn" id="share-group-code-save-btn">Apply</button>
                                    </div>
                                </div>
                                <div class="setting-field-group tunnel-section">
                                    <label>Active Peers on LAN</label>
                                    <div class="peers-list" id="share-peers-list">
                                        <div class="peer-item-empty">Scanning local network for active peers...</div>
                                    </div>
                                </div>
                                <div class="setting-field-group tunnel-section">
                                    <label>Drag &amp; Drop File or Select Path</label>
                                    <div class="share-dropzone" id="share-dropzone">
                                        <div class="dropzone-text">Drag files here or click to select a file</div>
                                    </div>
                                    <input type="text" class="tunnel-text-input" id="share-filepath-input" placeholder="Absolute file path (e.g. /home/deck/file.zip)" style="margin-top:8px;width:100%;box-sizing:border-box;">
                                </div>
                                <button class="send-prompt-btn share-send-full" id="share-send-btn" disabled>Send File 🚀</button>
                            </div>
                            <div class="share-panel">
                                <h3>File Transfer Queue</h3>
                                <p class="share-desc">Active and historical file transfers. Files are saved to Downloads/neurodeck_transfers/.</p>
                                <div class="transfers-list" id="share-transfers-list">
                                    <div class="transfer-item-empty">No active or past transfers in this session.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Torrent Panel -->
                    <div class="share-panel-section" id="share-panel-torrent">
                        <div class="share-grid torrent-grid">
                            <div class="share-panel torrent-control-panel">
                                <span class="torrent-kicker">Managed Swarm</span>
                                <h3>Secure Torrent Client</h3>
                                <p class="share-desc">Accepts magnet links or validated local .torrent files. Downloads stay inside the app-managed torrent root and start paused by default.</p>
                                <div class="setting-field-group">
                                    <label>Magnet URI or .torrent Path</label>
                                    <input type="text" id="torrent-source-input" class="tunnel-text-input" placeholder="magnet:?xt=urn:btih:... or /absolute/path/file.torrent" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="torrent-action-row">
                                    <button class="send-prompt-btn nd-icon-button torrent-action-btn" id="torrent-add-btn">${createIcon('download', { size: 14 })}<span class="nd-button-label">Add Paused</span></button>
                                    <button class="send-prompt-btn nd-icon-button torrent-action-btn torrent-action-btn-secondary" id="torrent-refresh-btn">${createIcon('refreshCw', { size: 14 })}<span class="nd-button-label">Refresh</span></button>
                                </div>
                                <div class="torrent-toolbar">
                                    <button class="canvas-btn nd-icon-button torrent-mini-btn" id="torrent-pause-all-btn">${createIcon('pause', { size: 14 })}<span class="nd-button-label">Pause All</span></button>
                                    <button class="canvas-btn nd-icon-button torrent-mini-btn" id="torrent-resume-all-btn">${createIcon('play', { size: 14 })}<span class="nd-button-label">Resume All</span></button>
                                    <button class="canvas-btn nd-icon-button torrent-mini-btn" id="torrent-open-root-btn">${createIcon('folderOpen', { size: 14 })}<span class="nd-button-label">Open Folder</span></button>
                                </div>
                                <div class="setting-field-group">
                                    <label>Session Summary</label>
                                    <div class="torrent-root-line" id="torrent-root-label">Download root: initializing...</div>
                                    <div class="torrent-root-line" id="torrent-count-label">0 active</div>
                                </div>
                                <div class="torrent-summary-grid" id="torrent-summary-grid">
                                    <div class="torrent-summary-card"><span>Total</span><strong id="torrent-total-count">0</strong></div>
                                    <div class="torrent-summary-card"><span>Running</span><strong id="torrent-running-count">0</strong></div>
                                    <div class="torrent-summary-card"><span>Paused</span><strong id="torrent-paused-count">0</strong></div>
                                    <div class="torrent-summary-card"><span>Done</span><strong id="torrent-complete-count">0</strong></div>
                                </div>
                                <div class="torrent-inspector" id="torrent-inspector">
                                    <div class="torrent-inspector-title">Torrent Inspector</div>
                                    <div class="torrent-inspector-empty">Select a torrent to inspect swarm, source, and hash details.</div>
                                </div>
                            </div>
                            <div class="share-panel torrent-list-panel">
                                <h3>Active Torrents</h3>
                                <p class="share-desc">Paused by default. Resume only the swarm you trust.</p>
                                <div class="torrent-filter-grid">
                                    <input type="text" id="torrent-search-input" class="tunnel-text-input" placeholder="Search torrent name or source">
                                    <select id="torrent-filter-select" class="tunnel-text-input">
                                        <option value="all">All states</option>
                                        <option value="running">Running</option>
                                        <option value="paused">Paused</option>
                                        <option value="completed">Completed</option>
                                        <option value="metadata">Metadata</option>
                                    </select>
                                    <select id="torrent-sort-select" class="tunnel-text-input">
                                        <option value="recent">Newest first</option>
                                        <option value="progress">Highest progress</option>
                                        <option value="name">Name A-Z</option>
                                        <option value="peers">Most peers</option>
                                    </select>
                                </div>
                                <div class="torrent-list" id="torrent-list">
                                    <div class="peer-item-empty">No torrents loaded yet.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- FTP Panel -->
                    <div class="share-panel-section" id="share-panel-ftp">
                        <div class="ftp-layout">
                            <div class="ftp-sidebar">
                                <div class="ssh-panel-header">FTP Connection</div>
                                <div class="setting-field-group">
                                    <label>Host / IP</label>
                                    <input type="text" id="ftp-host-input" class="tunnel-text-input" placeholder="ftp.example.com" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="ssh-row-fields">
                                    <div class="setting-field-group" style="flex:0 0 80px;">
                                        <label>Port</label>
                                        <input type="number" id="ftp-port-input" class="tunnel-text-input" value="21" style="width:100%;box-sizing:border-box;">
                                    </div>
                                    <div class="setting-field-group" style="flex:1;">
                                        <label>Username</label>
                                        <input type="text" id="ftp-user-input" class="tunnel-text-input" placeholder="anonymous" style="width:100%;box-sizing:border-box;">
                                    </div>
                                </div>
                                <div class="setting-field-group">
                                    <label>Password</label>
                                    <input type="password" id="ftp-pass-input" class="tunnel-text-input" placeholder="••••••••" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="setting-field-group">
                                    <label>Remote Path</label>
                                    <input type="text" id="ftp-path-input" class="tunnel-text-input" value="/" placeholder="/" style="width:100%;box-sizing:border-box;">
                                </div>
                                <button class="send-prompt-btn" id="ftp-connect-btn" style="width:100%;margin-top:8px;">Connect & List</button>
                                <div class="ssh-panel-header" style="margin-top:20px;">Saved Profiles</div>
                                <div class="ftp-profiles-list" id="ftp-profiles-list">
                                    <div class="ftp-no-profiles">No saved profiles.</div>
                                </div>
                                <button class="canvas-btn" id="ftp-save-profile-btn" style="width:100%;margin-top:8px;">+ Save Profile</button>
                                <div class="ssh-panel-header" style="margin-top:20px;">Upload File</div>
                                <div class="share-dropzone" id="ftp-dropzone" style="margin-bottom: 8px;">
                                    <div class="dropzone-text">Drag files here to upload</div>
                                </div>
                                <div class="setting-field-group">
                                    <label>Local File Path</label>
                                    <input type="text" id="ftp-local-path-input" class="tunnel-text-input" placeholder="/home/deck/file.txt" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="setting-field-group">
                                    <label>Remote Destination</label>
                                    <input type="text" id="ftp-remote-dest-input" class="tunnel-text-input" placeholder="/uploads/file.txt" style="width:100%;box-sizing:border-box;">
                                </div>
                                <button class="canvas-btn" id="ftp-upload-btn" style="width:100%;margin-top:8px;">⬆ Upload</button>
                                <div id="ftp-upload-progress-wrap" style="display:none;margin-top:6px;">
                                    <div style="background:#2a2a2a;border-radius:3px;height:5px;overflow:hidden;">
                                        <div id="ftp-upload-progress-fill" style="background:var(--accent,#7c3aed);height:5px;width:0%;transition:width 0.15s linear;"></div>
                                    </div>
                                    <div id="ftp-upload-progress-label" style="font-size:10px;color:#888;margin-top:3px;text-align:right;"></div>
                                </div>
                            </div>
                            <div class="ftp-browser">
                                <div class="ftp-browser-header">
                                    <span id="ftp-cwd-label">📁 /</span>
                                    <span id="ftp-status-text" class="ftp-status">Disconnected</span>
                                </div>
                                <div class="ftp-file-list" id="ftp-file-list">
                                    <div class="ftp-empty-state">Connect to an FTP server to browse files.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- SFTP Panel -->
                    <div class="share-panel-section" id="share-panel-sftp">
                        <div class="ftp-layout">
                            <div class="ftp-sidebar">
                                <div class="ssh-panel-header">SFTP Connection</div>
                                <div class="setting-field-group">
                                    <label>Host / IP</label>
                                    <input type="text" id="sftp-host-input" class="tunnel-text-input" placeholder="192.168.1.100" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="ssh-row-fields">
                                    <div class="setting-field-group" style="flex:0 0 80px;">
                                        <label>Port</label>
                                        <input type="number" id="sftp-port-input" class="tunnel-text-input" value="22" style="width:100%;box-sizing:border-box;">
                                    </div>
                                    <div class="setting-field-group" style="flex:1;">
                                        <label>Username</label>
                                        <input type="text" id="sftp-user-input" class="tunnel-text-input" placeholder="deck" style="width:100%;box-sizing:border-box;">
                                    </div>
                                </div>
                                <div class="setting-field-group">
                                    <label>Auth Type</label>
                                    <select id="sftp-auth-type" class="canvas-lang-select" style="width:100%;box-sizing:border-box;">
                                        <option value="password">Password</option>
                                        <option value="key">Key File</option>
                                    </select>
                                </div>
                                <div class="setting-field-group" id="sftp-pass-group">
                                    <label>Password</label>
                                    <input type="password" id="sftp-pass-input" class="tunnel-text-input" placeholder="••••••••" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="setting-field-group" id="sftp-key-path-group" style="display: none;">
                                    <label>Private Key Path</label>
                                    <input type="text" id="sftp-key-path-input" class="tunnel-text-input" placeholder="~/.ssh/id_rsa" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="setting-field-group">
                                    <label>Remote Path</label>
                                    <input type="text" id="sftp-path-input" class="tunnel-text-input" value="/" placeholder="/" style="width:100%;box-sizing:border-box;">
                                </div>
                                <button class="send-prompt-btn" id="sftp-connect-btn" style="width:100%;margin-top:8px;">Connect & List</button>
                                <div class="ssh-panel-header" style="margin-top:20px;">Saved Profiles</div>
                                <div class="ftp-profiles-list" id="sftp-profiles-list">
                                    <div class="ftp-no-profiles">No saved profiles.</div>
                                </div>
                                <button class="canvas-btn" id="sftp-save-profile-btn" style="width:100%;margin-top:8px;">+ Save Profile</button>
                                <div class="ssh-panel-header" style="margin-top:20px;">Upload File</div>
                                <div class="share-dropzone" id="sftp-dropzone" style="margin-bottom: 8px;">
                                    <div class="dropzone-text">Drag files here to upload</div>
                                </div>
                                <div class="setting-field-group">
                                    <label>Local File Path</label>
                                    <input type="text" id="sftp-local-path-input" class="tunnel-text-input" placeholder="/home/deck/file.txt" style="width:100%;box-sizing:border-box;">
                                </div>
                                <div class="setting-field-group">
                                    <label>Remote Destination</label>
                                    <input type="text" id="sftp-remote-dest-input" class="tunnel-text-input" placeholder="/uploads/file.txt" style="width:100%;box-sizing:border-box;">
                                </div>
                                <button class="canvas-btn" id="sftp-upload-btn" style="width:100%;margin-top:8px;">⬆ Upload</button>
                            </div>
                            <div class="ftp-browser">
                                <div class="ftp-browser-header">
                                    <span id="sftp-cwd-label">📁 /</span>
                                    <span id="sftp-status-text" class="ftp-status">Disconnected</span>
                                </div>
                                <div class="ftp-file-list" id="sftp-file-list">
                                    <div class="ftp-empty-state">Connect to an SFTP server to browse files.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Built-in Web Browser View -->
                <div class="view-content" id="view-browser">
                    <div class="browser-container">
                        <div class="browser-toolbar">
                            <div class="browser-toolbar-title">
                                <span class="browser-kicker">Sandboxed Web</span>
                            </div>
                            <div class="browser-nav-buttons">
                                <button class="browser-btn" id="browser-back-btn" title="Go Back">${createIcon('arrowLeft', { size: 16 })}</button>
                                <button class="browser-btn" id="browser-forward-btn" title="Go Forward">${createIcon('arrowRight', { size: 16 })}</button>
                                <button class="browser-btn" id="browser-refresh-btn" title="Refresh">${createIcon('refreshCw', { size: 16 })}</button>
                                <button class="browser-btn" id="browser-home-btn" title="New Tab / Home">${createIcon('house', { size: 16 })}</button>
                            </div>
                            <div class="browser-address-bar-wrapper">
                                <input type="text" id="browser-url-input" class="browser-url-input" placeholder="Enter URL or search term...">
                                <button class="browser-url-clear" id="browser-url-clear-btn" title="Clear">${createIcon('x', { size: 14 })}</button>
                            </div>
                            <button class="browser-btn go-btn" id="browser-go-btn">${createIcon('sendHorizontal', { size: 14 })}<span>Go</span></button>
                            <button class="browser-btn open-ext-btn" id="browser-open-ext-btn" title="Open in System Browser">${createIcon('arrowUpRight', { size: 14 })}<span>Open Ext</span></button>
                        </div>

                        <!-- Loading progress bar (sits between toolbar and viewport) -->
                        <div id="browser-progress-bar" class="browser-progress-bar hidden"></div>

                        <!-- Main viewport -->
                        <div class="browser-viewport">
                            <!-- New Tab / Home View -->
                            <div class="browser-home-screen" id="browser-home-screen">
                                <div class="browser-home-content">
                                    <span class="browser-home-kicker">Navigation Hub</span>
                                    <div class="browser-home-logo">NEURODECK<span>BROWSER</span></div>
                                    <p class="browser-home-subtitle">Built-in Sandbox Navigation Engine</p>
                                    
                                    <div class="browser-search-box">
                                        <input type="text" id="browser-home-search-input" placeholder="Search the web (via DuckDuckGo frame)...">
                                        <button id="browser-home-search-btn">Search</button>
                                    </div>
                                    
                                    <div class="speed-dial-title">Quick Bookmarks</div>
                                    <div class="speed-dial-grid">
                                        <div class="speed-dial-card" data-url="https://html.duckduckgo.com/html/">
                                            <div class="sd-icon">${createIcon('search', { size: 24 })}</div>
                                            <div class="sd-label">DuckDuckGo</div>
                                            <div class="sd-desc">Privacy-first web search</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://en.m.wikipedia.org/wiki/Main_Page">
                                            <div class="sd-icon">${createIcon('fileText', { size: 24 })}</div>
                                            <div class="sd-label">Wikipedia</div>
                                            <div class="sd-desc">Mobile encyclopedia</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://news.ycombinator.com/">
                                            <div class="sd-icon">${createIcon('chartColumn', { size: 24 })}</div>
                                            <div class="sd-label">Hacker News</div>
                                            <div class="sd-desc">Tech & Dev community board</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://reddit.com/r/SteamDeck">
                                            <div class="sd-icon">${createIcon('gamepad2', { size: 24 })}</div>
                                            <div class="sd-label">r/SteamDeck</div>
                                            <div class="sd-desc">Steam Deck community</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://mrdoob.com/projects/chromeexperiments/google-gravity/">
                                            <div class="sd-icon">${createIcon('globe', { size: 24 })}</div>
                                            <div class="sd-label">Google Gravity</div>
                                            <div class="sd-desc">Anti-gravity Easter egg</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://codepen.io/trending">
                                            <div class="sd-icon">${createIcon('code2', { size: 24 })}</div>
                                            <div class="sd-label">CodePen</div>
                                            <div class="sd-desc">Live front-end code demos</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://archive.org/search">
                                            <div class="sd-icon">${createIcon('folderOpen', { size: 24 })}</div>
                                            <div class="sd-label">Internet Archive</div>
                                            <div class="sd-desc">Web history & media vault</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://caniuse.com/">
                                            <div class="sd-icon">${createIcon('bug', { size: 24 })}</div>
                                            <div class="sd-label">Can I Use</div>
                                            <div class="sd-desc">Browser feature support tables</div>
                                        </div>
                                    </div>

                                    <div class="browser-info-panel">
                                        <div class="info-icon">${createIcon('info', { size: 18 })}</div>
                                        <div class="info-text">
                                            <strong>Framing Notice:</strong> Many modern websites (like Google, GitHub, or YouTube) send headers that restrict them from running inside an embedded iframe for security. If a website refuses to connect, use the <strong>Open Ext</strong> button to launch it in your default desktop browser.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Active IFrame -->
                            <iframe id="browser-iframe" class="browser-iframe hidden" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation allow-downloads"></iframe>

                            <!-- Blocked / Error Screen -->
                            <div class="browser-blocked-screen hidden" id="browser-blocked-screen">
                                <div class="blocked-content">
                                    <span class="blocked-kicker">Embed Guard</span>
                                    <div class="blocked-icon">${createIcon('shieldCheck', { size: 34 })}</div>
                                    <h2 class="blocked-title">Connection Blocked</h2>
                                    <p class="blocked-msg">This site uses <strong>X-Frame-Options</strong> or <strong>CSP</strong> headers that prevent embedding inside NEURODECK Browser.</p>
                                    <p class="blocked-url" id="blocked-url-display"></p>
                                    <button class="browser-btn go-btn blocked-ext-btn" id="blocked-open-ext-btn">${createIcon('arrowUpRight', { size: 14 })}<span>Open in System Browser</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Autonomous Coding Agent View -->
                <div class="view-content view-layout-column" id="view-agent">
                    <div class="agent-shell">
                        <div class="agent-shell-header">
                            <span class="agent-kicker">Execution Fabric</span>
                        </div>
                        <!-- Mode toggle -->
                        <div class="agent-mode-bar">
                            <button class="agent-mode-btn active" id="agent-mode-task" data-mode="task">🤖 Agent Task</button>
                            <button class="agent-mode-btn" id="agent-mode-roundtable" data-mode="roundtable">🗣 Roundtable</button>
                        </div>

                        <!-- Task mode toolbar -->
                        <div class="agent-toolbar" id="agent-toolbar-task">
                            <input type="text" id="agent-task-input" class="agent-task-input" placeholder="Describe your task… e.g. Write a Python script that lists all .txt files in the current directory">
                            <button class="agent-btn agent-btn-run" id="agent-run-btn">▶ Run Agent</button>
                            <button class="agent-btn agent-btn-stop hidden" id="agent-stop-btn">■ Stop</button>
                            <span class="agent-iter-label hidden" id="agent-iter-label">Step 1 / 5</span>
                        </div>

                        <!-- Roundtable mode toolbar -->
                        <div class="agent-toolbar hidden" id="agent-toolbar-roundtable">
                            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%;">
                                <select id="rt-persona-a" class="agent-task-input" style="flex:0 0 auto;width:130px;padding:0 8px;">
                                    <option value="">Persona A…</option>
                                </select>
                                <select id="rt-persona-b" class="agent-task-input" style="flex:0 0 auto;width:130px;padding:0 8px;">
                                    <option value="">Persona B…</option>
                                </select>
                                <input type="text" id="rt-topic-input" class="agent-task-input" placeholder="Topic or question to debate…" style="flex:1;min-width:180px;">
                                <select id="rt-rounds" class="agent-task-input" style="flex:0 0 auto;width:90px;padding:0 8px;" title="Number of rounds">
                                    <option value="2">2 rounds</option>
                                    <option value="3">3 rounds</option>
                                    <option value="4" selected>4 rounds</option>
                                    <option value="6">6 rounds</option>
                                </select>
                                <button class="agent-btn agent-btn-run" id="rt-start-btn">▶ Start</button>
                                <button class="agent-btn agent-btn-stop hidden" id="rt-stop-btn">■ Stop</button>
                            </div>
                        </div>

                        <div class="agent-body">
                            <!-- Left: step-by-step log -->
                            <div class="agent-log-pane" id="agent-log-pane">
                                <div class="agent-pane-header">Execution Log</div>
                                <div class="agent-log" id="agent-log">
                                    <div class="agent-empty-state">
                                        <div class="agent-empty-icon">${createIcon('bot', { size: 32 })}</div>
                                        <p>Describe a task above and click <strong>Run Agent</strong>.</p>
                                        <p class="agent-empty-hint">The agent will write code, execute it, and iterate until the task is complete — up to 5 steps.</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: code + live output -->
                            <div class="agent-code-pane" id="agent-code-pane">
                                <div class="agent-pane-header">
                                    <span>Current Code</span>
                                    <button class="agent-btn agent-btn-sm" id="agent-send-canvas-btn" title="Open in Canvas">→ Canvas</button>
                                </div>
                                <div class="agent-code-display" id="agent-code-display">
                                    <pre id="agent-code-pre"><code id="agent-code-content" class="agent-code"></code></pre>
                                </div>
                                <div class="agent-output-header">Output</div>
                                <div class="agent-output" id="agent-output">
                                    <span class="agent-output-empty">No output yet.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Prompt Lab UI View -->
                <div class="view-content" id="view-prompt-lab">
                    <!-- Template Gallery Drawer -->
                    <div class="pl-template-gallery hidden" id="pl-template-gallery">
                        <div class="pl-gallery-overlay" id="pl-gallery-overlay"></div>
                        <div class="pl-gallery-panel">
                            <div class="pl-gallery-header">
                                <span>Template Gallery</span>
                                <div style="display:flex;gap:8px;align-items:center;">
                                    <input type="text" id="pl-gallery-search" class="pl-gallery-search" placeholder="Search templates...">
                                    <button class="pl-gallery-close" id="pl-gallery-close">${createIcon('x', { size: 16 })}</button>
                                </div>
                            </div>
                            <div class="pl-gallery-body" id="pl-gallery-body"></div>
                        </div>
                    </div>

                    <div class="prompt-lab-container">
                        <!-- Left pane: Input Form -->
                        <div class="prompt-lab-form">
                            <div class="prompt-lab-header">
                                <div class="pl-header-title">
                                    <span class="pl-header-kicker">Prompt Studio</span>
                                    <span class="pl-header-icon">${createIcon('sparkles', { size: 18 })}</span>
                                    <h3>Prompt Lab</h3>
                                </div>
                                <div class="pl-header-actions">
                                    <button class="pl-gallery-btn" id="pl-open-gallery-btn" title="Browse Template Gallery">${createIcon('fileText', { size: 14 })}<span>Templates</span></button>
                                    <input type="text" id="pl-preset-name" placeholder="Preset name..." class="pl-dropdown" style="display:none;width:96px;padding:4px 8px;font-size:0.8rem;background:rgba(0,0,0,0.3);">
                                    <button class="agent-btn agent-btn-sm" id="pl-save-preset-btn" style="display:none;font-size:0.75rem;">${createIcon('save', { size: 13 })}<span>Save</span></button>
                                    <button class="agent-btn agent-btn-sm" id="pl-toggle-preset-input-btn" style="font-size:0.75rem;" title="Save Custom Preset">${createIcon('save', { size: 13 })}</button>
                                </div>
                            </div>

                            <!-- Strength Meter -->
                            <div class="pl-strength-container">
                                <span class="pl-strength-label-text">Strength</span>
                                <div class="pl-strength-bar-bg">
                                    <div id="pl-strength-bar-fill" class="pl-strength-bar-fill"></div>
                                </div>
                                <span id="pl-strength-label" class="pl-strength-value">Weak (0/5)</span>
                            </div>

                            <div class="pl-field">
                                <label>Persona / Role</label>
                                <input type="text" id="pl-persona" placeholder="e.g. You are a senior software engineer.">
                                <div class="pl-chips">
                                    <span class="pl-chip" data-target="pl-persona">Game Dev</span>
                                    <span class="pl-chip" data-target="pl-persona">Engineer</span>
                                    <span class="pl-chip" data-target="pl-persona">Copywriter</span>
                                    <span class="pl-chip" data-target="pl-persona">Analyst</span>
                                    <span class="pl-chip" data-target="pl-persona">Teacher</span>
                                    <span class="pl-chip" data-target="pl-persona">Marketer</span>
                                </div>
                            </div>
                            <div class="pl-field">
                                <div class="pl-field-header">
                                    <label>Task / Objective</label>
                                    <button class="pl-optimize-btn" id="pl-optimize-ai-btn" title="AI Decompose & Optimize">${createIcon('zap', { size: 13 })}<span>AI Optimize</span></button>
                                </div>
                                <input type="text" id="pl-task" placeholder="e.g. Design an endless runner game.">
                            </div>
                            <div class="pl-field">
                                <label>Context / Background</label>
                                <textarea id="pl-context" placeholder="e.g. Target audience: casual gamers, ages 12-18." rows="2"></textarea>
                            </div>
                            <div class="pl-field">
                                <label>Tone / Style</label>
                                <input type="text" id="pl-tone" placeholder="e.g. Concise and professional.">
                                <div class="pl-chips">
                                    <span class="pl-chip" data-target="pl-tone">Technical</span>
                                    <span class="pl-chip" data-target="pl-tone">Casual</span>
                                    <span class="pl-chip" data-target="pl-tone">Professional</span>
                                    <span class="pl-chip" data-target="pl-tone">Playful</span>
                                    <span class="pl-chip" data-target="pl-tone">Concise</span>
                                    <span class="pl-chip" data-target="pl-tone">Academic</span>
                                </div>
                            </div>
                            <div class="pl-field">
                                <label>Constraints</label>
                                <textarea id="pl-constraints" placeholder="e.g. Max 150 words. No jargon." rows="2"></textarea>
                            </div>
                            <div class="pl-field">
                                <label>Output Format</label>
                                <input type="text" id="pl-format" placeholder="e.g. JSON with keys: concept, mechanics">
                                <div class="pl-chips">
                                    <span class="pl-chip" data-target="pl-format">Markdown</span>
                                    <span class="pl-chip" data-target="pl-format">JSON</span>
                                    <span class="pl-chip" data-target="pl-format">Bullet List</span>
                                    <span class="pl-chip" data-target="pl-format">Code Block</span>
                                    <span class="pl-chip" data-target="pl-format">Step-by-step</span>
                                    <span class="pl-chip" data-target="pl-format">Table</span>
                                </div>
                            </div>

                            <!-- Formula Card Gallery -->
                            <div class="pl-formula-section">
                                <div class="pl-formula-section-header">
                                    <label>Framework / Formula</label>
                                    <span class="pl-formula-active-badge" id="pl-formula-badge">Default</span>
                                </div>
                                <div class="pl-formula-grid" id="pl-formula-grid"></div>
                                <input type="hidden" id="pl-formula" value="default">
                                <div id="pl-formula-info" class="pl-formula-info">
                                    Standard prompt structure: Persona → Task → Context → Constraints → Format.
                                </div>
                            </div>

                            <!-- Few-shot examples (collapsible) -->
                                <div class="pl-advanced-toggle" id="pl-advanced-toggle">${createIcon('settings2', { size: 14 })}<span>Few-Shot Examples</span></div>
                            <div class="pl-advanced-fields hidden" id="pl-advanced-fields">
                                <div class="pl-field">
                                    <label>Examples</label>
                                    <textarea id="pl-examples" placeholder="e.g. Input: Puzzle game. Output: A grid-based..." rows="3"></textarea>
                                </div>
                            </div>

                            <button class="pl-btn-primary" id="pl-generate-btn">${createIcon('zap', { size: 14 })}<span>Generate Prompt</span></button>
                        </div>

                        <!-- Right pane: Output & JPE -->
                        <div class="prompt-lab-output">
                            <div class="pl-output-section">
                                <div class="pl-output-header">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <span>Generated Prompt</span>
                                        <span class="pl-token-counter" id="pl-token-counter">~0 tokens</span>
                                    </div>
                                    <div class="pl-actions">
                                        <button class="agent-btn agent-btn-sm" id="pl-history-btn" title="Prompt History">${createIcon('refreshCw', { size: 13 })}</button>
                                        <button class="agent-btn agent-btn-sm" id="pl-copy-prompt-btn" title="Copy Prompt">${createIcon('copy', { size: 13 })}<span>Copy</span></button>
                                        <button class="agent-btn agent-btn-sm" id="pl-send-chat-btn" title="Send to Chat">${createIcon('messageSquare', { size: 13 })}<span>Chat</span></button>
                                        <button class="agent-btn agent-btn-sm" id="pl-export-json-btn" title="Export JSON Schema">${createIcon('fileText', { size: 13 })}<span>JSON</span></button>
                                        <button class="agent-btn agent-btn-sm" id="pl-export-lua-btn" title="Export Lua Macro">${createIcon('settings2', { size: 13 })}<span>Lua</span></button>
                                    </div>
                                </div>
                                <div class="pl-history-drawer hidden" id="pl-history-drawer">
                                    <div class="pl-history-header">
                                        <span>Recent Prompts</span>
                                        <button class="pl-history-clear" id="pl-history-clear">Clear all</button>
                                    </div>
                                    <div class="pl-history-list" id="pl-history-list"></div>
                                </div>
                                <textarea id="pl-result-prompt" class="pl-result-textarea" readonly placeholder="Your generated prompt will appear here..."></textarea>
                            </div>

                            <div class="pl-output-section jpe-section">
                                <div class="pl-output-header">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <span>JPE Explanation</span>
                                        <select id="pl-jpe-level-select" class="pl-dropdown" style="padding:2px 4px;font-size:0.75rem;background:rgba(0,0,0,0.2);">
                                            <option value="grade8">Grade 8 (Simple)</option>
                                            <option value="grade12">Grade 12 (Standard)</option>
                                            <option value="executive">Executive</option>
                                            <option value="technical">Technical</option>
                                        </select>
                                    </div>
                                    <div class="pl-actions">
                                        <button class="agent-btn agent-btn-sm" id="pl-explain-jpe-btn" title="Explain in JPE">${createIcon('search', { size: 13 })}<span>Explain</span></button>
                                        <button class="agent-btn agent-btn-sm" id="pl-copy-jpe-btn" title="Copy Explanation">${createIcon('copy', { size: 13 })}<span>Copy</span></button>
                                    </div>
                                </div>
                                <div id="pl-result-jpe" class="pl-result-jpe">
                                    <span class="pl-empty-text">Generate a prompt then click Explain to get a plain-English breakdown of what it instructs the AI to do.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Memory UI View -->
                <div class="view-content view-layout-column" id="view-memory">
                    <div class="memory-shell">
                        <div class="memory-toolbar">
                            <div class="memory-toolbar-title">
                                <span class="memory-kicker">Long-Term Context</span>
                                <span class="memory-title">Memory Ledger</span>
                            </div>
                            <div class="memory-search-shell">
                                <span class="memory-search-icon">${createIcon('search', { size: 14 })}</span>
                                <input type="text" id="memory-search-input" class="memory-search-input" placeholder="Search memory records…">
                            </div>
                            <div class="memory-filter-tabs">
                                <button class="memory-filter-btn active" data-filter="all">All</button>
                                <button class="memory-filter-btn" data-filter="pinned">📌 Pinned</button>
                                <button class="memory-filter-btn" data-filter="user">User</button>
                                <button class="memory-filter-btn" data-filter="ai">AI</button>
                                <button class="memory-filter-btn" data-filter="fact">Facts</button>
                            </div>
                            <button class="memory-btn memory-btn-refresh" id="memory-refresh-btn">↺ Refresh</button>
                        </div>

                        <div class="memory-add-fact-bar" id="memory-add-fact-bar">
                            <input type="text" id="memory-fact-input" class="memory-fact-input" placeholder="Add a pinned fact or note to memory…">
                            <button class="memory-btn memory-btn-pin" id="memory-fact-save-btn">📌 Save Fact</button>
                        </div>

                        <div class="memory-body">
                            <div class="memory-list" id="memory-list">
                                <div class="memory-empty-state" id="memory-empty-state">
                                    <div class="memory-empty-icon">🧠</div>
                                    <p>No memory records yet.</p>
                                    <p class="memory-empty-hint">Records are stored automatically during chat sessions. You can also add pinned facts above.</p>
                                </div>
                            </div>
                        </div>

                        <div class="memory-status-bar" id="memory-status-bar">
                            <span id="memory-total-count">0 records</span>
                            <span class="memory-sep">·</span>
                            <span id="memory-pinned-count">0 pinned</span>
                            <span class="memory-sep">·</span>
                            <span id="memory-filtered-count">showing 0</span>
                        </div>
                    </div>
                </div>

                <!-- Remote Control View -->
                <div class="view-content" id="view-remote">
                    <div class="remote-container">
                        <!-- Header -->
                        <div class="remote-header">
                            <div class="remote-header-left">
                                <span class="remote-kicker">LAN Bridge</span>
                                <span class="remote-title">🖥️ Remote Control</span>
                                <span class="remote-subtitle">Connect your iPhone via local Wi-Fi</span>
                            </div>
                            <div class="remote-header-right">
                                <div class="remote-status-badge" id="remote-status-badge">
                                    <span class="remote-status-dot" id="remote-status-dot"></span>
                                    <span id="remote-status-text">Offline</span>
                                </div>
                            </div>
                        </div>

                        <!-- Main grid -->
                        <div class="remote-grid">
                            <!-- Left: Server controls + QR -->
                            <div class="remote-panel remote-panel-left">
                                <div class="remote-section">
                                    <div class="remote-section-label">Server</div>
                                    <div class="remote-server-controls">
                                        <div class="remote-port-row">
                                            <label class="remote-field-label">Port</label>
                                            <input type="number" id="remote-port-input" class="remote-port-input" value="9890" min="1024" max="65535">
                                        </div>
                                        <button class="remote-start-btn" id="remote-start-btn">▶ Start Server</button>
                                        <button class="remote-stop-btn" id="remote-stop-btn" style="display:none">■ Stop Server</button>
                                    </div>
                                </div>

                                <div class="remote-section" id="remote-qr-section" style="display:none">
                                    <div class="remote-section-label">Scan to Connect</div>
                                    <div class="remote-qr-wrapper">
                                        <div id="remote-qr-canvas"></div>
                                    </div>
                                    <div class="remote-url-row">
                                        <span class="remote-url-text" id="remote-url-text"></span>
                                        <button class="remote-copy-btn" id="remote-copy-url-btn" title="Copy URL">📋</button>
                                    </div>
                                    <div class="remote-pin-row">
                                        <span class="remote-field-label">PIN</span>
                                        <span class="remote-pin-display" id="remote-pin-display">------</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Connection log + stats -->
                            <div class="remote-panel remote-panel-right">
                                <div class="remote-section">
                                    <div class="remote-section-label">Connection Log</div>
                                    <div class="remote-log" id="remote-log">
                                        <div class="remote-log-entry remote-log-info">Remote Control ready. Start the server to begin.</div>
                                    </div>
                                </div>
                                <div class="remote-stats-row" id="remote-stats-row" style="display:none">
                                    <div class="remote-stat">
                                        <span class="remote-stat-label">Clients</span>
                                        <span class="remote-stat-value" id="remote-clients-count">0</span>
                                    </div>
                                    <div class="remote-stat">
                                        <span class="remote-stat-label">IP</span>
                                        <span class="remote-stat-value" id="remote-ip-display">--</span>
                                    </div>
                                    <div class="remote-stat">
                                        <span class="remote-stat-label">Port</span>
                                        <span class="remote-stat-value" id="remote-port-display">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Security notice -->
                        <div class="remote-security-notice">
                            <span class="remote-security-icon">${createIcon('shieldCheck', { size: 14 })}</span>
                            <span>Connection is unencrypted (HTTP/WS). Use on trusted home networks only. PIN expires when the server is restarted.</span>
                        </div>

                        <!-- Instructions -->
                        <div class="remote-instructions" id="remote-instructions">
                            <div class="remote-instr-step"><span class="remote-instr-num">1</span><span>Ensure your iPhone is on the same Wi-Fi network as this device.</span></div>
                            <div class="remote-instr-step"><span class="remote-instr-num">2</span><span>Start the server, then scan the QR code with your iPhone Camera app.</span></div>
                            <div class="remote-instr-step"><span class="remote-instr-num">3</span><span>The NEURODECK Remote webapp opens in Safari — no install required.</span></div>
                        </div>
                    </div>
                </div>

                <!-- ============================================================ -->
                <!-- VIEW: DOCS — Knowledge Base Viewer                           -->
                <!-- ============================================================ -->
                <div class="view-content view-layout-column" id="view-docs">
                    <div class="docs-container">
                        <div class="docs-header">
                            <div class="docs-header-left">
                                <span class="docs-kicker">Knowledge Mesh</span>
                                <span class="docs-title">📚 Knowledge Base</span>
                                <span class="docs-subtitle" id="docs-count-badge">0 documents indexed</span>
                            </div>
                            <div class="docs-header-right">
                                <div class="docs-toolbar-actions">
                                    <button class="docs-index-btn" id="docs-index-btn" title="Index a folder">+ Index Folder</button>
                                    <button class="docs-clear-btn" id="docs-clear-btn" title="Clear all indexed docs">Clear All</button>
                                </div>
                            </div>
                        </div>

                        <div class="docs-search-bar">
                            <div class="docs-search-shell">
                                <span class="docs-search-icon">${createIcon('search', { size: 14 })}</span>
                                <input type="text" id="docs-search-input" class="docs-search-input" placeholder="Semantic search across indexed documents…">
                            </div>
                            <button class="docs-search-btn" id="docs-search-btn">Search</button>
                        </div>

                        <div class="docs-body">
                            <!-- Left: file list -->
                            <div class="docs-file-panel">
                                <div class="docs-panel-label">Indexed Files</div>
                                <div class="docs-file-list" id="docs-file-list">
                                    <div class="docs-empty-msg">No documents indexed yet.</div>
                                </div>
                            </div>

                            <!-- Right: results -->
                            <div class="docs-results-panel">
                                <div class="docs-panel-label" id="docs-results-label">Results</div>
                                <div class="docs-results-list" id="docs-results-list">
                                    <div class="docs-empty-msg">Search to find relevant passages.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>

        <!-- Collapsible Context Drawer (Right) -->
        <aside class="inspect-drawer collapsed" id="inspect-drawer">
            <div class="inspect-header">
                <span class="inspect-title">Agent Context</span>
                <button class="sidebar-toggle-btn" id="inspect-close-btn" title="Collapse Drawer">▶</button>
            </div>
            <div class="inspect-content" style="overflow-y: auto; max-height: calc(100% - 52px);">
                <div class="inspect-card">
                    <h4>SYSTEM HEALTH</h4>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Active Provider:</span>
                        <span class="inspect-stat-value" id="drawer-active-provider">--</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Active Model:</span>
                        <span class="inspect-stat-value" id="drawer-active-model">--</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Available RAM:</span>
                        <span class="inspect-stat-value" id="drawer-ram-val">--</span>
                    </div>
                </div>
                
                <div class="inspect-card">
                    <h4>VECTOR MEMORY</h4>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">DB Status:</span>
                        <span class="inspect-stat-value" id="vector-db-status">Connected</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Total Records:</span>
                        <span class="inspect-stat-value" id="drawer-memory-records">0</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Pinned Facts:</span>
                        <span class="inspect-stat-value" id="drawer-memory-pinned">0</span>
                    </div>
                </div>
                
                <div class="inspect-card">
                    <h4>SESSION METRICS</h4>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Session ID:</span>
                        <span class="inspect-stat-value" id="drawer-session-id">Active</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Created At:</span>
                        <span class="inspect-stat-value" id="drawer-session-created">--</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Messages Count:</span>
                        <span class="inspect-stat-value" id="drawer-session-messages">0</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Latency:</span>
                        <span class="inspect-stat-value" id="latency-val">--ms</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Tokens Speed:</span>
                        <span class="inspect-stat-value" id="token-speed">--/s</span>
                    </div>
                </div>

                <div class="inspect-card">
                    <h4>ACTIVE PERSONA</h4>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Persona Name:</span>
                        <span class="inspect-stat-value" id="drawer-active-persona">Default</span>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Settings Modal Overlay — Apple TV Style -->
        <div class="settings-overlay" id="settings-overlay">
            <div class="settings-modal-card">

                <!-- ── Sidebar nav ── -->
                <nav class="stv-sidebar">
                    <div class="stv-sidebar-brand">
                        <div class="stv-sidebar-brand-chip">${createIcon('sparkles', { size: 12 })}<span>Preference Center</span></div>
                        <div class="stv-sidebar-brand-title">NEURODECK</div>
                        <div class="stv-sidebar-brand-sub">SYSTEM PREFERENCES</div>
                    </div>
                    <button class="stv-nav-item active" data-panel="sp-general" data-settings-theme="general"><span class="stv-nav-icon">${createIcon('settings2', { size: 15 })}</span> General</button>
                    <button class="stv-nav-item" data-panel="sp-ai" data-settings-theme="ai"><span class="stv-nav-icon">${createIcon('bot', { size: 15 })}</span> AI Model</button>
                    <button class="stv-nav-item" data-panel="sp-appearance" data-settings-theme="appearance"><span class="stv-nav-icon">${createIcon('sparkles', { size: 15 })}</span> Appearance</button>
                    <button class="stv-nav-item" data-panel="sp-terminal" data-settings-theme="terminal"><span class="stv-nav-icon">${createIcon('squareTerminal', { size: 15 })}</span> Terminal</button>
                    <button class="stv-nav-item" data-panel="sp-extensions" data-settings-theme="extensions"><span class="stv-nav-icon">${createIcon('code2', { size: 15 })}</span> Extensions</button>
                    <button class="stv-nav-item" data-panel="sp-memory" data-settings-theme="memory"><span class="stv-nav-icon">${createIcon('brain', { size: 15 })}</span> Memory</button>
                    <button class="stv-nav-item" data-panel="sp-network" data-settings-theme="network"><span class="stv-nav-icon">${createIcon('globe', { size: 15 })}</span> Network</button>
                    <button class="stv-nav-item" data-panel="sp-computer" data-settings-theme="computer"><span class="stv-nav-icon">${createIcon('camera', { size: 15 })}</span> Computer</button>
                    <button class="stv-nav-item" data-panel="sp-sync" data-settings-theme="sync"><span class="stv-nav-icon">${createIcon('share2', { size: 15 })}</span> Sync</button>
                    <button class="stv-nav-item" data-panel="sp-voice" data-settings-theme="voice"><span class="stv-nav-icon">${createIcon('mic', { size: 15 })}</span> Voice</button>
                    <div class="stv-nav-spacer"></div>
                </nav>

                <!-- ── Content panels ── -->
                <div class="stv-content-area">

                    <!-- ░ General ░ -->
                    <div class="settings-panel active settings-panel--general" id="sp-general" data-settings-theme="general">
                        <p class="stv-section-title">General</p>
                        <p class="stv-section-sub">Persona, theme, font, and display preferences.</p>

                        <div class="stv-group-label">AI Persona</div>
                        <div class="stv-card">
                            <div class="stv-row">
                                <span class="stv-row-label">Active Persona</span>
                                <select id="persona-select" style="flex:1;"></select>
                            </div>
                        </div>

                        <div class="stv-group-label">Theme &amp; Font</div>
                        <div class="stv-card">
                            <div class="stv-row">
                                <span class="stv-row-label">Color Theme</span>
                                <select id="theme-select" style="flex:1;"></select>
                            </div>
                            <div class="stv-row">
                                <span class="stv-row-label">UI Font</span>
                                <select id="font-select" style="flex:1;">
                                    <option value="spacegrotesk">Space Grotesk (Default — AI Terminal)</option>
                                    <option value="syne">Syne (Brand Display)</option>
                                    <option value="inter">Inter (Modern Clean)</option>
                                    <option value="outfit">Outfit (Premium Rounded)</option>
                                    <option value="jetbrains">JetBrains Mono (Sleek Coding)</option>
                                    <option value="vt323">VT323 (Retro Phosphor)</option>
                                    <option value="sharetech">Share Tech Mono (Futuristic Sci-Fi)</option>
                                    <option value="orbitron">Orbitron (Gamer HUD)</option>
                                    <option value="pressstart">Press Start 2P (8-Bit Arcade)</option>
                                </select>
                            </div>
                        </div>

                        <div class="stv-group-label">CRT Effects</div>
                        <div class="stv-card">
                            <div class="stv-toggle-row">
                                <div><div class="stv-toggle-label">Scanlines</div><div class="stv-toggle-desc">Overlay horizontal CRT scan-line texture</div></div>
                                <input type="checkbox" id="scanlines-toggle" style="accent-color:var(--accent-color);width:18px;height:18px;">
                            </div>
                            <div class="stv-toggle-row">
                                <div><div class="stv-toggle-label">Screen Flicker</div><div class="stv-toggle-desc">Subtle phosphor flicker animation</div></div>
                                <input type="checkbox" id="flicker-toggle" style="accent-color:var(--accent-color);width:18px;height:18px;">
                            </div>
                        </div>
                    </div>

                    <!-- ░ AI Model ░ -->
                    <div class="settings-panel settings-panel--ai" id="sp-ai" data-settings-theme="ai">
                        <p class="stv-section-title">AI Model</p>
                        <p class="stv-section-sub">Configure your LLM provider, credentials, and local models.</p>

                        <div class="stv-group-label">Provider</div>
                        <div class="stv-card">
                            <div class="stv-row">
                                <span class="stv-row-label">LLM Provider</span>
                                <select id="llm-provider-select" style="flex:1;">
                                    <option value="gemini">Google Gemini</option>
                                    <option value="ollama">Ollama (Local / Remote)</option>
                                    <option value="huggingface">Hugging Face</option>
                                </select>
                            </div>
                        </div>

                        <div class="stv-group-label">Gemini Credentials</div>
                        <div class="stv-card" id="settings-gemini-group">
                            <div class="setting-field-group" style="margin-bottom:12px;">
                                <label>API Key</label>
                                <input type="password" id="settings-gemini-key" placeholder="AIzaSy…">
                            </div>
                            <div class="setting-field-group" style="margin-bottom:0;">
                                <label>Model ID</label>
                                <input type="text" id="settings-gemini-model" placeholder="gemini-1.5-flash">
                            </div>
                        </div>

                        <div class="stv-group-label" style="display:none;" id="stv-ollama-label">Ollama Server</div>
                        <div class="stv-card" id="settings-ollama-group" style="display:none;">
                            <div class="setting-field-group" style="margin-bottom:12px;">
                                <label>Base URL</label>
                                <input type="text" id="settings-ollama-url" placeholder="http://localhost:11434">
                            </div>
                            <div class="setting-field-group" style="margin-bottom:0;">
                                <label>Model Name</label>
                                <input type="text" id="settings-ollama-model" placeholder="llama3.2:1b">
                            </div>
                        </div>

                        <div class="stv-group-label" style="display:none;" id="stv-hf-label">Hugging Face</div>
                        <div class="stv-card" id="settings-hf-group" style="display:none;">
                            <div class="setting-field-group" style="margin-bottom:12px;">
                                <label>API Key</label>
                                <input type="password" id="settings-hf-key" placeholder="hf_...">
                            </div>
                            <div class="setting-field-group" style="margin-bottom:12px;">
                                <label>Model ID</label>
                                <input type="text" id="settings-hf-model" placeholder="meta-llama/Llama-3.2-1B-Instruct">
                            </div>
                            <div class="setting-field-group" style="margin-bottom:0;">
                                <label>Base URL (optional)</label>
                                <input type="text" id="settings-hf-url" placeholder="https://api-inference.huggingface.co">
                            </div>
                        </div>

                        <div class="stv-action-bar">
                            <button class="stv-btn-ghost" id="settings-test-connection-btn">Test Connection</button>
                            <button class="stv-btn-primary" id="settings-save-llm-btn">Save &amp; Apply</button>
                        </div>
                        <div id="settings-llm-status" class="stv-status-line stv-status-row"></div>

                        <div class="stv-group-label">Local Models</div>
                        <div class="stv-card" id="settings-ollama-models-section" style="display:none;">
                            <div style="display:flex;gap:8px;margin-bottom:12px;">
                                <input type="text" id="settings-ollama-pull-input" placeholder="e.g. llama3.2:1b" style="flex:1;">
                                <button class="stv-btn-primary" id="settings-ollama-pull-btn">Pull</button>
                            </div>
                            <div id="settings-ollama-pull-progress-container" style="display:none;margin-bottom:10px;">
                                <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:4px;font-family:var(--font-mono);">
                                    <span id="settings-ollama-pull-status">Downloading…</span>
                                    <span id="settings-ollama-pull-percent">0%</span>
                                </div>
                                <div class="stv-progress-bar"><div id="settings-ollama-pull-bar" class="stv-progress-fill" style="width:0%;"></div></div>
                            </div>
                            <div id="settings-ollama-models-list" style="display:flex;flex-direction:column;gap:5px;max-height:160px;overflow-y:auto;font-family:var(--font-mono);font-size:0.78rem;">
                                <span style="opacity:0.4;font-style:italic;">Loading models…</span>
                            </div>
                        </div>
                    </div>

                    <!-- ░ Appearance ░ -->
                    <div class="settings-panel settings-panel--appearance" id="sp-appearance" data-settings-theme="appearance">
                        <p class="stv-section-title">Appearance</p>
                        <p class="stv-section-sub">Background, custom themes, and visual tuning.</p>

                        <div class="stv-group-label">Background</div>
                        <div class="stv-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <span style="font-size:0.8rem; opacity:0.6; text-transform:uppercase; letter-spacing:0.05em; font-family:var(--font-mono);">Visual Atmosphere</span>
                                <div style="display:flex; gap:6px;">
                                    <button class="stv-btn-ghost bg-tab-btn active" id="bg-tab-live" style="font-size:0.7rem; padding:0 8px; height:24px; border-radius:4px;">Live Animated</button>
                                    <button class="stv-btn-ghost bg-tab-btn" id="bg-tab-static" style="font-size:0.7rem; padding:0 8px; height:24px; border-radius:4px;">Static Presets</button>
                                </div>
                            </div>
                            
                            <!-- Live backgrounds grid -->
                            <div id="bg-gallery-live" class="bg-gallery-grid"></div>
                            
                            <!-- Static backgrounds grid -->
                            <div id="bg-gallery-static" class="bg-gallery-grid" style="display:none;"></div>

                            <div class="setting-field-group" style="margin-top:12px; margin-bottom:10px;">
                                <label>Custom Wallpaper URL</label>
                                <input type="text" id="bg-url-input" placeholder="https://…">
                            </div>
                            
                            <div class="stv-slider-row">
                                <span class="stv-row-label" style="min-width:unset;font-size:0.75rem;opacity:0.5;">Opacity</span>
                                <input type="range" id="bg-opacity-slider" min="0" max="100" value="10">
                                <span class="stv-slider-val" id="bg-opacity-val">10%</span>
                            </div>
                        </div>

                        <div class="stv-group-label">Custom Theme Builder</div>
                        <div class="stv-card">
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>Theme Name</label>
                                <input type="text" id="ct-name" placeholder="e.g. Vapor Wave">
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
                                <div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em;">Background</label><input type="color" id="ct-bg" value="#050505" style="width:100%;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none;cursor:pointer;padding:2px;"></div>
                                <div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em;">Foreground</label><input type="color" id="ct-fg" value="#D9F7FF" style="width:100%;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none;cursor:pointer;padding:2px;"></div>
                                <div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em;">Accent</label><input type="color" id="ct-accent" value="#00F0FF" style="width:100%;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none;cursor:pointer;padding:2px;"></div>
                                <div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em;">Response</label><input type="color" id="ct-response" value="#00FF88" style="width:100%;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none;cursor:pointer;padding:2px;"></div>
                                <div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em;">Warning</label><input type="color" id="ct-warning" value="#FFB000" style="width:100%;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none;cursor:pointer;padding:2px;"></div>
                                <div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em;">Error</label><input type="color" id="ct-error" value="#FF3C5A" style="width:100%;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none;cursor:pointer;padding:2px;"></div>
                            </div>
                            <div id="theme-viewport-preview" class="theme-viewport-preview">
                                <div class="tvp-bg-layer" id="tvp-bg-layer"></div>
                                <div class="tvp-header">
                                    <span class="tvp-dot"></span><span class="tvp-dot"></span><span class="tvp-dot"></span>
                                </div>
                                <div class="tvp-body">
                                    <div class="tvp-message user-msg">Hello, AI. Check systems.</div>
                                    <div class="tvp-message ai-msg">System initialized. Memory online.</div>
                                    <div class="tvp-terminal-line"><span class="tvp-prompt">neuro@deck:~$</span> <span class="tvp-cmd">./start_core.sh</span></div>
                                    <div class="tvp-warning" style="margin-top:2px;">[Warn] Node latency high</div>
                                    <div class="tvp-error">[Fail] Uplink dropped</div>
                                </div>
                            </div>
                            <button class="stv-btn-primary" id="ct-save-btn" style="width:100%;justify-content:center;">Save Theme</button>
                            <div id="ct-status" class="stv-status-line"></div>
                            <div class="stv-group-label" style="margin-top:14px;">Saved Custom Themes</div>
                            <div id="ct-list" style="display:flex;flex-direction:column;gap:6px;max-height:120px;overflow-y:auto;font-family:var(--font-mono);font-size:0.78rem;">
                                <span style="opacity:0.4;font-style:italic;">No custom themes yet.</span>
                            </div>
                        </div>
                    </div>

                    <!-- ░ Terminal ░ -->
                    <div class="settings-panel settings-panel--terminal" id="sp-terminal" data-settings-theme="terminal">
                        <p class="stv-section-title">Terminal</p>
                        <p class="stv-section-sub">Shell, display, and saved connection profiles.</p>

                        <div class="stv-group-label">Shell &amp; Display</div>
                        <div class="stv-card">
                            <div class="stv-row">
                                <span class="stv-row-label">Shell</span>
                                <select id="shell-select" style="flex:1;">
                                    <option value="default">Default</option>
                                    <option value="/bin/bash">/bin/bash</option>
                                    <option value="/bin/zsh">/bin/zsh</option>
                                    <option value="/bin/sh">/bin/sh</option>
                                    <option value="powershell.exe">powershell.exe</option>
                                    <option value="cmd.exe">cmd.exe</option>
                                    <option value="custom">Custom…</option>
                                </select>
                            </div>
                            <div id="custom-shell-group" style="display:none;">
                                <input type="text" id="custom-shell-input" placeholder="/bin/zsh" style="width:100%;margin-top:8px;">
                            </div>
                            <div class="stv-slider-row" style="margin-top:12px;">
                                <span class="stv-row-label" style="min-width:unset;font-size:0.75rem;opacity:0.5;">Font Size</span>
                                <input type="range" id="term-fontsize-slider" min="10" max="24" value="14" step="1">
                                <span class="stv-slider-val" id="term-fontsize-val">14px</span>
                            </div>
                            <div class="stv-row" style="margin-top:10px;">
                                <span class="stv-row-label">Scrollback</span>
                                <input type="number" id="term-scrollback-input" min="500" max="10000" value="2000" style="flex:1;">
                            </div>
                        </div>

                        <div class="stv-group-label">SSH Profiles</div>
                        <div class="stv-card">
                            <div class="ssh-settings-profiles-list" id="settings-ssh-profiles-list" style="font-size:0.78rem;max-height:100px;overflow-y:auto;margin-bottom:8px;">
                                <div style="opacity:0.4;font-style:italic;">No saved profiles.</div>
                            </div>
                            <button class="stv-btn-ghost" id="settings-clear-ssh-profiles" style="font-size:0.75rem;height:28px;padding:0 12px;">Clear All SSH Profiles</button>
                        </div>

                        <div class="stv-group-label">FTP Profiles</div>
                        <div class="stv-card">
                            <div class="ssh-settings-profiles-list" id="settings-ftp-profiles-list" style="font-size:0.78rem;max-height:100px;overflow-y:auto;margin-bottom:8px;">
                                <div style="opacity:0.4;font-style:italic;">No saved profiles.</div>
                            </div>
                            <button class="stv-btn-ghost" id="settings-clear-ftp-profiles" style="font-size:0.75rem;height:28px;padding:0 12px;">Clear All FTP Profiles</button>
                        </div>

                        <div class="stv-group-label">SFTP Profiles</div>
                        <div class="stv-card">
                            <div class="ssh-settings-profiles-list" id="settings-sftp-profiles-list" style="font-size:0.78rem;max-height:100px;overflow-y:auto;margin-bottom:8px;">
                                <div style="opacity:0.4;font-style:italic;">No saved profiles.</div>
                            </div>
                            <button class="stv-btn-ghost" id="settings-clear-sftp-profiles" style="font-size:0.75rem;height:28px;padding:0 12px;">Clear All SFTP Profiles</button>
                        </div>
                    </div>

                    <!-- ░ Extensions ░ -->
                    <div class="settings-panel settings-panel--extensions" id="sp-extensions" data-settings-theme="extensions">
                        <p class="stv-section-title">Extensions</p>
                        <p class="stv-section-sub">Lua plugins and the BMAD AI framework installer.</p>

                        <div class="stv-group-label">Lua Plugins</div>
                        <div class="stv-card">
                            <div style="display:flex;gap:8px;margin-bottom:10px;">
                                <input type="text" id="settings-plugin-install-url" placeholder="Raw URL to .lua plugin" style="flex:1;">
                                <button class="stv-btn-primary" id="settings-plugin-install-btn">Install</button>
                            </div>
                            <div style="display:flex;gap:8px;margin-bottom:10px;">
                                <button class="stv-btn-ghost" id="settings-plugin-new-btn" style="flex:1;font-size:0.75rem;">+ New Plugin</button>
                                <button class="stv-btn-ghost" id="settings-plugin-reload-btn" style="flex:1;font-size:0.75rem;">↺ Reload All</button>
                            </div>
                            <div id="settings-plugin-status" class="stv-status-line"></div>
                            <div id="settings-plugins-list" style="display:flex;flex-direction:column;gap:5px;max-height:150px;overflow-y:auto;font-family:var(--font-mono);font-size:0.78rem;">
                                <span style="opacity:0.4;font-style:italic;">Loading…</span>
                            </div>
                        </div>

                        <div class="stv-group-label">Plugin Marketplace</div>
                        <div class="stv-card">
                            <div class="marketplace-toolbar">
                                <input type="text" id="plugin-marketplace-search" placeholder="Search community plugins">
                                <select id="plugin-marketplace-tag">
                                    <option value="">All Tags</option>
                                </select>
                                <button class="stv-btn-ghost" id="plugin-marketplace-refresh-btn">Refresh</button>
                            </div>
                            <div id="plugin-marketplace-status" class="stv-status-line"></div>
                            <div id="plugin-marketplace-grid" class="plugin-marketplace-grid">
                                <span style="opacity:0.4;font-style:italic;">Registry not loaded.</span>
                            </div>
                        </div>

                        <div class="stv-group-label">BMAD Method v6.7.1</div>
                        <div class="stv-card">
                            <p style="font-size:0.78rem;opacity:0.6;margin:0 0 12px;line-height:1.5;">Installs <code style="color:var(--accent-color);">_bmad/</code> + <code style="color:var(--accent-color);">.claude/skills/</code> (44 Claude Code skills) into any project — no Node.js required.</p>
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>Project Directory</label>
                                <input type="text" id="bmad-target-dir" placeholder="/home/deck/myproject  or  C:\Projects\myapp">
                            </div>
                            <div style="display:flex;gap:8px;">
                                <button class="stv-btn-primary" id="bmad-install-btn" style="flex:1;">Install BMAD</button>
                                <button class="stv-btn-ghost" id="bmad-docs-btn">Docs ↗</button>
                            </div>
                            <div id="bmad-status-line" class="stv-status-line"></div>
                        </div>
                    </div>

                    <!-- ░ Memory ░ -->
                    <div class="settings-panel settings-panel--memory" id="sp-memory" data-settings-theme="memory">
                        <p class="stv-section-title">Memory</p>
                        <p class="stv-section-sub">RAG knowledge base and custom AI personas.</p>

                        <div class="stv-group-label">Personal Knowledge Base</div>
                        <div class="stv-card">
                            <p style="font-size:0.78rem;opacity:0.6;margin:0 0 12px;line-height:1.5;">Index a local folder of .txt / .md / .rst files so the AI can reference them during chat.</p>
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>Folder Path</label>
                                <input type="text" id="rag-folder-input" placeholder="/home/deck/notes">
                            </div>
                            <div style="display:flex;gap:8px;margin-bottom:10px;">
                                <button class="stv-btn-primary" id="rag-index-btn" style="flex:1;">Index Folder</button>
                                <button class="stv-btn-ghost" id="rag-clear-btn">Clear Index</button>
                            </div>
                            <div id="rag-progress-container" style="display:none;">
                                <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:4px;font-family:var(--font-mono);">
                                    <span id="rag-progress-label">Indexing…</span><span id="rag-progress-pct">0%</span>
                                </div>
                                <div class="stv-progress-bar"><div id="rag-progress-bar" class="stv-progress-fill" style="width:0%;"></div></div>
                            </div>
                            <div id="rag-status-line" class="stv-status-line"></div>
                            <p style="margin:8px 0 0;font-size:0.73rem;opacity:0.5;">Documents indexed: <span id="rag-doc-count" style="color:var(--accent-color);font-family:var(--font-mono);">0</span></p>
                        </div>

                        <div class="stv-group-label">Custom Personas</div>
                        <div class="stv-card">
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>Name</label>
                                <input type="text" id="settings-persona-name" placeholder="e.g. GamerBot">
                            </div>
                            <div class="setting-field-group" style="margin-bottom:12px;">
                                <label>System Prompt</label>
                                <textarea id="settings-persona-prompt" placeholder="You are a retro gamer bot…" rows="3" style="width:100%;box-sizing:border-box;resize:vertical;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:var(--fg-color);border-radius:8px;padding:9px 12px;font-family:var(--font-sans);font-size:0.83rem;outline:none;"></textarea>
                            </div>
                            <button class="stv-btn-primary" id="settings-persona-create-btn" style="width:100%;justify-content:center;margin-bottom:10px;">Create Persona</button>
                            <div id="settings-persona-status" class="stv-status-line"></div>
                            <div id="settings-personas-list-custom" style="display:flex;flex-direction:column;gap:5px;max-height:130px;overflow-y:auto;font-family:var(--font-mono);font-size:0.78rem;">
                                <span style="opacity:0.4;font-style:italic;">No custom personas.</span>
                            </div>
                        </div>
                    </div>

                    <!-- ░ Network ░ -->
                    <div class="settings-panel settings-panel--network" id="sp-network" data-settings-theme="network">
                        <p class="stv-section-title">Network</p>
                        <p class="stv-section-sub">MCP server and remote connection settings.</p>

                        <div class="stv-group-label">MCP Server</div>
                        <div class="stv-card">
                            <p style="font-size:0.78rem;opacity:0.6;margin:0 0 12px;line-height:1.5;">Expose NEURODECK as a <strong>Model Context Protocol</strong> server so Claude Desktop or any MCP client can invoke tools directly.</p>
                            <div class="stv-row" style="margin-bottom:12px;">
                                <span class="stv-row-label">Port</span>
                                <input type="number" id="mcp-port-input" value="13337" min="1024" max="65535" style="width:100px;">
                            </div>
                            <div style="display:flex;gap:8px;margin-bottom:10px;">
                                <button class="stv-btn-primary" id="mcp-start-btn" style="flex:1;">Start MCP Server</button>
                                <button class="stv-btn-ghost" id="mcp-stop-btn" style="flex:1;" disabled>Stop Server</button>
                            </div>
                            <div id="mcp-status-line" class="stv-status-line"></div>
                            <div id="mcp-tools-info" style="display:none;margin-top:10px;padding:10px;background:rgba(0,240,255,0.04);border:1px solid rgba(0,240,255,0.12);border-radius:8px;font-size:0.75rem;font-family:var(--font-mono);line-height:1.7;">
                                <strong style="color:var(--accent-color);">Available Tools</strong><br>
                                neurodeck_chat &nbsp;·&nbsp; run_shell &nbsp;·&nbsp; run_code<br>read_file &nbsp;·&nbsp; write_file &nbsp;·&nbsp; get_status
                            </div>
                            <div id="mcp-claude-config" style="display:none;margin-top:10px;">
                                <p style="font-size:0.72rem;opacity:0.5;margin:0 0 4px;">Add to claude_desktop_config.json:</p>
                                <pre id="mcp-claude-config-snippet" style="margin:0;padding:8px 10px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:7px;font-size:0.7rem;overflow-x:auto;white-space:pre;color:var(--response-color);"></pre>
                            </div>
                        </div>
                    </div>

                    <!-- ░ Computer Use ░ -->
                    <div class="settings-panel settings-panel--computer" id="sp-computer" data-settings-theme="computer">
                        <p class="stv-section-title">Computer Use</p>
                        <p class="stv-section-sub">Desktop screenshot, mouse, keyboard, and OCR controls for approved agent actions.</p>

                        <div class="stv-group-label">Safety Gate</div>
                        <div class="stv-card">
                            <div class="stv-toggle-row">
                                <div>
                                    <div class="stv-toggle-label">Approve All for This Session</div>
                                    <div class="stv-toggle-desc">Skips the modal until NEURODECK is reloaded.</div>
                                </div>
                                <input type="checkbox" id="computer-approve-all-toggle" style="accent-color:var(--accent-color);width:18px;height:18px;">
                            </div>
                            <p class="computer-use-warning">Actions that move the mouse, click, type, or press keys still pass an explicit approval flag to the backend. Screenshot and OCR are read-only.</p>
                        </div>

                        <div class="stv-group-label">Live Desktop Snapshot</div>
                        <div class="stv-card">
                            <div style="display:flex;gap:8px;margin-bottom:10px;">
                                <button class="stv-btn-primary" id="computer-capture-btn" style="flex:1;">Capture Screenshot</button>
                                <button class="stv-btn-ghost" id="computer-ocr-btn" style="flex:1;">Find Text</button>
                            </div>
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>OCR Text</label>
                                <input type="text" id="computer-ocr-input" placeholder="Text to locate on screen">
                            </div>
                            <div id="computer-status-line" class="stv-status-line"></div>
                            <div class="computer-preview-shell">
                                <img id="computer-preview-img" class="computer-preview-img" alt="Desktop screenshot preview">
                                <div id="computer-preview-empty" class="computer-preview-empty">No screenshot captured.</div>
                            </div>
                        </div>
                    </div>

                    <!-- ░ Sync ░ -->
                    <div class="settings-panel settings-panel--sync" id="sp-sync" data-settings-theme="sync">
                        <p class="stv-section-title">Cloud Sync</p>
                        <p class="stv-section-sub">Encrypted sync for memory records and chat sessions.</p>

                        <div class="stv-group-label">Sync Scope</div>
                        <div class="stv-card">
                            <div class="stv-toggle-row">
                                <div><div class="stv-toggle-label">Enable Cloud Sync</div><div class="stv-toggle-desc">Opt in before any data leaves this device.</div></div>
                                <input type="checkbox" id="sync-enabled-toggle" style="accent-color:var(--accent-color);width:18px;height:18px;">
                            </div>
                            <div class="stv-toggle-row">
                                <div><div class="stv-toggle-label">Memory Records</div><div class="stv-toggle-desc">Sync RAG facts and embedded chat memory.</div></div>
                                <input type="checkbox" id="sync-memory-toggle" style="accent-color:var(--accent-color);width:18px;height:18px;">
                            </div>
                            <div class="stv-toggle-row">
                                <div><div class="stv-toggle-label">Chat Sessions</div><div class="stv-toggle-desc">Sync saved conversation files.</div></div>
                                <input type="checkbox" id="sync-sessions-toggle" style="accent-color:var(--accent-color);width:18px;height:18px;">
                            </div>
                        </div>

                        <div class="stv-group-label">Sync API</div>
                        <div class="stv-card">
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>Base URL</label>
                                <input type="text" id="sync-api-url-input" placeholder="https://your-neurodeck-sync-api.fly.dev">
                            </div>
                            <div class="sync-status-grid">
                                <div><span>Device</span><strong id="sync-device-id">-</strong></div>
                                <div><span>Last Sync</span><strong id="sync-last-at">Never</strong></div>
                                <div><span>Pending</span><strong id="sync-pending-count">0</strong></div>
                                <div><span>Conflicts</span><strong id="sync-conflict-count">0</strong></div>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button class="stv-btn-primary" id="sync-save-btn" style="flex:1;">Save Sync Settings</button>
                                <button class="stv-btn-ghost" id="sync-now-btn" style="flex:1;">Sync Now</button>
                            </div>
                            <div id="sync-status-line" class="stv-status-line"></div>
                        </div>
                    </div>

                    <!-- ░ Voice ░ -->
                    <div class="settings-panel settings-panel--voice" id="sp-voice" data-settings-theme="voice">
                        <p class="stv-section-title">Voice</p>
                        <p class="stv-section-sub">Offline speech-to-text via whisper.cpp.</p>

                        <div class="stv-group-label">Whisper STT</div>
                        <div class="stv-card">
                            <p style="font-size:0.78rem;opacity:0.6;margin:0 0 12px;line-height:1.5;">When configured, the 🎙️ button routes through whisper.cpp for fully offline transcription — no internet required.</p>

                            <!-- Auto-download section -->
                            <div class="stv-group-label" style="margin-bottom:8px;">Quick Download</div>
                            <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
                                <select id="whisper-model-select" style="flex:1;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);color:inherit;border-radius:6px;padding:6px 10px;font-size:0.8rem;">
                                    <option value="base.en">base.en — 142 MB (recommended)</option>
                                    <option value="tiny.en">tiny.en — 75 MB (fastest)</option>
                                    <option value="small.en">small.en — 466 MB (accurate)</option>
                                    <option value="medium.en">medium.en — 1.5 GB (best)</option>
                                </select>
                                <button class="stv-btn-primary" id="whisper-download-btn" style="white-space:nowrap;">⬇ Download</button>
                            </div>
                            <div id="whisper-dl-progress-wrap" style="display:none;margin-bottom:10px;">
                                <div style="display:flex;justify-content:space-between;font-size:0.72rem;opacity:0.6;margin-bottom:4px;">
                                    <span id="whisper-dl-label">Downloading...</span>
                                    <span id="whisper-dl-pct">0%</span>
                                </div>
                                <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                                    <div id="whisper-dl-bar" style="height:100%;width:0%;background:var(--accent-color);transition:width 0.3s;"></div>
                                </div>
                            </div>

                            <!-- Manual config -->
                            <div class="stv-group-label" style="margin-bottom:8px;">Manual Config</div>
                            <div class="setting-field-group" style="margin-bottom:10px;">
                                <label>Binary Path</label>
                                <input type="text" id="whisper-binary-input" placeholder="whisper-cli  (or full path)">
                            </div>
                            <div class="setting-field-group" style="margin-bottom:12px;">
                                <label>Model Path</label>
                                <input type="text" id="whisper-model-input" placeholder="/path/to/ggml-base.en.bin">
                            </div>
                            <div style="display:flex;gap:8px;">
                                <button class="stv-btn-primary" id="whisper-save-btn" style="flex:1;">Save Config</button>
                                <button class="stv-btn-ghost" id="whisper-test-btn" style="flex:1;">Test Transcription</button>
                            </div>
                            <div id="whisper-status-line" class="stv-status-line"></div>
                        </div>
                    </div>

                </div><!-- end stv-content-area -->

                <!-- Close button (floating) -->
                <button class="stv-close-btn" id="close-settings-x">${createIcon('x', { size: 16 })}</button>
                <!-- Legacy close (hidden — JS still binds to it) -->
                <button id="close-settings" style="display:none;"></button>

                <!-- [legacy content removed — all IDs now live in panels above] -->
                <div class="settings-modal-content" style="display:none;"></div>
                <div class="settings-modal-footer"></div>
            </div>
        </div>

        <!-- Canvas Collaboration Modal -->
        <div class="settings-overlay" id="collab-modal">
            <div class="settings-modal-card collab-workspace-card collab-modal-card">
                <div class="settings-modal-header">
                    <div class="modal-title-stack">
                        <span class="collab-modal-kicker">Live Mesh</span>
                        <h3>Live Workspace</h3>
                    </div>
                    <button class="sidebar-toggle-btn" id="close-collab-x">${createIcon('x', { size: 16 })}</button>
                </div>
                <div class="settings-modal-content">
                    <div class="setting-field-group collab-field">
                        <label for="collab-workspace-name">Workspace:</label>
                        <input type="text" id="collab-workspace-name" class="tunnel-text-input" value="NEURODECK Workspace">
                    </div>
                    <!-- Tab toggle -->
                    <div class="collab-tab-row">
                        <button class="canvas-btn" id="collab-host-tab-btn" style="flex: 1; background: rgba(0,229,255,0.1); border-color: var(--accent-color);">Host Session</button>
                        <button class="canvas-btn" id="collab-join-tab-btn" style="flex: 1;">Join Session</button>
                    </div>
                    <!-- Host panel -->
                    <div id="collab-host-panel">
                        <div class="setting-field-group" style="margin-bottom: 10px;">
                            <label for="collab-port-input">Port:</label>
                            <input type="number" id="collab-port-input" class="tunnel-text-input" value="13338" min="1024" max="65535" style="width: 100px; box-sizing: border-box; margin: 0;">
                        </div>
                        <button class="send-prompt-btn" id="collab-host-start-btn" style="width: 100%; margin: 0 0 10px;">Start Hosting</button>
                        <div id="collab-host-waiting" class="collab-host-waiting" style="display: none;">
                            Waiting for peer... Share this address with your collaborator:<br>
                            <span id="collab-host-addr" style="color: var(--accent-color);"></span>
                            <textarea id="collab-invite-payload" class="collab-invite-payload" readonly></textarea>
                        </div>
                    </div>
                    <!-- Join panel -->
                    <div id="collab-join-panel" style="display: none;">
                        <div class="setting-field-group" style="margin-bottom: 10px;">
                            <label for="collab-addr-input">Host Address:</label>
                            <input type="text" id="collab-addr-input" class="tunnel-text-input" placeholder="192.168.1.5:13338" style="flex: 1; box-sizing: border-box; margin: 0;">
                        </div>
                        <button class="send-prompt-btn" id="collab-join-start-btn" style="width: 100%; margin: 0 0 10px;">Connect</button>
                    </div>
                    <!-- Status / active session -->
                    <div id="collab-status-line" style="font-family: var(--font-mono); font-size: 0.78rem; min-height: 16px; opacity: 0.8;"></div>
                    <div id="collab-active-panel" style="display: none; margin-top: 10px; padding: 8px; background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.2); border-radius: 4px; font-size: 0.8rem;">
                        <span style="color: var(--response-color);">✓ Peer connected</span> — edits are syncing live.
                        <div class="collab-workspace-grid">
                            <section class="collab-workspace-panel">
                                <div class="collab-panel-title">Presence</div>
                                <div id="collab-presence-list" class="collab-presence-list"></div>
                            </section>
                            <section class="collab-workspace-panel">
                                <div class="collab-panel-title">Shared Chat</div>
                                <div id="collab-chat-log" class="collab-chat-log"></div>
                                <div class="collab-chat-compose">
                                    <input type="text" id="collab-chat-input" class="tunnel-text-input" placeholder="Message workspace">
                                    <button class="canvas-btn canvas-btn-sm" id="collab-chat-send">Send</button>
                                </div>
                            </section>
                            <section class="collab-workspace-panel collab-workspace-panel-wide">
                                <div class="collab-panel-title">Shared Agent Approval</div>
                                <button class="canvas-btn canvas-btn-sm" id="collab-agent-approval-btn">Request Approval</button>
                                <div id="collab-approval-log" class="collab-approval-log"></div>
                            </section>
                        </div>
                        <button class="canvas-btn" id="collab-stop-btn" style="display: block; width: 100%; margin-top: 8px; border-color: var(--error-color); color: var(--error-color);">Disconnect</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Incoming Transfer Confirmation Modal -->
        <div class="settings-overlay" id="transfer-modal">
            <div class="settings-modal-card transfer-modal-card">
                <div class="settings-modal-header">
                    <div class="modal-title-stack">
                        <span class="transfer-modal-kicker">Trust Gate</span>
                        <h3>Incoming File Transfer</h3>
                    </div>
                    <button class="sidebar-toggle-btn" id="transfer-modal-close-x">${createIcon('x', { size: 16 })}</button>
                </div>
                <div class="settings-modal-content">
                    <p>Another S-Term peer is requesting to send you a file.</p>
                    <div class="transfer-modal-details">
                        <div class="transfer-detail-row">
                            <span class="detail-label">From Peer:</span>
                            <span class="detail-value" id="transfer-modal-peer">Deck (192.168.1.5)</span>
                        </div>
                        <div class="transfer-detail-row">
                            <span class="detail-label">File Name:</span>
                            <span class="detail-value" id="transfer-modal-filename">game_save.tar.gz</span>
                        </div>
                        <div class="transfer-detail-row">
                            <span class="detail-label">File Size:</span>
                            <span class="detail-value" id="transfer-modal-size">45.2 MB</span>
                        </div>
                    </div>
                    <p class="transfer-modal-warning">${createIcon('shieldCheck', { size: 16 })}<span>Only accept files from trusted sources on your local network.</span></p>
                </div>
                <div class="settings-modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="canvas-btn" id="transfer-modal-reject" style="background: rgba(255, 60, 90, 0.2); border-color: var(--error-color);">Reject</button>
                    <button class="send-prompt-btn" id="transfer-modal-accept" style="margin-top: 0;">Accept</button>
                </div>
            </div>
        </div>

        <!-- Game Context Panel Modal -->
        <div class="settings-overlay" id="game-context-modal">
            <div class="settings-modal-card game-context-card">
                <div class="settings-modal-header">
                    <h3>Active Game Context</h3>
                    <button class="sidebar-toggle-btn" id="close-game-context-x">${createIcon('x', { size: 16 })}</button>
                </div>
                <div class="settings-modal-content">
                    <div class="game-context-hero">
                        <img id="game-context-header" class="game-context-header-img" src="" alt="Game Header">
                        <div id="game-context-fallback" class="game-context-fallback">
                            <div class="game-context-fallback-icon">${createIcon('gamepad2', { size: 20 })}</div>
                            <div class="game-context-fallback-copy">
                                <strong id="game-context-fallback-name">No Active Game</strong>
                                <span>Open a title to inject live deck-aware assistance and notes.</span>
                            </div>
                        </div>
                    </div>
                    <div class="game-context-row">
                        <span class="game-context-label">Game Name:</span>
                        <span class="game-context-val" id="game-context-name">None Detected</span>
                    </div>
                    <div class="game-context-row">
                        <span class="game-context-label">Steam App ID:</span>
                        <span class="game-context-val" id="game-context-appid">-</span>
                    </div>
                    <div class="game-context-row">
                        <span class="game-context-label">Running Status:</span>
                        <span class="game-context-val" id="game-context-status">Offline</span>
                    </div>
                    <div style="margin-top: 15px; margin-bottom: 5px; font-weight: bold; font-size: 0.85rem; color: var(--accent-color);">STEAM DECK OPTIMIZATION NOTES</div>
                    <div id="game-context-notes" style="font-size: 0.8rem; line-height: 1.4; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 4px; max-height: 120px; overflow-y: auto;">
                        No game optimization notes available.
                    </div>
                    <div style="margin-top: 15px; margin-bottom: 5px; font-weight: bold; font-size: 0.85rem; color: var(--accent-color);">INJECTED AI PROMPT CONTEXT</div>
                    <textarea id="game-context-prompt-view" class="tunnel-text-input" readonly style="width: 100%; box-sizing: border-box; resize: none; height: 100px; font-family: var(--font-mono); font-size: 0.72rem; background: rgba(0,0,0,0.35); border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); padding: 8px;" placeholder="No active context injected."></textarea>
                    <div style="margin-top: 15px; margin-bottom: 5px; font-weight: bold; font-size: 0.85rem; color: var(--accent-color);">MY SESSION NOTES</div>
                    <textarea id="game-session-notes" class="tunnel-text-input" style="width: 100%; box-sizing: border-box; resize: vertical; height: 90px; font-family: var(--font-mono); font-size: 0.75rem; background: rgba(0,0,0,0.25); border-color: rgba(0,229,255,0.2); color: var(--foreground-color); padding: 8px;" placeholder="Personal notes for this game (auto-saved)..."></textarea>
                    <div id="game-notes-save-indicator" style="font-size: 0.72rem; opacity: 0; text-align: right; font-family: var(--font-mono); color: var(--response-color); margin-top: 3px; transition: opacity 0.4s;">Saved</div>
                </div>
                <div class="settings-modal-footer">
                    <button class="settings-close-btn" id="close-game-context" style="margin-left: auto;">Close</button>
                </div>
            </div>
        </div>

        <!-- Computer Use Approval Modal -->
        <div class="settings-overlay" id="computer-use-modal">
            <div class="settings-modal-card computer-use-modal-card">
                <div class="settings-modal-header">
                    <h3>Computer Use Approval</h3>
                    <button class="sidebar-toggle-btn" id="computer-use-deny-x">${createIcon('x', { size: 16 })}</button>
                </div>
                <div class="settings-modal-content computer-use-modal-content">
                    <div class="computer-use-modal-copy">
                        <div class="computer-use-modal-action" id="computer-use-modal-action">Pending desktop action</div>
                        <div class="computer-use-modal-details" id="computer-use-modal-details">Review the current desktop before approving.</div>
                    </div>
                    <div class="computer-approval-preview-shell">
                        <img id="computer-use-modal-img" class="computer-approval-preview" alt="Current desktop screenshot">
                        <div id="computer-use-modal-empty" class="computer-preview-empty">Screenshot unavailable.</div>
                        <div id="computer-use-target-box" class="computer-use-target-box"></div>
                    </div>
                </div>
                <div class="settings-modal-footer computer-use-modal-actions">
                    <button class="canvas-btn" id="computer-use-deny-btn">Deny</button>
                    <button class="canvas-btn" id="computer-use-approve-session-btn">Approve All for Session</button>
                    <button class="send-prompt-btn" id="computer-use-approve-btn">Approve Once</button>
                </div>
            </div>
        </div>

        <!-- Notification Center Modal -->
        <div class="settings-overlay" id="notif-modal">
            <div class="settings-modal-card notif-modal-card" style="max-width: 400px;">
                <div class="settings-modal-header">
                    <div class="modal-title-stack">
                        <span class="notif-center-kicker">Activity Feed</span>
                        <h3>Notification Center</h3>
                    </div>
                    <button class="sidebar-toggle-btn" id="close-notif-x">${createIcon('x', { size: 16 })}</button>
                </div>
                <div class="settings-modal-content" style="max-height: 350px; overflow-y: auto;" id="notif-list-container">
                    <div class="notif-empty-state">No notifications yet.</div>
                </div>
                <div class="settings-modal-footer" style="padding-top: 10px; display: flex; gap: 10px; justify-content: space-between; align-items: center;">
                    <button class="canvas-btn" id="notif-clear-all-btn" style="font-size: 0.75rem; border-color: var(--error-color); color: var(--error-color); padding: 5px 10px; margin: 0;">Clear All</button>
                    <button class="settings-close-btn" id="close-notif-btn" style="margin: 0;">Close</button>
                </div>
            </div>
        </div>


        <!-- Controller Prompt Picker Overlay -->
        <div class="ctrl-prompt-overlay" id="ctrl-prompt-overlay" aria-hidden="true">
                <div class="ctrl-prompt-modal">
                    <div class="ctrl-prompt-header">
                    <span class="ctrl-prompt-title">${createIcon('play', { size: 14 })}<span>PROMPT LIBRARY</span></span>
                    <div class="ctrl-prompt-search-wrap">
                        <input type="text" id="ctrl-prompt-search" class="ctrl-prompt-search" placeholder="Search prompts..." autocomplete="off" spellcheck="false">
                    </div>
                    <div class="ctrl-prompt-hint">B=Close &nbsp; A=Send &nbsp; L1/R1=Category &nbsp; &#x2191;&#x2193;=Navigate</div>
                </div>
                <div class="ctrl-prompt-body">
                    <div class="ctrl-prompt-categories" id="ctrl-prompt-cats"></div>
                    <div class="ctrl-prompt-list-wrap">
                        <div class="ctrl-prompt-list" id="ctrl-prompt-list"></div>
                    </div>
                </div>
                <div class="ctrl-prompt-footer">
                    <div class="ctrl-prompt-preview" id="ctrl-prompt-preview">Select a prompt to preview it here.</div>
                </div>
            </div>
        </div>

        <!-- Toast Notifications Container -->
        <div class="toast-container" id="toast-container"></div>

        <!-- Screen-reader live region for dynamic announcements -->
        <div id="sr-announcer" class="sr-only" aria-live="polite" aria-atomic="false"></div>
    </div>
    <div class="app-background-container" id="app-background-container">
        <div class="app-background-image" id="app-background-image"></div>
        <canvas class="app-background-canvas" id="app-background-canvas"></canvas>
        <div class="app-background-css" id="app-background-css"></div>
    </div>
    <!-- Keyboard Shortcuts Cheat Sheet -->
    <div class="shortcuts-overlay hidden" id="shortcuts-overlay" aria-hidden="true">
        <div class="shortcuts-card" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
            <div class="shortcuts-header">
                <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
                <button class="shortcuts-close" id="shortcuts-close" aria-label="Close shortcuts">${createIcon('x', { size: 16 })}</button>
            </div>
            <div class="shortcuts-grid">
                <div class="shortcuts-group">
                    <h4>Navigation</h4>
                    <div class="shortcuts-row"><kbd>Ctrl</kbd><kbd>K</kbd><span>Command Palette</span></div>
                    <div class="shortcuts-row"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>P</kbd><span>Prompt Library</span></div>
                    <div class="shortcuts-row"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>M</kbd><span>Agent Switcher</span></div>
                    <div class="shortcuts-row"><kbd>?</kbd><span>This Help</span></div>
                </div>
                <div class="shortcuts-group">
                    <h4>Chat</h4>
                    <div class="shortcuts-row"><kbd>Enter</kbd><span>Send Message</span></div>
                    <div class="shortcuts-row"><kbd>Ctrl</kbd><kbd>M</kbd><span>Mute / Unmute TTS</span></div>
                </div>
                <div class="shortcuts-group">
                    <h4>System</h4>
                    <div class="shortcuts-row"><kbd>Ctrl</kbd><kbd>N</kbd><span>New Chat Session</span></div>
                    <div class="shortcuts-row"><kbd>Ctrl</kbd><kbd>H</kbd><span>Toggle Sidebar</span></div>
                    <div class="shortcuts-row"><kbd>Esc</kbd><span>Close Modal / Palette</span></div>
                </div>
                <div class="shortcuts-group">
                    <h4>Gamepad</h4>
                    <div class="shortcuts-row"><kbd>A</kbd><span>Select / Click</span></div>
                    <div class="shortcuts-row"><kbd>B</kbd><span>Back / Close</span></div>
                    <div class="shortcuts-row"><kbd>Start</kbd><span>Settings</span></div>
                    <div class="shortcuts-row"><kbd>X</kbd><span>Chat View</span></div>
                    <div class="shortcuts-row"><kbd>Y</kbd><span>Cycle Persona</span></div>
                </div>
            </div>
        </div>
    </div>

    <div class="crt-overlay crt-flicker"></div>
`;

// ==========================================================================
// LIVE & STATIC BACKGROUNDS SYSTEM
// ==========================================================================
const LIVE_BACKGROUNDS = [
    { id: "matrix", name: "Matrix Rain", desc: "Digital rain streaming in accent color", preview: "linear-gradient(180deg, #050505 0%, rgba(0, 255, 136, 0.15) 100%)" },
    { id: "starfield", name: "Starfield Warp", desc: "Hyperspace travel through stars", preview: "radial-gradient(circle, rgba(255,255,255,0.15) 10%, #050505 90%)" },
    { id: "particles", name: "Quantum Net", desc: "Drifting nodes with interactive links", preview: "radial-gradient(circle at 30% 20%, rgba(0, 240, 255, 0.15) 0%, #050505 80%)" },
    { id: "grid", name: "Synthwave Grid", desc: "Retro-futuristic perspective grid", preview: "linear-gradient(0deg, rgba(255, 0, 255, 0.15) 0%, #050505 60%)" },
    { id: "radar", name: "Tactical HUD", desc: "Military scanlines & radar telemetry", preview: "radial-gradient(circle, transparent 50%, rgba(0, 240, 255, 0.1) 90%), #050505" },
    { id: "circuit", name: "Cyber Circuit", desc: "Glowing cybernetic trace paths", preview: "linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, #050505 100%)" },
    { id: "wave", name: "Digital Wave", desc: "Flowing harmonic data streams", preview: "linear-gradient(90deg, rgba(0, 240, 255, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%), #050505" },
    { id: "ascii", name: "Console Stream", desc: "Scrolling terminal kernel logs", preview: "linear-gradient(180deg, #000000 0%, rgba(0, 255, 136, 0.08) 100%)" },
    { id: "css-nebula", name: "Cosmic Nebula", desc: "CSS dynamic cosmic gas clouds", preview: "radial-gradient(circle at top right, rgba(168, 85, 247, 0.2), transparent), radial-gradient(circle at bottom left, rgba(0, 240, 255, 0.2), #050505)" },
    { id: "css-aurora", name: "Aurora Borealis", desc: "CSS hardware-accelerated polar lights", preview: "linear-gradient(220deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 240, 255, 0.15) 50%, #050505 100%)" },
];

const STATIC_BACKGROUNDS = [
    { id: "hq-1", name: "Nebula Core", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=100&w=2560", desc: "Ultra HD cosmic nebula" },
    { id: "hq-2", name: "Neon District", url: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=100&w=2560", desc: "Cyberpunk city street at night" },
    { id: "hq-3", name: "Abstract Fluid", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=100&w=2560", desc: "Dark liquid metal and glass" },
    { id: "hq-4", name: "Quantum Chip", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=100&w=2560", desc: "Macro shot of illuminated processor" },
    { id: "hq-5", name: "Data Center", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=100&w=2560", desc: "Endless rows of glowing servers" },
    { id: "hq-6", name: "Vaporwave Sun", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=100&w=2560", desc: "Retrowave sunset over digital grid" },
    { id: "hq-7", name: "Deep Ocean Base", url: "https://images.unsplash.com/photo-1682687982501-1e5898cb4693?q=100&w=2560", desc: "Submerged metallic structures" },
    { id: "hq-8", name: "Hexagon Matrix", url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=100&w=2560", desc: "Glowing geometric hex patterns" },
    { id: "hq-9", name: "Cyber Samurai", url: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=100&w=2560", desc: "Neon kanji and rain reflections" },
    { id: "hq-10", name: "Fractal Glass", url: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=100&w=2560", desc: "Shattered glowing 3D glass" },
    { id: "hq-11", name: "Aurora Night", url: "https://images.unsplash.com/photo-1531366936337-7c912a454b07?q=100&w=2560", desc: "Vivid northern lights over dark silhouette" },
    { id: "hq-12", name: "Dark Marble", url: "https://images.unsplash.com/photo-1600821034455-ee53151b7ea7?q=100&w=2560", desc: "Premium black marble texture" },
    { id: "hq-13", name: "Synth Wave", url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=100&w=2560", desc: "Abstract colorful vector waves" },
    { id: "hq-14", name: "Void Horizon", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=100&w=2560", desc: "Earth curve from orbit at night" },
    { id: "hq-15", name: "Neon Flora", url: "https://images.unsplash.com/photo-1500829243541-74b676404532?q=100&w=2560", desc: "Bioluminescent jungle leaves" },
    { id: "hq-16", name: "Code Rain", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=100&w=2560", desc: "Classic green hacker terminal" },
    { id: "hq-17", name: "Fiber Optics", url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=100&w=2560", desc: "Macro glowing fiber strands" },
    { id: "hq-18", name: "Galactic Core", url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=100&w=2560", desc: "Stunning star cluster" },
    { id: "hq-19", name: "Dark Carbon", url: "https://images.unsplash.com/photo-1596700547143-69024f2b9bf2?q=100&w=2560", desc: "Carbon fiber sleek material" },
    { id: "hq-20", name: "Laser Grid", url: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=100&w=2560", desc: "Retro 80s 3D laser landscape" }
];

class LiveBackgroundManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.currentType = null;
        this.resizeHandler = null;
        this.mouseHandler = null;
        this.particles = [];
        this.angle = 0;
        this.lastTime = 0;
        this.mouseX = -9999;
        this.mouseY = -9999;

        // Bind
        this.loop = this.loop.bind(this);
        this.resize = this.resize.bind(this);
        this.mousemove = this.mousemove.bind(this);
    }

    init() {
        this.canvas = document.getElementById("app-background-canvas");
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");

        this.resizeHandler = () => this.resize();
        this.mouseHandler = (e) => this.mousemove(e);

        window.addEventListener("resize", this.resizeHandler);
        window.addEventListener("mousemove", this.mouseHandler);
        this.resize();
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            if (this.currentType) {
                this.setupCanvasBackground(this.currentType);
            }
        }
    }

    mousemove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    destroy() {
        this.stop();
        if (this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
        }
        if (this.mouseHandler) {
            window.removeEventListener("mousemove", this.mouseHandler);
        }
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.currentType = null;
        this.particles = [];
        
        const cssEl = document.getElementById("app-background-css");
        if (cssEl) {
            cssEl.style.opacity = "0";
            cssEl.className = "app-background-css";
        }
        if (this.canvas) {
            this.canvas.style.opacity = "0";
        }
    }

    start(type) {
        if (this.currentType === type) {
            const opacity = parseFloat(localStorage.getItem("bgOpacity") || "10") / 100;
            const canvasEl = document.getElementById("app-background-canvas");
            const cssEl = document.getElementById("app-background-css");
            if (canvasEl) canvasEl.style.opacity = opacity.toString();
            if (cssEl) cssEl.style.opacity = opacity.toString();
            return;
        }

        this.stop();
        if (!this.canvas) this.init();

        this.currentType = type;
        this.lastTime = performance.now();

        const cssEl = document.getElementById("app-background-css");
        const canvasEl = document.getElementById("app-background-canvas");
        const opacity = parseFloat(localStorage.getItem("bgOpacity") || "10") / 100;

        if (type.startsWith("css-")) {
            if (cssEl) {
                cssEl.className = "app-background-css " + type;
                cssEl.style.opacity = opacity.toString();
            }
        } else {
            if (canvasEl) {
                canvasEl.style.opacity = opacity.toString();
                this.setupCanvasBackground(type);
                this.animationFrameId = requestAnimationFrame(this.loop);
            }
        }
    }

    setupCanvasBackground(type) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.particles = [];
        this.angle = 0;

        if (type === "matrix") {
            const columns = Math.floor(w / 16) + 1;
            this.particles = Array(columns).fill(0).map(() => Math.random() * -h);
        } else if (type === "starfield") {
            const numStars = 100;
            this.particles = Array(numStars).fill(0).map(() => ({
                x: Math.random() * w - w / 2,
                y: Math.random() * h - h / 2,
                z: Math.random() * w,
                color: Math.random() > 0.5 ? "var(--accent-color)" : "var(--response-color)"
            }));
        } else if (type === "particles") {
            const numParticles = 60;
            this.particles = Array(numParticles).fill(0).map(() => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                r: Math.random() * 2 + 1
            }));
        } else if (type === "grid") {
            this.angle = 0;
        } else if (type === "radar") {
            this.particles = Array(15).fill(0).map(() => ({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 2 + 1,
                alpha: Math.random(),
                speed: 0.005 + Math.random() * 0.01,
                label: `NODE_0x${Math.floor(Math.random()*256).toString(16).toUpperCase()}`
            }));
        } else if (type === "circuit") {
            const numLines = 8;
            this.particles = Array(numLines).fill(0).map(() => this.createCircuitLine(w, h));
        } else if (type === "wave") {
            this.angle = 0;
        } else if (type === "ascii") {
            const linesCount = Math.floor(h / 20) + 2;
            this.particles = Array(linesCount).fill(0).map((_, i) => ({
                text: this.getRandomLogText(),
                y: i * 20 + Math.random() * 15,
                speed: 0.5 + Math.random() * 1.5,
                alpha: 0.15 + Math.random() * 0.35
            }));
        }
    }

    createCircuitLine(w, h) {
        const startX = Math.random() * w;
        const startY = Math.random() * h;
        const angle = (Math.floor(Math.random() * 8) * Math.PI / 4);
        return {
            points: [{ x: startX, y: startY }],
            dirX: Math.cos(angle),
            dirY: Math.sin(angle),
            growSpeed: 2 + Math.random() * 2,
            stepsRemaining: Math.floor(Math.random() * 15) + 10,
            alpha: 1.0,
            color: Math.random() > 0.4 ? "var(--accent-color)" : "var(--response-color)"
        };
    }

    getRandomLogText() {
        const logs = [
            `[OK] Kernel initialized. Boot time: 0.342s`,
            `[SYSTEM] pci 0000:00:01.0: [1002:163f] type 00 class 0x030000`,
            `[DISK] sd 0:0:0:0: [sda] 1000215216 sectors (512 GB SSD)`,
            `[FS] Ext4-fs (sda8): mounted filesystem with ordered data mode`,
            `[DAEMON] systemd[1]: Started Steam Deck Controller Daemon`,
            `[AI] neurodeck-daemon: Initializing Gemini Core connection...`,
            `[AI] neurodeck-daemon: IPC channel secure (auth=keychain)`,
            `[TELEMETRY] memory load stable (12.8 GB / 16.0 GB)`,
            `[TELEMETRY] CPU load: 12% | GPU load: 8% | Temp: 58C`,
            `[NETWORK] wlan0: connection established to LAN_DECK_GRID`,
            `[TUNNEL] ssh-tunnel: tunnel service running on port 2222`,
            `[OLLAMA] Service active: listing model presets...`,
            `[DAEMON] Game Mode compositor handshake complete`,
            `[DAEMON] Battery state: discharging (98% remaining)`,
            `[DAEMON] Controller layout mapped: STEAM_INPUT_VDF`,
            `[SYSTEM] Memory pages optimized. Swap file size increased (4GB)`,
            `[SECURE] Keychain initialized. Cryptographic credentials loaded.`
        ];
        return logs[Math.floor(Math.random() * logs.length)];
    }

    loop(time) {
        if (!this.ctx || !this.canvas || !this.currentType) return;

        const delta = time - this.lastTime;
        if (delta < 33.3) {
            this.animationFrameId = requestAnimationFrame(this.loop);
            return;
        }
        this.lastTime = time;

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.draw(w, h);

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    draw(w, h) {
        const type = this.currentType;
        const ctx = this.ctx;

        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#00F0FF';
        const responseColor = getComputedStyle(document.documentElement).getPropertyValue('--response-color').trim() || '#00FF88';

        if (type === "matrix") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
            ctx.fillRect(0, 0, w, h);
            ctx.font = "14px monospace";
            
            for (let i = 0; i < this.particles.length; i++) {
                const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
                const x = i * 16;
                const y = this.particles[i];
                
                ctx.fillStyle = "#ffffff";
                ctx.fillText(char, x, y);
                
                ctx.fillStyle = accentColor;
                ctx.fillText(char, x, y - 14);
                
                this.particles[i] += 14;
                if (this.particles[i] > h && Math.random() > 0.98) {
                    this.particles[i] = 0;
                }
            }
        } else if (type === "starfield") {
            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, w, h);
            
            const cx = w / 2;
            const cy = h / 2;
            const speed = 4;
            
            for (let i = 0; i < this.particles.length; i++) {
                let star = this.particles[i];
                
                const px = (star.x / star.z) * cx + cx;
                const py = (star.y / star.z) * cy + cy;
                
                star.z -= speed;
                if (star.z <= 0) {
                    star.x = Math.random() * w - cx;
                    star.y = Math.random() * h - cy;
                    star.z = w;
                    continue;
                }
                
                const nx = (star.x / star.z) * cx + cx;
                const ny = (star.y / star.z) * cy + cy;
                
                if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) {
                    const alpha = 1 - star.z / w;
                    ctx.strokeStyle = star.color.startsWith("var") ? (star.color.includes("accent") ? accentColor : responseColor) : star.color;
                    ctx.lineWidth = alpha * 2;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(nx, ny);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1.0;
        } else if (type === "particles") {
            ctx.clearRect(0, 0, w, h);
            
            for (let i = 0; i < this.particles.length; i++) {
                let p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                
                if (this.mouseX > 0 && this.mouseY > 0) {
                    const dx = p.x - this.mouseX;
                    const dy = p.y - this.mouseY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 120) {
                        const force = (120 - dist) / 120;
                        p.x += (dx / dist) * force * 2;
                        p.y += (dy / dist) * force * 2;
                    }
                }
                
                ctx.fillStyle = accentColor;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.strokeStyle = accentColor;
            for (let i = 0; i < this.particles.length; i++) {
                let p1 = this.particles[i];
                for (let j = i + 1; j < this.particles.length; j++) {
                    let p2 = this.particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 100) {
                        ctx.globalAlpha = (100 - dist) / 100 * 0.15;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1.0;
        } else if (type === "grid") {
            ctx.clearRect(0, 0, w, h);
            
            const horizon = h * 0.45;
            const gridHeight = h - horizon;
            
            this.angle = (this.angle + 0.8) % 40;
            
            const glowGrad = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 50);
            glowGrad.addColorStop(0, "transparent");
            glowGrad.addColorStop(0.5, responseColor + "1a");
            glowGrad.addColorStop(1, "transparent");
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, horizon - 50, w, 100);
            
            ctx.strokeStyle = responseColor;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, horizon);
            ctx.lineTo(w, horizon);
            ctx.stroke();
            
            const numVerts = 30;
            for (let i = 0; i <= numVerts; i++) {
                const xTop = (w / numVerts) * i;
                const xBottom = w/2 + (xTop - w/2) * 3;
                ctx.strokeStyle = accentColor;
                ctx.globalAlpha = 0.12;
                ctx.beginPath();
                ctx.moveTo(xTop, horizon);
                ctx.lineTo(xBottom, h);
                ctx.stroke();
            }
            
            const speedRatio = this.angle / 40;
            const numHoriz = 12;
            for (let i = 0; i < numHoriz; i++) {
                const ratio = (i + speedRatio) / numHoriz;
                const y = horizon + Math.pow(ratio, 2.5) * gridHeight;
                const alpha = Math.pow(ratio, 1.5) * 0.25;
                ctx.strokeStyle = accentColor;
                ctx.globalAlpha = alpha;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        } else if (type === "radar") {
            ctx.clearRect(0, 0, w, h);
            
            const cx = w * 0.75;
            const cy = h * 0.6;
            const maxRadius = Math.min(w, h) * 0.45;
            
            this.angle = (this.angle + 0.005) % (Math.PI * 2);
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.angle);
            const radarSweep = ctx.createRadialGradient(0, 0, 10, 0, 0, maxRadius);
            radarSweep.addColorStop(0, responseColor + "33");
            radarSweep.addColorStop(1, "transparent");
            ctx.fillStyle = radarSweep;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, maxRadius, -0.4, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.restore();
            
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1;
            for (let r = 50; r <= maxRadius; r += 80) {
                ctx.globalAlpha = 0.08;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = accentColor;
                ctx.font = "8px monospace";
                ctx.fillText(`R_${r}KM`, cx + r + 3, cy - 3);
            }
            
            ctx.strokeStyle = accentColor;
            ctx.globalAlpha = 0.06;
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius, cy);
            ctx.lineTo(cx + maxRadius, cy);
            ctx.moveTo(cx, cy - maxRadius);
            ctx.lineTo(cx, cy + maxRadius);
            ctx.stroke();
            
            ctx.font = "8px monospace";
            for (let i = 0; i < this.particles.length; i++) {
                let node = this.particles[i];
                node.alpha += node.speed;
                if (node.alpha > 1 || node.alpha < 0) {
                    node.speed *= -1;
                }
                
                ctx.fillStyle = responseColor;
                ctx.globalAlpha = node.alpha * 0.3;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = accentColor;
                ctx.globalAlpha = node.alpha * 0.2;
                ctx.fillText(node.label, node.x + 6, node.y + 3);
            }
            ctx.globalAlpha = 1.0;
        } else if (type === "circuit") {
            ctx.clearRect(0, 0, w, h);
            ctx.lineWidth = 1.2;
            
            for (let i = 0; i < this.particles.length; i++) {
                let line = this.particles[i];
                
                if (line.points.length > 0 && line.stepsRemaining > 0) {
                    let lastPt = line.points[line.points.length - 1];
                    line.stepsRemaining--;
                    const nextX = lastPt.x + line.dirX * line.growSpeed;
                    const nextY = lastPt.y + line.dirY * line.growSpeed;
                    line.points.push({ x: nextX, y: nextY });
                    
                    if (line.stepsRemaining <= 0 && Math.random() > 0.3 && line.points.length < 80) {
                        line.stepsRemaining = Math.floor(Math.random() * 15) + 10;
                        const angle = (Math.floor(Math.random() * 8) * Math.PI / 4);
                        line.dirX = Math.cos(angle);
                        line.dirY = Math.sin(angle);
                    }
                }
                
                if (line.points.length > 1) {
                    ctx.strokeStyle = line.color.startsWith("var") ? (line.color.includes("accent") ? accentColor : responseColor) : line.color;
                    ctx.globalAlpha = line.alpha * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(line.points[0].x, line.points[0].y);
                    for (let j = 1; j < line.points.length; j++) {
                        ctx.lineTo(line.points[j].x, line.points[j].y);
                    }
                    ctx.stroke();
                    
                    const head = line.points[line.points.length - 1];
                    ctx.fillStyle = line.color.startsWith("var") ? (line.color.includes("accent") ? accentColor : responseColor) : line.color;
                    ctx.globalAlpha = line.alpha * 0.4;
                    ctx.beginPath();
                    ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                line.alpha -= 0.001;
                if (line.alpha <= 0 || (line.points.length >= 80 && line.stepsRemaining <= 0)) {
                    this.particles[i] = this.createCircuitLine(w, h);
                }
            }
            ctx.globalAlpha = 1.0;
        } else if (type === "wave") {
            ctx.clearRect(0, 0, w, h);
            this.angle += 0.02;
            
            const waveConfigs = [
                { amp: 40, freq: 0.003, phase: this.angle, color: accentColor, opacity: 0.1 },
                { amp: 25, freq: 0.005, phase: this.angle * 1.5, color: responseColor, opacity: 0.08 },
                { amp: 15, freq: 0.008, phase: this.angle * 0.8, color: '#A855F7', opacity: 0.06 }
            ];
            
            for (let c = 0; c < waveConfigs.length; c++) {
                const config = waveConfigs[c];
                ctx.strokeStyle = config.color;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = config.opacity;
                
                ctx.beginPath();
                const midY = h / 2 + Math.sin(config.phase * 0.2) * 50;
                ctx.moveTo(0, midY);
                
                for (let x = 0; x < w; x += 10) {
                    const y = midY + Math.sin(x * config.freq + config.phase) * config.amp * Math.sin(x / w * Math.PI);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        } else if (type === "ascii") {
            ctx.fillStyle = "#020305";
            ctx.fillRect(0, 0, w, h);
            
            ctx.font = "12px monospace";
            ctx.fillStyle = accentColor;
            
            for (let i = 0; i < this.particles.length; i++) {
                const line = this.particles[i];
                
                ctx.globalAlpha = line.alpha;
                ctx.fillText(line.text, 15, line.y);
                
                line.y -= line.speed;
                if (line.y < -20) {
                    line.y = h + 20;
                    line.text = this.getRandomLogText();
                    line.speed = 0.5 + Math.random() * 1.5;
                    line.alpha = 0.15 + Math.random() * 0.35;
                }
            }
            ctx.globalAlpha = 1.0;
        }
    }
}

window.liveBgManager = new LiveBackgroundManager();

function renderBackgroundGallery() {
    const liveContainer = document.getElementById("bg-gallery-live");
    const staticContainer = document.getElementById("bg-gallery-static");
    if (!liveContainer || !staticContainer) return;

    function createCard(bg, isLive) {
        const card = document.createElement("div");
        card.className = "bg-gallery-card";
        card.setAttribute("data-id", bg.id);
        if (!isLive) card.setAttribute("data-url", bg.url);

        const preview = document.createElement("div");
        preview.className = "bg-gallery-card-preview";
        if (isLive) {
            preview.style.background = bg.preview;
        } else if (bg.url) {
            preview.style.backgroundImage = `url('${bg.url}')`;
        } else {
            preview.style.background = "#050505";
        }

        const title = document.createElement("div");
        title.className = "bg-gallery-card-title";
        title.innerText = bg.name;

        const desc = document.createElement("div");
        desc.className = "bg-gallery-card-desc";
        desc.innerText = bg.desc;

        card.appendChild(preview);
        card.appendChild(title);
        card.appendChild(desc);

        card.onclick = function() {
            document.querySelectorAll(".bg-gallery-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            const url = isLive ? `live:${bg.id}` : bg.url;
            const bgUrlInput = document.getElementById("bg-url-input");
            if (bgUrlInput) {
                bgUrlInput.value = url;
            }
            localStorage.setItem("bgUrl", url);
            
            // Update the miniature preview viewport background
            const tvpBgLayer = document.getElementById("tvp-bg-layer");
            if (tvpBgLayer) {
                if (isLive) {
                    tvpBgLayer.style.backgroundImage = "none";
                    tvpBgLayer.style.backgroundColor = bg.preview || "#050505";
                } else if (bg.url) {
                    tvpBgLayer.style.backgroundColor = "transparent";
                    tvpBgLayer.style.backgroundImage = `url('${bg.url}')`;
                } else {
                    tvpBgLayer.style.backgroundImage = "none";
                    tvpBgLayer.style.backgroundColor = "transparent";
                }
            }

            applySettings();
        };

        return card;
    }

    liveContainer.innerHTML = "";
    staticContainer.innerHTML = "";

    const noneLiveCard = createCard({ id: "", name: "None (Solid Black)", desc: "Deep matte black battery-saver mode", preview: "#050505" }, true);
    liveContainer.appendChild(noneLiveCard);

    LIVE_BACKGROUNDS.forEach(bg => {
        liveContainer.appendChild(createCard(bg, true));
    });

    const noneStaticCard = createCard({ id: "", name: "None (Solid Black)", url: "", desc: "Deep matte black battery-saver mode" }, false);
    staticContainer.appendChild(noneStaticCard);

    STATIC_BACKGROUNDS.forEach(bg => {
        staticContainer.appendChild(createCard(bg, false));
    });

    const tabLive = document.getElementById("bg-tab-live");
    const tabStatic = document.getElementById("bg-tab-static");
    
    if (tabLive && tabStatic) {
        tabLive.onclick = function() {
            tabLive.classList.add("active");
            tabStatic.classList.remove("active");
            liveContainer.style.display = "grid";
            staticContainer.style.display = "none";
        };
        tabStatic.onclick = function() {
            tabStatic.classList.add("active");
            tabLive.classList.remove("active");
            staticContainer.style.display = "grid";
            liveContainer.style.display = "none";
        };
    }

    // --- Theme Viewport Preview Color Wiring ---
    function updateThemePreview() {
        const tvpPreview = document.getElementById("theme-viewport-preview");
        if (!tvpPreview) return;
        const bg = document.getElementById("ct-bg")?.value || "#050505";
        const fg = document.getElementById("ct-fg")?.value || "#D9F7FF";
        const accent = document.getElementById("ct-accent")?.value || "#00F0FF";
        const response = document.getElementById("ct-response")?.value || "#00FF88";
        const warning = document.getElementById("ct-warning")?.value || "#FFB000";
        const error = document.getElementById("ct-error")?.value || "#FF3C5A";

        tvpPreview.style.setProperty("--preview-bg", bg);
        tvpPreview.style.setProperty("--preview-fg", fg);
        tvpPreview.style.setProperty("--preview-accent", accent);
        tvpPreview.style.setProperty("--preview-response", response);
        tvpPreview.style.setProperty("--preview-warning", warning);
        tvpPreview.style.setProperty("--preview-error", error);
    }

    const colorInputs = ["ct-bg", "ct-fg", "ct-accent", "ct-response", "ct-warning", "ct-error"];
    colorInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateThemePreview);
    });
    // Initial sync
    updateThemePreview();
}
window.renderBackgroundGallery = renderBackgroundGallery;



/* --- SEPARATOR --- */

// ==========================================================================
// STEAM DECK CONTROLLER (GAMEPAD API) INPUT WIRING
// ==========================================================================
// let gamepadActive = false; (Moved to state.js)
// let gamepadFocusIndex = -1; (Moved to state.js)
// Removed state.previousGamepadState multiline declaration (moved to state.js)

// Sprint C — Touchpad cursor state
// let tpCursorX = 640; (Moved to state.js) // Start at screen center (1280/2)
// let tpCursorY = 400; (Moved to state.js) // Start at screen center (800/2)
// let tpCursorVisible = false; (Moved to state.js)
// let tpCursorHideTimer = null; (Moved to state.js)
// let tpScrollVisible = false; (Moved to state.js)
// let tpScrollHideTimer = null; (Moved to state.js)
const TP_SENSITIVITY   = 9;   // pixels per frame per axis unit
const TP_DEADZONE      = 0.06; // ignore jitter below this magnitude
const TP_SCROLL_SPEED  = 14;  // pixels per frame for left-stick scroll
const TP_CURSOR_TIMEOUT = 2500; // ms idle before cursor fades

function initTouchpadCursorDOM() {
    const cursor = document.createElement("div");
    cursor.id = "tp-cursor";
    document.body.appendChild(cursor);

    const scrollInd = document.createElement("div");
    scrollInd.id = "tp-scroll-indicator";
    scrollInd.innerHTML = `
        <div class="tp-scroll-arrow tp-scroll-arrow-up"></div>
        <div class="tp-scroll-arrow tp-scroll-arrow-down"></div>`;
    document.body.appendChild(scrollInd);
}
initTouchpadCursorDOM();

function moveTpCursor(dx, dy) {
    state.tpCursorX = Math.max(0, Math.min(window.innerWidth  - 1, state.tpCursorX + dx));
    state.tpCursorY = Math.max(0, Math.min(window.innerHeight - 1, state.tpCursorY + dy));
    const el = document.getElementById("tp-cursor");
    if (el) {
        el.style.left = state.tpCursorX + "px";
        el.style.top  = state.tpCursorY + "px";
        el.classList.add("tp-visible");
    }
    state.tpCursorVisible = true;
    clearTimeout(state.tpCursorHideTimer);
    state.tpCursorHideTimer = setTimeout(() => {
        const c = document.getElementById("tp-cursor");
        if (c) c.classList.remove("tp-visible");
        state.tpCursorVisible = false;
    }, TP_CURSOR_TIMEOUT);
}

function tpClick(button = 0) {
    const el = document.elementFromPoint(state.tpCursorX, state.tpCursorY);
    if (!el) return;
    const cursor = document.getElementById("tp-cursor");
    if (cursor) {
        cursor.classList.add("tp-clicking");
        setTimeout(() => cursor.classList.remove("tp-clicking"), 120);
    }
    // Dispatch full pointer/mouse/click event chain
    const opts = { bubbles: true, cancelable: true, clientX: state.tpCursorX, clientY: state.tpCursorY, button };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown",     opts));
    el.dispatchEvent(new PointerEvent("pointerup",   opts));
    el.dispatchEvent(new MouseEvent("mouseup",       opts));
    el.dispatchEvent(new MouseEvent("click",         opts));
    // Focus text inputs on click
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) {
        el.focus();
    }
}

function getActiveScrollContainer() {
    // Returns the best scrollable container for the currently visible view
    const views = ["chat-viewport","agent-log","memory-list","ftp-file-list","sftp-file-list","sidebar-history"];
    for (const id of views) {
        const el = document.getElementById(id);
        if (el && el.offsetParent !== null && el.scrollHeight > el.clientHeight) return el;
    }
    // Fallback: any overflow-y element under cursor
    return null;
}

function showTpScrollIndicator(active) {
    const el = document.getElementById("tp-scroll-indicator");
    if (!el) return;
    if (active) {
        el.classList.add("tp-visible");
        clearTimeout(state.tpScrollHideTimer);
        state.tpScrollHideTimer = setTimeout(() => {
            el.classList.remove("tp-visible");
            state.tpScrollVisible = false;
        }, 1200);
        state.tpScrollVisible = true;
    } else {
        el.classList.remove("tp-visible");
        state.tpScrollVisible = false;
    }
}

// Radial menu state
// let radialMenuVisible = false; (Moved to state.js)
// let radialSelectedSegment = null; (Moved to state.js)

// Controller Prompt Picker state (declared here so pollGamepads can reference it)

const RADIAL_SEGMENTS = [
    { icon: "messageSquare", label: "Chat", view: "chat" },
    { icon: "code2", label: "Canvas", view: "canvas" },
    { icon: "squareTerminal", label: "Terminal", view: "terminal" },
    { icon: "server", label: "SSH", view: "ssh" },
    { icon: "route", label: "Tunnel", view: "tunnel" },
    { icon: "globe", label: "Browser", view: "browser" },
    { icon: "bot", label: "Agent", view: "agent" },
    { icon: "brain", label: "Memory", view: "memory" },
    { icon: "share2", label: "Share", view: "share" },
    { icon: "panelRightOpen", label: "Remote", view: "remote" },
    { icon: "sparkles", label: "PromptLab", view: "prompt-lab" },
    { icon: "fileText", label: "Docs", view: "docs" },
];

function getGamepadFocusableElements() {
    // If ctrl prompt picker is open, return empty (handled separately in pollGamepads)
    if (getCtrlPromptVisible()) return [];

    // If state.notifications modal is open, focus only notif modal elements
    const notifModal = document.getElementById("notif-modal");
    if (notifModal && notifModal.classList.contains("active")) {
        const els = Array.from(notifModal.querySelectorAll("button"));
        return els.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !el.disabled;
        });
    }

    // If game context modal is open, focus only its elements
    const gameModal = document.getElementById("game-context-modal");
    if (gameModal && gameModal.classList.contains("active")) {
        const els = Array.from(gameModal.querySelectorAll("button"));
        return els.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !el.disabled;
        });
    }

    const computerUseModal = document.getElementById("computer-use-modal");
    if (computerUseModal && computerUseModal.classList.contains("active")) {
        const els = Array.from(computerUseModal.querySelectorAll("button"));
        return els.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !el.disabled;
        });
    }

    // If settings overlay is open, focus only settings elements
    const settingsOverlay = document.getElementById("settings-overlay");
    if (settingsOverlay && settingsOverlay.classList.contains("active")) {
        const els = Array.from(settingsOverlay.querySelectorAll("select, input, button"));
        // filter out hidden/disabled elements
        return els.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !el.disabled;
        });
    }

    // If transfer confirmation modal is open, focus only its buttons
    const transferModal = document.getElementById("transfer-modal");
    if (transferModal && transferModal.classList.contains("active")) {
        const els = Array.from(transferModal.querySelectorAll("button"));
        return els.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !el.disabled;
        });
    }

    // Otherwise, build a list of visible elements from active view and layout
    const selectors = [
        // Sidebar if not collapsed
        "#sidebar:not(.collapsed) #sidebar-close-btn",
        "#sidebar:not(.collapsed) #new-chat-btn",
        "#sidebar:not(.collapsed) .history-item",
        
        // Top nav buttons
        "#sidebar-toggle-btn",
        ".nav-tab",
        "#mute-btn",
        "#notif-btn",
        "#settings-btn",
        
        // Chat View
        "#view-chat.active #user-input",
        "#view-chat.active #mic-btn",
        "#view-chat.active #toggle-drawer-btn",
        "#view-chat.active #send-btn",
        "#view-chat.active .code-header-btn",
        
        // Canvas View
        "#view-canvas.active #canvas-run-btn",
        "#view-canvas.active #canvas-clear-btn",
        "#view-canvas.active #canvas-copy-btn",
        "#view-canvas.active #canvas-lang-select",
        "#view-canvas.active #canvas-collab-btn",
        
        // Terminal View
        "#view-terminal.active #pty-reconnect-btn",
        
        // Tunnel View
        "#view-tunnel.active #tunnel-check-btn",
        "#view-tunnel.active #tunnel-toggle-btn",
        "#view-tunnel.active #tunnel-cmd-input",
        "#view-tunnel.active #tunnel-cmd-send",
        "#view-tunnel.active #tunnel-filepath-input",
        "#view-tunnel.active #tunnel-filecontent-input",
        "#view-tunnel.active #tunnel-file-send",
        "#view-tunnel.active #tunnel-dirpath-input",
        "#view-tunnel.active #tunnel-dir-send",
        
        // Share View
        "#view-share.active .peer-item",
        "#view-share.active #share-dropzone",
        "#view-share.active #share-filepath-input",
        "#view-share.active #share-send-btn",
        
        // Memory View
        "#view-memory.active #memory-search-input",
        "#view-memory.active #memory-refresh-btn",
        "#view-memory.active #memory-fact-input",
        "#view-memory.active #memory-fact-save-btn",

        // Agent View
        "#view-agent.active #agent-task-input",
        "#view-agent.active #agent-run-btn",
        "#view-agent.active #agent-stop-btn",
        "#view-agent.active #agent-send-canvas-btn",

        // Docs View
        "#view-docs.active #docs-search-input",
        "#view-docs.active #docs-search-btn",
        "#view-docs.active #docs-index-btn",
        "#view-docs.active #docs-clear-btn",
        "#view-docs.active .docs-remove-btn",

        // Inspect Drawer if not collapsed
        "#inspect-drawer:not(.collapsed) #inspect-close-btn"
    ];

    const elements = [];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !el.disabled) {
                elements.push(el);
            }
        });
    });
    return elements;
}

function updateGamepadFocus(index) {
    const els = getGamepadFocusableElements();
    document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
    
    if (els.length === 0) {
        state.gamepadFocusIndex = -1;
        return;
    }
    
    if (index < 0) {
        state.gamepadFocusIndex = els.length - 1;
    } else if (index >= els.length) {
        state.gamepadFocusIndex = 0;
    } else {
        state.gamepadFocusIndex = index;
    }
    
    const target = els[state.gamepadFocusIndex];
    if (target) {
        target.classList.add("gamepad-focused");
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
        if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") {
            target.focus();
        }
    }
}

document.addEventListener("mousedown", () => {
    document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
    state.gamepadFocusIndex = -1;
});

function initRadialMenu() {
    const overlay = document.createElement("div");
    overlay.id = "radial-menu";
    overlay.className = "radial-menu";
    overlay.setAttribute("aria-hidden", "true");

    // Build SVG pie ring — 10 sectors of 36° each
    const R_OUTER = 130;
    const R_INNER = 52;
    const CX = 150;
    const CY = 150;
    const SEG_COUNT = RADIAL_SEGMENTS.length;
    const SEG_DEG = 360 / SEG_COUNT;

    function polarToXY(angleDeg, r) {
        const rad = (angleDeg - 90) * Math.PI / 180;
        return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
    }

    let svgPaths = "";
    RADIAL_SEGMENTS.forEach((seg, i) => {
        const startAngle = i * SEG_DEG - SEG_DEG / 2;
        const endAngle = startAngle + SEG_DEG;
        const p1 = polarToXY(startAngle, R_INNER);
        const p2 = polarToXY(startAngle, R_OUTER);
        const p3 = polarToXY(endAngle, R_OUTER);
        const p4 = polarToXY(endAngle, R_INNER);
        const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${R_OUTER} ${R_OUTER} 0 0 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${R_INNER} ${R_INNER} 0 0 0 ${p1.x} ${p1.y} Z`;
        svgPaths += `<path class="radial-slice" data-segment="${i}" d="${d}" />`;
    });

    // Build item labels positioned around the ring
    const LABEL_R = 105;
    let items = "";
    RADIAL_SEGMENTS.forEach((seg, i) => {
        const angleDeg = i * SEG_DEG;
        const rad = (angleDeg - 90) * Math.PI / 180;
        const x = CX + LABEL_R * Math.cos(rad);
        const y = CY + LABEL_R * Math.sin(rad);
        items += `<div class="radial-item" data-segment="${i}" style="left:${x}px;top:${y}px">
            <span class="radial-item-icon">${seg.icon}</span>
            <span class="radial-item-label">${seg.label}</span>
        </div>`;
    });

    overlay.innerHTML = `
        <div class="radial-backdrop"></div>
        <div class="radial-ring" id="radial-ring">
            <svg class="radial-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                ${svgPaths}
            </svg>
            ${items}
            <div class="radial-center" id="radial-center-label">
                <span class="radial-center-icon" id="radial-center-icon">🎮</span>
                <span class="radial-center-text" id="radial-center-text">MENU</span>
            </div>
        </div>
        <div class="radial-hint">Release L2 to navigate · Push stick to select</div>`;

    document.body.appendChild(overlay);
}

function showRadialMenu() {
    const el = document.getElementById("radial-menu");
    if (el) el.classList.add("active");
    state.radialMenuVisible = true;
    state.radialSelectedSegment = null;
    updateRadialDisplay(null);
}

function hideRadialMenu() {
    const el = document.getElementById("radial-menu");
    if (el) el.classList.remove("active");
    state.radialMenuVisible = false;
    state.radialSelectedSegment = null;
}

function getRadialSegmentFromStick(x, y) {
    const DEADZONE = 0.38;
    if (Math.sqrt(x * x + y * y) < DEADZONE) return null;
    // atan2(x, -y) gives 0=up, increasing clockwise
    let angle = Math.atan2(x, -y) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    // Offset by half-segment so segments are centered on cardinal/diagonal directions
    const segDeg = 360 / RADIAL_SEGMENTS.length;
    angle = (angle + segDeg / 2) % 360;
    return Math.floor(angle / segDeg) % RADIAL_SEGMENTS.length;
}

function updateRadialDisplay(segIdx) {
    state.radialSelectedSegment = segIdx;

    // Update slice highlights
    document.querySelectorAll(".radial-slice").forEach(slice => {
        const si = parseInt(slice.dataset.segment, 10);
        slice.classList.toggle("active", si === segIdx);
    });
    // Update item highlights
    document.querySelectorAll(".radial-item").forEach(item => {
        const si = parseInt(item.dataset.segment, 10);
        item.classList.toggle("active", si === segIdx);
    });

    const centerIcon = document.getElementById("radial-center-icon");
    const centerText = document.getElementById("radial-center-text");
    if (segIdx !== null && RADIAL_SEGMENTS[segIdx]) {
        const seg = RADIAL_SEGMENTS[segIdx];
        if (centerIcon) centerIcon.textContent = seg.icon;
        if (centerText) centerText.textContent = seg.label;
    } else {
        if (centerIcon) centerIcon.textContent = "🎮";
        if (centerText) centerText.textContent = "MENU";
    }
}

function activateRadialSegment(segIdx) {
    if (segIdx === null || !RADIAL_SEGMENTS[segIdx]) return;
    const view = RADIAL_SEGMENTS[segIdx].view;
    const tab = document.querySelector(`.nav-tab[data-view="${view}"]`);
    if (tab) tab.click();
}

function pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            gp = gamepads[i];
            break;
        }
    }

    if (!gp) {
        if (state.gamepadActive) {
            state.gamepadActive = false;
            document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
            state.gamepadFocusIndex = -1;
        }
        requestAnimationFrame(pollGamepads);
        return;
    }

    state.gamepadActive = true;

    function buttonPressed(index) {
        const isPressed = gp.buttons[index] && gp.buttons[index].pressed;
        const wasPressed = state.previousGamepadState.buttons[index];
        return isPressed && !wasPressed;
    }

    // A Button (0) - Click active element / confirm prompt picker
    if (buttonPressed(0)) {
        if (getCtrlPromptVisible()) {
            if (getCtrlPromptTemplateMode()) {
                confirmTemplateAndSend();
            } else {
                confirmCtrlPrompt();
            }
        } else {
            const els = getGamepadFocusableElements();
            const activeEl = els[state.gamepadFocusIndex];
            if (activeEl) {
                activeEl.click();
                if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
                    activeEl.focus();
                }
            } else {
                updateGamepadFocus(0);
            }
        }
    }

    // B Button (1) - Close overlays/menus (ctrl prompt picker takes priority)
    if (buttonPressed(1)) {
        if (getCtrlPromptVisible()) {
            if (getCtrlPromptTemplateMode()) {
                exitTemplateMode();
            } else {
                closeCtrlPromptOverlay();
            }
            // skip normal B handling
        }
    }
    if (buttonPressed(1) && !getCtrlPromptVisible()) {
        const settingsOverlay = document.getElementById("settings-overlay");
        const transferModal = document.getElementById("transfer-modal");
        const inspectDrawer = document.getElementById("inspect-drawer");
        const sidebar = document.getElementById("sidebar");
        const notifModal = document.getElementById("notif-modal");
        const gameModal = document.getElementById("game-context-modal");
        const computerUseModal = document.getElementById("computer-use-modal");
        if (notifModal && notifModal.classList.contains("active")) {
            document.getElementById("close-notif-btn").click();
        } else if (gameModal && gameModal.classList.contains("active")) {
            document.getElementById("close-game-context").click();
        } else if (computerUseModal && computerUseModal.classList.contains("active")) {
            document.getElementById("computer-use-deny-btn").click();
        } else if (settingsOverlay && settingsOverlay.classList.contains("active")) {
            document.getElementById("close-settings").click();
        } else if (transferModal && transferModal.classList.contains("active")) {
            document.getElementById("transfer-modal-reject").click();
        } else if (inspectDrawer && !inspectDrawer.classList.contains("collapsed")) {
            document.getElementById("inspect-close-btn").click();
        } else if (sidebar && !sidebar.classList.contains("collapsed")) {
            document.getElementById("sidebar-close-btn").click();
        }
    }

    // L2 (6) / R2 (7) - Cycle inner tabs (e.g. Share LAN/SFTP/FTP)
    if (buttonPressed(6) || buttonPressed(7)) {
        const shareView = document.getElementById("view-share");
        if (shareView && shareView.classList.contains("active")) {
            const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
            const activeSubtabIdx = subtabs.findIndex(t => t.classList.contains("active"));
            if (activeSubtabIdx !== -1) {
                const nextSubtabIdx = buttonPressed(6) // L2
                    ? (activeSubtabIdx - 1 + subtabs.length) % subtabs.length
                    : (activeSubtabIdx + 1) % subtabs.length;
                subtabs[nextSubtabIdx].click();
            }
        }
    }

    // R2 (7) when NOT in share view → toggle Controller Prompt Picker
    if (buttonPressed(7)) {
        const shareView = document.getElementById("view-share");
        if (!(shareView && shareView.classList.contains("active"))) {
            if (getCtrlPromptVisible()) {
                getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay();
            } else {
                openCtrlPromptOverlay();
                // Auto-show VK in gamepad mode so search field is immediately typeable
                if (state.gamepadActive && window.showVirtualKeyboard) {
                    setTimeout(() => {
                        const searchEl = document.getElementById("ctrl-prompt-search");
                        if (searchEl) { searchEl.focus(); window.showVirtualKeyboard(searchEl); }
                    }, 120);
                }
            }
        }
    }

    // X Button (2) - Go to Chat tab and focus input (blocked when prompt picker open)
    if (buttonPressed(2) && !getCtrlPromptVisible()) {
        const chatTab = document.querySelector('.nav-tab[data-view="chat"]');
        if (chatTab) {
            chatTab.click();
        }
        setTimeout(() => {
            const userInput = document.getElementById("user-input");
            if (userInput) {
                userInput.focus();
                const els = getGamepadFocusableElements();
                const uidx = els.indexOf(userInput);
                if (uidx !== -1) {
                    updateGamepadFocus(uidx);
                }
            }
        }, 50);
    }

    // Y Button (3) - Cycle active persona (blocked when prompt picker open)
    if (buttonPressed(3) && !getCtrlPromptVisible()) {
        if (state.availablePersonas && state.availablePersonas.length > 0) {
            const currentIdx = state.availablePersonas.indexOf(state.activePersona);
            const nextIdx = (currentIdx + 1) % state.availablePersonas.length;
            const nextPersona = state.availablePersonas[nextIdx];
            invoke("set_persona", { name: nextPersona }).then((msg) => {
                state.activePersona = nextPersona;
                let chatViewport = document.getElementById("chat-viewport");
                let viewport = document.getElementById("chat-workspace");
                let div = document.createElement("div");
                div.className = "message system";
                div.innerHTML = `
                    <div class="message-card">
                        System: ${msg} (Gamepad Cycle)
                    </div>
                `;
                chatViewport.appendChild(div);
                viewport.scrollTop = viewport.scrollHeight;
                const select = document.getElementById("persona-select");
                if (select) select.value = nextPersona;
            }).catch(err => console.error("Error setting persona via Gamepad:", err));
        }
    }

    // L1 (4) / R1 (5) - When prompt overlay: switch categories; else cycle app tabs
    if ((buttonPressed(4) || buttonPressed(5)) && getCtrlPromptVisible()) {
        navigateCtrlPromptCat(buttonPressed(4) ? -1 : 1);
    }

    // L1 (4) / R1 (5) - Cycle tabs; when SSH tab active, also load focused SSH profile
    if ((buttonPressed(4) || buttonPressed(5)) && !getCtrlPromptVisible()) {
        const sshView = document.getElementById("view-ssh");
        if (sshView && sshView.classList.contains("active")) {
            // L1 in SSH: load the currently D-pad-focused profile (A-button equivalent)
            // R1 in SSH: same — pressing either loads the selected profile
            const focused = document.querySelector("#ssh-profiles-list .ssh-profile-item.gamepad-focused");
            if (focused) {
                focused.click();
            } else {
                // Fall through to tab cycling below
            }
        }
        const tabs = Array.from(document.querySelectorAll(".nav-tab"));
        const activeTabIdx = tabs.findIndex(tab => tab.classList.contains("active"));
        if (activeTabIdx !== -1) {
            let nextIdx = activeTabIdx;
            if (buttonPressed(4)) {
                nextIdx = (activeTabIdx - 1 + tabs.length) % tabs.length;
            } else {
                nextIdx = (activeTabIdx + 1) % tabs.length;
            }
            if (nextIdx !== activeTabIdx) {
                tabs[nextIdx].click();
                state.gamepadFocusIndex = -1;
                document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
            }
        }
    }

    // Select Button (8) - Run Canvas Code (blocked when prompt picker open)
    if (buttonPressed(8) && !getCtrlPromptVisible()) {
        const runBtn = document.getElementById("canvas-run-btn");
        if (runBtn) {
            runBtn.click();
        }
    }

    // Start Button (9) - Toggle settings modal (blocked when prompt picker open)
    if (buttonPressed(9) && !getCtrlPromptVisible()) {
        const settingsOverlay = document.getElementById("settings-overlay");
        if (settingsOverlay) {
            if (settingsOverlay.classList.contains("active")) {
                document.getElementById("close-settings").click();
            } else {
                document.getElementById("settings-btn").click();
            }
        }
    }

    // D-pad Up (12) / Down (13)
    // When ctrl prompt visible: navigate list or template placeholders
    // When Share tab is active: cycle inner tabs (LAN / SFTP / FTP)
    // When SSH tab is active: cycle saved profile list items
    // Otherwise: move gamepad focus index
    if (buttonPressed(12) || buttonPressed(13)) {
        const goUp = buttonPressed(12);
        if (getCtrlPromptVisible()) {
            if (getCtrlPromptTemplateMode()) {
                navigateTemplatePlaceholder(goUp ? -1 : 1);
            } else {
                navigateCtrlPromptList(goUp ? -1 : 1);
            }
        }
    }
    if ((buttonPressed(12) || buttonPressed(13)) && !getCtrlPromptVisible()) {
        const shareView = document.getElementById("view-share");
        const sshView = document.getElementById("view-ssh");
        const goUp = buttonPressed(12);
        if (shareView && shareView.classList.contains("active")) {
            const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
            const activeIdx = subtabs.findIndex(t => t.classList.contains("active"));
            if (activeIdx !== -1) {
                const nextIdx = goUp
                    ? (activeIdx - 1 + subtabs.length) % subtabs.length
                    : (activeIdx + 1) % subtabs.length;
                subtabs[nextIdx].click();
            }
        } else if (sshView && sshView.classList.contains("active")) {
            const profileItems = Array.from(document.querySelectorAll("#ssh-profiles-list .ssh-profile-item"));
            if (profileItems.length > 0) {
                const selectedIdx = profileItems.findIndex(el => el.classList.contains("gamepad-focused"));
                const nextIdx = goUp
                    ? Math.max(0, (selectedIdx === -1 ? profileItems.length - 1 : selectedIdx - 1))
                    : Math.min(profileItems.length - 1, (selectedIdx === -1 ? 0 : selectedIdx + 1));
                profileItems.forEach(el => el.classList.remove("gamepad-focused"));
                profileItems[nextIdx].classList.add("gamepad-focused");
                profileItems[nextIdx].scrollIntoView({ block: "nearest" });
            } else {
                updateGamepadFocus(goUp ? state.gamepadFocusIndex - 1 : state.gamepadFocusIndex + 1);
            }
        } else {
            updateGamepadFocus(goUp ? state.gamepadFocusIndex - 1 : state.gamepadFocusIndex + 1);
        }
    }

    // D-pad Left (14) / Right (15) - when prompt overlay: cycle category or placeholder; else normal
    if ((buttonPressed(14) || buttonPressed(15)) && getCtrlPromptVisible()) {
        const goLeft = buttonPressed(14);
        if (getCtrlPromptTemplateMode()) {
            cycleTemplatePlaceholder(goLeft ? -1 : 1);
        } else {
            navigateCtrlPromptCat(goLeft ? -1 : 1);
        }
    }

    // D-pad Left (14) / Right (15) - adjust sliders/selects OR cycle tabs
    if ((buttonPressed(14) || buttonPressed(15)) && !getCtrlPromptVisible()) {
        const els = getGamepadFocusableElements();
        const activeEl = els[state.gamepadFocusIndex];
        const handled = activeEl && (() => {
            if (activeEl.tagName === "INPUT" && activeEl.type === "range") {
                let val = parseInt(activeEl.value, 10);
                const step = parseInt(activeEl.step, 10) || 5;
                activeEl.value = buttonPressed(14)
                    ? Math.max(parseInt(activeEl.min, 10) || 0, val - step)
                    : Math.min(parseInt(activeEl.max, 10) || 100, val + step);
                activeEl.dispatchEvent(new Event("input", { bubbles: true }));
                return true;
            }
            if (activeEl.tagName === "SELECT") {
                let idx = activeEl.selectedIndex;
                idx = buttonPressed(14) ? Math.max(0, idx - 1) : Math.min(activeEl.options.length - 1, idx + 1);
                if (idx !== activeEl.selectedIndex) {
                    activeEl.selectedIndex = idx;
                    activeEl.dispatchEvent(new Event("change", { bubbles: true }));
                }
                return true;
            }
            return false;
        })();

        // Fallback: cycle tabs when no slider/select is focused
        if (!handled) {
            const tabs = Array.from(document.querySelectorAll(".nav-tab"));
            const activeTabIdx = tabs.findIndex(t => t.classList.contains("active"));
            if (activeTabIdx !== -1) {
                const nextIdx = buttonPressed(14)
                    ? (activeTabIdx - 1 + tabs.length) % tabs.length
                    : (activeTabIdx + 1) % tabs.length;
                tabs[nextIdx].click();
                state.gamepadFocusIndex = -1;
                document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
            }
        }
    }

    // Steam Deck Grip Buttons Polling (indices 17-20)
    // Grip buttons are suppressed while the ctrl-prompt overlay is open
    if (!getCtrlPromptVisible()) {
        // L4 (17) -> Toggle Left Sidebar
        if (buttonPressed(17)) {
            const sidebar = document.getElementById("sidebar");
            if (sidebar) sidebar.classList.toggle("collapsed");
        }

        // R4 (18) -> Toggle Right Context Drawer
        if (buttonPressed(18)) {
            const inspectDrawer = document.getElementById("inspect-drawer");
            if (inspectDrawer) inspectDrawer.classList.toggle("collapsed");
        }

        // L5 (19) -> Clear Visual Canvas
        if (buttonPressed(19)) {
            const clearBtn = document.getElementById("canvas-clear-btn");
            if (clearBtn) clearBtn.click();
        }

        // R5 (20) -> Cycle Theme
        if (buttonPressed(20)) {
            cycleTheme();
        }
    }

    // === RADIAL MENU — L2 Trigger (button 6 / axis 5) ===
    const l2Raw = gp.buttons[6] ? gp.buttons[6].value : 0;
    const l2Held = l2Raw > 0.5;
    const l2WasHeld = state.previousGamepadState.l2Held;

    if (l2Held && !l2WasHeld) {
        // L2 just pressed — show radial
        showRadialMenu();
    } else if (l2Held) {
        // L2 held — update selected segment from left stick
        const stickX = gp.axes[0] || 0;
        const stickY = gp.axes[1] || 0;
        const seg = getRadialSegmentFromStick(stickX, stickY);
        if (seg !== state.radialSelectedSegment) {
            updateRadialDisplay(seg);
        }
    } else if (!l2Held && l2WasHeld) {
        // L2 just released — activate selected and close
        activateRadialSegment(state.radialSelectedSegment);
        hideRadialMenu();
    }

    // === SPRINT C — RIGHT TOUCHPAD CURSOR (axes 2/3 = right stick / right touchpad) ===
    // When Steam Input maps right touchpad as "Joystick", axes[2]/[3] carry relative deltas.
    // When Steam Input maps as "Mouse", Steam handles it natively — these will be ~0 and
    // the OS cursor is used instead. Either path is correct.
    const rtX = gp.axes[2] || 0;
    const rtY = gp.axes[3] || 0;
    const rtMag = Math.sqrt(rtX * rtX + rtY * rtY);

    if (rtMag > TP_DEADZONE && !l2Held) {
        moveTpCursor(rtX * TP_SENSITIVITY, rtY * TP_SENSITIVITY);
    }

    // Right stick click (button[11] on Steam Deck) = click at cursor position
    if (buttonPressed(11) && state.tpCursorVisible) {
        tpClick(0);
    }

    // === SPRINT C — LEFT STICK SCROLL (axes 0/1 when NOT holding L2 for radial) ===
    // L2 radial already consumes left stick when held, so only scroll when L2 is up.
    const lsScrollX = gp.axes[0] || 0;
    const lsScrollY = gp.axes[1] || 0;
    const lsMag = Math.abs(lsScrollY);

    if (!l2Held && lsMag > 0.2) {
        const scrollEl = getActiveScrollContainer();
        if (scrollEl) {
            scrollEl.scrollTop += lsScrollY * TP_SCROLL_SPEED;
            showTpScrollIndicator(true);
        }
    }

    // B button (1) — also hides VK and cursor if visible (already handled above for overlays,
    // but additionally dismiss cursor mode here)
    if (buttonPressed(1) && state.tpCursorVisible) {
        const c = document.getElementById("tp-cursor");
        if (c) c.classList.remove("tp-visible");
        state.tpCursorVisible = false;
    }

    // B button — toggle virtual keyboard (when nothing else consumed B)
    if (buttonPressed(1) && !getCtrlPromptVisible()) {
        const vkEl = document.getElementById("vk-overlay");
        if (vkEl && vkEl.classList.contains("vk-visible")) {
            if (window.hideVirtualKeyboard) window.hideVirtualKeyboard();
        }
    }

    // Sync button state for next frame
    for (let i = 0; i < gp.buttons.length; i++) {
        state.previousGamepadState.buttons[i] = gp.buttons[i] && gp.buttons[i].pressed;
    }
    state.previousGamepadState.l2Held = l2Held;

    requestAnimationFrame(pollGamepads);
}

function cycleTheme() {
    invoke("get_themes").then((themes) => {
        if (!themes || themes.length === 0) return;
        const savedTheme = localStorage.getItem("selectedTheme") || "Default";
        const currentIdx = themes.indexOf(savedTheme);
        const nextIdx = (currentIdx + 1) % themes.length;
        const nextTheme = themes[nextIdx];
        
        invoke("set_theme", { name: nextTheme }).then((theme) => {
            if (theme) {
                applyThemeColors(theme);
                localStorage.setItem("selectedTheme", nextTheme);
                
                const themeSelect = document.getElementById("theme-select");
                if (themeSelect) themeSelect.value = nextTheme;
                
                let chatViewport = document.getElementById("chat-viewport");
                let viewport = document.getElementById("chat-workspace");
                let div = document.createElement("div");
                div.className = "message system";
                div.innerHTML = `
                    <div class="message-card">
                        System: Theme cycled to ${nextTheme}
                    </div>
                `;
                chatViewport.appendChild(div);
                viewport.scrollTop = viewport.scrollHeight;
            }
        });
    }).catch(err => console.error("Error cycling theme:", err));
}

window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected:", e.gamepad.id);
    state.previousGamepadState.buttons = Array(e.gamepad.buttons.length).fill(false);
});

requestAnimationFrame(pollGamepads);

// let currentSessionId = ""; (Moved to state.js)
// let activePersona = "Default"; (Moved to state.js)
// let availablePersonas = []; (Moved to state.js)
// let isMuted = localStorage.getItem("state.isMuted") === "true"; (Moved to state.js)
// let currentAIMessage = null; (Moved to state.js)
// let currentAIText = ""; (Moved to state.js)

// let isProcessRunning = false; (Moved to state.js)
// let activeTerminalBody = null; (Moved to state.js)
// let activeExecuteBtn = null; (Moved to state.js)
// let pendingLuaScript = ""; (Moved to state.js)

// Analytics & Speed Indicators
// let streamStartTime = 0; (Moved to state.js)
// let firstChunkTime = 0; (Moved to state.js)
// let totalTokens = 0; (Moved to state.js)

// Sidebar & Drawer Collapsing Event Listeners
applyNeurodeckIconography();

const sidebar = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
const sidebarCloseBtn = document.getElementById("sidebar-close-btn");

sidebarToggleBtn.onclick = function() {
    sidebar.classList.toggle("collapsed");
};

sidebarCloseBtn.onclick = function() {
    sidebar.classList.add("collapsed");
};

const inspectDrawer = document.getElementById("inspect-drawer");
const toggleDrawerBtn = document.getElementById("toggle-drawer-btn");
const inspectCloseBtn = document.getElementById("inspect-close-btn");

function updateContextDrawer() {
    invoke("get_context_stats")
        .then(stats => {
            const providerEl = document.getElementById("drawer-active-provider");
            const modelEl = document.getElementById("drawer-active-model");
            const ramEl = document.getElementById("drawer-ram-val");
            const recordsEl = document.getElementById("drawer-memory-records");
            const pinnedEl = document.getElementById("drawer-memory-pinned");
            const sessionIdEl = document.getElementById("drawer-session-id");
            const sessionCreatedEl = document.getElementById("drawer-session-created");
            const messagesEl = document.getElementById("drawer-session-messages");
            const personaEl = document.getElementById("drawer-active-persona");

            if (providerEl) providerEl.innerText = stats.active_provider.toUpperCase();
            if (modelEl) modelEl.innerText = stats.active_model;
            if (ramEl) ramEl.innerText = stats.ram_available;
            if (recordsEl) recordsEl.innerText = stats.memory_records_count;
            if (pinnedEl) pinnedEl.innerText = stats.memory_pinned_count;
            if (sessionIdEl) sessionIdEl.innerText = stats.session_id;
            if (sessionCreatedEl) sessionCreatedEl.innerText = stats.session_created;
            if (messagesEl) messagesEl.innerText = stats.session_messages_count;
            if (personaEl) personaEl.innerText = stats.active_persona;
        })
        .catch(err => console.error("Error updating context drawer stats:", err));
}

toggleDrawerBtn.onclick = function() {
    inspectDrawer.classList.toggle("collapsed");
    if (!inspectDrawer.classList.contains("collapsed")) {
        updateContextDrawer();
    }
};

inspectCloseBtn.onclick = function() {
    inspectDrawer.classList.add("collapsed");
};



// Expose main.js functions to global scope for submodules
window.hideRadialMenu = hideRadialMenu;
window.showRadialMenu = showRadialMenu;
window.updateRadialDisplay = updateRadialDisplay;
window.activateRadialSegment = activateRadialSegment;
window.updateContextDrawer = updateContextDrawer;
window.updateGameBadge = updateGameBadge;
window.cycleTheme = cycleTheme;



/* --- SEPARATOR --- */

// --- GAME CONTEXT BADGE ---
function updateGameBadge(ctx) {
    const badge   = document.getElementById("game-badge");
    const nameEl  = document.getElementById("game-badge-name");
    const dotEl   = document.getElementById("game-badge-dot");
    if (!badge || !nameEl) return;

    const name      = ctx.name || "";
    const running   = ctx.is_running === "true" || ctx.is_running === true;

    if (!name) {
        badge.classList.add("hidden");
        return;
    }

    nameEl.textContent = name;
    badge.title = running
        ? `🎮 ${name} — currently running`
        : `🎮 ${name} — recently played`;

    dotEl.classList.toggle("game-badge-dot--running", running);
    badge.classList.remove("hidden");
}

// Poll for game context every 15 seconds (detect launches/exits while app is open)
setInterval(() => {
    invoke("get_game_context").then(updateGameBadge).catch(() => {});
}, 15000);

// Initial state initialization
invoke("get_initial_state").then((initialState) => {
    const modelNameEl = document.getElementById("model-name");
    if (modelNameEl) modelNameEl.innerText = `[ MODEL: ${initialState.model.toUpperCase()} ]`;
    
    const dbStatusEl = document.getElementById("vector-db-status");
    if (dbStatusEl) dbStatusEl.innerText = initialState.memory_status;
    
    const memoryStatusEl = document.getElementById("memory-status");
    if (memoryStatusEl) memoryStatusEl.innerText = initialState.memory_status;

    const toolStatusEl = document.getElementById("tool-status");
    if (toolStatusEl) toolStatusEl.innerText = initialState.tool_status;
    if (toolStatusEl && initialState.boot_health_status && initialState.boot_health_status !== "healthy") {
        toolStatusEl.innerText = "Recovered Boot";
    }

    const sessionIdEl = document.getElementById("session-id");
    if (sessionIdEl) sessionIdEl.innerText = initialState.session_id;

    state.currentSessionId = initialState.session_id;
    state.activePersona = initialState.active_persona || "Default";
    state.activeProvider = initialState.provider || "gemini";
    state.activeAgentId = initialState.active_agent_id || "";

    // Load agent list and render switcher
    invoke("list_agents").then(agents => {
        state.agents = agents;
        renderAgentSwitcher();
    }).catch(() => {});

    // React to agent_changed events from backend
    listen("agent_changed", (event) => {
        const agent = event.payload;
        state.activeAgentId = agent.id;
        state.activeProvider = agent.provider;
        const modelNameEl = document.getElementById("model-name");
        if (modelNameEl) modelNameEl.innerText = `[ ${agent.name.toUpperCase()} ]`;
        renderAgentSwitcher();
    });
    
    // Initial Context Drawer metrics load
    updateContextDrawer();

    // Show game badge if a game was detected at startup
    updateGameBadge({
        name: initialState.game_name || "",
        app_id: initialState.game_app_id || "",
        is_running: initialState.game_running || "false"
    });
    
    // Fetch and cache available personas list
    invoke("get_personas").then((personas) => {
        state.availablePersonas = personas;
    }).catch((err) => {
        console.error("Error loading personas:", err);
    });
    
    // Load persisted theme
    let savedTheme = localStorage.getItem("selectedTheme");
    if (savedTheme) {
        invoke("set_theme", { name: savedTheme }).then((theme) => {
            if (theme) {
                applyThemeColors(theme);
            }
        });
    }
    
    // Initialize our sub-systems
    initChat();
    initSettings();
    initTerminal();
    initCanvas();
    initNotificationCenter();
    if (initialState.boot_health_status && initialState.boot_health_status !== "healthy" && typeof addNotification === "function") {
        const level = initialState.boot_health_warning_count && Number(initialState.boot_health_warning_count) > 0
            ? "warning"
            : "info";
        addNotification("Boot Recovery", initialState.boot_health_summary || "Startup self-heal applied recovery actions.", level);
    }
    initCommandPalette();
    initGameContextPanel();
    initTunnelClient();
    initFileShare();
    initTorrentClient();
    initBrowser();
    initAgentView();
    initMemoryView();
    initRadialMenu();
    
    // Check Onboarding
    checkOnboarding();
}).catch((err) => {
    console.error("Error getting initial state:", err);
});

// ==========================================================================
// TABS NAVIGATION, TERMINAL, CANVAS, & STEAMOS TUNNEL IMPLEMENTATIONS
// ==========================================================================

// Tab Switching System
const navTabs = document.querySelectorAll(".nav-tab");
const viewContents = document.querySelectorAll(".view-content");
const navTabRow = document.querySelector(".nav-tab-row");

function ensureTabVisible(tab) {
    if (!tab || !navTabRow) return;
    const rowRect = navTabRow.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const currentLeft = navTabRow.scrollLeft;
    const targetLeft = currentLeft + (tabRect.left - rowRect.left) - ((rowRect.width - tabRect.width) / 2);
    navTabRow.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
    });
}

navTabs.forEach(tab => {
    tab.onclick = function() {
        const targetView = tab.getAttribute("data-view");
        
        navTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        ensureTabVisible(tab);
        
        viewContents.forEach(view => {
            if (view.id === `view-${targetView}`) {
                view.classList.add("active");
            } else {
                view.classList.remove("active");
            }
        });
        
        if (targetView === "terminal" && window.ptyTerminalFitAddon) {
            setTimeout(() => {
                try {
                    window.ptyTerminalFitAddon.fit();
                } catch (e) {
                    console.error("Error fitting terminal:", e);
                }
            }, 50);
        }
        if (targetView === "ssh") {
            if (!window.sshTerminal) {
                initSshTerminal();
            }
            setTimeout(() => {
                try {
                    window.sshTerminalFitAddon?.fit();
                } catch (e) {}
            }, 50);
        }
        if (targetView === "share") {
            Promise.all([
                initSshProfilesFromDisk(),
                initFtpProfilesFromDisk(),
                initSftpProfilesFromDisk(),
            ]).then(() => {
                renderSshProfilesSettings();
                renderFtpProfiles();
                renderSftpProfiles();
            });
        }
    };
});

function activateViewByName(targetView) {
    const tab = document.querySelector(`.nav-tab[data-view="${targetView}"]`);
    if (tab) tab.click();
}

function openSettingsPanelById(panelId) {
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) settingsBtn.click();
    setTimeout(() => {
        document.querySelector(`.stv-nav-item[data-panel="${panelId}"]`)?.click();
    }, 0);
}

function clickFirstAvailableButton(...ids) {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
            el.click();
            return true;
        }
    }
    return false;
}

const COMMAND_PALETTE_ACTIONS = [
    { label: "Open Chat", group: "Views", icon: "messageSquare", keywords: ["chat", "messages", "conversation"], run: () => activateViewByName("chat") },
    { label: "Open Canvas", group: "Views", icon: "sparkles", keywords: ["canvas", "draw", "visual"], run: () => activateViewByName("canvas") },
    { label: "Open Terminal", group: "Views", icon: "squareTerminal", keywords: ["terminal", "shell", "console"], run: () => activateViewByName("terminal") },
    { label: "Open SSH", group: "Views", icon: "server", keywords: ["ssh", "remote shell", "server"], run: () => activateViewByName("ssh") },
    { label: "Open Tunnel", group: "Views", icon: "route", keywords: ["tunnel", "port forward", "forwarding"], run: () => activateViewByName("tunnel") },
    { label: "Open Share", group: "Views", icon: "share2", keywords: ["share", "transfer", "sync"], run: () => activateViewByName("share") },
    { label: "Open Browser", group: "Views", icon: "globe", keywords: ["browser", "web", "search"], run: () => activateViewByName("browser") },
    { label: "Open Agent", group: "Views", icon: "bot", keywords: ["agent", "switch", "model"], run: () => activateViewByName("agent") },
    { label: "Open Memory", group: "Views", icon: "brain", keywords: ["memory", "notes", "context"], run: () => activateViewByName("memory") },
    { label: "Open Prompt Lab", group: "Views", icon: "sparkles", keywords: ["prompt", "prompt lab", "templates"], run: () => activateViewByName("prompt-lab") },
    { label: "Open Remote", group: "Views", icon: "panelRightOpen", keywords: ["remote", "screen", "desktop"], run: () => activateViewByName("remote") },
    { label: "Open Docs", group: "Views", icon: "fileText", keywords: ["docs", "documents", "search"], run: () => activateViewByName("docs") },
    { label: "Settings: General", group: "Settings", icon: "settings2", keywords: ["settings", "general", "theme"], run: () => openSettingsPanelById("sp-general") },
    { label: "Settings: AI Model", group: "Settings", icon: "bot", keywords: ["settings", "ai", "model", "provider"], run: () => openSettingsPanelById("sp-ai") },
    { label: "Settings: Appearance", group: "Settings", icon: "sparkles", keywords: ["settings", "appearance", "theme", "font"], run: () => openSettingsPanelById("sp-appearance") },
    { label: "Settings: Terminal", group: "Settings", icon: "squareTerminal", keywords: ["settings", "terminal", "shell"], run: () => openSettingsPanelById("sp-terminal") },
    { label: "Settings: Extensions", group: "Settings", icon: "code2", keywords: ["settings", "extensions", "plugins"], run: () => openSettingsPanelById("sp-extensions") },
    { label: "Settings: Memory", group: "Settings", icon: "brain", keywords: ["settings", "memory", "context"], run: () => openSettingsPanelById("sp-memory") },
    { label: "Settings: Network", group: "Settings", icon: "globe", keywords: ["settings", "network", "sync"], run: () => openSettingsPanelById("sp-network") },
    { label: "Settings: Computer", group: "Settings", icon: "camera", keywords: ["settings", "computer", "capture"], run: () => openSettingsPanelById("sp-computer") },
    { label: "Settings: Sync", group: "Settings", icon: "share2", keywords: ["settings", "sync", "devices"], run: () => openSettingsPanelById("sp-sync") },
    { label: "Settings: Voice", group: "Settings", icon: "mic", keywords: ["settings", "voice", "speech"], run: () => openSettingsPanelById("sp-voice") },
    { label: "New Chat", group: "Session", icon: "plus", keywords: ["new chat", "session", "start"], run: () => clickFirstAvailableButton("new-chat-btn-header", "new-chat-btn") },
    { label: "Toggle Sidebar", group: "Layout", icon: "panelLeftClose", keywords: ["sidebar", "layout", "collapse"], run: () => clickFirstAvailableButton("sidebar-toggle-btn", "sidebar-close-btn") },
    { label: "Open Game Context", group: "Context", icon: "gamepad2", keywords: ["game", "steam", "context"], run: () => document.getElementById("game-badge")?.click() },
    { label: "Notifications", group: "System", icon: "bell", keywords: ["notifications", "alerts", "messages"], run: () => document.getElementById("notif-btn")?.click() },
    { label: "Settings", group: "System", icon: "settings2", keywords: ["settings", "preferences"], run: () => document.getElementById("settings-btn")?.click() },
];

const commandPaletteState = {
    open: false,
    query: "",
    activeIndex: 0,
    filtered: [],
};

function commandPaletteMatches(action, query) {
    if (!query) return true;
    const haystack = `${action.label} ${action.group} ${(action.keywords || []).join(" ")}`.toLowerCase();
    return haystack.includes(query);
}

function getCommandPaletteFilteredActions() {
    const query = commandPaletteState.query.trim().toLowerCase();
    return COMMAND_PALETTE_ACTIONS.filter(action => commandPaletteMatches(action, query));
}

function renderCommandPalette() {
    const list = document.getElementById("command-palette-list");
    const input = document.getElementById("command-palette-input");
    if (!list || !input) return;

    commandPaletteState.filtered = getCommandPaletteFilteredActions();
    if (commandPaletteState.activeIndex >= commandPaletteState.filtered.length) {
        commandPaletteState.activeIndex = Math.max(0, commandPaletteState.filtered.length - 1);
    }

    if (!commandPaletteState.filtered.length) {
        const empty = document.createElement("div");
        empty.className = "command-palette-empty";
        empty.textContent = `No commands match “${input.value}”.`;
        list.replaceChildren(empty);
        return;
    }

    list.replaceChildren();
    commandPaletteState.filtered.forEach((action, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `command-palette-item${index === commandPaletteState.activeIndex ? " active" : ""}`;
        btn.setAttribute("data-command-index", String(index));

        const main = document.createElement("span");
        main.className = "command-palette-item-main";
        const icon = document.createElement("span");
        icon.className = "command-palette-item-icon";
        icon.innerHTML = createIcon(action.icon, { size: 15 });
        const copy = document.createElement("span");
        copy.className = "command-palette-item-copy";
        const title = document.createElement("span");
        title.className = "command-palette-item-title";
        title.textContent = action.label;
        const subtitle = document.createElement("span");
        subtitle.className = "command-palette-item-subtitle";
        subtitle.textContent = action.group;
        copy.append(title, subtitle);
        main.append(icon.firstElementChild || icon, copy);
        btn.appendChild(main);
        btn.addEventListener("click", () => {
            const selected = commandPaletteState.filtered[index];
            if (!selected) return;
            closeCommandPalette();
            selected.run();
        });
        list.appendChild(btn);
    });
}

let commandPaletteFocusTrap = null;

function openCommandPalette(initialQuery = "") {
    const overlay = document.getElementById("command-palette-overlay");
    const input = document.getElementById("command-palette-input");
    if (!overlay || !input) return;
    commandPaletteState.open = true;
    commandPaletteState.query = initialQuery;
    commandPaletteState.activeIndex = 0;
    overlay.classList.remove("hidden");
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    input.value = initialQuery;
    renderCommandPalette();
    if (!commandPaletteFocusTrap) commandPaletteFocusTrap = new FocusTrap(overlay);
    commandPaletteFocusTrap.activate();
    setTimeout(() => {
        try {
            input.focus({ preventScroll: true });
            input.select();
        } catch (_) {
            input.focus();
        }
    }, 0);
}

function closeCommandPalette() {
    const overlay = document.getElementById("command-palette-overlay");
    const input = document.getElementById("command-palette-input");
    if (!overlay) return;
    commandPaletteState.open = false;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.add("hidden");
    commandPaletteState.query = "";
    commandPaletteState.activeIndex = 0;
    commandPaletteState.filtered = [];
    if (input) input.value = "";
    if (commandPaletteFocusTrap) commandPaletteFocusTrap.deactivate();
}

function moveCommandPaletteSelection(delta) {
    if (!commandPaletteState.filtered.length) return;
    const next = (commandPaletteState.activeIndex + delta + commandPaletteState.filtered.length) % commandPaletteState.filtered.length;
    commandPaletteState.activeIndex = next;
    renderCommandPalette();
    const list = document.getElementById("command-palette-list");
    const item = list?.querySelector(`.command-palette-item[data-command-index="${next}"]`);
    if (item) {
        item.scrollIntoView({ block: "nearest" });
    }
}

function runCommandPaletteActiveAction() {
    const action = commandPaletteState.filtered[commandPaletteState.activeIndex];
    if (!action) return;
    closeCommandPalette();
    action.run();
}

function initCommandPalette() {
    const overlay = document.getElementById("command-palette-overlay");
    const openBtn = document.getElementById("command-palette-btn");
    const closeBtn = document.getElementById("command-palette-close");
    const input = document.getElementById("command-palette-input");

    if (openBtn) {
        openBtn.onclick = () => openCommandPalette();
    }
    if (closeBtn) {
        closeBtn.onclick = closeCommandPalette;
    }
    if (overlay) {
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeCommandPalette();
            }
        });
    }
    if (input) {
        input.addEventListener("input", () => {
            commandPaletteState.query = input.value;
            commandPaletteState.activeIndex = 0;
            renderCommandPalette();
        });
        input.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                moveCommandPaletteSelection(1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveCommandPaletteSelection(-1);
            } else if (event.key === "Enter") {
                event.preventDefault();
                runCommandPaletteActiveAction();
            } else if (event.key === "Escape") {
                event.preventDefault();
                closeCommandPalette();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
        if (isShortcut) {
            event.preventDefault();
            if (commandPaletteState.open) {
                closeCommandPalette();
            } else {
                openCommandPalette();
            }
            return;
        }

        if (!commandPaletteState.open) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeCommandPalette();
        }
    }, true);
}



/* --- SEPARATOR --- */

// --- STEAMOS TUNNEL SYSTEM ---
// let tunnelStatus = "offline"; (Moved to state.js)

function logTunnel(direction, text) {
    const logContainer = document.getElementById("tunnel-log");
    if (!logContainer) return;
    
    const entry = document.createElement("div");
    entry.className = `log-entry ${direction}`;
    entry.innerText = `${new Date().toLocaleTimeString()} [${direction.toUpperCase()}] ${text}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function checkTunnelServerStatus(silent = false) {
    const indicator = document.getElementById("tunnel-status-indicator");
    const req = JSON.stringify({ type: "run_cmd", command: "whoami" });
    
    invoke("send_tunnel_request", { request: req }).then((resStr) => {
        try {
            const resp = JSON.parse(resStr);
            if (resp.type === "success") {
                const oldStatus = state.tunnelStatus;
                state.tunnelStatus = "online";
                if (indicator) {
                    indicator.innerText = "ONLINE";
                    indicator.className = "tunnel-status-indicator online";
                }
                if (!silent || oldStatus !== "online") {
                    logTunnel("system", `Tunnel server is alive. Running as: ${resp.output.trim()}`);
                }
            } else {
                const oldStatus = state.tunnelStatus;
                state.tunnelStatus = "offline";
                if (indicator) {
                    indicator.innerText = "OFFLINE";
                    indicator.className = "tunnel-status-indicator offline";
                }
                if (!silent || oldStatus !== "offline") {
                    logTunnel("error", `Tunnel server error response: ${resp.message}`);
                }
            }
        } catch(e) {
            const oldStatus = state.tunnelStatus;
            state.tunnelStatus = "offline";
            if (indicator) {
                indicator.innerText = "OFFLINE";
                indicator.className = "tunnel-status-indicator offline";
            }
            if (!silent || oldStatus !== "offline") {
                logTunnel("error", `Invalid response from tunnel: ${resStr}`);
            }
        }
    }).catch((err) => {
        const oldStatus = state.tunnelStatus;
        state.tunnelStatus = "offline";
        if (indicator) {
            indicator.innerText = "OFFLINE";
            indicator.className = "tunnel-status-indicator offline";
        }
        if (!silent || oldStatus !== "offline") {
            logTunnel("system", `Tunnel server is not reachable: ${err}`);
        }
    });
}

function initTunnelClient() {
    const checkBtn = document.getElementById("tunnel-check-btn");
    const toggleBtn = document.getElementById("tunnel-toggle-btn");
    const cmdSend = document.getElementById("tunnel-cmd-send");
    const fileSend = document.getElementById("tunnel-file-send");
    const dirSend = document.getElementById("tunnel-dir-send");
    
    if (checkBtn) {
        checkBtn.onclick = function() {
            logTunnel("system", "Checking tunnel server status...");
            checkTunnelServerStatus();
        };
    }
    
    if (toggleBtn) {
        toggleBtn.onclick = function() {
            if (state.tunnelStatus === "offline") {
                logTunnel("system", "Starting local loopback tunnel server...");
                invoke("start_tunnel_server").then((msg) => {
                    logTunnel("received", msg);
                    setTimeout(checkTunnelServerStatus, 500);
                }).catch((err) => {
                    logTunnel("error", `Failed to start server: ${err}`);
                });
            } else {
                logTunnel("system", "Stopping local loopback tunnel server...");
                invoke("stop_tunnel_server").then((msg) => {
                    logTunnel("received", msg);
                    state.tunnelStatus = "offline";
                    const indicator = document.getElementById("tunnel-status-indicator");
                    if (indicator) {
                        indicator.innerText = "OFFLINE";
                        indicator.className = "tunnel-status-indicator offline";
                    }
                }).catch((err) => {
                    logTunnel("error", `Failed to stop server: ${err}`);
                });
            }
        };
    }
    
    if (cmdSend) {
        cmdSend.onclick = function() {
            const input = document.getElementById("tunnel-cmd-input");
            const command = input.value.trim();
            if (!command) return;
            
            logTunnel("sent", `Execute command: ${command}`);
            const req = JSON.stringify({ type: "run_cmd", command: command });
            
            invoke("send_tunnel_request", { request: req }).then((resStr) => {
                const resp = JSON.parse(resStr);
                if (resp.type === "success") {
                    logTunnel("received", `Stdout:\n${resp.output}`);
                } else {
                    logTunnel("error", `Failed:\n${resp.message}`);
                }
            }).catch(err => {
                logTunnel("error", `Request failed: ${err}`);
            });
            input.value = "";
        };
    }
    
    if (fileSend) {
        fileSend.onclick = function() {
            const pathInput = document.getElementById("tunnel-filepath-input");
            const contentArea = document.getElementById("tunnel-filecontent-input");
            
            const path = pathInput.value.trim();
            const content = contentArea.value;
            if (!path) return;
            
            logTunnel("sent", `Write file: ${path} (${content.length} chars)`);
            const req = JSON.stringify({ type: "write_file", path: path, content: content });
            
            invoke("send_tunnel_request", { request: req }).then((resStr) => {
                const resp = JSON.parse(resStr);
                if (resp.type === "success") {
                    logTunnel("received", resp.output);
                } else {
                    logTunnel("error", `Failed:\n${resp.message}`);
                }
            }).catch(err => {
                logTunnel("error", `Request failed: ${err}`);
            });
            pathInput.value = "";
            contentArea.value = "";
        };
    }
    
    if (dirSend) {
        dirSend.onclick = function() {
            const input = document.getElementById("tunnel-dirpath-input");
            const path = input.value.trim();
            if (!path) return;
            
            logTunnel("sent", `Read dir: ${path}`);
            const req = JSON.stringify({ type: "read_dir", path: path });
            
            invoke("send_tunnel_request", { request: req }).then((resStr) => {
                const resp = JSON.parse(resStr);
                if (resp.type === "success") {
                    logTunnel("received", `Contents:\n${resp.output}`);
                } else {
                    logTunnel("error", `Failed:\n${resp.message}`);
                }
            }).catch(err => {
                logTunnel("error", `Request failed: ${err}`);
            });
            input.value = "";
        };
    }

    // Auto-probe tunnel server on startup
    checkTunnelServerStatus(true);

    // Periodically poll tunnel server status every 5 seconds silently
    setInterval(() => {
        checkTunnelServerStatus(true);
    }, 5000);
}

// --- SHARE INNER TAB SWITCHING ---
document.querySelectorAll(".share-inner-tab").forEach(tab => {
    tab.onclick = function() {
        const panel = this.getAttribute("data-panel");
        document.querySelectorAll(".share-inner-tab").forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        document.querySelectorAll(".share-panel-section").forEach(s => s.classList.remove("active"));
        const el = document.getElementById(`share-panel-${panel}`);
        if (el) el.classList.add("active");
    };
});

// --- LAN FILE SHARING SYSTEM ---
// let selectedPeerIp = null; (Moved to state.js)
// let pendingTransferId = null; (Moved to state.js)

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderPeers(peers) {
    const listEl = document.getElementById("share-peers-list");
    if (!listEl) return;
    listEl.replaceChildren();
    if (!peers || peers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "peer-item-empty";
        empty.textContent = "Scanning local network for active peers...";
        listEl.appendChild(empty);
        state.selectedPeerIp = null;
        updateSendButtonState();
        return;
    }
    peers.forEach(peer => {
        const item = document.createElement("div");
        item.className = "peer-item";
        if (peer.ip === state.selectedPeerIp) {
            item.classList.add("selected");
        }
        const info = document.createElement("div");
        info.className = "peer-info";
        const name = document.createElement("span");
        name.className = "peer-name";
        name.textContent = String(peer.hostname ?? "");
        const meta = document.createElement("span");
        meta.className = "peer-ip-os";
        meta.textContent = `${String(peer.ip ?? "")} (${String(peer.os ?? "")})`;
        info.append(name, meta);
        const status = document.createElement("span");
        status.className = "peer-status";
        status.textContent = "Online";
        item.append(info, status);
        item.addEventListener("click", function() {
            document.querySelectorAll(".peer-item").forEach(el => el.classList.remove("selected"));
            item.classList.add("selected");
            state.selectedPeerIp = peer.ip;
            updateSendButtonState();
        });
        listEl.appendChild(item);
    });
}

if (!window.transferProgressMap) {
    window.transferProgressMap = new Map();
}

function formatDuration(sec) {
    if (!isFinite(sec) || isNaN(sec) || sec < 0) return "Unknown";
    if (sec < 60) return Math.round(sec) + "s";
    let min = Math.floor(sec / 60);
    let s = Math.round(sec % 60);
    return `${min}m ${s}s`;
}

window.cancelTransfer = function(transferId) {
    invoke("cancel_transfer", { transferId })
        .then(() => {
            invoke("get_active_transfers").then(renderTransfers);
        })
        .catch(err => {
            console.error("Error cancelling transfer:", err);
            alert("Error: " + err);
        });
};

function renderTransfers(transfers) {
    const listEl = document.getElementById("share-transfers-list");
    if (!listEl) return;
    listEl.replaceChildren();
    if (!transfers || transfers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "transfer-item-empty";
        empty.textContent = "No active or past transfers in this session.";
        listEl.appendChild(empty);
        return;
    }

    if (!window.activeTransfersMap) window.activeTransfersMap = new Map();
    window.activeTransfersMap.clear();

    transfers.sort((a, b) => b.id.localeCompare(a.id));

    transfers.forEach(t => {
        window.activeTransfersMap.set(t.id, t);
        const item = document.createElement("div");
        item.className = "transfer-item";
        item.id = `transfer-${t.id}`;
        
        const percent = t.size > 0 ? Math.round((t.progress / t.size) * 100) : 0;
        const progressClass = t.status === "Completed" ? "completed" : (t.status === "Failed" || t.status === "Rejected" ? "failed" : "");
        
        let speedText = "";
        let etaText = "";
        if (t.status === "Transferring") {
            const now = Date.now();
            let record = window.transferProgressMap.get(t.id);
            if (!record) {
                record = { lastProgress: t.progress, lastTime: now, currentSpeed: 0 };
                window.transferProgressMap.set(t.id, record);
            } else {
                let elapsed = (now - record.lastTime) / 1000;
                if (elapsed >= 0.5) {
                    let delta = t.progress - record.lastProgress;
                    if (delta >= 0) {
                        let instantSpeed = delta / elapsed;
                        record.currentSpeed = record.currentSpeed ? (record.currentSpeed * 0.7 + instantSpeed * 0.3) : instantSpeed;
                    }
                    record.lastProgress = t.progress;
                    record.lastTime = now;
                }
            }
            if (record.currentSpeed > 0) {
                speedText = ` | ${formatBytes(record.currentSpeed)}/s`;
                let remaining = t.size - t.progress;
                let eta = remaining / record.currentSpeed;
                etaText = ` | ETA: ${formatDuration(eta)}`;
            } else {
                speedText = ` | 0 B/s`;
                etaText = ` | ETA: Unknown`;
            }
        } else {
            window.transferProgressMap.delete(t.id);
        }

        const isCancelable = t.status === "Pending" || t.status === "Accepted" || t.status === "Transferring";
        const header = document.createElement("div");
        header.className = "transfer-header";

        const filename = document.createElement("span");
        filename.className = "transfer-filename";
        filename.title = String(t.filename ?? "");
        filename.textContent = String(t.filename ?? "");

        const headerRight = document.createElement("div");
        headerRight.style.display = "flex";
        headerRight.style.alignItems = "center";
        headerRight.style.gap = "8px";

        const status = document.createElement("span");
        status.className = `transfer-status ${String(t.status || "").toLowerCase()}`;
        status.textContent = String(t.status ?? "");
        headerRight.appendChild(status);

        if (isCancelable) {
            const cancelBtn = document.createElement("button");
            cancelBtn.className = "cancel-transfer-btn";
            cancelBtn.title = "Cancel Transfer";
            cancelBtn.setAttribute("aria-label", "Cancel Transfer");
            cancelBtn.innerHTML = createIcon('x', { size: 12 });
            cancelBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                window.cancelTransfer(t.id);
            });
            headerRight.appendChild(cancelBtn);
        }

        header.append(filename, headerRight);

        const progressContainer = document.createElement("div");
        progressContainer.className = "transfer-progress-container";
        const progressBg = document.createElement("div");
        progressBg.className = "transfer-progress-bar-bg";
        const progressFill = document.createElement("div");
        progressFill.className = `transfer-progress-bar-fill ${progressClass}`;
        progressFill.style.width = `${percent}%`;
        progressBg.appendChild(progressFill);
        const percentEl = document.createElement("span");
        percentEl.className = "transfer-percent";
        percentEl.textContent = `${percent}%`;
        progressContainer.append(progressBg, percentEl);

        const meta = document.createElement("div");
        meta.className = "transfer-meta";
        const peer = document.createElement("span");
        peer.textContent = `${t.direction === "Incoming" ? "From" : "To"}: ${String(t.peer_name || t.peer_ip || "")}`;
        const stats = document.createElement("span");
        stats.className = "transfer-stats-text";
        stats.textContent = `${formatBytes(t.progress)} / ${formatBytes(t.size)}${speedText}${etaText}`;
        meta.append(peer, stats);

        item.append(header, progressContainer, meta);
        listEl.appendChild(item);
    });
}

function updateTransferCardProgress(transferId, progress) {
    if (!window.activeTransfersMap) return;
    const t = window.activeTransfersMap.get(transferId);
    if (!t) {
        invoke("get_active_transfers").then(renderTransfers);
        return;
    }

    t.progress = progress;
    if (t.status === "Pending" || t.status === "Accepted") {
        t.status = "Transferring";
    }

    const item = document.getElementById(`transfer-${transferId}`);
    if (!item) return;

    const statusEl = item.querySelector(".transfer-status");
    if (statusEl) {
        statusEl.className = `transfer-status ${t.status.toLowerCase()}`;
        statusEl.innerText = t.status;
    }

    const percent = t.size > 0 ? Math.min(100, Math.round((progress / t.size) * 100)) : 0;
    
    const barEl = item.querySelector(".transfer-progress-bar-fill");
    if (barEl) {
        barEl.style.width = `${percent}%`;
        if (t.status === "Completed") {
            barEl.className = "transfer-progress-bar-fill completed";
        } else if (t.status === "Failed" || t.status === "Rejected") {
            barEl.className = "transfer-progress-bar-fill failed";
        }
    }

    const pctEl = item.querySelector(".transfer-percent");
    if (pctEl) {
        pctEl.innerText = `${percent}%`;
    }

    let speedText = "";
    let etaText = "";
    if (t.status === "Transferring") {
        const now = Date.now();
        let record = window.transferProgressMap.get(t.id);
        if (!record) {
            record = { lastProgress: progress, lastTime: now, currentSpeed: 0 };
            window.transferProgressMap.set(t.id, record);
        } else {
            let elapsed = (now - record.lastTime) / 1000;
            if (elapsed >= 0.5) {
                let delta = progress - record.lastProgress;
                if (delta >= 0) {
                    let instantSpeed = delta / elapsed;
                    record.currentSpeed = record.currentSpeed ? (record.currentSpeed * 0.7 + instantSpeed * 0.3) : instantSpeed;
                }
                record.lastProgress = progress;
                record.lastTime = now;
            }
        }
        if (record.currentSpeed > 0) {
            speedText = ` | ${formatBytes(record.currentSpeed)}/s`;
            let remaining = t.size - progress;
            let eta = remaining / record.currentSpeed;
            etaText = ` | ETA: ${formatDuration(eta)}`;
        } else {
            speedText = ` | 0 B/s`;
            etaText = ` | ETA: Unknown`;
        }
    }

    const statsEl = item.querySelector(".transfer-stats-text");
    if (statsEl) {
        statsEl.innerText = `${formatBytes(progress)} / ${formatBytes(t.size)}${speedText}${etaText}`;
    }
}

function updateSendButtonState() {
    const sendBtn = document.getElementById("share-send-btn");
    const pathInput = document.getElementById("share-filepath-input");
    if (sendBtn && pathInput) {
        const path = pathInput.value.trim();
        sendBtn.disabled = !(state.selectedPeerIp && path);
    }
}

function initFileShare() {
    const dropzone = document.getElementById("share-dropzone");
    const pathInput = document.getElementById("share-filepath-input");
    const sendBtn = document.getElementById("share-send-btn");
    
    const acceptBtn = document.getElementById("transfer-modal-accept");
    const rejectBtn = document.getElementById("transfer-modal-reject");
    const closeXBtn = document.getElementById("transfer-modal-close-x");
    
    // Initial fetch of peers and transfers
    invoke("get_discovered_peers").then(renderPeers).catch(err => console.error("Error fetching peers:", err));
    invoke("get_active_transfers").then(renderTransfers).catch(err => console.error("Error fetching transfers:", err));
    
    // Group Code Settings
    const groupCodeInput = document.getElementById("share-group-code-input");
    const saveGroupCodeBtn = document.getElementById("share-group-code-save-btn");

    if (groupCodeInput && saveGroupCodeBtn) {
        invoke("get_group_code").then(code => {
            groupCodeInput.value = code || "DEFAULT";
        }).catch(err => console.error("Error fetching group code:", err));

        saveGroupCodeBtn.onclick = function() {
            const code = groupCodeInput.value.trim();
            saveGroupCodeBtn.disabled = true;
            saveGroupCodeBtn.innerText = "Applying...";
            invoke("set_group_code", { code })
                .then(() => {
                    saveGroupCodeBtn.disabled = false;
                    saveGroupCodeBtn.innerText = "Apply";
                    if (typeof addNotification === "function") {
                        addNotification("Group Code Updated", `Discovery group set to: ${code}`, "success");
                    }
                    invoke("get_discovered_peers").then(renderPeers);
                })
                .catch(err => {
                    saveGroupCodeBtn.disabled = false;
                    saveGroupCodeBtn.innerText = "Apply";
                    console.error("Error setting group code:", err);
                    alert("Error: " + err);
                });
        };
    }
    
    // Listen for peer discovery updates
    listen("peers_updated", (event) => {
        renderPeers(event.payload);
    });
    
    // Listen for incoming transfer requests
    listen("transfer_incoming", (event) => {
        const transfer = event.payload;
        state.pendingTransferId = transfer.id;
        
        const modal = document.getElementById("transfer-modal");
        const modalPeer = document.getElementById("transfer-modal-peer");
        const modalFilename = document.getElementById("transfer-modal-filename");
        const modalSize = document.getElementById("transfer-modal-size");
        
        if (modal && modalPeer && modalFilename && modalSize) {
            modalPeer.innerText = `${transfer.peer_name || 'Unknown'} (${transfer.peer_ip})`;
            modalFilename.innerText = transfer.filename;
            modalSize.innerText = formatBytes(transfer.size);
            modal.classList.add("active");
        }
        
        if (typeof addNotification === "function") {
            addNotification("Incoming Transfer Request", `From ${transfer.peer_name || 'Unknown'} (${transfer.peer_ip}): ${transfer.filename}`, "info");
        }
        
        invoke("get_active_transfers").then(renderTransfers);
    });
    
    // Listen for transfer progress and completions
    listen("transfer_progress", (event) => {
        if (event && event.payload) {
            const [transferId, progress] = event.payload;
            updateTransferCardProgress(transferId, progress);
        } else {
            invoke("get_active_transfers").then(renderTransfers);
        }
    });
    listen("transfer_completed", (event) => {
        if (typeof addNotification === "function") {
            addNotification("File Transfer Complete", "A LAN file transfer completed successfully.", "success");
        }
        invoke("get_active_transfers").then(renderTransfers);
    });
    listen("transfer_failed", (event) => {
        if (typeof addNotification === "function") {
            addNotification("File Transfer Failed", "A LAN file transfer has failed.", "error");
        }
        invoke("get_active_transfers").then(renderTransfers);
    });
    
    // Setup modal button handlers
    if (acceptBtn) {
        acceptBtn.onclick = function() {
            if (state.pendingTransferId) {
                invoke("respond_to_transfer", { transferId: state.pendingTransferId, accept: true })
                    .then(() => {
                        document.getElementById("transfer-modal").classList.remove("active");
                        state.pendingTransferId = null;
                        invoke("get_active_transfers").then(renderTransfers);
                    })
                    .catch(err => {
                        console.error("Error accepting transfer:", err);
                        alert("Error: " + err);
                    });
            }
        };
    }
    
    if (rejectBtn) {
        rejectBtn.onclick = function() {
            if (state.pendingTransferId) {
                invoke("respond_to_transfer", { transferId: state.pendingTransferId, accept: false })
                    .then(() => {
                        document.getElementById("transfer-modal").classList.remove("active");
                        state.pendingTransferId = null;
                        invoke("get_active_transfers").then(renderTransfers);
                    })
                    .catch(err => {
                        console.error("Error rejecting transfer:", err);
                        alert("Error: " + err);
                    });
            }
        };
    }
    
    if (closeXBtn) {
        closeXBtn.onclick = function() {
            if (state.pendingTransferId) {
                invoke("respond_to_transfer", { transferId: state.pendingTransferId, accept: false })
                    .then(() => {
                        document.getElementById("transfer-modal").classList.remove("active");
                        state.pendingTransferId = null;
                        invoke("get_active_transfers").then(renderTransfers);
                    });
            } else {
                document.getElementById("transfer-modal").classList.remove("active");
            }
        };
    }
    
    // Drag & drop file path populate
    if (dropzone && pathInput) {
        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add("dragover");
        });
        
        dropzone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("dragover");
        });
        
        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("dragover");
            
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const path = file.path || file.name;
                pathInput.value = path;
                updateSendButtonState();
            }
        });
        
        pathInput.oninput = function() {
            updateSendButtonState();
        };
    }
    
    // Send button event handler
    if (sendBtn) {
        sendBtn.onclick = function() {
            if (pathInput) {
                const path = pathInput.value.trim();
                if (state.selectedPeerIp && path) {
                    sendBtn.disabled = true;
                    sendBtn.innerText = "Initiating... ⏳";
                    invoke("start_file_transfer", { peerIp: state.selectedPeerIp, filePath: path })
                        .then(() => {
                            sendBtn.innerText = "Send File 🚀";
                            pathInput.value = "";
                            updateSendButtonState();
                            invoke("get_active_transfers").then(renderTransfers);
                        })
                        .catch(err => {
                            sendBtn.innerText = "Send File 🚀";
                            updateSendButtonState();
                            alert("Error sending file: " + err);
                        });
                }
            }
        };
    }
}

// --- BUILT-IN WEB BROWSER SYSTEM ---
function initBrowser() {
    const urlInput    = document.getElementById("browser-url-input");
    const clearBtn    = document.getElementById("browser-url-clear-btn");
    const goBtn       = document.getElementById("browser-go-btn");
    const openExtBtn  = document.getElementById("browser-open-ext-btn");
    const homeScreen  = document.getElementById("browser-home-screen");
    const backBtn     = document.getElementById("browser-back-btn");
    const forwardBtn  = document.getElementById("browser-forward-btn");
    const refreshBtn  = document.getElementById("browser-refresh-btn");
    const homeBtn     = document.getElementById("browser-home-btn");
    const homeSearchInput = document.getElementById("browser-home-search-input");
    const homeSearchBtn   = document.getElementById("browser-home-search-btn");
    const speedDialCards  = document.querySelectorAll(".speed-dial-card");

    // Permanently hide the old iframe — the native window replaces it
    const oldIframe = document.getElementById("browser-iframe");
    if (oldIframe) oldIframe.style.display = "none";
    const blockedScreen = document.getElementById("browser-blocked-screen");
    if (blockedScreen) blockedScreen.style.display = "none";

    // State
    let browserWindowOpen  = false;
    let currentUrl         = "neurodeck://home";
    let syncInterval       = null;   // URL + position polling
    let lastRect           = null;

    // --- URL parsing ---
    function parseUrlOrSearch(input) {
        const trimmed = input.trim();
        if (!trimmed) return "neurodeck://home";
        if (/^[a-zA-Z0-9+.-]+:\/\//.test(trimmed)) return trimmed;
        const isDomain =
            /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed) ||
            /^localhost(:\d+)?(\/.*)?$/.test(trimmed) ||
            /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(trimmed);
        return isDomain
            ? "https://" + trimmed
            : "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(trimmed);
    }

    // Returns the browser viewport area in logical CSS pixels, viewport-relative.
    // The native browser window is positioned by Rust using these + the Tauri
    // window's inner_position(), so we never need window.screenX/Y.
    function getViewportRect() {
        const view = document.getElementById("view-browser");
        if (!view) return null;
        const toolbar = view.querySelector(".browser-toolbar");
        const toolbarH = toolbar ? toolbar.getBoundingClientRect().height : 52;
        const r = view.getBoundingClientRect();
        return {
            x: r.left,
            y: r.top + toolbarH,
            width:  r.width,
            height: r.height - toolbarH,
        };
    }

    function rectsEqual(a, b) {
        return a && b &&
            a.x === b.x && a.y === b.y &&
            a.width === b.width && a.height === b.height;
    }

    // --- Home screen visibility ---
    function showHome() {
        if (homeScreen) homeScreen.classList.remove("hidden");
        if (urlInput) urlInput.value = "";
        currentUrl = "neurodeck://home";
    }

    function hideHome() {
        if (homeScreen) homeScreen.classList.add("hidden");
    }

    // --- Navigation ---
    async function navigateTo(raw) {
        const url = parseUrlOrSearch(raw);

        if (url === "neurodeck://home") {
            currentUrl = "neurodeck://home";
            if (browserWindowOpen) {
                await invoke("browser_hide").catch(() => {});
            }
            showHome();
            return;
        }

        currentUrl = url;
        if (urlInput) urlInput.value = url;

        const r = getViewportRect();
        if (!r) return;

        try {
            if (browserWindowOpen) {
                await invoke("browser_navigate", { url });
            } else {
                await invoke("browser_open", {
                    url,
                    viewportX: r.x, viewportY: r.y,
                    width: r.width, height: r.height,
                });
                browserWindowOpen = true;
                hideHome();
            }
        } catch (e) {
            console.error("[Browser] Navigation error:", e);
            window.addNotification("Browser Error", String(e), "error");
        }
    }

    // --- Sync interval: URL readback + reposition on move/resize ---
    function startSync() {
        if (syncInterval) return;
        syncInterval = setInterval(async () => {
            // Reposition if view moved or resized
            if (browserWindowOpen) {
                const r = getViewportRect();
                if (r && !rectsEqual(r, lastRect)) {
                    lastRect = r;
                    await invoke("browser_show", {
                        viewportX: r.x, viewportY: r.y,
                        width: r.width, height: r.height,
                    }).catch(() => {});
                }

                // Sync URL back to address bar
                try {
                    const liveUrl = await invoke("browser_get_url");
                    if (liveUrl && liveUrl !== currentUrl && document.activeElement !== urlInput) {
                        currentUrl = liveUrl;
                        if (urlInput) urlInput.value = liveUrl;
                    }
                } catch (_) {}
            }
        }, 250);
    }

    function stopSync() {
        if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
        lastRect = null;
    }

    // --- Tab activation / deactivation ---
    const browserTab = document.querySelector('.nav-tab[data-view="browser"]');
    if (browserTab) {
        browserTab.addEventListener("click", async () => {
            if (browserWindowOpen && currentUrl !== "neurodeck://home") {
                const r = getViewportRect();
                if (r) {
                    await invoke("browser_show", {
                        viewportX: r.x, viewportY: r.y,
                        width: r.width, height: r.height,
                    }).catch(() => {});
                }
            }
            startSync();
        });
    }

    document.querySelectorAll('.nav-tab:not([data-view="browser"])').forEach(tab => {
        tab.addEventListener("click", () => {
            if (browserWindowOpen) invoke("browser_hide").catch(() => {});
            stopSync();
        });
    });

    // --- Toolbar button events ---
    if (goBtn && urlInput) {
        goBtn.onclick = () => navigateTo(urlInput.value);
        urlInput.addEventListener("keydown", e => {
            if (e.key === "Enter") navigateTo(urlInput.value);
        });
    }

    if (clearBtn && urlInput) {
        clearBtn.onclick = () => { urlInput.value = ""; urlInput.focus(); };
    }

    if (backBtn) {
        backBtn.onclick = () => {
            if (browserWindowOpen)
                invoke("browser_exec", { js: "window.history.back()" }).catch(() => {});
        };
    }

    if (forwardBtn) {
        forwardBtn.onclick = () => {
            if (browserWindowOpen)
                invoke("browser_exec", { js: "window.history.forward()" }).catch(() => {});
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = () => {
            if (browserWindowOpen)
                invoke("browser_exec", { js: "window.location.reload()" }).catch(() => {});
        };
    }

    if (homeBtn) homeBtn.onclick = () => navigateTo("neurodeck://home");

    if (openExtBtn) {
        openExtBtn.onclick = () => {
            const url = urlInput?.value.trim() || currentUrl;
            const parsed = parseUrlOrSearch(url);
            if (parsed && parsed !== "neurodeck://home") {
                invoke("open_external", { url: parsed }).catch(() => {});
            }
        };
    }

    speedDialCards.forEach(card => {
        card.onclick = () => {
            const url = card.getAttribute("data-url");
            if (url) navigateTo(url);
        };
    });

    if (homeSearchBtn && homeSearchInput) {
        homeSearchBtn.onclick = () => {
            const q = homeSearchInput.value.trim();
            if (q) navigateTo(q);
        };
        homeSearchInput.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                const q = homeSearchInput.value.trim();
                if (q) navigateTo(q);
            }
        });
    }

    // --- Keyboard shortcuts ---
    document.addEventListener("keydown", e => {
        const bv = document.getElementById("view-browser");
        if (!bv?.classList.contains("active")) return;

        if (e.key === "F5") { e.preventDefault(); if (refreshBtn) refreshBtn.click(); }
        if ((e.ctrlKey || e.metaKey) && e.key === "l") {
            e.preventDefault();
            if (urlInput) { urlInput.focus(); urlInput.select(); }
        }
        if (e.altKey && e.key === "ArrowLeft")  { e.preventDefault(); if (backBtn)    backBtn.click(); }
        if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); if (forwardBtn) forwardBtn.click(); }
    });
}

// ==========================================================================
// AUTONOMOUS CODING AGENT — moved to agent.js
// ==========================================================================
// initAgentView is imported from ./agent.js

// --- OLLAMA MODEL MANAGER SYSTEM ---
function refreshOllamaModels() {
    const baseUrlInput = document.getElementById("settings-ollama-url");
    const baseUrl = (baseUrlInput?.value || "").trim() || "http://localhost:11434";
    const listEl = document.getElementById("settings-ollama-models-list");
    if (!listEl) return;

    const loading = document.createElement("div");
    loading.style.opacity = "0.5";
    loading.style.fontStyle = "italic";
    loading.textContent = "Loading models...";
    listEl.replaceChildren(loading);

    invoke("ollama_list_models", { baseUrl })
        .then(models => {
            if (models.length === 0) {
                const empty = document.createElement("div");
                empty.style.opacity = "0.5";
                empty.style.fontStyle = "italic";
                empty.textContent = "No local models found.";
                listEl.replaceChildren(empty);
                return;
            }
            listEl.replaceChildren();
            models.forEach((m) => {
                const isCurrent = m.name.includes(localStorage.getItem("settings-ollama-model") || "llama2") || m.name === (document.getElementById("settings-ollama-model")?.value || "llama2");
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.alignItems = "center";
                row.style.padding = "4px";
                row.style.borderBottom = "1px solid rgba(255,255,255,0.03)";

                const item = document.createElement("div");
                item.style.overflow = "hidden";
                item.style.textOverflow = "ellipsis";
                item.style.whiteSpace = "nowrap";
                item.style.flex = "1";
                item.style.cursor = "pointer";
                item.className = "settings-ollama-model-item";
                item.setAttribute("data-model", m.name);
                if (isCurrent) {
                    const active = document.createElement("span");
                    active.style.color = "var(--accent-color)";
                    active.style.fontWeight = "bold";
                    active.style.marginRight = "6px";
                    active.textContent = "[Active]";
                    item.appendChild(active);
                }
                item.append(` ${m.name} `);
                const size = document.createElement("span");
                size.style.opacity = "0.5";
                size.style.fontSize = "0.75rem";
                size.textContent = `(${formatBytes(m.size)})`;
                item.appendChild(size);
                item.onclick = () => {
                    const modelInput = document.getElementById("settings-ollama-model");
                    if (modelInput) {
                        modelInput.value = m.name;
                        document.getElementById("settings-save-llm-btn")?.click();
                    }
                };

                const btn = document.createElement("button");
                btn.className = "canvas-btn settings-ollama-delete-btn";
                btn.style.padding = "2px 8px";
                btn.style.fontSize = "0.7rem";
                btn.style.borderColor = "#ff3c5a";
                btn.style.color = "#ff3c5a";
                btn.setAttribute("data-model", m.name);
                btn.textContent = "Delete";
                btn.onclick = () => {
                    if (confirm(`Are you sure you want to delete local model ${m.name}?`)) {
                        btn.disabled = true;
                        btn.innerText = "Deleting...";
                        invoke("ollama_delete_model", { baseUrl, model: m.name })
                            .then(() => {
                                refreshOllamaModels();
                            })
                            .catch(err => {
                                alert(`Delete failed: ${err}`);
                                refreshOllamaModels();
                            });
                    }
                };
                row.append(item, btn);
                listEl.appendChild(row);
            });
        })
        .catch(err => {
            const error = document.createElement("div");
            error.style.color = "#ff6b6b";
            error.style.fontSize = "0.75rem";
            error.textContent = `Failed to list models: ${String(err)}`;
            listEl.replaceChildren(error);
        });
}

document.getElementById("settings-ollama-pull-btn")?.addEventListener("click", () => {
    const inputEl = document.getElementById("settings-ollama-pull-input");
    const model = (inputEl?.value || "").trim();
    if (!model) {
        alert("Enter a model name to pull first.");
        return;
    }

    const baseUrlInput = document.getElementById("settings-ollama-url");
    const baseUrl = (baseUrlInput?.value || "").trim() || "http://localhost:11434";
    const pullBtn = document.getElementById("settings-ollama-pull-btn");
    const progressContainer = document.getElementById("settings-ollama-pull-progress-container");
    const statusEl = document.getElementById("settings-ollama-pull-status");
    const percentEl = document.getElementById("settings-ollama-pull-percent");
    const barEl = document.getElementById("settings-ollama-pull-bar");

    if (pullBtn) pullBtn.disabled = true;
    if (progressContainer) progressContainer.style.display = "block";
    if (statusEl) statusEl.innerText = "Initiating pull...";
    if (percentEl) percentEl.innerText = "0%";
    if (barEl) barEl.style.width = "0%";

    invoke("ollama_pull_model", { baseUrl, model })
        .then(() => {
            // Background task started successfully
        })
        .catch(err => {
            alert(`Failed to start pull: ${err}`);
            if (pullBtn) pullBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = "none";
        });
});

listen("ollama_pull_progress", (event) => {
    const payload = event.payload;
    const progressContainer = document.getElementById("settings-ollama-pull-progress-container");
    const statusEl = document.getElementById("settings-ollama-pull-status");
    const percentEl = document.getElementById("settings-ollama-pull-percent");
    const barEl = document.getElementById("settings-ollama-pull-bar");
    const pullBtn = document.getElementById("settings-ollama-pull-btn");

    if (payload.status === "success") {
        if (statusEl) statusEl.innerText = "Pull complete!";
        if (percentEl) percentEl.innerText = "100%";
        if (barEl) barEl.style.width = "100%";
        
        setTimeout(() => {
            if (pullBtn) pullBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = "none";
            const inputEl = document.getElementById("settings-ollama-pull-input");
            if (inputEl) inputEl.value = "";
            refreshOllamaModels();
        }, 1500);
    } else if (payload.status.startsWith("Error:")) {
        if (statusEl) statusEl.innerText = payload.status;
        if (pullBtn) pullBtn.disabled = false;
    } else {
        if (statusEl) statusEl.innerText = payload.status;
        if (payload.completed && payload.total) {
            const percent = Math.round((payload.completed / payload.total) * 100);
            if (percentEl) percentEl.innerText = `${percent}%`;
            if (barEl) barEl.style.width = `${percent}%`;
        }
    }
});

// --- LUA PLUGINS MANAGER SYSTEM ---
function loadPluginsList() {
    const listEl = document.getElementById("settings-plugins-list");
    if (!listEl) return;
    
    const loading = document.createElement("div");
    loading.style.opacity = "0.5";
    loading.style.fontStyle = "italic";
    loading.textContent = "Loading plugins...";
    listEl.replaceChildren(loading);
    
    invoke("list_plugins").then((plugins) => {
        if (plugins.length === 0) {
            const empty = document.createElement("div");
            empty.style.opacity = "0.5";
            empty.style.fontStyle = "italic";
            empty.style.padding = "5px";
            empty.textContent = "No plugins found.";
            listEl.replaceChildren(empty);
            return;
        }
        
        listEl.replaceChildren();
        plugins.forEach((p) => {
            const row = document.createElement("div");
            row.className = "ssh-profile-item";
            row.style.padding = "6px 8px";
            row.style.background = "rgba(255,255,255,0.02)";
            row.style.borderRadius = "4px";
            row.style.border = "1px solid rgba(255,255,255,0.04)";
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.justifyContent = "space-between";
            row.style.gap = "10px";
            row.style.marginBottom = "4px";

            const left = document.createElement("div");
            left.style.display = "flex";
            left.style.alignItems = "center";
            left.style.gap = "8px";

            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.className = "plugin-toggle-checkbox";
            chk.setAttribute("data-file", p.file_name);
            chk.checked = !!p.enabled;
            chk.style.accentColor = "var(--accent-color)";
            chk.style.cursor = "pointer";
            chk.onchange = () => {
                const enabled = chk.checked;
                const statusEl = document.getElementById("settings-plugin-status");
                if (statusEl) statusEl.innerText = "Toggling plugin...";
                
                invoke("toggle_plugin", { fileName: p.file_name, enabled }).then(() => {
                    if (statusEl) statusEl.innerText = `Plugin ${enabled ? "enabled" : "disabled"} successfully.`;
                    loadPluginsList();
                }).catch(err => {
                    if (statusEl) statusEl.innerText = `Failed to toggle: ${err}`;
                    chk.checked = !enabled; // revert
                });
            };

            const name = document.createElement("span");
            name.style.fontWeight = "500";
            name.style.color = p.enabled ? "var(--foreground-color)" : "rgba(255,255,255,0.3)";
            name.textContent = p.name;

            const file = document.createElement("span");
            file.style.fontSize = "0.7rem";
            file.style.opacity = "0.5";
            file.textContent = `(${p.file_name})`;

            left.append(chk, name, file);

            const btn = document.createElement("button");
            btn.className = "canvas-btn plugin-edit-btn";
            btn.setAttribute("data-file", p.file_name);
            btn.style.padding = "3px 8px";
            btn.style.fontSize = "0.75rem";
            btn.textContent = "Edit";
            btn.onclick = () => {
                const statusEl = document.getElementById("settings-plugin-status");
                if (statusEl) statusEl.innerText = "Reading plugin content...";
                
                invoke("read_plugin", { fileName: p.file_name }).then((content) => {
                    // Close settings modal
                    document.getElementById("settings-overlay")?.classList.remove("active");
                    
                    // Clear status
                    if (statusEl) statusEl.innerText = "";
                    
                    // Set active file
                    window.neurodeckCanvas.activePluginFile = p.file_name;
                    
                    // Load into canvas
                    loadCanvasCode("lua", content, p.file_name);
                    
                    // Switch to canvas tab
                    const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
                    if (canvasTab) canvasTab.click();
                }).catch(err => {
                    if (statusEl) statusEl.innerText = `Failed to read plugin: ${err}`;
                });
            };
            row.append(left, btn);
            listEl.appendChild(row);
        });
    }).catch(err => {
        const error = document.createElement("div");
        error.style.color = "var(--error-color)";
        error.style.padding = "5px";
        error.textContent = `Failed to load plugins: ${String(err)}`;
        listEl.replaceChildren(error);
    });
}

const pluginMarketplaceState = {
    plugins: [],
    search: "",
    tag: ""
};

function escapeMarketplaceHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderPluginMarketplace() {
    const grid = document.getElementById("plugin-marketplace-grid");
    const tagSelect = document.getElementById("plugin-marketplace-tag");
    if (!grid) return;

    const tags = [...new Set(pluginMarketplaceState.plugins.flatMap(p => p.tags || []))].sort();
    if (tagSelect) {
        const selected = tagSelect.value || pluginMarketplaceState.tag;
        tagSelect.replaceChildren();
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All Tags";
        tagSelect.appendChild(allOption);
        tags.forEach((tag) => {
            const option = document.createElement("option");
            option.value = String(tag);
            option.textContent = String(tag);
            tagSelect.appendChild(option);
        });
        tagSelect.value = tags.includes(selected) ? selected : "";
        pluginMarketplaceState.tag = tagSelect.value;
    }

    const query = pluginMarketplaceState.search.trim().toLowerCase();
    const selectedTag = pluginMarketplaceState.tag;
    const filtered = pluginMarketplaceState.plugins.filter(plugin => {
        const haystack = `${plugin.name} ${plugin.description} ${plugin.author} ${(plugin.tags || []).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesTag = !selectedTag || (plugin.tags || []).includes(selectedTag);
        return matchesQuery && matchesTag;
    });

    if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.style.opacity = "0.45";
        empty.style.fontStyle = "italic";
        empty.textContent = "No marketplace plugins match this filter.";
        grid.replaceChildren(empty);
        return;
    }

    grid.replaceChildren();
    filtered.forEach((plugin) => {
        const card = document.createElement("div");
        card.className = `plugin-marketplace-card ${plugin.installed ? "installed" : ""}`.trim();

        const title = document.createElement("div");
        title.className = "plugin-marketplace-title";
        const strong = document.createElement("strong");
        strong.textContent = String(plugin.name ?? "");
        const secondary = document.createElement("span");
        secondary.className = "plugin-marketplace-badge";
        if (plugin.installed && !plugin.enabled) {
            secondary.textContent = "Disabled";
        } else if (plugin.installed) {
            secondary.textContent = "Installed";
        } else {
            secondary.textContent = `v${String(plugin.version ?? "")}`;
        }
        title.append(strong, secondary);

        const meta = document.createElement("div");
        meta.className = "plugin-marketplace-meta";
        meta.textContent = `${String(plugin.author ?? "")} · ${String(plugin.lua_file ?? "")}`;

        const desc = document.createElement("div");
        desc.className = "plugin-marketplace-desc";
        desc.textContent = String(plugin.description ?? "");

        const tagsWrap = document.createElement("div");
        tagsWrap.className = "plugin-marketplace-tags";
        const tagValues = (plugin.tags && plugin.tags.length) ? plugin.tags : ["utility"];
        tagValues.forEach((tag) => {
            const span = document.createElement("span");
            span.className = "plugin-marketplace-tag";
            span.textContent = String(tag);
            tagsWrap.appendChild(span);
        });

        const actions = document.createElement("div");
        actions.className = "plugin-marketplace-actions";
        const btn = document.createElement("button");
        btn.className = plugin.installed ? "stv-btn-ghost marketplace-uninstall-btn" : "stv-btn-primary marketplace-install-btn";
        btn.setAttribute("data-plugin-id", String(plugin.id));
        btn.textContent = plugin.installed ? "Uninstall" : "Install";
        btn.onclick = async () => {
            const statusEl = document.getElementById("plugin-marketplace-status");
            btn.disabled = true;
            if (plugin.installed) {
                if (!confirm(`Uninstall marketplace plugin '${plugin.id}'?`)) {
                    btn.disabled = false;
                    return;
                }
                if (statusEl) statusEl.innerText = "Uninstalling marketplace plugin...";
                try {
                    await invoke("uninstall_plugin", { pluginId: plugin.id });
                    if (statusEl) statusEl.innerText = "Plugin uninstalled and Lua runtime reloaded.";
                    await loadPluginMarketplace();
                    loadPluginsList();
                } catch (err) {
                    if (statusEl) statusEl.innerText = `Uninstall failed: ${err}`;
                } finally {
                    btn.disabled = false;
                }
            } else {
                if (statusEl) statusEl.innerText = "Installing marketplace plugin...";
                try {
                    await invoke("install_plugin_from_registry", { pluginId: plugin.id });
                    if (statusEl) statusEl.innerText = "Plugin installed and Lua runtime reloaded.";
                    await loadPluginMarketplace();
                    loadPluginsList();
                } catch (err) {
                    if (statusEl) statusEl.innerText = `Install failed: ${err}`;
                } finally {
                    btn.disabled = false;
                }
            }
        };
        actions.appendChild(btn);
        card.append(title, meta, desc, tagsWrap, actions);
        grid.appendChild(card);
    });
}

async function loadPluginMarketplace() {
    const grid = document.getElementById("plugin-marketplace-grid");
    const statusEl = document.getElementById("plugin-marketplace-status");
    if (!grid) return;

    grid.innerHTML = `<div class="marketplace-loading">Loading marketplace registry…</div>`;
    if (statusEl) statusEl.innerText = "Fetching plugin registry…";

    try {
        const registry = await invoke("fetch_plugin_registry");
        pluginMarketplaceState.plugins = registry.plugins || [];
        const count = pluginMarketplaceState.plugins.length;
        if (statusEl) statusEl.innerText = count > 0
            ? `${count} community plugin${count === 1 ? "" : "s"} available.`
            : "Registry is empty — check back soon.";
        renderPluginMarketplace();
    } catch (err) {
        pluginMarketplaceState.plugins = [];
        const error = document.createElement("div");
        error.className = "marketplace-error";
        error.textContent = "Could not reach the plugin registry. Check your internet connection and try Refresh.";
        const detail = document.createElement("span");
        detail.style.opacity = "0.5";
        detail.style.fontSize = "0.8em";
        detail.textContent = String(err);
        error.appendChild(document.createElement("br"));
        error.appendChild(detail);
        grid.replaceChildren(error);
        if (statusEl) statusEl.innerText = "Registry unavailable.";
    }
}

function initPluginsManager() {
    // Wire install plugin from URL
    const installBtn = document.getElementById("settings-plugin-install-btn");
    const urlInput = document.getElementById("settings-plugin-install-url");
    const statusEl = document.getElementById("settings-plugin-status");
    const newBtn = document.getElementById("settings-plugin-new-btn");
    const reloadBtn = document.getElementById("settings-plugin-reload-btn");
    const marketplaceSearch = document.getElementById("plugin-marketplace-search");
    const marketplaceTag = document.getElementById("plugin-marketplace-tag");
    const marketplaceRefresh = document.getElementById("plugin-marketplace-refresh-btn");

    if (installBtn && urlInput) {
        installBtn.onclick = () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert("Please enter a valid plugin URL.");
                return;
            }
            if (statusEl) statusEl.innerText = "Downloading and installing plugin...";
            installBtn.disabled = true;

            invoke("install_plugin", { url }).then(() => {
                if (statusEl) statusEl.innerText = "Plugin installed successfully!";
                urlInput.value = "";
                loadPluginsList();
                loadPluginMarketplace();
            }).catch((err) => {
                if (statusEl) statusEl.innerText = `Installation failed: ${err}`;
            }).finally(() => {
                installBtn.disabled = false;
            });
        };
    }

    if (newBtn) {
        newBtn.onclick = () => {
            // Close settings modal
            document.getElementById("settings-overlay")?.classList.remove("active");

            // Boilerplate template
            const boilerplate = `-- plugins/new_plugin.lua
-- Template for a new S-Term plugin.

-- 1. Register a custom chat command (type /mycommand in chat)
registerCommand("mycommand", function(args)
    print("Executing mycommand with args: " .. tostring(args))
    return "mycommand executed! Args: " .. tostring(args)
end)

-- 2. Register hooks to inspect or modify messages/responses
-- Available events: onMessage, onAIResponse
registerHook("onMessage", function(text)
    -- This hook runs whenever a user sends a message.
    -- You can modify the text and return it.
    return text
end)

print("[Plugin] New plugin loaded successfully!")
`;
            // Load into canvas
            loadCanvasCode("lua", boilerplate, "");

            // Switch to canvas tab
            const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
            if (canvasTab) canvasTab.click();
        };
    }

    if (reloadBtn) {
        reloadBtn.onclick = () => {
            if (statusEl) statusEl.innerText = "Reloading plugins in engine...";
            reloadBtn.disabled = true;

            invoke("reload_plugins").then(() => {
                if (statusEl) statusEl.innerText = "Plugins reloaded successfully!";
                loadPluginsList();
                loadPluginMarketplace();
            }).catch((err) => {
                if (statusEl) statusEl.innerText = `Reload failed: ${err}`;
            }).finally(() => {
                reloadBtn.disabled = false;
            });
        };
    }

    if (marketplaceSearch) {
        marketplaceSearch.oninput = () => {
            pluginMarketplaceState.search = marketplaceSearch.value || "";
            renderPluginMarketplace();
        };
    }
    if (marketplaceTag) {
        marketplaceTag.onchange = () => {
            pluginMarketplaceState.tag = marketplaceTag.value || "";
            renderPluginMarketplace();
        };
    }
    if (marketplaceRefresh) {
        marketplaceRefresh.onclick = () => loadPluginMarketplace();
    }

    loadPluginMarketplace();
}

function updateCanvasToolbarButtons() {
    const lang = window.neurodeckCanvas.currentLang;
    let saveBtn = document.getElementById("canvas-save-plugin-btn");
    
    if (lang === "lua") {
        if (!saveBtn) {
            // Create "Save Plugin" button
            saveBtn = document.createElement("button");
            saveBtn.className = "canvas-btn";
            saveBtn.id = "canvas-save-plugin-btn";
            saveBtn.innerHTML = `${createIcon('save', { size: 14 })}<span>Save Plugin</span>`;
            saveBtn.style.marginLeft = "8px";
            
            // Insert it after canvas-run-btn
            const runBtn = document.getElementById("canvas-run-btn");
            if (runBtn) {
                runBtn.parentNode.insertBefore(saveBtn, runBtn.nextSibling);
            }
            
            // Wire up Save click
            saveBtn.onclick = () => {
                const code = document.getElementById("canvas-editor").value;
                let activeFile = window.neurodeckCanvas.activePluginFile;
                
                if (activeFile) {
                    invoke("save_plugin", { fileName: activeFile, content: code }).then(() => {
                        alert(`Plugin '${activeFile}' saved successfully.`);
                    }).catch(err => {
                        alert(`Failed to save plugin: ${err}`);
                    });
                } else {
                    const fileNameInput = prompt("Enter filename for the new plugin (must end with .lua):", "my_plugin.lua");
                    if (!fileNameInput) return;
                    let sanitized = fileNameInput.trim();
                    if (!sanitized.endsWith(".lua")) {
                        sanitized += ".lua";
                    }
                    if (sanitized.includes("/") || sanitized.includes("\\") || sanitized.includes("..")) {
                        alert("Invalid file name. Do not include path slashes or dots.");
                        return;
                    }
                    
                    invoke("save_plugin", { fileName: sanitized, content: code }).then(() => {
                        window.neurodeckCanvas.activePluginFile = sanitized;
                        const fileTitle = document.getElementById("canvas-file-title");
                        if (fileTitle) fileTitle.textContent = sanitized;
                        alert(`Plugin '${sanitized}' saved successfully.`);
                    }).catch(err => {
                        alert(`Failed to save plugin: ${err}`);
                    });
                }
            };
        }
        saveBtn.style.display = "inline-block";
    } else {
        if (saveBtn) {
            saveBtn.style.display = "none";
        }
    }
}

// ==========================================================================
// DESKTOP COMPUTER USE
// ==========================================================================
const computerUseState = {
    approveAll: false,
    pendingResolve: null,
    pendingTarget: null,
    lastScreenshot: null
};

function setComputerStatus(message, tone = "info") {
    const statusEl = document.getElementById("computer-status-line");
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = `stv-status-line ${tone}`;
}

function setComputerPreview(screenshot) {
    const img = document.getElementById("computer-preview-img");
    const empty = document.getElementById("computer-preview-empty");
    if (!img || !empty) return;

    if (!screenshot || !screenshot.base64) {
        img.removeAttribute("src");
        img.classList.remove("active");
        empty.style.display = "flex";
        return;
    }

    img.src = `data:${screenshot.mime || "image/png"};base64,${screenshot.base64}`;
    img.classList.add("active");
    empty.style.display = "none";
}

async function captureComputerScreenshot({ showInAgentLog = false } = {}) {
    const screenshot = await invoke("computer_screenshot");
    computerUseState.lastScreenshot = screenshot;
    setComputerPreview(screenshot);
    if (showInAgentLog) appendComputerScreenshotToAgentLog(screenshot);
    return screenshot;
}

function appendComputerScreenshotToAgentLog(screenshot) {
    const logEl = document.getElementById("agent-log");
    if (!logEl || !screenshot?.base64) return;

    const empty = logEl.querySelector(".agent-empty-state");
    if (empty) empty.remove();

    const entry = document.createElement("div");
    entry.className = "agent-log-entry agent-log-info agent-log-computer-feed";
    entry.innerHTML = `<span class="agent-log-icon">🖥️</span>
        <div class="agent-log-body">
            <div class="agent-log-label">Computer Use</div>
            <img class="agent-computer-screenshot" alt="Desktop screenshot" src="data:${screenshot.mime || "image/png"};base64,${screenshot.base64}">
        </div>`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
}

function positionComputerTargetBox(target) {
    const box = document.getElementById("computer-use-target-box");
    const img = document.getElementById("computer-use-modal-img");
    if (!box || !img || !target || !target.width || !target.height || !img.naturalWidth || !img.naturalHeight) {
        if (box) box.style.display = "none";
        return;
    }

    const scaleX = img.clientWidth / img.naturalWidth;
    const scaleY = img.clientHeight / img.naturalHeight;
    box.style.display = "block";
    box.style.left = `${target.x * scaleX}px`;
    box.style.top = `${target.y * scaleY}px`;
    box.style.width = `${Math.max(8, target.width * scaleX)}px`;
    box.style.height = `${Math.max(8, target.height * scaleY)}px`;
}

async function requestComputerUseApproval({ action, details, target } = {}) {
    if (computerUseState.approveAll) return true;

    const modal = document.getElementById("computer-use-modal");
    const actionEl = document.getElementById("computer-use-modal-action");
    const detailsEl = document.getElementById("computer-use-modal-details");
    const img = document.getElementById("computer-use-modal-img");
    const empty = document.getElementById("computer-use-modal-empty");
    if (!modal || !actionEl || !detailsEl || !img || !empty) {
        return false;
    }

    actionEl.textContent = action || "Desktop action requested";
    detailsEl.textContent = details || "Review the desktop screenshot before approving.";
    computerUseState.pendingTarget = target || null;

    try {
        const screenshot = await captureComputerScreenshot({ showInAgentLog: true });
        img.src = `data:${screenshot.mime || "image/png"};base64,${screenshot.base64}`;
        img.classList.add("active");
        empty.style.display = "none";
        img.onload = () => positionComputerTargetBox(computerUseState.pendingTarget);
    } catch (err) {
        img.removeAttribute("src");
        img.classList.remove("active");
        empty.style.display = "flex";
        empty.textContent = `Screenshot unavailable: ${err}`;
        positionComputerTargetBox(null);
    }

    modal.classList.add("active");
    setTimeout(() => document.getElementById("computer-use-approve-btn")?.focus(), 50);

    return new Promise(resolve => {
        computerUseState.pendingResolve = resolve;
    });
}

function finishComputerUseApproval(approved, approveSession = false) {
    if (approveSession) {
        computerUseState.approveAll = true;
        const toggle = document.getElementById("computer-approve-all-toggle");
        if (toggle) toggle.checked = true;
    }
    document.getElementById("computer-use-modal")?.classList.remove("active");
    positionComputerTargetBox(null);
    const resolve = computerUseState.pendingResolve;
    computerUseState.pendingResolve = null;
    computerUseState.pendingTarget = null;
    if (resolve) resolve(approved);
}

async function invokeApprovedComputerAction(command, args, approvalMeta) {
    const approved = await requestComputerUseApproval(approvalMeta);
    if (!approved) {
        throw new Error("Computer use action denied.");
    }
    return invoke(command, { ...args, approved: true });
}

function initComputerUse() {
    const captureBtn = document.getElementById("computer-capture-btn");
    const ocrBtn = document.getElementById("computer-ocr-btn");
    const ocrInput = document.getElementById("computer-ocr-input");
    const approveAllToggle = document.getElementById("computer-approve-all-toggle");
    const approveBtn = document.getElementById("computer-use-approve-btn");
    const approveSessionBtn = document.getElementById("computer-use-approve-session-btn");
    const denyBtn = document.getElementById("computer-use-deny-btn");
    const denyX = document.getElementById("computer-use-deny-x");

    if (approveAllToggle) {
        approveAllToggle.checked = computerUseState.approveAll;
        approveAllToggle.onchange = () => {
            computerUseState.approveAll = approveAllToggle.checked;
            setComputerStatus(computerUseState.approveAll ? "Computer use auto-approval is active for this session." : "Computer use approval modal is active.", "info");
        };
    }

    if (captureBtn) {
        captureBtn.onclick = async () => {
            captureBtn.disabled = true;
            setComputerStatus("Capturing desktop screenshot...");
            try {
                await captureComputerScreenshot({ showInAgentLog: true });
                setComputerStatus("Screenshot captured.", "ok");
            } catch (err) {
                setComputerStatus(`Screenshot failed: ${err}`, "error");
            } finally {
                captureBtn.disabled = false;
            }
        };
    }

    if (ocrBtn && ocrInput) {
        ocrBtn.onclick = async () => {
            const text = ocrInput.value.trim();
            if (!text) {
                ocrInput.focus();
                return;
            }
            ocrBtn.disabled = true;
            setComputerStatus("Running OCR over the current desktop...");
            try {
                const match = await invoke("computer_find_text", { text });
                await requestComputerUseApproval({
                    action: `Found text: ${match.text}`,
                    details: `Coordinates ${match.x}, ${match.y}; confidence ${Math.round(match.confidence)}%.`,
                    target: match
                });
                setComputerStatus(`Found "${match.text}" at ${match.x}, ${match.y}.`, "ok");
            } catch (err) {
                setComputerStatus(`OCR failed: ${err}`, "error");
            } finally {
                ocrBtn.disabled = false;
            }
        };
    }

    if (approveBtn) approveBtn.onclick = () => finishComputerUseApproval(true, false);
    if (approveSessionBtn) approveSessionBtn.onclick = () => finishComputerUseApproval(true, true);
    if (denyBtn) denyBtn.onclick = () => finishComputerUseApproval(false, false);
    if (denyX) denyX.onclick = () => finishComputerUseApproval(false, false);

    window.neurodeckComputerUse = {
        captureScreenshot: captureComputerScreenshot,
        requestApproval: requestComputerUseApproval,
        mouseMove: (x, y) => invokeApprovedComputerAction("computer_mouse_move", { x, y }, {
            action: "Move mouse pointer",
            details: `Move pointer to ${x}, ${y}.`,
            target: { x, y, width: 28, height: 28 }
        }),
        click: (button = "left") => invokeApprovedComputerAction("computer_mouse_click", { button }, {
            action: "Mouse click",
            details: `Perform a ${button} click at the current pointer position.`
        }),
        type: (text) => invokeApprovedComputerAction("computer_type", { text }, {
            action: "Type text",
            details: `Type ${String(text || "").length} character${String(text || "").length === 1 ? "" : "s"} into the focused application.`
        }),
        key: (key) => invokeApprovedComputerAction("computer_key", { key }, {
            action: "Press keyboard key",
            details: `Send key: ${key}.`
        }),
        findText: (text) => invoke("computer_find_text", { text })
    };
}

// Initialize Plugins Manager event handlers
initPluginsManager();
initComputerUse();

// ============================================================================
// AGENT SWITCHER
// ============================================================================

const TIER_LABEL = {
    "fast": "⚡ Fast",
    "balanced": "⚖️ Balanced",
    "smart": "🧠 Smart",
    "local-fast": "🖥️ Local Fast",
    "local-balanced": "🖥️ Local",
    "local-smart": "🖥️ Local Smart",
};

const PROVIDER_BADGE = {
    "gemini": "☁️ Gemini",
    "ollama": "🏠 Ollama",
};

function toggleAgentSwitcher() {
    const panel = document.getElementById("agent-switcher-panel");
    if (!panel) return;
    const isHidden = panel.classList.contains("hidden");
    if (isHidden) {
        panel.classList.remove("hidden");
        renderAgentSwitcher();
        renderRecommendedModels();
    } else {
        panel.classList.add("hidden");
    }
}

function renderAgentSwitcher() {
    const grid = document.getElementById("agent-card-grid");
    if (!grid) return;
    const agents = state.agents;
    if (!agents.length) {
        grid.innerHTML = `<div class="agent-empty">No agents configured. Use the Custom tab to add one.</div>`;
        return;
    }
    grid.replaceChildren();
    agents.forEach((agent) => {
        const active = agent.id === state.activeAgentId;
        const provLabel = PROVIDER_BADGE[agent.provider] || agent.provider;
        const card = document.createElement("div");
        card.className = `agent-card${active ? " active" : ""}`;
        card.addEventListener("click", () => activateAgent(agent.id));

        const top = document.createElement("div");
        top.className = "agent-card-top";
        const name = document.createElement("span");
        name.className = "agent-card-name";
        name.textContent = String(agent.name ?? "");
        const badge = document.createElement("span");
        badge.className = `agent-provider-badge agent-provider-${String(agent.provider ?? "")}`;
        badge.textContent = String(provLabel);
        top.append(name, badge);

        const model = document.createElement("div");
        model.className = "agent-card-model";
        model.textContent = String(agent.model ?? "");
        const desc = document.createElement("div");
        desc.className = "agent-card-desc";
        desc.textContent = String(agent.description ?? "");

        card.append(top, model, desc);

        if (active) {
            const chip = document.createElement("div");
            chip.className = "agent-card-active-chip";
            chip.textContent = "ACTIVE";
            card.appendChild(chip);
        } else {
            const del = document.createElement("button");
            del.className = "agent-card-delete";
            del.title = "Delete agent";
            del.innerHTML = createIcon('x', { size: 12 });
            del.addEventListener("click", (event) => {
                event.stopPropagation();
                deleteAgentById(agent.id);
            });
            card.appendChild(del);
        }

        grid.appendChild(card);
    });
}

function renderRecommendedModels() {
    const grid = document.getElementById("agent-rec-grid");
    if (!grid) return;
    grid.innerHTML = `<div class="agent-rec-loading">Loading recommendations…</div>`;
    invoke("get_recommended_models").then(models => {
        grid.replaceChildren();
        models.forEach((m) => {
            const tierLabel = TIER_LABEL[m.tier] || m.tier;
            const vramStr = m.vram_mb > 0 ? `${m.vram_mb} MB RAM` : "Cloud";
            const card = document.createElement("div");
            card.className = "agent-rec-card";
            card.addEventListener("click", () => instantiateRecommended(m.provider, m.model, m.name));

            const top = document.createElement("div");
            top.className = "agent-rec-top";
            const name = document.createElement("span");
            name.className = "agent-rec-name";
            name.textContent = String(m.name ?? "");
            const tier = document.createElement("span");
            tier.className = "agent-tier-badge";
            tier.textContent = String(tierLabel);
            top.append(name, tier);

            const meta = document.createElement("div");
            meta.className = "agent-rec-meta";
            const providerBadge = document.createElement("span");
            providerBadge.className = `agent-provider-badge agent-provider-${String(m.provider ?? "")}`;
            providerBadge.textContent = String(PROVIDER_BADGE[m.provider] || m.provider);
            const vram = document.createElement("span");
            vram.className = "agent-vram";
            vram.textContent = vramStr;
            const deck = document.createElement("span");
            deck.className = `agent-deck-badge${m.steam_deck_ok ? "" : " warn"}`;
            deck.textContent = m.steam_deck_ok ? "✅ Deck OK" : "⚠️ Heavy";
            meta.append(providerBadge, vram, deck);

            const desc = document.createElement("div");
            desc.className = "agent-rec-desc";
            desc.textContent = String(m.description ?? "");

            const tags = document.createElement("div");
            tags.className = "agent-rec-tags";
            (m.tags || [])
                .filter(t => ["recommended", "long-context", "multilingual", "code"].includes(t))
                .forEach((tag) => {
                    const span = document.createElement("span");
                    span.className = "agent-tag";
                    span.textContent = String(tag);
                    tags.appendChild(span);
                });

            const modelId = document.createElement("div");
            modelId.className = "agent-rec-model-id";
            modelId.textContent = String(m.model ?? "");

            card.append(top, meta, desc, tags, modelId);
            grid.appendChild(card);
        });
    }).catch(() => {
        grid.innerHTML = `<div class="agent-empty">Failed to load recommendations.</div>`;
    });
}

function activateAgent(id) {
    invoke("switch_agent", { id }).then(agent => {
        state.activeAgentId = agent.id;
        state.activeProvider = agent.provider;
        renderAgentSwitcher();
        const modelNameEl = document.getElementById("model-name");
        if (modelNameEl) modelNameEl.innerText = `[ ${agent.name.toUpperCase()} ]`;
        addNotification("Agent switched", `Now using ${agent.name} (${agent.model})`, "info");
    }).catch(err => addNotification("Agent switch failed", err, "error"));
}

function deleteAgentById(id) {
    invoke("delete_agent", { id }).then(() => {
        state.agents = state.agents.filter(a => a.id !== id);
        renderAgentSwitcher();
    }).catch(err => addNotification("Delete failed", err, "error"));
}

function instantiateRecommended(provider, model, name) {
    // Build a slug from the model name
    const id = model.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase();
    const existing = state.agents.find(a => a.id === id || a.model === model);
    if (existing) {
        activateAgent(existing.id);
        return;
    }
    const ollamaUrl = "http://localhost:11434";
    const agent = {
        id,
        name,
        provider,
        model,
        base_url: provider === "ollama" ? ollamaUrl : "",
        description: "",
    };
    invoke("add_agent", { agent }).then(() => {
        invoke("list_agents").then(agents => {
            state.agents = agents;
            activateAgent(id);
        });
    }).catch(err => addNotification("Add agent failed", err, "error"));
}

// Expose agent switcher functions for inline onclick handlers
window.toggleAgentSwitcher = toggleAgentSwitcher;
window.activateAgent = activateAgent;
window.deleteAgentById = deleteAgentById;
window.instantiateRecommended = instantiateRecommended;

// Agent custom form — show/hide URL field by provider
document.addEventListener("change", (e) => {
    if (e.target.id === "new-agent-provider") {
        const urlRow = document.getElementById("new-agent-url-row");
        if (urlRow) urlRow.style.display = e.target.value === "ollama" ? "" : "none";
    }
});

function handleAddAgent() {
    const id = document.getElementById("new-agent-id")?.value.trim() || "";
    const name = document.getElementById("new-agent-name")?.value.trim() || "";
    const provider = document.getElementById("new-agent-provider")?.value || "gemini";
    const model = document.getElementById("new-agent-model")?.value.trim() || "";
    const base_url = document.getElementById("new-agent-url")?.value.trim() || "http://localhost:11434";
    const description = document.getElementById("new-agent-desc")?.value.trim() || "";
    const statusEl = document.getElementById("new-agent-status");

    if (!id || !name || !model) {
        if (statusEl) { statusEl.className = "agent-form-status error"; statusEl.innerText = "ID, Name, and Model are required."; }
        return;
    }

    invoke("add_agent", { agent: { id, name, provider, model, base_url, description } }).then(() => {
        invoke("list_agents").then(agents => {
            state.agents = agents;
            renderAgentSwitcher();
            if (statusEl) { statusEl.className = "agent-form-status ok"; statusEl.innerText = `Agent "${name}" added.`; }
            // Clear form
            ["new-agent-id","new-agent-name","new-agent-model","new-agent-url","new-agent-desc"]
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
        });
    }).catch(err => {
        if (statusEl) { statusEl.className = "agent-form-status error"; statusEl.innerText = err; }
    });
}

// Tab switching inside agent switcher panel
document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-atab]");
    if (!tab) return;
    const panel = document.getElementById("agent-switcher-panel");
    if (!panel || !panel.contains(tab)) return;
    const target = tab.dataset.atab;
    panel.querySelectorAll(".agent-tab").forEach(t => t.classList.toggle("active", t.dataset.atab === target));
    panel.querySelectorAll(".agent-tab-body").forEach(b => b.classList.add("hidden"));
    const body = document.getElementById(`agent-tab-${target}`);
    if (body) body.classList.remove("hidden");
    if (target === "recommended") renderRecommendedModels();
});

// Close agent switcher on Escape or click outside
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const panel = document.getElementById("agent-switcher-panel");
        if (panel && !panel.classList.contains("hidden")) panel.classList.add("hidden");
    }
    if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        toggleAgentSwitcher();
    }
});

document.addEventListener("click", (e) => {
    const panel = document.getElementById("agent-switcher-panel");
    const modelBtn = document.getElementById("model-name");
    if (!panel || panel.classList.contains("hidden")) return;
    if (!panel.contains(e.target) && e.target !== modelBtn) {
        panel.classList.add("hidden");
    }
});

function initNotificationCenter() {
    const notifBtn = document.getElementById("notif-btn");
    const notifModal = document.getElementById("notif-modal");
    const closeX = document.getElementById("close-notif-x");
    const closeBtn = document.getElementById("close-notif-btn");
    const clearAllBtn = document.getElementById("notif-clear-all-btn");
    
    if (notifBtn && notifModal) {
        notifBtn.onclick = () => {
            notifModal.classList.add("active");
            state.unreadNotifCount = 0;
            updateNotifBadge();
            renderNotificationsList();
        };
    }
    
    const dismiss = () => {
        if (notifModal) notifModal.classList.remove("active");
    };
    
    if (closeX) closeX.onclick = dismiss;
    if (closeBtn) closeBtn.onclick = dismiss;
    
    if (clearAllBtn) {
        clearAllBtn.onclick = () => {
            state.notifications = [];
            state.unreadNotifCount = 0;
            updateNotifBadge();
            renderNotificationsList();
        };
    }
}

// --- GAME CONTEXT PANEL SYSTEM ---
function initGameContextPanel() {
    const gameBadge = document.getElementById("game-badge");
    const gameModal = document.getElementById("game-context-modal");
    const closeX = document.getElementById("close-game-context-x");
    const closeBtn = document.getElementById("close-game-context");
    const headerImg = document.getElementById("game-context-header");
    const fallbackEl = document.getElementById("game-context-fallback");
    const fallbackNameEl = document.getElementById("game-context-fallback-name");

    const dismiss = () => {
        if (gameModal) gameModal.classList.remove("active");
    };

    const applyHeaderState = (appId, name) => {
        if (!headerImg || !fallbackEl) return;
        const fallbackName = name || "No Active Game";
        if (fallbackNameEl) fallbackNameEl.innerText = fallbackName;

        if (!appId || appId === "-") {
            headerImg.removeAttribute("src");
            headerImg.style.display = "none";
            fallbackEl.classList.add("active");
            return;
        }

        fallbackEl.classList.remove("active");
        headerImg.style.display = "block";
        headerImg.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
    };

    if (headerImg && fallbackEl) {
        headerImg.addEventListener("load", () => {
            fallbackEl.classList.remove("active");
            headerImg.style.display = "block";
        });
        headerImg.addEventListener("error", () => {
            headerImg.style.display = "none";
            fallbackEl.classList.add("active");
        });
    }

    if (gameBadge && gameModal) {
        gameBadge.onclick = () => {
            invoke("get_game_context").then(ctx => {
                const nameEl = document.getElementById("game-context-name");
                const appidEl = document.getElementById("game-context-appid");
                const statusEl = document.getElementById("game-context-status");
                const notesEl = document.getElementById("game-context-notes");
                const promptView = document.getElementById("game-context-prompt-view");
                const sessionNotesEl = document.getElementById("game-session-notes");

                const name = ctx.name || "None Detected";
                const appId = ctx.app_id || "-";
                const isRunning = ctx.is_running === "true";
                const notes = ctx.notes || "No optimization profile found.";

                if (nameEl) nameEl.innerText = name;
                if (appidEl) appidEl.innerText = appId;
                if (statusEl) {
                    statusEl.innerText = isRunning ? "Running" : "Offline";
                    statusEl.style.color = isRunning ? "var(--response-color)" : "rgba(255,255,255,0.4)";
                }
                if (notesEl) notesEl.innerText = notes;

                applyHeaderState(appId, name);

                if (promptView) {
                    promptView.value = `[Active SteamOS Game Context]\nThe user is currently playing the game: ${name} (Steam AppID: ${appId}).\nSteam Deck Optimization Notes: ${notes}\nPlease adapt your answers to help the user with this game if applicable, keeping their hardware context in mind.`;
                }

                // Load persisted session notes for this game
                if (sessionNotesEl && appId !== "-") {
                    invoke("get_game_notes", { appId }).then(savedNotes => {
                        sessionNotesEl.value = savedNotes || "";
                        // Store the current appId so the blur handler can reference it
                        sessionNotesEl.dataset.appId = appId;
                    }).catch(() => {
                        sessionNotesEl.value = "";
                        sessionNotesEl.dataset.appId = appId;
                    });
                }

                gameModal.classList.add("active");
            }).catch(err => {
                console.error("Error loading game context panel:", err);
            });
        };
    }

    // Auto-save game session notes on blur
    const sessionNotesEl = document.getElementById("game-session-notes");
    const saveIndicator = document.getElementById("game-notes-save-indicator");
    if (sessionNotesEl) {
        sessionNotesEl.addEventListener("blur", () => {
            const appId = sessionNotesEl.dataset.appId;
            if (!appId || appId === "-") return;
            invoke("save_game_note", { appId, content: sessionNotesEl.value }).then(() => {
                if (saveIndicator) {
                    saveIndicator.style.opacity = "1";
                    setTimeout(() => { saveIndicator.style.opacity = "0"; }, 1500);
                }
            }).catch(err => {
                console.error("Failed to save game note:", err);
            });
        });
    }
    
    if (closeX) closeX.onclick = dismiss;
    if (closeBtn) closeBtn.onclick = dismiss;
    if (gameModal) {
        gameModal.addEventListener("click", (event) => {
            if (event.target === gameModal) {
                dismiss();
            }
        });
    }
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && gameModal?.classList.contains("active")) {
            dismiss();
        }
    });
}



/* --- SEPARATOR --- */

// --- PROMPT LAB (SPRINT 6/7) ---
function initPromptLab() {
    const generateBtn    = document.getElementById("pl-generate-btn");
    const explainBtn     = document.getElementById("pl-explain-jpe-btn");
    const copyPromptBtn  = document.getElementById("pl-copy-prompt-btn");
    const sendChatBtn    = document.getElementById("pl-send-chat-btn");
    const copyJpeBtn     = document.getElementById("pl-copy-jpe-btn");

    // Form fields
    const personaInput     = document.getElementById("pl-persona");
    const taskInput        = document.getElementById("pl-task");
    const contextInput     = document.getElementById("pl-context");
    const toneInput        = document.getElementById("pl-tone");
    const constraintsInput = document.getElementById("pl-constraints");
    const formatInput      = document.getElementById("pl-format");
    const examplesInput    = document.getElementById("pl-examples");
    const formulaHidden    = document.getElementById("pl-formula");  // <input type="hidden">

    const resultPrompt   = document.getElementById("pl-result-prompt");
    const resultJpe      = document.getElementById("pl-result-jpe");
    const advancedToggle = document.getElementById("pl-advanced-toggle");
    const advancedFields = document.getElementById("pl-advanced-fields");

    // New UI elements
    const optimizeAiBtn        = document.getElementById("pl-optimize-ai-btn");
    const jpeLevelSelect       = document.getElementById("pl-jpe-level-select");
    const savePresetBtn        = document.getElementById("pl-save-preset-btn");
    const togglePresetInputBtn = document.getElementById("pl-toggle-preset-input-btn");
    const presetNameInput      = document.getElementById("pl-preset-name");
    const exportJsonBtn        = document.getElementById("pl-export-json-btn");
    const exportLuaBtn         = document.getElementById("pl-export-lua-btn");
    const strengthBarFill      = document.getElementById("pl-strength-bar-fill");
    const strengthLabel        = document.getElementById("pl-strength-label");
    const tokenCounter         = document.getElementById("pl-token-counter");
    const formulaBadge         = document.getElementById("pl-formula-badge");
    const formulaGrid          = document.getElementById("pl-formula-grid");
    const formulaInfo          = document.getElementById("pl-formula-info");
    const historyBtn           = document.getElementById("pl-history-btn");
    const historyDrawer        = document.getElementById("pl-history-drawer");
    const historyClear         = document.getElementById("pl-history-clear");
    const historyList          = document.getElementById("pl-history-list");
    const openGalleryBtn       = document.getElementById("pl-open-gallery-btn");
    const galleryOverlay       = document.getElementById("pl-gallery-overlay");
    const galleryClose         = document.getElementById("pl-gallery-close");
    const galleryDrawer        = document.getElementById("pl-template-gallery");
    const galleryBody          = document.getElementById("pl-gallery-body");
    const gallerySearch        = document.getElementById("pl-gallery-search");

    if (!generateBtn) return;

    let loadedCustomPresets = {};
    let promptHistory = [];

    // ── Formula Definitions ────────────────────────────────────────────────────
    const FORMULAS = [
        { id: "default",  icon: "fileText", label: "Default",  desc: "Standard structure: Persona → Task → Context → Constraints → Format." },
        { id: "aida",     icon: "messageSquare", label: "AIDA",     desc: "Attention, Interest, Desire, Action. Best for persuasive copy and marketing." },
        { id: "scqa",     icon: "search", label: "SCQA",     desc: "Situation, Complication, Question, Answer. Ideal for consulting and structured analysis." },
        { id: "pastor",   icon: "sparkles", label: "PASTOR",   desc: "Problem, Amplify, Story, Transformation, Offer, Response. Landing pages and pitches." },
        { id: "pas",      icon: "zap", label: "PAS",      desc: "Problem, Agitate, Solution. Punchy copywriting that highlights pain points." },
        { id: "cot",      icon: "brain", label: "CoT",      desc: "Chain of Thought. Decomposes complex reasoning step-by-step. Great for logic and code." },
        { id: "tot",      icon: "sparkles", label: "ToT",      desc: "Tree of Thought. Branches, evaluates, and searches solution paths. Best for design." },
        { id: "star",     icon: "sparkles", label: "STAR",     desc: "Situation, Task, Action, Result. Perfect for case studies and narrative examples." },
        { id: "rice",     icon: "chartColumn", label: "RICE",     desc: "Reach, Impact, Confidence, Effort. Structured prioritization and product decisions." },
        { id: "icio",     icon: "refreshCw", label: "ICIO",     desc: "Input, Constraints, Instructions, Output. Precision engineering for technical tasks." },
        { id: "react",    icon: "bot", label: "ReAct",    desc: "Reason + Act loop. Forces explicit reasoning before each action step. Agent tasks." },
        { id: "spin",     icon: "messageSquare", label: "SPIN",     desc: "Situation, Problem, Implication, Need-Payoff. Sales-grade interrogation framework." },
        { id: "rtf",      icon: "fileText", label: "RTF",      desc: "Role, Task, Format. Ultra-minimal 3-part prompt for quick structured generation." },
        { id: "expert",   icon: "sparkles", label: "Expert",   desc: "Expert persona activation with domain calibration, constraints, and output spec." },
        { id: "socratic", icon: "brain", label: "Socratic", desc: "Guided discovery through questions. Forces the AI to reason by questioning assumptions." },
    ];

    // ── Template Gallery Data ──────────────────────────────────────────────────
    const TEMPLATE_CATEGORIES = [
        {
            label: "Game Design",
            templates: [
                {
                    title: "Endless Runner Concept",
                    desc: "Mobile cyberpunk endless runner for kids 8-14",
                    tag: "Game Dev",
                    data: { persona: "You are a creative game designer.", task: "Design an endless runner game concept for mobile devices.", context: "Target audience: kids, ages 8-14. Theme: Cyberpunk.", tone: "Upbeat, energetic, and concise.", constraints: "- List 3 unique gameplay mechanics\n- Max 150 words total", format: "JSON with keys: title, mechanics, art_style", formula: "default" }
                },
                {
                    title: "Roguelike Dungeon System",
                    desc: "Procedural dungeon generation design doc",
                    tag: "Game Dev",
                    data: { persona: "You are a senior game systems designer.", task: "Design a procedural dungeon generation system for a 2D roguelike.", context: "Unity engine, pixel art aesthetic. Single dev project.", tone: "Technical and detailed.", constraints: "- Cover room types, corridors, and difficulty scaling\n- Include spawner logic", format: "Markdown with H2 sections", formula: "cot" }
                },
                {
                    title: "Game Economy Balancer",
                    desc: "Balance a free-to-play currency economy",
                    tag: "F2P",
                    data: { persona: "You are an expert game economist.", task: "Analyze and balance a free-to-play game economy with two currencies.", context: "Soft currency earned via gameplay. Hard currency purchased. Retention focus.", tone: "Analytical, structured.", constraints: "- Avoid pay-to-win\n- Include daily login bonuses and event structures", format: "Table + written rationale", formula: "rice" }
                },
            ]
        },
        {
            label: "Engineering",
            templates: [
                {
                    title: "Lua Script Template",
                    desc: "Extract email addresses from text with Lua",
                    tag: "Lua",
                    data: { persona: "You are a senior Lua developer.", task: "Write a Lua script that parses a string and extracts all email addresses.", context: "Data processing pipeline. No external libraries.", tone: "Technical and precise.", constraints: "- Comment the regex\n- Single function: extract_emails(text)", format: "Lua code block only", formula: "default" }
                },
                {
                    title: "Rust API Endpoint",
                    desc: "Design a RESTful endpoint in Tauri/Axum",
                    tag: "Rust",
                    data: { persona: "You are a Rust systems engineer.", task: "Design a REST API endpoint for user authentication with JWT.", context: "Tauri desktop app. Axum framework. Async Rust.", tone: "Precise, security-conscious.", constraints: "- Include error handling\n- Use map_err, no unwrap()\n- Include request/response types", format: "Complete Rust code with types", formula: "icio" }
                },
                {
                    title: "SQL Query Optimizer",
                    desc: "Optimize a slow database query",
                    tag: "SQL",
                    data: { persona: "You are a database performance engineer.", task: "Analyze and optimize a slow SQL query for a user activity dashboard.", context: "PostgreSQL 15. Table has 10M+ rows. No query cache.", tone: "Technical, explanatory.", constraints: "- Explain each optimization\n- Show EXPLAIN ANALYZE output interpretation", format: "SQL + Markdown explanation", formula: "scqa" }
                },
                {
                    title: "Code Review Checklist",
                    desc: "Generate a thorough code review",
                    tag: "DevOps",
                    data: { persona: "You are a senior software engineer and CISO.", task: "Review the following code for bugs, security vulnerabilities, and performance issues.", context: "Production Rust/TypeScript codebase. Solo developer.", tone: "Methodical, constructive.", constraints: "- Prioritize by severity (Critical > High > Medium)\n- Include fix suggestions", format: "Markdown table with columns: Issue, Severity, Fix", formula: "expert" }
                },
            ]
        },
        {
            label: "Product & Strategy",
            templates: [
                {
                    title: "Product Feature List",
                    desc: "Minimalist to-do app feature breakdown",
                    tag: "Product",
                    data: { persona: "You are an expert product manager.", task: "Create a feature list for a minimalist To-Do list app.", context: "Target: busy professionals who hate complexity.", tone: "Professional and structured.", constraints: "- Exactly 5 features\n- Short name + 1 sentence description each", format: "Markdown bulleted list", formula: "default" }
                },
                {
                    title: "Competitive Analysis",
                    desc: "SCQA-structured competitor teardown",
                    tag: "Strategy",
                    data: { persona: "You are a strategic consultant.", task: "Analyze the competitive landscape for a solo-dev AI terminal app.", context: "Competitors: GitHub Copilot CLI, Cursor, Warp terminal.", tone: "Executive, data-driven.", constraints: "- Focus on gaps and opportunities\n- Max 400 words", format: "Markdown with SWOT table", formula: "scqa" }
                },
                {
                    title: "Sprint Backlog Generator",
                    desc: "Convert a feature idea into sprint tasks",
                    tag: "Agile",
                    data: { persona: "You are an Agile coach and staff engineer.", task: "Convert a feature description into a prioritized sprint backlog.", context: "Solo developer, 2-week sprints, Tauri desktop app.", tone: "Structured, actionable.", constraints: "- Max 8 tasks\n- Include acceptance criteria per task\n- Mark dependencies", format: "Markdown checklist with AC and deps", formula: "rice" }
                },
            ]
        },
        {
            label: "✍️ Content & Copy",
            templates: [
                {
                    title: "Landing Page Hero Copy",
                    desc: "AIDA-structured hero section for a SaaS",
                    tag: "Marketing",
                    data: { persona: "You are a world-class conversion copywriter.", task: "Write hero section copy for a solo-dev AI terminal application.", context: "Product: NEURODECK — AI-native terminal OS for Steam Deck.", tone: "Bold, energetic, technical-cool.", constraints: "- Headline ≤12 words\n- Subheadline ≤25 words\n- 3 CTA variants", format: "Structured copy block", formula: "aida" }
                },
                {
                    title: "Tech Blog Post Outline",
                    desc: "Structured outline for a technical article",
                    tag: "Content",
                    data: { persona: "You are a senior developer and technical writer.", task: "Create a detailed outline for a blog post about building a Tauri desktop app.", context: "Target audience: intermediate Rust developers.", tone: "Educational, engaging.", constraints: "- 6-8 sections\n- Include code snippet placeholders\n- End with key takeaways", format: "Markdown H2/H3 outline", formula: "star" }
                },
                {
                    title: "Cold Email Sequence",
                    desc: "3-email outreach sequence (SPIN framework)",
                    tag: "Sales",
                    data: { persona: "You are a B2B sales strategist.", task: "Write a 3-email cold outreach sequence for an indie dev selling a productivity tool.", context: "Target: CTOs and engineering leads at 10-50 person startups.", tone: "Professional, empathetic, direct.", constraints: "- Each email ≤150 words\n- Progressive value escalation\n- Clear CTAs", format: "Email 1 / Email 2 / Email 3 blocks", formula: "spin" }
                },
            ]
        },
        {
            label: "🧪 AI & Research",
            templates: [
                {
                    title: "Socratic Reasoning Session",
                    desc: "Guide AI through a problem via questions",
                    tag: "Research",
                    data: { persona: "You are a Socratic tutor.", task: "Guide me through understanding transformer attention mechanisms using only questions.", context: "I have intermediate ML knowledge but haven't built a transformer from scratch.", tone: "Patient, inquisitive, Socratic.", constraints: "- Never state answers directly\n- Ask only one question at a time\n- Build towards understanding", format: "Dialogue format", formula: "socratic" }
                },
                {
                    title: "ReAct Agent Task",
                    desc: "Multi-step reasoning + action agent prompt",
                    tag: "Agents",
                    data: { persona: "You are an autonomous AI agent.", task: "Research and summarize the latest developments in Rust async runtimes.", context: "I need a decision on whether to switch from tokio to async-std for a new project.", tone: "Methodical, evidence-based.", constraints: "- Show Thought/Action/Observation steps\n- Cite sources\n- End with Recommendation", format: "ReAct trace + Final Answer", formula: "react" }
                },
                {
                    title: "Dataset Generation Prompt",
                    desc: "Generate synthetic training data",
                    tag: "ML",
                    data: { persona: "You are an ML data engineer.", task: "Generate 20 synthetic question-answer pairs for fine-tuning a coding assistant.", context: "Focus on Rust error handling patterns. Difficulty: intermediate to advanced.", tone: "Technical, precise.", constraints: "- Diverse error types (Result, Option, ?, panic)\n- Realistic code snippets\n- Include edge cases", format: "JSONL with fields: question, answer, difficulty", formula: "icio" }
                },
            ]
        },
    ];

    // ── Render Formula Cards ───────────────────────────────────────────────────
    function renderFormulaCards() {
        if (!formulaGrid) return;
        formulaGrid.innerHTML = "";
        FORMULAS.forEach(f => {
            const card = document.createElement("div");
            card.className = "pl-formula-card" + (f.id === "default" ? " active" : "");
            card.dataset.formulaId = f.id;
            card.innerHTML = `<div class="pl-formula-card-icon">${createIcon(f.icon, { size: 18 })}</div><div class="pl-formula-card-label">${f.label}</div>`;
            card.addEventListener("click", () => selectFormula(f.id));
            formulaGrid.appendChild(card);
        });
    }

    function selectFormula(id) {
        formulaHidden.value = id;
        const formula = FORMULAS.find(f => f.id === id);
        if (formulaBadge) formulaBadge.textContent = formula ? formula.label : id.toUpperCase();
        if (formulaInfo) formulaInfo.textContent = formula ? formula.desc : "";
        formulaGrid.querySelectorAll(".pl-formula-card").forEach(card => {
            card.classList.toggle("active", card.dataset.formulaId === id);
        });
        assemblePrompt();
    }

    renderFormulaCards();

    // ── Token Counter ──────────────────────────────────────────────────────────
    function updateTokenCounter(text) {
        if (!tokenCounter) return;
        // Rough estimate: 1 token ≈ 4 chars
        const tokens = Math.ceil((text || "").length / 4);
        tokenCounter.textContent = `~${tokens} tokens`;
        tokenCounter.classList.toggle("warn", tokens > 1500 && tokens <= 3000);
        tokenCounter.classList.toggle("high", tokens > 3000);
    }

    // ── Prompt History ─────────────────────────────────────────────────────────
    function addToHistory(promptText) {
        if (!promptText.trim() || promptHistory[0] === promptText) return;
        promptHistory.unshift(promptText);
        if (promptHistory.length > 20) promptHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = "";
        if (promptHistory.length === 0) {
            historyList.innerHTML = `<div style="padding:10px 12px;font-size:0.75rem;color:rgba(255,255,255,0.3)">No history yet.</div>`;
            return;
        }
        promptHistory.forEach((p, i) => {
            const el = document.createElement("div");
            el.className = "pl-history-item";
            el.innerHTML = `<div class="pl-history-item-meta">#${i + 1} · ${p.length} chars</div>${p.substring(0, 90)}${p.length > 90 ? "…" : ""}`;
            el.addEventListener("click", () => {
                resultPrompt.value = p;
                updateTokenCounter(p);
                historyDrawer.classList.add("hidden");
            });
            historyList.appendChild(el);
        });
    }

    if (historyBtn) {
        historyBtn.addEventListener("click", () => historyDrawer.classList.toggle("hidden"));
    }
    if (historyClear) {
        historyClear.addEventListener("click", () => {
            promptHistory = [];
            renderHistory();
        });
    }

    // ── Template Gallery ───────────────────────────────────────────────────────
    function openGallery() {
        if (!galleryDrawer) return;
        galleryDrawer.classList.remove("hidden");
        renderGallery("");
        if (gallerySearch) { gallerySearch.value = ""; gallerySearch.focus(); }
    }
    function closeGallery() {
        if (galleryDrawer) galleryDrawer.classList.add("hidden");
    }

    function renderGallery(query) {
        if (!galleryBody) return;
        const q = query.toLowerCase().trim();
        galleryBody.innerHTML = "";
        TEMPLATE_CATEGORIES.forEach(cat => {
            const filtered = q ? cat.templates.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.desc.toLowerCase().includes(q) ||
                t.tag.toLowerCase().includes(q)
            ) : cat.templates;
            if (filtered.length === 0) return;

            const section = document.createElement("div");
            section.className = "pl-gallery-category";
            section.innerHTML = `<div class="pl-gallery-category-label">${cat.label}</div>`;

            filtered.forEach(tmpl => {
                const card = document.createElement("div");
                card.className = "pl-gallery-card";
                card.innerHTML = `
                    <div class="pl-gallery-card-title">
                        ${tmpl.title}
                        <span class="pl-gallery-card-tag">${tmpl.tag}</span>
                    </div>
                    <div class="pl-gallery-card-desc">${tmpl.desc}</div>
                `;
                card.addEventListener("click", () => applyTemplate(tmpl.data));
                section.appendChild(card);
            });

            galleryBody.appendChild(section);
        });

        if (galleryBody.children.length === 0) {
            galleryBody.innerHTML = `<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:0.85rem">No templates match "${query}"</div>`;
        }
    }

    function applyTemplate(data) {
        if (personaInput)     personaInput.value     = data.persona     || "";
        if (taskInput)        taskInput.value        = data.task        || "";
        if (contextInput)     contextInput.value     = data.context     || "";
        if (toneInput)        toneInput.value        = data.tone        || "";
        if (constraintsInput) constraintsInput.value = data.constraints || "";
        if (formatInput)      formatInput.value      = data.format      || "";
        if (examplesInput)    examplesInput.value    = data.examples    || "";
        selectFormula(data.formula || "default");
        assemblePrompt();
        updatePromptStrength();
        closeGallery();
        addNotification("Prompt Lab", "Template loaded.", "success");
    }

    if (openGalleryBtn) openGalleryBtn.addEventListener("click", openGallery);
    if (galleryClose)   galleryClose.addEventListener("click", closeGallery);
    if (galleryOverlay) galleryOverlay.addEventListener("click", closeGallery);
    if (gallerySearch) {
        gallerySearch.addEventListener("input", e => renderGallery(e.target.value));
    }

    // ── Quick-fill Chips ───────────────────────────────────────────────────────
    document.querySelectorAll(".pl-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const targetId = chip.dataset.target;
            const target = document.getElementById(targetId);
            if (!target) return;
            const val = chip.textContent.trim();
            if (target.value) {
                target.value = target.value.trimEnd() + ", " + val;
            } else {
                target.value = val;
            }
            assemblePrompt();
            updatePromptStrength();
        });
    });

    // ── Strength Meter ─────────────────────────────────────────────────────────
    function updatePromptStrength() {
        let score = 0;
        if (personaInput.value.trim().length > 5) score++;
        if (taskInput.value.trim().length > 5) score++;
        if (contextInput.value.trim().length > 5) score++;
        if (toneInput.value.trim().length > 2) score++;
        if (constraintsInput.value.trim().length > 5 || formatInput.value.trim().length > 5) score++;

        const percentage = (score / 5) * 100;
        if (strengthBarFill) {
            strengthBarFill.style.width = percentage + "%";
            if (score <= 2) {
                strengthBarFill.style.background = "var(--error-color)";
                if (strengthLabel) { strengthLabel.style.color = "var(--error-color)"; strengthLabel.textContent = `Weak (${score}/5)`; }
            } else if (score <= 4) {
                strengthBarFill.style.background = "var(--accent-color)";
                if (strengthLabel) { strengthLabel.style.color = "var(--accent-color)"; strengthLabel.textContent = `Moderate (${score}/5)`; }
            } else {
                strengthBarFill.style.background = "var(--response-color)";
                if (strengthLabel) { strengthLabel.style.color = "var(--response-color)"; strengthLabel.textContent = `Optimized (${score}/5) ✨`; }
            }
        }
    }

    // ── Custom Presets ─────────────────────────────────────────────────────────
    function refreshCustomPresets() {
        invoke("load_prompt_presets")
            .then(presets => { loadedCustomPresets = presets; })
            .catch(err => console.error("Error loading presets:", err));
    }
    refreshCustomPresets();

    if (togglePresetInputBtn) {
        togglePresetInputBtn.addEventListener("click", () => {
            if (presetNameInput.style.display === "none") {
                presetNameInput.style.display = "block";
                savePresetBtn.style.display = "block";
                togglePresetInputBtn.textContent = "Cancel";
            } else {
                presetNameInput.style.display = "none";
                savePresetBtn.style.display = "none";
                presetNameInput.value = "";
                togglePresetInputBtn.innerHTML = `${createIcon('upload', { size: 13 })}`;
            }
        });
    }

    if (savePresetBtn) {
        savePresetBtn.addEventListener("click", () => {
            const name = presetNameInput.value.trim();
            if (!name) { addNotification("Prompt Lab", "Enter a preset name.", "error"); return; }
            const schema = {
                persona: personaInput.value.trim(), task: taskInput.value.trim(),
                context: contextInput.value.trim(), tone: toneInput.value.trim(),
                constraints: constraintsInput.value.trim(), format: formatInput.value.trim(),
                examples: examplesInput.value.trim(), formula: formulaHidden.value
            };
            invoke("save_prompt_preset", { name, schemaJson: JSON.stringify(schema) })
                .then(() => {
                    addNotification("Prompt Lab", `Preset "${name}" saved!`, "success");
                    presetNameInput.style.display = "none";
                    savePresetBtn.style.display = "none";
                    presetNameInput.value = "";
                    togglePresetInputBtn.innerHTML = `${createIcon('upload', { size: 13 })}`;
                    refreshCustomPresets();
                })
                .catch(err => addNotification("Prompt Lab", "Failed: " + err, "error"));
        });
    }

    // ── AI Optimize ────────────────────────────────────────────────────────────
    if (optimizeAiBtn) {
        optimizeAiBtn.addEventListener("click", async () => {
            const currentTask = taskInput.value.trim();
            if (!currentTask) { addNotification("Prompt Lab", "Add a task first.", "error"); return; }
            optimizeAiBtn.disabled = true;
            const orig = optimizeAiBtn.innerHTML;
            optimizeAiBtn.innerHTML = `${createIcon('zap', { size: 13 })}<span>Working...</span>`;
            try {
                const schema = await invoke("optimize_raw_prompt", { rawText: currentTask });
                personaInput.value     = schema.persona;
                taskInput.value        = schema.task;
                contextInput.value     = schema.context;
                toneInput.value        = schema.tone;
                constraintsInput.value = schema.constraints;
                formatInput.value      = schema.format;
                addNotification("Prompt Lab", "AI Optimization done!", "success");
                assemblePrompt();
                updatePromptStrength();
            } catch (err) {
                addNotification("Prompt Lab", "Optimization failed: " + err, "error");
            } finally {
                optimizeAiBtn.disabled = false;
                optimizeAiBtn.innerHTML = orig;
            }
        });
    }

    // ── Advanced Toggle ────────────────────────────────────────────────────────
    if (advancedToggle) {
        advancedToggle.addEventListener("click", () => {
            advancedFields.classList.toggle("hidden");
            advancedToggle.innerHTML = advancedFields.classList.contains("hidden")
                ? `${createIcon('settings2', { size: 14 })}<span>Few-Shot Examples</span>`
                : `${createIcon('settings2', { size: 14 })}<span>Hide Examples</span>`;
        });
    }

    // ── Prompt Assembly ────────────────────────────────────────────────────────
    async function assemblePrompt() {
        const persona     = personaInput.value;
        const task        = taskInput.value;
        const context     = contextInput.value;
        const tone        = toneInput.value;
        const constraints = constraintsInput.value;
        const format      = formatInput.value;
        const examples    = examplesInput.value;
        const formula     = formulaHidden.value;

        try {
            const assembled = await invoke("assemble_prompt_via_lua_cmd", {
                persona, task, context, tone, constraints, format, examples, formula
            });
            resultPrompt.value = assembled;
            updateTokenCounter(assembled);
        } catch {
            let parts = [];
            if (persona.trim())     parts.push(`**Role/Persona:**\n${persona.trim()}`);
            if (task.trim())        parts.push(`**Task/Objective:**\n${task.trim()}`);
            if (context.trim())     parts.push(`**Context/Background:**\n${context.trim()}`);
            if (tone.trim())        parts.push(`**Tone/Style:**\n${tone.trim()}`);
            if (constraints.trim()) parts.push(`**Constraints:**\n${constraints.trim()}`);
            if (format.trim())      parts.push(`**Output Format:**\n${format.trim()}`);
            const fallback = parts.join("\n\n");
            resultPrompt.value = fallback;
            updateTokenCounter(fallback);
        }
    }

    generateBtn.addEventListener("click", () => {
        assemblePrompt().then(() => {
            addToHistory(resultPrompt.value);
            addNotification("Prompt Lab", "Prompt generated.", "success");
        });
    });

    // Auto-update on any field change
    [personaInput, taskInput, contextInput, toneInput, constraintsInput, formatInput, examplesInput].forEach(el => {
        el.addEventListener("input", () => { assemblePrompt(); updatePromptStrength(); });
    });

    // ── JPE Explanation ────────────────────────────────────────────────────────
    explainBtn.addEventListener("click", async () => {
        const text = resultPrompt.value.trim();
        if (!text) { addNotification("Prompt Lab", "Generate a prompt first.", "error"); return; }
        resultJpe.innerHTML = `<span class="pl-empty-text">Generating explanation…</span>`;
        explainBtn.disabled = true;
        const level = jpeLevelSelect ? jpeLevelSelect.value : "grade8";
        try {
            const explanation = await invoke("generate_jpe_explanation_with_level", { promptText: text, readingLevel: level });
            resultJpe.innerHTML = `<div class="jpe-content"></div>`;
            resultJpe.querySelector(".jpe-content").innerHTML = window.sanitizeHtml(explanation).replace(/\n/g, '<br>');
        } catch (err) {
            resultJpe.innerHTML = `<span class="pl-empty-text" style="color:var(--error-color)"></span>`;
            resultJpe.querySelector(".pl-empty-text").textContent = `Error: ${err}`;
            addNotification("Prompt Lab", "Explanation failed.", "error");
        } finally {
            explainBtn.disabled = false;
        }
    });

    copyPromptBtn.addEventListener("click", () => {
        if (resultPrompt.value) { navigator.clipboard.writeText(resultPrompt.value); addNotification("Prompt Lab", "Prompt copied.", "success"); }
    });
    copyJpeBtn.addEventListener("click", () => {
        if (resultJpe.innerText && !resultJpe.innerText.includes("Generate")) { navigator.clipboard.writeText(resultJpe.innerText); addNotification("Prompt Lab", "Explanation copied.", "success"); }
    });
    sendChatBtn.addEventListener("click", () => {
        if (!resultPrompt.value) return;
        document.querySelector('.nav-tab[data-view="chat"]')?.click();
        const chatInput = document.getElementById("user-input");
        if (chatInput) {
            chatInput.value = resultPrompt.value;
            chatInput.focus();
            chatInput.style.height = "auto";
            chatInput.style.height = Math.min(chatInput.scrollHeight, 300) + "px";
            addNotification("Prompt Lab", "Prompt sent to Chat.", "info");
        }
    });

    // ── Export handlers ────────────────────────────────────────────────────────
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener("click", () => {
            if (!resultPrompt.value.trim()) { addNotification("Prompt Lab", "Generate first.", "error"); return; }
            const schema = {
                persona: personaInput.value.trim(), task: taskInput.value.trim(),
                context: contextInput.value.trim(), tone: toneInput.value.trim(),
                constraints: constraintsInput.value.trim(), format: formatInput.value.trim(),
                examples: examplesInput.value.trim(), formula: formulaHidden.value,
                assembled_prompt: resultPrompt.value
            };
            navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
            addNotification("Prompt Lab", "JSON Schema copied.", "success");
        });
    }
    if (exportLuaBtn) {
        exportLuaBtn.addEventListener("click", () => {
            if (!resultPrompt.value.trim()) { addNotification("Prompt Lab", "Generate first.", "error"); return; }
            const esc = resultPrompt.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
            const lua = `-- S-Term Prompt Lab Macro\n-- ${new Date().toISOString()}\nlocal prompt = "${esc}"\nprint("[Macro] Sending prompt...")\nlocal response = sendPrompt(prompt)\nprint("[Macro] Response:")\nprint(response)\n`;
            navigator.clipboard.writeText(lua);
            addNotification("Prompt Lab", "Lua macro copied.", "success");
        });
    }

    updatePromptStrength();
}
initPromptLab();

// Onboarding Wizard Implementation
async function checkOnboarding() {
    // Wait for the boot screen to finish — hard timeout (8s) so we never block forever
    await new Promise(resolve => {
        if (!document.getElementById('boot-overlay')) { resolve(); return; }
        const timer = setTimeout(resolve, 8000);
        document.addEventListener('neurodeck-boot-complete', () => { clearTimeout(timer); resolve(); }, { once: true });
    });

    try {
        const completed = localStorage.getItem("neurodeck_onboarding_complete");
        if (completed === "true") return; // Already done — skip
        showOnboardingWizard();
    } catch (e) {
        console.error("Failed to check onboarding state:", e);
    }
}

async function showOnboardingWizard() {
    // 1. Create onboarding overlay element
    const overlay = document.createElement("div");
    overlay.id = "onboarding-overlay";
    overlay.className = "onboarding-overlay";

    // 2. Set up HTML content — 5-step enhanced wizard
    overlay.innerHTML = `
        <div class="onboarding-container">
            <header class="onboarding-header">
                <h2 class="onboarding-title">NEURODECK // INITIAL_BOOT_SETUP</h2>
                <div class="onboarding-steps-indicator">
                    <span class="onboarding-step-dot active" data-step="1"></span>
                    <span class="onboarding-step-dot" data-step="2"></span>
                    <span class="onboarding-step-dot" data-step="3"></span>
                    <span class="onboarding-step-dot" data-step="4"></span>
                    <span class="onboarding-step-dot" data-step="5"></span>
                    <span class="onboarding-step-dot" data-step="6"></span>
                </div>
            </header>

            <div class="onboarding-content">
                <!-- Slide 1: Welcome -->
                <div class="onboarding-slide active" id="slide-1">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 8px;">WELCOME TO NEURODECK OS</h3>
                    <p class="onboarding-welcome-text" id="onboarding-welcome-typing" style="min-height: 2.5rem;"></p>

                    <div class="ob-stats-row">
                        <div class="ob-stat">
                            <span class="ob-stat-number" id="ob-stat-features">0</span>
                            <span class="ob-stat-label">Features</span>
                        </div>
                        <div class="ob-stat">
                            <span class="ob-stat-number" id="ob-stat-views">0</span>
                            <span class="ob-stat-label">Views</span>
                        </div>
                        <div class="ob-stat">
                            <span class="ob-stat-number" id="ob-stat-deck">1</span>
                            <span class="ob-stat-label">Deck</span>
                        </div>
                    </div>

                    <div class="ob-tags">
                        <span class="ob-tag">AI Chat</span>
                        <span class="ob-tag">RAG Memory</span>
                        <span class="ob-tag">Live Canvas</span>
                        <span class="ob-tag">PTY Shell</span>
                        <span class="ob-tag">SSH Client</span>
                        <span class="ob-tag">Gamepad Native</span>
                        <span class="ob-tag">Gemini / Ollama</span>
                        <span class="ob-tag">Warpinator gRPC</span>
                        <span class="ob-tag">Lua Plugins</span>
                        <span class="ob-tag">Plugin Marketplace</span>
                        <span class="ob-tag">Prompt Lab</span>
                        <span class="ob-tag">1280×800</span>
                    </div>
                </div>

                <!-- Slide 2: Feature Tour -->
                <div class="onboarding-slide" id="slide-2">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">SYSTEM_FEATURE_MANIFEST</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 12px;">12 integrated views. One fullscreen command center.</p>
                    <div class="ob-feature-grid">
                        <div class="ob-feature-card" style="animation-delay: 0.02s">
                            <span class="ob-feature-icon">${createIcon('messageSquare', { size: 18 })}</span>
                            <span class="ob-feature-name">Chat</span>
                            <span class="ob-feature-desc">LLM streaming chat with RAG memory injection and game context awareness.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.07s">
                            <span class="ob-feature-icon">${createIcon('sparkles', { size: 18 })}</span>
                            <span class="ob-feature-name">Canvas</span>
                            <span class="ob-feature-desc">Live HTML/JS preview. Run Python, Bash, Lua. LAN collaboration mode.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.12s">
                            <span class="ob-feature-icon">${createIcon('squareTerminal', { size: 18 })}</span>
                            <span class="ob-feature-name">Terminal</span>
                            <span class="ob-feature-desc">Multi-session real shell. AI autocomplete Ctrl+Space. History search Ctrl+H.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.17s">
                            <span class="ob-feature-icon">${createIcon('server', { size: 18 })}</span>
                            <span class="ob-feature-name">SSH</span>
                            <span class="ob-feature-desc">Full SSH client. Password + key auth. Saved profiles. Session tab per connection.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.22s">
                            <span class="ob-feature-icon">${createIcon('route', { size: 18 })}</span>
                            <span class="ob-feature-name">Tunnel</span>
                            <span class="ob-feature-desc">TCP bridge between SteamOS Desktop Mode and Game Mode.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.27s">
                            <span class="ob-feature-icon">${createIcon('globe', { size: 18 })}</span>
                            <span class="ob-feature-name">Browser</span>
                            <span class="ob-feature-desc">Native WebView overlay. Speed-dial bookmarks, URL bar, DuckDuckGo search.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.32s">
                            <span class="ob-feature-icon">${createIcon('bot', { size: 18 })}</span>
                            <span class="ob-feature-name">Agent</span>
                            <span class="ob-feature-desc">5-step autonomous loop: plan → write → run → check → iterate. Roundtable mode.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.37s">
                            <span class="ob-feature-icon">${createIcon('brain', { size: 18 })}</span>
                            <span class="ob-feature-name">Memory</span>
                            <span class="ob-feature-desc">Vector DB with cosine similarity. RAG search + local doc indexing.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.42s">
                            <span class="ob-feature-icon">${createIcon('share2', { size: 18 })}</span>
                            <span class="ob-feature-name">Share</span>
                            <span class="ob-feature-desc">LAN P2P mDNS transfer. FTP/SFTP browser. Warpinator gRPC server.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.47s">
                            <span class="ob-feature-icon">${createIcon('sparkles', { size: 18 })}</span>
                            <span class="ob-feature-name">Prompt Lab</span>
                            <span class="ob-feature-desc">Visual prompt engineering studio. 7 formulas (AIDA, SCQA, CoT, ToT…). JPE explain mode.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.52s">
                            <span class="ob-feature-icon">${createIcon('panelRightOpen', { size: 18 })}</span>
                            <span class="ob-feature-name">Remote</span>
                            <span class="ob-feature-desc">iPhone WebSocket control. QR pairing. Send commands from Safari on your LAN.</span>
                        </div>
                        <div class="ob-feature-card" style="animation-delay: 0.57s">
                            <span class="ob-feature-icon">${createIcon('settings2', { size: 18 })}</span>
                            <span class="ob-feature-name">Settings</span>
                            <span class="ob-feature-desc">Themes, personas, LLM config, OS keychain, and Plugin Marketplace — all in one panel.</span>
                        </div>
                    </div>
                </div>

                <!-- Slide 3: API Key Configuration -->
                <div class="onboarding-slide" id="slide-3">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 4px;">PROVIDER_AUTHENTICATION</h3>
                    <p style="font-size: 0.72rem; opacity: 0.7; margin: 0 0 10px;">Choose your LLM backend — powers Chat, Agent, RAG memory, and AI autocomplete.</p>

                    <div class="onboarding-choice-container" style="margin-bottom: 12px;">
                        <div class="onboarding-choice-card active" data-provider="gemini-key">
                            <span class="onboarding-choice-icon">${createIcon('shieldCheck', { size: 16 })}</span>
                            <span class="onboarding-choice-title">Gemini API Key</span>
                            <span class="onboarding-choice-desc">Manual entry of Google Gemini API key. Saved to secure OS keychain.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="gemini-oauth">
                            <span class="onboarding-choice-icon">${createIcon('panelRightOpen', { size: 16 })}</span>
                            <span class="onboarding-choice-title">Google Login (QR)</span>
                            <span class="onboarding-choice-desc">Authenticate via device code grant. Scan QR code with your phone.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="ollama">
                            <span class="onboarding-choice-icon">${createIcon('server', { size: 16 })}</span>
                            <span class="onboarding-choice-title">Ollama (Offline)</span>
                            <span class="onboarding-choice-desc">Local Ollama server on Steam Deck. Completely offline operation.</span>
                        </div>
                    </div>

                    <!-- Manual Gemini Key Container -->
                    <div id="container-gemini-key" class="provider-setup-container">
                        <div class="onboarding-input-wrapper">
                            <label for="ob-gemini-key">GEMINI API KEY</label>
                            <input type="password" id="ob-gemini-key" class="onboarding-input" placeholder="AIzaSy..." autocomplete="off">
                        </div>
                    </div>
                    
                    <!-- Gemini OAuth Container -->
                    <div id="container-gemini-oauth" class="provider-setup-container" style="display: none; text-align: center;">
                        <p style="font-size: 0.8rem; margin-bottom: 10px;">Scan the QR code or visit the link to log in:</p>
                        <div id="ob-oauth-qr-wrapper" style="background: white; padding: 10px; display: inline-block; border-radius: 6px; margin-bottom: 10px;">
                            <canvas id="ob-oauth-qr"></canvas>
                        </div>
                        <p id="ob-oauth-link-text" style="font-size: 0.75rem; margin: 5px 0;">Visit: <a href="#" id="ob-oauth-url" target="_blank" style="color: var(--accent-color);">Requesting...</a></p>
                        <div style="font-size: 0.8rem; font-weight: bold; background: rgba(0,240,255,0.1); padding: 8px; display: inline-block; border-radius: 4px;" id="ob-oauth-code-box">CODE: ----</div>
                    </div>
                    
                    <!-- Ollama Container -->
                    <div id="container-ollama" class="provider-setup-container" style="display: none;">
                        <div id="ob-ollama-install-banner" style="display:none;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.4);border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:0.75rem;">
                            <strong style="color:#ffaa00">Ollama not detected</strong><br>
                            <span style="opacity:0.85">Ollama must be installed and running before NEURODECK can use it locally.</span><br>
                            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                                <button class="onboarding-btn primary" id="ob-btn-install-ollama" style="font-size:0.72rem;padding:5px 12px;">Download Ollama Installer</button>
                                <button class="onboarding-btn secondary" id="ob-btn-recheck-ollama" style="font-size:0.72rem;padding:5px 12px;">Re-check</button>
                            </div>
                        </div>
                        <div class="onboarding-input-wrapper">
                            <label for="ob-ollama-url">OLLAMA BASE URL</label>
                            <input type="text" id="ob-ollama-url" class="onboarding-input" value="http://localhost:11434">
                        </div>
                        <div class="onboarding-input-wrapper">
                            <label for="ob-ollama-model">OLLAMA MODEL NAME</label>
                            <input type="text" id="ob-ollama-model" class="onboarding-input" value="llama3.2:1b" placeholder="e.g. llama3.2:1b, mistral, codegemma">
                        </div>
                        <div style="display:flex;gap:8px;margin-top:4px;align-items:center;flex-wrap:wrap;">
                            <button class="onboarding-btn secondary" id="ob-btn-pull-model" style="font-size:0.72rem;padding:5px 12px;">Pull Model Now</button>
                            <span id="ob-pull-status" style="font-size:0.7rem;opacity:0.75;"></span>
                        </div>
                    </div>
                    
                    <div class="onboarding-log-viewport" id="ob-validation-log">
                        <div class="onboarding-log-line">[SYS] Awaiting input credentials...</div>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                        <button class="onboarding-btn secondary" id="ob-btn-skip-setup" style="opacity:0.7;font-size:0.72rem;">Skip — Configure Later</button>
                        <button class="onboarding-btn primary" id="ob-btn-verify">Verify & Save</button>
                    </div>
                </div>

                <!-- Slide 4: Persona & Theme Selection -->
                <div class="onboarding-slide" id="slide-4">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 5px;">PERSONA & THEME SELECT</h3>
                    <p style="font-size: 0.75rem; opacity: 0.8; margin-top: 0; margin-bottom: 12px;">Choose your default AI guide and look. Applies live in the background.</p>

                    <label style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 4px; display: block;">SELECT PERSONA</label>
                    <div class="onboarding-carousel" id="ob-persona-carousel">
                        <!-- Loaded dynamically -->
                    </div>

                    <label style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 6px; display: block;">SELECT THEME</label>
                    <div class="onboarding-theme-grid" id="ob-theme-grid">
                        <!-- Loaded dynamically -->
                    </div>
                </div>

                <!-- Slide 5: Controller / Gamepad Guide -->
                <div class="onboarding-slide" id="slide-5">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 8px;">CONTROLLER & GAMEPAD GUIDE</h3>
                    <p style="font-size: 0.75rem; opacity: 0.8; margin-top: 0; margin-bottom: 12px;">Full Steam Deck & gamepad support is built-in. No configuration needed.</p>

                    <div class="ob-controller-grid">
                        <div class="ob-ctrl-section">
                            <div class="ob-ctrl-header">NAVIGATION</div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">D-Pad</span><span class="ob-ctrl-desc">Navigate lists, chat history, menus</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">L-Stick</span><span class="ob-ctrl-desc">Scroll chat / terminal output</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">L1 / R1</span><span class="ob-ctrl-desc">Previous / Next tab</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">L2 / R2</span><span class="ob-ctrl-desc">Open radial menu / Confirm action</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">SELECT</span><span class="ob-ctrl-desc">Toggle sidebar open/closed</span></div>
                        </div>
                        <div class="ob-ctrl-section">
                            <div class="ob-ctrl-header">ACTIONS</div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-a">A</span><span class="ob-ctrl-desc">Confirm / Select / Send message</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-b">B</span><span class="ob-ctrl-desc">Cancel / Back / Close overlay</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-x">X</span><span class="ob-ctrl-desc">Open prompt picker (ctrl prompt)</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge ob-ctrl-y">Y</span><span class="ob-ctrl-desc">Toggle virtual keyboard</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-badge">START</span><span class="ob-ctrl-desc">New chat session</span></div>
                        </div>
                        <div class="ob-ctrl-section">
                            <div class="ob-ctrl-header">RADIAL MENU <span style="opacity:0.5;font-size:0.65rem;">(L2 or backtick)</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-desc" style="color: var(--accent-color);">12 quick-access views: Chat, Canvas, Terminal, SSH, Tunnel, Share, Browser, Agent, Memory, Prompt Lab, Remote, Docs</span></div>
                            <div class="ob-ctrl-header" style="margin-top: 8px;">PROMPT PICKER <span style="opacity:0.5;font-size:0.65rem;">(X button)</span></div>
                            <div class="ob-ctrl-row"><span class="ob-ctrl-desc" style="color: var(--accent-color);">Browse &amp; send AI prompts without typing. D-Pad to navigate, A to send, L1/R1 to switch categories.</span></div>
                        </div>
                    </div>

                    <div style="margin-top: 10px; padding: 8px; background: rgba(0,240,255,0.05); border: 1px solid rgba(0,240,255,0.15); border-radius: 6px; font-size: 0.72rem; color: rgba(255,255,255,0.7);">
                        <strong style="color: var(--accent-color);">STEAM INPUT:</strong> For best gamepad experience activate the NEURODECK Steam Input profile via Steam → Controller Settings. This enables haptic feedback and precise trigger zones.
                    </div>
                </div>

                <!-- Slide 6: System Integration Diagnostics (6-check) -->
                <div class="onboarding-slide" id="slide-6">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 10px;">FINAL SYSTEM CHECK</h3>

                    <div class="onboarding-diagnostic-list">
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">${createIcon('squareTerminal', { size: 16 })}</span>
                                <span>PTY Shell Spawning Subsystem</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-pty">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">${createIcon('globe', { size: 16 })}</span>
                                <span>External LLM Network Endpoint Reachability</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-net">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">${createIcon('shieldCheck', { size: 16 })}</span>
                                <span>OS Keychain Secure Storage Access</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-key">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">${createIcon('mic', { size: 16 })}</span>
                                <span>Audio Capture (arecord / Voice STT)</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-audio">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">${createIcon('server', { size: 16 })}</span>
                                <span>SSH Binary (OpenSSH Client)</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-ssh">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">${createIcon('volume2', { size: 16 })}</span>
                                <span>TTS Engine (espeak / Voice Output)</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-tts">PENDING</span>
                        </div>
                    </div>

                    <div class="onboarding-log-viewport" id="ob-diagnostic-log" style="height: 100px; max-height: 100px; margin-top: 8px;">
                        <div class="onboarding-log-line">[SYS] Initializing diagnostic scans...</div>
                    </div>
                </div>
            </div>
            
            <footer class="onboarding-footer">
                <button class="onboarding-btn secondary" id="ob-btn-prev" disabled>Back</button>
                <button class="onboarding-btn" id="ob-btn-next">Next</button>
            </footer>
        </div>
    `;
    
    document.getElementById("app").appendChild(overlay);
    
    // 3. Wizard State & Logic
    let currentStep = 1;
    let selectedProvider = "gemini-key"; // Default
    let selectedPersona = "Default";
    let selectedThemeName = "BLACKSITE";
    let isProviderVerified = false;
    let isDiagnosticsPassed = false;
    let oauthPollAbortController = null;

    // Welcome screen typing animation
    const welcomeText = "NEURODECK is a fullscreen AI OS for Steam Deck. LLM chat, autonomous agent, live canvas, real shell, SSH client, browser, Prompt Lab, vector memory, and a Lua plugin marketplace — all in one 1280×800 window.";
    const typingEl = document.getElementById("onboarding-welcome-typing");
    let charIdx = 0;
    function typeChar() {
        if (charIdx < welcomeText.length) {
            typingEl.textContent += welcomeText.charAt(charIdx);
            charIdx++;
            setTimeout(typeChar, 22);
        }
    }
    typeChar();

    // Animated stat counters on slide 1
    function animateCounter(el, target, duration) {
        let start = 0;
        const step = Math.ceil(target / (duration / 40));
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            el.textContent = start;
            if (start >= target) clearInterval(timer);
        }, 40);
    }
    setTimeout(() => {
        animateCounter(document.getElementById("ob-stat-features"), 56, 900);
        animateCounter(document.getElementById("ob-stat-views"), 12, 600);
    }, 300);

    // DOM selectors
    const btnPrev = document.getElementById("ob-btn-prev");
    const btnNext = document.getElementById("ob-btn-next");
    const choiceCards = document.querySelectorAll(".onboarding-choice-card");
    const btnVerify = document.getElementById("ob-btn-verify");
    const btnSkipSetup = document.getElementById("ob-btn-skip-setup");
    const logViewport = document.getElementById("ob-validation-log");
    
    // Step navigation handler
    function updateStepUI() {
        // Toggle slide active classes
        document.querySelectorAll(".onboarding-slide").forEach((slide, idx) => {
            slide.classList.toggle("active", idx + 1 === currentStep);
        });
        
        // Toggle step dot active/completed classes
        document.querySelectorAll(".onboarding-step-dot").forEach((dot, idx) => {
            const stepNum = idx + 1;
            dot.classList.toggle("active", stepNum === currentStep);
            dot.classList.toggle("completed", stepNum < currentStep);
        });
        
        // Update footer buttons
        btnPrev.disabled = currentStep === 1;

        if (currentStep === 6) {
            btnNext.innerText = "Launch NEURODECK";
            btnNext.classList.add("primary");
            btnNext.disabled = !isDiagnosticsPassed;
            // Auto-trigger diagnostics on step 6
            runDiagnostics();
        } else {
            btnNext.innerText = "Next";
            btnNext.classList.remove("primary");
            // Provider step (3): Ollama & skip don't require live verification to advance
            const needsVerify = currentStep === 3 && !isProviderVerified && selectedProvider !== "ollama";
            btnNext.disabled = needsVerify;
        }
    }

    btnPrev.onclick = () => {
        // Cancel any pending OAuth polling if backing out
        if (oauthPollAbortController) {
            oauthPollAbortController.abort();
            oauthPollAbortController = null;
        }
        if (currentStep > 1) {
            currentStep--;
            updateStepUI();
        }
    };

    btnNext.onclick = () => {
        if (currentStep === 6) {
            // Finish onboarding!
            localStorage.setItem("neurodeck_onboarding_complete", "true");
            overlay.classList.add("hidden");
            setTimeout(() => {
                overlay.remove();
                const termInput = document.getElementById("user-input");
                if (termInput) termInput.focus();
            }, 500);
            addNotification("System Initialized", "Welcome to NEURODECK OS.", "success");
        } else {
            currentStep++;
            updateStepUI();
        }
    };
    
    // Skip-setup button — bypass step 3 (provider auth) entirely
    btnSkipSetup.onclick = () => {
        logViewport.innerHTML = `<div class="onboarding-log-line" style="color:var(--warning-color)">[SYS] Provider setup skipped. Configure via Settings → LLM Config later.</div>`;
        isProviderVerified = true;
        btnNext.disabled = false;
        btnNext.click();
    };

    // Provider card selections
    choiceCards.forEach(card => {
        card.onclick = () => {
            choiceCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            selectedProvider = card.dataset.provider;

            // Toggle provider config DOM displays
            document.getElementById("container-gemini-key").style.display = selectedProvider === "gemini-key" ? "block" : "none";
            document.getElementById("container-gemini-oauth").style.display = selectedProvider === "gemini-oauth" ? "block" : "none";
            document.getElementById("container-ollama").style.display = selectedProvider === "ollama" ? "block" : "none";

            // Ollama doesn't need live verification — unlock Next immediately
            if (selectedProvider === "ollama") {
                isProviderVerified = false; // will be unlocked by verify or via save-anyway path
                btnNext.disabled = false; // allow skip directly for Ollama
            } else {
                isProviderVerified = false;
                btnNext.disabled = true;
            }

            // Reset verification log
            logViewport.innerHTML = `<div class="onboarding-log-line">[SYS] Awaiting input credentials for ${selectedProvider.toUpperCase()}...</div>`;

            // Auto-detect Ollama when that card is selected
            if (selectedProvider === "ollama") checkOllamaInstalled();
        };
    });

    async function checkOllamaInstalled() {
        const banner = document.getElementById("ob-ollama-install-banner");
        if (!banner) return;
        banner.style.display = "none";
        try {
            await invoke("test_llm_connection", {
                provider: "ollama",
                model: document.getElementById("ob-ollama-model").value.trim() || "llama3.2:1b",
                url: document.getElementById("ob-ollama-url").value.trim() || "http://localhost:11434",
                key: null
            });
            // Reachable — hide banner
        } catch (_) {
            banner.style.display = "block";
        }
    }

    // Ollama install + recheck buttons
    const btnInstallOllama = document.getElementById("ob-btn-install-ollama");
    const btnRecheckOllama = document.getElementById("ob-btn-recheck-ollama");
    if (btnInstallOllama) {
        btnInstallOllama.onclick = () => {
            try { invoke("open_external", { url: "https://ollama.com/download" }); } catch (_) {}
            appendLog(logViewport, "Opening Ollama download page... Install it, run 'ollama serve', then click Re-check.");
        };
    }
    if (btnRecheckOllama) {
        btnRecheckOllama.onclick = () => checkOllamaInstalled();
    }

    // Pull model button — streams progress via ollama_pull_progress event
    const btnPullModel = document.getElementById("ob-btn-pull-model");
    const pullStatus = document.getElementById("ob-pull-status");
    if (btnPullModel) {
        btnPullModel.onclick = async () => {
            const url = document.getElementById("ob-ollama-url").value.trim() || "http://localhost:11434";
            const model = document.getElementById("ob-ollama-model").value.trim() || "llama3.2:1b";
            btnPullModel.disabled = true;
            if (pullStatus) pullStatus.textContent = "Starting pull...";
            appendLog(logViewport, `Pulling model '${model}' from Ollama registry. This may take a while...`);
            try {
                // Listen for streaming progress
                const unlisten = await window.__TAURI_INTERNALS__?.event?.listen?.("ollama_pull_progress", (ev) => {
                    const p = ev.payload;
                    if (pullStatus) {
                        const pct = p.total ? Math.round((p.completed || 0) / p.total * 100) : 0;
                        pullStatus.textContent = p.status === "success" ? "Done!" : `${p.status}${p.total ? ` ${pct}%` : ''}`;
                    }
                    if (p.status === "success") {
                        appendLog(logViewport, `Model '${model}' pulled successfully. Ready to use.`);
                        btnPullModel.disabled = false;
                        checkOllamaInstalled();
                        if (unlisten) unlisten();
                    }
                });
                await invoke("ollama_pull_model", { baseUrl: url, model });
            } catch (err) {
                appendLog(logViewport, `Pull failed: ${err}. Ensure Ollama is running ('ollama serve').`, true);
                btnPullModel.disabled = false;
                if (pullStatus) pullStatus.textContent = "Failed";
            }
        };
    }

    // Logging helpers
    function appendLog(viewport, text, isError = false) {
        const line = document.createElement("div");
        line.className = "onboarding-log-line";
        line.style.color = isError ? "var(--error-color)" : "var(--response-color)";
        line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
        viewport.appendChild(line);
        viewport.scrollTop = viewport.scrollHeight;
    }

    // Verify & Save Button logic (Step 2)
    btnVerify.onclick = async () => {
        isProviderVerified = false;
        btnNext.disabled = true;
        
        if (selectedProvider === "gemini-key") {
            const keyInput = document.getElementById("ob-gemini-key").value.trim();
            if (!keyInput) {
                appendLog(logViewport, "Error: Please enter a Gemini API Key.", true);
                return;
            }
            
            appendLog(logViewport, "Initiating live validation request...");
            
            try {
                // Ping connection to LLM using standard test
                const status = await invoke("test_llm_connection", {
                    provider: "gemini",
                    model: "gemini-1.5-flash",
                    url: "",
                    key: keyInput
                });
                
                appendLog(logViewport, status);
                appendLog(logViewport, "Saving Gemini API Key to secure OS Keychain...");
                
                // Save it to backend
                await invoke("save_gemini_api_key", { key: keyInput });
                
                // Save default provider config to Gemini
                await invoke("set_config", { key: "llm.default_provider", value: "gemini" });
                
                appendLog(logViewport, "Success! Configuration finalized.");
                isProviderVerified = true;
                btnNext.disabled = false;
            } catch (err) {
                appendLog(logViewport, `Failed to verify key: ${err}`, true);
            }
        } 
        else if (selectedProvider === "gemini-oauth") {
            appendLog(logViewport, "Initializing OAuth 2.0 Device Authorization flow...");
            
            try {
                const data = await invoke('start_oauth_flow');
                
                // Show QR code elements and URLs
                document.getElementById("ob-oauth-url").href = data.verification_uri;
                document.getElementById("ob-oauth-url").innerText = data.verification_uri;
                document.getElementById("ob-oauth-code-box").innerText = `CODE: ${data.user_code}`;
                
                // Generate QR Code
                await QRCode.toCanvas(document.getElementById("ob-oauth-qr"), data.verification_uri_complete || data.verification_uri, {
                    width: 140,
                    margin: 1
                });
                
                appendLog(logViewport, "OAuth device flow active. Awaiting user authorization...");
                
                // Setup abort controller for polling in case they click Back
                oauthPollAbortController = new AbortController();
                
                // Run polling in background
                invoke('poll_oauth_token', { 
                    deviceCode: data.device_code, 
                    interval: data.interval 
                }).then(async () => {
                    appendLog(logViewport, "OAuth code approved! Retrieving access token...");
                    
                    // Since it has saved the token in the backend via OS Keychain
                    appendLog(logViewport, "Retrieved token successfully validated and saved to OS Keychain!");
                    
                    // Save default provider config to Gemini
                    await invoke("set_config", { key: "llm.default_provider", value: "gemini" });
                    
                    isProviderVerified = true;
                    btnNext.disabled = false;
                }).catch(err => {
                    if (oauthPollAbortController) {
                        appendLog(logViewport, `OAuth failed or canceled: ${err}`, true);
                    }
                });
            } catch (err) {
                appendLog(logViewport, `Failed to initialize OAuth: ${err}`, true);
            }
        } 
        else if (selectedProvider === "ollama") {
            const urlInput = document.getElementById("ob-ollama-url").value.trim();
            const modelInput = document.getElementById("ob-ollama-model").value.trim();
            
            if (!urlInput || !modelInput) {
                appendLog(logViewport, "Error: Both url and model name are required.", true);
                return;
            }
            
            appendLog(logViewport, `Pinging local Ollama service at ${urlInput} with model ${modelInput}...`);

            // Always save config — Ollama may not be running yet (that's OK)
            try {
                await invoke("set_config", { key: "llm.default_provider", value: "ollama" });
                await invoke("set_config", { key: "llm.ollama_base_url", value: urlInput });
                await invoke("set_config", { key: "llm.ollama_model", value: modelInput });
                appendLog(logViewport, "Ollama configuration saved.");
            } catch (saveErr) {
                appendLog(logViewport, `Config save error: ${saveErr}`, true);
            }

            // Soft connectivity test — warn but don't block
            try {
                const status = await invoke("test_llm_connection", {
                    provider: "ollama",
                    model: modelInput,
                    url: urlInput,
                    key: null
                });
                appendLog(logViewport, `Connection test: ${status}`);
            } catch (_) {
                appendLog(logViewport, "WARNING: Ollama not reachable right now. Start it before chatting.", false);
                appendLog(logViewport, "Config saved. You can start Ollama after launch.", false);
            }

            isProviderVerified = true;
            btnNext.disabled = false;
        }
    };

    // Load Personas & Themes (Step 3) — real data from backend
    const personaCarousel = document.getElementById("ob-persona-carousel");
    const themeGrid = document.getElementById("ob-theme-grid");

    const personaIconMap = {
        "Default": "bot", "Developer": "squareTerminal", "Cyberpunk": "zap",
        "John": "fileText", "Sally": "sparkles", "Winston": "panelRightOpen",
        "Amelia": "server", "Paige": "fileText", "Mary": "chartColumn",
        "Sarcastic Hacker": "messageSquare", "Elden Ring Scholar": "shieldCheck"
    };
    const personaDescMap = {
        "Default": "Helpful, balanced assistant.",
        "Developer": "Clean code, engineering precision.",
        "Cyberpunk": "Terminal lingo, edgy AI construct.",
        "John": "Product Manager — PRDs & user stories.",
        "Sally": "UX Designer — elegant interfaces.",
        "Winston": "System Architect — modular design.",
        "Amelia": "Senior Dev — Rust & JS expert.",
        "Paige": "Technical Writer — docs & wikis.",
        "Mary": "Business Analyst — epics & acceptance criteria.",
        "Sarcastic Hacker": "Witty, irreverent hacker archetype.",
        "Elden Ring Scholar": "Lore-keeper of the Lands Between."
    };

    // Load personas from backend
    let allPersonas = ["Default"];
    try { allPersonas = await invoke("get_personas"); } catch (_) {}
    personaCarousel.innerHTML = allPersonas.map(name => `
        <div class="onboarding-persona-card ${name === selectedPersona ? 'active' : ''}" data-name="${name}">
            <span class="onboarding-persona-icon">${createIcon(personaIconMap[name] || "bot", { size: 18 })}</span>
            <span class="onboarding-persona-name">${name}</span>
            <span class="onboarding-persona-desc">${personaDescMap[name] || 'Custom persona.'}</span>
        </div>
    `).join('');

    personaCarousel.querySelectorAll(".onboarding-persona-card").forEach(card => {
        card.onclick = async () => {
            personaCarousel.querySelectorAll(".onboarding-persona-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            selectedPersona = card.dataset.name;
            try { await invoke("set_persona", { name: selectedPersona }); } catch (e) { console.error("Failed to set persona", e); }
        };
    });

    // Load themes from backend — fetch colors for swatches
    let allThemeNames = ["BLACKSITE"];
    try { allThemeNames = await invoke("get_themes"); } catch (_) {}

    // Build theme color map by invoking set_theme for each (non-destructive read)
    const themeColorCache = {};
    for (const tname of allThemeNames) {
        try {
            const colors = await invoke("set_theme", { name: tname });
            if (colors) themeColorCache[tname] = colors;
        } catch (_) {}
    }
    // Restore the user's previously selected theme after the loop
    const currentTheme = localStorage.getItem("selectedTheme") || "BLACKSITE";
    if (themeColorCache[currentTheme]) {
        const tc = themeColorCache[currentTheme];
        document.documentElement.style.setProperty('--bg-color', tc.Background);
        document.documentElement.style.setProperty('--accent-color', tc.Accent);
        document.documentElement.style.setProperty('--response-color', tc.Response);
    }

    themeGrid.innerHTML = allThemeNames.map(tname => {
        const tc = themeColorCache[tname] || {};
        const accent = tc.Accent || '#00f0ff';
        const bg = tc.Background || '#050505';
        const fg = tc.Foreground || '#d9f7ff';
        return `
        <div class="onboarding-theme-card ${tname === selectedThemeName ? 'active' : ''}" data-name="${tname}">
            <div style="font-weight:bold;margin-bottom:4px;font-size:0.7rem;">${tname}</div>
            <div class="onboarding-theme-swatch">
                <span style="background:${accent}"></span>
                <span style="background:${bg}"></span>
                <span style="background:${fg}"></span>
            </div>
        </div>`;
    }).join('');

    themeGrid.querySelectorAll(".onboarding-theme-card").forEach(card => {
        card.onclick = async () => {
            themeGrid.querySelectorAll(".onboarding-theme-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            selectedThemeName = card.dataset.name;
            localStorage.setItem("selectedTheme", selectedThemeName);
            try {
                const theme = await invoke("set_theme", { name: selectedThemeName });
                if (theme) {
                    applyThemeColors(theme);
                }
            } catch (e) { console.error("Failed to apply theme live", e); }
        };
    });

    // Diagnostics Handler (Step 5) — 6 checks
    let diagRunning = false;
    async function runDiagnostics() {
        if (diagRunning) return;
        diagRunning = true;
        isDiagnosticsPassed = false;
        btnNext.disabled = true;

        const diagLog = document.getElementById("ob-diagnostic-log");
        diagLog.innerHTML = `<div class="onboarding-log-line">[SYS] Initiating diagnostics sequence...</div>`;

        const checks = [
            { id: "diag-pty",   label: "PTY" },
            { id: "diag-net",   label: "Network" },
            { id: "diag-key",   label: "Keychain" },
            { id: "diag-audio", label: "Audio" },
            { id: "diag-ssh",   label: "SSH" },
            { id: "diag-tts",   label: "TTS" },
        ];
        checks.forEach(c => {
            const el = document.getElementById(c.id);
            el.className = "onboarding-diagnostic-status pending";
            el.innerText = "RUNNING";
        });

        await new Promise(r => setTimeout(r, 700));

        try {
            const result = await invoke("run_onboarding_diagnostics");

            // Helper: update a check row
            function applyCheck(id, ok, detail) {
                const el = document.getElementById(id);
                el.className = "onboarding-diagnostic-status " + (ok ? "success" : "error");
                el.innerText = ok ? "OK" : "WARN";
                appendLog(diagLog, `${ok ? "✓" : "!"} ${detail}`);
            }

            applyCheck("diag-pty",   result.pty_ok,      result.pty_details     || "PTY allocation test");
            await new Promise(r => setTimeout(r, 350));

            applyCheck("diag-net",   result.network_ok,  result.network_details  || "Network reachability");
            await new Promise(r => setTimeout(r, 350));

            applyCheck("diag-key",   result.keychain_ok, result.keychain_details || "OS keychain access");
            await new Promise(r => setTimeout(r, 350));

            // Audio check — look for arecord in PATH via a shell check
            const audioOk = result.audio_ok !== undefined ? result.audio_ok : true;
            const audioDetail = result.audio_details || (audioOk ? "arecord available" : "arecord not found — Voice STT unavailable");
            applyCheck("diag-audio", audioOk, audioDetail);
            await new Promise(r => setTimeout(r, 350));

            // SSH binary check
            const sshOk = result.ssh_ok !== undefined ? result.ssh_ok : true;
            const sshDetail = result.ssh_details || (sshOk ? "ssh binary found" : "ssh not found — install OpenSSH client");
            applyCheck("diag-ssh", sshOk, sshDetail);
            await new Promise(r => setTimeout(r, 350));

            // TTS check — espeak
            const ttsOk = result.tts_ok !== undefined ? result.tts_ok : true;
            const ttsDetail = result.tts_details || (ttsOk ? "espeak available" : "espeak not found — Voice TTS unavailable");
            applyCheck("diag-tts", ttsOk, ttsDetail);

            await new Promise(r => setTimeout(r, 400));

            // Pass if core systems (PTY + Keychain) are OK — network and audio are soft
            if (result.pty_ok && result.keychain_ok) {
                isDiagnosticsPassed = true;
                btnNext.disabled = false;
                const warn = (!result.network_ok || !audioOk || !sshOk || !ttsOk);
                appendLog(diagLog, warn
                    ? "CORE SYSTEMS OK. Some optional features have warnings — see above."
                    : "ALL SYSTEMS NOMINAL. READY TO LAUNCH.");
            } else {
                appendLog(diagLog, "CRITICAL CHECK FAILED. Review errors above.", true);
            }
        } catch (e) {
            appendLog(diagLog, `Diagnostics engine error: ${e}`, true);
            // Don't hard-block on crash — allow user to proceed
            isDiagnosticsPassed = true;
            btnNext.disabled = false;
        } finally {
            diagRunning = false;
        }
    }
}

// ==========================================================================
// SPRINT A — TOUCH SCROLL & TAP POLISH
// ==========================================================================
(function initTouchScroll() {
    // Selectors for every overflow-y:auto container in the app
    const SCROLL_SELECTORS = [
        "#chat-viewport",
        "#sidebar-history",
        "#agent-log",
        "#memory-list",
        "#ftp-file-list",
        "#sftp-file-list",
        "#transfer-log",
        ".onboarding-log-viewport",
        ".ob-diagnostic-log",
        ".onboarding-carousel",
        ".settings-content",
        ".memory-doc-list",
        ".prompt-lab-output",
    ];

    function attachTouchScroll(el) {
        if (!el || el._touchScrollAttached) return;
        el._touchScrollAttached = true;
        let startY = 0;
        let startScrollTop = 0;
        let velocityY = 0;
        let lastY = 0;
        let lastT = 0;
        let momentumId = null;

        el.addEventListener("touchstart", (e) => {
            if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
            startY = e.touches[0].clientY;
            startScrollTop = el.scrollTop;
            lastY = startY;
            lastT = Date.now();
            velocityY = 0;
        }, { passive: true });

        el.addEventListener("touchmove", (e) => {
            const dy = startY - e.touches[0].clientY;
            el.scrollTop = startScrollTop + dy;
            const now = Date.now();
            const dt = now - lastT || 1;
            velocityY = (lastY - e.touches[0].clientY) / dt;
            lastY = e.touches[0].clientY;
            lastT = now;
        }, { passive: true });

        el.addEventListener("touchend", () => {
            // Momentum fling
            let v = velocityY * 16; // pixels per frame at ~60fps
            function fling() {
                if (Math.abs(v) < 0.5) return;
                el.scrollTop += v;
                v *= 0.92;
                momentumId = requestAnimationFrame(fling);
            }
            fling();
        }, { passive: true });
    }

    // Attach to all known scroll containers after DOM is ready
    function attach() {
        SCROLL_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(attachTouchScroll);
        });
    }

    // Run on load and again after a short delay (for dynamically created elements)
    document.addEventListener("DOMContentLoaded", attach);
    setTimeout(attach, 2500);

    // Expose so dynamically created containers can opt-in
    window._attachTouchScroll = attachTouchScroll;
})();

// Double-tap on radial backdrop closes the menu
(function initRadialTouchDismiss() {
    let lastTap = 0;
    document.addEventListener("touchend", (e) => {
        if (!state.radialMenuVisible) return;
        const t = Date.now();
        if (e.target.closest(".radial-item")) {
            // Single tap on a segment = activate it
            const seg = e.target.closest(".radial-item");
            if (seg) {
                const idx = parseInt(seg.dataset.segment, 10);
                activateRadialSegment(idx);
                hideRadialMenu();
            }
            return;
        }
        if (t - lastTap < 300) {
            hideRadialMenu();
        }
        lastTap = t;
    }, { passive: true });
})();

// ==========================================================================
// SPRINT B — VIRTUAL KEYBOARD OVERLAY
// ==========================================================================
(function initVirtualKeyboard() {
    // Track whether last input event was a touch (vs physical key)
    let lastInputWasTouch = false;
    document.addEventListener("touchstart", () => { lastInputWasTouch = true; }, { passive: true });
    document.addEventListener("keydown",    () => { lastInputWasTouch = false; });

    // Modifier state
    let vkShift = false;
    let vkCtrl  = false;
    let vkAlt   = false;
    let vkCapsLock = false;

    // Current target input element
    let vkTarget = null;

    // Key layout definition
    // Each row is an array of [displayNormal, displayShifted, keyCode, keyValue]
    // Special keys: type "special", value = action name
    const ROWS = [
        // Number row
        [
            ["1","!","Digit1","1"], ["2","@","Digit2","2"], ["3","#","Digit3","3"],
            ["4","$","Digit4","4"], ["5","%","Digit5","5"], ["6","^","Digit6","6"],
            ["7","&","Digit7","7"], ["8","*","Digit8","8"], ["9","(","Digit9","9"],
            ["0",")","Digit0","0"], ["-","_","Minus","-"], ["=","+","Equal","="],
            { type:"special", label:"⌫", action:"Backspace", cls:"vk-wide" },
        ],
        // QWERTY row
        [
            { type:"special", label:"Tab", action:"Tab", cls:"vk-wide" },
            ["q","Q","KeyQ","q"], ["w","W","KeyW","w"], ["e","E","KeyE","e"],
            ["r","R","KeyR","r"], ["t","T","KeyT","t"], ["y","Y","KeyY","y"],
            ["u","U","KeyU","u"], ["i","I","KeyI","i"], ["o","O","KeyO","o"],
            ["p","P","KeyP","p"], ["[","{","BracketLeft","["], ["]","}","BracketRight","]"],
            ["\\","|","Backslash","\\"],
        ],
        // ASDF row
        [
            { type:"special", label:"Caps", action:"CapsLock", cls:"vk-wide vk-mod", id:"vk-caps" },
            ["a","A","KeyA","a"], ["s","S","KeyS","s"], ["d","D","KeyD","d"],
            ["f","F","KeyF","f"], ["g","G","KeyG","g"], ["h","H","KeyH","h"],
            ["j","J","KeyJ","j"], ["k","K","KeyK","k"], ["l","L","KeyL","l"],
            [";",":","Semicolon",";"], ["'","\"","Quote","'"],
            { type:"special", label:"↵", action:"Enter", cls:"vk-xwide" },
        ],
        // ZXCV row
        [
            { type:"special", label:"⇧", action:"Shift", cls:"vk-xwide vk-mod", id:"vk-shift" },
            ["z","Z","KeyZ","z"], ["x","X","KeyX","x"], ["c","C","KeyC","c"],
            ["v","V","KeyV","v"], ["b","B","KeyB","b"], ["n","N","KeyN","n"],
            ["m","M","KeyM","m"], [",","<","Comma",","], [".",">" ,"Period","."],
            ["/","?","Slash","/"],
            { type:"special", label:"⇧", action:"Shift", cls:"vk-xwide vk-mod" },
        ],
        // Bottom strip
        [
            { type:"special", label:"Ctrl",  action:"Ctrl",  cls:"vk-wide vk-mod", id:"vk-ctrl" },
            { type:"special", label:"Alt",   action:"Alt",   cls:"vk-wide vk-mod", id:"vk-alt"  },
            { type:"special", label:"Space", action:"Space", cls:"vk-space" },
            { type:"special", label:"←",    action:"ArrowLeft",  cls:"vk-wide" },
            { type:"special", label:"→",    action:"ArrowRight", cls:"vk-wide" },
            { type:"special", label:"↑",    action:"ArrowUp",    cls:"" },
            { type:"special", label:"↓",    action:"ArrowDown",  cls:"" },
            { type:"special", label:"Esc",   action:"Escape", cls:"vk-wide" },
        ],
    ];

    function buildKeyboard() {
        // Build overlay HTML
        const overlay = document.createElement("div");
        overlay.id = "vk-overlay";
        overlay.setAttribute("role", "toolbar");
        overlay.setAttribute("aria-label", "Virtual Keyboard");

        // Dismiss bar
        const dismissBar = document.createElement("div");
        dismissBar.className = "vk-dismiss-bar";
        const dismissBtn = document.createElement("button");
        dismissBtn.className = "vk-dismiss-btn";
        dismissBtn.textContent = "⌄ Hide Keyboard";
        dismissBtn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            hideVirtualKeyboard();
        });
        dismissBar.appendChild(dismissBtn);
        overlay.appendChild(dismissBar);

        ROWS.forEach(row => {
            const rowEl = document.createElement("div");
            rowEl.className = "vk-row";

            row.forEach(key => {
                const btn = document.createElement("button");
                btn.className = "vk-key";

                if (key.type === "special") {
                    btn.classList.add(...(key.cls || "").split(" ").filter(Boolean));
                    btn.textContent = key.label;
                    if (key.id) btn.id = key.id;
                    btn.dataset.action = key.action;
                } else {
                    btn.dataset.normal = key[0];
                    btn.dataset.shifted = key[1];
                    btn.dataset.code   = key[2];
                    btn.dataset.value  = key[3];
                    btn.textContent = key[0];
                }

                // Use pointerdown so response is instant, prevent focus steal
                btn.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    btn.classList.add("vk-pressed");
                    handleKeyPress(btn);
                });
                btn.addEventListener("pointerup",   () => btn.classList.remove("vk-pressed"));
                btn.addEventListener("pointerleave", () => btn.classList.remove("vk-pressed"));

                rowEl.appendChild(btn);
            });

            overlay.appendChild(rowEl);
        });

        document.body.appendChild(overlay);

        // Attach touch scroll to overlay itself (for very small screens)
        overlay.addEventListener("touchmove", e => e.stopPropagation(), { passive: true });
    }

    function handleKeyPress(btn) {
        const action = btn.dataset.action;

        // Handle modifier toggles
        if (action === "Shift") {
            vkShift = !vkShift;
            updateModifierVisuals();
            return;
        }
        if (action === "CapsLock") {
            vkCapsLock = !vkCapsLock;
            updateModifierVisuals();
            return;
        }
        if (action === "Ctrl") {
            vkCtrl = !vkCtrl;
            updateModifierVisuals();
            return;
        }
        if (action === "Alt") {
            vkAlt = !vkAlt;
            updateModifierVisuals();
            return;
        }

        // Determine target element — fallback to document.activeElement
        const target = vkTarget || document.activeElement;
        if (!target) return;

        if (action) {
            // Special key — dispatch real KeyboardEvent
            dispatchKey(target, action, action);
        } else {
            // Character key
            const shifted = vkShift !== vkCapsLock; // XOR: caps inverts shift
            const char = shifted ? btn.dataset.shifted : btn.dataset.normal;
            const code = btn.dataset.code;

            dispatchKey(target, code, char);

            // Also insert character directly for inputs/textareas
            insertCharAtCursor(target, char);

            // Auto-release shift after one character (sticky shift behaviour)
            if (vkShift) {
                vkShift = false;
                updateModifierVisuals();
            }
        }

        // Keep focus on target
        if (target && target.focus) target.focus();
    }

    function dispatchKey(target, code, key) {
        const opts = {
            key,
            code,
            bubbles: true,
            cancelable: true,
            shiftKey: vkShift,
            ctrlKey: vkCtrl,
            altKey: vkAlt,
        };
        target.dispatchEvent(new KeyboardEvent("keydown", opts));
        target.dispatchEvent(new KeyboardEvent("keypress", opts));
        target.dispatchEvent(new KeyboardEvent("keyup", opts));
    }

    function insertCharAtCursor(el, char) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            const start = el.selectionStart ?? el.value.length;
            const end   = el.selectionEnd   ?? el.value.length;
            if (char === "Backspace") {
                el.value = el.value.slice(0, Math.max(0, start - 1)) + el.value.slice(end);
                el.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
            } else if (char.length === 1) {
                el.value = el.value.slice(0, start) + char + el.value.slice(end);
                el.setSelectionRange(start + 1, start + 1);
            }
            // Trigger input event so React/Vue/Svelte state syncs (and our own handlers)
            el.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (el.isContentEditable) {
            // ContentEditable — let the KeyboardEvent handle it naturally
        }
    }

    function updateModifierVisuals() {
        // Update shifted labels on character keys
        const isShifted = vkShift !== vkCapsLock;
        document.querySelectorAll("#vk-overlay .vk-key[data-normal]").forEach(btn => {
            btn.textContent = isShifted ? btn.dataset.shifted : btn.dataset.normal;
        });
        // Toggle active class on modifier keys
        const shiftBtns  = document.querySelectorAll("#vk-overlay [data-action='Shift']");
        const capsBtns   = document.querySelectorAll("#vk-overlay [data-action='CapsLock']");
        const ctrlBtns   = document.querySelectorAll("#vk-overlay [data-action='Ctrl']");
        const altBtns    = document.querySelectorAll("#vk-overlay [data-action='Alt']");
        shiftBtns.forEach(b => b.classList.toggle("vk-active", vkShift));
        capsBtns.forEach(b  => b.classList.toggle("vk-active", vkCapsLock));
        ctrlBtns.forEach(b  => b.classList.toggle("vk-active", vkCtrl));
        altBtns.forEach(b   => b.classList.toggle("vk-active", vkAlt));
    }

    function showVirtualKeyboard(targetEl) {
        vkTarget = targetEl;
        const overlay = document.getElementById("vk-overlay");
        if (overlay) overlay.classList.add("vk-visible");
    }

    function hideVirtualKeyboard() {
        vkTarget = null;
        const overlay = document.getElementById("vk-overlay");
        if (overlay) overlay.classList.remove("vk-visible");
        // Reset one-shot modifiers
        vkShift = false;
        vkCtrl  = false;
        vkAlt   = false;
        updateModifierVisuals();
    }

    function shouldShowKeyboard() {
        // Only show in touch context — not when physical keyboard is in use
        return lastInputWasTouch;
    }

    // Trigger keyboard on focus for inputs/textareas in touch mode
    function initTriggers() {
        // Use event delegation on document — covers dynamically added inputs
        document.addEventListener("focusin", (e) => {
            const el = e.target;
            const isTextInput = (
                (el.tagName === "INPUT" && !["button","submit","reset","checkbox","radio","file","range"].includes(el.type)) ||
                el.tagName === "TEXTAREA" ||
                el.isContentEditable
            );
            if (isTextInput && shouldShowKeyboard()) {
                showVirtualKeyboard(el);
            }
        });

        document.addEventListener("focusout", (e) => {
            // Only hide if focus moves outside of the virtual keyboard itself
            setTimeout(() => {
                const active = document.activeElement;
                const vkEl = document.getElementById("vk-overlay");
                if (vkEl && vkEl.contains(active)) return; // focus went to a key button
                // Check if new active element is still a text input
                const stillInput = active && (
                    (active.tagName === "INPUT" && !["button","submit","reset","checkbox","radio","file","range"].includes(active.type)) ||
                    active.tagName === "TEXTAREA" ||
                    active.isContentEditable
                );
                if (!stillInput) hideVirtualKeyboard();
            }, 100);
        });
    }

    // Build keyboard DOM and wire triggers after page load
    buildKeyboard();
    initTriggers();

    // Expose for programmatic control (e.g., gamepad B button could toggle)
    window.showVirtualKeyboard = showVirtualKeyboard;
    window.hideVirtualKeyboard = hideVirtualKeyboard;
})();

// ==========================================================================
// CINEMATIC BOOT SEQUENCE
// ==========================================================================
(async function runBootSequence() {
    const overlay = document.getElementById('boot-overlay');
    const logScroll = document.getElementById('boot-log-scroll');
    const progressFill = document.getElementById('boot-progress-fill');
    const progressPct = document.getElementById('boot-progress-pct');
    const progressLabel = document.getElementById('boot-progress-label-text');
    // Guarantee event fires even on early return or unexpected error
    if (!overlay || !logScroll) {
        document.dispatchEvent(new CustomEvent('neurodeck-boot-complete'));
        return;
    }
    try {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const escapeBootHtml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const token = (value, cls = 'boot-val') => `<span class="${cls}">${escapeBootHtml(value)}</span>`;
        const statusToken = (label, tone = 'boot-ok') => `<span class="${tone}">${escapeBootHtml(label)}</span>`;

        let totalSteps = 16;
        let step = 0;
        let addrIndex = 1;

        function nextAddr() {
            return `[0x${(addrIndex++).toString(16).padStart(4, '0')}]`;
        }

        function setProgress(pct, label) {
            const clamped = Math.min(pct, 100);
            if (progressFill) progressFill.style.width = `${clamped}%`;
            if (progressPct) progressPct.textContent = `${Math.round(clamped)}%`;
            if (label && progressLabel) progressLabel.textContent = label.toUpperCase().slice(0, 48);
        }

        function addLine(addr, html, extraClass) {
            const line = document.createElement('div');
            line.className = `boot-log-line${extraClass ? ` ${extraClass}` : ''}`;
            line.innerHTML = `<span class="boot-addr">${addr}</span>  ${html}`;
            logScroll.appendChild(line);
            logScroll.scrollTop = logScroll.scrollHeight;
            step += 1;
            const pct = Math.min((step / Math.max(totalSteps, 1)) * 100, 97);
            setProgress(pct, line.innerText.replace(addr, '').trim());
        }

        addLine(nextAddr(), `Initializing kernel space... KFMS ${token('v1.2.x-ra')} · Codename ${token('Ra')}`);
        await delay(240);

        addLine(nextAddr(), `Loading configuration ${token('llm-term.toml')}`);
        const [cfg, initialState, plugins, personas, themes, mcpStatus, memCount] = await Promise.all([
            invoke('get_config').catch(() => null),
            invoke('get_initial_state').catch(() => null),
            invoke('list_plugins').catch(() => []),
            invoke('get_personas').catch(() => []),
            invoke('get_themes').catch(() => []),
            invoke('get_mcp_status').catch(() => null),
            invoke('get_doc_count').catch(() => 0),
        ]);
        totalSteps = 12 + Math.max(Array.isArray(plugins) ? plugins.length : 0, 1);
        await delay(200);

        const provider = cfg?.llm?.default_provider ?? initialState?.provider ?? 'ollama';
        const model = provider === 'gemini'
            ? (cfg?.llm?.gemini_model ?? initialState?.model ?? 'gemini-1.5-flash')
            : (cfg?.llm?.ollama_model ?? initialState?.model ?? 'llama2');
        addLine(nextAddr(), `Provider ${token(provider.toUpperCase())} · Model ${token(model)} ${statusToken('READY')}`);
        await delay(180);

        const bootHealthStatus = initialState?.boot_health_status ?? 'unknown';
        const bootHealthTone = bootHealthStatus === 'healthy' ? 'boot-ok' : (bootHealthStatus === 'recovered' ? 'boot-warn' : 'boot-err');
        const bootHealthLabel = bootHealthStatus === 'healthy' ? 'HEALTHY' : bootHealthStatus.toUpperCase();
        const bootHealthSummary = initialState?.boot_health_summary ?? 'Startup health unavailable';
        addLine(nextAddr(), `Startup recovery ${statusToken(bootHealthLabel, bootHealthTone)} · ${escapeBootHtml(bootHealthSummary)}`);
        await delay(180);

        addLine(nextAddr(), `Scanning plugin directory ${token('plugins/')}`);
        await delay(140);

        const pluginDescMap = {
            'bmad.lua': 'BMad Framework',
            'ip_lookup.lua': 'IP Lookup Utility',
            'auto_responder.lua': 'Auto-Responder Hooks',
            'promptgen.lua': 'Prompt Lab',
        };
        if (Array.isArray(plugins) && plugins.length > 0) {
            for (const plugin of plugins) {
                const fileName = plugin?.file_name || plugin?.name || String(plugin);
                const description = pluginDescMap[fileName] || plugin?.description || 'Custom Plugin';
                const enabled = plugin?.enabled !== false;
                addLine(
                    nextAddr(),
                    `Plugin ${token(fileName)} ${statusToken(enabled ? 'LOADED' : 'DISABLED', enabled ? 'boot-ok' : 'boot-warn')} <span style="opacity:0.42">// ${escapeBootHtml(description)}</span>`
                );
                await delay(110);
            }
        } else {
            addLine(nextAddr(), `Plugin registry ${statusToken('EMPTY', 'boot-warn')} <span style="opacity:0.42">// no runtime plugins discovered</span>`);
            await delay(150);
        }

        addLine(nextAddr(), `Persona registry ${token(Array.isArray(personas) ? personas.length : 0)} online`);
        await delay(150);

        addLine(nextAddr(), `Theme palette ${token(Array.isArray(themes) ? themes.length : 0)} variants indexed`);
        await delay(150);

        const memoryReady = initialState?.memory_status === 'Stable';
        addLine(
            nextAddr(),
            `Vector memory ${statusToken(memoryReady ? 'ATTACHED' : 'OFFLINE', memoryReady ? 'boot-ok' : 'boot-warn')} · ${token(memCount)} docs indexed`
        );
        await delay(170);

        const mcpRunning = mcpStatus?.running === 'true';
        addLine(
            nextAddr(),
            `MCP loopback ${statusToken(mcpRunning ? 'ONLINE' : 'STANDBY', mcpRunning ? 'boot-ok' : 'boot-warn')} · ${token(mcpRunning ? mcpStatus?.url ?? '127.0.0.1' : `port ${mcpStatus?.port ?? '13337'}`)}`
        );
        await delay(170);

        addLine(nextAddr(), `Running provider handshake against ${token(provider.toUpperCase())}...`);
        await delay(120);

        const llmResult = await invoke('test_llm_connection', {
            provider,
            model,
            url: cfg?.llm?.ollama_base_url ?? 'http://localhost:11434',
            key: null,
        }).then((message) => ({ ok: true, message }))
          .catch((error) => ({ ok: false, message: String(error) }));

        const llmTone = llmResult.ok ? 'boot-ok' : 'boot-warn';
        const llmLabel = llmResult.ok ? 'CONNECTED' : 'DEGRADED';
        addLine(
            nextAddr(),
            `LLM session ${statusToken(llmLabel, llmTone)} · ${token(model)} <span style="opacity:0.52">${escapeBootHtml(llmResult.message)}</span>`
        );
        await delay(200);

        const finalTone = llmResult.ok && memoryReady ? 'boot-ok' : 'boot-warn';
        addLine(
            nextAddr(),
            `<strong class="${finalTone}" style="letter-spacing:0.06em">NEURODECK ONLINE · STARTUP DIAGNOSTICS COMPLETE</strong>`,
            'boot-final'
        );
        setProgress(100, 'NEURODECK ONLINE');
        await delay(1100);

        overlay.classList.add('fade-out');
        await delay(680);
    } catch(err) {
        console.error('[Boot] Sequence error:', err);
    } finally {
        if (overlay && overlay.parentNode) overlay.remove();
        document.dispatchEvent(new CustomEvent('neurodeck-boot-complete'));
    }
})();

// ==========================================================================
// SYSTEM DIAGNOSTICS POLLING LOOP (P6)
// ==========================================================================
(function initDiagnostics() {
    async function pollDiagnostics() {
        // 1. PTY Status
        const ptyDot = document.getElementById("diag-dot-pty");
        const ptyOk = typeof state.terminalSessions !== 'undefined' && state.terminalSessions.length > 0;
        if (ptyDot) {
            ptyDot.className = ptyOk ? "diag-dot online" : "diag-dot offline";
        }

        // 2. LAN Discovery / mDNS Status
        const mdnsDot = document.getElementById("diag-dot-mdns");
        let mdnsOk = false;
        try {
            await invoke("get_discovered_peers");
            mdnsOk = true;
        } catch (e) {
            mdnsOk = false;
        }
        if (mdnsDot) {
            mdnsDot.className = mdnsOk ? "diag-dot online" : "diag-dot offline";
        }

        // 3. LLM Provider Connectivity
        const llmDot = document.getElementById("diag-dot-llm");
        let llmOk = false;
        try {
            const config = await invoke("get_config");
            const provider = config?.llm?.default_provider || 'gemini';
            if (provider === 'gemini') {
                llmOk = navigator.onLine;
            } else if (provider === 'ollama') {
                const url = config?.llm?.ollama_base_url || 'http://localhost:11434';
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 1200);
                const response = await fetch(`${url}/api/tags`, { signal: controller.signal });
                clearTimeout(id);
                llmOk = response.ok;
            }
        } catch (e) {
            llmOk = false;
        }
        if (llmDot) {
            llmDot.className = llmOk ? "diag-dot online" : "diag-dot offline";
        }

        // 4. Collaboration Server Status
        const collabDot = document.getElementById("diag-dot-collab");
        const collabOk = !!(window._mockCollabActive);
        if (collabDot) {
            collabDot.className = collabOk ? "diag-dot online" : "diag-dot offline";
        }
    }

    // Wait for the boot sequence to complete before starting polling
    document.addEventListener('neurodeck-boot-complete', () => {
        pollDiagnostics();
        setInterval(pollDiagnostics, 5000);
    });
})();

// ==========================================================================

// ── Module init calls ────────────────────────────────────────────────────
initCtrlPromptPicker();
initRemoteControl();

// ============================= DOCS VIEW =================================
function initDocsView() {
    const searchInput  = document.getElementById('docs-search-input');
    const searchBtn    = document.getElementById('docs-search-btn');
    const indexBtn     = document.getElementById('docs-index-btn');
    const clearBtn     = document.getElementById('docs-clear-btn');
    const fileList     = document.getElementById('docs-file-list');
    const resultsList  = document.getElementById('docs-results-list');
    const resultsLabel = document.getElementById('docs-results-label');
    const countBadge   = document.getElementById('docs-count-badge');

    let indexedFiles = [];

    async function refreshFileList() {
        try {
            const files = await invoke('get_indexed_docs');
            indexedFiles = files;
            const count = await invoke('get_doc_count');
            countBadge.textContent = `${count} chunk${count === 1 ? '' : 's'} indexed`;

            if (files.length === 0) {
                fileList.innerHTML = '<div class="docs-empty-msg">No documents indexed yet.</div>';
                return;
            }
            fileList.replaceChildren();
            files.forEach((f) => {
                const name = f.replace(/\\/g, '/').split('/').pop();
                const row = document.createElement('div');
                row.className = 'docs-file-row';
                row.dataset.path = f;
                row.title = f;

                const icon = document.createElement('span');
                icon.className = 'docs-file-icon';
                icon.innerHTML = createIcon('file', { size: 14 });

                const fileName = document.createElement('span');
                fileName.className = 'docs-file-name';
                fileName.textContent = name;

                const btn = document.createElement('button');
                btn.className = 'docs-remove-btn';
                btn.dataset.path = f;
                btn.title = 'Remove from index';
                btn.setAttribute('aria-label', `Remove ${name} from index`);
                btn.innerHTML = createIcon('x', { size: 12 });
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const path = btn.dataset.path;
                    btn.innerHTML = createIcon('zap', { size: 12 });
                    btn.disabled = true;
                    await invoke('remove_indexed_doc', { filePath: path });
                    await refreshFileList();
                });

                row.append(icon, fileName, btn);
                fileList.appendChild(row);
            });
        } catch (err) {
            countBadge.textContent = 'Error loading';
        }
    }

    async function runSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        resultsList.innerHTML = '<div class="docs-search-spinner"></div>';
        resultsLabel.textContent = 'Searching…';
        try {
            const results = await invoke('search_docs_semantic', { query, limit: 10 });
            if (results.length === 0) {
                resultsList.innerHTML = '<div class="docs-empty-msg">No relevant passages found.</div>';
                resultsLabel.textContent = 'Results — 0 found';
                return;
            }
            resultsLabel.textContent = `Results — ${results.length} found`;
            resultsList.replaceChildren();
            results.forEach((r) => {
                const pct = Math.round(r.score * 100);
                const name = r.file.replace(/\\/g, '/').split('/').pop();
                const row = document.createElement('div');
                row.className = 'docs-result-row';

                const header = document.createElement('div');
                header.className = 'docs-result-header';
                const file = document.createElement('span');
                file.className = 'docs-result-file';
                file.title = r.file;
                const icon = document.createElement('span');
                icon.innerHTML = createIcon('fileText', { size: 13 });
                const label = document.createElement('span');
                label.textContent = name;
                file.append(icon.firstElementChild || icon, label);
                const score = document.createElement('span');
                score.className = 'docs-result-score';
                score.textContent = `${pct}%`;
                header.append(file, score);

                const snippet = document.createElement('div');
                snippet.className = 'docs-result-snippet';
                snippet.textContent = String(r.snippet ?? '');

                row.append(header, snippet);
                resultsList.appendChild(row);
            });
        } catch (err) {
            const error = document.createElement('div');
            error.className = 'docs-empty-msg';
            error.style.color = 'var(--error-color)';
            error.textContent = `Search failed: ${String(err)}`;
            resultsList.replaceChildren(error);
            resultsLabel.textContent = 'Results — error';
        }
    }

    searchBtn.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

    indexBtn.addEventListener('click', async () => {
        const dir = prompt('Enter absolute folder path to index:');
        if (!dir || !dir.trim()) return;
        try {
            indexBtn.disabled = true;
            indexBtn.textContent = 'Indexing…';
            await invoke('index_directory', { path: dir.trim() });
            await refreshFileList();
            if (window.addNotification) window.addNotification('Docs Indexed', `Folder indexed: ${dir.trim().split(/[\\/]/).pop()}`, 'success');
        } catch (err) {
            alert(`Indexing failed: ${err}`);
        } finally {
            indexBtn.disabled = false;
            indexBtn.textContent = '+ Index Folder';
        }
    });

    clearBtn.addEventListener('click', async () => {
        if (!confirm('Remove all indexed documents from the knowledge base?')) return;
        await invoke('clear_doc_index');
        await refreshFileList();
        resultsList.innerHTML = '<div class="docs-empty-msg">Search to find relevant passages.</div>';
        resultsLabel.textContent = 'Results';
    });

    // Refresh when tab is activated
    document.querySelector('.nav-tab[data-view="docs"]')?.addEventListener('click', refreshFileList);
}

initDocsView();
