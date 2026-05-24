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

// Monaco language ID map
const MONACO_LANG_MAP = {
    html: 'html',
    css: 'css',
    javascript: 'javascript',
    markdown: 'markdown',
    bash: 'shell',
    python: 'python',
    lua: 'lua'
};

// Module-level Monaco editor reference
let monacoEditor = null;
let monacoReady = false;
let _peerSyncing = false;

function getMonacoLang(lang) {
    return MONACO_LANG_MAP[lang] || 'plaintext';
}

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
            return `<!DOCTYPE html><html><head><style>body{background:#0d0d0d;color:#e0e0e0;font-family:sans-serif;padding:1.5rem;line-height:1.6;max-width:720px}h1,h2,h3{color:var(--accent-color,#7C3AED)}code{background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:monospace}pre{background:#1a1a2e;padding:1rem;border-radius:6px;overflow-x:auto}blockquote{border-left:3px solid #7C3AED;margin-left:0;padding-left:1rem;color:#aaa}a{color:#7C3AED}</style></head><body id="md"></body><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script><script>document.getElementById('md').innerHTML=marked.parse(${JSON.stringify(code)});<\/script></html>`;
        default:
            return `<!DOCTYPE html><html><head><style>body{background:#0d0d0d;color:#e0e0e0;font-family:monospace;padding:1rem;white-space:pre-wrap}</style></head><body>Run this code in the Terminal tab (▶ Run is for HTML/CSS/JS/Markdown).\n\n${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`;
    }
}

function renderCanvasPreview() {
    const code = monacoEditor ? monacoEditor.getValue() : '';
    const frame = document.getElementById("canvas-preview-frame");
    const outputPre = document.getElementById("canvas-preview-output");
    if (!frame || !outputPre) return;
    const lang = window.neurodeckCanvas.currentLang;
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
    const fileTitle = document.getElementById("canvas-file-title");

    if (select) select.value = mappedLang in CANVAS_EXT_MAP ? mappedLang : 'html';
    window.neurodeckCanvas.currentLang = select ? select.value : 'html';

    if (monacoEditor) {
        monacoEditor.setValue(content);
        const model = monacoEditor.getModel();
        if (model) {
            window.monaco?.editor.setModelLanguage(model, getMonacoLang(window.neurodeckCanvas.currentLang));
        }
    }

    if (fileTitle) {
        fileTitle.textContent = window.neurodeckCanvas.activePluginFile || CANVAS_EXT_MAP[window.neurodeckCanvas.currentLang] || 'untitled';
    }

    renderCanvasPreview();
}

// AI Edit modal — injected once, reused
function ensureAiEditModal() {
    if (document.getElementById('canvas-ai-edit-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'canvas-ai-edit-modal';
    modal.className = 'canvas-ai-edit-modal';
    modal.innerHTML = `
        <div class="canvas-ai-edit-panel">
            <div class="canvas-ai-edit-header">
                <span>✦ AI Edit</span>
                <button class="canvas-ai-edit-close" id="canvas-ai-edit-close">✕</button>
            </div>
            <div class="canvas-ai-edit-body">
                <label class="canvas-ai-edit-label">Instruction</label>
                <textarea id="canvas-ai-edit-instruction" class="canvas-ai-edit-input"
                    placeholder="e.g. Add error handling, refactor to async/await, add type hints..."
                    rows="3"></textarea>
                <div class="canvas-ai-edit-scope">
                    <label><input type="radio" name="ai-edit-scope" value="selection" id="ai-edit-scope-sel"> Selected text</label>
                    <label><input type="radio" name="ai-edit-scope" value="all" id="ai-edit-scope-all" checked> Entire file</label>
                </div>
                <div id="canvas-ai-edit-status" class="canvas-ai-edit-status"></div>
            </div>
            <div class="canvas-ai-edit-footer">
                <button class="canvas-btn" id="canvas-ai-edit-cancel">Cancel</button>
                <button class="canvas-btn" id="canvas-ai-edit-apply" style="background:rgba(0,240,255,0.1);border-color:var(--accent-color);color:var(--accent-color);">Apply ✦</button>
            </div>
        </div>
    `;
    document.getElementById('view-canvas')?.appendChild(modal);

    document.getElementById('canvas-ai-edit-close').onclick = closeAiEditModal;
    document.getElementById('canvas-ai-edit-cancel').onclick = closeAiEditModal;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAiEditModal(); });

    document.getElementById('canvas-ai-edit-apply').onclick = async () => {
        const instruction = document.getElementById('canvas-ai-edit-instruction').value.trim();
        if (!instruction) return;
        const useSelection = document.getElementById('ai-edit-scope-sel').checked;
        const lang = window.neurodeckCanvas.currentLang;

        let code;
        let selection = null;
        if (useSelection && monacoEditor) {
            selection = monacoEditor.getSelection();
            code = monacoEditor.getModel()?.getValueInRange(selection) || monacoEditor.getValue();
            if (!code.trim()) code = monacoEditor.getValue();
        } else {
            code = monacoEditor ? monacoEditor.getValue() : '';
        }

        const statusEl = document.getElementById('canvas-ai-edit-status');
        const applyBtn = document.getElementById('canvas-ai-edit-apply');
        statusEl.textContent = '⚡ Applying AI edit...';
        applyBtn.disabled = true;

        try {
            const result = await invoke('ai_edit_code', { code, instruction, lang });
            // Strip any markdown fences the LLM may add
            const cleaned = result.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
            if (monacoEditor) {
                if (useSelection && selection && monacoEditor.getModel()?.getValueInRange(selection)?.trim()) {
                    monacoEditor.executeEdits('ai-edit', [{
                        range: selection,
                        text: cleaned,
                        forceMoveMarkers: true
                    }]);
                } else {
                    monacoEditor.setValue(cleaned);
                }
            }
            renderCanvasPreview();
            statusEl.textContent = '✓ Applied';
            setTimeout(closeAiEditModal, 800);
        } catch (err) {
            statusEl.textContent = `Error: ${err}`;
            applyBtn.disabled = false;
        }
    };
}

