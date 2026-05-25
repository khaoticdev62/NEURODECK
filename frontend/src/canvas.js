import { state } from './state.js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { applyButtonIcon, createIcon } from './icons.js';
import { marked } from 'marked';
import { addNotification } from './notifications.js';

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
const COLLAB_CLIENT_ID = window.crypto?.randomUUID?.() || `nd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const COLLAB_DISPLAY_NAME = localStorage.getItem('neurodeckCollabName') || 'NEURODECK Operator';
const collabPresence = new Map();

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
            return `<!DOCTYPE html><html><head><style>body{background:#0d0d0d;color:#e0e0e0;font-family:sans-serif;padding:1.5rem;line-height:1.6;max-width:720px}h1,h2,h3{color:var(--accent-color,#7C3AED)}code{background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:monospace}pre{background:#1a1a2e;padding:1rem;border-radius:6px;overflow-x:auto}blockquote{border-left:3px solid #7C3AED;margin-left:0;padding-left:1rem;color:#aaa}a{color:#7C3AED}</style></head><body>${window.sanitizeHtml ? window.sanitizeHtml(marked.parse(code)) : marked.parse(code)}</body></html>`;
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

function escapeCanvasHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
                <span>${createIcon('wand2', { size: 14 })}<span>AI Edit</span></span>
                <button class="canvas-ai-edit-close" id="canvas-ai-edit-close" aria-label="Close AI edit">${createIcon('x', { size: 14 })}</button>
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
                <button class="canvas-btn" id="canvas-ai-edit-apply" style="background:rgba(0,240,255,0.1);border-color:var(--accent-color);color:var(--accent-color);">Apply</button>
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
        statusEl.innerHTML = `${createIcon('zap', { size: 14 })}<span>Applying AI edit...</span>`;
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
            statusEl.innerHTML = `${createIcon('shieldCheck', { size: 14 })}<span>Applied</span>`;
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

function createFallbackEditor(container, initialCode) {
    container.innerHTML = `<textarea id="canvas-editor-fallback" style="width:100%;height:100%;background:#060a0e;color:#c9d1d9;font-family:monospace;font-size:13px;border:none;outline:none;padding:14px;box-sizing:border-box;resize:none;">${initialCode}</textarea>`;
    const textarea = container.querySelector('#canvas-editor-fallback');
    if (!textarea) {
        return null;
    }

    const listeners = [];
    const notifyChange = () => {
        window.neurodeckCanvas.currentCode = textarea.value;
        for (const listener of listeners) {
            listener();
        }
    };

    textarea.addEventListener('input', notifyChange);
    textarea.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('canvas-run-btn')?.click();
        }
    });

    return {
        getValue() {
            return textarea.value;
        },
        setValue(value) {
            textarea.value = value;
            notifyChange();
        },
        getModel() {
            return {
                getValueInRange(range) {
                    const start = Math.max(0, Math.min(range?.startOffset ?? 0, textarea.value.length));
                    const end = Math.max(start, Math.min(range?.endOffset ?? textarea.value.length, textarea.value.length));
                    return textarea.value.slice(start, end);
                }
            };
        },
        getSelection() {
            return {
                startOffset: textarea.selectionStart ?? 0,
                endOffset: textarea.selectionEnd ?? 0
            };
        },
        executeEdits(_source, edits) {
            const edit = edits?.[0];
            if (!edit) return;
            const start = Math.max(0, Math.min(edit.range?.startOffset ?? 0, textarea.value.length));
            const end = Math.max(start, Math.min(edit.range?.endOffset ?? textarea.value.length, textarea.value.length));
            textarea.value = `${textarea.value.slice(0, start)}${edit.text}${textarea.value.slice(end)}`;
            textarea.selectionStart = start;
            textarea.selectionEnd = start + edit.text.length;
            notifyChange();
        },
        onDidChangeModelContent(listener) {
            listeners.push(listener);
            return {
                dispose() {
                    const idx = listeners.indexOf(listener);
                    if (idx >= 0) listeners.splice(idx, 1);
                }
            };
        },
        addCommand() {},
        layout() {},
        focus() {
            textarea.focus();
        }
    };
}

