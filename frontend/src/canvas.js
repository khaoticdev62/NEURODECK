import { state } from './state.js';
import { invoke } from './neurobridge.js';
import { listen } from './neurobridge.js';
import { applyButtonIcon, createIcon } from './icons.js';
import { marked } from 'marked';
import { addNotification } from './notifications.js';
import { FocusTrap } from './focus-trap.js';

// --- LIVE CODE CANVAS SYSTEM ---

const CANVAS_EXT_MAP = {
    html: 'index.html', css: 'styles.css', javascript: 'script.js',
    markdown: 'README.md', bash: 'script.sh', python: 'script.py', lua: 'plugin.lua'
};

const MONACO_LANG_MAP = {
    html: 'html', css: 'css', javascript: 'javascript',
    markdown: 'markdown', bash: 'shell', python: 'python', lua: 'lua'
};

let monacoEditor = null;
let monacoReady = false;
let _peerSyncing = false;
const COLLAB_CLIENT_ID = window.crypto?.randomUUID?.() || `nd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const COLLAB_DISPLAY_NAME = localStorage.getItem('neurodeckCollabName') || 'NEURODECK Operator';
const collabPresence = new Map();

function getMonacoLang(lang) { return MONACO_LANG_MAP[lang] || 'plaintext'; }

function stripCanvasScripts(html) {
    if (!html) return "";
    // SECURITY: strip executable scripts and inline handlers for live preview sandbox
    let clean = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    return clean;
}

function buildPreviewDoc(lang, code) {
    // SECURITY: Restrictive CSP prevents network egress and sandbox bypasses in preview
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">`;
    switch (lang) {
        case 'html': {
            const stripped = stripCanvasScripts(code);
            return stripped.toLowerCase().includes('<head>') ? stripped.replace(/<head>/i, `<head>${csp}`) : csp + stripped;
        }
        case 'css':
            return `<!DOCTYPE html><html><head>${csp}<style>${code}</style></head><body><p style="color:#888;font-family:sans-serif;padding:1rem">CSS Preview — add HTML in the editor to see styled content.</p></body></html>`;
        case 'javascript':
            return `<!DOCTYPE html><html><head>${csp}<style>body{background:#0d0d0d;color:#e0e0e0;font-family:monospace;padding:1rem}pre{white-space:pre-wrap;word-break:break-all}</style></head><body><pre id="out"></pre><script>
const _log=console.log.bind(console);const out=document.getElementById('out');
console.log=(...a)=>{out.textContent+=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')+'\\n';_log(...a)};
try{${code}}catch(e){out.textContent+='\\n[Error] '+e.message}<\/script></body></html>`;
        case 'markdown': {
            const parsed = marked.parse(code);
            const html = (parsed && typeof parsed.then === 'function') ? '' : (window.sanitizeHtml ? window.sanitizeHtml(parsed) : '');
            return `<!DOCTYPE html><html><head>${csp}<style>body{background:#0d0d0d;color:#e0e0e0;font-family:sans-serif;padding:1.5rem;line-height:1.6;max-width:720px}h1,h2,h3{color:var(--accent-color,#7C3AED)}code{background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:monospace}pre{background:#1a1a2e;padding:1rem;border-radius:6px;overflow-x:auto}blockquote{border-left:3px solid #7C3AED;margin-left:0;padding-left:1rem;color:#aaa}a{color:#7C3AED}</style></head><body>${html}</body></html>`;
        }
        default:
            return `<!DOCTYPE html><html><head>${csp}<style>body{background:#0d0d0d;color:#e0e0e0;font-family:monospace;padding:1rem;white-space:pre-wrap}</style></head><body>Run this code in the Terminal tab (▶ Run is for HTML/CSS/JS/Markdown).\n\n${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`;
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
    return String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function loadCanvasCode(lang, content, fileName = "") {
    window.neurodeckCanvas.activePluginFile = fileName;
    const normalizedLang = lang.toLowerCase();
    const mappedLang = ['js','javascript'].includes(normalizedLang) ? 'javascript'
        : ['sh','shell','zsh','bash'].includes(normalizedLang) ? 'bash'
        : ['md','markdown'].includes(normalizedLang) ? 'markdown'
        : normalizedLang;
    const select = document.getElementById("canvas-lang-select");
    const fileTitle = document.getElementById("canvas-file-title");
    if (select) select.value = mappedLang in CANVAS_EXT_MAP ? mappedLang : 'html';
    window.neurodeckCanvas.currentLang = select ? select.value : 'html';
    if (monacoEditor) {
        monacoEditor.setValue(content);
        const model = monacoEditor.getModel();
        if (model) window.monaco?.editor.setModelLanguage(model, getMonacoLang(window.neurodeckCanvas.currentLang));
    }
    if (fileTitle) fileTitle.textContent = window.neurodeckCanvas.activePluginFile || CANVAS_EXT_MAP[window.neurodeckCanvas.currentLang] || 'untitled';
    renderCanvasPreview();
}

async function _canvasAiEditApply() {
    const instruction = document.getElementById('canvas-ai-edit-instruction').value.trim();
    if (!instruction) return;
    const useSelection = document.getElementById('ai-edit-scope-sel').checked;
    const lang = window.neurodeckCanvas.currentLang;
    let code, selection = null;
    if (useSelection && monacoEditor) {
        selection = monacoEditor.getSelection();
        code = monacoEditor.getModel()?.getValueInRange(selection) || monacoEditor.getValue();
        if (!code.trim()) code = monacoEditor.getValue();
    } else { code = monacoEditor ? monacoEditor.getValue() : ''; }
    const statusEl = document.getElementById('canvas-ai-edit-status');
    const applyBtn = document.getElementById('canvas-ai-edit-apply');
    statusEl.innerHTML = `${createIcon('zap',{size:14})}<span>Applying AI edit...</span>`;
    applyBtn.disabled = true;
    try {
        const result = await invoke('ai_edit_code', { code, instruction, lang });
        const cleaned = result.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        if (monacoEditor) {
            if (useSelection && selection && monacoEditor.getModel()?.getValueInRange(selection)?.trim()) {
                monacoEditor.executeEdits('ai-edit', [{ range: selection, text: cleaned, forceMoveMarkers: true }]);
            } else { monacoEditor.setValue(cleaned); }
        }
        renderCanvasPreview();
        statusEl.innerHTML = `${createIcon('shieldCheck',{size:14})}<span>Applied</span>`;
        setTimeout(closeAiEditModal, 800);
    } catch (err) { statusEl.textContent = `Error: ${err}`; applyBtn.disabled = false; }
}

function ensureAiEditModal() {
    if (document.getElementById('canvas-ai-edit-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'canvas-ai-edit-modal';
    modal.className = 'canvas-ai-edit-modal';
    modal.innerHTML = `
        <div class="canvas-ai-edit-panel">
            <div class="canvas-ai-edit-header">
                <span>${createIcon('wand2',{size:14})}<span>AI Edit</span></span>
                <button class="canvas-ai-edit-close" id="canvas-ai-edit-close" aria-label="Close AI edit">${createIcon('x',{size:14})}</button>
            </div>
            <div class="canvas-ai-edit-body">
                <label class="canvas-ai-edit-label">Instruction</label>
                <textarea id="canvas-ai-edit-instruction" class="canvas-ai-edit-input" placeholder="e.g. Add error handling, refactor to async/await, add type hints..." rows="3"></textarea>
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
        </div>`;
    document.getElementById('view-canvas')?.appendChild(modal);
    document.getElementById('canvas-ai-edit-close').onclick = closeAiEditModal;
    document.getElementById('canvas-ai-edit-cancel').onclick = closeAiEditModal;
    modal.addEventListener('click', e => { if (e.target === modal) closeAiEditModal(); });
    document.getElementById('canvas-ai-edit-apply').onclick = _canvasAiEditApply;
}

function openAiEditModal() {
    ensureAiEditModal();
    const modal = document.getElementById('canvas-ai-edit-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('canvas-ai-edit-instruction')?.focus();
        document.getElementById('canvas-ai-edit-status').textContent = '';
        document.getElementById('canvas-ai-edit-apply').disabled = false;
        if (monacoEditor) {
            const sel = monacoEditor.getSelection();
            const hasSelection = sel && !monacoEditor.getModel()?.getValueInRange(sel)?.trim() === false;
            if (hasSelection) document.getElementById('ai-edit-scope-sel').checked = true;
            else document.getElementById('ai-edit-scope-all').checked = true;
        }
    }
}

function closeAiEditModal() {
    document.getElementById('canvas-ai-edit-modal')?.classList.remove('active');
}

function createFallbackEditor(container, initialCode) {
    container.replaceChildren();
    const textarea = document.createElement('textarea');
    textarea.id = 'canvas-editor-fallback';
    textarea.setAttribute('aria-label', 'Code editor');
    textarea.style.cssText = 'width:100%;height:100%;background:#060a0e;color:#c9d1d9;font-family:monospace;font-size:13px;border:none;outline:none;padding:14px;box-sizing:border-box;resize:none';
    textarea.value = initialCode;
    container.appendChild(textarea);
    if (!textarea) return null;
    const listeners = [];
    const notifyChange = () => {
        window.neurodeckCanvas.currentCode = textarea.value;
        for (const listener of listeners) listener();
    };
    textarea.addEventListener('input', notifyChange);
    textarea.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault(); document.getElementById('canvas-run-btn')?.click();
        }
    });
    return {
        getValue() { return textarea.value; },
        setValue(value) { textarea.value = value; notifyChange(); },
        getModel() {
            return {
                getValueInRange(range) {
                    const start = Math.max(0, Math.min(range?.startOffset ?? 0, textarea.value.length));
                    const end = Math.max(start, Math.min(range?.endOffset ?? textarea.value.length, textarea.value.length));
                    return textarea.value.slice(start, end);
                }
            };
        },
        getSelection() { return { startOffset: textarea.selectionStart ?? 0, endOffset: textarea.selectionEnd ?? 0 }; },
        executeEdits(_source, edits) {
            const edit = edits?.[0]; if (!edit) return;
            const start = Math.max(0, Math.min(edit.range?.startOffset ?? 0, textarea.value.length));
            const end = Math.max(start, Math.min(edit.range?.endOffset ?? textarea.value.length, textarea.value.length));
            textarea.value = `${textarea.value.slice(0, start)}${edit.text}${textarea.value.slice(end)}`;
            textarea.selectionStart = start; textarea.selectionEnd = start + edit.text.length;
            notifyChange();
        },
        onDidChangeModelContent(listener) {
            listeners.push(listener);
            return { dispose() { const idx = listeners.indexOf(listener); if (idx >= 0) listeners.splice(idx, 1); } };
        },
        addCommand() {}, layout() {}, focus() { textarea.focus(); }
    };
}

