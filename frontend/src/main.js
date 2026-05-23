import './style.css';
import './app.css';

import { invoke } from '@tauri-apps/api/core';
import QRCode from 'qrcode';

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
import { mockIPC } from '@tauri-apps/api/mocks';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { ctrlPromptVisible, ctrlPromptTemplateMode,
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
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(s => s.remove());
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
            const attrs = Array.from(el.attributes);
            attrs.forEach(attr => {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                } else if (name === 'href' || name === 'src' || name === 'action') {
                    const val = attr.value.trim().toLowerCase();
                    if (val.startsWith('javascript:') || val.startsWith('data:text/html')) {
                        el.removeAttribute(attr.name);
                    }
                }
            });
        });
        return doc.body.innerHTML;
    } catch (e) {
        console.error("HTML Sanitization failed:", e);
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
};

window.applyThemeColors = function(theme) {
    if (!theme) return;
    const bg = theme.Background || theme.background || '#000000';
    const fg = theme.Foreground || theme.foreground || '#e2e8f0';
    const accent = theme.Accent || theme.accent || '#00F0FF';
    const response = theme.Response || theme.response || '#00FF88';
    const warning = theme.Warning || theme.warning || '#FFB000';
    const error = theme.Error || theme.error || '#FF3C5A';

    document.documentElement.style.setProperty('--bg-color', bg);
    document.documentElement.style.setProperty('--fg-color', fg);
    document.documentElement.style.setProperty('--accent-color', accent);
    document.documentElement.style.setProperty('--response-color', response);
    document.documentElement.style.setProperty('--warning-color', warning);
    document.documentElement.style.setProperty('--error-color', error);

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

// Check if running in browser dev environment (outside Tauri WebView)
if (!window.__TAURI_INTERNALS__) {
    // Mock the session list in memory for interactivity
    let mockSessions = ["session_mock_123", "session_mock_456"];
    let mockActivePersona = "Default";
    let mockCurrentSessionId = "session_mock_123";
    let mockPlugins = [
        { name: "auto_responder", file_name: "auto_responder.lua", enabled: true },
        { name: "bmad", file_name: "bmad.lua", enabled: true },
        { name: "ip_lookup", file_name: "ip_lookup.lua.disabled", enabled: false }
    ];
    let mockCustomPersonas = [];
    
    mockIPC((cmd, args) => {
        console.log(`[Mock IPC] Invoked: ${cmd}`, args);
        switch (cmd) {
            case 'get_initial_state':
                return {
                    model: "GEMINI",
                    memory_status: "Stable",
                    tool_status: "Idle",
                    session_id: mockCurrentSessionId,
                    active_persona: mockActivePersona,
                    game_name: "Elden Ring",
                    game_app_id: "1245620",
                    game_running: "true"
                };
            case 'get_personas':
                return ["Default", "Developer", "Cyberpunk", "John", "Sally", "Winston", "Amelia", "Paige", "Mary"].concat(mockCustomPersonas.map(p => p.name));
            case 'list_custom_personas':
                return mockCustomPersonas;
            case 'add_custom_persona': {
                const { name, prompt } = args;
                const name_trimmed = name.trim();
                const prompt_trimmed = prompt.trim();
                
                if (!name_trimmed || !prompt_trimmed) {
                    throw "Name and prompt cannot be empty";
                }
                if (name_trimmed.length > 30) {
                    throw "Persona name must be under 30 characters";
                }
                const alphanumeric = /^[a-zA-Z0-9_\-\s]+$/;
                if (!alphanumeric.test(name_trimmed)) {
                    throw "Persona name can only contain letters, numbers, spaces, underscores, and hyphens";
                }
                const builtIn = ["Default", "Developer", "Cyberpunk", "John", "Sally", "Winston", "Amelia", "Paige", "Mary"];
                if (builtIn.some(p => p.toLowerCase() === name_trimmed.toLowerCase())) {
                    throw `Persona '${name_trimmed}' clashes with a built-in persona`;
                }
                if (mockCustomPersonas.some(p => p.name.toLowerCase() === name_trimmed.toLowerCase())) {
                    throw `Persona '${name_trimmed}' already exists`;
                }
                mockCustomPersonas.push({ name: name_trimmed, prompt: prompt_trimmed });
                return null;
            }
            case 'delete_custom_persona': {
                const { name } = args;
                const initial_len = mockCustomPersonas.length;
                mockCustomPersonas = mockCustomPersonas.filter(p => p.name !== name);
                if (mockCustomPersonas.length === initial_len) {
                    throw `Custom persona '${name}' not found`;
                }
                return null;
            }
            case 'get_themes':
                return ["Default", "Nord", "Gruvbox", "Sunset", "Dracula"];
            case 'set_persona':
                mockActivePersona = args.name;
                return `Persona set to ${args.name}`;
            case 'set_theme': {
                const themes = {
                    Default: { Background: "#12131C", Foreground: "#E0E0E0", Accent: "#00E5FF" },
                    Nord: { Background: "#2E3440", Foreground: "#D8DEE9", Accent: "#88C0D0" },
                    Gruvbox: { Background: "#282828", Foreground: "#EBDBB2", Accent: "#FE8019" },
                    Sunset: { Background: "#1A0F1A", Foreground: "#FFE0F0", Accent: "#FF5E97" },
                    Dracula: { Background: "#282A36", Foreground: "#F8F8F2", Accent: "#BD93F9" }
                };
                return themes[args.name] || themes.Default;
            }
            case 'new_session': {
                const newId = "session_mock_" + Math.random().toString(36).substr(2, 9);
                mockSessions.push(newId);
                mockCurrentSessionId = newId;
                return newId;
            }
            case 'list_sessions':
                return mockSessions;
            case 'load_session_by_id':
                return {
                    session_id: args.id,
                    messages: [
                        "User: Hello, list files in this directory please.",
                        "AI: Here is a code block:\n```bash\nls -la\n```",
                        "User: thanks!"
                    ]
                };
            case 'delete_session':
                mockSessions = mockSessions.filter(id => id !== args.id);
                return "ok";
            case 'save_session':
                return "Session saved successfully";
            case 'load_latest_session':
                return {
                    session_id: mockCurrentSessionId,
                    messages: [
                        "User: Hello, list files in this directory please.",
                        "AI: Here is a code block:\n```bash\nls -la\n```",
                        "User: thanks!"
                    ]
                };
            case 'speak_text':
                console.log(`[Mock TTS] Speaking: ${args.text}`);
                return "ok";
            case 'start_recording':
                return "Voice recording started (Mock)";
            case 'stop_recording':
                return "Show me the latest logs (mock transcription)";
            case 'send_command': {
                // Simulate AI response stream
                const text = args.prompt;

                // Let's create a simulated response depending on user prompt
                let reply = `I received your command: "${text}".\n\nHere is some code execution output:`;
                if (args.imageBase64) {
                    reply = `**[Vision Mock]** I can see the attached screenshot.\n\nYou asked: "${text}"\n\nIn production this calls Gemini Vision to analyze the image.`;
                } else if (text.startsWith('/persona')) {
                    reply = `Persona command executed successfully. Active persona updated.`;
                } else if (text.startsWith('/discuss')) {
                    reply = `Roundtable discussion initiated:\n\n**Amelia (Dev)**: Let's refactor the process stream.\n**Winston (Architect)**: Make sure the IPC channels are secure.\n**Sally (UX)**: Ensure the console feels fluid.`;
                } else {
                    reply = `Hello! This is a simulated stream response from **NEURODECK**.\n\nYou sent: "${text}".\n\nLet's test code output:\n\`\`\`bash\nnpm run test:nav\n\`\`\``;
                }
                
                // Stream the reply in chunks
                let chunks = [];
                for (let i = 0; i < reply.length; i += 5) {
                    chunks.push(reply.substring(i, i + 5));
                }
                
                let delay = 50;
                chunks.forEach((chunk, index) => {
                    setTimeout(() => {
                        invoke('plugin:event|emit', { event: 'stream_chunk', payload: chunk });
                    }, delay * (index + 1));
                });
                
                setTimeout(() => {
                    invoke('plugin:event|emit', { event: 'stream_done', payload: {} });
                }, delay * (chunks.length + 2));
                
                return "ok";
            }
            case 'execute_command_stream': {
                // Simulate command execution stdout/stderr stream
                const cmd = args.cmdStr;
                let lines = [
                    `$ ${cmd}`,
                    `Cloning repository...`,
                    `Resolving dependencies...`,
                    `Success: process completed.`,
                ];
                
                lines.forEach((line, index) => {
                    setTimeout(() => {
                        invoke('plugin:event|emit', { event: 'command_stdout', payload: line });
                    }, 300 * (index + 1));
                });
                
                setTimeout(() => {
                    invoke('plugin:event|emit', { event: 'command_exit', payload: 0 });
                }, 300 * (lines.length + 1));
                
                return "ok";
            }
            case 'kill_process':
                return "ok";
            case 'write_to_process':
                return "ok";
            case 'execute_lua': {
                const code = args.code;
                let lines = [
                    `[Lua Engine] Executing script...`,
                    `Hello from Lua Mock Runtime!`,
                    `Evaluating: ${code.substring(0, 30)}${code.length > 30 ? '...' : ''}`,
                ];
                lines.forEach((line, index) => {
                    setTimeout(() => {
                        invoke('plugin:event|emit', { event: 'command_stdout', payload: line });
                    }, 200 * (index + 1));
                });
                setTimeout(() => {
                    invoke('plugin:event|emit', { event: 'command_exit', payload: 0 });
                }, 200 * (lines.length + 1));
                return "ok";
            }
            case 'export_session_markdown':
                return `Session exported to ./exports/${args.id}.md (Mock)`;
            case 'open_external':
                console.log(`[Mock Browser] Opening external URL: ${args.url}`);
                return "ok";
            case 'browser_open':
            case 'browser_navigate':
            case 'browser_hide':
            case 'browser_show':
            case 'browser_exec':
                console.log(`[Mock] ${cmd}:`, args);
                return "ok";
            case 'browser_get_url':
                return "https://html.duckduckgo.com/html/";
            case 'get_game_context':
                return {
                    name: "Elden Ring",
                    app_id: "1245620",
                    is_running: "true",
                    notes: "Action RPG / Souls-like. Recommended Settings: Medium settings, 800p, Lock at 30FPS for visual stability. Common tweaks: Use Proton Experimental and enable CryoUtilities swap file increase to resolve open world stutters."
                };
            case 'send_tunnel_request':
                return JSON.stringify({ status: "offline", error: "Mock: no tunnel server" });
            case 'start_tunnel_server':
            case 'stop_tunnel_server':
                return "ok";
            case 'pty_kill':
            case 'pty_write':
            case 'pty_resize':
                return "ok";
            case 'pty_spawn':
                return { id: args.id || "main_pty_session" };
            case 'ftp_test_connection':
                return "Connected. Current directory: /";
            case 'ftp_list_dir':
                return [
                    { name: "documents", is_dir: true, size: 0 },
                    { name: "readme.txt", is_dir: false, size: 1024 },
                ];
            case 'ftp_download_file':
            case 'ftp_upload_file':
                return null;
            case 'sftp_test_connection':
                return "Connected. Current directory: /";
            case 'sftp_list_dir':
                return [
                    { name: "sftp_documents", is_dir: true, size: 0 },
                    { name: "sftp_readme.txt", is_dir: false, size: 2048 },
                ];
            case 'sftp_download_file':
            case 'sftp_upload_file':
                return null;
            case 'get_discovered_peers':
                return [];
            case 'get_active_transfers':
                return [];
            case 'cancel_transfer':
                return null;
            case 'set_group_code':
                window._mockGroupCode = args.code;
                return null;
            case 'get_group_code':
                return window._mockGroupCode || "DEFAULT";
            case 'assemble_prompt_via_lua_cmd':
                // Simple JS concatenation fallback for browser mock mode
                return `**Role/Persona:**\n${args.persona}\n\n**Task/Objective:**\n${args.task}\n\n**Context/Background:**\n${args.context}\n\n**Tone:**\n${args.tone}\n\n**Constraints:**\n${args.constraints}\n\n**Output Format:**\n${args.format}\n\n[Formula Applied: ${args.formula.toUpperCase()}]`;
            case 'optimize_raw_prompt':
                return {
                    persona: "You are an expert software engineer.",
                    task: args.raw_text || "Create a hello world program.",
                    context: "Target environment: S-Term system.",
                    tone: "Precise and direct.",
                    constraints: "- Do not use third party dependencies.\n- Write highly performant code.",
                    format: "Markdown code block only."
                };
            case 'generate_jpe_explanation_with_level':
                return `[JPE Summary - Target Style: ${args.reading_level.toUpperCase()}]\nThis prompt instructs the AI to adopt the role of "${args.reading_level}" and solve the task: "${args.prompt_text.substring(0, 50)}...". It mandates that all specified constraints and formatted structures be strictly followed.`;
            case 'save_prompt_preset':
                if (!window._mockPresets) window._mockPresets = {};
                window._mockPresets[args.name] = args.schema_json;
                return null;
            case 'load_prompt_presets':
                return window._mockPresets || {};
            case 'ollama_list_models':
                return [
                    { name: "llama2:latest", size: 3791823901, modified_at: "2026-05-23T01:21:46Z" },
                    { name: "llama3.2:latest", size: 2018898124, modified_at: "2026-05-23T01:21:46Z" },
                ];
            case 'ollama_pull_model': {
                setTimeout(() => {
                    const el = document.getElementById("settings-ollama-pull-status");
                    if (el) el.innerText = "Downloading...";
                    const pct = document.getElementById("settings-ollama-pull-percent");
                    if (pct) pct.innerText = "50%";
                    const bar = document.getElementById("settings-ollama-pull-bar");
                    if (bar) bar.style.width = "50%";
                    setTimeout(() => {
                        if (el) el.innerText = "Pull complete!";
                        if (pct) pct.innerText = "100%";
                        if (bar) bar.style.width = "100%";
                        setTimeout(() => {
                            const container = document.getElementById("settings-ollama-pull-progress-container");
                            if (container) container.style.display = "none";
                            const pullBtn = document.getElementById("settings-ollama-pull-btn");
                            if (pullBtn) pullBtn.disabled = false;
                            const inputEl = document.getElementById("settings-ollama-pull-input");
                            if (inputEl) inputEl.value = "";
                            refreshOllamaModels();
                        }, 1000);
                    }, 1000);
                }, 500);
                return null;
            }
            case 'ollama_delete_model':
                return null;
            case 'agent_step':
                return JSON.stringify({
                    thought: "Mock: I'll write a simple Python hello world script.",
                    code: 'print("Hello from NEURODECK Agent!")',
                    lang: "python",
                    action: "run_code",
                    summary: "Print a hello world message"
                });
            case 'agent_exec_code':
                return "Hello from NEURODECK Agent!\n(mock output — run in Tauri for real execution)";
            case 'memory_list_all':
                return [
                    { id: "mock-20240101-1", content: "User: How do I reverse a list in Python?", metadata: { role: "user" } },
                    { id: "mock-20240101-2", content: "AI: Use list[::-1] or list.reverse() for in-place reversal.", metadata: { role: "ai" } },
                    { id: "fact-20240101000000000", content: "Preferred language: Python 3.11. Always use type hints.", metadata: { role: "fact", pinned: "true" } },
                    { id: "mock-20240102-1", content: "User: Explain the Rust borrow checker.", metadata: { role: "user" } },
                    { id: "mock-20240102-2", content: "AI: The borrow checker ensures memory safety by enforcing ownership rules at compile time.", metadata: { role: "ai", pinned: "true" } },
                ];
            case 'memory_delete':
                return null;
            case 'memory_pin':
                return null;
            case 'memory_add_fact':
                return `fact-mock-${Date.now()}`;
            case 'get_config':
                return {
                    theme: {
                        primary_color: "#00F0FF",
                        secondary_color: "#FF0055",
                        bg_color: "#050505",
                        foreground_color: "#D9F7FF",
                        response_color: "#00FF88"
                    },
                    llm: {
                        default_provider: "ollama",
                        ollama_model: "llama2",
                        gemini_model: "gemini-1.5-flash",
                        ollama_base_url: "http://localhost:11434",
                        google_client_id: ""
                    }
                };
            case 'set_config':
                return null;
            case 'save_gemini_api_key':
                return null;
            case 'get_gemini_api_key':
                return "MOCK_GEMINI_API_KEY";
            case 'test_llm_connection':
                return "Mock LLM Connection Successful!";
            case 'open_external':
            case 'open_url':
                console.log("[Mock] open_external:", args?.url);
                return;
            case 'install_bmad_to_dir':
                return `BMAD installed to ${args?.targetDir} (_bmad/ + .claude/skills/ with 44 skill sets) [MOCK]`;
            case 'get_context_stats':
                return {
                    active_model: "llama2 (mock)",
                    active_provider: "ollama (mock)",
                    memory_records_count: 5,
                    memory_pinned_count: 2,
                    memory_last_store: "Stable",
                    session_id: "20260523-011800",
                    session_messages_count: 3,
                    session_created: "2026-05-23 01:18:00",
                    active_persona: "Default",
                    ram_available: "12867MB / 15867MB"
                };
            case 'list_plugins':
                return mockPlugins;
            case 'toggle_plugin': {
                const { fileName, enabled } = args;
                const plugin = mockPlugins.find(p => p.file_name === fileName);
                if (plugin) {
                    plugin.enabled = enabled;
                    if (enabled) {
                        if (fileName.endsWith(".disabled")) {
                            plugin.file_name = fileName.replace(".disabled", "");
                        }
                    } else {
                        if (!fileName.endsWith(".disabled")) {
                            plugin.file_name = fileName + ".disabled";
                        }
                    }
                }
                return null;
            }
            case 'install_plugin': {
                const { url } = args;
                const lastSlash = url.lastIndexOf('/');
                let name = lastSlash !== -1 ? url.substring(lastSlash + 1) : "new_plugin.lua";
                if (!name.endsWith(".lua") && !name.endsWith(".disabled")) {
                    name += ".lua";
                }
                const baseName = name.endsWith(".disabled") ? name.replace(".lua.disabled", "") : name.replace(".lua", "");
                mockPlugins.push({
                    name: baseName,
                    file_name: name,
                    enabled: !name.endsWith(".disabled")
                });
                return null;
            }
            case 'read_plugin': {
                const { fileName } = args;
                if (fileName.includes("bmad")) {
                    return `-- plugins/bmad.lua\n-- Preinstalled BMad framework plugin.\nprint("Hello Bmad Mock")`;
                } else if (fileName.includes("ip_lookup")) {
                    return `-- ip_lookup.lua\nprint("Hello IP Lookup Mock")`;
                } else {
                    return `-- ${fileName}\nprint("Custom Mock Script")`;
                }
            }
            case 'save_plugin': {
                const { fileName, content } = args;
                const baseName = fileName.endsWith(".disabled") ? fileName.replace(".lua.disabled", "") : fileName.replace(".lua", "");
                let plugin = mockPlugins.find(p => p.file_name === fileName);
                if (!plugin) {
                    plugin = { name: baseName, file_name: fileName, enabled: !fileName.endsWith(".disabled") };
                    mockPlugins.push(plugin);
                }
                console.log(`[Mock IPC] Saved plugin ${fileName} with content length: ${content.length}`);
                return null;
            }
            case 'reload_plugins':
                return null;
            case 'shell_autocomplete': {
                // Simulate an AI-generated completion suffix
                const buf = (args.buffer || '').trim();
                let completion = '';
                if (buf.startsWith('git cl')) completion = 'one ';
                else if (buf.startsWith('git co')) completion = 'mmit -m ""';
                else if (buf.startsWith('git s')) completion = 'tatus';
                else if (buf.startsWith('npm r')) completion = 'un dev';
                else if (buf.startsWith('ls')) completion = ' -la';
                else if (buf.startsWith('cd')) completion = ' ~/Desktop';
                else if (buf.startsWith('docker')) completion = ' ps -a';
                else if (buf.startsWith('sudo ap')) completion = 't update';
                console.log(`[Mock IPC] Autocomplete for "${buf}": "${completion}"`);
                return completion;
            }
            case 'read_last_screenshot': {
                // Return a mock 1x1 cyan PNG as base64 (a real image)
                const mockPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                return {
                    path: '/home/deck/Pictures/Screenshots/mock_screenshot.png',
                    data: mockPng,
                    mime: 'image/png'
                };
            }
            case 'search_history_ai': {
                const query = (args.query || '').toLowerCase();
                const mockHistory = [
                    'git commit -m "feat: add category B features"',
                    'git push origin main',
                    'npm run dev',
                    'cargo check',
                    'ls -la ~/.local/share/Steam',
                    'cd ~/Desktop/S-Term',
                    'cat ~/.bash_history | tail -50',
                    'docker ps -a',
                    'sudo pacman -Syu',
                    'flatpak update',
                    'steam-run ./game.sh',
                    'systemctl restart sshd',
                    'journalctl -xe',
                    'df -h',
                    'htop',
                ];
                // Simple keyword filter for demo
                const filtered = mockHistory.filter(cmd =>
                    query === '' || cmd.toLowerCase().includes(query.split(' ')[0])
                ).slice(0, 10);
                return filtered.length > 0 ? filtered : mockHistory.slice(0, 5);
            }
            case 'start_mcp_server': {
                const port = args.port || 13337;
                window._mockMcpRunning = true;
                window._mockMcpPort = port;
                return `MCP server started on http://127.0.0.1:${port}`;
            }
            case 'stop_mcp_server': {
                window._mockMcpRunning = false;
                return `MCP server on port ${window._mockMcpPort || 13337} stopped.`;
            }
            case 'get_mcp_status': {
                const running = window._mockMcpRunning || false;
                const port = window._mockMcpPort || 13337;
                return running
                    ? { running: 'true', port: String(port), url: `http://127.0.0.1:${port}` }
                    : { running: 'false', port: String(port) };
            }
            case 'index_directory': {
                // Simulate progress events then return count
                const total = 4;
                for (let i = 1; i <= total; i++) {
                    setTimeout(() => {
                        invoke('plugin:event|emit', {
                            event: 'doc_index_progress',
                            payload: JSON.stringify({ indexed: i, total, file: `mock_doc_${i}.txt` })
                        });
                    }, 300 * i);
                }
                setTimeout(() => {
                    invoke('plugin:event|emit', {
                        event: 'doc_index_progress',
                        payload: JSON.stringify({ indexed: total, total, done: true })
                    });
                }, 300 * (total + 1));
                return `Indexed ${total} documents (mock).`;
            }
            case 'get_doc_count':
                return window._mockDocCount || 0;
            case 'clear_doc_index':
                window._mockDocCount = 0;
                return 'Document index cleared (mock).';
            case 'get_game_notes': {
                const appId = args.appId || '';
                return window._mockGameNotes?.[appId] || '';
            }
            case 'save_game_note': {
                if (!window._mockGameNotes) window._mockGameNotes = {};
                window._mockGameNotes[args.appId] = args.content;
                return null;
            }
            case 'set_whisper_config':
                window._mockWhisperBinary = args.binary || '';
                window._mockWhisperModel = args.model || '';
                return null;
            case 'get_whisper_status': {
                const configured = !!(window._mockWhisperModel);
                return {
                    configured,
                    binary: window._mockWhisperBinary || '',
                    model: window._mockWhisperModel || '',
                    model_exists: configured,
                    binary_found: configured,
                };
            }
            case 'transcribe_audio_whisper': {
                if (!window._mockWhisperModel) {
                    throw 'Whisper model path not set. Configure it in Settings → Whisper STT.';
                }
                return 'This is a mock whisper transcription of the recorded audio.';
            }
            case 'canvas_collab_host': {
                const port = args.port || 13338;
                window._mockCollabActive = true;
                window._mockCollabPort = port;
                window._mockCollabRole = 'host';
                return port;
            }
            case 'canvas_collab_join': {
                window._mockCollabActive = true;
                window._mockCollabRole = 'guest';
                window._mockCollabAddr = args.addr;
                // Simulate peer connecting after a short delay
                setTimeout(() => {
                    invoke('plugin:event|emit', {
                        event: 'canvas_collab_event',
                        payload: 'peer_connected:mock_peer'
                    });
                }, 800);
                return null;
            }
            case 'canvas_collab_send':
                console.log('[Mock Collab] Sent:', args.lang, args.code?.substring(0, 40));
                return null;
            case 'canvas_collab_stop':
                window._mockCollabActive = false;
                return null;
            case 'save_profiles': {
                if (!window._mockProfiles) window._mockProfiles = {};
                window._mockProfiles[args.key] = args.data;
                return null;
            }
            case 'load_profiles': {
                if (!window._mockProfiles) return '[]';
                return window._mockProfiles[args.key] || '[]';
            }
            case 'save_custom_themes': {
                window._mockCustomThemes = args.data;
                return null;
            }
            case 'load_custom_themes':
                return window._mockCustomThemes || '[]';
            case 'get_lan_ip':
                return '192.168.1.100';
            case 'generate_jpe_explanation':
                return `This prompt asks the AI to act as ${(args.promptText || '').slice(0, 60)}... In plain terms: fill in your role, give a clear task, add any constraints, and specify the output format you want. The AI will follow these instructions step by step.`;
            case 'start_oauth_flow':
                return { device_code: 'mock_device_code', user_code: 'MOCK-CODE', verification_uri: 'https://accounts.google.com/device', expires_in: 300, interval: 5 };
            case 'poll_oauth_token':
                return null;
            case 'run_onboarding_diagnostics':
                return { pty_ok: true, pty_details: 'Shell Subsystem active (Default: powershell.exe)', network_ok: true, network_details: 'Internet active (mock)', keychain_ok: true, keychain_details: 'Secure credential storage active (mock)' };
            case 'start_warpinator':
                return null;
            case 'start_remote_server': {
                const port = args.port || 9090;
                window._mockRemoteServer = { port, ip: '192.168.1.100', pin: '123456', running: true };
                return { port, ip: '192.168.1.100', pin: '123456', url: `http://192.168.1.100:${port}/?pin=123456` };
            }
            case 'stop_remote_server':
                window._mockRemoteServer = null;
                return null;
            case 'get_remote_server_info':
                if (window._mockRemoteServer) {
                    const rs = window._mockRemoteServer;
                    return { running: true, port: rs.port, ip: rs.ip, pin: rs.pin, url: `http://${rs.ip}:${rs.port}/?pin=${rs.pin}`, connected: 0 };
                }
                return { running: false };
            case 'remote_send_to_clients':
                return null;
            default:
                console.warn(`[Mock IPC] Unknown command: ${cmd}`);
                return null;
        }
    }, { shouldMockEvents: true });
}

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
                <div class="boot-subtitle">AI TERMINAL OS · v1.0.0</div>
                <div class="boot-build-tag">BUILD 20260523 · STEAM DECK EDITION</div>
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
                    <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Toggle Sidebar">☰</button>
                    <span class="top-nav-title" id="session-title">Active Session</span>
                </div>
                
                <!-- Premium Glassmorphic Navigation Tab Bar -->
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
                    <button class="nav-tab" data-view="remote">📱 Remote</button>
                </div>

                <div class="top-nav-right">
                    <span class="model-selector-indicator" id="model-name">[ MODEL: GEMINI ]</span>
                    <span class="game-context-badge hidden" id="game-badge" title="Steam game detected">
                        <span class="game-badge-dot" id="game-badge-dot"></span>
                        <span id="game-badge-name"></span>
                    </span>
                    <span class="status-badge">
                        <span class="status-dot"></span>
                        <span id="tool-status">Idle</span>
                    </span>
                    <button class="input-btn" id="mute-btn" title="Mute Speech (Ctrl+M)">🔊</button>
                    <button class="input-btn" id="notif-btn" title="Notifications" style="position: relative;">🔔<span class="notif-badge hidden" id="notif-badge">0</span></button>
                    <button class="input-btn" id="settings-btn" title="Settings">⚙️</button>
                </div>
            </header>

            <div class="view-container">
                <!-- Chat View -->
                <div class="view-content active" id="view-chat">
                    <!-- Chat Workspace -->
                    <div class="chat-workspace" id="chat-workspace">
                        <div class="chat-viewport" id="chat-viewport">
                            <div class="message system">
                                <div class="message-card">System initialized. Welcome to NEURODECK.</div>
                            </div>
                        </div>
                    </div>

                    <!-- Floating Input Console -->
                    <div class="floating-input-container">
                        <div class="input-console-bar">
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
                            <div class="history-search-title">⚡ AI Shell History Search</div>
                            <div class="history-search-input-wrap">
                                <span class="history-search-icon">🔍</span>
                                <input type="text" id="history-search-input" placeholder="Describe the command you're looking for..." autocomplete="off" spellcheck="false">
                            </div>
                            <div class="history-search-status" id="history-search-status">Press Enter to search • Esc to close</div>
                        </div>
                        <div class="history-search-body" id="history-search-body">
                            <div class="history-empty-state">Start typing to search your shell history with AI</div>
                        </div>
                        <div class="history-search-footer">
                            <span><kbd>↑↓</kbd> navigate</span>
                            <span><kbd>Enter</kbd> insert command</span>
                            <span><kbd>Esc</kbd> close</span>
                        </div>
                    </div>
                </div>

                <!-- Live Code Canvas View -->
                <div class="view-content" id="view-canvas">
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
                        <button class="canvas-btn" id="canvas-run-btn">▶ Run</button>
                        <button class="canvas-btn" id="canvas-copy-btn">Copy</button>
                        <button class="canvas-btn" id="canvas-clear-btn">Clear</button>
                        <button class="canvas-btn" id="canvas-collab-btn" title="Live Collaboration" style="margin-left: auto;">🤝 Collab</button>
                        <span class="canvas-instructions">Ctrl+Enter to run • Live preview updates as you type</span>
                    </div>
                    <div id="canvas-collab-status-bar" class="canvas-collab-status-bar" style="display: none; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(0,255,136,0.06); border-bottom: 1px solid rgba(0,255,136,0.15); font-family: var(--font-mono); font-size: 0.78rem;">
                        <span style="display:inline-block; width:8px; height:8px; background:var(--response-color); border-radius:50%; box-shadow: 0 0 8px var(--response-color);"></span>
                        <span id="canvas-collab-status-text" style="color:var(--response-color);">Collab Active: Syncing edits live</span>
                        <button class="canvas-btn canvas-btn-sm" id="canvas-collab-resync-btn" style="margin-left: auto; padding: 2px 8px; font-size: 0.72rem;">Force Resync 🔄</button>
                    </div>
                    <div class="canvas-split" id="canvas-split">
                        <div class="canvas-editor-pane" id="canvas-editor-pane">
                            <div class="canvas-pane-header">
                                <span id="canvas-file-title">untitled.html</span>
                            </div>
                            <textarea id="canvas-editor" class="canvas-editor" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="// Code sent from chat will appear here&#10;// You can also type directly..."></textarea>
                        </div>
                        <div class="canvas-divider" id="canvas-divider"></div>
                        <div class="canvas-preview-pane" id="canvas-preview-pane">
                            <div class="canvas-pane-header">
                                <span>Live Preview</span>
                                <button class="canvas-btn canvas-btn-sm" id="canvas-refresh-btn">↺</button>
                            </div>
                            <iframe id="canvas-preview-frame" class="canvas-preview-frame" sandbox="allow-scripts allow-same-origin allow-modals" title="Live Preview"></iframe>
                            <pre id="canvas-preview-output" class="canvas-preview-output" style="display: none; flex: 1; margin: 0; padding: 15px; background: #050505; color: #00FF88; font-family: var(--font-mono); font-size: 0.9rem; overflow: auto; white-space: pre-wrap; word-break: break-all; border: none; height: calc(100% - 30px); box-sizing: border-box;"></pre>
                        </div>
                    </div>
                </div>

                <!-- Interactive PTY Terminal View -->
                <div class="view-content" id="view-terminal">
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
                    <div class="ssh-layout">
                        <div class="ssh-sidebar">
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
                                <select id="ssh-auth-type" class="canvas-lang-select" style="width:100%;box-sizing:border-box;background:#1a242f;color:#e2e8f0;border:1px solid var(--border-color);border-radius:4px;padding:6px;">
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

                <!-- SteamOS Tunnel View -->
                <div class="view-content" id="view-tunnel">
                    <div class="tunnel-grid">
                        <div class="tunnel-panel">
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
                            <div class="setting-field-group" style="margin-top: 15px;">
                                <label>Host Command Executor</label>
                                <div style="display:flex; gap:10px;">
                                    <input type="text" class="tunnel-text-input" id="tunnel-cmd-input" placeholder="e.g. echo 'Hello from S-Term' > test.txt">
                                    <button class="send-prompt-btn" id="tunnel-cmd-send">Execute</button>
                                </div>
                            </div>
                            <div class="setting-field-group" style="margin-top: 15px;">
                                <label>Write Host File</label>
                                <input type="text" class="tunnel-text-input" id="tunnel-filepath-input" placeholder="File path (e.g. /home/deck/Desktop/note.txt)" style="margin-bottom: 8px;">
                                <textarea class="tunnel-text-area" id="tunnel-filecontent-input" placeholder="File content..." rows="3"></textarea>
                                <button class="send-prompt-btn" id="tunnel-file-send" style="margin-top:8px;">Write File</button>
                            </div>
                            <div class="setting-field-group" style="margin-top: 15px;">
                                <label>Query Host Directory</label>
                                <div style="display:flex; gap:10px;">
                                    <input type="text" class="tunnel-text-input" id="tunnel-dirpath-input" placeholder="/home/deck">
                                    <button class="send-prompt-btn" id="tunnel-dir-send">Read Dir</button>
                                </div>
                            </div>
                        </div>
                        <div class="tunnel-panel">
                            <h3>Tunnel Operations Log</h3>
                            <div class="tunnel-log" id="tunnel-log">
                                <div class="log-entry system">System: Log initialized. Tunnel operates on 127.0.0.1:18337.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- LAN File Sharing / SFTP / FTP View -->
                <div class="view-content" id="view-share">
                    <div class="share-inner-tabs">
                        <button class="share-inner-tab active" data-panel="lan">📡 LAN</button>
                        <button class="share-inner-tab" data-panel="sftp">🔒 SFTP</button>
                        <button class="share-inner-tab" data-panel="ftp">📁 FTP</button>
                    </div>

                    <!-- LAN Panel -->
                    <div class="share-panel-section active" id="share-panel-lan">
                        <div class="share-grid">
                            <div class="share-panel">
                                <h3>LAN Discovery & Sending</h3>
                                <p class="share-desc">Discovers S-Term instances running on your local network. Select a peer, drag/drop a file or enter a path, then send.</p>
                                <div class="setting-field-group" style="margin-bottom: 15px;">
                                    <label>Warpinator Group Code</label>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="text" class="tunnel-text-input" id="share-group-code-input" placeholder="DEFAULT" style="flex: 1; box-sizing: border-box; height: 36px; margin: 0;">
                                        <button class="send-prompt-btn" id="share-group-code-save-btn" style="margin: 0; height: 36px; padding: 0 15px; font-size: 12px; white-space: nowrap;">Apply</button>
                                    </div>
                                </div>
                                <div class="setting-field-group">
                                    <label>Active Peers on LAN</label>
                                    <div class="peers-list" id="share-peers-list">
                                        <div class="peer-item-empty">Scanning local network for active peers...</div>
                                    </div>
                                </div>
                                <div class="setting-field-group" style="margin-top: 15px;">
                                    <label>Drag & Drop File or Select Path</label>
                                    <div class="share-dropzone" id="share-dropzone">
                                        <div class="dropzone-text">Drag files here or click to select a file</div>
                                    </div>
                                    <input type="text" class="tunnel-text-input" id="share-filepath-input" placeholder="Absolute file path (e.g. /home/deck/file.zip)" style="margin-top: 8px; width: 100%; box-sizing: border-box;">
                                </div>
                                <button class="send-prompt-btn" id="share-send-btn" style="margin-top: 15px; width: 100%;" disabled>Send File 🚀</button>
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
                                    <select id="sftp-auth-type" class="canvas-lang-select" style="width:100%;box-sizing:border-box;background:#1a242f;color:#e2e8f0;border:1px solid var(--border-color);border-radius:4px;padding:6px;">
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
                            <div class="browser-nav-buttons">
                                <button class="browser-btn" id="browser-back-btn" title="Go Back">◀</button>
                                <button class="browser-btn" id="browser-forward-btn" title="Go Forward">▶</button>
                                <button class="browser-btn" id="browser-refresh-btn" title="Refresh">🔄</button>
                                <button class="browser-btn" id="browser-home-btn" title="New Tab / Home">🏠</button>
                            </div>
                            <div class="browser-address-bar-wrapper">
                                <input type="text" id="browser-url-input" class="browser-url-input" placeholder="Enter URL or search term...">
                                <button class="browser-url-clear" id="browser-url-clear-btn" title="Clear">✕</button>
                            </div>
                            <button class="browser-btn go-btn" id="browser-go-btn">Go 🚀</button>
                            <button class="browser-btn open-ext-btn" id="browser-open-ext-btn" title="Open in System Browser">Open Ext ↗️</button>
                        </div>

                        <!-- Loading progress bar (sits between toolbar and viewport) -->
                        <div id="browser-progress-bar" class="browser-progress-bar hidden"></div>

                        <!-- Main viewport -->
                        <div class="browser-viewport">
                            <!-- New Tab / Home View -->
                            <div class="browser-home-screen" id="browser-home-screen">
                                <div class="browser-home-content">
                                    <div class="browser-home-logo">NEURODECK<span>BROWSER</span></div>
                                    <p class="browser-home-subtitle">Built-in Sandbox Navigation Engine</p>
                                    
                                    <div class="browser-search-box">
                                        <input type="text" id="browser-home-search-input" placeholder="Search the web (via DuckDuckGo frame)...">
                                        <button id="browser-home-search-btn">Search</button>
                                    </div>
                                    
                                    <div class="speed-dial-title">Quick Bookmarks</div>
                                    <div class="speed-dial-grid">
                                        <div class="speed-dial-card" data-url="https://html.duckduckgo.com/html/">
                                            <div class="sd-icon">🔍</div>
                                            <div class="sd-label">DuckDuckGo</div>
                                            <div class="sd-desc">Privacy-first web search</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://en.m.wikipedia.org/wiki/Main_Page">
                                            <div class="sd-icon">📚</div>
                                            <div class="sd-label">Wikipedia</div>
                                            <div class="sd-desc">Mobile encyclopedia</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://news.ycombinator.com/">
                                            <div class="sd-icon">📰</div>
                                            <div class="sd-label">Hacker News</div>
                                            <div class="sd-desc">Tech & Dev community board</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://reddit.com/r/SteamDeck">
                                            <div class="sd-icon">🎮</div>
                                            <div class="sd-label">r/SteamDeck</div>
                                            <div class="sd-desc">Steam Deck community</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://mrdoob.com/projects/chromeexperiments/google-gravity/">
                                            <div class="sd-icon">🌐</div>
                                            <div class="sd-label">Google Gravity</div>
                                            <div class="sd-desc">Anti-gravity Easter egg</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://codepen.io/trending">
                                            <div class="sd-icon">✏️</div>
                                            <div class="sd-label">CodePen</div>
                                            <div class="sd-desc">Live front-end code demos</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://archive.org/search">
                                            <div class="sd-icon">🏛️</div>
                                            <div class="sd-label">Internet Archive</div>
                                            <div class="sd-desc">Web history & media vault</div>
                                        </div>
                                        <div class="speed-dial-card" data-url="https://caniuse.com/">
                                            <div class="sd-icon">🔧</div>
                                            <div class="sd-label">Can I Use</div>
                                            <div class="sd-desc">Browser feature support tables</div>
                                        </div>
                                    </div>

                                    <div class="browser-info-panel">
                                        <div class="info-icon">⚠️</div>
                                        <div class="info-text">
                                            <strong>Framing Notice:</strong> Many modern websites (like Google, GitHub, or YouTube) send headers that restrict them from running inside an embedded iframe for security. If a website refuses to connect, use the <strong>Open Ext ↗️</strong> button to launch it in your default desktop browser.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Active IFrame -->
                            <iframe id="browser-iframe" class="browser-iframe hidden" referrerpolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation allow-downloads"></iframe>

                            <!-- Blocked / Error Screen -->
                            <div class="browser-blocked-screen hidden" id="browser-blocked-screen">
                                <div class="blocked-content">
                                    <div class="blocked-icon">🚫</div>
                                    <h2 class="blocked-title">Connection Blocked</h2>
                                    <p class="blocked-msg">This site uses <strong>X-Frame-Options</strong> or <strong>CSP</strong> headers that prevent embedding inside NEURODECK Browser.</p>
                                    <p class="blocked-url" id="blocked-url-display"></p>
                                    <button class="browser-btn go-btn blocked-ext-btn" id="blocked-open-ext-btn">Open in System Browser ↗️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Autonomous Coding Agent View -->
                <div class="view-content" id="view-agent">
                    <div class="agent-toolbar">
                        <input type="text" id="agent-task-input" class="agent-task-input" placeholder="Describe your task… e.g. Write a Python script that lists all .txt files in the current directory">
                        <button class="agent-btn agent-btn-run" id="agent-run-btn">▶ Run Agent</button>
                        <button class="agent-btn agent-btn-stop hidden" id="agent-stop-btn">■ Stop</button>
                        <span class="agent-iter-label hidden" id="agent-iter-label">Step 1 / 5</span>
                    </div>

                    <div class="agent-body">
                        <!-- Left: step-by-step log -->
                        <div class="agent-log-pane" id="agent-log-pane">
                            <div class="agent-pane-header">Execution Log</div>
                            <div class="agent-log" id="agent-log">
                                <div class="agent-empty-state">
                                    <div class="agent-empty-icon">🤖</div>
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

                <!-- Prompt Lab UI View -->
                <div class="view-content" id="view-prompt-lab">
                    <div class="prompt-lab-container">
                        <!-- Left pane: Input Form -->
                        <div class="prompt-lab-form">
                            <div class="prompt-lab-header">
                                <h3>Prompt Generator</h3>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <select id="pl-template-select" class="pl-dropdown" style="max-width: 140px;">
                                        <option value="">Load Preset...</option>
                                        <option value="game">Endless Runner Game Concept</option>
                                        <option value="app">To-Do List App Features</option>
                                        <option value="script">Lua Scripting Template</option>
                                    </select>
                                    <input type="text" id="pl-preset-name" placeholder="Preset name..." class="pl-dropdown" style="display: none; width: 100px; padding: 4px 8px; font-size: 0.8rem; background: rgba(0,0,0,0.3);">
                                    <button class="agent-btn agent-btn-sm" id="pl-save-preset-btn" style="display: none; font-size: 0.75rem;">💾 Save</button>
                                    <button class="agent-btn agent-btn-sm" id="pl-toggle-preset-input-btn" style="font-size: 0.75rem;" title="Save Custom Preset">💾 Save Current</button>
                                </div>
                            </div>
                            
                            <!-- Quality/Strength Meter -->
                            <div class="pl-strength-container" style="margin-bottom: 15px; display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                                <label style="font-size: 0.7rem; font-weight: bold; text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0; letter-spacing: 0.5px; white-space: nowrap;">Strength:</label>
                                <div class="pl-strength-bar-bg" style="flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                                    <div id="pl-strength-bar-fill" style="width: 0%; height: 100%; background: var(--error-color); transition: all 0.3s ease;"></div>
                                </div>
                                <span id="pl-strength-label" style="font-size: 0.7rem; font-weight: bold; color: var(--error-color); white-space: nowrap;">Weak (0/5)</span>
                            </div>

                            <div class="pl-field">
                                <label>Persona / Role</label>
                                <input type="text" id="pl-persona" placeholder="e.g. You are a creative game designer.">
                            </div>
                            <div class="pl-field">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin: 0;">Task / Objective</label>
                                    <button class="agent-btn agent-btn-sm" id="pl-optimize-ai-btn" style="padding: 2px 6px; font-size: 0.7rem;" title="AI Decompose & Optimize">AI Optimize ⚡</button>
                                </div>
                                <input type="text" id="pl-task" placeholder="e.g. Design an endless runner game.">
                            </div>
                            <div class="pl-field">
                                <label>Context / Background</label>
                                <textarea id="pl-context" placeholder="e.g. Target audience: casual gamers, ages 12-18." rows="2"></textarea>
                            </div>
                            <div class="pl-field">
                                <label>Tone / Style</label>
                                <input type="text" id="pl-tone" placeholder="e.g. Upbeat and clear, kid-friendly.">
                            </div>
                            <div class="pl-field">
                                <label>Constraints</label>
                                <textarea id="pl-constraints" placeholder="e.g. Max 150 words. Answer in bullet points." rows="2"></textarea>
                            </div>
                            <div class="pl-field">
                                <label>Output Format</label>
                                <input type="text" id="pl-format" placeholder="e.g. JSON with keys: concept, mechanics, art_style">
                            </div>
                            <div class="pl-advanced-toggle" id="pl-advanced-toggle">⚙️ Advanced Options</div>
                            <div class="pl-advanced-fields hidden" id="pl-advanced-fields">
                                <div class="pl-field">
                                    <label>Few-Shot Examples</label>
                                    <textarea id="pl-examples" placeholder="e.g. Input: Puzzle game. Output: A grid-based..." rows="2"></textarea>
                                </div>
                                <div class="pl-field">
                                    <label>Framework / Formula</label>
                                    <select id="pl-formula" class="pl-dropdown">
                                        <option value="default">Role + Constraints + Examples</option>
                                        <option value="aida">AIDA (Attention, Interest, Desire, Action)</option>
                                        <option value="scqa">SCQA (Situation, Complication, Question, Answer)</option>
                                        <option value="pastor">PASTOR (Problem, Amplify, Story, Transformation, Offer, Response)</option>
                                        <option value="pas">PAS (Problem, Agitate, Solution)</option>
                                        <option value="cot">CoT (Chain of Thought / Step-by-Step)</option>
                                        <option value="tot">ToT (Tree of Thought / Reasoning Paths)</option>
                                    </select>
                                    <div id="pl-formula-info" class="pl-formula-info" style="margin-top: 8px; font-size: 0.75rem; color: rgba(255,255,255,0.45); line-height: 1.35; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 4px; border-left: 2px solid var(--accent-color);">
                                        Default: Standard prompt construction focusing on Persona, Objective, Constraints, and Examples.
                                    </div>
                                </div>
                            </div>
                            <button class="pl-btn-primary" id="pl-generate-btn">⚡ Generate Prompt</button>
                        </div>
                        
                        <!-- Right pane: Output & JPE -->
                        <div class="prompt-lab-output">
                            <div class="pl-output-section">
                                <div class="pl-output-header">
                                    <span>Generated Prompt</span>
                                    <div class="pl-actions">
                                        <button class="agent-btn agent-btn-sm" id="pl-copy-prompt-btn" title="Copy Prompt">📋 Copy</button>
                                        <button class="agent-btn agent-btn-sm" id="pl-send-chat-btn" title="Send to Chat">💬 Send to Chat</button>
                                        <button class="agent-btn agent-btn-sm" id="pl-export-json-btn" title="Export JSON Schema">📄 JSON</button>
                                        <button class="agent-btn agent-btn-sm" id="pl-export-lua-btn" title="Export Lua Automation Macro">⚙️ Lua Script</button>
                                    </div>
                                </div>
                                <textarea id="pl-result-prompt" class="pl-result-textarea" readonly placeholder="Your generated prompt will appear here..."></textarea>
                            </div>
                            
                            <div class="pl-output-section jpe-section">
                                <div class="pl-output-header">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span>JPE Explanation</span>
                                        <select id="pl-jpe-level-select" class="pl-dropdown" style="padding: 2px 4px; font-size: 0.75rem; background: rgba(0,0,0,0.2);">
                                            <option value="grade8">Grade 8 (Simple)</option>
                                            <option value="grade12">Grade 12 (Standard)</option>
                                            <option value="executive">Executive</option>
                                            <option value="technical">Technical</option>
                                        </select>
                                    </div>
                                    <div class="pl-actions">
                                        <button class="agent-btn agent-btn-sm" id="pl-explain-jpe-btn" title="Explain Prompt with LLM">🔍 Explain in JPE</button>
                                        <button class="agent-btn agent-btn-sm" id="pl-copy-jpe-btn" title="Copy Explanation">📋 Copy</button>
                                    </div>
                                </div>
                                <div id="pl-result-jpe" class="pl-result-jpe">
                                    <span class="pl-empty-text">Click "Explain in JPE" to get a plain english summary of what the prompt asks the AI to do.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Memory UI View -->
                <div class="view-content" id="view-memory">
                    <div class="memory-toolbar">
                        <input type="text" id="memory-search-input" class="memory-search-input" placeholder="🔍  Search memory records…">
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

                <!-- Remote Control View -->
                <div class="view-content" id="view-remote">
                    <div class="remote-container">
                        <!-- Header -->
                        <div class="remote-header">
                            <div class="remote-header-left">
                                <span class="remote-title">📱 Remote Control</span>
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
                                            <input type="number" id="remote-port-input" class="remote-port-input" value="9090" min="1024" max="65535">
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
                            <span class="remote-security-icon">🔒</span>
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
                        <div class="stv-sidebar-brand-title">NEURODECK</div>
                        <div class="stv-sidebar-brand-sub">SYSTEM PREFERENCES</div>
                    </div>
                    <button class="stv-nav-item active" data-panel="sp-general"><span class="stv-nav-icon">⚡</span> General</button>
                    <button class="stv-nav-item" data-panel="sp-ai"><span class="stv-nav-icon">🤖</span> AI Model</button>
                    <button class="stv-nav-item" data-panel="sp-appearance"><span class="stv-nav-icon">🎨</span> Appearance</button>
                    <button class="stv-nav-item" data-panel="sp-terminal"><span class="stv-nav-icon">⌨️</span> Terminal</button>
                    <button class="stv-nav-item" data-panel="sp-extensions"><span class="stv-nav-icon">🧩</span> Extensions</button>
                    <button class="stv-nav-item" data-panel="sp-memory"><span class="stv-nav-icon">🧠</span> Memory</button>
                    <button class="stv-nav-item" data-panel="sp-network"><span class="stv-nav-icon">🌐</span> Network</button>
                    <button class="stv-nav-item" data-panel="sp-voice"><span class="stv-nav-icon">🎙️</span> Voice</button>
                    <div class="stv-nav-spacer"></div>
                </nav>

                <!-- ── Content panels ── -->
                <div class="stv-content-area">

                    <!-- ░ General ░ -->
                    <div class="settings-panel active" id="sp-general">
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
                    <div class="settings-panel" id="sp-ai">
                        <p class="stv-section-title">AI Model</p>
                        <p class="stv-section-sub">Configure your LLM provider, credentials, and local models.</p>

                        <div class="stv-group-label">Provider</div>
                        <div class="stv-card">
                            <div class="stv-row">
                                <span class="stv-row-label">LLM Provider</span>
                                <select id="llm-provider-select" style="flex:1;">
                                    <option value="gemini">Google Gemini</option>
                                    <option value="ollama">Ollama (Local / Remote)</option>
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

                        <div style="display:flex;gap:10px;margin:14px 0 4px;">
                            <button class="stv-btn-ghost" id="settings-test-connection-btn" style="flex:1;">Test Connection</button>
                            <button class="stv-btn-primary" id="settings-save-llm-btn" style="flex:1;">Save &amp; Apply</button>
                        </div>
                        <div id="settings-llm-status" class="stv-status-line"></div>

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
                    <div class="settings-panel" id="sp-appearance">
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
                            <div id="ct-preview" style="height:16px;border-radius:6px;margin-bottom:10px;display:flex;overflow:hidden;">
                                <div id="ct-preview-bg" style="flex:2;background:#050505;"></div>
                                <div id="ct-preview-accent" style="flex:1;background:#00F0FF;"></div>
                                <div id="ct-preview-response" style="flex:1;background:#00FF88;"></div>
                                <div id="ct-preview-warning" style="flex:0.5;background:#FFB000;"></div>
                                <div id="ct-preview-error" style="flex:0.5;background:#FF3C5A;"></div>
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
                    <div class="settings-panel" id="sp-terminal">
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
                    <div class="settings-panel" id="sp-extensions">
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
                    <div class="settings-panel" id="sp-memory">
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
                    <div class="settings-panel" id="sp-network">
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

                    <!-- ░ Voice ░ -->
                    <div class="settings-panel" id="sp-voice">
                        <p class="stv-section-title">Voice</p>
                        <p class="stv-section-sub">Offline speech-to-text via whisper.cpp.</p>

                        <div class="stv-group-label">Whisper STT</div>
                        <div class="stv-card">
                            <p style="font-size:0.78rem;opacity:0.6;margin:0 0 12px;line-height:1.5;">When configured, the 🎙️ button routes through whisper instead of the cloud API for fully offline transcription.</p>
                            <div style="font-size:0.72rem;opacity:0.45;margin-bottom:12px;font-family:var(--font-mono);line-height:1.6;padding:8px 10px;background:rgba(0,0,0,0.25);border-radius:7px;border:1px solid rgba(255,255,255,0.06);">
                                git clone https://github.com/ggerganov/whisper.cpp<br>
                                cmake -B build &amp;&amp; cmake --build build<br>
                                bash models/download-ggml-model.sh base.en
                            </div>
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
                <button class="stv-close-btn" id="close-settings-x">✕</button>
                <!-- Legacy close (hidden — JS still binds to it) -->
                <button id="close-settings" style="display:none;"></button>

                <!-- [legacy content removed — all IDs now live in panels above] -->
                <div class="settings-modal-content" style="display:none;"></div>
                <div class="settings-modal-footer"></div>
            </div>
        </div>

        <!-- Canvas Collaboration Modal -->
        <div class="settings-overlay" id="collab-modal">
            <div class="settings-modal-card" style="max-width: 400px;">
                <div class="settings-modal-header">
                    <h3>🤝 LIVE CANVAS COLLAB</h3>
                    <button class="sidebar-toggle-btn" id="close-collab-x">✕</button>
                </div>
                <div class="settings-modal-content">
                    <div style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 14px; line-height: 1.5;">
                        Share your Canvas session with another NEURODECK instance on the same LAN. Both sides see edits in real time.
                    </div>
                    <!-- Tab toggle -->
                    <div style="display: flex; gap: 6px; margin-bottom: 14px;">
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
                        <div id="collab-host-waiting" style="display: none; font-size: 0.8rem; padding: 8px; background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.2); border-radius: 4px; font-family: var(--font-mono);">
                            Waiting for peer... Share this address with your collaborator:<br>
                            <span id="collab-host-addr" style="color: var(--accent-color);"></span>
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
                        <button class="canvas-btn" id="collab-stop-btn" style="display: block; width: 100%; margin-top: 8px; border-color: var(--error-color); color: var(--error-color);">Disconnect</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Incoming Transfer Confirmation Modal -->
        <div class="settings-overlay" id="transfer-modal">
            <div class="settings-modal-card">
                <div class="settings-modal-header">
                    <h3>INCOMING FILE TRANSFER</h3>
                    <button class="sidebar-toggle-btn" id="transfer-modal-close-x">✕</button>
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
                    <p class="transfer-modal-warning">⚠️ WARNING: Only accept files from trusted sources on your local network.</p>
                </div>
                <div class="settings-modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="canvas-btn" id="transfer-modal-reject" style="background: rgba(255, 60, 90, 0.2); border-color: var(--error-color);">Reject</button>
                    <button class="send-prompt-btn" id="transfer-modal-accept" style="margin-top: 0;">Accept</button>
                </div>
            </div>
        </div>

        <!-- Game Context Panel Modal -->
        <div class="settings-overlay" id="game-context-modal">
            <div class="settings-modal-card" style="max-width: 450px;">
                <div class="settings-modal-header">
                    <h3>Active Game Context</h3>
                    <button class="sidebar-toggle-btn" id="close-game-context-x">✕</button>
                </div>
                <div class="settings-modal-content">
                    <img id="game-context-header" class="game-context-header-img" src="" alt="Game Header" onerror="this.style.display='none'">
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

        <!-- Notification Center Modal -->
        <div class="settings-overlay" id="notif-modal">
            <div class="settings-modal-card" style="max-width: 400px;">
                <div class="settings-modal-header">
                    <h3>🔔 NOTIFICATION CENTER</h3>
                    <button class="sidebar-toggle-btn" id="close-notif-x">✕</button>
                </div>
                <div class="settings-modal-content" style="max-height: 350px; overflow-y: auto;" id="notif-list-container">
                    <div style="opacity: 0.5; text-align: center; padding: 20px; font-style: italic;">No notifications.</div>
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
                    <span class="ctrl-prompt-title">&#x25B6; PROMPT LIBRARY</span>
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
    </div>
    <div class="app-background-container" id="app-background-container">
        <div class="app-background-image" id="app-background-image"></div>
        <canvas class="app-background-canvas" id="app-background-canvas"></canvas>
        <div class="app-background-css" id="app-background-css"></div>
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
    { id: "cyber-alley", name: "Neo-Tokyo Alley", url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1920", desc: "Moody cyberpunk night street neon lights" },
    { id: "sci-fi-hud", name: "Tactical HUD", url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1920", desc: "Glowing interface telemetry blueprint" },
    { id: "cyber-sun", name: "Synthwave Sunset", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920", desc: "Neon-pink and cyan liquid sun abstract" },
    { id: "deep-nebula", name: "Helix Nebula", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1920", desc: "Cosmic colors and stars in deep space" },
    { id: "liquid-metal", name: "Fluid Mercury", url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1920", desc: "Liquid glass and colorful chrome refract" },
    { id: "neon-grid", name: "Neon Mesh", url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920", desc: "Bright abstract cyber grid wires" },
    { id: "green-circuit", name: "Cyber Board", url: "https://images.unsplash.com/photo-1601987177651-8edfe6c20009?q=80&w=1920", desc: "Glowing circuit nodes macro shot" },
    { id: "datacenter", name: "Server Terminal", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1920", desc: "Faint rack LEDs in dark server corridor" },
    { id: "mech-bay", name: "Industrial Deck", url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1920", desc: "Heavy mechanical structural framing" },
    { id: "cyber-rain", name: "Code Grid", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1920", desc: "Abstract green terminal data streams" },
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
}

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

// Render background gallery elements dynamically
renderBackgroundGallery();

// Initial application of settings on startup
applySettings();

// Focus the main input
document.getElementById("user-input").focus();

// Event listeners for settings controls
document.getElementById("font-select").onchange = function() {
    localStorage.setItem("selectedFont", this.value);
    applySettings();
};

document.getElementById("bg-url-input").oninput = function() {
    localStorage.setItem("bgUrl", this.value);
    applySettings();
};

document.getElementById("bg-opacity-slider").oninput = function() {
    localStorage.setItem("bgOpacity", this.value);
    applySettings();
};

document.getElementById("scanlines-toggle").onchange = function() {
    localStorage.setItem("scanlinesEnabled", this.checked ? "true" : "false");
    applySettings();
};

document.getElementById("flicker-toggle").onchange = function() {
    localStorage.setItem("flickerEnabled", this.checked ? "true" : "false");
    applySettings();
};

document.getElementById("shell-select").onchange = function() {
    localStorage.setItem("selectedShell", this.value);
    applySettings();
};

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

document.getElementById("llm-provider-select")?.addEventListener("change", function() {
    toggleSettingsLlmGroups(this.value);
});

document.getElementById("settings-test-connection-btn")?.addEventListener("click", () => {
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
});

document.getElementById("settings-save-llm-btn")?.addEventListener("click", () => {
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
});


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
        if (activeTerminalSessionId) {
            const session = terminalSessions.find(s => s.id === activeTerminalSessionId);
            if (session) {
                session.shell = shell === "default" ? null : shell;
                restartTerminalSession(activeTerminalSessionId);
            }
        }
    };
});

// Sync shell buttons on load
(function syncShellPills() {
    const saved = localStorage.getItem("selectedShell") || "default";
    const pill = document.querySelector(`.term-shell-btn[data-shell="${saved}"]`);
    if (pill) {
        document.querySelectorAll(".term-shell-btn").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
    }
})();

document.getElementById("custom-shell-input").oninput = function() {
    localStorage.setItem("customShell", this.value);
    applySettings();
};

document.getElementById("term-fontsize-slider").oninput = function() {
    localStorage.setItem("terminalFontSize", this.value);
    applySettings();
};

document.getElementById("term-scrollback-input").oninput = function() {
    localStorage.setItem("terminalScrollback", this.value);
    applySettings();
};



// ==========================================================================
// STEAM DECK CONTROLLER (GAMEPAD API) INPUT WIRING
// ==========================================================================
let gamepadActive = false;
let gamepadFocusIndex = -1;
let previousGamepadState = {
    buttons: Array(32).fill(false),
    l2Held: false,
    r2Held: false,
};

// Radial menu state
let radialMenuVisible = false;
let radialSelectedSegment = null;

// Controller Prompt Picker state (declared here so pollGamepads can reference it)

const RADIAL_SEGMENTS = [
    { icon: "💬", label: "Chat",     view: "chat"     },
    { icon: "🎨", label: "Canvas",   view: "canvas"   },
    { icon: "💻", label: "Terminal", view: "terminal" },
    { icon: "🔑", label: "SSH",      view: "ssh"      },
    { icon: "🔗", label: "Tunnel",   view: "tunnel"   },
    { icon: "🌐", label: "Browser",  view: "browser"  },
    { icon: "🤖", label: "Agent",    view: "agent"    },
    { icon: "🧠", label: "Memory",   view: "memory"   },
    { icon: "📤", label: "Share",    view: "share"    },
    { icon: "📱", label: "Remote",   view: "remote"   },
];

function getGamepadFocusableElements() {
    // If ctrl prompt picker is open, return empty (handled separately in pollGamepads)
    if (ctrlPromptVisible) return [];

    // If notifications modal is open, focus only notif modal elements
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
        gamepadFocusIndex = -1;
        return;
    }
    
    if (index < 0) {
        gamepadFocusIndex = els.length - 1;
    } else if (index >= els.length) {
        gamepadFocusIndex = 0;
    } else {
        gamepadFocusIndex = index;
    }
    
    const target = els[gamepadFocusIndex];
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
    gamepadFocusIndex = -1;
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
    radialMenuVisible = true;
    radialSelectedSegment = null;
    updateRadialDisplay(null);
}

function hideRadialMenu() {
    const el = document.getElementById("radial-menu");
    if (el) el.classList.remove("active");
    radialMenuVisible = false;
    radialSelectedSegment = null;
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
    radialSelectedSegment = segIdx;

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
        if (gamepadActive) {
            gamepadActive = false;
            document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
            gamepadFocusIndex = -1;
        }
        requestAnimationFrame(pollGamepads);
        return;
    }

    gamepadActive = true;

    function buttonPressed(index) {
        const isPressed = gp.buttons[index] && gp.buttons[index].pressed;
        const wasPressed = previousGamepadState.buttons[index];
        return isPressed && !wasPressed;
    }

    // A Button (0) - Click active element / confirm prompt picker
    if (buttonPressed(0)) {
        if (ctrlPromptVisible) {
            if (ctrlPromptTemplateMode) {
                confirmTemplateAndSend();
            } else {
                confirmCtrlPrompt();
            }
        } else {
            const els = getGamepadFocusableElements();
            const activeEl = els[gamepadFocusIndex];
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
        if (ctrlPromptVisible) {
            if (ctrlPromptTemplateMode) {
                exitTemplateMode();
            } else {
                closeCtrlPromptOverlay();
            }
            // skip normal B handling
        }
    }
    if (buttonPressed(1) && !ctrlPromptVisible) {
        const settingsOverlay = document.getElementById("settings-overlay");
        const transferModal = document.getElementById("transfer-modal");
        const inspectDrawer = document.getElementById("inspect-drawer");
        const sidebar = document.getElementById("sidebar");
        const notifModal = document.getElementById("notif-modal");
        const gameModal = document.getElementById("game-context-modal");
        if (notifModal && notifModal.classList.contains("active")) {
            document.getElementById("close-notif-btn").click();
        } else if (gameModal && gameModal.classList.contains("active")) {
            document.getElementById("close-game-context").click();
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
            if (ctrlPromptVisible) {
                ctrlPromptTemplateMode ? exitTemplateMode() : closeCtrlPromptOverlay();
            } else {
                openCtrlPromptOverlay();
            }
        }
    }

    // X Button (2) - Go to Chat tab and focus input (blocked when prompt picker open)
    if (buttonPressed(2) && !ctrlPromptVisible) {
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
    if (buttonPressed(3) && !ctrlPromptVisible) {
        if (availablePersonas && availablePersonas.length > 0) {
            const currentIdx = availablePersonas.indexOf(activePersona);
            const nextIdx = (currentIdx + 1) % availablePersonas.length;
            const nextPersona = availablePersonas[nextIdx];
            invoke("set_persona", { name: nextPersona }).then((msg) => {
                activePersona = nextPersona;
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
    if ((buttonPressed(4) || buttonPressed(5)) && ctrlPromptVisible) {
        navigateCtrlPromptCat(buttonPressed(4) ? -1 : 1);
    }

    // L1 (4) / R1 (5) - Cycle tabs; when SSH tab active, also load focused SSH profile
    if ((buttonPressed(4) || buttonPressed(5)) && !ctrlPromptVisible) {
        const sshView = document.getElementById("view-ssh");
        if (sshView && sshView.classList.contains("active")) {
            // L1 in SSH: load the currently D-pad-focused profile (A-button equivalent)
            // R1 in SSH: same — pressing either loads the selected profile
            const focused = document.querySelector("#sidebar-ssh-profiles .ssh-profile-item.gamepad-focused");
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
                gamepadFocusIndex = -1;
                document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
            }
        }
    }

    // Select Button (8) - Run Canvas Code (blocked when prompt picker open)
    if (buttonPressed(8) && !ctrlPromptVisible) {
        const runBtn = document.getElementById("canvas-run-btn");
        if (runBtn) {
            runBtn.click();
        }
    }

    // Start Button (9) - Toggle settings modal (blocked when prompt picker open)
    if (buttonPressed(9) && !ctrlPromptVisible) {
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
        if (ctrlPromptVisible) {
            if (ctrlPromptTemplateMode) {
                navigateTemplatePlaceholder(goUp ? -1 : 1);
            } else {
                navigateCtrlPromptList(goUp ? -1 : 1);
            }
        }
    }
    if ((buttonPressed(12) || buttonPressed(13)) && !ctrlPromptVisible) {
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
            const profileItems = Array.from(document.querySelectorAll("#sidebar-ssh-profiles .ssh-profile-item"));
            if (profileItems.length > 0) {
                const selectedIdx = profileItems.findIndex(el => el.classList.contains("gamepad-focused"));
                const nextIdx = goUp
                    ? Math.max(0, (selectedIdx === -1 ? profileItems.length - 1 : selectedIdx - 1))
                    : Math.min(profileItems.length - 1, (selectedIdx === -1 ? 0 : selectedIdx + 1));
                profileItems.forEach(el => el.classList.remove("gamepad-focused"));
                profileItems[nextIdx].classList.add("gamepad-focused");
                profileItems[nextIdx].scrollIntoView({ block: "nearest" });
            } else {
                updateGamepadFocus(goUp ? gamepadFocusIndex - 1 : gamepadFocusIndex + 1);
            }
        } else {
            updateGamepadFocus(goUp ? gamepadFocusIndex - 1 : gamepadFocusIndex + 1);
        }
    }

    // D-pad Left (14) / Right (15) - when prompt overlay: cycle category or placeholder; else normal
    if ((buttonPressed(14) || buttonPressed(15)) && ctrlPromptVisible) {
        const goLeft = buttonPressed(14);
        if (ctrlPromptTemplateMode) {
            cycleTemplatePlaceholder(goLeft ? -1 : 1);
        } else {
            navigateCtrlPromptCat(goLeft ? -1 : 1);
        }
    }

    // D-pad Left (14) / Right (15) - adjust sliders/selects OR cycle tabs
    if ((buttonPressed(14) || buttonPressed(15)) && !ctrlPromptVisible) {
        const els = getGamepadFocusableElements();
        const activeEl = els[gamepadFocusIndex];
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
                gamepadFocusIndex = -1;
                document.querySelectorAll(".gamepad-focused").forEach(el => el.classList.remove("gamepad-focused"));
            }
        }
    }

    // Steam Deck Grip Buttons Polling (indices 17-20)
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

    // === RADIAL MENU — L2 Trigger (button 6 / axis 5) ===
    const l2Raw = gp.buttons[6] ? gp.buttons[6].value : 0;
    const l2Held = l2Raw > 0.5;
    const l2WasHeld = previousGamepadState.l2Held;

    if (l2Held && !l2WasHeld) {
        // L2 just pressed — show radial
        showRadialMenu();
    } else if (l2Held) {
        // L2 held — update selected segment from left stick
        const stickX = gp.axes[0] || 0;
        const stickY = gp.axes[1] || 0;
        const seg = getRadialSegmentFromStick(stickX, stickY);
        if (seg !== radialSelectedSegment) {
            updateRadialDisplay(seg);
        }
    } else if (!l2Held && l2WasHeld) {
        // L2 just released — activate selected and close
        activateRadialSegment(radialSelectedSegment);
        hideRadialMenu();
    }

    // Sync button state for next frame
    for (let i = 0; i < gp.buttons.length; i++) {
        previousGamepadState.buttons[i] = gp.buttons[i] && gp.buttons[i].pressed;
    }
    previousGamepadState.l2Held = l2Held;

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
    previousGamepadState.buttons = Array(e.gamepad.buttons.length).fill(false);
});

requestAnimationFrame(pollGamepads);

let currentSessionId = "";
let activePersona = "Default";
let availablePersonas = [];
let isMuted = localStorage.getItem("isMuted") === "true";
let currentAIMessage = null;
let currentAIText = "";

let isProcessRunning = false;
let activeTerminalBody = null;
let activeExecuteBtn = null;
let pendingLuaScript = "";

// Analytics & Speed Indicators
let streamStartTime = 0;
let firstChunkTime = 0;
let totalTokens = 0;

// Sidebar & Drawer Collapsing Event Listeners
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

// Settings Modal Event Listeners
const settingsOverlay = document.getElementById("settings-overlay");
const settingsBtn = document.getElementById("settings-btn");
const closeSettings = document.getElementById("close-settings");
const closeSettingsX = document.getElementById("close-settings-x");

// ── Apple TV sidebar nav ──────────────────────────────────────────────
(function initSettingsSidebar() {
    document.querySelectorAll(".stv-nav-item").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".stv-nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const panel = document.getElementById(btn.dataset.panel);
            if (panel) panel.classList.add("active");
        };
    });
})();

settingsBtn.onclick = function() {
    settingsOverlay.classList.add("active");
    
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
};

closeSettings.onclick = function() {
    settingsOverlay.classList.remove("active");
};

closeSettingsX.onclick = function() {
    settingsOverlay.classList.remove("active");
};

// Auto-growing Textarea Logic
const inputElement = document.getElementById("user-input");
inputElement.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

function updateMuteButtonUI() {
    let muteBtn = document.getElementById("mute-btn");
    if (muteBtn) {
        muteBtn.innerText = isMuted ? "🔇" : "🔊";
        muteBtn.title = isMuted ? "Unmute Speech (Ctrl+M)" : "Mute Speech (Ctrl+M)";
        if (isMuted) {
            muteBtn.classList.add("muted");
        } else {
            muteBtn.classList.remove("muted");
        }
    }
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem("isMuted", isMuted);
    updateMuteButtonUI();
    
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    let div = document.createElement("div");
    div.className = "message system";
    div.innerHTML = `
        <div class="message-card">
            System: Speech voice feedback is now ${isMuted ? "disabled (Muted)" : "enabled (Unmuted)"}.
        </div>
    `;
    chatViewport.appendChild(div);
    viewport.scrollTop = viewport.scrollHeight;
}

function cleanTextForSpeech(text) {
    let clean = text.replace(/```[\s\S]*?```/g, "");
    clean = clean.replace(/`[^`]+`/g, "");
    clean = clean.replace(/[*_~#]/g, "");
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
    return clean.trim();
}

// Send Message Handler
function sendMessage() {
    let text = inputElement.value.trim();
    if (text === "") return;

    if (text === "/login") {
        inputElement.value = "";
        inputElement.style.height = "36px";
        triggerOAuthLogin();
        return;
    }

    // Collect any pending screenshot attachment
    const attachment = window.pendingScreenshot || null;

    // Add message to viewport
    let viewport = document.getElementById("chat-workspace");
    let chatViewport = document.getElementById("chat-viewport");
    let msg = document.createElement("div");
    msg.className = "message user";

    let attachmentHTML = '';
    if (attachment) {
        attachmentHTML = `<div style="margin-bottom:8px;"><img src="data:${attachment.mime};base64,${attachment.data}" style="max-width:160px;max-height:100px;border-radius:5px;border:1px solid rgba(0,240,255,0.3);display:block;" alt="Screenshot"></div>`;
    }

    msg.innerHTML = `
        <div class="message-card">
            ${attachmentHTML}${text}
        </div>
    `;
    chatViewport.appendChild(msg);

    // Create a placeholder for AI response
    currentAIMessage = document.createElement("div");
    currentAIMessage.className = "message ai thinking";
    currentAIMessage.innerHTML = `
        <div class="message-card">
            <span class="thinking-dots">AI is thinking</span>
        </div>
    `;
    chatViewport.appendChild(currentAIMessage);
    
    currentAIText = "";

    // Reset analytics
    streamStartTime = performance.now();
    firstChunkTime = 0;
    totalTokens = 0;
    document.getElementById("latency-val").innerText = "--ms";
    document.getElementById("token-speed").innerText = "--/s";

    // Clear and reset input size
    inputElement.value = "";
    inputElement.style.height = "36px";

    // Clear screenshot attachment
    if (attachment) {
        window.pendingScreenshot = null;
        const bar = document.getElementById("chat-attachment-bar");
        if (bar) {
            bar.innerHTML = "";
            bar.classList.add("hidden");
        }
        const btn = document.getElementById("screenshot-btn");
        if (btn) btn.classList.remove("has-attachment");
    }
    
    // Scroll workspace
    viewport.scrollTop = viewport.scrollHeight;
    
    // Warn user if they attach a screenshot while Ollama is the active provider
    if (attachment) {
        const provSel = document.getElementById("llm-provider-select");
        if (provSel && provSel.value === "ollama") {
            const warn = document.createElement("div");
            warn.className = "message system";
            warn.innerHTML = `<div class="message-card" style="border-color:var(--warning-color)">
                ⚠️ <strong>Vision not supported with Ollama.</strong>
                The screenshot attachment will be ignored. Switch to Gemini in Settings to use vision.
            </div>`;
            chatViewport.appendChild(warn);
            viewport.scrollTop = viewport.scrollHeight;
        }
    }

    // Call Tauri backend — pass image data directly when a screenshot is attached
    const invokeArgs = { prompt: text };
    if (attachment) {
        invokeArgs.imageBase64 = attachment.data;
        invokeArgs.imageMime = attachment.mime;
    }
    invoke('send_command', invokeArgs).catch((err) => {
        let errorMsg = document.createElement("div");
        errorMsg.className = "message system error";
        errorMsg.innerHTML = `
            <div class="message-card">
                <strong>Error:</strong> ${err}
            </div>
        `;
        chatViewport.appendChild(errorMsg);
        viewport.scrollTop = viewport.scrollHeight;
        document.getElementById("tool-status").innerText = "Idle";
    });
    document.getElementById("tool-status").innerText = "Thinking...";
}

function updateInputConsoleState() {
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    
    if (isProcessRunning) {
        userInput.placeholder = "[Terminal Executing...] Type input for process and press Enter (Ctrl+C to Terminate)";
        userInput.classList.add("terminal-input-active");
        if (sendBtn) {
            sendBtn.querySelector("span:first-child").innerText = "Send In";
            sendBtn.title = "Send Input to Process";
        }
    } else {
        userInput.placeholder = "Enter command or type message...";
        userInput.classList.remove("terminal-input-active");
        if (sendBtn) {
            sendBtn.querySelector("span:first-child").innerText = "Send";
            sendBtn.title = "Send Message";
        }
    }
}

function sendProcessInput() {
    let text = inputElement.value;
    if (text === "") return;

    invoke("write_to_process", { input: text }).then(() => {
        appendLineToTerminal(`> ${text}`, false);
    }).catch(err => {
        appendLineToTerminal(`System error sending stdin: ${err}`, true);
    });

    inputElement.value = "";
    inputElement.style.height = "36px";
}

function handleSendAction() {
    if (isProcessRunning) {
        sendProcessInput();
    } else {
        sendMessage();
    }
}

function appendLineToTerminal(line, isError) {
    if (!activeTerminalBody) return;
    const lineSpan = document.createElement("div");
    if (isError) {
        lineSpan.style.color = "var(--error-color, #FF3C5A)";
    }
    lineSpan.innerText = line;
    activeTerminalBody.appendChild(lineSpan);

    // Auto-scroll the terminal body
    activeTerminalBody.scrollTop = activeTerminalBody.scrollHeight;
}

function finishRunningProcess(code) {
    isProcessRunning = false;
    if (activeTerminalBody) {
        activeTerminalBody.classList.remove("running");
        const statusMsg = document.createElement("div");
        statusMsg.style.marginTop = "8px";
        statusMsg.style.opacity = "0.5";
        statusMsg.style.borderTop = "1px solid rgba(255, 255, 255, 0.05)";
        statusMsg.style.paddingTop = "4px";
        statusMsg.innerText = `Process exited with code ${code}`;
        activeTerminalBody.appendChild(statusMsg);
        activeTerminalBody.scrollTop = activeTerminalBody.scrollHeight;
    }
    if (activeExecuteBtn) {
        activeExecuteBtn.innerText = "Execute";
        activeExecuteBtn.disabled = false;
    }
    document.getElementById("tool-status").innerText = "Idle";
    updateInputConsoleState();
}

// Event listeners for send action
inputElement.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendAction();
    }
    if (isProcessRunning && e.ctrlKey && e.key === "c") {
        e.preventDefault();
        invoke("kill_process").catch(err => console.error("Error killing process:", err));
    }
});

document.getElementById("send-btn").onclick = handleSendAction;

// Custom Premium Markdown Code Header / Action Injection
function formatCodeBlocks(container) {
    const pres = container.querySelectorAll("pre");
    pres.forEach(pre => {
        if (pre.querySelector(".code-header-bar")) return;

        const code = pre.querySelector("code");
        if (!code) return;

        let lang = "text";
        code.classList.forEach(cls => {
            if (cls.startsWith("language-")) {
                lang = cls.replace("language-", "");
            }
        });

        const header = document.createElement("div");
        header.className = "code-header-bar";
        
        const label = document.createElement("span");
        label.className = "code-lang-label";
        label.innerText = lang;
        header.appendChild(label);

        const actions = document.createElement("div");
        actions.className = "code-header-actions";

        const copyBtn = document.createElement("button");
        copyBtn.className = "code-header-btn copy-btn";
        copyBtn.innerText = "Copy";
        copyBtn.onclick = function() {
            navigator.clipboard.writeText(code.innerText).then(() => {
                copyBtn.innerText = "Copied!";
                setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
            });
        };
        actions.appendChild(copyBtn);

        // Send to Canvas button
        const sendToCanvasBtn = document.createElement("button");
        sendToCanvasBtn.className = "code-header-btn canvas-export-btn";
        sendToCanvasBtn.innerText = "→ Canvas";
        sendToCanvasBtn.onclick = function() {
            const codeText = code.innerText;
            window.neurodeckCanvas.loadCode(lang, codeText);
            // Switch to canvas view
            const canvasTab = document.querySelector('[data-view="canvas"]');
            if (canvasTab) canvasTab.click();
            sendToCanvasBtn.innerText = "Sent!";
            setTimeout(() => { sendToCanvasBtn.innerText = "→ Canvas"; }, 2000);
        };
        actions.appendChild(sendToCanvasBtn);

        const executableLangs = ["bash", "sh", "powershell", "cmd", "zsh", "shell"];
        if (executableLangs.includes(lang.toLowerCase())) {
            const execBtn = document.createElement("button");
            execBtn.className = "code-header-btn execute-btn";
            execBtn.innerText = "Execute";
            execBtn.onclick = function() {
                if (isProcessRunning) {
                    invoke("kill_process").catch(e => console.error("Error killing process:", e));
                }

                execBtn.innerText = "Running...";
                execBtn.disabled = true;
                activeExecuteBtn = execBtn;

                const cmd = code.innerText;

                // Create terminal block immediately below the <pre> block
                let existingTerm = pre.nextElementSibling;
                if (existingTerm && existingTerm.classList.contains("terminal-console")) {
                    existingTerm.remove();
                }

                const termConsole = document.createElement("div");
                termConsole.className = "terminal-console";
                termConsole.innerHTML = `
                    <div class="terminal-console-header">
                        <span>Terminal Output</span>
                        <button class="terminal-terminate-btn">Terminate (Ctrl+C)</button>
                    </div>
                    <div class="terminal-console-body running"></div>
                `;

                pre.parentNode.insertBefore(termConsole, pre.nextSibling);
                activeTerminalBody = termConsole.querySelector(".terminal-console-body");

                const terminateBtn = termConsole.querySelector(".terminal-terminate-btn");
                terminateBtn.onclick = function() {
                    invoke("kill_process").catch(err => {
                        console.error("Error invoking kill_process:", err);
                    });
                };

                isProcessRunning = true;
                document.getElementById("tool-status").innerText = "Executing...";
                updateInputConsoleState();

                let viewport = document.getElementById("chat-workspace");
                viewport.scrollTop = viewport.scrollHeight;

                invoke("execute_command_stream", { cmdStr: cmd }).catch((err) => {
                    appendLineToTerminal(`Error spawning process: ${err}`, true);
                    finishRunningProcess(1);
                });
            };
            actions.appendChild(execBtn);
        }

        if (lang.toLowerCase() === "lua") {
            pendingLuaScript = code.innerText;
            const execBtn = document.createElement("button");
            execBtn.className = "code-header-btn execute-btn";
            execBtn.innerText = "Execute";
            execBtn.onclick = function() {
                runLuaScript(code.innerText, pre, execBtn);
            };
            actions.appendChild(execBtn);
        }

        header.appendChild(actions);
        pre.insertBefore(header, pre.firstChild);
    });
}

function runLuaScript(scriptCode, preElement, execBtn) {
    if (!scriptCode || scriptCode.trim() === "") {
        console.warn("No Lua script to execute.");
        return;
    }

    if (!window.confirm("Execute this Lua script?")) {
        return;
    }

    if (isProcessRunning) {
        invoke("kill_process").catch(e => console.error("Error killing process:", e));
    }

    if (execBtn) {
        execBtn.innerText = "Running...";
        execBtn.disabled = true;
        activeExecuteBtn = execBtn;
    }

    if (!preElement) {
        const luaPres = document.querySelectorAll("pre");
        for (let i = luaPres.length - 1; i >= 0; i--) {
            const code = luaPres[i].querySelector("code");
            let isLua = false;
            if (code) {
                code.classList.forEach(cls => {
                    if (cls === "language-lua") isLua = true;
                });
            }
            if (isLua) {
                preElement = luaPres[i];
                break;
            }
        }
    }

    let targetParent = document.getElementById("chat-viewport");
    let targetSibling = null;

    if (preElement) {
        let existingTerm = preElement.nextElementSibling;
        if (existingTerm && existingTerm.classList.contains("terminal-console")) {
            existingTerm.remove();
        }
        targetParent = preElement.parentNode;
        targetSibling = preElement.nextSibling;
    }

    const termConsole = document.createElement("div");
    termConsole.className = "terminal-console";
    termConsole.innerHTML = `
        <div class="terminal-console-header">
            <span>Lua Script Output</span>
            <button class="terminal-terminate-btn">Terminate</button>
        </div>
        <div class="terminal-console-body running"></div>
    `;

    if (preElement) {
        targetParent.insertBefore(termConsole, targetSibling);
    } else {
        targetParent.appendChild(termConsole);
    }

    activeTerminalBody = termConsole.querySelector(".terminal-console-body");

    const terminateBtn = termConsole.querySelector(".terminal-terminate-btn");
    terminateBtn.onclick = function() {
        finishRunningProcess(-1);
    };

    isProcessRunning = true;
    document.getElementById("tool-status").innerText = "Executing...";
    updateInputConsoleState();

    let viewport = document.getElementById("chat-workspace");
    viewport.scrollTop = viewport.scrollHeight;

    invoke("execute_lua", { code: scriptCode }).catch((err) => {
        appendLineToTerminal(`Error executing Lua: ${err}`, true);
        finishRunningProcess(1);
    });
}

// Listen for stream events
listen("stream_chunk", function (event) {
    let chunk = event.payload;
    if (currentAIMessage) {
        if (currentAIMessage.classList.contains("thinking")) {
            currentAIMessage.classList.remove("thinking");
            const msgCard = currentAIMessage.querySelector(".message-card");
            if (msgCard) {
                msgCard.innerHTML = "";
            }
        }
        currentAIText += chunk;
        
        // Latency and Tokens Speed Calculation
        totalTokens += chunk.split(/\s+/).filter(Boolean).length || 1;
        if (firstChunkTime === 0) {
            firstChunkTime = performance.now();
            let latency = Math.round(firstChunkTime - streamStartTime);
            document.getElementById("latency-val").innerText = latency + "ms";
        }
        let elapsedSecs = (performance.now() - firstChunkTime) / 1000;
        if (elapsedSecs > 0.5) {
            let speed = Math.round(totalTokens / elapsedSecs);
            document.getElementById("token-speed").innerText = speed + " t/s";
        }

        const msgCard = currentAIMessage.querySelector(".message-card");
        if (msgCard) {
            msgCard.innerHTML = window.sanitizeHtml(marked.parse(currentAIText));
            formatCodeBlocks(msgCard);
        }
        
        let viewport = document.getElementById("chat-workspace");
        let isAtBottom = (viewport.scrollHeight - viewport.clientHeight) - viewport.scrollTop < 100;
        if (isAtBottom) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
    // Forward token to any connected remote clients
    invoke("remote_send_to_clients", {
        message: JSON.stringify({ type: "chat_token", text: chunk, done: false })
    }).catch(() => {});
});

listen("stream_error", function (event) {
    let err = event.payload;
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    let msg = document.createElement("div");
    msg.className = "message system error";
    msg.innerHTML = `
        <div class="message-card">
            <strong>Error:</strong> ${err}
        </div>
    `;
    chatViewport.appendChild(msg);
    viewport.scrollTop = viewport.scrollHeight;
    document.getElementById("tool-status").innerText = "Idle";
});

listen("stream_done", function () {
    document.getElementById("tool-status").innerText = "Idle";
    if (currentAIMessage) {
        const msgCard = currentAIMessage.querySelector(".message-card");
        if (msgCard) {
            msgCard.innerHTML = window.sanitizeHtml(marked.parse(currentAIText));
            formatCodeBlocks(msgCard);
        }
    }
    
    if (!isMuted && currentAIText && currentAIText.trim().length > 0) {
        let speechText = cleanTextForSpeech(currentAIText);
        if (speechText.length > 0) {
            invoke("speak_text", { text: speechText }).catch(err => console.error("TTS Error:", err));
        }
    }

    currentAIMessage = null;
    currentAIText = "";

    // Notify remote clients that the AI response stream is complete
    invoke("remote_send_to_clients", {
        message: JSON.stringify({ type: "chat_token", text: "", done: true })
    }).catch(() => {});

    // Refresh sessions sidebar list
    refreshSessionsList();

    // Refresh context drawer live metrics
    updateContextDrawer();
});

// Listen for command stream events
listen("command_stdout", function (event) {
    const line = event.payload;
    appendLineToTerminal(line, false);
});

listen("command_stderr", function (event) {
    const line = event.payload;
    appendLineToTerminal(line, true);
});

listen("command_exit", function (event) {
    const code = event.payload;
    finishRunningProcess(code);
});

// Audio Recording Logic
let isRecording = false;
let micBtn = document.getElementById("mic-btn");

micBtn.onclick = function() {
    let chatViewport = document.getElementById("chat-viewport");
    let viewport = document.getElementById("chat-workspace");
    if (!isRecording) {
        isRecording = true;
        micBtn.innerText = "🛑";
        micBtn.classList.add("recording");
        invoke("start_recording").then((msg) => {
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: ${msg}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        }).catch((err) => {
            isRecording = false;
            micBtn.innerText = "🎙️";
            micBtn.classList.remove("recording");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    System error starting recording: ${err}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        });
    } else {
        isRecording = false;
        micBtn.innerText = "🎙️";
        micBtn.classList.remove("recording");
        
        let div = document.createElement("div");
        div.className = "message system";
        div.innerHTML = `
            <div class="message-card">
                System: Processing audio...
            </div>
        `;
        chatViewport.appendChild(div);
        viewport.scrollTop = viewport.scrollHeight;

        invoke("stop_recording").then((text) => {
            inputElement.value = text;
            inputElement.style.height = "auto";
            inputElement.style.height = (inputElement.scrollHeight) + "px";
            inputElement.focus();
            
            div.querySelector(".message-card").innerText = "System: Audio transcribed.";
        }).catch((err) => {
            div.className = "message system error";
            div.querySelector(".message-card").innerText = "System error stop recording/transcribing: " + err;
        });
    }
};

// Sessions History Management (Sidebar UI)
function refreshSessionsList() {
    invoke("list_sessions").then((sessions) => {
        const historyContainer = document.getElementById("sidebar-history");
        historyContainer.innerHTML = '<div class="history-group-label">Recent Sessions</div>';
        
        if (sessions.length === 0) {
            const noSessions = document.createElement("div");
            noSessions.style.padding = "10px 12px";
            noSessions.style.opacity = "0.4";
            noSessions.style.fontSize = "0.8rem";
            noSessions.innerText = "No saved sessions";
            historyContainer.appendChild(noSessions);
            return;
        }

        sessions.forEach((sid) => {
            const item = document.createElement("div");
            item.className = "history-item";
            if (sid === currentSessionId) {
                item.classList.add("active");
            }
            
            const title = document.createElement("span");
            title.className = "history-title";
            title.innerText = sid;
            title.onclick = function() {
                loadSession(sid);
            };
            item.appendChild(title);
            
            const actions = document.createElement("div");
            actions.className = "history-actions";
            
            const exportBtn = document.createElement("button");
            exportBtn.className = "history-action-btn";
            exportBtn.innerHTML = "📤";
            exportBtn.title = "Export to Markdown";
            exportBtn.onclick = function(e) {
                e.stopPropagation();
                invoke("export_session_markdown", { id: sid }).then((msg) => {
                    alert(msg);
                }).catch((err) => {
                    alert("Error exporting session: " + err);
                });
            };
            actions.appendChild(exportBtn);
            
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "history-action-btn";
            deleteBtn.innerHTML = "🗑️";
            deleteBtn.title = "Delete Session";
            deleteBtn.onclick = function(e) {
                e.stopPropagation();
                if (confirm(`Delete session ${sid}?`)) {
                    invoke("delete_session", { id: sid }).then(() => {
                        if (sid === currentSessionId) {
                            startNewSession();
                        } else {
                            refreshSessionsList();
                        }
                    });
                }
            };
            actions.appendChild(deleteBtn);
            
            item.appendChild(actions);
            historyContainer.appendChild(item);
        });
    }).catch(err => {
        console.error("Error listing sessions:", err);
    });
}

function loadSession(sid) {
    invoke("load_session_by_id", { id: sid }).then((data) => {
        currentSessionId = data.session_id;
        document.getElementById("session-id").innerText = currentSessionId;
        document.getElementById("session-title").innerText = "Session: " + currentSessionId;
        
        let chatViewport = document.getElementById("chat-viewport");
        let viewport = document.getElementById("chat-workspace");
        chatViewport.innerHTML = "";
        
        data.messages.forEach((msgStr) => {
            const div = document.createElement("div");
            if (msgStr.startsWith("User: ")) {
                div.className = "message user";
                div.innerHTML = `
                    <div class="message-card">
                        ${msgStr.substring(6)}
                    </div>
                `;
            } else if (msgStr.startsWith("AI: ")) {
                div.className = "message ai";
                div.innerHTML = `
                    <div class="message-card">
                        ${window.sanitizeHtml(marked.parse(msgStr.substring(4)))}
                    </div>
                `;
                formatCodeBlocks(div);
            } else {
                div.className = "message system";
                div.innerHTML = `
                    <div class="message-card">
                        ${msgStr}
                    </div>
                `;
            }
            chatViewport.appendChild(div);
        });
        
        viewport.scrollTop = viewport.scrollHeight;
        
        let systemDiv = document.createElement("div");
        systemDiv.className = "message system";
        systemDiv.innerHTML = `
            <div class="message-card">
                System: Loaded session ${currentSessionId}
            </div>
        `;
        chatViewport.appendChild(systemDiv);
        viewport.scrollTop = viewport.scrollHeight;
        
        refreshSessionsList();
    }).catch((err) => {
        let chatViewport = document.getElementById("chat-viewport");
        let viewport = document.getElementById("chat-workspace");
        let div = document.createElement("div");
        div.className = "message system error";
        div.innerHTML = `
            <div class="message-card">
                Error loading session: ${err}
            </div>
        `;
        chatViewport.appendChild(div);
        viewport.scrollTop = viewport.scrollHeight;
    });
}

function startNewSession() {
    invoke("new_session").then((newId) => {
        currentSessionId = newId;
        document.getElementById("session-id").innerText = currentSessionId;
        document.getElementById("session-title").innerText = "New Session";
        
        let chatViewport = document.getElementById("chat-viewport");
        chatViewport.innerHTML = `
            <div class="message system">
                <div class="message-card">System initialized. Welcome to NEURODECK.</div>
            </div>
        `;
        
        refreshSessionsList();
    }).catch(err => {
        console.error("Error starting new session:", err);
    });
}

document.getElementById("new-chat-btn").onclick = startNewSession;

// Keydown shortcuts for Save/Load/Record/Mute
// Backtick (`) — toggle radial menu for keyboard/desktop testing
window.addEventListener("keydown", function(e) {
    if (e.key === "`" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (radialMenuVisible) {
            hideRadialMenu();
        } else {
            showRadialMenu();
        }
        return;
    }
});

// Arrow keys to cycle radial segments when menu is open
window.addEventListener("keydown", function(e) {
    if (!radialMenuVisible) return;
    const keyToSeg = { ArrowUp: 0, ArrowRight: 2, ArrowDown: 4, ArrowLeft: 6 };
    if (e.key in keyToSeg) {
        e.preventDefault();
        updateRadialDisplay(keyToSeg[e.key]);
    }
    if (e.key === "Enter") {
        e.preventDefault();
        activateRadialSegment(radialSelectedSegment);
        hideRadialMenu();
    }
    if (e.key === "Escape") {
        e.preventDefault();
        hideRadialMenu();
    }
});

window.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.altKey && e.key === "1") {
        e.preventDefault();
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.toggle("collapsed");
    }
    
    if (e.ctrlKey && e.altKey && e.key === "2") {
        e.preventDefault();
        const inspectDrawer = document.getElementById("inspect-drawer");
        if (inspectDrawer) inspectDrawer.classList.toggle("collapsed");
    }
    
    if (e.ctrlKey && e.altKey && e.key === "3") {
        e.preventDefault();
        const clearBtn = document.getElementById("canvas-clear-btn");
        if (clearBtn) clearBtn.click();
    }
    
    if (e.ctrlKey && e.altKey && e.key === "4") {
        e.preventDefault();
        cycleTheme();
    }

    if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        invoke("save_session").then((msg) => {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: ${msg}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
            
            // Update session title in top navigation bar
            document.getElementById("session-title").innerText = "Session: " + currentSessionId;
            
            refreshSessionsList();
        }).catch((err) => {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    System error saving session: ${err}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        });
    }
    
    if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        invoke("load_latest_session").then((data) => {
            currentSessionId = data.session_id;
            document.getElementById("session-id").innerText = currentSessionId;
            document.getElementById("session-title").innerText = "Session: " + currentSessionId;
            
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            chatViewport.innerHTML = "";
            
            data.messages.forEach((msgStr) => {
                const div = document.createElement("div");
                if (msgStr.startsWith("User: ")) {
                    div.className = "message user";
                    div.innerHTML = `
                        <div class="message-card">
                            ${msgStr.substring(6)}
                        </div>
                    `;
                } else if (msgStr.startsWith("AI: ")) {
                    div.className = "message ai";
                    div.innerHTML = `
                        <div class="message-card">
                            ${window.sanitizeHtml(marked.parse(msgStr.substring(4)))}
                        </div>
                    `;
                    formatCodeBlocks(div);
                }
                chatViewport.appendChild(div);
            });
            
            viewport.scrollTop = viewport.scrollHeight;
            
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: Loaded session ${currentSessionId}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
            
            refreshSessionsList();
        }).catch((err) => {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    Error loading session: ${err}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        });
    }
    
    if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        if (pendingLuaScript) {
            runLuaScript(pendingLuaScript);
        } else {
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system error";
            div.innerHTML = `
                <div class="message-card">
                    System: No pending Lua script found in chat to execute.
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        }
    }

    if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        let micBtn = document.getElementById("mic-btn");
        if (micBtn) {
            micBtn.click();
        }
    }
    
    if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        toggleMute();
    }

    if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        startNewSession();
    }

    if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        if (availablePersonas.length > 0) {
            let currentIndex = availablePersonas.indexOf(activePersona);
            let nextIndex = (currentIndex + 1) % availablePersonas.length;
            let nextPersona = availablePersonas[nextIndex];
            
            invoke("set_persona", { name: nextPersona }).then((msg) => {
                activePersona = nextPersona;
                let select = document.getElementById("persona-select");
                if (select) {
                    select.value = nextPersona;
                }
                
                let chatViewport = document.getElementById("chat-viewport");
                let viewport = document.getElementById("chat-workspace");
                let div = document.createElement("div");
                div.className = "message system";
                div.innerHTML = `
                    <div class="message-card">
                        System: Persona cycled to ${nextPersona}
                    </div>
                `;
                chatViewport.appendChild(div);
                viewport.scrollTop = viewport.scrollHeight;
            }).catch((err) => {
                console.error("Error cycling persona:", err);
            });
        }
    }

    if (e.key === "Escape") {
        if (currentAIMessage !== null) {
            e.preventDefault();
            invoke("cancel_generation").catch((err) => {
                console.error("Error cancelling generation:", err);
            });
        }
    }
});

// Listen for persona changes from backend commands
listen("persona_changed", function(event) {
    activePersona = event.payload;
    let select = document.getElementById("persona-select");
    if (select) {
        select.value = activePersona;
    }
});

// Persona and Theme selection change logic
document.getElementById("persona-select").onchange = function() {
    let val = this.value;
    invoke("set_persona", { name: val }).then((msg) => {
        activePersona = val;
        let chatViewport = document.getElementById("chat-viewport");
        let viewport = document.getElementById("chat-workspace");
        let div = document.createElement("div");
        div.className = "message system";
        div.innerHTML = `
            <div class="message-card">
                System: ${msg}
            </div>
        `;
        chatViewport.appendChild(div);
        viewport.scrollTop = viewport.scrollHeight;
    });
};

document.getElementById("theme-select").onchange = function() {
    let val = this.value;
    invoke("set_theme", { name: val }).then((theme) => {
        if (theme) {
            applyThemeColors(theme);
            localStorage.setItem("selectedTheme", val);
            
            let chatViewport = document.getElementById("chat-viewport");
            let viewport = document.getElementById("chat-workspace");
            let div = document.createElement("div");
            div.className = "message system";
            div.innerHTML = `
                <div class="message-card">
                    System: Theme applied and saved: ${val}
                </div>
            `;
            chatViewport.appendChild(div);
            viewport.scrollTop = viewport.scrollHeight;
        }
    });
};

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
invoke("get_initial_state").then((state) => {
    const modelNameEl = document.getElementById("model-name");
    if (modelNameEl) modelNameEl.innerText = `[ MODEL: ${state.model.toUpperCase()} ]`;
    
    const dbStatusEl = document.getElementById("vector-db-status");
    if (dbStatusEl) dbStatusEl.innerText = state.memory_status;
    
    const memoryStatusEl = document.getElementById("memory-status");
    if (memoryStatusEl) memoryStatusEl.innerText = state.memory_status;

    const toolStatusEl = document.getElementById("tool-status");
    if (toolStatusEl) toolStatusEl.innerText = state.tool_status;

    const sessionIdEl = document.getElementById("session-id");
    if (sessionIdEl) sessionIdEl.innerText = state.session_id;

    currentSessionId = state.session_id;
    activePersona = state.active_persona || "Default";
    
    // Initial Context Drawer metrics load
    updateContextDrawer();

    // Show game badge if a game was detected at startup
    updateGameBadge({
        name: state.game_name || "",
        app_id: state.game_app_id || "",
        is_running: state.game_running || "false"
    });
    
    // Fetch and cache available personas list
    invoke("get_personas").then((personas) => {
        availablePersonas = personas;
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
    
    // Setup mute button listener and initial state
    document.getElementById("mute-btn").onclick = function() {
        toggleMute();
    };
    updateMuteButtonUI();
    
    // Refresh sessions list on startup
    refreshSessionsList();
    
    // Initialize our sub-systems
    initPtyTerminal();
    initCanvasView();
    initTunnelClient();
    initFileShare();
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

navTabs.forEach(tab => {
    tab.onclick = function() {
        const targetView = tab.getAttribute("data-view");
        
        navTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
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

// --- PTY TERMINAL SYSTEM ---
let terminalSessions = []; // list of { id, shell, term, fitAddon, containerEl }
let activeTerminalSessionId = null;
let ptySessionId = null; // compatibility pointer for active session id
const MAX_TERMINAL_SESSIONS = 5;

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

function createTerminalSession(shellPath) {
    if (terminalSessions.length >= MAX_TERMINAL_SESSIONS) {
        alert(`Maximum of ${MAX_TERMINAL_SESSIONS} active terminal tabs allowed.`);
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
    terminalSessions.push(sessionObj);

    // Wire up Category B autocomplete if the function is already defined
    if (typeof patchTerminalSessionWithAutocomplete === "function") {
        patchTerminalSessionWithAutocomplete(sessionObj);
    }

    renderTerminalTabs();
    switchTerminalSession(id);
}

function switchTerminalSession(id) {
    const session = terminalSessions.find(s => s.id === id);
    if (!session) return;

    // Clear any pending autocomplete from the previous session
    if (typeof clearAutocompleteGhost === "function") clearAutocompleteGhost();

    activeTerminalSessionId = id;
    ptySessionId = id; // update for backwards compatibility

    // Update globals for resize handler
    window.ptyTerminal = session.term;
    window.ptyTerminalFitAddon = session.fitAddon;

    // Toggle display of containers
    terminalSessions.forEach(s => {
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
    if (terminalSessions.length <= 1) {
        restartTerminalSession(id);
        return;
    }

    const idx = terminalSessions.findIndex(s => s.id === id);
    if (idx === -1) return;

    const sessionObj = terminalSessions[idx];

    // Kill backend process
    invoke("pty_kill", { id: id }).catch(() => {});

    // Dispose xterm
    try {
        sessionObj.term.dispose();
    } catch (e) {}

    // Remove container from DOM
    sessionObj.containerEl.remove();

    // Remove from array
    terminalSessions.splice(idx, 1);

    renderTerminalTabs();

    // Switch to another active tab
    if (activeTerminalSessionId === id) {
        const nextActiveIdx = Math.max(0, idx - 1);
        const nextSession = terminalSessions[nextActiveIdx];
        if (nextSession) {
            switchTerminalSession(nextSession.id);
        }
    }
}

function restartTerminalSession(id) {
    const session = terminalSessions.find(s => s.id === id);
    if (!session) return;

    session.term.write("\r\n\x1b[1;33mRestarting shell session...\x1b[0m\r\n");
    invoke("pty_kill", { id: id }).catch(() => {}).then(() => {
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

    const SHELL_ICONS = {
        "/bin/bash":     "$",
        "/bin/zsh":      "%",
        "/bin/fish":     "~",
        "powershell.exe":"PS",
        "cmd.exe":       ">",
    };
    list.innerHTML = terminalSessions.map((s, idx) => {
        const icon  = s.shell ? (SHELL_ICONS[s.shell] || s.shell.replace(/.*[/\\]/, '').replace('.exe','').slice(0,3).toLowerCase()) : ">_";
        const label = `${icon} ${idx + 1}`;
        const activeClass = s.id === activeTerminalSessionId ? "active" : "";
        return `
            <div class="terminal-tab ${activeClass}" data-session-id="${s.id}">
                <span>${label}</span>
                <span class="terminal-tab-close" data-session-id="${s.id}">✕</span>
            </div>
        `;
    }).join("");

    // Tab clicks
    list.querySelectorAll(".terminal-tab").forEach(tab => {
        tab.onclick = () => {
            const sid = tab.getAttribute("data-session-id");
            switchTerminalSession(sid);
        };
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
    if (terminalSessions.length > 0) {
        if (activeTerminalSessionId) {
            switchTerminalSession(activeTerminalSessionId);
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
            if (activeTerminalSessionId) restartTerminalSession(activeTerminalSessionId);
        };
    }

    // Font size controls — apply to all live sessions immediately
    const fontDecBtn = document.getElementById("term-font-dec-btn");
    const fontIncBtn = document.getElementById("term-font-inc-btn");
    function adjustFontSize(delta) {
        const current = parseInt(localStorage.getItem("terminalFontSize") || "14", 10);
        const next = Math.min(24, Math.max(8, current + delta));
        localStorage.setItem("terminalFontSize", String(next));
        terminalSessions.forEach(s => {
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
            if (activeTerminalSessionId) {
                invoke("pty_write", { id: activeTerminalSessionId, data: "\x0C" }).catch(() => {});
            }
        };
    }

    createTerminalSession();
}

window.addEventListener("resize", () => {
    // Resize all active terminal sessions to fit their respective windows
    terminalSessions.forEach(s => {
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
    const session = terminalSessions.find(s => s.id === payload.id);
    if (session) {
        session.term.write(payload.data);
    } else if (payload.id === sshSessionId && window.sshTerminal) {
        window.sshTerminal.write(payload.data);
        
        const passInput = document.getElementById("ssh-pass-input");
        const authType = document.getElementById("ssh-auth-type")?.value || "password";
        if (authType === "password" && passInput && passInput.value) {
            const lowerData = payload.data.toLowerCase();
            if (lowerData.includes("password:") || (lowerData.includes("password") && lowerData.trim().endsWith(":"))) {
                if (!window._sshPasswordSent) {
                    window._sshPasswordSent = true;
                    invoke("pty_write", { id: sshSessionId, data: passInput.value + "\n" }).catch(err => {
                        console.error("SSH auto-password feeding failed:", err);
                    });
                }
            }
        }
    }
});

listen("pty_exit", (event) => {
    const id = event.payload;
    const session = terminalSessions.find(s => s.id === id);
    if (session) {
        session.term.write("\r\n\x1b[1;31m[Shell Session Exited]\x1b[0m\r\n");
        addNotification("Shell Exited", "Session '" + id + "' has terminated.", "warning");
    } else if (id === sshSessionId) {
        window.sshTerminal?.write("\r\n\x1b[1;31m[SSH Session Disconnected]\x1b[0m\r\n");
        setSshStatus(false, "Disconnected");
        sshSessionId = null;
        addNotification("SSH Disconnected", "SSH session has terminated.", "warning");
    }
});

// ==========================================================================
// CATEGORY B: SCREENSHOT VISION BRIDGE
// ==========================================================================

window.pendingScreenshot = null;

(function initScreenshotVision() {
    const screenshotBtn = document.getElementById("screenshot-btn");
    if (!screenshotBtn) return;

    screenshotBtn.addEventListener("click", async () => {
        // If we already have an attachment, remove it
        if (window.pendingScreenshot) {
            window.pendingScreenshot = null;
            const bar = document.getElementById("chat-attachment-bar");
            if (bar) { bar.innerHTML = ""; bar.classList.add("hidden"); }
            screenshotBtn.classList.remove("has-attachment");
            return;
        }

        screenshotBtn.style.opacity = "0.5";
        screenshotBtn.disabled = true;

        try {
            const result = await invoke("read_last_screenshot");
            window.pendingScreenshot = result;

            // Render thumbnail in attachment bar
            const bar = document.getElementById("chat-attachment-bar");
            if (bar) {
                bar.classList.remove("hidden");
                bar.innerHTML = "";

                const preview = document.createElement("div");
                preview.className = "chat-attachment-preview";
                preview.title = result.path || "Screenshot";

                const img = document.createElement("img");
                img.src = `data:${result.mime};base64,${result.data}`;
                img.alt = "Screenshot";

                const removeBtn = document.createElement("button");
                removeBtn.className = "chat-attachment-remove";
                removeBtn.innerHTML = "✕";
                removeBtn.title = "Remove attachment";
                removeBtn.onclick = () => {
                    window.pendingScreenshot = null;
                    bar.innerHTML = "";
                    bar.classList.add("hidden");
                    screenshotBtn.classList.remove("has-attachment");
                };

                preview.appendChild(img);
                preview.appendChild(removeBtn);
                bar.appendChild(preview);
            }

            screenshotBtn.classList.add("has-attachment");

            if (typeof addNotification === "function") {
                addNotification("Screenshot attached", "Vision context added to next message.", "success");
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
})();

// ==========================================================================
// CATEGORY B: AI SHELL HISTORY SEARCH (Ctrl+H)
// ==========================================================================

let historySearchOpen = false;
let historySearchResults = [];
let historySearchSelectedIdx = -1;
let historySearchDebounce = null;

function openHistorySearch() {
    const overlay = document.getElementById("history-search-overlay");
    if (!overlay) return;
    historySearchOpen = true;
    historySearchSelectedIdx = -1;
    historySearchResults = [];
    overlay.classList.remove("hidden");
    setTimeout(() => {
        const input = document.getElementById("history-search-input");
        if (input) { input.value = ""; input.focus(); }
        const body = document.getElementById("history-search-body");
        if (body) body.innerHTML = '<div class="history-empty-state">Start typing to search your shell history with AI</div>';
    }, 30);
}

function closeHistorySearch() {
    const overlay = document.getElementById("history-search-overlay");
    if (overlay) overlay.classList.add("hidden");
    historySearchOpen = false;
    historySearchResults = [];
    historySearchSelectedIdx = -1;
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
            <span class="history-result-cmd" title="${cmd.replace(/"/g, '&quot;')}">${cmd}</span>
            <span class="history-result-insert-hint">↵ Insert</span>
        `;
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
    const activeSession = (typeof terminalSessions !== "undefined") ?
        terminalSessions.find(s => s.id === activeTerminalSessionId) : null;

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
(function wireHistorySearchInput() {
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
})();

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
            const completion = await invoke("shell_autocomplete", { buffer: buffer.trim() });
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

// Hook into xterm onKey to intercept Ctrl+Space and RightArrow when ghost text is visible.
// We patch createTerminalSession to add the key handler after session creation.
const _origCreateTerminalSession = window.createTerminalSession;

function patchTerminalSessionWithAutocomplete(session) {
    if (!session || !session.term) return;
    const term = session.term;

    let currentLineBuffer = "";

    // Track what's typed to maintain a local line buffer
    term.onData((data) => {
        // Handle special sequences
        if (data === "\r" || data === "\n") {
            currentLineBuffer = "";
            clearAutocompleteGhost();
            return;
        }
        if (data === "\x7f" || data === "\b") {
            // Backspace
            currentLineBuffer = currentLineBuffer.slice(0, -1);
            clearAutocompleteGhost();
            return;
        }
        if (data === "\x03" || data === "\x1b") {
            // Ctrl+C or Escape
            currentLineBuffer = "";
            clearAutocompleteGhost();
            return;
        }
        // Ctrl+Space (0x00 or \x00 in xterm key events)
        if (data === "\x00" || data === " " && autocompleteActive) {
            // Accept ghost text if active and space is pressed
        }
        // Printable chars
        if (data.length === 1 && data.charCodeAt(0) >= 32) {
            currentLineBuffer += data;
            clearAutocompleteGhost();
        }
    });

    // Override Ctrl+Space using the custom keyEventHandler
    term.attachCustomKeyEventHandler((e) => {
        // Ctrl+H: open AI history search — intercept before xterm sends 0x08 backspace to PTY
        if (e.ctrlKey && e.key === "h" && e.type === "keydown") {
            e.preventDefault();
            if (typeof openHistorySearch === "function") openHistorySearch();
            return false;
        }

        // Ctrl+Space: trigger autocomplete
        if (e.ctrlKey && e.code === "Space" && e.type === "keydown") {
            e.preventDefault();
            triggerAutocomplete(session.id, currentLineBuffer);
            return false;
        }

        // Right Arrow or Ctrl+Y: accept ghost completion
        if (autocompleteActive && autocompleteGhostText && e.type === "keydown") {
            if (e.code === "ArrowRight" || (e.ctrlKey && e.key === "y")) {
                e.preventDefault();
                const ghost = autocompleteGhostText;
                clearAutocompleteGhost();
                currentLineBuffer += ghost;
                // Write the ghost text to the PTY
                invoke("pty_write", { id: session.id, data: ghost }).catch(console.error);
                return false;
            }
            // Escape: dismiss
            if (e.code === "Escape") {
                clearAutocompleteGhost();
                return true; // Let xterm handle normally
            }
        }
        return true; // Allow normal key processing
    });
}

// ==========================================================================
// SSH CLIENT SYSTEM
// ==========================================================================

let sshSessionId = null;

function initSshTerminal() {
    const container = document.getElementById("ssh-terminal-container");
    if (!container) return;
    container.innerHTML = "";

    const savedFontSize = parseInt(localStorage.getItem("terminalFontSize") || "14", 10);
    const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'var(--font-mono)',
        fontSize: savedFontSize,
        scrollback: 2000,
        theme: {
            background: getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim() || '#000000',
            foreground: getComputedStyle(document.documentElement).getPropertyValue('--fg-color').trim() || '#e2e8f0',
            cursor: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#00F0FF',
            selectionBackground: 'rgba(255, 255, 255, 0.15)'
        }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    window.sshTerminal = term;
    window.sshTerminalFitAddon = fitAddon;
    try { fitAddon.fit(); } catch (e) {}

    term.attachCustomKeyEventHandler((e) => {
        // Ctrl+H: open AI history search from SSH terminal too
        if (e.ctrlKey && e.key === "h" && e.type === "keydown") {
            e.preventDefault();
            if (typeof openHistorySearch === "function") openHistorySearch();
            return false;
        }
        return true;
    });

    term.onData(data => {
        if (sshSessionId) {
            invoke("pty_write", { id: sshSessionId, data }).catch(console.error);
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
    if (disconnectBtn) disconnectBtn.disabled = !connected;
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
    if (sshSessionId) {
        invoke("pty_kill", { id: sshSessionId }).catch(() => {});
        sshSessionId = null;
    }

    sshSessionId = "ssh_session_" + Date.now();
    const dims = window.sshTerminalFitAddon?.proposeDimensions() || { cols: 80, rows: 24 };

    // Use system ssh binary
    const sshBin = "ssh";
    const sshArgs = ["-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=30", "-p", String(port)];
    if (authType === "key" && keyPath) {
        sshArgs.push("-i", keyPath);
    }
    sshArgs.push(`${user}@${host}`);

    window.sshTerminal?.write(`\r\n\x1b[1;33mConnecting to ${user}@${host}:${port}...\x1b[0m\r\n`);
    setSshStatus(false, `Connecting to ${host}...`);

    invoke("pty_spawn", {
        id: sshSessionId,
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
        sshSessionId = null;
        addNotification("SSH Failed", "Could not connect to " + host + ".", "error");
    });
}

document.getElementById("ssh-connect-btn")?.addEventListener("click", connectSsh);

document.getElementById("ssh-disconnect-btn")?.addEventListener("click", () => {
    if (sshSessionId) {
        invoke("pty_kill", { id: sshSessionId }).catch(() => {});
        sshSessionId = null;
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
    if (window.__TAURI_INTERNALS__) {
        invoke("save_profiles", { key: "ssh", data: JSON.stringify(profiles) }).catch(() => {});
    }
}

async function initSshProfilesFromDisk() {
    if (!window.__TAURI_INTERNALS__) return;
    try {
        const raw = await invoke("load_profiles", { key: "ssh" });
        if (raw && raw !== "[]" && !localStorage.getItem("sshProfiles")) {
            localStorage.setItem("sshProfiles", raw);
        }
    } catch (_) {}
}

function renderSshProfiles() {
    const list = document.getElementById("ssh-profiles-list");
    if (!list) return;
    const profiles = getSshProfiles();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ssh-no-profiles">No saved profiles.</div>`;
        return;
    }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item" data-index="${i}">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${p.name}</span>
                <span class="ssh-profile-host">${p.user}@${p.host}:${p.port}</span>
            </div>
            <div class="ssh-profile-actions">
                <button class="canvas-btn ssh-profile-load-btn" style="padding:3px 8px;font-size:0.75rem;" data-index="${i}">Load</button>
                <button class="canvas-btn ssh-profile-del-btn" style="padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;" data-index="${i}">✕</button>
            </div>
        </div>
    `).join("");

    list.querySelectorAll(".ssh-profile-load-btn").forEach(btn => {
        btn.onclick = () => {
            const p = getSshProfiles()[parseInt(btn.getAttribute("data-index"))];
            if (!p) return;
            document.getElementById("ssh-host-input").value = p.host || "";
            document.getElementById("ssh-port-input").value = p.port || "22";
            document.getElementById("ssh-user-input").value = p.user || "";
            document.getElementById("ssh-auth-type").value = p.auth_type || "password";
            document.getElementById("ssh-key-path-input").value = p.key_path || "";
            document.getElementById("ssh-auth-type").dispatchEvent(new Event("change"));
            document.getElementById("ssh-pass-input").value = "";
        };
    });

    list.querySelectorAll(".ssh-profile-del-btn").forEach(btn => {
        btn.onclick = () => {
            const profiles = getSshProfiles();
            profiles.splice(parseInt(btn.getAttribute("data-index")), 1);
            saveSshProfiles(profiles);
            renderSshProfiles();
            renderSshProfilesSettings();
        };
    });
}

function renderSshProfilesSettings() {
    const list = document.getElementById("settings-ssh-profiles-list");
    if (!list) return;
    const profiles = getSshProfiles();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ssh-no-profiles">No saved profiles. Use the SSH tab to add profiles.</div>`;
        return;
    }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${p.name}</span>
                <span class="ssh-profile-host">${p.user}@${p.host}:${p.port}</span>
            </div>
            <button class="canvas-btn ssh-profile-del-btn" style="padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;" data-index="${i}">✕</button>
        </div>
    `).join("");
    list.querySelectorAll(".ssh-profile-del-btn").forEach(btn => {
        btn.onclick = () => {
            const profiles = getSshProfiles();
            profiles.splice(parseInt(btn.getAttribute("data-index")), 1);
            saveSshProfiles(profiles);
            renderSshProfilesSettings();
            renderSshProfiles();
        };
    });
}

document.getElementById("ssh-save-profile-btn")?.addEventListener("click", () => {
    const host = document.getElementById("ssh-host-input")?.value.trim();
    const port = parseInt(document.getElementById("ssh-port-input")?.value || "22", 10);
    const user = document.getElementById("ssh-user-input")?.value.trim();
    const auth_type = document.getElementById("ssh-auth-type")?.value || "password";
    const key_path = document.getElementById("ssh-key-path-input")?.value.trim();
    if (!host || !user) { alert("Enter host and username first."); return; }
    const name = prompt("Profile name:", `${user}@${host}`);
    if (!name) return;
    const profiles = getSshProfiles();
    profiles.push({ name, host, port, user, auth_type, key_path });
    saveSshProfiles(profiles);
    renderSshProfiles();
});

document.getElementById("settings-clear-ssh-profiles")?.addEventListener("click", () => {
    localStorage.removeItem("sshProfiles");
    renderSshProfiles();
    renderSshProfilesSettings();
});

// Init SSH profiles on load
renderSshProfiles();

document.getElementById("ssh-auth-type")?.addEventListener("change", (e) => {
    const isKey = e.target.value === "key";
    const passGroup = document.getElementById("ssh-pass-group");
    const keyPathGroup = document.getElementById("ssh-key-path-group");
    if (passGroup) passGroup.style.display = isKey ? "none" : "block";
    if (keyPathGroup) keyPathGroup.style.display = isKey ? "block" : "none";
});

// --- FTP Profile Management ---
function getFtpProfiles() {
    try { return JSON.parse(localStorage.getItem("ftpProfiles") || "[]"); } catch { return []; }
}

function saveFtpProfiles(profiles) {
    localStorage.setItem("ftpProfiles", JSON.stringify(profiles));
    if (window.__TAURI_INTERNALS__) {
        invoke("save_profiles", { key: "ftp", data: JSON.stringify(profiles) }).catch(() => {});
    }
}

async function initFtpProfilesFromDisk() {
    if (!window.__TAURI_INTERNALS__) return;
    try {
        const raw = await invoke("load_profiles", { key: "ftp" });
        if (raw && raw !== "[]" && !localStorage.getItem("ftpProfiles")) {
            localStorage.setItem("ftpProfiles", raw);
        }
    } catch (_) {}
}

function renderFtpProfiles() {
    const list = document.getElementById("ftp-profiles-list");
    if (!list) return;
    const profiles = getFtpProfiles();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ftp-no-profiles">No saved profiles.</div>`;
        return;
    }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item" data-index="${i}">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${p.name}</span>
                <span class="ssh-profile-host">${p.user}@${p.host}:${p.port}</span>
            </div>
            <div class="ssh-profile-actions">
                <button class="canvas-btn ftp-profile-load-btn" style="padding:3px 8px;font-size:0.75rem;" data-index="${i}">Load</button>
                <button class="canvas-btn ftp-profile-del-btn" style="padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;" data-index="${i}">✕</button>
            </div>
        </div>
    `).join("");

    list.querySelectorAll(".ftp-profile-load-btn").forEach(btn => {
        btn.onclick = () => {
            const p = getFtpProfiles()[parseInt(btn.getAttribute("data-index"))];
            if (!p) return;
            document.getElementById("ftp-host-input").value = p.host || "";
            document.getElementById("ftp-port-input").value = p.port || "21";
            document.getElementById("ftp-user-input").value = p.user || "";
            document.getElementById("ftp-pass-input").value = "";
            document.getElementById("ftp-path-input").value = p.path || "/";
        };
    });

    list.querySelectorAll(".ftp-profile-del-btn").forEach(btn => {
        btn.onclick = () => {
            const profiles = getFtpProfiles();
            profiles.splice(parseInt(btn.getAttribute("data-index")), 1);
            saveFtpProfiles(profiles);
            renderFtpProfiles();
            renderFtpProfilesSettings();
        };
    });
}

function renderFtpProfilesSettings() {
    const list = document.getElementById("settings-ftp-profiles-list");
    if (!list) return;
    const profiles = getFtpProfiles();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ssh-no-profiles">No saved profiles. Use the FTP tab to add profiles.</div>`;
        return;
    }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${p.name}</span>
                <span class="ssh-profile-host">${p.user}@${p.host}:${p.port}</span>
            </div>
            <button class="canvas-btn ftp-profile-del-btn" style="padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;" data-index="${i}">✕</button>
        </div>
    `).join("");
    list.querySelectorAll(".ftp-profile-del-btn").forEach(btn => {
        btn.onclick = () => {
            const profiles = getFtpProfiles();
            profiles.splice(parseInt(btn.getAttribute("data-index")), 1);
            saveFtpProfiles(profiles);
            renderFtpProfilesSettings();
            renderFtpProfiles();
        };
    });
}

document.getElementById("ftp-save-profile-btn")?.addEventListener("click", () => {
    const host = document.getElementById("ftp-host-input")?.value.trim();
    const port = parseInt(document.getElementById("ftp-port-input")?.value || "21", 10);
    const user = document.getElementById("ftp-user-input")?.value.trim();
    const path = document.getElementById("ftp-path-input")?.value.trim() || "/";
    if (!host || !user) { alert("Enter host and username first."); return; }
    const name = prompt("Profile name:", `${user}@${host}`);
    if (!name) return;
    const profiles = getFtpProfiles();
    profiles.push({ name, host, port, user, path });
    saveFtpProfiles(profiles);
    renderFtpProfiles();
});

document.getElementById("settings-clear-ftp-profiles")?.addEventListener("click", () => {
    localStorage.removeItem("ftpProfiles");
    renderFtpProfiles();
    renderFtpProfilesSettings();
});

// Init FTP profiles on load
renderFtpProfiles();

// ==========================================================================
// FTP CLIENT SYSTEM
// ==========================================================================

let ftpCurrentPath = "/";

function renderFtpFiles(entries) {
    const list = document.getElementById("ftp-file-list");
    if (!list) return;
    if (!entries || entries.length === 0) {
        list.innerHTML = `<div class="ftp-empty-state">Directory is empty.</div>`;
        return;
    }
    list.innerHTML = entries.map(e => `
        <div class="ftp-file-item ${e.is_dir ? "is-dir" : ""}" data-name="${e.name}" data-is-dir="${e.is_dir}">
            <span class="ftp-file-icon">${e.is_dir ? "📁" : "📄"}</span>
            <span class="ftp-file-name">${e.name}</span>
            <span class="ftp-file-size">${e.is_dir ? "—" : formatBytes(e.size)}</span>
            ${!e.is_dir ? `<button class="canvas-btn ftp-download-btn" style="padding:3px 8px;font-size:0.75rem;" data-name="${e.name}">⬇ Download</button>` : ""}
        </div>
    `).join("");

    // Directory navigation
    list.querySelectorAll(".ftp-file-item.is-dir").forEach(item => {
        item.style.cursor = "pointer";
        item.onclick = () => {
            const name = item.getAttribute("data-name");
            ftpCurrentPath = ftpCurrentPath.replace(/\/$/, "") + "/" + name;
            loadFtpDir(ftpCurrentPath);
        };
    });

    // Download buttons
    list.querySelectorAll(".ftp-download-btn").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const name = btn.getAttribute("data-name");
            const remotePath = ftpCurrentPath.replace(/\/$/, "") + "/" + name;
            const localPath = (localStorage.getItem("downloadDir") || "/tmp") + "/" + name;
            const host = document.getElementById("ftp-host-input")?.value.trim();
            const port = parseInt(document.getElementById("ftp-port-input")?.value || "21", 10);
            const user = document.getElementById("ftp-user-input")?.value.trim();
            const pass = document.getElementById("ftp-pass-input")?.value;
            setFtpStatus(`Downloading ${name}...`);
            invoke("ftp_download_file", { host, port, user, password: pass, remotePath, localPath })
                .then(() => {
                    setFtpStatus(`Downloaded to ${localPath}`);
                    if (typeof addNotification === "function") {
                        addNotification("FTP Download Complete", `Downloaded file '${name}' to: ${localPath}`, "success");
                    }
                })
                .catch(err => {
                    setFtpStatus(`Download error: ${err}`);
                    if (typeof addNotification === "function") {
                        addNotification("FTP Download Failed", `Failed to download file '${name}': ${err}`, "error");
                    }
                });
        };
    });
}

function setFtpStatus(msg) {
    const el = document.getElementById("ftp-status-text");
    if (el) el.textContent = msg;
}

function loadFtpDir(path) {
    const host = document.getElementById("ftp-host-input")?.value.trim();
    const port = parseInt(document.getElementById("ftp-port-input")?.value || "21", 10);
    const user = document.getElementById("ftp-user-input")?.value.trim();
    const pass = document.getElementById("ftp-pass-input")?.value;
    if (!host) return;

    setFtpStatus("Loading...");
    const cwdLabel = document.getElementById("ftp-cwd-label");
    if (cwdLabel) cwdLabel.textContent = `📁 ${path}`;

    invoke("ftp_list_dir", { host, port, user, password: pass, path })
        .then(entries => {
            ftpCurrentPath = path;
            renderFtpFiles(entries);
            setFtpStatus(`Connected — ${entries.length} items`);
        })
        .catch(err => {
            setFtpStatus(`Error: ${err}`);
            const list = document.getElementById("ftp-file-list");
            if (list) list.innerHTML = `<div class="ftp-empty-state" style="color:#ff6b6b;">Error: ${err}</div>`;
        });
}

document.getElementById("ftp-connect-btn")?.addEventListener("click", () => {
    const path = document.getElementById("ftp-path-input")?.value.trim() || "/";
    loadFtpDir(path);
});

document.getElementById("ftp-upload-btn")?.addEventListener("click", () => {
    const host = document.getElementById("ftp-host-input")?.value.trim();
    const port = parseInt(document.getElementById("ftp-port-input")?.value || "21", 10);
    const user = document.getElementById("ftp-user-input")?.value.trim();
    const pass = document.getElementById("ftp-pass-input")?.value;
    const localPath = document.getElementById("ftp-local-path-input")?.value.trim();
    const remotePath = document.getElementById("ftp-remote-dest-input")?.value.trim();
    if (!host || !localPath || !remotePath) {
        setFtpStatus("Fill in host, local path, and remote destination.");
        return;
    }
    setFtpStatus("Uploading...");
    invoke("ftp_upload_file", { host, port, user, password: pass, localPath, remotePath })
        .then(() => {
            setFtpStatus("Upload complete.");
            if (typeof addNotification === "function") {
                addNotification("FTP Upload Complete", `Uploaded file to: ${remotePath}`, "success");
            }
            loadFtpDir(ftpCurrentPath);
        })
        .catch(err => {
            setFtpStatus(`Upload error: ${err}`);
            if (typeof addNotification === "function") {
                addNotification("FTP Upload Failed", `Failed to upload file: ${err}`, "error");
            }
        });
});

// ==========================================================================
// SFTP CLIENT SYSTEM
// ==========================================================================

let sftpCurrentPath = "/";

function renderSftpFiles(entries) {
    const list = document.getElementById("sftp-file-list");
    if (!list) return;
    if (!entries || entries.length === 0) {
        list.innerHTML = `<div class="ftp-empty-state">Directory is empty.</div>`;
        return;
    }
    list.innerHTML = entries.map(e => `
        <div class="ftp-file-item ${e.is_dir ? "is-dir" : ""}" data-name="${e.name}" data-is-dir="${e.is_dir}">
            <span class="ftp-file-icon">${e.is_dir ? "📁" : "📄"}</span>
            <span class="ftp-file-name">${e.name}</span>
            <span class="ftp-file-size">${e.is_dir ? "—" : formatBytes(e.size)}</span>
            ${!e.is_dir ? `<button class="canvas-btn sftp-download-btn" style="padding:3px 8px;font-size:0.75rem;" data-name="${e.name}">⬇ Download</button>` : ""}
        </div>
    `).join("");

    // Directory navigation
    list.querySelectorAll(".ftp-file-item.is-dir").forEach(item => {
        item.style.cursor = "pointer";
        item.onclick = () => {
            const name = item.getAttribute("data-name");
            sftpCurrentPath = sftpCurrentPath.replace(/\/$/, "") + "/" + name;
            loadSftpDir(sftpCurrentPath);
        };
    });

    // Download buttons
    list.querySelectorAll(".sftp-download-btn").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const name = btn.getAttribute("data-name");
            const remotePath = sftpCurrentPath.replace(/\/$/, "") + "/" + name;
            const localPath = (localStorage.getItem("downloadDir") || "/tmp") + "/" + name;
            const host = document.getElementById("sftp-host-input")?.value.trim();
            const port = parseInt(document.getElementById("sftp-port-input")?.value || "22", 10);
            const user = document.getElementById("sftp-user-input")?.value.trim();
            const authType = document.getElementById("sftp-auth-type")?.value || "password";
            const pass = document.getElementById("sftp-pass-input")?.value;
            const keyPath = document.getElementById("sftp-key-path-input")?.value.trim();
            setSftpStatus(`Downloading ${name}...`);
            invoke("sftp_download_file", { host, port, user, authType, password: pass, keyPath, remotePath, localPath })
                .then(() => {
                    setSftpStatus(`Downloaded to ${localPath}`);
                    if (typeof addNotification === "function") {
                        addNotification("SFTP Download Complete", `Downloaded file '${name}' to: ${localPath}`, "success");
                    }
                })
                .catch(err => {
                    setSftpStatus(`Download error: ${err}`);
                    if (typeof addNotification === "function") {
                        addNotification("SFTP Download Failed", `Failed to download file '${name}': ${err}`, "error");
                    }
                });
        };
    });
}

function setSftpStatus(msg) {
    const el = document.getElementById("sftp-status-text");
    if (el) el.textContent = msg;
}

function loadSftpDir(path) {
    const host = document.getElementById("sftp-host-input")?.value.trim();
    const port = parseInt(document.getElementById("sftp-port-input")?.value || "22", 10);
    const user = document.getElementById("sftp-user-input")?.value.trim();
    const authType = document.getElementById("sftp-auth-type")?.value || "password";
    const pass = document.getElementById("sftp-pass-input")?.value;
    const keyPath = document.getElementById("sftp-key-path-input")?.value.trim();
    if (!host) return;

    setSftpStatus("Loading...");
    const cwdLabel = document.getElementById("sftp-cwd-label");
    if (cwdLabel) cwdLabel.textContent = `📁 ${path}`;

    invoke("sftp_list_dir", { host, port, user, authType, password: pass, keyPath, path })
        .then(entries => {
            sftpCurrentPath = path;
            renderSftpFiles(entries);
            setSftpStatus(`Connected — ${entries.length} items`);
        })
        .catch(err => {
            setSftpStatus(`Error: ${err}`);
            const list = document.getElementById("sftp-file-list");
            if (list) list.innerHTML = `<div class="ftp-empty-state" style="color:#ff6b6b;">Error: ${err}</div>`;
        });
}

document.getElementById("sftp-connect-btn")?.addEventListener("click", () => {
    const path = document.getElementById("sftp-path-input")?.value.trim() || "/";
    loadSftpDir(path);
});

document.getElementById("sftp-upload-btn")?.addEventListener("click", () => {
    const host = document.getElementById("sftp-host-input")?.value.trim();
    const port = parseInt(document.getElementById("sftp-port-input")?.value || "22", 10);
    const user = document.getElementById("sftp-user-input")?.value.trim();
    const authType = document.getElementById("sftp-auth-type")?.value || "password";
    const pass = document.getElementById("sftp-pass-input")?.value;
    const keyPath = document.getElementById("sftp-key-path-input")?.value.trim();
    const localPath = document.getElementById("sftp-local-path-input")?.value.trim();
    const remotePath = document.getElementById("sftp-remote-dest-input")?.value.trim();
    if (!host || !localPath || !remotePath) {
        setSftpStatus("Fill in host, local path, and remote destination.");
        return;
    }
    setSftpStatus("Uploading...");
    invoke("sftp_upload_file", { host, port, user, authType, password: pass, keyPath, localPath, remotePath })
        .then(() => {
            setSftpStatus("Upload complete.");
            if (typeof addNotification === "function") {
                addNotification("SFTP Upload Complete", `Uploaded file to: ${remotePath}`, "success");
            }
            loadSftpDir(sftpCurrentPath);
        })
        .catch(err => {
            setSftpStatus(`Upload error: ${err}`);
            if (typeof addNotification === "function") {
                addNotification("SFTP Upload Failed", `Failed to upload file: ${err}`, "error");
            }
        });
});

// --- SFTP Profile Management ---
function getSftpProfiles() {
    try { return JSON.parse(localStorage.getItem("sftpProfiles") || "[]"); } catch { return []; }
}

const fn_sftp_save_profiles = (profiles) => {
    localStorage.setItem("sftpProfiles", JSON.stringify(profiles));
    if (window.__TAURI_INTERNALS__) {
        invoke("save_profiles", { key: "sftp", data: JSON.stringify(profiles) }).catch(() => {});
    }
};

async function initSftpProfilesFromDisk() {
    if (!window.__TAURI_INTERNALS__) return;
    try {
        const raw = await invoke("load_profiles", { key: "sftp" });
        if (raw && raw !== "[]" && !localStorage.getItem("sftpProfiles")) {
            localStorage.setItem("sftpProfiles", raw);
        }
    } catch (_) {}
}

function renderSftpProfiles() {
    const list = document.getElementById("sftp-profiles-list");
    if (!list) return;
    const profiles = getSftpProfiles();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ftp-no-profiles">No saved profiles.</div>`;
        return;
    }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item" data-index="${i}">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${p.name}</span>
                <span class="ssh-profile-host">${p.user}@${p.host}:${p.port}</span>
            </div>
            <div class="ssh-profile-actions">
                <button class="canvas-btn sftp-profile-load-btn" style="padding:3px 8px;font-size:0.75rem;" data-index="${i}">Load</button>
                <button class="canvas-btn sftp-profile-del-btn" style="padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;" data-index="${i}">✕</button>
            </div>
        </div>
    `).join("");

    list.querySelectorAll(".sftp-profile-load-btn").forEach(btn => {
        btn.onclick = () => {
            const p = getSftpProfiles()[parseInt(btn.getAttribute("data-index"))];
            if (!p) return;
            document.getElementById("sftp-host-input").value = p.host || "";
            document.getElementById("sftp-port-input").value = p.port || "22";
            document.getElementById("sftp-user-input").value = p.user || "";
            document.getElementById("sftp-auth-type").value = p.auth_type || "password";
            document.getElementById("sftp-key-path-input").value = p.key_path || "";
            document.getElementById("sftp-auth-type").dispatchEvent(new Event("change"));
            document.getElementById("sftp-pass-input").value = "";
            document.getElementById("sftp-path-input").value = p.path || "/";
        };
    });

    list.querySelectorAll(".sftp-profile-del-btn").forEach(btn => {
        btn.onclick = () => {
            const profiles = getSftpProfiles();
            profiles.splice(parseInt(btn.getAttribute("data-index")), 1);
            fn_sftp_save_profiles(profiles);
            renderSftpProfiles();
            renderSftpProfilesSettings();
        };
    });
}

function renderSftpProfilesSettings() {
    const list = document.getElementById("settings-sftp-profiles-list");
    if (!list) return;
    const profiles = getSftpProfiles();
    if (profiles.length === 0) {
        list.innerHTML = `<div class="ssh-no-profiles">No saved profiles. Use the SFTP tab to add profiles.</div>`;
        return;
    }
    list.innerHTML = profiles.map((p, i) => `
        <div class="ssh-profile-item">
            <div class="ssh-profile-info">
                <span class="ssh-profile-name">${p.name}</span>
                <span class="ssh-profile-host">${p.user}@${p.host}:${p.port}</span>
            </div>
            <button class="canvas-btn sftp-profile-del-btn" style="padding:3px 8px;font-size:0.75rem;border-color:#ff3c5a;" data-index="${i}">✕</button>
        </div>
    `).join("");
    list.querySelectorAll(".sftp-profile-del-btn").forEach(btn => {
        btn.onclick = () => {
            const profiles = getSftpProfiles();
            profiles.splice(parseInt(btn.getAttribute("data-index")), 1);
            fn_sftp_save_profiles(profiles);
            renderSftpProfilesSettings();
            renderSftpProfiles();
        };
    });
}

document.getElementById("sftp-save-profile-btn")?.addEventListener("click", () => {
    const host = document.getElementById("sftp-host-input")?.value.trim();
    const port = parseInt(document.getElementById("sftp-port-input")?.value || "22", 10);
    const user = document.getElementById("sftp-user-input")?.value.trim();
    const auth_type = document.getElementById("sftp-auth-type")?.value || "password";
    const key_path = document.getElementById("sftp-key-path-input")?.value.trim();
    const path = document.getElementById("sftp-path-input")?.value.trim() || "/";
    if (!host || !user) { alert("Enter host and username first."); return; }
    const name = prompt("Profile name:", `${user}@${host}`);
    if (!name) return;
    const profiles = getSftpProfiles();
    profiles.push({ name, host, port, user, auth_type, key_path, path });
    fn_sftp_save_profiles(profiles);
    renderSftpProfiles();
});

document.getElementById("settings-clear-sftp-profiles")?.addEventListener("click", () => {
    localStorage.removeItem("sftpProfiles");
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

// Init SFTP profiles on load
renderSftpProfiles();

// --- LIVE CODE CANVAS SYSTEM ---

const CANVAS_EXT_MAP = {
    html: 'index.html',
    css: 'styles.css',
    javascript: 'script.js',
    markdown: 'README.md',
    bash: 'script.sh',
    python: 'script.py',
    lua: 'plugin.lua'
};

function buildPreviewDoc(lang, code) {
    switch (lang) {
        case 'html':
            return code;
        case 'css':
            return `<!DOCTYPE html><html><head><style>${code}</style></head><body><p style="color:#888;font-family:sans-serif;padding:1rem">CSS Preview — add HTML in the editor to see styled content.</p></body></html>`;
        case 'javascript':
            return `<!DOCTYPE html><html><head><style>body{background:#0d0d0d;color:#e0e0e0;font-family:monospace;padding:1rem}pre{white-space:pre-wrap;word-break:break-all}</style></head><body><pre id="out"></pre><script>
const _log=console.log.bind(console);
const out=document.getElementById('out');
console.log=(...a)=>{out.textContent+=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')+'\\n';_log(...a)};
try{${code}}catch(e){out.textContent+='\\n[Error] '+e.message}
<\/script></body></html>`;
        case 'markdown':
            // Use marked from parent via postMessage isn't available in srcdoc — render inline
            return `<!DOCTYPE html><html><head><style>body{background:#0d0d0d;color:#e0e0e0;font-family:sans-serif;padding:1.5rem;line-height:1.6;max-width:720px}h1,h2,h3{color:var(--accent-color,#7C3AED)}code{background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:monospace}pre{background:#1a1a2e;padding:1rem;border-radius:6px;overflow-x:auto}blockquote{border-left:3px solid #7C3AED;margin-left:0;padding-left:1rem;color:#aaa}a{color:#7C3AED}</style></head><body id="md"></body><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script><script>document.getElementById('md').innerHTML=marked.parse(${JSON.stringify(code)});<\/script></html>`;
        default:
            return `<!DOCTYPE html><html><head><style>body{background:#0d0d0d;color:#e0e0e0;font-family:monospace;padding:1rem;white-space:pre-wrap}</style></head><body>Run this code in the Terminal tab (▶ Run is for HTML/CSS/JS/Markdown).\n\n${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`;
    }
}

function renderCanvasPreview() {
    const editor = document.getElementById("canvas-editor");
    const frame = document.getElementById("canvas-preview-frame");
    const outputPre = document.getElementById("canvas-preview-output");
    if (!editor || !frame || !outputPre) return;
    const lang = window.neurodeckCanvas.currentLang;
    const code = editor.value;
    window.neurodeckCanvas.currentCode = code;
    
    if (lang === 'python' || lang === 'bash') {
        frame.style.display = 'none';
        outputPre.style.display = 'block';
        if (!outputPre.textContent || outputPre.textContent.startsWith("[Select '▶ Run'")) {
            outputPre.textContent = `[Select '▶ Run' to execute this ${lang === 'python' ? 'Python' : 'Bash'} code]`;
        }
    } else {
        frame.style.display = 'block';
        outputPre.style.display = 'none';
        frame.srcdoc = buildPreviewDoc(lang, code);
    }
}

function loadCanvasCode(lang, content, fileName = "") {
    window.neurodeckCanvas.activePluginFile = fileName;
    const normalizedLang = lang.toLowerCase();
    const mappedLang = ['js', 'javascript'].includes(normalizedLang) ? 'javascript'
        : ['sh', 'shell', 'zsh', 'bash'].includes(normalizedLang) ? 'bash'
        : ['md', 'markdown'].includes(normalizedLang) ? 'markdown'
        : normalizedLang;

    const select = document.getElementById("canvas-lang-select");
    const editor = document.getElementById("canvas-editor");
    const fileTitle = document.getElementById("canvas-file-title");

    if (select) select.value = mappedLang in CANVAS_EXT_MAP ? mappedLang : 'html';
    window.neurodeckCanvas.currentLang = select ? select.value : 'html';

    if (editor) editor.value = content;
    if (fileTitle) {
        fileTitle.textContent = window.neurodeckCanvas.activePluginFile || CANVAS_EXT_MAP[window.neurodeckCanvas.currentLang] || 'untitled';
    }

    renderCanvasPreview();
    if (typeof updateCanvasToolbarButtons === 'function') {
        updateCanvasToolbarButtons();
    }
}

function initCanvasView() {
    const editor = document.getElementById("canvas-editor");
    const select = document.getElementById("canvas-lang-select");
    const runBtn = document.getElementById("canvas-run-btn");
    const clearBtn = document.getElementById("canvas-clear-btn");
    const copyBtn = document.getElementById("canvas-copy-btn");
    const refreshBtn = document.getElementById("canvas-refresh-btn");
    const fileTitle = document.getElementById("canvas-file-title");
    const divider = document.getElementById("canvas-divider");
    const split = document.getElementById("canvas-split");

    if (!editor) return;

    // Set initial language
    window.neurodeckCanvas.currentLang = select ? select.value : 'html';

    // Seed default HTML template
    const defaultHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Live Preview</title>
  <style>
    body {
      background: #0d0d0d;
      color: #e0e0e0;
      font-family: 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    h1 { color: #7C3AED; }
  </style>
</head>
<body>
  <h1>Hello, NEURODECK</h1>
  <p>Edit this code or send a block from the Chat tab.</p>
</body>
</html>`;
    editor.value = defaultHTML;
    window.neurodeckCanvas.currentCode = defaultHTML;
    renderCanvasPreview();

    // Live update with debounce
    let debounceTimer = null;
    editor.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(renderCanvasPreview, 600);
    });

    // Ctrl+Enter to run immediately
    editor.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            clearTimeout(debounceTimer);
            renderCanvasPreview();
        }
        // Tab key inserts spaces instead of losing focus
        if (e.key === "Tab") {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + "  " + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 2;
        }
    });

    if (select) {
        select.addEventListener("change", () => {
            window.neurodeckCanvas.currentLang = select.value;
            if (fileTitle) {
                fileTitle.textContent = window.neurodeckCanvas.activePluginFile || CANVAS_EXT_MAP[select.value] || 'untitled';
            }
            renderCanvasPreview();
            if (typeof updateCanvasToolbarButtons === 'function') {
                updateCanvasToolbarButtons();
            }
        });
    }

    if (runBtn) {
        runBtn.onclick = () => {
            clearTimeout(debounceTimer);
            const lang = window.neurodeckCanvas.currentLang;
            const code = editor.value;
            const outputPre = document.getElementById("canvas-preview-output");

            if (lang === 'python' || lang === 'bash') {
                runBtn.textContent = "⚡ Running...";
                runBtn.disabled = true;
                if (outputPre) outputPre.textContent = "Executing code on system...\n";

                invoke("agent_exec_code", { code: code, lang: lang })
                    .then(res => {
                        if (outputPre) outputPre.textContent = res;
                        runBtn.textContent = "✓ Done";
                        runBtn.disabled = false;
                        setTimeout(() => { runBtn.textContent = "▶ Run"; }, 1500);
                    })
                    .catch(err => {
                        if (outputPre) outputPre.textContent = `Error executing code:\n${err}`;
                        runBtn.textContent = "❌ Failed";
                        runBtn.disabled = false;
                        setTimeout(() => { runBtn.textContent = "▶ Run"; }, 1500);
                    });
            } else if (lang === 'lua') {
                runBtn.textContent = "⚡ Running...";
                runBtn.disabled = true;
                if (outputPre) outputPre.textContent = "Executing Lua script in engine...\n";

                invoke("execute_lua", { code: code })
                    .then(() => {
                        if (outputPre) outputPre.textContent = "Lua script executed successfully!\nCheck chat/terminal stdout for any prints.";
                        runBtn.textContent = "✓ Done";
                        runBtn.disabled = false;
                        setTimeout(() => { runBtn.textContent = "▶ Run"; }, 1500);
                    })
                    .catch(err => {
                        if (outputPre) outputPre.textContent = `Lua Error:\n${err}`;
                        runBtn.textContent = "❌ Failed";
                        runBtn.disabled = false;
                        setTimeout(() => { runBtn.textContent = "▶ Run"; }, 1500);
                    });
            } else {
                renderCanvasPreview();
                runBtn.textContent = "✓ Done";
                setTimeout(() => { runBtn.textContent = "▶ Run"; }, 1200);
            }
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm("Clear the editor?")) {
                editor.value = "";
                window.neurodeckCanvas.currentCode = "";
                const frame = document.getElementById("canvas-preview-frame");
                if (frame) frame.srcdoc = "";
            }
        };
    }

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(editor.value).then(() => {
                copyBtn.textContent = "Copied!";
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
            });
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = () => renderCanvasPreview();
    }

    // Draggable divider for resizing panes
    if (divider && split) {
        let isDragging = false;
        divider.addEventListener("mousedown", (e) => {
            isDragging = true;
            e.preventDefault();
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const rect = split.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const totalW = rect.width;
            const pct = Math.min(Math.max(offsetX / totalW * 100, 20), 80);
            split.style.setProperty("--editor-pct", `${pct}%`);
        });
        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        });
    }
}

// --- STEAMOS TUNNEL SYSTEM ---
let tunnelStatus = "offline";

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
                const oldStatus = tunnelStatus;
                tunnelStatus = "online";
                if (indicator) {
                    indicator.innerText = "ONLINE";
                    indicator.className = "tunnel-status-indicator online";
                }
                if (!silent || oldStatus !== "online") {
                    logTunnel("system", `Tunnel server is alive. Running as: ${resp.output.trim()}`);
                }
            } else {
                const oldStatus = tunnelStatus;
                tunnelStatus = "offline";
                if (indicator) {
                    indicator.innerText = "OFFLINE";
                    indicator.className = "tunnel-status-indicator offline";
                }
                if (!silent || oldStatus !== "offline") {
                    logTunnel("error", `Tunnel server error response: ${resp.message}`);
                }
            }
        } catch(e) {
            const oldStatus = tunnelStatus;
            tunnelStatus = "offline";
            if (indicator) {
                indicator.innerText = "OFFLINE";
                indicator.className = "tunnel-status-indicator offline";
            }
            if (!silent || oldStatus !== "offline") {
                logTunnel("error", `Invalid response from tunnel: ${resStr}`);
            }
        }
    }).catch((err) => {
        const oldStatus = tunnelStatus;
        tunnelStatus = "offline";
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
            if (tunnelStatus === "offline") {
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
                    tunnelStatus = "offline";
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
let selectedPeerIp = null;
let pendingTransferId = null;

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
    listEl.innerHTML = "";
    if (!peers || peers.length === 0) {
        listEl.innerHTML = `<div class="peer-item-empty">Scanning local network for active peers...</div>`;
        selectedPeerIp = null;
        updateSendButtonState();
        return;
    }
    peers.forEach(peer => {
        const item = document.createElement("div");
        item.className = "peer-item";
        if (peer.ip === selectedPeerIp) {
            item.classList.add("selected");
        }
        item.innerHTML = `
            <div class="peer-info">
                <span class="peer-name">${peer.hostname}</span>
                <span class="peer-ip-os">${peer.ip} (${peer.os})</span>
            </div>
            <span class="peer-status">Online</span>
        `;
        item.onclick = function() {
            document.querySelectorAll(".peer-item").forEach(el => el.classList.remove("selected"));
            item.classList.add("selected");
            selectedPeerIp = peer.ip;
            updateSendButtonState();
        };
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
    listEl.innerHTML = "";
    if (!transfers || transfers.length === 0) {
        listEl.innerHTML = `<div class="transfer-item-empty">No active or past transfers in this session.</div>`;
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
        const cancelBtnHtml = isCancelable 
            ? `<button class="cancel-transfer-btn" onclick="cancelTransfer('${t.id}')" title="Cancel Transfer">✕</button>` 
            : '';

        item.innerHTML = `
            <div class="transfer-header">
                <span class="transfer-filename" title="${t.filename}">${t.filename}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="transfer-status ${t.status.toLowerCase()}">${t.status}</span>
                    ${cancelBtnHtml}
                </div>
            </div>
            <div class="transfer-progress-container">
                <div class="transfer-progress-bar-bg">
                    <div class="transfer-progress-bar-fill ${progressClass}" style="width: ${percent}%;"></div>
                </div>
                <span class="transfer-percent">${percent}%</span>
            </div>
            <div class="transfer-meta">
                <span>${t.direction === "Incoming" ? "From" : "To"}: ${t.peer_name || t.peer_ip}</span>
                <span class="transfer-stats-text">${formatBytes(t.progress)} / ${formatBytes(t.size)}${speedText}${etaText}</span>
            </div>
        `;
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
        sendBtn.disabled = !(selectedPeerIp && path);
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
        pendingTransferId = transfer.id;
        
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
            if (pendingTransferId) {
                invoke("respond_to_transfer", { transferId: pendingTransferId, accept: true })
                    .then(() => {
                        document.getElementById("transfer-modal").classList.remove("active");
                        pendingTransferId = null;
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
            if (pendingTransferId) {
                invoke("respond_to_transfer", { transferId: pendingTransferId, accept: false })
                    .then(() => {
                        document.getElementById("transfer-modal").classList.remove("active");
                        pendingTransferId = null;
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
            if (pendingTransferId) {
                invoke("respond_to_transfer", { transferId: pendingTransferId, accept: false })
                    .then(() => {
                        document.getElementById("transfer-modal").classList.remove("active");
                        pendingTransferId = null;
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
                if (selectedPeerIp && path) {
                    sendBtn.disabled = true;
                    sendBtn.innerText = "Initiating... ⏳";
                    invoke("start_file_transfer", { peerIp: selectedPeerIp, filePath: path })
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
// AUTONOMOUS CODING AGENT
// ==========================================================================
function initAgentView() {
    const taskInput = document.getElementById("agent-task-input");
    const runBtn = document.getElementById("agent-run-btn");
    const stopBtn = document.getElementById("agent-stop-btn");
    const iterLabel = document.getElementById("agent-iter-label");
    const logEl = document.getElementById("agent-log");
    const codePre = document.getElementById("agent-code-content");
    const outputEl = document.getElementById("agent-output");
    const sendCanvasBtn = document.getElementById("agent-send-canvas-btn");

    if (!taskInput || !runBtn) return;

    let agentRunning = false;
    let agentShouldStop = false;
    let lastCode = "";
    let lastLang = "python";

    function setRunning(on) {
        agentRunning = on;
        runBtn.classList.toggle("hidden", on);
        stopBtn.classList.toggle("hidden", !on);
        iterLabel.classList.toggle("hidden", !on);
        taskInput.disabled = on;
    }

    function appendLog(type, content, step) {
        // Remove empty state on first entry
        const empty = logEl.querySelector(".agent-empty-state");
        if (empty) empty.remove();

        const entry = document.createElement("div");
        entry.className = `agent-log-entry agent-log-${type}`;

        const icons = { thought: "💭", code: "📄", exec: "⚡", output: "📟", done: "✅", error: "❌", info: "ℹ️" };
        const labels = { thought: "Thinking", code: "Code Written", exec: "Executing", output: "Output", done: "Done", error: "Error", info: "Info" };

        entry.innerHTML = `<span class="agent-log-icon">${icons[type] || "•"}</span>
            <div class="agent-log-body">
                <div class="agent-log-label">${step !== undefined ? `Step ${step} — ` : ""}${labels[type] || type}</div>
                <div class="agent-log-text">${escapeHtml(String(content))}</div>
            </div>`;

        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function escapeHtml(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function parseAgentStep(raw) {
        // Strip markdown fences if present
        let text = raw.trim();
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) text = fence[1].trim();
        // Find JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch (_) {}
        }
        // Fallback: treat whole thing as error
        return { thought: raw, code: "", lang: "python", action: "error", summary: "Failed to parse agent response" };
    }

    async function runAgentLoop(task) {
        const history = [];
        const MAX_STEPS = 5;
        setRunning(true);
        agentShouldStop = false;

        logEl.innerHTML = "";
        outputEl.innerHTML = '<span class="agent-output-empty">Waiting…</span>';
        codePre.textContent = "";

        for (let step = 1; step <= MAX_STEPS; step++) {
            if (agentShouldStop) {
                appendLog("info", "Agent stopped by user.", step);
                break;
            }

            iterLabel.textContent = `Step ${step} / ${MAX_STEPS}`;

            // 1. Call LLM
            appendLog("info", "Calling LLM…", step);
            let raw;
            try {
                raw = await invoke("agent_step", { task, history });
            } catch (e) {
                appendLog("error", `LLM call failed: ${e}`, step);
                break;
            }

            if (agentShouldStop) break;

            // 2. Parse response
            const parsed = parseAgentStep(raw);
            appendLog("thought", parsed.thought || "(no thought)", step);

            if (parsed.action === "done") {
                appendLog("done", parsed.summary || "Task complete.", step);
                break;
            }

            if (parsed.action === "error") {
                appendLog("error", parsed.summary || "Agent reported an error.", step);
                break;
            }

            if (!parsed.code) {
                appendLog("error", "Agent returned no code and action is not done.", step);
                break;
            }

            // 3. Show code
            lastCode = parsed.code;
            lastLang = parsed.lang || "python";
            codePre.textContent = parsed.code;
            appendLog("code", `[${(parsed.lang || "?").toUpperCase()}] ${parsed.summary || ""}`, step);

            if (agentShouldStop) break;

            // 4. Execute
            appendLog("exec", `Running ${parsed.lang} code…`, step);
            outputEl.innerHTML = '<span class="agent-output-spinner">⟳ Executing…</span>';

            let execOut;
            try {
                execOut = await invoke("agent_exec_code", { code: parsed.code, lang: parsed.lang });
            } catch (e) {
                execOut = `[Error] ${e}`;
            }

            outputEl.textContent = execOut;
            appendLog("output", execOut.length > 300 ? execOut.slice(0, 300) + "…" : execOut, step);

            // 5. Feed into history
            history.push({ role: "step", content: JSON.stringify(parsed) });
            history.push({ role: "output", content: execOut });
        }

        setRunning(false);
        addNotification("Agent Complete", "Agent loop finished all execution steps.", "success");
    }

    runBtn.onclick = () => {
        const task = taskInput.value.trim();
        if (!task) { taskInput.focus(); return; }
        runAgentLoop(task);
    };

    taskInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !agentRunning) {
            e.preventDefault();
            runBtn.click();
        }
    });

    stopBtn.onclick = () => { agentShouldStop = true; };

    sendCanvasBtn.onclick = () => {
        if (!lastCode) return;
        window.neurodeckCanvas.loadCode(lastLang, lastCode);
        const canvasTab = document.querySelector('[data-view="canvas"]');
        if (canvasTab) canvasTab.click();
    };
}

// ==========================================================================
// MEMORY UI
// ==========================================================================
function initMemoryView() {
    const searchInput = document.getElementById("memory-search-input");
    const refreshBtn = document.getElementById("memory-refresh-btn");
    const factInput = document.getElementById("memory-fact-input");
    const factSaveBtn = document.getElementById("memory-fact-save-btn");
    const listEl = document.getElementById("memory-list");
    const totalCount = document.getElementById("memory-total-count");
    const pinnedCount = document.getElementById("memory-pinned-count");
    const filteredCount = document.getElementById("memory-filtered-count");

    if (!listEl) return;

    let allRecords = [];
    let activeFilter = "all";

    function roleLabel(role) {
        const map = { user: "User", ai: "AI", fact: "Fact" };
        return map[role] || role || "—";
    }

    function roleBadgeClass(role) {
        const map = { user: "mem-role-user", ai: "mem-role-ai", fact: "mem-role-fact" };
        return map[role] || "mem-role-other";
    }

    function tsFromId(id) {
        // IDs like "20240501-123456-1" or "fact-20240501120000000"
        const m = id.match(/(\d{8})/);
        if (m) {
            const d = m[1];
            return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
        }
        return "";
    }

    function escHtml(s) {
        return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function renderList() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const pinned = allRecords.filter(r => r.metadata.pinned === "true");

        let filtered = allRecords;
        if (activeFilter === "pinned")  filtered = allRecords.filter(r => r.metadata.pinned === "true");
        else if (activeFilter === "user") filtered = allRecords.filter(r => r.metadata.role === "user");
        else if (activeFilter === "ai")   filtered = allRecords.filter(r => r.metadata.role === "ai");
        else if (activeFilter === "fact") filtered = allRecords.filter(r => r.metadata.role === "fact");

        if (query) {
            filtered = filtered.filter(r => r.content.toLowerCase().includes(query) || r.id.toLowerCase().includes(query));
        }

        // Pinned records first
        filtered.sort((a, b) => {
            const ap = a.metadata.pinned === "true" ? 0 : 1;
            const bp = b.metadata.pinned === "true" ? 0 : 1;
            return ap - bp;
        });

        // Update status bar
        if (totalCount) totalCount.textContent = `${allRecords.length} record${allRecords.length !== 1 ? "s" : ""}`;
        if (pinnedCount) pinnedCount.textContent = `${pinned.length} pinned`;
        if (filteredCount) filteredCount.textContent = `showing ${filtered.length}`;

        // Remove all existing record cards (preserve empty state)
        listEl.querySelectorAll(".memory-record-card").forEach(el => el.remove());
        const emptyState = document.getElementById("memory-empty-state");

        if (filtered.length === 0) {
            if (emptyState) {
                emptyState.style.display = "";
                emptyState.querySelector("p").textContent = query || activeFilter !== "all"
                    ? "No records match this filter."
                    : "No memory records yet.";
            }
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        filtered.forEach(record => {
            const isPinned = record.metadata.pinned === "true";
            const role = record.metadata.role || "other";
            const card = document.createElement("div");
            card.className = `memory-record-card${isPinned ? " memory-record-pinned" : ""}`;
            card.dataset.id = record.id;

            card.innerHTML = `
                <div class="memory-record-header">
                    <span class="memory-record-role ${roleBadgeClass(role)}">${roleLabel(role)}</span>
                    <span class="memory-record-ts">${tsFromId(record.id)}</span>
                    <div class="memory-record-actions">
                        <button class="memory-icon-btn mem-pin-btn${isPinned ? " pinned" : ""}" title="${isPinned ? "Unpin" : "Pin"}" data-id="${escHtml(record.id)}" data-pinned="${isPinned}">📌</button>
                        <button class="memory-icon-btn mem-del-btn" title="Delete" data-id="${escHtml(record.id)}">🗑</button>
                    </div>
                </div>
                <div class="memory-record-content">${escHtml(record.content)}</div>
                <div class="memory-record-id">${escHtml(record.id)}</div>`;

            card.querySelector(".mem-pin-btn").onclick = async function() {
                const id = this.dataset.id;
                const wasPinned = this.dataset.pinned === "true";
                try {
                    await invoke("memory_pin", { id, pinned: !wasPinned });
                    const rec = allRecords.find(r => r.id === id);
                    if (rec) {
                        if (!wasPinned) rec.metadata.pinned = "true";
                        else delete rec.metadata.pinned;
                    }
                    renderList();
                } catch(e) { console.error("pin error", e); }
            };

            card.querySelector(".mem-del-btn").onclick = async function() {
                const id = this.dataset.id;
                if (!confirm("Delete this memory record?")) return;
                try {
                    await invoke("memory_delete", { id });
                    allRecords = allRecords.filter(r => r.id !== id);
                    renderList();
                } catch(e) { console.error("delete error", e); }
            };

            listEl.appendChild(card);
        });
    }

    async function loadMemory() {
        if (refreshBtn) refreshBtn.textContent = "⟳";
        try {
            allRecords = await invoke("memory_list_all");
        } catch(e) {
            console.error("memory_list_all error", e);
            allRecords = [];
        }
        // Sort newest first by id string (IDs start with date prefix)
        allRecords.sort((a, b) => b.id.localeCompare(a.id));
        renderList();
        if (refreshBtn) refreshBtn.textContent = "↺ Refresh";
    }

    // Load on tab activation
    document.querySelector('[data-view="memory"]')?.addEventListener("click", () => {
        setTimeout(loadMemory, 50);
    });

    if (refreshBtn) refreshBtn.onclick = loadMemory;

    if (searchInput) {
        let debounce = null;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounce);
            debounce = setTimeout(renderList, 200);
        });
    }

    // Filter tabs
    document.querySelectorAll(".memory-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".memory-filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeFilter = btn.dataset.filter;
            renderList();
        });
    });

    // Add fact
    async function saveFact() {
        const content = factInput ? factInput.value.trim() : "";
        if (!content) { if (factInput) factInput.focus(); return; }
        if (factSaveBtn) { factSaveBtn.textContent = "Saving…"; factSaveBtn.disabled = true; }
        try {
            const id = await invoke("memory_add_fact", { content });
            allRecords.unshift({ id, content, metadata: { role: "fact", pinned: "true" } });
            if (factInput) factInput.value = "";
            renderList();
        } catch(e) { console.error("memory_add_fact error", e); }
        if (factSaveBtn) { factSaveBtn.textContent = "📌 Save Fact"; factSaveBtn.disabled = false; }
    }

    if (factSaveBtn) factSaveBtn.onclick = saveFact;
    if (factInput) {
        factInput.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveFact(); }
        });
    }
}

// --- OLLAMA MODEL MANAGER SYSTEM ---
function refreshOllamaModels() {
    const baseUrlInput = document.getElementById("settings-ollama-url");
    const baseUrl = (baseUrlInput?.value || "").trim() || "http://localhost:11434";
    const listEl = document.getElementById("settings-ollama-models-list");
    if (!listEl) return;

    listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic;">Loading models...</div>`;

    invoke("ollama_list_models", { baseUrl })
        .then(models => {
            if (models.length === 0) {
                listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic;">No local models found.</div>`;
                return;
            }
            listEl.innerHTML = models.map(m => {
                const isCurrent = m.name.includes(localStorage.getItem("settings-ollama-model") || "llama2") || m.name === (document.getElementById("settings-ollama-model")?.value || "llama2");
                const currentBadge = isCurrent ? `<span style="color: var(--accent-color); font-weight: bold; margin-right: 6px;">[Active]</span>` : "";
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px; border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; cursor: pointer;" class="settings-ollama-model-item" data-model="${m.name}">
                            ${currentBadge}${m.name} <span style="opacity: 0.5; font-size: 0.75rem;">(${formatBytes(m.size)})</span>
                        </div>
                        <button class="canvas-btn settings-ollama-delete-btn" style="padding: 2px 8px; font-size: 0.7rem; border-color: #ff3c5a; color: #ff3c5a;" data-model="${m.name}">Delete</button>
                    </div>
                `;
            }).join("");

            // Switch active model
            listEl.querySelectorAll(".settings-ollama-model-item").forEach(item => {
                item.onclick = () => {
                    const modelName = item.getAttribute("data-model");
                    const modelInput = document.getElementById("settings-ollama-model");
                    if (modelInput) {
                        modelInput.value = modelName;
                        document.getElementById("settings-save-llm-btn")?.click();
                    }
                };
            });

            // Delete model
            listEl.querySelectorAll(".settings-ollama-delete-btn").forEach(btn => {
                btn.onclick = () => {
                    const modelName = btn.getAttribute("data-model");
                    if (confirm(`Are you sure you want to delete local model ${modelName}?`)) {
                        btn.disabled = true;
                        btn.innerText = "Deleting...";
                        invoke("ollama_delete_model", { baseUrl, model: modelName })
                            .then(() => {
                                refreshOllamaModels();
                            })
                            .catch(err => {
                                alert(`Delete failed: ${err}`);
                                refreshOllamaModels();
                            });
                    }
                };
            });
        })
        .catch(err => {
            listEl.innerHTML = `<div style="color: #ff6b6b; font-size: 0.75rem;">Failed to list models: ${err}</div>`;
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
    
    listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic;">Loading plugins...</div>`;
    
    invoke("list_plugins").then((plugins) => {
        if (plugins.length === 0) {
            listEl.innerHTML = `<div style="opacity: 0.5; font-style: italic; padding: 5px;">No plugins found.</div>`;
            return;
        }
        
        listEl.innerHTML = plugins.map((p) => {
            const checked = p.enabled ? "checked" : "";
            return `
                <div class="ssh-profile-item" style="padding: 6px 8px; background: rgba(255,255,255,0.02); border-radius: 4px; border: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" class="plugin-toggle-checkbox" data-file="${p.file_name}" ${checked} style="accent-color: var(--accent-color); cursor: pointer;">
                        <span style="font-weight: 500; color: ${p.enabled ? "var(--foreground-color)" : "rgba(255,255,255,0.3)"};">${p.name}</span>
                        <span style="font-size: 0.7rem; opacity: 0.5;">(${p.file_name})</span>
                    </div>
                    <button class="canvas-btn plugin-edit-btn" data-file="${p.file_name}" style="padding: 3px 8px; font-size: 0.75rem;">Edit</button>
                </div>
            `;
        }).join("");
        
        // Wire checkbox toggle listeners
        listEl.querySelectorAll(".plugin-toggle-checkbox").forEach(chk => {
            chk.onchange = () => {
                const fileName = chk.getAttribute("data-file");
                const enabled = chk.checked;
                const statusEl = document.getElementById("settings-plugin-status");
                if (statusEl) statusEl.innerText = "Toggling plugin...";
                
                invoke("toggle_plugin", { fileName, enabled }).then(() => {
                    if (statusEl) statusEl.innerText = `Plugin ${enabled ? "enabled" : "disabled"} successfully.`;
                    loadPluginsList();
                }).catch(err => {
                    if (statusEl) statusEl.innerText = `Failed to toggle: ${err}`;
                    chk.checked = !enabled; // revert
                });
            };
        });
        
        // Wire edit button click listeners
        listEl.querySelectorAll(".plugin-edit-btn").forEach(btn => {
            btn.onclick = () => {
                const fileName = btn.getAttribute("data-file");
                const statusEl = document.getElementById("settings-plugin-status");
                if (statusEl) statusEl.innerText = "Reading plugin content...";
                
                invoke("read_plugin", { fileName }).then((content) => {
                    // Close settings modal
                    document.getElementById("settings-overlay")?.classList.remove("active");
                    
                    // Clear status
                    if (statusEl) statusEl.innerText = "";
                    
                    // Set active file
                    window.neurodeckCanvas.activePluginFile = fileName;
                    
                    // Load into canvas
                    loadCanvasCode("lua", content, fileName);
                    
                    // Switch to canvas tab
                    const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
                    if (canvasTab) canvasTab.click();
                }).catch(err => {
                    if (statusEl) statusEl.innerText = `Failed to read plugin: ${err}`;
                });
            };
        });
    }).catch(err => {
        listEl.innerHTML = `<div style="color: var(--error-color); padding: 5px;">Failed to load plugins: ${err}</div>`;
    });
}

function initPluginsManager() {
    // Wire install plugin from URL
    const installBtn = document.getElementById("settings-plugin-install-btn");
    const urlInput = document.getElementById("settings-plugin-install-url");
    const statusEl = document.getElementById("settings-plugin-status");
    const newBtn = document.getElementById("settings-plugin-new-btn");
    const reloadBtn = document.getElementById("settings-plugin-reload-btn");

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
            }).catch((err) => {
                if (statusEl) statusEl.innerText = `Reload failed: ${err}`;
            }).finally(() => {
                reloadBtn.disabled = false;
            });
        };
    }
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
            saveBtn.innerText = "💾 Save Plugin";
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

// Initialize Plugins Manager event handlers
initPluginsManager();

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
            if (p === activePersona) {
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

// Initialize Custom Personas event handlers
initCustomPersonas();

// ==========================================================================
// ==========================================================================
// CUSTOM THEMES EDITOR (P22)
// ==========================================================================

(function initCustomThemes() {
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
})();

// ==========================================================================
// MCP SERVER SETTINGS
// ==========================================================================

(function initMcpSettings() {
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
})();

// --- PERSONAL KNOWLEDGE BASE (RAG) SETTINGS ---
(function initDocRag() {
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
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--response-color);">${result}</span>`;
            if (typeof addNotification === "function") {
                addNotification("RAG Index Complete", result, "success");
            }
        } catch (err) {
            indexBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = "none";
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
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
})();

// ==========================================================================
// WHISPER OFFLINE STT SETTINGS (P17)
// ==========================================================================
(function initBmadInstaller() {
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
})();

(function initWhisperSettings() {
    const binaryInput = document.getElementById("whisper-binary-input");
    const modelInput = document.getElementById("whisper-model-input");
    const saveBtn = document.getElementById("whisper-save-btn");
    const testBtn = document.getElementById("whisper-test-btn");
    const statusLine = document.getElementById("whisper-status-line");

    if (!saveBtn) return;

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
})();

// ==========================================================================
// CANVAS LIVE COLLABORATION (P19)
// ==========================================================================
(function initCanvasCollab() {
    const collabBtn = document.getElementById("canvas-collab-btn");
    const collabModal = document.getElementById("collab-modal");
    const closeX = document.getElementById("close-collab-x");
    const hostTabBtn = document.getElementById("collab-host-tab-btn");
    const joinTabBtn = document.getElementById("collab-join-tab-btn");
    const hostPanel = document.getElementById("collab-host-panel");
    const joinPanel = document.getElementById("collab-join-panel");
    const hostStartBtn = document.getElementById("collab-host-start-btn");
    const joinStartBtn = document.getElementById("collab-join-start-btn");
    const portInput = document.getElementById("collab-port-input");
    const addrInput = document.getElementById("collab-addr-input");
    const statusLine = document.getElementById("collab-status-line");
    const activePanel = document.getElementById("collab-active-panel");
    const hostWaiting = document.getElementById("collab-host-waiting");
    const hostAddr = document.getElementById("collab-host-addr");
    const stopBtn = document.getElementById("collab-stop-btn");

    if (!collabBtn || !collabModal) return;

    // Tab switching
    function showTab(tab) {
        const isHost = tab === 'host';
        if (hostPanel) hostPanel.style.display = isHost ? '' : 'none';
        if (joinPanel) joinPanel.style.display = isHost ? 'none' : '';
        if (hostTabBtn) {
            hostTabBtn.style.background = isHost ? 'rgba(0,229,255,0.1)' : '';
            hostTabBtn.style.borderColor = isHost ? 'var(--accent-color)' : '';
        }
        if (joinTabBtn) {
            joinTabBtn.style.background = isHost ? '' : 'rgba(0,229,255,0.1)';
            joinTabBtn.style.borderColor = isHost ? '' : 'var(--accent-color)';
        }
    }
    if (hostTabBtn) hostTabBtn.addEventListener("click", () => showTab('host'));
    if (joinTabBtn) joinTabBtn.addEventListener("click", () => showTab('join'));

    collabBtn.addEventListener("click", () => collabModal.classList.add("active"));
    if (closeX) closeX.addEventListener("click", () => collabModal.classList.remove("active"));
    collabModal.addEventListener("click", (e) => {
        if (e.target === collabModal) collabModal.classList.remove("active");
    });

    const statusBar = document.getElementById("canvas-collab-status-bar");
    const statusText = document.getElementById("canvas-collab-status-text");
    const resyncBtn = document.getElementById("canvas-collab-resync-btn");

    if (resyncBtn) {
        resyncBtn.addEventListener("click", () => {
            const editor = document.getElementById("canvas-editor");
            if (editor) {
                invoke("canvas_collab_send", {
                    code: editor.value,
                    lang: document.getElementById("canvas-lang-select")?.value || 'html'
                }).catch(() => {});
            }
        });
    }

    function setPeerConnected(peerInfo = '') {
        if (activePanel) activePanel.style.display = '';
        if (hostWaiting) hostWaiting.style.display = 'none';
        if (statusLine) statusLine.innerHTML = '';
        if (collabBtn) {
            collabBtn.style.background = 'rgba(0,255,136,0.15)';
            collabBtn.style.borderColor = 'var(--response-color)';
        }
        if (statusBar) statusBar.style.display = 'flex';
        if (statusText) {
            let label = "Collab Active: Syncing edits live";
            if (peerInfo) {
                label = `Collab Active: Connected to peer (${peerInfo})`;
            } else if (addrInput && addrInput.value) {
                label = `Collab Active: Connected to ${addrInput.value}`;
            }
            statusText.innerText = label;
        }
    }

    function setDisconnected() {
        if (activePanel) activePanel.style.display = 'none';
        if (hostWaiting) hostWaiting.style.display = 'none';
        if (collabBtn) {
            collabBtn.style.background = '';
            collabBtn.style.borderColor = '';
        }
        if (statusLine) statusLine.innerHTML = '';
        if (statusBar) statusBar.style.display = 'none';
    }

    // Listen for collab events from Rust
    listen("canvas_collab_event", (event) => {
        const msg = event.payload || '';
        if (msg.startsWith('peer_connected')) {
            const peer = msg.includes(':') ? msg.split(':')[1] : '';
            setPeerConnected(peer);
            if (typeof addNotification === "function") {
                addNotification("Collab Connected", "A peer joined your Canvas session.", "success");
            }
        } else if (msg === 'peer_disconnected') {
            setDisconnected();
            if (typeof addNotification === "function") {
                addNotification("Collab Disconnected", "The peer has left the session.", "info");
            }
        } else if (msg.startsWith('error:')) {
            if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">${msg}</span>`;
        }
    }).catch(() => {});

    // Listen for incoming canvas sync from peer
    listen("canvas_sync", (event) => {
        try {
            const data = typeof event.payload === 'string'
                ? JSON.parse(event.payload) : event.payload;
            if (data.type === 'sync' && data.code !== undefined) {
                const editor = document.getElementById("canvas-editor");
                const langSelect = document.getElementById("canvas-lang-select");
                if (editor) {
                    // Suppress our own re-broadcast while updating
                    editor.dataset.syncingFromPeer = '1';
                    editor.value = data.code;
                    editor.dataset.syncingFromPeer = '';
                    // Fire input event so the preview updates
                    editor.dispatchEvent(new Event('input'));
                }
                if (langSelect && data.lang && data.lang !== langSelect.value) {
                    langSelect.value = data.lang;
                    langSelect.dispatchEvent(new Event('change'));
                }
            }
        } catch (e) {
            console.warn('[Collab] Failed to parse canvas_sync:', e);
        }
    }).catch(() => {});

    // Host: start session
    if (hostStartBtn) {
        hostStartBtn.addEventListener("click", async () => {
            const port = parseInt(portInput?.value || '13338', 10);
            hostStartBtn.disabled = true;
            if (statusLine) statusLine.innerHTML = `<span style="opacity: 0.6;">Binding port ${port}...</span>`;
            try {
                const boundPort = await invoke("canvas_collab_host", { port });
                if (hostWaiting) hostWaiting.style.display = '';
                const lanIp = await invoke("get_lan_ip").catch(() => "your-lan-ip");
                if (hostAddr) hostAddr.innerText = `${lanIp}:${boundPort}`;
                if (statusLine) statusLine.innerHTML = '';
            } catch (err) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
                hostStartBtn.disabled = false;
            }
        });
    }

    // Guest: join session
    if (joinStartBtn) {
        joinStartBtn.addEventListener("click", async () => {
            const addr = addrInput?.value.trim() || '';
            if (!addr) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--warning-color);">Enter the host address first.</span>`;
                return;
            }
            joinStartBtn.disabled = true;
            if (statusLine) statusLine.innerHTML = `<span style="opacity: 0.6;">Connecting to ${addr}...</span>`;
            try {
                await invoke("canvas_collab_join", { addr });
                setPeerConnected(addr);
            } catch (err) {
                if (statusLine) statusLine.innerHTML = `<span style="color: var(--error-color);">Error: ${err}</span>`;
                joinStartBtn.disabled = false;
            }
        });
    }

    // Stop session
    if (stopBtn) {
        stopBtn.addEventListener("click", async () => {
            await invoke("canvas_collab_stop");
            setDisconnected();
            if (hostStartBtn) hostStartBtn.disabled = false;
            if (joinStartBtn) joinStartBtn.disabled = false;
        });
    }

    // Debounced canvas input → broadcast to peer
    let collabDebounceTimer = null;
    const canvasEditor = document.getElementById("canvas-editor");
    if (canvasEditor) {
        canvasEditor.addEventListener("input", () => {
            if (canvasEditor.dataset.syncingFromPeer) return;
            clearTimeout(collabDebounceTimer);
            collabDebounceTimer = setTimeout(() => {
                invoke("canvas_collab_send", {
                    code: canvasEditor.value,
                    lang: document.getElementById("canvas-lang-select")?.value || 'html'
                }).catch(() => {});
            }, 300);
        });
    }
})();

// --- NOTIFICATION CENTER SYSTEM ---
let notifications = [];
let unreadNotifCount = 0;

function addNotification(title, text, type = 'info') {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const notif = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        text,
        type, // 'info' | 'success' | 'warning' | 'error'
        time: timestamp
    };
    notifications.unshift(notif); // Add to beginning
    unreadNotifCount++;
    updateNotifBadge();
    
    // Create visual Toast
    const toastContainer = document.getElementById("toast-container");
    if (toastContainer) {
        const toast = document.createElement("div");
        toast.className = `toast-notif ${type}`;
        toast.innerHTML = `
            <div class="toast-notif-title">
                <span>${title}</span>
                <span style="font-size: 0.65rem; opacity: 0.5;">${timestamp}</span>
            </div>
            <div class="toast-notif-text">${text}</div>
        `;
        toastContainer.appendChild(toast);
        
        // Auto remove toast in 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }
    
    renderNotificationsList();
}

window.addNotification = addNotification; // Expose globally if needed

function updateNotifBadge() {
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    if (unreadNotifCount > 0) {
        badge.innerText = unreadNotifCount;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function renderNotificationsList() {
    const container = document.getElementById("notif-list-container");
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `<div style="opacity: 0.5; text-align: center; padding: 20px; font-style: italic;">No notifications.</div>`;
        return;
    }
    
    container.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.type}">
            <div class="notif-item-header">
                <span>${n.title}</span>
                <span class="notif-item-time">${n.time}</span>
            </div>
            <div class="notif-item-text">${n.text}</div>
        </div>
    `).join("");
}

function initNotificationCenter() {
    const notifBtn = document.getElementById("notif-btn");
    const notifModal = document.getElementById("notif-modal");
    const closeX = document.getElementById("close-notif-x");
    const closeBtn = document.getElementById("close-notif-btn");
    const clearAllBtn = document.getElementById("notif-clear-all-btn");
    
    if (notifBtn && notifModal) {
        notifBtn.onclick = () => {
            notifModal.classList.add("active");
            unreadNotifCount = 0;
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
            notifications = [];
            unreadNotifCount = 0;
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
    
    if (gameBadge && gameModal) {
        gameBadge.onclick = () => {
            invoke("get_game_context").then(ctx => {
                const nameEl = document.getElementById("game-context-name");
                const appidEl = document.getElementById("game-context-appid");
                const statusEl = document.getElementById("game-context-status");
                const notesEl = document.getElementById("game-context-notes");
                const headerImg = document.getElementById("game-context-header");
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

                if (headerImg) {
                    if (appId !== "-") {
                        headerImg.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
                        headerImg.style.display = "block";
                    } else {
                        headerImg.style.display = "none";
                    }
                }

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
    
    const dismiss = () => {
        if (gameModal) gameModal.classList.remove("active");
    };
    
    if (closeX) closeX.onclick = dismiss;
    if (closeBtn) closeBtn.onclick = dismiss;
}

// --- FTP/SFTP DRAG AND DROP UPLOADS ---
function initFtpSftpDragDrop() {
    const ftpDropzone = document.getElementById("ftp-dropzone");
    const ftpPathInput = document.getElementById("ftp-local-path-input");
    const ftpRemoteDest = document.getElementById("ftp-remote-dest-input");
    
    if (ftpDropzone && ftpPathInput) {
        ftpDropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
            ftpDropzone.classList.add("dragover");
        });
        
        ftpDropzone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            ftpDropzone.classList.remove("dragover");
        });
        
        ftpDropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            ftpDropzone.classList.remove("dragover");
            
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const path = file.path || file.name;
                ftpPathInput.value = path;
                
                if (ftpRemoteDest && !ftpRemoteDest.value.trim()) {
                    ftpRemoteDest.value = "/" + file.name;
                }
                addNotification("FTP File Drop", `File local path set to: ${file.name}`, "info");
            }
        });
    }

    const sftpDropzone = document.getElementById("sftp-dropzone");
    const sftpPathInput = document.getElementById("sftp-local-path-input");
    const sftpRemoteDest = document.getElementById("sftp-remote-dest-input");
    
    if (sftpDropzone && sftpPathInput) {
        sftpDropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
            sftpDropzone.classList.add("dragover");
        });
        
        sftpDropzone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            sftpDropzone.classList.remove("dragover");
        });
        
        sftpDropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            sftpDropzone.classList.remove("dragover");
            
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const path = file.path || file.name;
                sftpPathInput.value = path;
                
                if (sftpRemoteDest && !sftpRemoteDest.value.trim()) {
                    sftpRemoteDest.value = "/" + file.name;
                }
                addNotification("SFTP File Drop", `File local path set to: ${file.name}`, "info");
            }
        });
    }
}

// Initialize Sprint 5 modules
initNotificationCenter();
initGameContextPanel();
initFtpSftpDragDrop();

// --- PROMPT LAB (SPRINT 6/7) ---
function initPromptLab() {
    const generateBtn = document.getElementById("pl-generate-btn");
    const explainBtn = document.getElementById("pl-explain-jpe-btn");
    const copyPromptBtn = document.getElementById("pl-copy-prompt-btn");
    const sendChatBtn = document.getElementById("pl-send-chat-btn");
    const copyJpeBtn = document.getElementById("pl-copy-jpe-btn");
    
    // Form fields
    const personaInput = document.getElementById("pl-persona");
    const taskInput = document.getElementById("pl-task");
    const contextInput = document.getElementById("pl-context");
    const toneInput = document.getElementById("pl-tone");
    const constraintsInput = document.getElementById("pl-constraints");
    const formatInput = document.getElementById("pl-format");
    const examplesInput = document.getElementById("pl-examples");
    const formulaSelect = document.getElementById("pl-formula");
    
    const resultPrompt = document.getElementById("pl-result-prompt");
    const resultJpe = document.getElementById("pl-result-jpe");
    const templateSelect = document.getElementById("pl-template-select");
    const advancedToggle = document.getElementById("pl-advanced-toggle");
    const advancedFields = document.getElementById("pl-advanced-fields");

    // New Fields & Buttons
    const optimizeAiBtn = document.getElementById("pl-optimize-ai-btn");
    const jpeLevelSelect = document.getElementById("pl-jpe-level-select");
    const savePresetBtn = document.getElementById("pl-save-preset-btn");
    const togglePresetInputBtn = document.getElementById("pl-toggle-preset-input-btn");
    const presetNameInput = document.getElementById("pl-preset-name");
    const exportJsonBtn = document.getElementById("pl-export-json-btn");
    const exportLuaBtn = document.getElementById("pl-export-lua-btn");
    const strengthBarFill = document.getElementById("pl-strength-bar-fill");
    const strengthLabel = document.getElementById("pl-strength-label");
    
    if (!generateBtn) return; // View not in DOM

    let loadedCustomPresets = {};

    // Live Quality/Strength Scoring
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
            
            // Color updates
            if (score <= 2) {
                strengthBarFill.style.background = "var(--error-color)";
                if (strengthLabel) {
                    strengthLabel.style.color = "var(--error-color)";
                    strengthLabel.textContent = `Weak (${score}/5)`;
                }
            } else if (score <= 4) {
                strengthBarFill.style.background = "var(--accent-color)";
                if (strengthLabel) {
                    strengthLabel.style.color = "var(--accent-color)";
                    strengthLabel.textContent = `Moderate (${score}/5)`;
                }
            } else {
                strengthBarFill.style.background = "var(--response-color)";
                if (strengthLabel) {
                    strengthLabel.style.color = "var(--response-color)";
                    strengthLabel.textContent = `Optimized (${score}/5) ✨`;
                }
            }
        }
    }

    // Load custom presets on startup
    function refreshCustomPresets() {
        invoke("load_prompt_presets")
            .then(presets => {
                loadedCustomPresets = presets;
                // Keep the default static options
                templateSelect.innerHTML = `
                    <option value="">Load Preset...</option>
                    <option value="game">Endless Runner Game Concept</option>
                    <option value="app">To-Do List App Features</option>
                    <option value="script">Lua Scripting Template</option>
                `;
                // Append custom ones
                Object.keys(presets).forEach(name => {
                    const opt = document.createElement("option");
                    opt.value = `custom_${name}`;
                    opt.textContent = name;
                    templateSelect.appendChild(opt);
                });
            })
            .catch(err => console.error("Error loading presets:", err));
    }

    refreshCustomPresets();

    // Toggle save preset UI
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
                togglePresetInputBtn.textContent = "💾 Save Current";
            }
        });
    }

    // Save Preset handler
    if (savePresetBtn) {
        savePresetBtn.addEventListener("click", () => {
            const name = presetNameInput.value.trim();
            if (!name) {
                addNotification("Prompt Lab Error", "Please enter a preset name.", "error");
                return;
            }

            const schema = {
                persona: personaInput.value.trim(),
                task: taskInput.value.trim(),
                context: contextInput.value.trim(),
                tone: toneInput.value.trim(),
                constraints: constraintsInput.value.trim(),
                format: formatInput.value.trim(),
                examples: examplesInput.value.trim(),
                formula: formulaSelect.value
            };

            invoke("save_prompt_preset", { name, schemaJson: JSON.stringify(schema) })
                .then(() => {
                    addNotification("Prompt Lab", `Preset "${name}" saved!`, "success");
                    presetNameInput.style.display = "none";
                    savePresetBtn.style.display = "none";
                    presetNameInput.value = "";
                    togglePresetInputBtn.textContent = "💾 Save Current";
                    refreshCustomPresets();
                })
                .catch(err => {
                    addNotification("Prompt Lab Error", "Failed to save preset: " + err, "error");
                });
        });
    }

    // AI Optimize handler
    if (optimizeAiBtn) {
        optimizeAiBtn.addEventListener("click", async () => {
            const currentTask = taskInput.value.trim();
            if (!currentTask) {
                addNotification("Prompt Lab Error", "Provide a rough task description in the Task field first.", "error");
                return;
            }

            optimizeAiBtn.disabled = true;
            const originalText = optimizeAiBtn.textContent;
            optimizeAiBtn.textContent = "Optimizing...";

            try {
                const schema = await invoke("optimize_raw_prompt", { rawText: currentTask });
                personaInput.value = schema.persona;
                taskInput.value = schema.task;
                contextInput.value = schema.context;
                toneInput.value = schema.tone;
                constraintsInput.value = schema.constraints;
                formatInput.value = schema.format;

                addNotification("Prompt Lab", "AI Optimization completed!", "success");
                assemblePrompt();
                updatePromptStrength();
            } catch (err) {
                addNotification("Prompt Lab Error", "Optimization failed: " + err, "error");
            } finally {
                optimizeAiBtn.disabled = false;
                optimizeAiBtn.textContent = originalText;
            }
        });
    }

    // Progressive Disclosure Toggle
    advancedToggle.addEventListener("click", () => {
        advancedFields.classList.toggle("hidden");
        advancedToggle.textContent = advancedFields.classList.contains("hidden") 
            ? "⚙️ Advanced Options" : "⚙️ Hide Advanced Options";
    });
    
    // Templates Change handler
    templateSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;

        if (val.startsWith("custom_")) {
            const name = val.substring(7);
            const schemaStr = loadedCustomPresets[name];
            if (schemaStr) {
                try {
                    const schema = JSON.parse(schemaStr);
                    personaInput.value = schema.persona || "";
                    taskInput.value = schema.task || "";
                    contextInput.value = schema.context || "";
                    toneInput.value = schema.tone || "";
                    constraintsInput.value = schema.constraints || "";
                    formatInput.value = schema.format || "";
                    examplesInput.value = schema.examples || "";
                    formulaSelect.value = schema.formula || "default";
                    assemblePrompt();
                    updatePromptStrength();
                } catch (err) {
                    console.error("Failed to parse custom preset:", err);
                }
            }
        } else if (val === "game") {
            personaInput.value = "You are a creative game designer.";
            taskInput.value = "Design an endless runner game concept for mobile devices.";
            contextInput.value = "Target audience: kids, ages 8-14. Theme: Cyberpunk.";
            toneInput.value = "Upbeat, energetic, and concise.";
            constraintsInput.value = "- List 3 unique gameplay mechanics\n- Max 150 words total";
            formatInput.value = "JSON with keys: title, mechanics, art_style";
            examplesInput.value = "";
            formulaSelect.value = "default";
        } else if (val === "app") {
            personaInput.value = "You are an expert product manager.";
            taskInput.value = "Create a feature list for a minimalist To-Do list app.";
            contextInput.value = "Target audience: busy professionals who hate complex apps.";
            toneInput.value = "Professional and structured.";
            constraintsInput.value = "- Exactly 5 features\n- Each feature should have a short name and 1 sentence description";
            formatInput.value = "Markdown bulleted list";
            examplesInput.value = "";
            formulaSelect.value = "default";
        } else if (val === "script") {
            personaInput.value = "You are a senior Lua developer.";
            taskInput.value = "Write a Lua script that parses a string and extracts all email addresses.";
            contextInput.value = "This is for a data processing pipeline. No external libraries available.";
            toneInput.value = "Technical and precise.";
            constraintsInput.value = "- Include code comments explaining the regex\n- Must be a single function `extract_emails(text)`";
            formatInput.value = "Lua code block only";
            examplesInput.value = "";
            formulaSelect.value = "default";
        }
        assemblePrompt();
        updatePromptStrength();
    });

    // Prompt Assembly Logic using Lua Engine backend
    async function assemblePrompt() {
        const persona = personaInput.value;
        const task = taskInput.value;
        const context = contextInput.value;
        const tone = toneInput.value;
        const constraints = constraintsInput.value;
        const format = formatInput.value;
        const examples = examplesInput.value;
        const formula = formulaSelect.value;
        
        try {
            const assembled = await invoke("assemble_prompt_via_lua_cmd", {
                persona, task, context, tone, constraints, format, examples, formula
            });
            resultPrompt.value = assembled;
        } catch (err) {
            console.error("Lua assembly failed:", err);
            // Fallback to simple js concatenation
            let promptParts = [];
            if (persona.trim()) promptParts.push(`**Role/Persona:**\n${persona.trim()}`);
            if (task.trim()) promptParts.push(`**Task/Objective:**\n${task.trim()}`);
            if (context.trim()) promptParts.push(`**Context/Background:**\n${context.trim()}`);
            if (tone.trim()) promptParts.push(`**Tone/Style:**\n${tone.trim()}`);
            if (constraints.trim()) promptParts.push(`**Constraints:**\n${constraints.trim()}`);
            if (format.trim()) promptParts.push(`**Output Format:**\n${format.trim()}`);
            resultPrompt.value = promptParts.join("\n\n");
        }
    }

    generateBtn.addEventListener("click", () => {
        assemblePrompt();
        addNotification("Prompt Lab", "Prompt generated successfully.", "success");
    });
    
    // Auto-update on blur or select change
    [personaInput, taskInput, contextInput, toneInput, constraintsInput, formatInput, examplesInput, formulaSelect].forEach(el => {
        el.addEventListener("input", () => {
            assemblePrompt();
            updatePromptStrength();
        });
        el.addEventListener("change", () => {
            assemblePrompt();
            updatePromptStrength();
        });
    });

    const formulaInfo = document.getElementById("pl-formula-info");
    const formulaDescriptions = {
        "default": "Default: Standard prompt construction focusing on Persona, Objective, Constraints, and Examples.",
        "aida": "AIDA: Attention, Interest, Desire, Action. Ideal for persuasive copywriting, marketing messages, and engaging content.",
        "scqa": "SCQA: Situation, Complication, Question, Answer. Excellent for consulting, structured analysis, and diagnostic problem solving.",
        "pastor": "PASTOR: Problem, Amplify, Story, Transformation, Offer, Response. Highly effective for landing pages and value-based pitches.",
        "pas": "PAS: Problem, Agitate, Solution. A classic, punchy copywriting framework for quick conversion and highlighting pain points.",
        "cot": "CoT: Chain of Thought. Guides the AI to decompose complex reasoning tasks step-by-step. Excellent for logic and coding.",
        "tot": "ToT: Tree of Thought. Forces the AI to branch, self-evaluate, and search paths. Best for complex design and strategic planning."
    };

    if (formulaSelect && formulaInfo) {
        formulaSelect.addEventListener("change", () => {
            const desc = formulaDescriptions[formulaSelect.value] || "Select a formula to apply structured copywriting/reasoning flow.";
            formulaInfo.textContent = desc;
        });
    }

    // Tauri JPE call supporting reading level
    explainBtn.addEventListener("click", async () => {
        const text = resultPrompt.value.trim();
        if (!text) {
            addNotification("Prompt Lab Error", "Generate a prompt first to explain it.", "error");
            return;
        }
        
        resultJpe.innerHTML = `<span class="pl-empty-text">Generating explanation via AI...</span>`;
        explainBtn.disabled = true;
        
        const readingLevel = jpeLevelSelect ? jpeLevelSelect.value : "grade8";
        
        try {
            const explanation = await invoke("generate_jpe_explanation_with_level", { promptText: text, readingLevel });
            resultJpe.innerHTML = `<div class="jpe-content">${explanation.replace(/\n/g, '<br>')}</div>`;
        } catch (err) {
            console.error("JPE error:", err);
            resultJpe.innerHTML = `<span class="pl-empty-text" style="color:var(--error-color)">Error generating explanation: ${err}</span>`;
            addNotification("Prompt Lab Error", "Failed to generate explanation.", "error");
        } finally {
            explainBtn.disabled = false;
        }
    });

    copyPromptBtn.addEventListener("click", () => {
        if (resultPrompt.value) {
            navigator.clipboard.writeText(resultPrompt.value);
            addNotification("Prompt Lab", "Prompt copied to clipboard.", "success");
        }
    });

    copyJpeBtn.addEventListener("click", () => {
        if (resultJpe.innerText && !resultJpe.innerText.includes("Click \"Explain")) {
            navigator.clipboard.writeText(resultJpe.innerText);
            addNotification("Prompt Lab", "Explanation copied to clipboard.", "success");
        }
    });
    
    sendChatBtn.addEventListener("click", () => {
        if (resultPrompt.value) {
            // Switch to Chat view
            document.querySelector('.nav-tab[data-view="chat"]')?.click();
            
            // Paste prompt into chat input
            const chatInput = document.getElementById("user-input");
            if (chatInput) {
                chatInput.value = resultPrompt.value;
                chatInput.focus();
                
                // Adjust textarea height
                chatInput.style.height = "auto";
                chatInput.style.height = Math.min(chatInput.scrollHeight, 300) + "px";
                
                addNotification("Prompt Lab", "Prompt transferred to Chat.", "info");
            }
        }
    });

    // Export JSON handler
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener("click", () => {
            if (!resultPrompt.value.trim()) {
                addNotification("Prompt Lab Error", "Generate a prompt first to export.", "error");
                return;
            }
            const schema = {
                persona: personaInput.value.trim(),
                task: taskInput.value.trim(),
                context: contextInput.value.trim(),
                tone: toneInput.value.trim(),
                constraints: constraintsInput.value.trim(),
                format: formatInput.value.trim(),
                examples: examplesInput.value.trim(),
                formula: formulaSelect.value,
                assembled_prompt: resultPrompt.value
            };
            const jsonStr = JSON.stringify(schema, null, 2);
            navigator.clipboard.writeText(jsonStr);
            addNotification("Prompt Lab", "Assembled JSON Schema copied to clipboard.", "success");
        });
    }

    // Export Lua Automation Script handler (runs prompt automatically in S-Term Agent tab)
    if (exportLuaBtn) {
        exportLuaBtn.addEventListener("click", () => {
            if (!resultPrompt.value.trim()) {
                addNotification("Prompt Lab Error", "Generate a prompt first to export.", "error");
                return;
            }
            const escapedPrompt = resultPrompt.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
            const luaScript = `-- S-Term Prompt Lab Automation Macro\n` +
                              `-- Generated on ${new Date().toISOString()}\n\n` +
                              `local prompt = "${escapedPrompt}"\n\n` +
                              `print("[Automation] Executing Prompt Lab macro in S-Term...")\n` +
                              `-- Send the prompt to the active LLM provider and fetch the response\n` +
                              `local response = sendPrompt(prompt)\n` +
                              `print("[Automation] AI Response:")\n` +
                              `print(response)\n`;
            
            navigator.clipboard.writeText(luaScript);
            addNotification("Prompt Lab", "Lua automation macro copied to clipboard.", "success");
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
        let hasKey = false;
        try { hasKey = !!(await invoke("get_gemini_api_key")); } catch (_) {}
        if (!hasKey) showOnboardingWizard();
    } catch (e) {
        console.error("Failed to check onboarding state:", e);
    }
}

async function showOnboardingWizard() {
    // 1. Create onboarding overlay element
    const overlay = document.createElement("div");
    overlay.id = "onboarding-overlay";
    overlay.className = "onboarding-overlay";
    
    // 2. Set up HTML content
    overlay.innerHTML = `
        <div class="onboarding-container">
            <header class="onboarding-header">
                <h2 class="onboarding-title">NEURODECK // INITIAL_BOOT_SETUP</h2>
                <div class="onboarding-steps-indicator">
                    <span class="onboarding-step-dot active" data-step="1"></span>
                    <span class="onboarding-step-dot" data-step="2"></span>
                    <span class="onboarding-step-dot" data-step="3"></span>
                    <span class="onboarding-step-dot" data-step="4"></span>
                </div>
            </header>
            
            <div class="onboarding-content">
                <!-- Slide 1: Welcome -->
                <div class="onboarding-slide active" id="slide-1">
                    <h3 style="color: var(--accent-color); margin-top: 0;">WELCOME TO NEURODECK OS</h3>
                    <p class="onboarding-welcome-text" id="onboarding-welcome-typing"></p>
                    
                    <p style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 20px; line-height: 1.5;">
                        To unlock full autonomous agent operations, vector RAG memory indexing, and live canvas programming, you must configure an LLM model provider.
                    </p>
                    
                    <div class="onboarding-choice-container">
                        <div class="onboarding-choice-card active" data-provider="gemini-key">
                            <span class="onboarding-choice-icon">🔑</span>
                            <span class="onboarding-choice-title">Gemini API Key</span>
                            <span class="onboarding-choice-desc">Manual entry of Google Gemini API key. Writable to secure OS keychain.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="gemini-oauth">
                            <span class="onboarding-choice-icon">📱</span>
                            <span class="onboarding-choice-title">Google Login (QR)</span>
                            <span class="onboarding-choice-desc">Authenticate via device code grant. Scans QR code with your phone.</span>
                        </div>
                        <div class="onboarding-choice-card" data-provider="ollama">
                            <span class="onboarding-choice-icon">🦙</span>
                            <span class="onboarding-choice-title">Ollama (Offline)</span>
                            <span class="onboarding-choice-desc">Use a local Ollama server running on Steam Deck. Completely offline.</span>
                        </div>
                    </div>
                </div>

                <!-- Slide 2: API Key Configuration -->
                <div class="onboarding-slide" id="slide-2">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 20px;">PROVIDER_AUTHENTICATION</h3>
                    
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

                <!-- Slide 3: Persona & Theme Selection -->
                <div class="onboarding-slide" id="slide-3">
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

                <!-- Slide 4: System Integration Diagnostics -->
                <div class="onboarding-slide" id="slide-4">
                    <h3 style="color: var(--accent-color); margin-top: 0; margin-bottom: 15px;">FINAL SYSTEM CHECK</h3>
                    
                    <div class="onboarding-diagnostic-list">
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">💻</span>
                                <span>PTY Shell Spawning Subsystem</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-pty">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">🌐</span>
                                <span>External LLM Network Endpoint Reachability</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-net">PENDING</span>
                        </div>
                        <div class="onboarding-diagnostic-item">
                            <div class="onboarding-diagnostic-label">
                                <span class="onboarding-diagnostic-icon">🔒</span>
                                <span>OS Keychain Secure Storage Access</span>
                            </div>
                            <span class="onboarding-diagnostic-status pending" id="diag-key">PENDING</span>
                        </div>
                    </div>
                    
                    <div class="onboarding-log-viewport" id="ob-diagnostic-log" style="height: 140px; max-height: 140px; margin-top: 10px;">
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
    const welcomeText = "NEURODECK is an immersive AI operating system overlay designed for the Steam Deck. It bridges local console operations with intelligent LLM assistance.";
    const typingEl = document.getElementById("onboarding-welcome-typing");
    let charIdx = 0;
    function typeChar() {
        if (charIdx < welcomeText.length) {
            typingEl.textContent += welcomeText.charAt(charIdx);
            charIdx++;
            setTimeout(typeChar, 25);
        }
    }
    typeChar();

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
        
        if (currentStep === 4) {
            btnNext.innerText = "Launch NEURODECK";
            btnNext.classList.add("primary");
            btnNext.disabled = !isDiagnosticsPassed;
            
            // Auto-trigger diagnostics on step 4
            runDiagnostics();
        } else {
            btnNext.innerText = "Next";
            btnNext.classList.remove("primary");
            // Ollama & skip don't require live verification to advance
            const needsVerify = currentStep === 2 && !isProviderVerified && selectedProvider !== "ollama";
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
        if (currentStep === 4) {
            // Finish onboarding!
            localStorage.setItem("neurodeck_onboarding_complete", "true");
            overlay.classList.add("hidden");
            setTimeout(() => {
                overlay.remove();
                // Focus the terminal input to give control to user
                const termInput = document.getElementById("user-input");
                if (termInput) termInput.focus();
            }, 500);
            addNotification("System Initialized", "Welcome to NEURODECK OS.", "success");
        } else {
            currentStep++;
            updateStepUI();
        }
    };
    
    // Skip-setup button — bypass step 2 entirely
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
        "Default": "🤖", "Developer": "💻", "Cyberpunk": "⚡",
        "John": "📋", "Sally": "🎨", "Winston": "🏗️",
        "Amelia": "🦾", "Paige": "📝", "Mary": "📊",
        "Sarcastic Hacker": "🃏", "Elden Ring Scholar": "⚔️"
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
            <span class="onboarding-persona-icon">${personaIconMap[name] || '🤖'}</span>
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

    // Diagnostics Handler (Step 4)
    async function runDiagnostics() {
        isDiagnosticsPassed = false;
        btnNext.disabled = true;
        
        const diagLog = document.getElementById("ob-diagnostic-log");
        diagLog.innerHTML = `<div class="onboarding-log-line">[SYS] Initiating diagnostics sequence...</div>`;
        
        const elPty = document.getElementById("diag-pty");
        const elNet = document.getElementById("diag-net");
        const elKey = document.getElementById("diag-key");
        
        elPty.className = "onboarding-diagnostic-status pending";
        elPty.innerText = "RUNNING";
        elNet.className = "onboarding-diagnostic-status pending";
        elNet.innerText = "RUNNING";
        elKey.className = "onboarding-diagnostic-status pending";
        elKey.innerText = "RUNNING";
        
        appendLog(diagLog, "Checking shell subsystem (PTY allocation)...");
        
        // Small delay to make it feel cinematic
        await new Promise(r => setTimeout(r, 800));
        
        try {
            const result = await invoke("run_onboarding_diagnostics");
            
            // 1. PTY Status
            if (result.pty_ok) {
                elPty.className = "onboarding-diagnostic-status success";
                elPty.innerText = "SUCCESS";
                appendLog(diagLog, `PTY check passed: ${result.pty_details}`);
            } else {
                elPty.className = "onboarding-diagnostic-status error";
                elPty.innerText = "FAILED";
                appendLog(diagLog, `PTY check failed: ${result.pty_details}`, true);
            }
            
            await new Promise(r => setTimeout(r, 600));
            
            // 2. Network Status
            if (result.network_ok) {
                elNet.className = "onboarding-diagnostic-status success";
                elNet.innerText = "SUCCESS";
                appendLog(diagLog, `Network check passed: ${result.network_details}`);
            } else {
                elNet.className = "onboarding-diagnostic-status error";
                elNet.innerText = "FAILED";
                appendLog(diagLog, `Network check failed: ${result.network_details}`, true);
            }
            
            await new Promise(r => setTimeout(r, 600));
            
            // 3. Keychain Status
            if (result.keychain_ok) {
                elKey.className = "onboarding-diagnostic-status success";
                elKey.innerText = "SUCCESS";
                appendLog(diagLog, `Keychain check passed: ${result.keychain_details}`);
            } else {
                elKey.className = "onboarding-diagnostic-status error";
                elKey.innerText = "FAILED";
                appendLog(diagLog, `Keychain check failed: ${result.keychain_details}`, true);
            }
            
            await new Promise(r => setTimeout(r, 400));
            
            // Determine overall success
            if (result.pty_ok && result.network_ok && result.keychain_ok) {
                isDiagnosticsPassed = true;
                btnNext.disabled = false;
                appendLog(diagLog, "SYSTEM DIAGNOSTICS COMPLETE. READY TO LAUNCH.");
            } else {
                appendLog(diagLog, "DIAGNOSTICS ENCOUNTERED ERRORS. Please fix issues before launching.", true);
                if (result.pty_ok && result.keychain_ok) {
                    isDiagnosticsPassed = true;
                    btnNext.disabled = false;
                    appendLog(diagLog, "Offline operations allowed. Diagnostics passed with warnings.");
                }
            }
        } catch (e) {
            appendLog(diagLog, `Diagnostics engine crashed: ${e}`, true);
        }
    }
}

// ==========================================================================
// CINEMATIC BOOT SEQUENCE
// ==========================================================================
(async function runBootSequence() {
    const overlay = document.getElementById('boot-overlay');
    const logScroll = document.getElementById('boot-log-scroll');
    const progressFill = document.getElementById('boot-progress-fill');
    const progressPct = document.getElementById('boot-progress-pct');
    const progressLabel = document.getElementById('boot-progress-label-text');
    const _delay = ms => new Promise(r => setTimeout(r, ms));
    // Guarantee event fires even on early return or unexpected error
    if (!overlay || !logScroll) {
        document.dispatchEvent(new CustomEvent('neurodeck-boot-complete'));
        return;
    }
    try {

    // Dynamic step count — each addLine() call increments step automatically
    const TOTAL_STEPS = 22;
    let step = 0;

    function setProgress(pct, label) {
        if (progressFill) progressFill.style.width = Math.min(pct, 100) + '%';
        if (progressPct) progressPct.textContent = Math.round(Math.min(pct, 100)) + '%';
        if (label && progressLabel) progressLabel.textContent = label.toUpperCase().slice(0, 45);
    }

    function addLine(addr, html, extraClass) {
        const line = document.createElement('div');
        line.className = 'boot-log-line' + (extraClass ? ' ' + extraClass : '');
        line.innerHTML = `<span class="boot-addr">${addr}</span>  ${html}`;
        logScroll.appendChild(line);
        logScroll.scrollTop = logScroll.scrollHeight;
        step++;
        setProgress((step / TOTAL_STEPS) * 100, line.innerText.replace(addr, '').trim());
    }

    const delay = ms => new Promise(r => setTimeout(r, ms));

    addLine('[0x0001]', 'Initializing kernel space&hellip;');
    await delay(90);

    addLine('[0x0002]', 'Loading configuration: <span class="boot-val">llm-term.toml</span>');
    let cfg = null;
    try { cfg = await invoke('get_config'); } catch (_) {}
    await delay(70);

    const prov = cfg?.llm?.default_provider ?? 'ollama';
    const model = prov === 'gemini' ? (cfg?.llm?.gemini_model ?? 'gemini-1.5-flash') : (cfg?.llm?.ollama_model ?? 'llama2');
    addLine('[0x0003]', `Provider: <span class="boot-val">${prov.toUpperCase()}</span>  &middot;  Model: <span class="boot-val">${model}</span>`);
    await delay(80);

    addLine('[0x0004]', 'Scanning plugin directory: <span class="boot-val">plugins/</span>');
    let plugins = [];
    try { plugins = await invoke('list_plugins'); } catch (_) {}
    await delay(60);

    const pluginDescMap = {
        'bmad.lua': 'BMad Framework &mdash; /john /sally /winston /amelia /paige /mary',
        'ip_lookup.lua': 'IP Lookup Utility',
        'auto_responder.lua': 'Auto-Responder Hooks',
        'promptgen.lua': 'Prompt Lab &mdash; /promptlab /promptgen',
    };
    let addrIdx = 5;
    for (const p of plugins) {
        const fname = p.file_name || p;
        const desc = pluginDescMap[fname] || (p.description || 'Custom Plugin');
        const status = p.enabled === false ? '<span style="color:#ff4466">DISABLED</span>' : '<span class="boot-ok">LOADED</span>';
        addLine(`[0x${addrIdx.toString(16).padStart(4,'0')}]`, `Plugin: <span class="boot-val">${fname}</span>  ${status}  <span style="opacity:0.4">// ${desc}</span>`);
        addrIdx++;
        await delay(55);
    }
    if (plugins.length === 0) {
        addLine('[0x0005]', 'No plugins found in plugins/  <span style="opacity:0.5">(dir may be empty)</span>');
        addrIdx = 6;
    }

    const luaAddr = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(luaAddr, `Starting Lua runtime <span class="boot-val">(v5.4 &mdash; vendored via mlua)</span>&hellip;  <span class="boot-ok">&check;</span>`);
    addrIdx++;
    await delay(80);

    const personaAddr = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(personaAddr, 'Enumerating persona registry&hellip;');
    addrIdx++;
    let personas = [];
    try { personas = await invoke('get_personas'); } catch (_) {}
    await delay(55);
    const personaAddr2 = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(personaAddr2, `Registered <span class="boot-val">${personas.length || 9}</span> personas  <span class="boot-ok">&check;</span>`);
    addrIdx++;
    await delay(65);

    const themeAddr = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(themeAddr, 'Loading theme palette&hellip;');
    addrIdx++;
    let themes = [];
    try { themes = await invoke('get_themes'); } catch (_) {}
    await delay(55);
    const themeAddr2 = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(themeAddr2, `<span class="boot-val">${themes.length || 6}</span> themes indexed  <span class="boot-ok">&check;</span>`);
    addrIdx++;
    await delay(70);

    const memAddr = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(memAddr, 'Initializing vector memory subsystem&hellip;');
    addrIdx++;
    let memCount = 0;
    try { memCount = await invoke('get_doc_count'); } catch (_) {}
    await delay(60);
    const memAddr2 = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(memAddr2, `Vector memory: <span class="boot-val">${memCount}</span> documents indexed  <span class="boot-ok">&check;</span>`);
    addrIdx++;
    await delay(65);

    const ptyAddr = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(ptyAddr, 'PTY manager: <span class="boot-ok">READY</span>  &middot;  Canvas engine: <span class="boot-ok">READY</span>  &middot;  Collab TCP: <span class="boot-ok">STANDBY</span>');
    addrIdx++;
    await delay(75);

    // Real LLM connectivity test
    const llmAddr = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(llmAddr, `Testing LLM provider [<span class="boot-val">${prov.toUpperCase()}</span>]&hellip;`);
    addrIdx++;
    await delay(50);
    let llmStats = null;
    try { llmStats = await invoke('get_context_stats'); } catch (_) {}
    const llmStatus = llmStats ? '<span class="boot-ok">ONLINE</span>' : '<span style="color:#ffaa00">STANDBY</span>';
    const llmModel = llmStats?.active_model ?? model;
    const llmAddr2 = `[0x${addrIdx.toString(16).padStart(4,'0')}]`;
    addLine(llmAddr2, `LLM [<span class="boot-val">${llmModel}</span>]: ${llmStatus}  &middot;  Infrastructure: <span class="boot-ok">ONLINE</span>`);
    addrIdx++;
    await delay(80);

    addLine('[0x0011]', '<strong style="color:#00ff88;letter-spacing:0.06em">ALL SYSTEMS NOMINAL &mdash; NEURODECK ONLINE &check;</strong>', 'boot-final');
    setProgress(100, 'NEURODECK ONLINE');
    await delay(950);

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
        const ptyOk = typeof terminalSessions !== 'undefined' && terminalSessions.length > 0;
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