function openAiEditModal() {
    ensureAiEditModal();
    const modal = document.getElementById('canvas-ai-edit-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('canvas-ai-edit-instruction')?.focus();
        document.getElementById('canvas-ai-edit-status').textContent = '';
        document.getElementById('canvas-ai-edit-apply').disabled = false;
        // Pre-select "selection" if Monaco has a non-empty selection
        if (monacoEditor) {
            const sel = monacoEditor.getSelection();
            const hasSelection = sel && !monacoEditor.getModel()?.getValueInRange(sel)?.trim() === false;
            if (hasSelection) document.getElementById('ai-edit-scope-sel').checked = true;
            else document.getElementById('ai-edit-scope-all').checked = true;
        }
    }
}

function closeAiEditModal() {
    const modal = document.getElementById('canvas-ai-edit-modal');
    if (modal) modal.classList.remove('active');
}

function initMonacoEditor(initialLang, initialCode) {
    const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs';
    const container = document.getElementById('canvas-monaco');
    if (!container) return;

    // Load AMD loader
    if (document.getElementById('monaco-loader-script')) {
        _createMonacoInstance(container, initialLang, initialCode, MONACO_CDN);
        return;
    }

    const script = document.createElement('script');
    script.id = 'monaco-loader-script';
    script.src = `${MONACO_CDN}/loader.js`;
    script.onload = () => _createMonacoInstance(container, initialLang, initialCode, MONACO_CDN);
    script.onerror = () => {
        console.warn('[Monaco] CDN load failed — canvas will use fallback textarea');
        container.innerHTML = `<textarea id="canvas-editor-fallback" style="width:100%;height:100%;background:#060a0e;color:#c9d1d9;font-family:monospace;font-size:13px;border:none;outline:none;padding:14px;box-sizing:border-box;resize:none;">${initialCode}</textarea>`;
    };
    document.head.appendChild(script);
}

function _createMonacoInstance(container, initialLang, initialCode, cdnBase) {
    window.require.config({ paths: { vs: cdnBase } });
    window.require(['vs/editor/editor.main'], function() {
        // Store global reference for Tauri CSP compat
        window.monaco = window.monaco || monaco;

        // Define NEURODECK theme
        monaco.editor.defineTheme('neurodeck', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
                { token: 'keyword', foreground: '00f0ff' },
                { token: 'string', foreground: '9ae6b4' },
                { token: 'number', foreground: 'fbb6ce' },
                { token: 'type', foreground: '63b3ed' },
                { token: 'function', foreground: 'a78bfa' },
                { token: 'variable', foreground: 'd9f7ff' },
            ],
            colors: {
                'editor.background': '#060a0e',
                'editor.foreground': '#c9d1d9',
                'editor.lineHighlightBackground': '#0d1117',
                'editor.selectionBackground': '#1a3a5c',
                'editor.inactiveSelectionBackground': '#112233',
                'editorLineNumber.foreground': '#2d3748',
                'editorLineNumber.activeForeground': '#00f0ff',
                'editorCursor.foreground': '#00f0ff',
                'editor.findMatchBackground': '#1a4a3a',
                'editor.findMatchHighlightBackground': '#0d2a1e',
                'editorWidget.background': '#0d1117',
                'editorWidget.border': '#1a2a3a',
                'input.background': '#0d1117',
                'input.foreground': '#c9d1d9',
                'scrollbarSlider.background': '#ffffff1a',
                'scrollbarSlider.hoverBackground': '#ffffff2a',
                'scrollbarSlider.activeBackground': '#00f0ff33',
            }
        });

        monacoEditor = monaco.editor.create(container, {
            value: initialCode,
            language: getMonacoLang(initialLang),
            theme: 'neurodeck',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontLigatures: true,
            lineHeight: 21,
            scrollBeyondLastLine: false,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'off',
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorBlinking: 'phase',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            padding: { top: 14, bottom: 14 },
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            suggest: { showWords: true },
            quickSuggestions: { other: true, comments: false, strings: false },
        });

        monacoReady = true;
        window.neurodeckCanvas.currentCode = initialCode;

        // Debounced live preview
        let previewTimer = null;
        monacoEditor.onDidChangeModelContent(() => {
            clearTimeout(previewTimer);
            previewTimer = setTimeout(renderCanvasPreview, 600);

            // Collab broadcast
            if (!_peerSyncing) {
                clearTimeout(window._canvasCollabTimer);
                window._canvasCollabTimer = setTimeout(() => {
                    invoke('canvas_collab_send', {
                        code: monacoEditor.getValue(),
                        lang: window.neurodeckCanvas.currentLang
                    }).catch(() => {});
                }, 300);
            }
        });

        // Ctrl+Enter → run immediately
        monacoEditor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => document.getElementById('canvas-run-btn')?.click()
        );

        // Render initial preview
        renderCanvasPreview();
    });
}