function setCanvasStatusLine(statusLine, message = '', tone = 'neutral') {
    if (!statusLine) return;
    if (!message) { statusLine.replaceChildren(); return; }
    const span = document.createElement('span');
    if (tone === 'error')        span.style.color = 'var(--error-color)';
    else if (tone === 'warning') span.style.color = 'var(--warning-color)';
    else if (tone === 'muted')   span.style.opacity = '0.6';
    span.textContent = message;
    statusLine.replaceChildren(span);
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
                invoke('canvas_collab_send', { code: monacoEditor.getValue(), lang: window.neurodeckCanvas.currentLang, sender: COLLAB_CLIENT_ID }).catch(err => console.warn("[Collab] sync send failed:", err));
            }, 300);
        }
    });
    renderCanvasPreview();
}

// ── Canvas View helpers ───────────────────────────────────────────────────────

function _cvStopExecListeners(cv) {
    if (cv.execLineUnlisten) { cv.execLineUnlisten(); cv.execLineUnlisten = null; }
    if (cv.execDoneUnlisten) { cv.execDoneUnlisten(); cv.execDoneUnlisten = null; }
}

function _cvSetExecRunning(running, cv) {
    cv.execRunning = running;
    if (cv.runBtn) {
        cv.runBtn.disabled = running;
        applyButtonIcon("#canvas-run-btn", { icon: running ? "zap" : "play", label: running ? "Running..." : "Run" });
    }
    if (cv.cancelBtn) cv.cancelBtn.style.display = running ? "inline-block" : "none";
}

