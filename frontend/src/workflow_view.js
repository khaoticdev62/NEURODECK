import { invoke } from '@tauri-apps/api/core';

// ── Node type registry ────────────────────────────────────────────────────────

const NODE_TYPES = {
    trigger:   { label: 'Trigger',       icon: '▶',  color: '#22c55e', desc: 'Start the workflow — manual, cron, or on-event', ports: { in: false, out: true }  },
    prompt:    { label: 'AI Prompt',      icon: '🤖', color: '#00f0ff', desc: 'Send a prompt to the LLM; {{input}} = upstream output', ports: { in: true, out: true } },
    shell:     { label: 'Shell',          icon: '💻', color: '#f59e0b', desc: 'Run a shell command; $INPUT holds upstream output', ports: { in: true, out: true } },
    file_op:   { label: 'File Op',        icon: '📄', color: '#818cf8', desc: 'Read or write a file', ports: { in: true, out: true } },
    pty_cmd:   { label: 'PTY Command',    icon: '⌨',  color: '#fb923c', desc: 'Send a command to the active terminal session', ports: { in: true, out: true } },
    memory:    { label: 'Memory Search',  icon: '🧠', color: '#a78bfa', desc: 'Search vector DB with {{input}} as the query', ports: { in: true, out: true } },
    condition: { label: 'Condition',      icon: '⑂',  color: '#facc15', desc: 'Branch on a JS expression — true path or false path', ports: { in: true, outTrue: true, outFalse: true } },
    transform: { label: 'Transform',      icon: '⚙',  color: '#fb923c', desc: 'Reshape text: trim, case, extract, template', ports: { in: true, out: true } },
    output:    { label: 'Output',         icon: '📤', color: '#64748b', desc: 'Display final result in the run log', ports: { in: true, out: false } },
};

const NODE_W  = 220;
const NODE_H  = 90;
const PORT_R  = 7;
const SNAP    = 20;

// ── State ─────────────────────────────────────────────────────────────────────

