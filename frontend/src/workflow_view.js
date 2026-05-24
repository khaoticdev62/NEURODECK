import { invoke } from '@tauri-apps/api/core';

// ── Node type registry ────────────────────────────────────────────────────────

const NODE_TYPES = {
    trigger:   { label: 'Trigger',        icon: '▶',  color: '#22c55e', desc: 'Start point — seeds the workflow with text' },
    prompt:    { label: 'AI Prompt',       icon: '🤖', color: '#00f0ff', desc: 'Send a prompt to the LLM; {{input}} = upstream output' },
    shell:     { label: 'Shell',           icon: '💻', color: '#f59e0b', desc: 'Run a shell command; {{input}} is available as $INPUT' },
    memory:    { label: 'Memory Search',   icon: '🧠', color: '#a78bfa', desc: 'Search vector DB with {{input}} as the query' },
    transform: { label: 'Transform',       icon: '⚙',  color: '#fb923c', desc: 'Reshape text: trim, case, extract, template' },
    output:    { label: 'Output',          icon: '📤', color: '#64748b', desc: 'Display final result in the run log' },
};

const NODE_W  = 210;
const NODE_H  = 82;
const PORT_R  = 7;

// ── State ─────────────────────────────────────────────────────────────────────

const _s = {
    nodes:      [],         // { id, type, x, y, config, _out, _err, _running }
    edges:      [],         // { id, from, to }
    selectedId: null,
    pan:        { x: 60, y: 40 },
    drag:       null,       // { nodeId, startX, startY, origX, origY }
    connecting: null,       // { fromId } — live edge being drawn
    mouseCanvas: { x: 0, y: 0 },
    running:    false,
    runLog:     [],
    workflowName: 'My Workflow',
};

let _container = null;
let _svgEl     = null;
let _canvasEl  = null;
let _nodesEl   = null;
let _propEl    = null;
let _logEl     = null;
let _nameEl    = null;
let _uid       = 1;

// ── Public API ────────────────────────────────────────────────────────────────

export function initWorkflowView() {
    _container = document.getElementById('view-workflow');
    if (!_container) return;
    _buildShell();
    _loadSaved();
    // Expose for external callers (e.g. Command Palette)
    window._wf_load_external = (name, json) => {
        try {
            const data = JSON.parse(json);
            _s.nodes = data.nodes || [];
            _s.edges = data.edges || [];
            _s.workflowName = data.name || name;
            _uid = (data.uid || 0) + 1;
            if (_nameEl) _nameEl.value = _s.workflowName;
            _s.selectedId = null;
            _render();
            _updatePropPanel(null);
        } catch (e) { console.warn('[WF] external load:', e); }
    };
}

// ── Shell builder ─────────────────────────────────────────────────────────────