async function _cvWireExecListeners(cv, outputPre) {
    cv.execLineUnlisten = await listen("canvas_exec_line", event => {
        if (!outputPre) return;
        const p = event.payload || {};
        outputPre.textContent += `${p.stream === "stderr" ? "[err] " : ""}${p.line || ""}\n`;
        outputPre.scrollTop = outputPre.scrollHeight;
    });
    cv.execDoneUnlisten = await listen("canvas_exec_done", event => {
        const p = event.payload || {};
        const exitCode = Number.isFinite(p.exit_code) ? p.exit_code : -1;
        const durationMs = Number.isFinite(p.duration_ms) ? p.duration_ms : 0;
        const duration = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs/1000).toFixed(1)}s`;
        if (outputPre) { outputPre.textContent += `\n--- exited ${exitCode} (${duration}) ---`; outputPre.scrollTop = outputPre.scrollHeight; }
        _cvStopExecListeners(cv);
        _cvSetExecRunning(false, cv);
        if (cv.runBtn) {
            applyButtonIcon("#canvas-run-btn", { icon: exitCode === 0 ? "shieldCheck" : "x", label: exitCode === 0 ? "Done" : "Failed" });
            setTimeout(() => applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }), 1500);
        }
        window.addNotification?.("Canvas Exec", `Finished in ${duration} (exit ${exitCode})`, exitCode === 0 ? "success" : "error");
    });
}

async function _cvRunStreamingExec(code, lang, cv) {
    if (cv.execRunning) return;
    const frame = document.getElementById("canvas-preview-frame");
    const outputPre = document.getElementById("canvas-preview-output");
    if (frame) frame.style.display = "none";
    if (outputPre) { outputPre.style.display = "block"; outputPre.textContent = ""; }
    _cvStopExecListeners(cv);
    _cvSetExecRunning(true, cv);
    await _cvWireExecListeners(cv, outputPre);
    try { await invoke("exec_code_stream", { code, lang }); }
    catch (err) {
        _cvStopExecListeners(cv); _cvSetExecRunning(false, cv);
        if (outputPre) outputPre.textContent = `Error executing code:\n${err}`;
        if (cv.runBtn) {
            applyButtonIcon("#canvas-run-btn", { icon: "x", label: "Failed" });
            setTimeout(() => applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }), 1500);
        }
    }
}

function _cvWireRunBtn(cv) {
    if (!cv.runBtn) return;
    cv.runBtn.onclick = () => {
        const lang = window.neurodeckCanvas.currentLang;
        const code = monacoEditor ? monacoEditor.getValue() : '';
        if (['python','bash','powershell','javascript','js'].includes(lang)) {
            _cvRunStreamingExec(code, lang, cv);
        } else if (lang === 'lua') {
            const outputPre = document.getElementById("canvas-preview-output");
            applyButtonIcon("#canvas-run-btn", { icon: "zap", label: "Running..." });
            cv.runBtn.disabled = true;
            if (outputPre) outputPre.textContent = "Executing Lua script in engine...\n";
            invoke("execute_lua", { code })
                .then(() => {
                    if (outputPre) outputPre.textContent = "Lua script executed successfully!\nCheck chat/terminal stdout for any prints.";
                    applyButtonIcon("#canvas-run-btn", { icon: "shieldCheck", label: "Done" });
                    cv.runBtn.disabled = false;
                    setTimeout(() => applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }), 1500);
                })
                .catch(err => {
                    if (outputPre) outputPre.textContent = `Lua Error:\n${err}`;
                    applyButtonIcon("#canvas-run-btn", { icon: "x", label: "Failed" });
                    cv.runBtn.disabled = false;
                    setTimeout(() => applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }), 1500);
                });
        } else {
            renderCanvasPreview();
            applyButtonIcon("#canvas-run-btn", { icon: "shieldCheck", label: "Done" });
            setTimeout(() => applyButtonIcon("#canvas-run-btn", { icon: "play", label: "Run" }), 1200);
        }
    };
}

function _cvWireDivider(cv) {
    if (!cv.divider || !cv.split) return;
    let isDragging = false;
    cv.divider.addEventListener("mousedown", e => { isDragging = true; e.preventDefault(); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; });
    document.addEventListener("mousemove", e => {
        if (!isDragging) return;
        const rect = cv.split.getBoundingClientRect();
        const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width * 100, 20), 80);
        cv.split.style.setProperty("--editor-pct", `${pct}%`);
        if (monacoEditor) monacoEditor.layout();
    });
    document.addEventListener("mouseup", () => {
        if (isDragging) { isDragging = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; }
    });
}

// ── Canvas Collab helpers ─────────────────────────────────────────────────────

async function _ccRefreshPeerList(cc) {
    if (!cc.peerListEl) return;
    try {
        const result = await invoke("discover_canvas_peers");
        const peers = result.peers || [];
        if (peers.length === 0) {
            cc.peerListEl.innerHTML = '';
            if (cc.peerListEmptyEl) cc.peerListEmptyEl.style.display = '';
        } else {
            if (cc.peerListEmptyEl) cc.peerListEmptyEl.style.display = 'none';
            cc.peerListEl.innerHTML = peers.map(p => {
                const name = p.name || p.hostname || 'Unknown', addr = p.addr || `${p.ip}:${p.port}`;
                return `<div class="collab-peer-item" data-addr="${addr}" style="padding:6px 8px;background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.15);border-radius:4px;cursor:pointer;font-size:0.78rem;display:flex;justify-content:space-between;align-items:center;"><span>${name}</span><span style="opacity:0.6;font-family:var(--font-mono);">${addr}</span></div>`;
            }).join('');
            cc.peerListEl.querySelectorAll('.collab-peer-item').forEach(item => {
                item.addEventListener('click', () => { if (cc.addrInput) cc.addrInput.value = item.dataset.addr; });
            });
        }
    } catch (e) { if (cc.peerListEmptyEl) cc.peerListEmptyEl.style.display = ''; }
}

function _ccStopPeerDiscovery(cc) {
    if (cc.peerDiscoveryInterval) { clearInterval(cc.peerDiscoveryInterval); cc.peerDiscoveryInterval = null; }
}

function _ccStartPeerDiscovery(cc) {
    _ccStopPeerDiscovery(cc);
    _ccRefreshPeerList(cc);
    cc.peerDiscoveryInterval = setInterval(() => _ccRefreshPeerList(cc), 3000);
}

function _ccShowTab(tab, cc) {
    const isHost = tab === 'host';
    if (cc.hostPanel) cc.hostPanel.style.display = isHost ? '' : 'none';
    if (cc.joinPanel) cc.joinPanel.style.display = isHost ? 'none' : '';
    if (cc.hostTabBtn) { cc.hostTabBtn.style.background = isHost ? 'rgba(0,229,255,0.1)' : ''; cc.hostTabBtn.style.borderColor = isHost ? 'var(--accent-color)' : ''; }
    if (cc.joinTabBtn) { cc.joinTabBtn.style.background = isHost ? '' : 'rgba(0,229,255,0.1)'; cc.joinTabBtn.style.borderColor = isHost ? '' : 'var(--accent-color)'; }
    isHost ? _ccStopPeerDiscovery(cc) : _ccStartPeerDiscovery(cc);
}

function _ccUpdatePresenceList(cc) {
    if (!cc.presenceList) return;
    collabPresence.set(COLLAB_CLIENT_ID, { name: COLLAB_DISPLAY_NAME, role: 'local', at: Date.now() });
    cc.presenceList.innerHTML = Array.from(collabPresence.entries()).map(([id, peer]) =>
        `<div class="collab-presence-row"><span class="collab-presence-dot"></span><span class="collab-presence-name">${escapeCanvasHtml(peer.name||id)}</span><span class="collab-presence-role">${peer.role==='local'?'This device':'Peer'}</span></div>`
    ).join('');
}

function _ccAppendChat(name, message, local, cc) {
    if (!cc.chatLog) return;
    const row = document.createElement('div');
    row.className = `collab-chat-row${local?' local':''}`;
    row.innerHTML = `<span>${escapeCanvasHtml(name)}</span><p>${escapeCanvasHtml(message)}</p>`;
    cc.chatLog.appendChild(row);
    cc.chatLog.scrollTop = cc.chatLog.scrollHeight;
}

function _ccAppendApproval(message, status = 'pending', options = {}, cc) {
    if (!cc.approvalLog) return;
    const row = document.createElement('div');
    row.className = `collab-approval-row ${status}`;
    row.textContent = message;
    if (status === 'pending' && options.remote && options.requestId) {
        const controls = document.createElement('div');
        controls.className = 'collab-approval-controls';
        const approve = document.createElement('button');
        approve.className = 'canvas-btn canvas-btn-sm'; approve.textContent = 'Approve';
        const deny = document.createElement('button');
        deny.className = 'canvas-btn canvas-btn-sm'; deny.textContent = 'Deny';
        deny.style.cssText = 'border-color:var(--error-color);color:var(--error-color)';
        approve.addEventListener('click', () => {
            row.className = 'collab-approval-row approved'; row.textContent = `Approved: ${options.action||'shared run'}`;
            _ccBroadcast({ type:'agent_approval_response', name:COLLAB_DISPLAY_NAME, request_id:options.requestId, action:options.action||'shared run', approved:true }, cc);
        });
        deny.addEventListener('click', () => {
            row.className = 'collab-approval-row denied'; row.textContent = `Denied: ${options.action||'shared run'}`;
            _ccBroadcast({ type:'agent_approval_response', name:COLLAB_DISPLAY_NAME, request_id:options.requestId, action:options.action||'shared run', approved:false }, cc);
        });
        controls.append(approve, deny); row.appendChild(controls);
    }
    cc.approvalLog.prepend(row);
}

async function _ccBroadcast(payload, cc) {
    const enriched = { ...payload, sender: COLLAB_CLIENT_ID, workspace: (cc.workspaceNameInput?.value||'NEURODECK Workspace').trim()||'NEURODECK Workspace', at: new Date().toISOString() };
    await invoke('canvas_collab_broadcast', { payload: enriched }).catch(() => {});
}

async function _ccRefreshCollabStatus(cc) {
    try {
        const status = await invoke('canvas_collab_status');
        if (cc.statusPeers) {
            const peerCount = Number.parseInt(status.peers||'0', 10);
            cc.statusPeers.textContent = `${peerCount} peer${peerCount===1?'':'s'}`;
        }
        if (window) window._mockCollabActive = status.active === 'true'; // APPROVED_MOCK_FALLBACK
    } catch (_) {}
}

function _ccSetPeerConnected(peerInfo = '', cc) {
    if (cc.activePanel) cc.activePanel.style.display = '';
    if (cc.hostWaiting) cc.hostWaiting.style.display = 'none';
    if (cc.statusLine) cc.statusLine.innerHTML = '';
    if (cc.collabBtn) { cc.collabBtn.style.background = 'rgba(0,255,136,0.15)'; cc.collabBtn.style.borderColor = 'var(--response-color)'; }
    if (cc.statusBar) cc.statusBar.style.display = 'flex';
    if (cc.statusText) {
        cc.statusText.innerText = peerInfo ? `Collab Active: Connected to peer (${peerInfo})` :
            cc.addrInput?.value ? `Collab Active: Connected to ${cc.addrInput.value}` : "Collab Active: Syncing edits live";
    }
    _ccUpdatePresenceList(cc);
    _ccBroadcast({ type:'presence', name:COLLAB_DISPLAY_NAME, role:'peer' }, cc);
    _ccRefreshCollabStatus(cc);
}

function _ccSetDisconnected(cc) {
    if (cc.activePanel) cc.activePanel.style.display = 'none';
    if (cc.hostWaiting) cc.hostWaiting.style.display = 'none';
    if (cc.collabBtn) { cc.collabBtn.style.background = ''; cc.collabBtn.style.borderColor = ''; }
    if (cc.statusLine) cc.statusLine.innerHTML = '';
    if (cc.statusBar) cc.statusBar.style.display = 'none';
    collabPresence.clear();
    _ccUpdatePresenceList(cc);
    if (window) window._mockCollabActive = false; // APPROVED_MOCK_FALLBACK
}

function _ccUpdateInvitePayload(address, cc) {
    if (!cc.invitePayload) return;
    cc.invitePayload.value = JSON.stringify({ type:'neurodeck-workspace-invite', workspace:(cc.workspaceNameInput?.value||'NEURODECK Workspace').trim()||'NEURODECK Workspace', address, protocol:'neurodeck-collab-tcp-v2' }, null, 2);
}

function _ccApplyPeerSync(data, cc) {
    _peerSyncing = true;
    if (monacoEditor) monacoEditor.setValue(data.code);
    _peerSyncing = false;
    const langSelect = document.getElementById("canvas-lang-select");
    if (langSelect && data.lang && data.lang !== langSelect.value) { langSelect.value = data.lang; langSelect.dispatchEvent(new Event('change')); }
    renderCanvasPreview();
}

function _ccAppendSyncApproval(sender, name, cc) {
    if (!cc.chatLog) return;
    const id = ++cc.syncApprovalCounter;
    const row = document.createElement('div');
    row.className = 'collab-chat-row';
    row.innerHTML = `<span>${escapeCanvasHtml(name||'Peer')}</span><p>wants to sync canvas code. <button class="canvas-btn canvas-btn-sm" id="approve-sync-${id}">Accept</button> <button class="canvas-btn canvas-btn-sm" id="reject-sync-${id}" style="border-color:var(--error-color);color:var(--error-color)">Reject</button></p>`;
    cc.chatLog.appendChild(row);
    cc.chatLog.scrollTop = cc.chatLog.scrollHeight;
    document.getElementById(`approve-sync-${id}`)?.addEventListener('click', () => {
        cc.approvedSyncPeers.add(sender);
        row.innerHTML = `<span>${escapeCanvasHtml(name||'Peer')}</span><p>Sync approved. Future updates from this peer will apply automatically.</p>`;
        const pending = cc.pendingSyncs.get(sender);
        if (pending) { _ccApplyPeerSync(pending, cc); cc.pendingSyncs.delete(sender); }
    });
    document.getElementById(`reject-sync-${id}`)?.addEventListener('click', () => {
        row.innerHTML = `<span>${escapeCanvasHtml(name||'Peer')}</span><p>Sync rejected. Updates from this peer will be ignored.</p>`;
        cc.pendingSyncs.delete(sender);
    });
}

function _ccHandleCanvasSyncEvent(data, cc) {
    if (data.sender && data.sender === COLLAB_CLIENT_ID) return;
    if ((data.type==='sync'||data.type==='y_update'||data.type==='sync_full') && data.code !== undefined) {
        const sender = data.sender || 'unknown';
        if (!cc.approvedSyncPeers.has(sender)) { cc.pendingSyncs.set(sender, data); _ccAppendSyncApproval(sender, data.name, cc); return; }
        _ccApplyPeerSync(data, cc);
    } else if (data.type === 'presence') {
        collabPresence.set(data.sender||`peer-${Date.now()}`, { name:data.name||'Peer', role:'peer', at:Date.now() });
        _ccUpdatePresenceList(cc); _ccRefreshCollabStatus(cc);
    } else if (data.type === 'chat') {
        _ccAppendChat(data.name||'Peer', data.message||'', false, cc);
    } else if (data.type === 'agent_approval_request') {
        _ccAppendApproval(`${data.name||'Peer'} requested agent approval: ${data.action||'shared run'}`, 'pending', { remote:true, requestId:data.request_id||`req-${Date.now()}`, action:data.action||'shared run' }, cc);
        addNotification("Shared Agent Approval", data.action||"A collaborator requested approval.", "warning");
    } else if (data.type === 'agent_approval_response') {
        _ccAppendApproval(`${data.name||'Peer'} ${data.approved?'approved':'denied'}: ${data.action||'shared run'}`, data.approved?'approved':'denied', {}, cc);
    }
}

function _ccWireCollabEvents(cc) {
    listen("canvas_collab_event", event => {
        const msg = event.payload || '';
        if (msg.startsWith('peer_connected')) {
            const peer = msg.includes(':') ? msg.split(':')[1] : '';
            _ccSetPeerConnected(peer, cc);
            addNotification("Collab Connected", "A peer joined your Canvas session.", "success");
        } else if (msg === 'peer_disconnected') {
            _ccSetDisconnected(cc);
            invoke("canvas_collab_stop").catch(() => {});
            addNotification("Collab Disconnected", "The peer has left the session.", "info");
        } else if (msg.startsWith('error:')) { setCanvasStatusLine(cc.statusLine, msg, 'error'); }
    }).catch(() => {});
    listen("canvas_sync", event => {
        try {
            const data = typeof event.payload==='string' ? JSON.parse(event.payload) : event.payload;
            _ccHandleCanvasSyncEvent(data, cc);
        } catch (e) { console.warn('[Collab] Failed to parse canvas_sync:', e); }
    }).catch(() => {});
}

function _ccWireModalOpen(cc) {
    cc.collabBtn.addEventListener("click", () => {
        cc.collabModal.classList.add("active");
        cc.collabModal.setAttribute("aria-hidden", "false");
        if (!cc.collabFocusTrap) cc.collabFocusTrap = new FocusTrap(cc.collabModal);
        cc.collabFocusTrap.activate();
    });
    if (cc.closeX) cc.closeX.addEventListener("click", () => { cc.collabModal.classList.remove("active"); cc.collabModal.setAttribute("aria-hidden", "true"); cc.collabFocusTrap?.deactivate(); _ccStopPeerDiscovery(cc); });
    cc.collabModal.addEventListener("click", e => {
        if (e.target === cc.collabModal) { cc.collabModal.classList.remove("active"); cc.collabModal.setAttribute("aria-hidden", "true"); cc.collabFocusTrap?.deactivate(); _ccStopPeerDiscovery(cc); }
    });
    if (cc.resyncBtn) {
        cc.resyncBtn.addEventListener("click", () => {
            if (monacoEditor) invoke("canvas_collab_send", { code: monacoEditor.getValue(), lang: document.getElementById("canvas-lang-select")?.value||'html', sender: COLLAB_CLIENT_ID }).catch(err => console.warn("[Collab] resync send failed:", err));
        });
    }
}

function _ccWireHostJoinStop(cc) {
    if (cc.hostStartBtn) {
        cc.hostStartBtn.addEventListener("click", async () => {
            const port = parseInt(cc.portInput?.value||'13338', 10);
            cc.hostStartBtn.disabled = true;
            setCanvasStatusLine(cc.statusLine, `Binding port ${port}...`, 'muted');
            try {
                const boundPort = await invoke("canvas_collab_host", { port });
                if (cc.hostWaiting) cc.hostWaiting.style.display = '';
                const lanIp = await invoke("get_lan_ip").catch(() => "your-lan-ip");
                const address = `${lanIp}:${boundPort}`;
                if (cc.hostAddr) cc.hostAddr.innerText = address;
                _ccUpdateInvitePayload(address, cc);
                setCanvasStatusLine(cc.statusLine); _ccRefreshCollabStatus(cc);
            } catch (err) { setCanvasStatusLine(cc.statusLine, `Error: ${String(err)}`, 'error'); cc.hostStartBtn.disabled = false; }
        });
    }
    if (cc.joinStartBtn) {
        cc.joinStartBtn.addEventListener("click", async () => {
            const addr = cc.addrInput?.value.trim()||'';
            if (!addr) { setCanvasStatusLine(cc.statusLine, 'Enter the host address first.', 'warning'); return; }
            cc.joinStartBtn.disabled = true;
            setCanvasStatusLine(cc.statusLine, `Connecting to ${addr}...`, 'muted');
            try { await invoke("canvas_collab_join", { addr }); _ccSetPeerConnected(addr, cc); _ccUpdateInvitePayload(addr, cc); }
            catch (err) { setCanvasStatusLine(cc.statusLine, `Error: ${String(err)}`, 'error'); cc.joinStartBtn.disabled = false; }
        });
    }
    if (cc.stopBtn) {
        cc.stopBtn.addEventListener("click", async () => {
            await invoke("canvas_collab_stop"); _ccSetDisconnected(cc);
            if (cc.hostStartBtn) cc.hostStartBtn.disabled = false;
            if (cc.joinStartBtn) cc.joinStartBtn.disabled = false;
        });
    }
}

function _ccWireChat(cc) {
    if (cc.chatSendBtn && cc.chatInput) {
        cc.chatSendBtn.addEventListener("click", () => {
            const message = cc.chatInput.value.trim();
            if (!message) return;
            cc.chatInput.value = '';
            _ccAppendChat(COLLAB_DISPLAY_NAME, message, true, cc);
            _ccBroadcast({ type:'chat', name:COLLAB_DISPLAY_NAME, message }, cc);
        });
        cc.chatInput.addEventListener("keydown", event => { if (event.key==='Enter') cc.chatSendBtn.click(); });
    }
    if (cc.approvalBtn) {
        cc.approvalBtn.addEventListener("click", () => {
            const action = `Run ${window.neurodeckCanvas.currentLang||'canvas'} code with shared workspace context`;
            _ccAppendApproval(`Local approval requested: ${action}`, 'pending', {}, cc);
            _ccBroadcast({ type:'agent_approval_request', name:COLLAB_DISPLAY_NAME, request_id:`approval-${Date.now()}-${Math.random().toString(16).slice(2)}`, action }, cc);
        });
    }
}

// ── Entry points ──────────────────────────────────────────────────────────────

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

    window.neurodeckCanvas.currentLang = select ? select.value : 'html';
    const defaultHTML = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Live Preview</title>\n  <style>\n    body { background: #0d0d0d; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100dvh; width: 100%; margin: 0; }\n    h1 { color: #7C3AED; }\n  </style>\n</head>\n<body>\n  <h1>Hello, NEURODECK</h1>\n  <p>Edit this code or send a block from the Chat tab.</p>\n</body>\n</html>`;
    window.neurodeckCanvas.currentCode = defaultHTML;
    initMonacoEditor(window.neurodeckCanvas.currentLang, defaultHTML);

    if (select) {
        select.addEventListener("change", () => {
            window.neurodeckCanvas.currentLang = select.value;
            if (fileTitle) fileTitle.textContent = window.neurodeckCanvas.activePluginFile || CANVAS_EXT_MAP[select.value] || 'untitled';
            if (monacoEditor) { const model = monacoEditor.getModel(); if (model && window.monaco?.editor) window.monaco.editor.setModelLanguage(model, getMonacoLang(select.value)); }
            renderCanvasPreview();
        });
    }

    let cancelBtn = document.getElementById("canvas-cancel-exec-btn");
    if (!cancelBtn && runBtn) {
        cancelBtn = document.createElement("button");
        cancelBtn.className = "canvas-btn canvas-btn-sm"; cancelBtn.id = "canvas-cancel-exec-btn";
        cancelBtn.innerHTML = `${createIcon('x',{size:12})}<span class="nd-button-label">Cancel</span>`;
        cancelBtn.style.cssText = "display:none;border-color:var(--error-color);color:var(--error-color)";
        runBtn.insertAdjacentElement("afterend", cancelBtn);
    }
    if (cancelBtn) cancelBtn.onclick = async () => { cancelBtn.disabled = true; try { await invoke("cancel_exec", {}); } finally { cancelBtn.disabled = false; } };

    const cv = { runBtn, cancelBtn, divider, split, execLineUnlisten: null, execDoneUnlisten: null, execRunning: false };
    _cvWireRunBtn(cv);
    _cvWireDivider(cv);

    if (clearBtn) clearBtn.onclick = async () => {
        const confirmed = await showConfirm("Clear the editor?", { confirmText:"Clear", cancelText:"Keep" });
        if (confirmed) { if (monacoEditor) monacoEditor.setValue(''); window.neurodeckCanvas.currentCode = ''; const frame = document.getElementById("canvas-preview-frame"); if (frame) frame.srcdoc = ''; }
    };
    if (copyBtn) copyBtn.onclick = () => { const code = monacoEditor ? monacoEditor.getValue() : ''; navigator.clipboard.writeText(code).then(() => { applyButtonIcon("#canvas-copy-btn", {icon:"shieldCheck",label:"Copied"}); setTimeout(() => applyButtonIcon("#canvas-copy-btn", {icon:"copy",label:"Copy"}), 1500); }); };
    if (refreshBtn) refreshBtn.onclick = () => renderCanvasPreview();
    if (aiEditBtn) aiEditBtn.onclick = () => openAiEditModal();
}