const _s = {
    nodes:        [],   // { id, type, x, y, config, _out, _err, _running }
    edges:        [],   // { id, from, fromPort, to, toPort }
    selectedId:   null,
    pan:          { x: 60, y: 40 },
    zoom:         1.0,
    drag:         null,
    connecting:   null, // { fromId, fromPort }
    mouseCanvas:  { x: 0, y: 0 },
    running:      false,
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
let _initialized = false;

// ── Public API ────────────────────────────────────────────────────────────────

export function initWorkflowView() {
    _container = document.getElementById('view-workflow');
    if (!_container || _initialized) return;
    _initialized = true;
    _buildShell();
    _loadSaved();
}

// ── Shell builder ─────────────────────────────────────────────────────────────

function _buildShell() {
    _container.innerHTML = `
        <div class="wf-layout">
            <!-- Palette sidebar -->
            <aside class="wf-palette">
                <div class="wf-palette-title">Node Types</div>
                ${Object.entries(NODE_TYPES).map(([type, def]) => `
                    <div class="wf-palette-item" data-type="${type}" draggable="true" title="${def.desc}"
                         role="button" tabindex="0" aria-label="Add ${def.label} node">
                        <span class="wf-palette-icon" style="color:${def.color}">${def.icon}</span>
                        <span class="wf-palette-label">${def.label}</span>
                    </div>
                `).join('')}
                <div class="wf-palette-divider"></div>
                <div class="wf-palette-title">Saved Workflows</div>
                <div class="wf-saved-list" id="wf-saved-list"></div>
            </aside>

            <!-- Main area -->
            <div class="wf-main">
                <!-- Toolbar -->
                <div class="wf-toolbar">
                    <input id="wf-name-input" class="wf-name-input" value="${_esc(_s.workflowName)}"
                           placeholder="Workflow name…" aria-label="Workflow name">
                    <button id="wf-save-btn"   class="wf-btn">💾 Save</button>
                    <button id="wf-export-btn" class="wf-btn" title="Export as .ndwf">⬇ Export</button>
                    <button id="wf-import-btn" class="wf-btn" title="Import .ndwf file">⬆ Import</button>
                    <input id="wf-import-file" type="file" accept=".ndwf,.json" style="display:none"
                           aria-label="Import workflow file">
                    <button id="wf-clear-btn"  class="wf-btn">🗑 Clear</button>
                    <div class="wf-toolbar-sep"></div>
                    <button id="wf-run-btn"    class="wf-btn wf-btn-run" aria-label="Run workflow">▶ Run</button>
                    <button id="wf-stop-btn"   class="wf-btn wf-btn-stop" style="display:none"
                            aria-label="Stop workflow">■ Stop</button>
                    <div class="wf-run-status" id="wf-run-status" aria-live="polite"></div>
                    <div class="wf-zoom-controls">
                        <button class="wf-btn wf-zoom-btn" id="wf-zoom-out" title="Zoom out" aria-label="Zoom out">−</button>
                        <span class="wf-zoom-label" id="wf-zoom-label">100%</span>
                        <button class="wf-btn wf-zoom-btn" id="wf-zoom-in"  title="Zoom in"  aria-label="Zoom in">+</button>
                        <button class="wf-btn wf-zoom-btn" id="wf-zoom-fit" title="Fit view" aria-label="Fit to view">⤢</button>
                    </div>
                </div>

                <!-- Canvas + SVG overlay -->
                <div class="wf-canvas-wrap" id="wf-canvas-wrap" role="region" aria-label="Workflow canvas">
                    <svg class="wf-svg" id="wf-svg" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <marker id="wf-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="rgba(0,240,255,0.55)"/>
                            </marker>
                            <marker id="wf-arrow-true" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="rgba(34,197,94,0.7)"/>
                            </marker>
                            <marker id="wf-arrow-false" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="rgba(239,68,68,0.7)"/>
                            </marker>
                        </defs>
                        <g id="wf-edges-g"></g>
                        <path id="wf-live-edge" class="wf-live-edge" style="display:none" fill="none"/>
                    </svg>
                    <div class="wf-nodes" id="wf-nodes"></div>
                    <div class="wf-canvas-hint" id="wf-canvas-hint">
                        Drag node types from the sidebar · Connect: drag output port → input port ·
                        Pan: drag canvas background · Zoom: Ctrl+scroll or buttons above
                    </div>
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
            <div class="wf-props" id="wf-props" aria-label="Node properties">
                <div class="wf-props-empty">Select a node to edit its properties.</div>
            </div>
        </div>
    `;

    _svgEl    = document.getElementById('wf-svg');
    _canvasEl = document.getElementById('wf-canvas-wrap');
    _nodesEl  = document.getElementById('wf-nodes');
    _propEl   = document.getElementById('wf-props');
    _logEl    = document.getElementById('wf-log-body');
    _nameEl   = document.getElementById('wf-name-input');

    _wireToolbar();
    _wirePalette();
    _wireCanvas();
    _wireImportDrop();
}

// ── Toolbar wiring ────────────────────────────────────────────────────────────

function _wireToolbar() {
    _nameEl.addEventListener('input', () => { _s.workflowName = _nameEl.value; });

    document.getElementById('wf-save-btn').addEventListener('click', _saveWorkflow);
    document.getElementById('wf-export-btn').addEventListener('click', _exportWorkflow);
    document.getElementById('wf-clear-btn').addEventListener('click', () => {
        if (!confirm('Clear all nodes?')) return;
        _s.nodes = []; _s.edges = []; _s.selectedId = null;
        _render(); _updatePropPanel(null);
    });
    document.getElementById('wf-run-btn').addEventListener('click',  _runWorkflow);
    document.getElementById('wf-stop-btn').addEventListener('click', () => { _s.running = false; });

    // Import
    const importBtn  = document.getElementById('wf-import-btn');
    const importFile = document.getElementById('wf-import-file');
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async () => {
        const file = importFile.files[0];
        if (!file) return;
        const text = await file.text();
        _importWorkflowFromJson(text);
        importFile.value = '';
    });

    // Zoom
    document.getElementById('wf-zoom-in').addEventListener('click',  () => _setZoom(_s.zoom + 0.1));
    document.getElementById('wf-zoom-out').addEventListener('click', () => _setZoom(_s.zoom - 0.1));
    document.getElementById('wf-zoom-fit').addEventListener('click', _fitView);
}

// ── Palette wiring ────────────────────────────────────────────────────────────

function _wirePalette() {
    _container.querySelectorAll('.wf-palette-item').forEach(item => {
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('wf-node-type', item.dataset.type);
        });
        // Keyboard: Enter/Space to add at default position
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                _addNode(item.dataset.type, 100 + _s.nodes.length * 30, 100 + _s.nodes.length * 30);
            }
        });
    });
}

// ── Canvas wiring ─────────────────────────────────────────────────────────────