function _buildShell() {
    _container.innerHTML = `
        <div class="wf-layout">
            <!-- Palette sidebar -->
            <aside class="wf-palette">
                <div class="wf-palette-title">Nodes</div>
                ${Object.entries(NODE_TYPES).map(([type, def]) => `
                    <div class="wf-palette-item" data-type="${type}" draggable="true" title="${def.desc}">
                        <span class="wf-palette-icon" style="color:${def.color}">${def.icon}</span>
                        <span class="wf-palette-label">${def.label}</span>
                    </div>
                `).join('')}
                <div class="wf-palette-divider"></div>
                <div class="wf-palette-title">Workflows</div>
                <div class="wf-saved-list" id="wf-saved-list"></div>
            </aside>

            <!-- Main area -->
            <div class="wf-main">
                <!-- Toolbar -->
                <div class="wf-toolbar">
                    <input  id="wf-name-input"   class="wf-name-input"   value="${_esc(_s.workflowName)}" placeholder="Workflow name…">
                    <button id="wf-save-btn"     class="wf-btn">💾 Save</button>
                    <button id="wf-clear-btn"    class="wf-btn">🗑 Clear</button>
                    <div class="wf-toolbar-sep"></div>
                    <button id="wf-run-btn"      class="wf-btn wf-btn-run">▶ Run</button>
                    <button id="wf-stop-btn"     class="wf-btn wf-btn-stop" style="display:none">■ Stop</button>
                    <div class="wf-run-status"   id="wf-run-status"></div>
                </div>

                <!-- Canvas + SVG overlay -->
                <div class="wf-canvas-wrap" id="wf-canvas-wrap">
                    <svg class="wf-svg" id="wf-svg" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <marker id="wf-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="rgba(0,240,255,0.55)"/>
                            </marker>
                        </defs>
                        <g id="wf-edges-g"></g>
                        <path id="wf-live-edge" class="wf-live-edge" style="display:none" fill="none"/>
                    </svg>
                    <div class="wf-nodes" id="wf-nodes"></div>
                </div>

                <!-- Run log -->
                <div class="wf-log" id="wf-log">
                    <div class="wf-log-title">Run Log</div>
                    <div class="wf-log-body" id="wf-log-body">
                        <span class="wf-log-empty">No runs yet. Click ▶ Run to execute your workflow.</span>
                    </div>
                </div>
            </div>

            <!-- Property panel -->
            <div class="wf-props" id="wf-props">
                <div class="wf-props-empty">Select a node to edit its properties.</div>
            </div>
        </div>
    `;

    _svgEl     = document.getElementById('wf-svg');
    _canvasEl  = document.getElementById('wf-canvas-wrap');
    _nodesEl   = document.getElementById('wf-nodes');
    _propEl    = document.getElementById('wf-props');
    _logEl     = document.getElementById('wf-log-body');
    _nameEl    = document.getElementById('wf-name-input');

    _wireToolbar();
    _wirePalette();
    _wireCanvas();
}

// ── Toolbar wiring ────────────────────────────────────────────────────────────

function _wireToolbar() {
    _nameEl.addEventListener('input', () => { _s.workflowName = _nameEl.value; });

    document.getElementById('wf-save-btn').addEventListener('click', _saveWorkflow);
    document.getElementById('wf-clear-btn').addEventListener('click', () => {
        if (!confirm('Clear all nodes?')) return;
        _s.nodes = []; _s.edges = []; _s.selectedId = null;
        _render(); _updatePropPanel(null);
    });
    document.getElementById('wf-run-btn').addEventListener('click',  _runWorkflow);
    document.getElementById('wf-stop-btn').addEventListener('click', () => { _s.running = false; });
}

// ── Palette wiring ────────────────────────────────────────────────────────────

function _wirePalette() {
    _container.querySelectorAll('.wf-palette-item').forEach(item => {
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('wf-node-type', item.dataset.type);
        });
    });
}

// ── Canvas wiring ─────────────────────────────────────────────────────────────

function _wireCanvas() {
    _canvasEl.addEventListener('dragover', e => e.preventDefault());

    _canvasEl.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('wf-node-type');
        if (!type) return;
        const pos = _clientToCanvas(e.clientX, e.clientY);
        _addNode(type, pos.x, pos.y);
    });

    // Pan on canvas background drag
    _canvasEl.addEventListener('mousedown', e => {
        if (e.target !== _canvasEl && e.target !== _nodesEl && e.target !== _svgEl &&
            !e.target.closest('svg')) return;
        if (e.button !== 0) return;
        const startX = e.clientX - _s.pan.x;
        const startY = e.clientY - _s.pan.y;
        const onMove = ev => {
            _s.pan.x = ev.clientX - startX;
            _s.pan.y = ev.clientY - startY;
            _applyPan();
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',  onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',  onUp);
    });

    // Track mouse for live edge
    _canvasEl.addEventListener('mousemove', e => {
        _s.mouseCanvas = _clientToCanvas(e.clientX, e.clientY);
        if (_s.connecting) _renderLiveEdge();
    });

    _canvasEl.addEventListener('mouseup', e => {
        if (_s.connecting && e.target === _canvasEl) {
            _s.connecting = null;
            _hideLiveEdge();
        }
    });
}