function initCanvasView() {
    const select = document.getElementById("canvas-lang-select");
    const runBtn = document.getElementById("canvas-run-btn");
    const clearBtn = document.getElementById("canvas-clear-btn");
    const copyBtn = document.getElementById("canvas-copy-btn");
    const refreshBtn = document.getElementById("canvas-refresh-btn");
    const aiEditBtn = document.getElementById("canvas-ai-edit-btn");
    const fileTitle = document.getElementById("canvas-file-title");
    const divider = document.getElementById("canvas-divider");
    const split = document.getElementById("canvas-split");

    // Set initial language
    window.neurodeckCanvas.currentLang = select ? select.value : 'html';

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

    window.neurodeckCanvas.currentCode = defaultHTML;

    // Initialize Monaco editor
    initMonacoEditor(window.neurodeckCanvas.currentLang, defaultHTML);

    // Language selector
    if (select) {
        select.addEventListener("change", () => {
            window.neurodeckCanvas.currentLang = select.value;
            if (fileTitle) {
                fileTitle.textContent = window.neurodeckCanvas.activePluginFile || CANVAS_EXT_MAP[select.value] || 'untitled';
            }
            if (monacoEditor) {
                const model = monacoEditor.getModel();
                if (model) monaco.editor.setModelLanguage(model, getMonacoLang(select.value));
            }
            renderCanvasPreview();
        });
    }

    // Run button
    if (runBtn) {
        runBtn.onclick = () => {
            const lang = window.neurodeckCanvas.currentLang;
            const code = monacoEditor ? monacoEditor.getValue() : '';
            const outputPre = document.getElementById("canvas-preview-output");

            if (lang === 'python' || lang === 'bash') {
                runBtn.textContent = "⚡ Running...";
                runBtn.disabled = true;
                if (outputPre) outputPre.textContent = "Executing code on system...\n";

                invoke("agent_exec_code", { code, lang })
                    .then(res => {
                        if (outputPre) {
                            const frame = document.getElementById("canvas-preview-frame");
                            if (frame) frame.style.display = 'none';
                            outputPre.style.display = 'block';
                            outputPre.textContent = res;
                        }
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

                invoke("execute_lua", { code })
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

    // Clear button
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm("Clear the editor?")) {
                if (monacoEditor) monacoEditor.setValue('');
                window.neurodeckCanvas.currentCode = '';
                const frame = document.getElementById("canvas-preview-frame");
                if (frame) frame.srcdoc = '';
            }
        };
    }

    // Copy button
    if (copyBtn) {
        copyBtn.onclick = () => {
            const code = monacoEditor ? monacoEditor.getValue() : '';
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.textContent = "Copied!";
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
            });
        };
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.onclick = () => renderCanvasPreview();
    }

    // AI Edit button
    if (aiEditBtn) {
        aiEditBtn.onclick = () => openAiEditModal();
    }

    // Draggable divider
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
            const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width * 100, 20), 80);
            split.style.setProperty("--editor-pct", `${pct}%`);
            if (monacoEditor) monacoEditor.layout();
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
            if (monacoEditor) {
                invoke("canvas_collab_send", {
                    code: monacoEditor.getValue(),
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

    // Incoming canvas sync from peer
    listen("canvas_sync", (event) => {
        try {
            const data = typeof event.payload === 'string'
                ? JSON.parse(event.payload) : event.payload;
            if (data.type === 'sync' && data.code !== undefined) {
                _peerSyncing = true;
                if (monacoEditor) {
                    monacoEditor.setValue(data.code);
                }
                _peerSyncing = false;
                const langSelect = document.getElementById("canvas-lang-select");
                if (langSelect && data.lang && data.lang !== langSelect.value) {
                    langSelect.value = data.lang;
                    langSelect.dispatchEvent(new Event('change'));
                }
                renderCanvasPreview();
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