function _wireCanvas() {
    _canvasEl.addEventListener('dragover',  e => e.preventDefault());
    _canvasEl.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('wf-node-type');
        if (!type) return;
        const pos = _clientToCanvas(e.clientX, e.clientY);
        _addNode(type, Math.round(pos.x / SNAP) * SNAP, Math.round(pos.y / SNAP) * SNAP);
        // Hide hint after first drop
        document.getElementById('wf-canvas-hint')?.remove();
    });

    // Pan on canvas background drag
    _canvasEl.addEventListener('mousedown', e => {
        if (e.target !== _canvasEl && e.target !== _nodesEl && e.target !== _svgEl &&
            !e.target.closest('svg') && !e.target.classList.contains('wf-canvas-hint')) return;
        if (e.button !== 0) return;
        const startX = e.clientX - _s.pan.x;
        const startY = e.clientY - _s.pan.y;
        const onMove = ev => {
            _s.pan.x = ev.clientX - startX;
            _s.pan.y = ev.clientY - startY;
            _applyTransform();
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    // Mouse position for live edge
    _canvasEl.addEventListener('mousemove', e => {
        _s.mouseCanvas = _clientToCanvas(e.clientX, e.clientY);
        if (_s.connecting) _renderLiveEdge();
    });

    _canvasEl.addEventListener('mouseup', e => {
        if (_s.connecting && (e.target === _canvasEl || e.target === _svgEl)) {
            _s.connecting = null;
            _hideLiveEdge();
        }
    });

    // Ctrl+wheel to zoom
    _canvasEl.addEventListener('wheel', e => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        _setZoom(_s.zoom + delta);
    }, { passive: false });

    // Click on empty canvas to deselect
    _canvasEl.addEventListener('click', e => {
        if (e.target === _canvasEl || e.target === _nodesEl) {
            _s.selectedId = null;
            _renderNodes();
            _updatePropPanel(null);
        }
    });
}

// ── Import drag-drop on entire view ──────────────────────────────────────────

function _wireImportDrop() {
    _container.addEventListener('dragover', e => {
        const item = e.dataTransfer?.items?.[0];
        if (item && (item.type === 'application/json' || e.dataTransfer.types.includes('Files'))) {
            e.preventDefault();
        }
    });
    _container.addEventListener('drop', e => {
        const file = e.dataTransfer?.files?.[0];
        if (!file || (!file.name.endsWith('.ndwf') && !file.name.endsWith('.json'))) return;
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = ev => _importWorkflowFromJson(ev.target.result);
        reader.readAsText(file);
    });
}

// ── Node operations ───────────────────────────────────────────────────────────

function _addNode(type, x, y) {
    const id = `n${_uid++}`;
    const defaults = {
        trigger:   { seed: 'Hello, workflow!', trigger_type: 'manual', cron: '0 * * * *', event: '' },
        prompt:    { prompt: 'Summarize the following:\n\n{{input}}' },
        shell:     { command: 'echo "{{input}}"', lang: 'bash' },
        file_op:   { mode: 'read', path: '', content: '{{input}}' },
        pty_cmd:   { command: '{{input}}', session: 'main_pty_session' },
        memory:    { query: '{{input}}', limit: 3 },
        condition: { expression: 'input.length > 0', trueSeed: '', falseSeed: '' },
        transform: { mode: 'trim', template: '' },
        output:    {},
    };
    _s.nodes.push({ id, type, x, y, config: { ...defaults[type] }, _out: null, _err: null, _running: false });
    _s.selectedId = id;
    _render();
    _updatePropPanel(_s.nodes.at(-1));
}

function _deleteNode(id) {
    _s.nodes = _s.nodes.filter(n => n.id !== id);
    _s.edges = _s.edges.filter(e => e.from !== id && e.to !== id);
    if (_s.selectedId === id) { _s.selectedId = null; _updatePropPanel(null); }
    _render();
}

function _deleteEdge(id) {
    _s.edges = _s.edges.filter(e => e.id !== id);
    _render();
}

// ── Zoom + pan ────────────────────────────────────────────────────────────────

function _setZoom(z) {
    _s.zoom = Math.max(0.3, Math.min(2.5, z));
    _applyTransform();
    const lbl = document.getElementById('wf-zoom-label');
    if (lbl) lbl.textContent = `${Math.round(_s.zoom * 100)}%`;
}

function _fitView() {
    if (!_s.nodes.length) return;
    const xs = _s.nodes.map(n => n.x);
    const ys = _s.nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs) + NODE_W;
    const minY = Math.min(...ys), maxY = Math.max(...ys) + NODE_H;
    const rect = _canvasEl.getBoundingClientRect();
    const scaleX = (rect.width  - 80) / (maxX - minX || 1);
    const scaleY = (rect.height - 160) / (maxY - minY || 1);
    _s.zoom = Math.max(0.3, Math.min(1.5, Math.min(scaleX, scaleY)));
    _s.pan.x = 40 - minX * _s.zoom;
    _s.pan.y = 40 - minY * _s.zoom;
    _applyTransform();
    const lbl = document.getElementById('wf-zoom-label');
    if (lbl) lbl.textContent = `${Math.round(_s.zoom * 100)}%`;
}

function _applyTransform() {
    const t = `translate(${_s.pan.x}px,${_s.pan.y}px) scale(${_s.zoom})`;
    if (_nodesEl) _nodesEl.style.transform = t;
    _renderEdges();
    if (_s.connecting) _renderLiveEdge();
}

// ── Render ────────────────────────────────────────────────────────────────────

function _render() {
    _renderNodes();
    _renderEdges();
}