// ── Node operations ───────────────────────────────────────────────────────────

function _addNode(type, x, y) {
    const id = `n${_uid++}`;
    const defaults = {
        trigger:   { seed: 'Hello, workflow!' },
        prompt:    { prompt: 'Summarize the following:\n\n{{input}}' },
        shell:     { command: 'echo "{{input}}"' },
        memory:    { query: '{{input}}', limit: 3 },
        transform: { mode: 'trim', template: '' },
        output:    {},
    };
    _s.nodes.push({ id, type, x, y, config: { ...defaults[type] }, _out: null, _err: null, _running: false });
    _s.selectedId = id;
    _render();
    _updatePropPanel(_s.nodes.find(n => n.id === id));
}

function _deleteNode(id) {
    _s.nodes  = _s.nodes.filter(n => n.id !== id);
    _s.edges  = _s.edges.filter(e => e.from !== id && e.to !== id);
    if (_s.selectedId === id) { _s.selectedId = null; _updatePropPanel(null); }
    _render();
}

function _deleteEdge(id) {
    _s.edges = _s.edges.filter(e => e.id !== id);
    _render();
}

// ── Render ────────────────────────────────────────────────────────────────────

function _render() {
    _renderNodes();
    _renderEdges();
}

function _applyPan() {
    _nodesEl.style.transform = `translate(${_s.pan.x}px,${_s.pan.y}px)`;
    _renderEdges();
    if (_s.connecting) _renderLiveEdge();
}

function _renderNodes() {
    _nodesEl.innerHTML = '';
    for (const node of _s.nodes) {
        const def  = NODE_TYPES[node.type];
        const sel  = node.id === _s.selectedId;
        const run  = node._running;
        const ok   = !run && node._out !== null && node._err === null;
        const err  = !run && node._err !== null;

        const div  = document.createElement('div');
        div.className  = `wf-node wf-node-${node.type}${sel ? ' wf-selected' : ''}${run ? ' wf-running' : ''}${ok ? ' wf-done' : ''}${err ? ' wf-error' : ''}`;
        div.dataset.id = node.id;
        div.style.cssText = `left:${node.x}px;top:${node.y}px;--nc:${def.color}`;

        div.innerHTML = `
            <div class="wf-node-header">
                <span class="wf-node-icon">${def.icon}</span>
                <span class="wf-node-label">${def.label}</span>
                <button class="wf-node-del" title="Delete node">✕</button>
            </div>
            <div class="wf-node-body">
                ${_nodePreview(node)}
            </div>
            ${node.type !== 'trigger' ? `<div class="wf-port wf-port-in"  data-id="${node.id}" data-port="in"  title="Input"></div>`  : ''}
            ${node.type !== 'output'  ? `<div class="wf-port wf-port-out" data-id="${node.id}" data-port="out" title="Output"></div>` : ''}
            ${run ? '<div class="wf-node-spinner"></div>' : ''}
            ${ok  ? `<div class="wf-node-out-preview" title="${_esc(String(node._out))}">${_esc(String(node._out).slice(0,80))}${String(node._out).length > 80 ? '…' : ''}</div>` : ''}
            ${err ? `<div class="wf-node-err-preview">${_esc(String(node._err).slice(0,60))}</div>` : ''}
        `;

        // Delete button
        div.querySelector('.wf-node-del').addEventListener('click', e => {
            e.stopPropagation();
            _deleteNode(node.id);
        });

        // Select on click
        div.addEventListener('mousedown', e => {
            if (e.target.classList.contains('wf-port') || e.target.classList.contains('wf-node-del')) return;
            e.stopPropagation();
            _s.selectedId = node.id;
            _render();
            _updatePropPanel(node);
        });

        // Drag to move
        div.querySelector('.wf-node-header').addEventListener('mousedown', e => {
            if (e.target.classList.contains('wf-node-del')) return;
            e.stopPropagation();
            _s.drag = { nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y };
            const onMove = ev => {
                const n = _s.nodes.find(n => n.id === _s.drag.nodeId);
                if (!n) return;
                n.x = _s.drag.origX + (ev.clientX - _s.drag.startX);
                n.y = _s.drag.origY + (ev.clientY - _s.drag.startY);
                div.style.left = `${n.x}px`;
                div.style.top  = `${n.y}px`;
                _renderEdges();
            };
            const onUp = () => {
                _s.drag = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup',  onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup',  onUp);
        });

        // Output port — start edge
        div.querySelector('.wf-port-out')?.addEventListener('mousedown', e => {
            e.stopPropagation();
            _s.connecting = { fromId: node.id };
            _renderLiveEdge();
        });

        // Input port — complete edge
        div.querySelector('.wf-port-in')?.addEventListener('mouseup', e => {
            e.stopPropagation();
            if (!_s.connecting) return;
            if (_s.connecting.fromId === node.id) { _s.connecting = null; _hideLiveEdge(); return; }
            // Check no existing edge to this node
            const alreadyIn  = _s.edges.some(e => e.to   === node.id);
            const alreadyOut = _s.edges.some(e => e.from === _s.connecting.fromId);
            if (alreadyIn || alreadyOut) { _s.connecting = null; _hideLiveEdge(); return; }
            _s.edges.push({ id: `e${_uid++}`, from: _s.connecting.fromId, to: node.id });
            _s.connecting = null;
            _hideLiveEdge();
            _render();
        });

        _nodesEl.appendChild(div);
    }
    _nodesEl.style.transform = `translate(${_s.pan.x}px,${_s.pan.y}px)`;
}