function initMonacoEditor(initialLang, initialCode) {
    const container = document.getElementById('canvas-monaco');
    if (!container) return;
    monacoEditor = createFallbackEditor(container, initialCode);
    monacoReady = true;
    window.neurodeckCanvas.currentCode = initialCode;

    let previewTimer = null;
    monacoEditor?.onDidChangeModelContent(() => {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(renderCanvasPreview, 600);

        if (!_peerSyncing) {
            clearTimeout(window._canvasCollabTimer);
            window._canvasCollabTimer = setTimeout(() => {
                invoke('canvas_collab_send', {
                    code: monacoEditor.getValue(),
                    lang: window.neurodeckCanvas.currentLang,
                    sender: COLLAB_CLIENT_ID
                }).catch(err => console.warn("[Collab] sync send failed:", err));
            }, 300);
        }
    });

    renderCanvasPreview();
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
                if (model && window.monaco?.editor) window.monaco.editor.setModelLanguage(model, getMonacoLang(select.value));
            }
            renderCanvasPreview();
        });
    }

    let execLineUnlisten = null;
    let execDoneUnlisten = null;
    let execRunning = false;
    let cancelBtn = document.getElementById("canvas-cancel-exec-btn");
    if (!cancelBtn && runBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.className = "canvas-btn canvas-btn-sm";
        cancelBtn.id = "canvas-cancel-exec-btn";
        cancelBtn.innerHTML = `${createIcon('x', { size: 12 })}<span class="nd-button-label">Cancel</span>`;
        cancelBtn.style.display = "none";
        cancelBtn.style.borderColor = "var(--error-color)";
        cancelBtn.style.color = "var(--error-color)";
        runBtn.insertAdjacentElement("afterend", cancelBtn);
    }

    function stopExecListeners() {
        if (execLineUnlisten) {
            execLineUnlisten();
            execLineUnlisten = null;
        }
        if (execDoneUnlisten) {
            execDoneUnlisten();
            execDoneUnlisten = null;
        }
    }

    function setExecRunning(running) {
        execRunning = running;
        if (runBtn) {
            runBtn.disabled = running;
            applyButtonIcon("#canvas-run-btn", {
                icon: running ? "zap" : "play",
                label: running ? "Running..." : "Run"
            });
        }
        if (cancelBtn) {
            cancelBtn.style.display = running ? "inline-block" : "none";
        }
    }

    async function runStreamingExec(code, lang, outputPre) {
        if (execRunning) return;

        const frame = document.getElementById("canvas-preview-frame");
        if (frame) frame.style.display = "none";
        if (outputPre) {
            outputPre.style.display = "block";
            outputPre.textContent = "";
        }

        stopExecListeners();
        setExecRunning(true);

        const lineListener = await listen("canvas_exec_line", (event) => {
            if (!outputPre) return;
            const payload = event.payload || {};
            const prefix = payload.stream === "stderr" ? "[err] " : "";
            outputPre.textContent += `${prefix}${payload.line || ""}\n`;
            outputPre.scrollTop = outputPre.scrollHeight;
        });
        const doneListener = await listen("canvas_exec_done", (event) => {
            const payload = event.payload || {};
            const exitCode = Number.isFinite(payload.exit_code) ? payload.exit_code : -1;
            const durationMs = Number.isFinite(payload.duration_ms) ? payload.duration_ms : 0;
            const duration = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

            if (outputPre) {
                outputPre.textContent += `\n--- exited ${exitCode} (${duration}) ---`;
                outputPre.scrollTop = outputPre.scrollHeight;
            }

            stopExecListeners();
            setExecRunning(false);
            if (runBtn) {
                applyButtonIcon("#canvas-run-btn", {
                    icon: exitCode === 0 ? "shieldCheck" : "x",
                    label: exitCode === 0 ? "Done" : "Failed"
                });
                setTimeout(() => {
                    applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" });
                }, 1500);
            }
            if (typeof window.addNotification === "function") {
                window.addNotification("Canvas Exec", `Finished in ${duration} (exit ${exitCode})`, exitCode === 0 ? "success" : "error");
            }
        });
        execLineUnlisten = lineListener;
        execDoneUnlisten = doneListener;

        try {
            await invoke("exec_code_stream", { code, lang });
        } catch (err) {
            stopExecListeners();
            setExecRunning(false);
            if (outputPre) outputPre.textContent = `Error executing code:\n${err}`;
            if (runBtn) {
                applyButtonIcon("#canvas-run-btn", { icon: "x", label: "Failed" });
                setTimeout(() => {
                    applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" });
                }, 1500);
            }
        }
    }

    if (cancelBtn) {
        cancelBtn.onclick = async () => {
            cancelBtn.disabled = true;
            try {
                await invoke("cancel_exec");
            } finally {
                cancelBtn.disabled = false;
            }
        };
    }

    // Run button
    if (runBtn) {
        runBtn.onclick = () => {
            const lang = window.neurodeckCanvas.currentLang;
            const code = monacoEditor ? monacoEditor.getValue() : '';
            const outputPre = document.getElementById("canvas-preview-output");

            if (['python', 'bash', 'powershell', 'javascript', 'js'].includes(lang)) {
                runStreamingExec(code, lang, outputPre);
            } else if (lang === 'lua') {
                applyButtonIcon("#canvas-run-btn", { icon: "zap", label: "Running..." });
                runBtn.disabled = true;
                if (outputPre) outputPre.textContent = "Executing Lua script in engine...\n";

                invoke("execute_lua", { code })
                    .then(() => {
                        if (outputPre) outputPre.textContent = "Lua script executed successfully!\nCheck chat/terminal stdout for any prints.";
                        applyButtonIcon("#canvas-run-btn", { icon: "shieldCheck", label: "Done" });
                        runBtn.disabled = false;
                        setTimeout(() => { applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }); }, 1500);
                    })
                    .catch(err => {
                        if (outputPre) outputPre.textContent = `Lua Error:\n${err}`;
                        applyButtonIcon("#canvas-run-btn", { icon: "x", label: "Failed" });
                        runBtn.disabled = false;
                        setTimeout(() => { applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }); }, 1500);
                    });
            } else {
                renderCanvasPreview();
                applyButtonIcon("#canvas-run-btn", { icon: "shieldCheck", label: "Done" });
                setTimeout(() => { applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }); }, 1200);
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
                applyButtonIcon("#canvas-copy-btn", { icon: "shieldCheck", label: "Copied" });
                setTimeout(() => { applyButtonIcon("#canvas-copy-btn", { icon: "copy", label: "Copy" }); }, 1500);
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
    const workspaceNameInput = document.getElementById("collab-workspace-name");
    const invitePayload = document.getElementById("collab-invite-payload");
    const presenceList = document.getElementById("collab-presence-list");
    const chatLog = document.getElementById("collab-chat-log");
    const chatInput = document.getElementById("collab-chat-input");
    const chatSendBtn = document.getElementById("collab-chat-send");
    const approvalLog = document.getElementById("collab-approval-log");
    const approvalBtn = document.getElementById("collab-agent-approval-btn");

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
    const statusPeers = document.getElementById("canvas-collab-peer-count");

    function workspaceName() {
        return (workspaceNameInput?.value || 'NEURODECK Workspace').trim() || 'NEURODECK Workspace';
    }

    function updatePresenceList() {
        if (!presenceList) return;
        collabPresence.set(COLLAB_CLIENT_ID, {
            name: COLLAB_DISPLAY_NAME,
            role: 'local',
            at: Date.now()
        });
        const rows = Array.from(collabPresence.entries()).map(([id, peer]) => {
            const role = peer.role === 'local' ? 'This device' : 'Peer';
            return `<div class="collab-presence-row">
                <span class="collab-presence-dot"></span>
                <span class="collab-presence-name">${escapeCanvasHtml(peer.name || id)}</span>
                <span class="collab-presence-role">${role}</span>
            </div>`;
        });
        presenceList.innerHTML = rows.join('');
    }

    function appendChat(name, message, local = false) {
        if (!chatLog) return;
        const row = document.createElement('div');
        row.className = `collab-chat-row${local ? ' local' : ''}`;
        row.innerHTML = `<span>${escapeCanvasHtml(name)}</span><p>${escapeCanvasHtml(message)}</p>`;
        chatLog.appendChild(row);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function appendApproval(message, status = 'pending', options = {}) {
        if (!approvalLog) return;
        const row = document.createElement('div');
        row.className = `collab-approval-row ${status}`;
        row.textContent = message;
        if (status === 'pending' && options.remote && options.requestId) {
            const controls = document.createElement('div');
            controls.className = 'collab-approval-controls';
            const approve = document.createElement('button');
            approve.className = 'canvas-btn canvas-btn-sm';
            approve.textContent = 'Approve';
            const deny = document.createElement('button');
            deny.className = 'canvas-btn canvas-btn-sm';
            deny.textContent = 'Deny';
            deny.style.borderColor = 'var(--error-color)';
            deny.style.color = 'var(--error-color)';
            approve.addEventListener('click', () => {
                row.className = 'collab-approval-row approved';
                row.textContent = `Approved: ${options.action || 'shared run'}`;
                broadcastCollab({
                    type: 'agent_approval_response',
                    name: COLLAB_DISPLAY_NAME,
                    request_id: options.requestId,
                    action: options.action || 'shared run',
                    approved: true
                });
            });
            deny.addEventListener('click', () => {
                row.className = 'collab-approval-row denied';
                row.textContent = `Denied: ${options.action || 'shared run'}`;
                broadcastCollab({
                    type: 'agent_approval_response',
                    name: COLLAB_DISPLAY_NAME,
                    request_id: options.requestId,
                    action: options.action || 'shared run',
                    approved: false
                });
            });
            controls.append(approve, deny);
            row.appendChild(controls);
        }
        approvalLog.prepend(row);
    }

    async function broadcastCollab(payload) {
        const enriched = {
            ...payload,
            sender: COLLAB_CLIENT_ID,
            workspace: workspaceName(),
            at: new Date().toISOString()
        };
        await invoke('canvas_collab_broadcast', { payload: enriched }).catch(() => {});
    }

    function sendPresence() {
        updatePresenceList();
        broadcastCollab({
            type: 'presence',
            name: COLLAB_DISPLAY_NAME,
            role: 'peer'
        });
    }

    async function refreshCollabStatus() {
        try {
            const status = await invoke('canvas_collab_status');
            if (statusPeers) {
                const peerCount = Number.parseInt(status.peers || '0', 10);
                statusPeers.textContent = `${peerCount} peer${peerCount === 1 ? '' : 's'}`;
            }
            if (window) window._mockCollabActive = status.active === 'true';
        } catch (_) {}
    }

    if (resyncBtn) {
        resyncBtn.addEventListener("click", () => {
            if (monacoEditor) {
                invoke("canvas_collab_send", {
                    code: monacoEditor.getValue(),
                    lang: document.getElementById("canvas-lang-select")?.value || 'html',
                    sender: COLLAB_CLIENT_ID
                }).catch(err => console.warn("[Collab] resync send failed:", err));
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
        updatePresenceList();
        sendPresence();
        refreshCollabStatus();
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
        collabPresence.clear();
        updatePresenceList();
        if (window) window._mockCollabActive = false;
    }

    function updateInvitePayload(address) {
        if (!invitePayload) return;
        const payload = {
            type: 'neurodeck-workspace-invite',
            workspace: workspaceName(),
            address,
            protocol: 'neurodeck-collab-tcp-v2'
        };
        invitePayload.value = JSON.stringify(payload, null, 2);
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
            // Stop the backend session so canvas_collab_status correctly reports
            // inactive; otherwise collab_abort stays Some even after the peer gone.
            invoke("canvas_collab_stop").catch(() => {});
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
            if (data.sender && data.sender === COLLAB_CLIENT_ID) return;
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
            } else if (data.type === 'presence') {
                collabPresence.set(data.sender || `peer-${Date.now()}`, {
                    name: data.name || 'Peer',
                    role: 'peer',
                    at: Date.now()
                });
                updatePresenceList();
                refreshCollabStatus();
            } else if (data.type === 'chat') {
                appendChat(data.name || 'Peer', data.message || '');
            } else if (data.type === 'agent_approval_request') {
                appendApproval(`${data.name || 'Peer'} requested agent approval: ${data.action || 'shared run'}`, 'pending', {
                    remote: true,
                    requestId: data.request_id || `req-${Date.now()}`,
                    action: data.action || 'shared run'
                });
                if (typeof addNotification === "function") {
                    addNotification("Shared Agent Approval", data.action || "A collaborator requested approval.", "warning");
                }
            } else if (data.type === 'agent_approval_response') {
                appendApproval(`${data.name || 'Peer'} ${data.approved ? 'approved' : 'denied'}: ${data.action || 'shared run'}`, data.approved ? 'approved' : 'denied');
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
                const address = `${lanIp}:${boundPort}`;
                if (hostAddr) hostAddr.innerText = address;
                updateInvitePayload(address);
                if (statusLine) statusLine.innerHTML = '';
                refreshCollabStatus();
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
                updateInvitePayload(addr);
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

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener("click", () => {
            const message = chatInput.value.trim();
            if (!message) return;
            chatInput.value = '';
            appendChat(COLLAB_DISPLAY_NAME, message, true);
            broadcastCollab({
                type: 'chat',
                name: COLLAB_DISPLAY_NAME,
                message
            });
        });
        chatInput.addEventListener("keydown", (event) => {
            if (event.key === 'Enter') chatSendBtn.click();
        });
    }

    if (approvalBtn) {
        approvalBtn.addEventListener("click", () => {
            const action = `Run ${window.neurodeckCanvas.currentLang || 'canvas'} code with shared workspace context`;
            appendApproval(`Local approval requested: ${action}`, 'pending');
            broadcastCollab({
                type: 'agent_approval_request',
                name: COLLAB_DISPLAY_NAME,
                request_id: `approval-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                action
            });
        });
    }

    updatePresenceList();
    setInterval(refreshCollabStatus, 5000);
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