function _renderNodes() {
    if (!_nodesEl) return;
    _nodesEl.innerHTML = '';
    for (const node of _s.nodes) {
        const def = NODE_TYPES[node.type];
        const sel = node.id === _s.selectedId;
        const run = node._running;
        const ok  = !run && node._out !== null && node._err === null;
        const err = !run && node._err !== null;

        const div = document.createElement('div');
        div.className  = `wf-node wf-node-${node.type}${sel ? ' wf-selected' : ''}${run ? ' wf-running' : ''}${ok ? ' wf-done' : ''}${err ? ' wf-error' : ''}`;
        div.dataset.id = node.id;
        div.style.cssText = `left:${node.x}px;top:${node.y}px;width:${NODE_W}px;--nc:${def.color}`;
        div.setAttribute('role', 'article');
        div.setAttribute('aria-label', `${def.label} node`);

        // Input port
        const inPort = def.ports.in
            ? `<div class="wf-port wf-port-in" data-id="${node.id}" data-port="in" title="Input" aria-label="Input port"></div>` : '';

        // Output port(s)
        let outPorts = '';
        if (def.ports.out) {
            outPorts = `<div class="wf-port wf-port-out" data-id="${node.id}" data-port="out" title="Output" aria-label="Output port"></div>`;
        }
        if (def.ports.outTrue) {
            outPorts += `<div class="wf-port wf-port-out wf-port-true"  data-id="${node.id}" data-port="out-true"  title="True branch"  aria-label="True output port"></div>`;
            outPorts += `<div class="wf-port wf-port-out wf-port-false" data-id="${node.id}" data-port="out-false" title="False branch" aria-label="False output port"></div>`;
        }

        div.innerHTML = `
            <div class="wf-node-header" style="border-top:2px solid ${def.color}">
                <span class="wf-node-icon">${def.icon}</span>
                <span class="wf-node-label">${def.label}</span>
                <button class="wf-node-del" title="Delete node" aria-label="Delete ${def.label} node">✕</button>
            </div>
            <div class="wf-node-body">${_nodePreview(node)}</div>
            ${inPort}${outPorts}
            ${run ? '<div class="wf-node-spinner" aria-label="Running"></div>' : ''}
            ${ok  ? `<div class="wf-node-out-preview" title="${_esc(String(node._out))}">${_esc(String(node._out).slice(0,80))}${String(node._out).length > 80 ? '…' : ''}</div>` : ''}
            ${err ? `<div class="wf-node-err-preview" role="alert">${_esc(String(node._err).slice(0,60))}</div>` : ''}
        `;

        div.querySelector('.wf-node-del').addEventListener('click', e => {
            e.stopPropagation();
            _deleteNode(node.id);
        });

        div.addEventListener('mousedown', e => {
            if (e.target.classList.contains('wf-port') || e.target.classList.contains('wf-node-del')) return;
            e.stopPropagation();
            _s.selectedId = node.id;
            _render();
            _updatePropPanel(node);
        });

        // Drag to move via header
        div.querySelector('.wf-node-header').addEventListener('mousedown', e => {
            if (e.target.classList.contains('wf-node-del')) return;
            e.stopPropagation();
            const startX = e.clientX, startY = e.clientY;
            const origX = node.x, origY = node.y;
            const onMove = ev => {
                const dx = (ev.clientX - startX) / _s.zoom;
                const dy = (ev.clientY - startY) / _s.zoom;
                node.x = Math.round((origX + dx) / SNAP) * SNAP;
                node.y = Math.round((origY + dy) / SNAP) * SNAP;
                div.style.left = `${node.x}px`;
                div.style.top  = `${node.y}px`;
                _renderEdges();
            };
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });

        // Output port — start edge
        div.querySelectorAll('.wf-port-out').forEach(port => {
            port.addEventListener('mousedown', e => {
                e.stopPropagation();
                _s.connecting = { fromId: node.id, fromPort: port.dataset.port };
                _renderLiveEdge();
            });
        });

        // Input port — complete edge
        div.querySelector('.wf-port-in')?.addEventListener('mouseup', e => {
            e.stopPropagation();
            if (!_s.connecting) return;
            const { fromId, fromPort } = _s.connecting;
            _s.connecting = null;
            _hideLiveEdge();
            if (fromId === node.id) return;
            // For non-condition nodes: only one output edge per port; one input per node
            const portKey = fromPort || 'out';
            const dupOut = _s.edges.some(e => e.from === fromId && e.fromPort === portKey);
            const dupIn  = _s.edges.some(e => e.to   === node.id);
            if (dupOut || dupIn) return;
            _s.edges.push({ id: `e${_uid++}`, from: fromId, fromPort: portKey, to: node.id, toPort: 'in' });
            _render();
        });

        _nodesEl.appendChild(div);
    }
    _nodesEl.style.transform = `translate(${_s.pan.x}px,${_s.pan.y}px) scale(${_s.zoom})`;
}