function _nodePreview(node) {
    const c = node.config;
    switch (node.type) {
        case 'trigger':   return `<span class="wf-preview">${_esc((c.seed || '').slice(0,40))}</span>`;
        case 'prompt':    return `<span class="wf-preview">${_esc((c.prompt || '').slice(0,40))}</span>`;
        case 'shell':     return `<span class="wf-preview">${_esc((c.command || '').slice(0,40))}</span>`;
        case 'memory':    return `<span class="wf-preview">query: ${_esc((c.query || '').slice(0,30))}</span>`;
        case 'transform': return `<span class="wf-preview">mode: ${_esc(c.mode || 'trim')}</span>`;
        case 'output':    return `<span class="wf-preview">displays result</span>`;
        default:          return '';
    }
}

function _getPortPos(nodeId, port) {
    const node = _s.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const cx = node.x + _s.pan.x;
    const cy = node.y + _s.pan.y + NODE_H / 2;
    return port === 'out'
        ? { x: cx + NODE_W, y: cy }
        : { x: cx,          y: cy };
}

function _renderEdges() {
    const g = document.getElementById('wf-edges-g');
    if (!g) return;
    g.innerHTML = '';
    for (const edge of _s.edges) {
        const p1 = _getPortPos(edge.from, 'out');
        const p2 = _getPortPos(edge.to,   'in');
        const cx1 = p1.x + 80, cy1 = p1.y;
        const cx2 = p2.x - 80, cy2 = p2.y;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${p1.x},${p1.y} C${cx1},${cy1} ${cx2},${cy2} ${p2.x},${p2.y}`);
        path.setAttribute('class', 'wf-edge');
        path.setAttribute('marker-end', 'url(#wf-arrow)');
        path.dataset.id = edge.id;
        path.addEventListener('click', () => {
            if (confirm('Delete this connection?')) _deleteEdge(edge.id);
        });
        g.appendChild(path);
    }
}

function _renderLiveEdge() {
    const liveEl = document.getElementById('wf-live-edge');
    if (!liveEl || !_s.connecting) return;
    const p1 = _getPortPos(_s.connecting.fromId, 'out');
    const mx = _s.mouseCanvas.x + _s.pan.x;
    const my = _s.mouseCanvas.y + _s.pan.y;
    const cx1 = p1.x + 60, cx2 = mx - 60;
    liveEl.setAttribute('d', `M${p1.x},${p1.y} C${cx1},${p1.y} ${cx2},${my} ${mx},${my}`);
    liveEl.setAttribute('stroke', 'rgba(0,240,255,0.4)');
    liveEl.setAttribute('stroke-width', '2');
    liveEl.setAttribute('stroke-dasharray', '6 3');
    liveEl.style.display = '';
}

function _hideLiveEdge() {
    const liveEl = document.getElementById('wf-live-edge');
    if (liveEl) liveEl.style.display = 'none';
}

// ── Property panel ────────────────────────────────────────────────────────────

function _updatePropPanel(node) {
    if (!_propEl) return;
    if (!node) { _propEl.innerHTML = '<div class="wf-props-empty">Select a node to edit its properties.</div>'; return; }

    const def = NODE_TYPES[node.type];
    let fields = '';

    switch (node.type) {
        case 'trigger':
            fields = `
                <label class="wf-prop-label">Seed text</label>
                <textarea class="wf-prop-input" data-key="seed" rows="3">${_esc(node.config.seed || '')}</textarea>
                <p class="wf-prop-hint">The initial text passed into the first node.</p>
            `;
            break;
        case 'prompt':
            fields = `
                <label class="wf-prop-label">Prompt template</label>
                <textarea class="wf-prop-input" data-key="prompt" rows="5">${_esc(node.config.prompt || '')}</textarea>
                <p class="wf-prop-hint">Use {{input}} for upstream output.</p>
            `;
            break;
        case 'shell':
            fields = `
                <label class="wf-prop-label">Command</label>
                <input  class="wf-prop-input" data-key="command" value="${_esc(node.config.command || '')}">
                <p class="wf-prop-hint">{{input}} is injected as $INPUT env var.</p>
            `;
            break;
        case 'memory':
            fields = `
                <label class="wf-prop-label">Query template</label>
                <input  class="wf-prop-input" data-key="query" value="${_esc(node.config.query || '')}">
                <label class="wf-prop-label" style="margin-top:8px">Max results</label>
                <input  class="wf-prop-input" type="number" data-key="limit" min="1" max="10" value="${node.config.limit || 3}">
                <p class="wf-prop-hint">Returns top matches joined with newlines.</p>
            `;
            break;
        case 'transform':
            fields = `
                <label class="wf-prop-label">Mode</label>
                <select class="wf-prop-select" data-key="mode">
                    ${['trim','uppercase','lowercase','title_case','reverse','template'].map(m =>
                        `<option value="${m}" ${node.config.mode === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <label class="wf-prop-label" style="margin-top:8px">Template <span style="opacity:.5">(mode=template only)</span></label>
                <textarea class="wf-prop-input" data-key="template" rows="2">${_esc(node.config.template || '')}</textarea>
                <p class="wf-prop-hint">template mode: use {{input}} in the Template field.</p>
            `;
            break;
        case 'output':
            fields = `<p class="wf-prop-hint" style="margin-top:12px">This node displays the final result in the run log. No configuration needed.</p>`;
            break;
    }

    _propEl.innerHTML = `
        <div class="wf-props-header">
            <span class="wf-props-icon" style="color:${def.color}">${def.icon}</span>
            <span class="wf-props-title">${def.label}</span>
        </div>
        <div class="wf-props-body">
            ${fields}
        </div>
    `;

    // Live sync config from inputs
    _propEl.querySelectorAll('.wf-prop-input, .wf-prop-select').forEach(el => {
        el.addEventListener('input', () => {
            node.config[el.dataset.key] = el.value;
            // Refresh node preview without full re-render
            const nodeEl = _nodesEl?.querySelector(`[data-id="${node.id}"] .wf-preview`);
            if (nodeEl) nodeEl.textContent = _nodePreview(node).replace(/<[^>]+>/g, '');
        });
    });
}

// ── Workflow runner ───────────────────────────────────────────────────────────

async function _runWorkflow() {
    if (_s.running) return;
    if (!_s.nodes.length) { _logLine('No nodes in workflow.', 'warn'); return; }

    // Topological sort — find chain from trigger
    const trigger = _s.nodes.find(n => n.type === 'trigger');
    if (!trigger) { _logLine('No Trigger node found. Add one to start the workflow.', 'error'); return; }

    const chain = _buildChain(trigger.id);
    if (!chain) { _logLine('Workflow has a cycle — cannot run.', 'error'); return; }

    // Reset output state
    _s.nodes.forEach(n => { n._out = null; n._err = null; n._running = false; });
    _s.runLog = [];
    _logEl.innerHTML = '';
    _s.running = true;

    document.getElementById('wf-run-btn').style.display  = 'none';
    document.getElementById('wf-stop-btn').style.display = '';
    _setRunStatus('running', '▶ Running…');

    let input = '';
    for (const nodeId of chain) {
        if (!_s.running) { _logLine('⏹ Run stopped by user.', 'warn'); break; }
        const node = _s.nodes.find(n => n.id === nodeId);
        if (!node) break;

        node._running = true;
        _renderNodes();
        _logLine(`⚙ ${NODE_TYPES[node.type].label} [${node.id}]`, 'info');

        try {
            const out = await _runNode(node, input);
            node._out = out;
            node._err = null;
            node._running = false;
            input = out;
            _logLine(`✓ ${String(out).slice(0, 120)}${String(out).length > 120 ? '…' : ''}`, 'ok');
        } catch (err) {
            node._err = String(err);
            node._running = false;
            _logLine(`✗ ${String(err)}`, 'error');
            _s.running = false;
            break;
        }
        _renderNodes();
    }

    _s.running = false;
    document.getElementById('wf-run-btn').style.display  = '';
    document.getElementById('wf-stop-btn').style.display = 'none';
    _setRunStatus('idle', '');
}

function _buildChain(startId) {
    const chain = [];
    const visited = new Set();
    let cur = startId;
    while (cur) {
        if (visited.has(cur)) return null; // cycle
        visited.add(cur);
        chain.push(cur);
        const edge = _s.edges.find(e => e.from === cur);
        cur = edge ? edge.to : null;
    }
    return chain;
}

async function _runNode(node, input) {
    const c = node.config;
    const resolved = text => (text || '').replace(/\{\{input\}\}/g, input);

    switch (node.type) {
        case 'trigger':
            return c.seed || '';

        case 'prompt': {
            const prompt = resolved(c.prompt);
            const result = await invoke('send_command', {
                message: prompt,
                sessionId: `wf_${Date.now()}`,
            }).catch(async () => {
                // Fallback: use generate_commit_message's underlying provider path
                const diff = prompt;
                return invoke('generate_commit_message', { diff });
            });
            // send_command emits via listen, but for workflow we want sync result
            // Use a simpler one-shot call via the canvas exec path
            return await _llmOneShot(prompt);
        }

        case 'shell': {
            const command = resolved(c.command);
            return invoke('agent_exec_code', { code: command, lang: 'bash' });
        }

        case 'memory': {
            const query = resolved(c.query);
            const records = await invoke('memory_list_all');
            // Client-side filter — return top N records containing query words
            const words = query.toLowerCase().split(/\s+/);
            const matched = records
                .filter(r => words.some(w => (r.content || '').toLowerCase().includes(w)))
                .slice(0, c.limit || 3)
                .map(r => r.content)
                .join('\n---\n');
            return matched || '(no matching memory records)';
        }

        case 'transform': {
            switch (c.mode) {
                case 'trim':       return input.trim();
                case 'uppercase':  return input.toUpperCase();
                case 'lowercase':  return input.toLowerCase();
                case 'title_case': return input.replace(/\b\w/g, ch => ch.toUpperCase());
                case 'reverse':    return input.split('').reverse().join('');
                case 'template':   return resolved(c.template || '{{input}}');
                default:           return input;
            }
        }

        case 'output':
            return input;

        default:
            return input;
    }
}

async function _llmOneShot(prompt) {
    // Uses generate_commit_message as a lightweight one-shot LLM path
    // since it calls provider.generate_oneshot internally
    // We repurpose diff param as generic prompt
    const trimmed = `${prompt}\n\nRespond concisely. No markdown formatting.`;
    return invoke('generate_commit_message', { diff: trimmed });
}

// ── Run log helpers ───────────────────────────────────────────────────────────

function _logLine(text, cls) {
    if (!_logEl) return;
    const div = document.createElement('div');
    div.className = `wf-log-line wf-log-${cls}`;
    div.textContent = text;
    _logEl.appendChild(div);
    _logEl.scrollTop = _logEl.scrollHeight;
}

function _setRunStatus(state, text) {
    const el = document.getElementById('wf-run-status');
    if (!el) return;
    el.textContent = text;
    el.className   = `wf-run-status wf-run-status-${state}`;
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function _saveWorkflow() {
    const name = _s.workflowName.trim() || 'Unnamed';
    const json = JSON.stringify({ name, nodes: _s.nodes, edges: _s.edges, uid: _uid }, null, 2);
    try {
        await invoke('save_workflow', { name, json });
        _logLine(`💾 Saved "${name}"`, 'ok');
        await _loadSaved();
    } catch (e) {
        _logLine(`Save failed: ${e}`, 'error');
    }
}

async function _loadSaved() {
    const listEl = document.getElementById('wf-saved-list');
    if (!listEl) return;
    try {
        const names = await invoke('list_workflows');
        if (!names.length) { listEl.innerHTML = '<span class="wf-saved-empty">No saved workflows</span>'; return; }
        listEl.innerHTML = names.map(n => `
            <div class="wf-saved-item">
                <button class="wf-saved-load" data-name="${_esc(n)}">${_esc(n.replace(/_/g,' '))}</button>
                <button class="wf-saved-del"  data-name="${_esc(n)}" title="Delete">✕</button>
            </div>
        `).join('');
        listEl.querySelectorAll('.wf-saved-load').forEach(btn =>
            btn.addEventListener('click', () => _loadWorkflow(btn.dataset.name)));
        listEl.querySelectorAll('.wf-saved-del').forEach(btn =>
            btn.addEventListener('click', async () => {
                if (!confirm(`Delete "${btn.dataset.name}"?`)) return;
                await invoke('delete_workflow', { name: btn.dataset.name }).catch(() => {});
                await _loadSaved();
            })
        );
    } catch (_) {
        listEl.innerHTML = '<span class="wf-saved-empty">Could not load list</span>';
    }
}

async function _loadWorkflow(name) {
    try {
        const json = await invoke('load_workflow', { name });
        const data = JSON.parse(json);
        _s.nodes = data.nodes || [];
        _s.edges = data.edges || [];
        _s.workflowName = data.name || name;
        _uid = (data.uid || 0) + 1;
        if (_nameEl) _nameEl.value = _s.workflowName;
        _s.selectedId = null;
        _render();
        _updatePropPanel(null);
        _logLine(`📂 Loaded "${name}"`, 'ok');
    } catch (e) {
        _logLine(`Load failed: ${e}`, 'error');
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _clientToCanvas(cx, cy) {
    const rect = _canvasEl.getBoundingClientRect();
    return { x: cx - rect.left - _s.pan.x, y: cy - rect.top - _s.pan.y };
}

function _esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
