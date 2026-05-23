import { state } from './state.js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

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



// CANVAS LIVE COLLABORATION (P19)
// ==========================================================================
function initCanvasCollab() {
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
}



export {
    buildPreviewDoc,
    renderCanvasPreview,
    loadCanvasCode,
    initCanvasView,
    initCanvasCollab
};

export function initCanvas() {
    initCanvasView();
    initCanvasCollab();
}