function _nodePreview(node) {
    const c = node.config;
    switch (node.type) {
        case 'trigger':   return `<span class="wf-preview">${_esc(_triggerTypeLabel(c))} · ${_esc((c.seed || '').slice(0,30))}</span>`;
        case 'prompt':    return `<span class="wf-preview">${_esc((c.prompt || '').slice(0,40))}</span>`;
        case 'shell':     return `<span class="wf-preview">${_esc((c.command || '').slice(0,40))}</span>`;
        case 'file_op':   return `<span class="wf-preview">${c.mode}: ${_esc((c.path || '').slice(0,35))}</span>`;
        case 'pty_cmd':   return `<span class="wf-preview">${_esc((c.command || '').slice(0,40))}</span>`;
        case 'memory':    return `<span class="wf-preview">query: ${_esc((c.query || '').slice(0,30))}</span>`;
        case 'condition': return `<span class="wf-preview">${_esc((c.expression || '').slice(0,40))}</span>`;
        case 'transform': return `<span class="wf-preview">mode: ${_esc(c.mode || 'trim')}</span>`;
        case 'output':    return `<span class="wf-preview">displays result</span>`;
        default:          return '';
    }
}

function _triggerTypeLabel(c) {
    switch (c.trigger_type) {
        case 'cron':  return `⏰ ${c.cron || '0 * * * *'}`;
        case 'event': return `⚡ ${c.event || 'event'}`;
        default:      return '▶ manual';
    }
}

// ── Edge rendering ────────────────────────────────────────────────────────────

function _getPortPos(nodeId, port) {
    const node = _s.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const ox = node.x * _s.zoom + _s.pan.x;
    const oy = node.y * _s.zoom + _s.pan.y;
    const nw = NODE_W * _s.zoom;
    const nh = NODE_H * _s.zoom;

    switch (port) {
        case 'in':        return { x: ox,            y: oy + nh / 2 };
        case 'out':       return { x: ox + nw,       y: oy + nh / 2 };
        case 'out-true':  return { x: ox + nw,       y: oy + nh * 0.35 };
        case 'out-false': return { x: ox + nw,       y: oy + nh * 0.65 };
        default:          return { x: ox + nw,       y: oy + nh / 2 };
    }
}