function initCanvasCollab() {
    const collabBtn = document.getElementById("canvas-collab-btn");
    const collabModal = document.getElementById("collab-modal");
    if (!collabBtn || !collabModal) return;

    const cc = {
        collabBtn, collabModal, collabFocusTrap: null, peerDiscoveryInterval: null,
        closeX: document.getElementById("close-collab-x"),
        hostTabBtn: document.getElementById("collab-host-tab-btn"),
        joinTabBtn: document.getElementById("collab-join-tab-btn"),
        hostPanel: document.getElementById("collab-host-panel"),
        joinPanel: document.getElementById("collab-join-panel"),
        hostStartBtn: document.getElementById("collab-host-start-btn"),
        joinStartBtn: document.getElementById("collab-join-start-btn"),
        portInput: document.getElementById("collab-port-input"),
        addrInput: document.getElementById("collab-addr-input"),
        statusLine: document.getElementById("collab-status-line"),
        activePanel: document.getElementById("collab-active-panel"),
        hostWaiting: document.getElementById("collab-host-waiting"),
        hostAddr: document.getElementById("collab-host-addr"),
        stopBtn: document.getElementById("collab-stop-btn"),
        workspaceNameInput: document.getElementById("collab-workspace-name"),
        invitePayload: document.getElementById("collab-invite-payload"),
        presenceList: document.getElementById("collab-presence-list"),
        chatLog: document.getElementById("collab-chat-log"),
        chatInput: document.getElementById("collab-chat-input"),
        chatSendBtn: document.getElementById("collab-chat-send"),
        approvalLog: document.getElementById("collab-approval-log"),
        approvalBtn: document.getElementById("collab-agent-approval-btn"),
        peerListEl: document.getElementById("collab-peer-list"),
        peerListEmptyEl: document.getElementById("collab-peer-list-empty"),
        statusBar: document.getElementById("canvas-collab-status-bar"),
        statusText: document.getElementById("canvas-collab-status-text"),
        resyncBtn: document.getElementById("canvas-collab-resync-btn"),
        statusPeers: document.getElementById("canvas-collab-peer-count"),
        approvedSyncPeers: new Set(),
        pendingSyncs: new Map(),
        syncApprovalCounter: 0,
    };

    if (cc.hostTabBtn) cc.hostTabBtn.addEventListener("click", () => _ccShowTab('host', cc));
    if (cc.joinTabBtn) cc.joinTabBtn.addEventListener("click", () => _ccShowTab('join', cc));
    _ccWireModalOpen(cc);
    _ccWireCollabEvents(cc);
    _ccWireHostJoinStop(cc);
    _ccWireChat(cc);
    _ccUpdatePresenceList(cc);
    setInterval(() => _ccRefreshCollabStatus(cc), 5000);
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
