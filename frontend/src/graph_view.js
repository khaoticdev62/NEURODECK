import { invoke } from './neurobridge.js';

// ── Constants ─────────────────────────────────────────────────────────────────

// Vendored locally at frontend/public/d3.min.js to satisfy CSP script-src 'self'
const D3_CDN = '/d3.min.js';

const NODE_COLORS = {
    memory:  '#00f0ff',   // cyan
    fact:    '#f59e0b',   // amber
    session: '#a78bfa',   // purple
};

const NODE_RADIUS = { memory: 8, fact: 10, session: 7 };

// ── State ─────────────────────────────────────────────────────────────────────

let _d3 = null;
let _simulation = null;
let _svg = null;
let _zoomGroup = null;
let _tooltip = null;
let _graphData = null;
let _pinnedNodes = new Set(); // IDs of nodes pinned by drag

// ── D3 loader ─────────────────────────────────────────────────────────────────

function loadD3() {
    return new Promise((resolve, reject) => {
        if (window.d3) { resolve(window.d3); return; }
        const s = document.createElement('script');
        s.src = D3_CDN;
        s.onload = () => resolve(window.d3);
        s.onerror = () => reject(new Error('Failed to load D3.js'));
        document.head.appendChild(s);
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initGraphView() {
    const container = document.getElementById('view-graph');
    if (!container) return;

    // Show loading state while D3 loads and data fetches
    container.innerHTML = `
        <div class="graph-loading" id="graph-loading">
            <div class="graph-loading-icon">⬡</div>
            <div class="graph-loading-text">Loading knowledge graph…</div>
        </div>
        <div class="graph-toolbar">
            <button class="graph-toolbar-btn" id="graph-refresh-btn" title="Refresh graph">⟳ Refresh</button>
            <button class="graph-toolbar-btn" id="graph-center-btn" title="Center view">⊕ Center</button>
            <span class="graph-toolbar-sep"></span>
            <span class="graph-node-legend">
                <span class="graph-legend-dot" style="background:#00f0ff"></span>Memory
                <span class="graph-legend-dot" style="background:#f59e0b"></span>Fact
                <span class="graph-legend-dot" style="background:#a78bfa"></span>Session
            </span>
        </div>
        <svg id="graph-svg" style="width:100%;height:calc(100% - 44px);display:block;"></svg>
        <div id="graph-tooltip" class="graph-tooltip" style="display:none;"></div>
        <div id="graph-empty" class="graph-empty" style="display:none;">
            <div class="graph-empty-icon">🧠</div>
            <div class="graph-empty-text">No memory records yet.<br>Start a conversation to build your knowledge graph.</div>
        </div>
    `;

    document.getElementById('graph-refresh-btn').onclick = () => loadGraphData();
    document.getElementById('graph-center-btn').onclick = () => centerGraph();

    try {
        _d3 = await loadD3();
    } catch (e) {
        _showError(container, 'Failed to load D3.js. Check your internet connection.');
        return;
    }

    _tooltip = document.getElementById('graph-tooltip');
    await loadGraphData();
}

export async function loadGraphData() {
    const loading = document.getElementById('graph-loading');
    const empty = document.getElementById('graph-empty');
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';

    try {
        _graphData = await invoke('get_memory_graph_data');
    } catch (e) {
        _showError(document.getElementById('view-graph'), `Failed to load graph: ${e}`);
        return;
    }

    if (loading) loading.style.display = 'none';

    if (!_graphData.nodes.length) {
        if (empty) empty.style.display = 'flex';
        return;
    }

    _renderGraph(_graphData);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function _grSetupSvg(svgEl, d3) {
    const W = svgEl.clientWidth  || 900;
    const H = svgEl.clientHeight || 600;
    _svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`).style('background', 'transparent');
    const zoom = d3.zoom().scaleExtent([0.15, 4])
        .on('zoom', event => { _zoomGroup.attr('transform', event.transform); });
    _svg.call(zoom);
    _zoomGroup = _svg.append('g').attr('class', 'graph-zoom-group');
    _svg.append('defs').append('marker')
        .attr('id', 'graph-arrow').attr('viewBox', '0 -5 10 10')
        .attr('refX', 18).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'rgba(255,255,255,0.15)');
    return { W, H };
}

function _grCreateSimulation(nodes, links, W, H, d3) {
    return d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 120 - d.similarity * 60).strength(0.6))
        .force('charge', d3.forceManyBody().strength(-180))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide().radius(d => (NODE_RADIUS[d.node_type] || 8) + 6));
}

function _grRenderLinks(zoomGroup, links, d3) {
    return zoomGroup.append('g').attr('class', 'graph-links')
        .selectAll('line').data(links).enter().append('line')
        .attr('class', 'graph-edge')
        .attr('stroke-width', d => Math.max(0.5, d.similarity * 3))
        .attr('stroke-opacity', d => 0.3 + d.similarity * 0.5)
        .attr('stroke', 'rgba(255,255,255,0.4)');
}

function _grRenderNodeGroup(zoomGroup, nodes, d3) {
    const node = zoomGroup.append('g').attr('class', 'graph-nodes')
        .selectAll('g').data(nodes).enter().append('g').attr('class', 'graph-node-group')
        .call(d3.drag()
            .on('start', (event, d) => {
                if (!event.active) _simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => {
                if (!event.active) _simulation.alphaTarget(0);
                _pinnedNodes.add(d.id);
            })
        );
    node.append('circle')
        .attr('r', d => NODE_RADIUS[d.node_type] || 8)
        .attr('fill', d => NODE_COLORS[d.node_type] || '#00f0ff')
        .attr('fill-opacity', 0.85)
        .attr('stroke', d => NODE_COLORS[d.node_type] || '#00f0ff')
        .attr('stroke-width', 1.5).attr('stroke-opacity', 0.6).style('cursor', 'pointer');
    node.append('text')
        .attr('dy', d => (NODE_RADIUS[d.node_type] || 8) + 12)
        .attr('text-anchor', 'middle').attr('class', 'graph-node-label')
        .text(d => d.label.length > 28 ? d.label.slice(0, 28) + '…' : d.label)
        .attr('fill', '#a0aec0').attr('font-size', '9px').style('pointer-events', 'none');
    node.on('mouseenter', (event, d) => _showTooltip(event, d))
        .on('mousemove', event => _moveTooltip(event))
        .on('mouseleave', () => _hideTooltip())
        .on('click', (event, d) => _handleNodeClick(d));
    return node;
}

function _renderGraph(data) {
    const d3 = _d3;
    const svgEl = document.getElementById('graph-svg');
    if (!svgEl) return;
    d3.select(svgEl).selectAll('*').remove();
    _pinnedNodes.clear();
    const { W, H } = _grSetupSvg(svgEl, d3);
    const nodes = data.nodes.map(n => ({ ...n }));
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links = data.edges
        .map(e => ({ source: nodeById.get(e.source), target: nodeById.get(e.target), similarity: e.similarity }))
        .filter(e => e.source && e.target);
    _simulation = _grCreateSimulation(nodes, links, W, H, d3);
    const link = _grRenderLinks(_zoomGroup, links, d3);
    const node = _grRenderNodeGroup(_zoomGroup, nodes, d3);
    _simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// ── Interactions ──────────────────────────────────────────────────────────────

function _showTooltip(event, d) {
    if (!_tooltip) return;
    const preview = d.label.length > 120 ? d.label.slice(0, 120) + '…' : d.label;
    _tooltip.innerHTML = `
        <div class="graph-tooltip-type">${d.node_type}</div>
        <div class="graph-tooltip-id">${d.id}</div>
        <div class="graph-tooltip-preview">${_escHtml(preview)}</div>
        <div class="graph-tooltip-hint">Click to open in Memory view</div>
    `;
    _tooltip.style.display = 'block';
    _moveTooltip(event);
}

function _moveTooltip(event) {
    if (!_tooltip) return;
    const container = document.getElementById('view-graph');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let x = event.clientX - rect.left + 16;
    let y = event.clientY - rect.top + 16;
    // Prevent overflow right
    if (x + 260 > rect.width) x = event.clientX - rect.left - 276;
    _tooltip.style.left = x + 'px';
    _tooltip.style.top = y + 'px';
}

function _hideTooltip() {
    if (_tooltip) _tooltip.style.display = 'none';
}

function _handleNodeClick(d) {
    // Navigate to memory view and search for this record
    const memTab = document.querySelector('.nav-tab[data-view="memory"]');
    if (memTab) memTab.click();

    // Pre-fill memory search after tab switch
    setTimeout(() => {
        const searchInput = document.getElementById('memory-search-input');
        if (searchInput) {
            searchInput.value = d.id;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 120);
}

function centerGraph() {
    if (!_svg || !_d3) return;
    const svgEl = document.getElementById('graph-svg');
    if (!svgEl) return;
    const W = svgEl.clientWidth || 900;
    const H = svgEl.clientHeight || 600;
    _svg.transition().duration(500).call(
        _d3.zoom().transform,
        _d3.zoomIdentity.translate(W / 2, H / 2).scale(1)
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _showError(container, msg) {
    const loading = document.getElementById('graph-loading');
    if (loading) loading.style.display = 'none';
    const err = document.createElement('div');
    err.className = 'graph-error';
    err.textContent = msg;
    container.appendChild(err);
}

function _escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