function _renderEdges() {
    const g = document.getElementById('wf-edges-g');
    if (!g) return;
    g.innerHTML = '';
    for (const edge of _s.edges) {
        const p1 = _getPortPos(edge.from, edge.fromPort || 'out');
        const p2 = _getPortPos(edge.to,   edge.toPort   || 'in');
        const cp = Math.abs(p2.x - p1.x) * 0.5;
        const cx1 = p1.x + cp, cy1 = p1.y;
        const cx2 = p2.x - cp, cy2 = p2.y;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${p1.x},${p1.y} C${cx1},${cy1} ${cx2},${cy2} ${p2.x},${p2.y}`);

        let cls = 'wf-edge';
        let markerId = '#wf-arrow';
        if (edge.fromPort === 'out-true')  { cls += ' wf-edge-true';  markerId = '#wf-arrow-true';  }
        if (edge.fromPort === 'out-false') { cls += ' wf-edge-false'; markerId = '#wf-arrow-false'; }

        path.setAttribute('class', cls);
        path.setAttribute('marker-end', `url(${markerId})`);
        path.dataset.id = edge.id;
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', 'Connection — click to delete');

        const delEdge = () => { if (confirm('Delete this connection?')) _deleteEdge(edge.id); };
        path.addEventListener('click', delEdge);
        path.addEventListener('keydown', e => { if (e.key === 'Delete' || e.key === 'Backspace') delEdge(); });

        // Label for true/false branches
        if (edge.fromPort === 'out-true' || edge.fromPort === 'out-false') {
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 - 8;
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', mx);
            text.setAttribute('y', my);
            text.setAttribute('class', edge.fromPort === 'out-true' ? 'wf-edge-label-true' : 'wf-edge-label-false');
            text.textContent = edge.fromPort === 'out-true' ? 'true' : 'false';
            g.appendChild(text);
        }

        g.appendChild(path);
    }
}

function _renderLiveEdge() {
    const liveEl = document.getElementById('wf-live-edge');
    if (!liveEl || !_s.connecting) return;
    const p1 = _getPortPos(_s.connecting.fromId, _s.connecting.fromPort || 'out');
    const mx = _s.mouseCanvas.x * _s.zoom + _s.pan.x;
    const my = _s.mouseCanvas.y * _s.zoom + _s.pan.y;
    const cp = Math.abs(mx - p1.x) * 0.5;
    liveEl.setAttribute('d', `M${p1.x},${p1.y} C${p1.x + cp},${p1.y} ${mx - cp},${my} ${mx},${my}`);
    liveEl.setAttribute('stroke', 'rgba(0,240,255,0.4)');
    liveEl.setAttribute('stroke-width', '2');
    liveEl.setAttribute('stroke-dasharray', '6 3');
    liveEl.style.display = '';
}

function _hideLiveEdge() {
    const el = document.getElementById('wf-live-edge');
    if (el) el.style.display = 'none';
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
                <label class="wf-prop-label">Trigger type</label>
                <select class="wf-prop-select" data-key="trigger_type">
                    ${['manual','cron','event'].map(t =>
                        `<option value="${t}" ${node.config.trigger_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
                <label class="wf-prop-label wf-prop-show-cron" style="margin-top:8px">Cron expression</label>
                <input  class="wf-prop-input wf-prop-show-cron" data-key="cron" value="${_esc(node.config.cron || '0 * * * *')}" placeholder="0 * * * *">
                <label class="wf-prop-label wf-prop-show-event" style="margin-top:8px">Event name</label>
                <input  class="wf-prop-input wf-prop-show-event" data-key="event" value="${_esc(node.config.event || '')}" placeholder="e.g. game_detected">
                <label class="wf-prop-label" style="margin-top:8px">Seed text</label>
                <textarea class="wf-prop-input" data-key="seed" rows="3">${_esc(node.config.seed || '')}</textarea>
                <p class="wf-prop-hint">Initial text passed into the first connected node.</p>
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
                <label class="wf-prop-label" style="margin-top:8px">Language</label>
                <select class="wf-prop-select" data-key="lang">
                    ${['bash','powershell','python'].map(l =>
                        `<option value="${l}" ${node.config.lang === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
                <p class="wf-prop-hint">{{input}} is injected as $INPUT env variable.</p>
            `;
            break;
        case 'file_op':
            fields = `
                <label class="wf-prop-label">Mode</label>
                <select class="wf-prop-select" data-key="mode">
                    ${['read','write','append'].map(m =>
                        `<option value="${m}" ${node.config.mode === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <label class="wf-prop-label" style="margin-top:8px">File path</label>
                <input  class="wf-prop-input" data-key="path" value="${_esc(node.config.path || '')}" placeholder="/path/to/file.txt">
                <label class="wf-prop-label wf-prop-show-write" style="margin-top:8px">Content to write</label>
                <textarea class="wf-prop-input wf-prop-show-write" data-key="content" rows="3">${_esc(node.config.content || '{{input}}')}</textarea>
                <p class="wf-prop-hint">Read: returns file contents. Write/Append: use {{input}} in content.</p>
            `;
            break;
        case 'pty_cmd':
            fields = `
                <label class="wf-prop-label">Command</label>
                <input  class="wf-prop-input" data-key="command" value="${_esc(node.config.command || '')}" placeholder="ls -la">
                <label class="wf-prop-label" style="margin-top:8px">PTY session ID</label>
                <input  class="wf-prop-input" data-key="session" value="${_esc(node.config.session || 'main_pty_session')}">
                <p class="wf-prop-hint">Sends the command to the active terminal session. {{input}} is replaced with upstream output.</p>
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
        case 'condition':
            fields = `
                <label class="wf-prop-label">Expression <span style="opacity:.5;font-size:0.65rem">(JS, "input" = upstream)</span></label>
                <input  class="wf-prop-input" data-key="expression" value="${_esc(node.config.expression || 'input.length > 0')}"
                        placeholder="e.g. input.includes('error')">
                <p class="wf-prop-hint">Returns true → takes the green (true) port. Returns false → takes the red (false) port.</p>
                <label class="wf-prop-label" style="margin-top:8px">True branch override <span style="opacity:.5">(optional)</span></label>
                <input  class="wf-prop-input" data-key="trueSeed" value="${_esc(node.config.trueSeed || '')}" placeholder="Replace input on true branch">
                <label class="wf-prop-label" style="margin-top:8px">False branch override <span style="opacity:.5">(optional)</span></label>
                <input  class="wf-prop-input" data-key="falseSeed" value="${_esc(node.config.falseSeed || '')}" placeholder="Replace input on false branch">
            `;
            break;
        case 'transform':
            fields = `
                <label class="wf-prop-label">Mode</label>
                <select class="wf-prop-select" data-key="mode">
                    ${['trim','uppercase','lowercase','title_case','reverse','template','extract_json','count_words'].map(m =>
                        `<option value="${m}" ${node.config.mode === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
                <label class="wf-prop-label" style="margin-top:8px">Template <span style="opacity:.5">(mode=template only)</span></label>
                <textarea class="wf-prop-input" data-key="template" rows="2">${_esc(node.config.template || '')}</textarea>
                <p class="wf-prop-hint">template: use {{input}}. extract_json: parses JSON and stringifies. count_words: returns word count.</p>
            `;
            break;
        case 'output':
            fields = `<p class="wf-prop-hint" style="margin-top:12px">Displays the final result in the run log. No configuration needed.</p>`;
            break;
    }

    _propEl.innerHTML = `
        <div class="wf-props-header">
            <span class="wf-props-icon" style="color:${def.color}">${def.icon}</span>
            <span class="wf-props-title">${def.label}</span>
        </div>
        <div class="wf-props-body">${fields}</div>
        <div class="wf-props-actions">
            <button class="wf-btn wf-btn-danger" id="wf-prop-del-btn" aria-label="Delete node">🗑 Delete node</button>
        </div>
    `;

    // Show/hide trigger type fields
    _syncTriggerFields(node);

    document.getElementById('wf-prop-del-btn')?.addEventListener('click', () => _deleteNode(node.id));

    _propEl.querySelectorAll('.wf-prop-input, .wf-prop-select').forEach(el => {
        el.addEventListener('input', () => {
            node.config[el.dataset.key] = el.tagName === 'INPUT' && el.type === 'number'
                ? Number(el.value) : el.value;
            if (el.dataset.key === 'trigger_type') _syncTriggerFields(node);
            const previewEl = _nodesEl?.querySelector(`[data-id="${node.id}"] .wf-preview`);
            if (previewEl) previewEl.innerHTML = _nodePreview(node);
        });
    });
}

function _syncTriggerFields(node) {
    const type = node.config.trigger_type || 'manual';
    _propEl.querySelectorAll('.wf-prop-show-cron').forEach(el => {
        el.style.display = type === 'cron' ? '' : 'none';
    });
    _propEl.querySelectorAll('.wf-prop-show-event').forEach(el => {
        el.style.display = type === 'event' ? '' : 'none';
    });
}

// ── Workflow runner ───────────────────────────────────────────────────────────

async function _runWorkflow() {
    if (_s.running) return;
    if (!_s.nodes.length) { _logLine('No nodes in workflow.', 'warn'); return; }

    const trigger = _s.nodes.find(n => n.type === 'trigger');
    if (!trigger) { _logLine('No Trigger node found.', 'error'); return; }

    _s.nodes.forEach(n => { n._out = null; n._err = null; n._running = false; });
    _logEl.innerHTML = '';
    _s.running = true;

    document.getElementById('wf-run-btn').style.display  = 'none';
    document.getElementById('wf-stop-btn').style.display = '';
    _setRunStatus('running', '▶ Running…');

    try {
        await _execNode(trigger, trigger.config.seed || '');
    } catch (err) {
        _logLine(`Fatal: ${err}`, 'error');
    }

    _s.running = false;
    document.getElementById('wf-run-btn').style.display  = '';
    document.getElementById('wf-stop-btn').style.display = 'none';
    _setRunStatus('idle', '');
    _renderNodes();
}

async function _execNode(node, input) {
    if (!_s.running) return;
    if (!node) return;

    node._running = true;
    _renderNodes();
    _logLine(`⚙ ${NODE_TYPES[node.type].label} [${node.id}]`, 'info');

    let output;
    try {
        output = await _runNode(node, input);
        node._out = output;
        node._err = null;
        node._running = false;
        _logLine(`✓ ${String(output).slice(0, 140)}${String(output).length > 140 ? '…' : ''}`, 'ok');
    } catch (err) {
        node._err = String(err);
        node._running = false;
        _logLine(`✗ ${String(err)}`, 'error');
        _renderNodes();
        return;
    }
    _renderNodes();

    // Find outgoing edges from this node
    if (node.type === 'condition') {
        // Evaluate condition
        let result = false;
        try {
            // eslint-disable-next-line no-new-func
            result = !!new Function('input', `return (${node.config.expression || 'false'})`)(output);
        } catch { result = false; }
        const port = result ? 'out-true' : 'out-false';
        const override = result ? node.config.trueSeed : node.config.falseSeed;
        const branchInput = override || output;
        _logLine(`⑂ Condition: ${result ? '✓ true' : '✗ false'}`, result ? 'ok' : 'warn');
        const next = _nextNode(node.id, port);
        if (next) await _execNode(next, branchInput);
    } else {
        const next = _nextNode(node.id, 'out');
        if (next) await _execNode(next, output);
    }
}

function _nextNode(fromId, fromPort) {
    const edge = _s.edges.find(e => e.from === fromId && (e.fromPort || 'out') === fromPort);
    if (!edge) return null;
    return _s.nodes.find(n => n.id === edge.to) || null;
}

async function _runNode(node, input) {
    const c = node.config;
    const resolved = text => (text || '').replace(/\{\{input\}\}/g, input);

    switch (node.type) {
        case 'trigger':
            return c.seed || '';

        case 'prompt': {
            const prompt = resolved(c.prompt);
            return invoke('llm_oneshot', { prompt, maxTokens: 800 });
        }

        case 'shell': {
            const command = resolved(c.command);
            const lang = c.lang || 'bash';
            return invoke('agent_exec_code', { code: command, lang });
        }

        case 'file_op': {
            const path = resolved(c.path);
            if (!path) throw new Error('File path is required');
            if (c.mode === 'read') {
                return invoke('ide_read_workspace_file', { path }).catch(() =>
                    invoke('read_workspace_file', { path })
                );
            } else {
                const content = resolved(c.content || '{{input}}');
                const mode = c.mode === 'append' ? 'append' : 'write';
                await invoke('ide_write_workspace_file', { path, content, mode }).catch(() =>
                    invoke('write_workspace_file', { path, content })
                );
                return content;
            }
        }

        case 'pty_cmd': {
            const command = resolved(c.command);
            const sessionId = c.session || 'main_pty_session';
            await invoke('pty_write', { id: sessionId, data: command + '\n' });
            return `Sent to PTY [${sessionId}]: ${command}`;
        }

        case 'memory': {
            const query = resolved(c.query);
            const records = await invoke('memory_list_all');
            const words = query.toLowerCase().split(/\s+/);
            const matched = records
                .filter(r => words.some(w => (r.content || '').toLowerCase().includes(w)))
                .slice(0, c.limit || 3)
                .map(r => r.content)
                .join('\n---\n');
            return matched || '(no matching memory records)';
        }

        case 'condition':
            return input;

        case 'transform': {
            switch (c.mode) {
                case 'trim':         return input.trim();
                case 'uppercase':    return input.toUpperCase();
                case 'lowercase':    return input.toLowerCase();
                case 'title_case':   return input.replace(/\b\w/g, ch => ch.toUpperCase());
                case 'reverse':      return input.split('').reverse().join('');
                case 'template':     return resolved(c.template || '{{input}}');
                case 'extract_json': try { return JSON.stringify(JSON.parse(input), null, 2); } catch { return input; }
                case 'count_words':  return String(input.trim().split(/\s+/).filter(Boolean).length);
                default:             return input;
            }
        }

        case 'output':
            _logLine(`📤 Output: ${input}`, 'ok');
            return input;

        default:
            return input;
    }
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
    const json = JSON.stringify({ name, nodes: _s.nodes.map(_stripRunState), edges: _s.edges, uid: _uid }, null, 2);
    try {
        await invoke('save_workflow', { name, json });
        _logLine(`💾 Saved "${name}"`, 'ok');
        _loadSaved();
    } catch (e) {
        _logLine(`Save failed: ${e}`, 'error');
    }
}

function _stripRunState(node) {
    const { _out, _err, _running, ...rest } = node;
    return rest;
}

async function _loadSaved() {
    const listEl = document.getElementById('wf-saved-list');
    if (!listEl) return;
    try {
        const names = await invoke('list_workflows');
        if (!names.length) { listEl.innerHTML = '<span class="wf-saved-empty">No saved workflows</span>'; return; }
        listEl.innerHTML = names.map(n => `
            <div class="wf-saved-item">
                <button class="wf-saved-load" data-name="${_esc(n)}" aria-label="Load ${_esc(n)}">${_esc(n.replace(/_/g,' '))}</button>
                <button class="wf-saved-del"  data-name="${_esc(n)}" title="Delete" aria-label="Delete ${_esc(n)}">✕</button>
            </div>
        `).join('');
        listEl.querySelectorAll('.wf-saved-load').forEach(btn =>
            btn.addEventListener('click', () => _loadWorkflow(btn.dataset.name)));
        listEl.querySelectorAll('.wf-saved-del').forEach(btn =>
            btn.addEventListener('click', async () => {
                if (!confirm(`Delete "${btn.dataset.name}"?`)) return;
                await invoke('delete_workflow', { name: btn.dataset.name }).catch(() => {});
                _loadSaved();
            })
        );
    } catch {
        listEl.innerHTML = '<span class="wf-saved-empty">Could not load list</span>';
    }
}

async function _loadWorkflow(name) {
    try {
        const json = await invoke('load_workflow', { name });
        _applyWorkflowData(JSON.parse(json), name);
        _logLine(`📂 Loaded "${name}"`, 'ok');
    } catch (e) {
        _logLine(`Load failed: ${e}`, 'error');
    }
}

function _applyWorkflowData(data, fallbackName) {
    _s.nodes = (data.nodes || []).map(n => ({ ...n, _out: null, _err: null, _running: false }));
    _s.edges = data.edges || [];
    _s.workflowName = data.name || fallbackName || 'Workflow';
    _uid = (data.uid || 0) + 1;
    if (_nameEl) _nameEl.value = _s.workflowName;
    _s.selectedId = null;
    _render();
    _updatePropPanel(null);
}

// ── Export / Import ───────────────────────────────────────────────────────────

async function _exportWorkflow() {
    const name = _s.workflowName.trim() || 'Unnamed';
    const json = JSON.stringify({ name, nodes: _s.nodes.map(_stripRunState), edges: _s.edges, uid: _uid }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.ndwf`;
    a.click();
    URL.revokeObjectURL(url);
    _logLine(`⬇ Exported "${name}.ndwf"`, 'ok');
}

function _importWorkflowFromJson(json) {
    try {
        const data = JSON.parse(json);
        if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid workflow file');
        _applyWorkflowData(data, 'Imported Workflow');
        _logLine(`⬆ Imported "${data.name || 'workflow'}"`, 'ok');
        // Also save to backend
        invoke('workflow_import', { json }).catch(() => {});
    } catch (e) {
        _logLine(`Import failed: ${e.message}`, 'error');
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _clientToCanvas(cx, cy) {
    const rect = _canvasEl.getBoundingClientRect();
    return {
        x: (cx - rect.left - _s.pan.x) / _s.zoom,
        y: (cy - rect.top  - _s.pan.y) / _s.zoom,
    };
}

function _esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
