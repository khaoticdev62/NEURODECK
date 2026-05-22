import './style.css';
import './app.css';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { marked } from 'marked';
import { mockIPC } from '@tauri-apps/api/mocks';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Initialize global neurodeckCanvas namespace early to avoid TDZ issues
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

// Check if running in browser dev environment (outside Tauri WebView)
if (!window.__TAURI_INTERNALS__) {
    // Mock the session list in memory for interactivity
    let mockSessions = ["session_mock_123", "session_mock_456"];
    let mockActivePersona = "Default";
    let mockCurrentSessionId = "session_mock_123";
    
    mockIPC((cmd, args) => {
        console.log(`[Mock IPC] Invoked: ${cmd}`, args);
        switch (cmd) {
            case 'get_initial_state':
                return {
                    model: "GEMINI",
                    memory_status: "Stable",
                    tool_status: "Idle",
                    session_id: mockCurrentSessionId,
                    active_persona: mockActivePersona
                };
            case 'get_personas':
                return ["Default", "Developer", "Support", "Writer", "Philosopher"];
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
                if (text.startsWith('/persona')) {
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
            case 'get_game_context':
                return { name: "", app_id: "", is_running: "false" };
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
            case 'get_discovered_peers':
                return [];
            case 'get_active_transfers':
                return [];
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
            default:
                console.warn(`[Mock IPC] Unknown command: ${cmd}`);
                return null;
        }
    }, { shouldMockEvents: true });
}

document.querySelector('#app').innerHTML = `
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
                    <button class="nav-tab" data-view="tunnel">🔗 Tunnel</button>
                    <button class="nav-tab" data-view="share">📤 Share</button>
                    <button class="nav-tab" data-view="browser">🌐 Browser</button>
                    <button class="nav-tab" data-view="agent">🤖 Agent</button>
                    <button class="nav-tab" data-view="memory">🧠 Memory</button>
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
                                <textarea id="user-input" placeholder="Enter command or type message..." rows="1" autocomplete="off"></textarea>
                            </div>
                            <div class="input-actions-bar">
                                <div class="input-actions-left">
                                    <button class="input-btn mic-btn" id="mic-btn" title="Voice Input">🎙️</button>
                                    <button class="input-btn" id="toggle-drawer-btn" title="Toggle Context Drawer">📊</button>
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
                        </select>
                        <button class="canvas-btn" id="canvas-run-btn">▶ Run</button>
                        <button class="canvas-btn" id="canvas-copy-btn">Copy</button>
                        <button class="canvas-btn" id="canvas-clear-btn">Clear</button>
                        <span class="canvas-instructions">Ctrl+Enter to run • Live preview updates as you type</span>
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
                        </div>
                    </div>
                </div>

                <!-- Interactive PTY Terminal View -->
                <div class="view-content" id="view-terminal">
                    <div class="terminal-toolbar">
                        <span class="terminal-info">Interactive PTY Session</span>
                        <button class="canvas-btn" id="pty-reconnect-btn">Restart Shell</button>
                    </div>
                    <div id="pty-terminal-container"></div>
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

                <!-- LAN File Sharing View -->
                <div class="view-content" id="view-share">
                    <div class="share-grid">
                        <div class="share-panel">
                            <h3>LAN Discovery & Sending</h3>
                            <p class="share-desc">Discovers S-Term instances running on your local network. Select a peer, drag/drop a file or enter a path, then send.</p>
                            
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
                            <iframe id="browser-iframe" class="browser-iframe hidden" referrerpolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>

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
            </div>
        </main>

        <!-- Collapsible Context Drawer (Right) -->
        <aside class="inspect-drawer collapsed" id="inspect-drawer">
            <div class="inspect-header">
                <span class="inspect-title">Agent Context</span>
                <button class="sidebar-toggle-btn" id="inspect-close-btn" title="Collapse Drawer">▶</button>
            </div>
            <div class="inspect-content">
                <div class="inspect-card">
                    <h4>SYSTEM HEALTH</h4>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Memory:</span>
                        <span class="inspect-stat-value" id="memory-status">Stable</span>
                    </div>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Vector DB:</span>
                        <span class="inspect-stat-value" id="vector-db-status">Connected</span>
                    </div>
                </div>
                <div class="inspect-card">
                    <h4>SESSION METRICS</h4>
                    <div class="inspect-stat-row">
                        <span class="inspect-stat-label">Session ID:</span>
                        <span class="inspect-stat-value" id="session-id">Active</span>
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
            </div>
        </aside>

        <!-- Settings Modal Overlay -->
        <div class="settings-overlay" id="settings-overlay">
            <div class="settings-modal-card">
                <div class="settings-modal-header">
                    <h3>SETTINGS</h3>
                    <button class="sidebar-toggle-btn" id="close-settings-x">✕</button>
                </div>
                <div class="settings-modal-content" style="max-height: 70vh; overflow-y: auto;">
                    <div class="setting-field-group">
                        <label for="persona-select">Persona:</label>
                        <select id="persona-select"></select>
                    </div>
                    <div class="setting-field-group">
                        <label for="theme-select">Theme:</label>
                        <select id="theme-select"></select>
                    </div>
                    <div class="setting-field-group">
                        <label for="font-select">Font Style:</label>
                        <select id="font-select">
                            <option value="inter">Inter (Modern Clean)</option>
                            <option value="outfit">Outfit (Premium Rounded)</option>
                            <option value="jetbrains">JetBrains Mono (Sleek Coding)</option>
                            <option value="vt323">VT323 (Retro Phosphor)</option>
                            <option value="sharetech">Share Tech Mono (Futuristic Sci-Fi)</option>
                            <option value="orbitron">Orbitron (Gamer HUD)</option>
                            <option value="pressstart">Press Start 2P (8-Bit Arcade)</option>
                        </select>
                    </div>
                    <div class="setting-field-group">
                        <label for="shell-select">Terminal Shell:</label>
                        <select id="shell-select">
                            <option value="default">Default</option>
                            <option value="/bin/bash">/bin/bash</option>
                            <option value="/bin/zsh">/bin/zsh</option>
                            <option value="/bin/sh">/bin/sh</option>
                            <option value="powershell.exe">powershell.exe</option>
                            <option value="cmd.exe">cmd.exe</option>
                            <option value="custom">Custom...</option>
                        </select>
                    </div>
                    <div class="setting-field-group" id="custom-shell-group" style="display: none;">
                        <label for="custom-shell-input">Custom Shell Path:</label>
                        <input type="text" id="custom-shell-input" class="tunnel-text-input" placeholder="/bin/zsh" style="width:100%; box-sizing:border-box;">
                    </div>
                    <div class="setting-field-group">
                        <label for="term-fontsize-slider">Terminal Font Size (<span id="term-fontsize-val">14px</span>):</label>
                        <input type="range" id="term-fontsize-slider" min="10" max="24" value="14" step="1" style="width: 100%; accent-color: var(--accent-color);">
                    </div>
                    <div class="setting-field-group">
                        <label for="term-scrollback-input">Terminal Scrollback Limit:</label>
                        <input type="number" id="term-scrollback-input" min="500" max="10000" value="2000" class="tunnel-text-input" style="width:100%; box-sizing:border-box;">
                    </div>
                    <div class="setting-field-group">
                        <label for="bg-url-input">Custom Background URL:</label>
                        <input type="text" id="bg-url-input" class="tunnel-text-input" placeholder="https://example.com/image.jpg" style="width:100%; box-sizing:border-box;">
                    </div>
                    <div class="setting-field-group">
                        <label>Background Presets:</label>
                        <div class="preset-bgs" style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                            <button class="canvas-btn bg-preset-btn" data-url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style="padding: 4px 8px; font-size: 0.75rem;">Cyber Abstract</button>
                            <button class="canvas-btn bg-preset-btn" data-url="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800" style="padding: 4px 8px; font-size: 0.75rem;">Neon Grid</button>
                            <button class="canvas-btn bg-preset-btn" data-url="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800" style="padding: 4px 8px; font-size: 0.75rem;">Sci-Fi HUD</button>
                            <button class="canvas-btn bg-preset-btn" data-url="" style="padding: 4px 8px; font-size: 0.75rem;">None</button>
                        </div>
                    </div>
                    <div class="setting-field-group">
                        <label for="bg-opacity-slider">Background Opacity (<span id="bg-opacity-val">10%</span>):</label>
                        <input type="range" id="bg-opacity-slider" min="0" max="50" value="10" style="width: 100%; accent-color: var(--accent-color);">
                    </div>
                    <div class="setting-field-group" style="display: flex; gap: 20px; align-items: center; margin-top: 15px;">
                        <label style="margin-bottom:0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="scanlines-toggle" style="accent-color: var(--accent-color);">
                            CRT Scanlines
                        </label>
                        <label style="margin-bottom:0; display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="flicker-toggle" style="accent-color: var(--accent-color);">
                            CRT Flicker
                        </label>
                    </div>
                </div>
                <div class="settings-modal-footer">
                    <button class="settings-close-btn" id="close-settings">Close</button>
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
    </div>
    <div class="app-background-image" id="app-background-image"></div>
    <div class="crt-overlay crt-flicker"></div>
`;

const inputElement = document.getElementById("user-input");
inputElement.focus();

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

    // 2. Custom Background URL
    const bgUrl = localStorage.getItem("bgUrl") || "";
    const bgUrlInput = document.getElementById("bg-url-input");
    if (bgUrlInput) bgUrlInput.value = bgUrl;
    
    const bgImgEl = document.getElementById("app-background-image");
    if (bgImgEl) {
        if (bgUrl) {
            bgImgEl.style.backgroundImage = `url('${bgUrl}')`;
        } else {
            bgImgEl.style.backgroundImage = "none";
        }
    }

    // 3. Background Opacity
    const opacityValStr = localStorage.getItem("bgOpacity");
    const opacity = opacityValStr !== null ? parseInt(opacityValStr, 10) : 10;
    const bgOpacitySlider = document.getElementById("bg-opacity-slider");
    if (bgOpacitySlider) bgOpacitySlider.value = opacity;
    const bgOpacityVal = document.getElementById("bg-opacity-val");
    if (bgOpacityVal) bgOpacityVal.innerText = `${opacity}%`;
    if (bgImgEl) {
        bgImgEl.style.opacity = bgUrl ? (opacity / 100).toString() : "0";
    }

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

// Initial application of settings on startup
applySettings();

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

document.querySelectorAll(".bg-preset-btn").forEach(btn => {
    btn.onclick = function() {
        const url = this.getAttribute("data-url");
        const bgUrlInput = document.getElementById("bg-url-input");
        if (bgUrlInput) {
            bgUrlInput.value = url;
            localStorage.setItem("bgUrl", url);
            applySettings();
        }
    };
});

// ==========================================================================
// STEAM DECK CONTROLLER (GAMEPAD API) INPUT WIRING
// ==========================================================================
let gamepadActive = false;
let gamepadFocusIndex = -1;
let previousGamepadState = {
    buttons: Array(17).fill(false)
};

function getGamepadFocusableElements() {
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

    // A Button (0) - Click active element
    if (buttonPressed(0)) {
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

    // B Button (1) - Close overlays/menus
    if (buttonPressed(1)) {
        const settingsOverlay = document.getElementById("settings-overlay");
        const transferModal = document.getElementById("transfer-modal");
        const inspectDrawer = document.getElementById("inspect-drawer");
        const sidebar = document.getElementById("sidebar");
        if (settingsOverlay && settingsOverlay.classList.contains("active")) {
            document.getElementById("close-settings").click();
        } else if (transferModal && transferModal.classList.contains("active")) {
            document.getElementById("transfer-modal-reject").click();
        } else if (inspectDrawer && !inspectDrawer.classList.contains("collapsed")) {
            document.getElementById("inspect-close-btn").click();
        } else if (sidebar && !sidebar.classList.contains("collapsed")) {
            document.getElementById("sidebar-close-btn").click();
        }
    }

    // X Button (2) - Go to Chat tab and focus input
    if (buttonPressed(2)) {
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

    // Y Button (3) - Cycle active persona
    if (buttonPressed(3)) {
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

    // L1 (4) / R1 (5) - Cycle tabs left / right
    if (buttonPressed(4) || buttonPressed(5)) {
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

    // Select Button (8) - Run Canvas Code
    if (buttonPressed(8)) {
        const runBtn = document.getElementById("canvas-run-btn");
        if (runBtn) {
            runBtn.click();
        }
    }

    // Start Button (9) - Toggle settings modal
    if (buttonPressed(9)) {
        const settingsOverlay = document.getElementById("settings-overlay");
        if (settingsOverlay) {
            if (settingsOverlay.classList.contains("active")) {
                document.getElementById("close-settings").click();
            } else {
                document.getElementById("settings-btn").click();
            }
        }
    }

    // D-pad Up (12) / Down (13) - Move focus index
    if (buttonPressed(12)) {
        updateGamepadFocus(gamepadFocusIndex - 1);
    } else if (buttonPressed(13)) {
        updateGamepadFocus(gamepadFocusIndex + 1);
    }

    // D-pad Left (14) / Right (15) - adjust sliders / selects
    if (buttonPressed(14) || buttonPressed(15)) {
        const els = getGamepadFocusableElements();
        const activeEl = els[gamepadFocusIndex];
        if (activeEl) {
            if (activeEl.tagName === "INPUT" && activeEl.type === "range") {
                let val = parseInt(activeEl.value, 10);
                const step = parseInt(activeEl.step, 10) || 5;
                if (buttonPressed(14)) {
                    val = Math.max(parseInt(activeEl.min, 10) || 0, val - step);
                } else {
                    val = Math.min(parseInt(activeEl.max, 10) || 100, val + step);
                }
                activeEl.value = val;
                activeEl.dispatchEvent(new Event("input", { bubbles: true }));
            } else if (activeEl.tagName === "SELECT") {
                let idx = activeEl.selectedIndex;
                if (buttonPressed(14)) {
                    idx = Math.max(0, idx - 1);
                } else {
                    idx = Math.min(activeEl.options.length - 1, idx + 1);
                }
                if (idx !== activeEl.selectedIndex) {
                    activeEl.selectedIndex = idx;
                    activeEl.dispatchEvent(new Event("change", { bubbles: true }));
                }
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

    // Sync button state for next frame
    for (let i = 0; i < gp.buttons.length; i++) {
        previousGamepadState.buttons[i] = gp.buttons[i] && gp.buttons[i].pressed;
    }

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
                document.documentElement.style.setProperty('--bg-color', theme.Background);
                document.documentElement.style.setProperty('--fg-color', theme.Foreground);
                document.documentElement.style.setProperty('--accent-color', theme.Accent);
                document.documentElement.style.setProperty('--response-color', theme.Response);
                document.documentElement.style.setProperty('--warning-color', theme.Warning);
                document.documentElement.style.setProperty('--error-color', theme.Error);
                
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

toggleDrawerBtn.onclick = function() {
    inspectDrawer.classList.toggle("collapsed");
};

inspectCloseBtn.onclick = function() {
    inspectDrawer.classList.add("collapsed");
};

// Settings Modal Event Listeners
const settingsOverlay = document.getElementById("settings-overlay");
const settingsBtn = document.getElementById("settings-btn");
const closeSettings = document.getElementById("close-settings");
const closeSettingsX = document.getElementById("close-settings-x");

settingsBtn.onclick = function() {
    settingsOverlay.classList.add("active");
    
    // Populate personas
    invoke("get_personas").then((personas) => {
        let select = document.getElementById("persona-select");
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
};

closeSettings.onclick = function() {
    settingsOverlay.classList.remove("active");
};

closeSettingsX.onclick = function() {
    settingsOverlay.classList.remove("active");
};

// Auto-growing Textarea Logic
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

    // Add message to viewport
    let viewport = document.getElementById("chat-workspace");
    let chatViewport = document.getElementById("chat-viewport");
    let msg = document.createElement("div");
    msg.className = "message user";
    msg.innerHTML = `
        <div class="message-card">
            ${text}
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
    
    // Scroll workspace
    viewport.scrollTop = viewport.scrollHeight;
    
    // Call Tauri backend
    invoke('send_command', { prompt: text }).catch((err) => {
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
            msgCard.innerHTML = marked.parse(currentAIText);
            formatCodeBlocks(msgCard);
        }
        
        let viewport = document.getElementById("chat-workspace");
        let isAtBottom = (viewport.scrollHeight - viewport.clientHeight) - viewport.scrollTop < 100;
        if (isAtBottom) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
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
            msgCard.innerHTML = marked.parse(currentAIText);
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
    
    // Refresh sessions sidebar list
    refreshSessionsList();
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
                        ${marked.parse(msgStr.substring(4))}
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
                            ${marked.parse(msgStr.substring(4))}
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
            document.documentElement.style.setProperty('--bg-color', theme.Background);
            document.documentElement.style.setProperty('--fg-color', theme.Foreground);
            document.documentElement.style.setProperty('--accent-color', theme.Accent);
            document.documentElement.style.setProperty('--response-color', theme.Response);
            document.documentElement.style.setProperty('--warning-color', theme.Warning);
            document.documentElement.style.setProperty('--error-color', theme.Error);
            
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
    document.getElementById("model-name").innerText = `[ MODEL: ${state.model} ]`;
    document.getElementById("memory-status").innerText = state.memory_status;
    document.getElementById("tool-status").innerText = state.tool_status;
    document.getElementById("session-id").innerText = state.session_id;
    currentSessionId = state.session_id;
    activePersona = state.active_persona || "Default";

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
                document.documentElement.style.setProperty('--bg-color', theme.Background);
                document.documentElement.style.setProperty('--fg-color', theme.Foreground);
                document.documentElement.style.setProperty('--accent-color', theme.Accent);
                document.documentElement.style.setProperty('--response-color', theme.Response);
                document.documentElement.style.setProperty('--warning-color', theme.Warning);
                document.documentElement.style.setProperty('--error-color', theme.Error);
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
    };
});

// --- PTY TERMINAL SYSTEM ---
let ptySessionId = "main_pty_session";

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

function initPtyTerminal() {
    const container = document.getElementById("pty-terminal-container");
    if (!container) return;
    container.innerHTML = "";
    
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
            background: '#000000',
            foreground: '#e2e8f0',
            cursor: '#00F0FF',
            selectionBackground: 'rgba(0, 240, 255, 0.3)'
        }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    
    window.ptyTerminal = term;
    window.ptyTerminalFitAddon = fitAddon;
    
    try {
        fitAddon.fit();
    } catch (e) {
        console.warn("Could not fit xterm immediately:", e);
    }
    
    invoke("pty_kill", { id: ptySessionId }).catch(() => {}).then(() => {
        const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
        invoke("pty_spawn", {
            id: ptySessionId,
            cols: dims.cols,
            rows: dims.rows,
            shell: getActiveShellPath()
        }).then(() => {
            term.write("\r\n\x1b[1;36mNEURODECK Interactive Shell Started\x1b[0m\r\n");
        }).catch(err => {
            term.write(`\r\n\x1b[1;31mError starting PTY: ${err}\x1b[0m\r\n`);
        });
    });
    
    term.onData(data => {
        invoke("pty_write", { id: ptySessionId, data: data }).catch(err => {
            console.error("PTY Write error:", err);
        });
    });
}

window.addEventListener("resize", () => {
    if (window.ptyTerminalFitAddon && window.ptyTerminal) {
        try {
            window.ptyTerminalFitAddon.fit();
            const dims = window.ptyTerminalFitAddon.proposeDimensions();
            if (dims) {
                invoke("pty_resize", { id: ptySessionId, cols: dims.cols, rows: dims.rows }).catch(err => {
                    console.error("PTY resize error:", err);
                });
            }
        } catch (e) {
            // ignore
        }
    }
});

listen("pty_output", (event) => {
    const payload = event.payload;
    if (payload.id === ptySessionId && window.ptyTerminal) {
        window.ptyTerminal.write(payload.data);
    }
});

listen("pty_exit", (event) => {
    const id = event.payload;
    if (id === ptySessionId && window.ptyTerminal) {
        window.ptyTerminal.write("\r\n\x1b[1;31m[Shell Session Exited]\x1b[0m\r\n");
    }
});

const ptyReconnectBtn = document.getElementById("pty-reconnect-btn");
if (ptyReconnectBtn) {
    ptyReconnectBtn.onclick = function() {
        initPtyTerminal();
    };
}

// --- LIVE CODE CANVAS SYSTEM ---

const CANVAS_EXT_MAP = {
    html: 'index.html',
    css: 'styles.css',
    javascript: 'script.js',
    markdown: 'README.md',
    bash: 'script.sh',
    python: 'script.py'
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
    if (!editor || !frame) return;
    const lang = window.neurodeckCanvas.currentLang;
    const code = editor.value;
    window.neurodeckCanvas.currentCode = code;
    frame.srcdoc = buildPreviewDoc(lang, code);
}

function loadCanvasCode(lang, content) {
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
    if (fileTitle) fileTitle.textContent = CANVAS_EXT_MAP[window.neurodeckCanvas.currentLang] || 'untitled';

    renderCanvasPreview();
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
            if (fileTitle) fileTitle.textContent = CANVAS_EXT_MAP[select.value] || 'untitled';
            renderCanvasPreview();
        });
    }

    if (runBtn) {
        runBtn.onclick = () => {
            clearTimeout(debounceTimer);
            renderCanvasPreview();
            runBtn.textContent = "✓ Done";
            setTimeout(() => { runBtn.textContent = "▶ Run"; }, 1200);
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

function renderTransfers(transfers) {
    const listEl = document.getElementById("share-transfers-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!transfers || transfers.length === 0) {
        listEl.innerHTML = `<div class="transfer-item-empty">No active or past transfers in this session.</div>`;
        return;
    }
    transfers.sort((a, b) => b.id.localeCompare(a.id));

    transfers.forEach(t => {
        const item = document.createElement("div");
        item.className = "transfer-item";
        item.id = `transfer-${t.id}`;
        
        const percent = t.size > 0 ? Math.round((t.progress / t.size) * 100) : 0;
        const progressClass = t.status === "Completed" ? "completed" : (t.status === "Failed" || t.status === "Rejected" ? "failed" : "");
        
        item.innerHTML = `
            <div class="transfer-header">
                <span class="transfer-filename" title="${t.filename}">${t.filename}</span>
                <span class="transfer-status ${t.status.toLowerCase()}">${t.status}</span>
            </div>
            <div class="transfer-progress-container">
                <div class="transfer-progress-bar-bg">
                    <div class="transfer-progress-bar-fill ${progressClass}" style="width: ${percent}%;"></div>
                </div>
                <span class="transfer-percent">${percent}%</span>
            </div>
            <div class="transfer-meta">
                <span>${t.direction === "Incoming" ? "From" : "To"}: ${t.peer_name || t.peer_ip}</span>
                <span>${formatBytes(t.progress)} / ${formatBytes(t.size)}</span>
            </div>
        `;
        listEl.appendChild(item);
    });
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
        
        invoke("get_active_transfers").then(renderTransfers);
    });
    
    // Listen for transfer progress and completions
    listen("transfer_progress", () => {
        invoke("get_active_transfers").then(renderTransfers);
    });
    listen("transfer_completed", () => {
        invoke("get_active_transfers").then(renderTransfers);
    });
    listen("transfer_failed", () => {
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
    const iframe = document.getElementById("browser-iframe");
    const homeScreen = document.getElementById("browser-home-screen");
    const urlInput = document.getElementById("browser-url-input");
    const clearBtn = document.getElementById("browser-url-clear-btn");
    const goBtn = document.getElementById("browser-go-btn");
    const openExtBtn = document.getElementById("browser-open-ext-btn");
    const progressBar = document.getElementById("browser-progress-bar");
    const blockedScreen = document.getElementById("browser-blocked-screen");
    const blockedUrlDisplay = document.getElementById("blocked-url-display");
    const blockedOpenExtBtn = document.getElementById("blocked-open-ext-btn");

    const backBtn = document.getElementById("browser-back-btn");
    const forwardBtn = document.getElementById("browser-forward-btn");
    const refreshBtn = document.getElementById("browser-refresh-btn");
    const homeBtn = document.getElementById("browser-home-btn");

    const homeSearchInput = document.getElementById("browser-home-search-input");
    const homeSearchBtn = document.getElementById("browser-home-search-btn");
    const speedDialCards = document.querySelectorAll(".speed-dial-card");

    // Navigation state
    let browserHistory = ["neurodeck://home"];
    let browserHistoryIndex = 0;
    let loadTimeout = null;

    // --- Progress bar helpers ---
    function showProgress() {
        if (!progressBar) return;
        progressBar.classList.remove("hidden", "progress-done");
        void progressBar.offsetWidth; // force reflow to restart animation
        progressBar.classList.add("progress-loading");
    }

    function hideProgress(success = true) {
        if (!progressBar) return;
        progressBar.classList.remove("progress-loading");
        if (success) {
            progressBar.classList.add("progress-done");
            setTimeout(() => {
                progressBar.classList.add("hidden");
                progressBar.classList.remove("progress-done");
            }, 400);
        } else {
            progressBar.classList.add("hidden");
        }
    }

    // --- Blocked screen ---
    function showBlockedScreen(url) {
        if (iframe) iframe.classList.add("hidden");
        if (blockedScreen) blockedScreen.classList.remove("hidden");
        if (blockedUrlDisplay) blockedUrlDisplay.textContent = url;
    }

    function hideBlockedScreen() {
        if (blockedScreen) blockedScreen.classList.add("hidden");
    }

    // --- URL parsing ---
    function parseUrlOrSearch(input) {
        const trimmed = input.trim();
        if (!trimmed) return "neurodeck://home";
        if (/^[a-zA-Z0-9+.-]+:\/\//.test(trimmed)) return trimmed;
        const isDomain = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed) ||
                         /^localhost(:\d+)?(\/.*)?$/.test(trimmed) ||
                         /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed);
        return isDomain
            ? 'https://' + trimmed
            : 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(trimmed);
    }

    function updateNavButtons() {
        if (backBtn) backBtn.disabled = (browserHistoryIndex <= 0);
        if (forwardBtn) forwardBtn.disabled = (browserHistoryIndex >= browserHistory.length - 1);
    }

    function openInExternal(url) {
        const resolved = parseUrlOrSearch(url);
        if (!resolved || resolved === "neurodeck://home") return;
        invoke("open_external", { url: resolved }).catch(err => {
            console.error("Failed to open external url:", err);
        });
    }

    function loadPage(url) {
        clearTimeout(loadTimeout);
        hideBlockedScreen();

        if (url === "neurodeck://home") {
            hideProgress(false);
            if (iframe) {
                iframe.classList.add("hidden");
                iframe.src = "about:blank";
            }
            if (homeScreen) homeScreen.classList.remove("hidden");
            if (urlInput) urlInput.value = "";
        } else {
            if (homeScreen) homeScreen.classList.add("hidden");
            if (iframe) {
                iframe.classList.remove("hidden");
                showProgress();

                // Timeout fallback: if iframe doesn't fire load in 12s, assume it's blocked
                loadTimeout = setTimeout(() => {
                    hideProgress(false);
                    showBlockedScreen(url);
                }, 12000);

                iframe.src = url;
            }
            if (urlInput) urlInput.value = url;
        }
        updateNavButtons();
    }

    function navigateTo(url, addToHistory = true) {
        const targetUrl = parseUrlOrSearch(url);
        if (addToHistory) {
            if (browserHistoryIndex < browserHistory.length - 1) {
                browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
            }
            if (browserHistory[browserHistoryIndex] !== targetUrl) {
                browserHistory.push(targetUrl);
                browserHistoryIndex = browserHistory.length - 1;
            }
        }
        loadPage(targetUrl);
    }

    // --- Iframe load/error events ---
    if (iframe) {
        iframe.addEventListener("load", () => {
            // load fires even on about:blank, so guard against that
            if (iframe.src && iframe.src !== "about:blank" && iframe.src !== window.location.href) {
                clearTimeout(loadTimeout);
                hideProgress(true);
            }
        });
        iframe.addEventListener("error", () => {
            clearTimeout(loadTimeout);
            hideProgress(false);
            showBlockedScreen(browserHistory[browserHistoryIndex]);
        });
    }

    // --- Toolbar button events ---
    if (goBtn && urlInput) {
        goBtn.onclick = () => navigateTo(urlInput.value);
        urlInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") navigateTo(urlInput.value);
        });
    }

    if (clearBtn && urlInput) {
        clearBtn.onclick = () => { urlInput.value = ""; urlInput.focus(); };
    }

    if (backBtn) {
        backBtn.onclick = () => {
            if (browserHistoryIndex > 0) {
                browserHistoryIndex--;
                loadPage(browserHistory[browserHistoryIndex]);
            }
        };
    }

    if (forwardBtn) {
        forwardBtn.onclick = () => {
            if (browserHistoryIndex < browserHistory.length - 1) {
                browserHistoryIndex++;
                loadPage(browserHistory[browserHistoryIndex]);
            }
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = () => {
            const currentUrl = browserHistory[browserHistoryIndex];
            if (currentUrl !== "neurodeck://home" && iframe) {
                hideBlockedScreen();
                showProgress();
                clearTimeout(loadTimeout);
                loadTimeout = setTimeout(() => {
                    hideProgress(false);
                    showBlockedScreen(currentUrl);
                }, 12000);
                iframe.classList.remove("hidden");
                iframe.src = currentUrl;
            }
        };
    }

    if (homeBtn) {
        homeBtn.onclick = () => navigateTo("neurodeck://home");
    }

    if (openExtBtn) {
        openExtBtn.onclick = () => {
            const currentUrl = urlInput?.value.trim() || browserHistory[browserHistoryIndex];
            if (currentUrl && currentUrl !== "neurodeck://home") {
                openInExternal(currentUrl);
            }
        };
    }

    // Blocked screen "Open Ext" button
    if (blockedOpenExtBtn) {
        blockedOpenExtBtn.onclick = () => {
            const currentUrl = browserHistory[browserHistoryIndex];
            if (currentUrl && currentUrl !== "neurodeck://home") {
                openInExternal(currentUrl);
            }
        };
    }

    // Speed dial cards
    speedDialCards.forEach(card => {
        card.onclick = () => {
            const url = card.getAttribute("data-url");
            if (url) navigateTo(url);
        };
    });

    // Home screen search
    if (homeSearchBtn && homeSearchInput) {
        homeSearchBtn.onclick = () => {
            const query = homeSearchInput.value.trim();
            if (query) navigateTo(query);
        };
        homeSearchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const query = homeSearchInput.value.trim();
                if (query) navigateTo(query);
            }
        });
    }

    // --- Browser keyboard shortcuts (scoped to browser view being active) ---
    document.addEventListener("keydown", (e) => {
        const browserView = document.getElementById("view-browser");
        if (!browserView?.classList.contains("active")) return;

        // F5: Refresh current page
        if (e.key === "F5") {
            e.preventDefault();
            if (refreshBtn) refreshBtn.click();
        }

        // Ctrl+L / Cmd+L: Focus and select URL bar
        if ((e.ctrlKey || e.metaKey) && e.key === "l") {
            e.preventDefault();
            if (urlInput) { urlInput.focus(); urlInput.select(); }
        }

        // Alt+Left: Back
        if (e.altKey && e.key === "ArrowLeft") {
            e.preventDefault();
            if (backBtn && !backBtn.disabled) backBtn.click();
        }

        // Alt+Right: Forward
        if (e.altKey && e.key === "ArrowRight") {
            e.preventDefault();
            if (forwardBtn && !forwardBtn.disabled) forwardBtn.click();
        }
    });

    // Initialize
    loadPage("neurodeck://home");
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

