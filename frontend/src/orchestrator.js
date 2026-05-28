// ── Multi-Agent Orchestrator View ────────────────────────────────────────────
// Visual pipeline builder: drag-and-drop agent nodes connected by SVG bezier
// arrows. Pipelines saved to data/orchestrator/pipelines.json.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createIcon } from "./icons.js";
import { addNotification } from "./notifications.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H = 120;
const MAX_NODES = 10;
const GRID_SNAP = 20;

const ROLE_COLORS = {
  Researcher: "#4f8ef7",
  Developer: "#7b5ea7",
  Analyst: "#2aa876",
  Writer: "#e09b3d",
  Reviewer: "#e05c5c",
  Tester: "#5cc8e0",
  Custom: "#8888aa",
};

// ── State ─────────────────────────────────────────────────────────────────────
let _nodes = [];
let _connections = []; // [{ from: id, to: id }]
let _pipelines = [];
let _activePipelineId = null;
let _running = false;
let _paused = false;
let _dragState = null; // { type: "node"|"connect", nodeId, startX, startY, offsetX, offsetY }
let _personas = [];
let _unlisten = [];

// ── Init ───────────────────────────────────────────────────────────────────────
export async function initOrchestrator() {
  _bindUI();
  await _loadPersonas();
  await _loadPipelines();
  _renderPipelineList();
  _renderCanvas();
  _attachCanvasListeners();
  await _wireEvents();
}

// ── UI binding ────────────────────────────────────────────────────────────────
function _bindUI() {
  document
    .getElementById("orch-add-node-btn")
    ?.addEventListener("click", _addNode);
  document
    .getElementById("orch-run-btn")
    ?.addEventListener("click", _runPipeline);
  document
    .getElementById("orch-pause-btn")
    ?.addEventListener("click", _pausePipeline);
  document
    .getElementById("orch-stop-btn")
    ?.addEventListener("click", _stopPipeline);
  document
    .getElementById("orch-save-btn")
    ?.addEventListener("click", _savePipeline);
  document
    .getElementById("orch-new-btn")
    ?.addEventListener("click", _newPipeline);
  document
    .getElementById("orch-clear-btn")
    ?.addEventListener("click", _clearCanvas);
  document
    .getElementById("orch-auto-btn")
    ?.addEventListener("click", _runAutoOrchestration);
  document
    .getElementById("orch-auto-goal")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") _runAutoOrchestration();
    });
}

// ── Event wiring ──────────────────────────────────────────────────────────────
async function _wireEvents() {
  for (const u of _unlisten) u();
  _unlisten = [];

  _unlisten.push(
    await listen("orchestrator_plan_ready", (ev) => {
      const { tasks } = ev.payload;
      _syncTaskStatuses(tasks, "pending");
      _renderCanvas();
    })
  );

  _unlisten.push(
    await listen("agent_task_started", (ev) => {
      const { id, role } = ev.payload;
      _setNodeStatus(id, "running");
      _appendLog(`▶ ${role} (${id}) started…`, "info");
    })
  );

  _unlisten.push(
    await listen("agent_task_done", (ev) => {
      const { id, role, result, error } = ev.payload;
      if (error) {
        _setNodeStatus(id, "error");
        _appendLog(`✗ ${role} (${id}) error: ${error}`, "error");
      } else {
        _setNodeStatus(id, "done");
        _appendLog(`✓ ${role} (${id}): ${(result || "").slice(0, 120)}…`, "done");
      }
      _renderCanvas();
    })
  );

  _unlisten.push(
    await listen("orchestration_complete", (ev) => {
      const { goal, summary, task_count } = ev.payload;
      _running = false;
      _paused = false;
      _updateRunControls();
      const output = document.getElementById("orch-output");
      if (output) {
        output.innerHTML = `<div class="orch-summary">
          <div class="orch-summary-title">✅ Pipeline complete — ${task_count} agent${task_count !== 1 ? "s" : ""}</div>
          <div class="orch-summary-goal">Goal: ${_esc(goal)}</div>
          <div class="orch-summary-body">${_esc(summary)}</div>
        </div>`;
      }
      addNotification("Orchestration complete", "Pipeline finished.", "success");
    })
  );
}

// ── Persona loading ───────────────────────────────────────────────────────────
async function _loadPersonas() {
  try {
    _personas = await invoke("get_personas");
  } catch {
    _personas = [];
  }
}

// ── Pipeline CRUD ─────────────────────────────────────────────────────────────
async function _loadPipelines() {
  try {
    _pipelines = await invoke("load_pipelines");
  } catch {
    _pipelines = [];
  }
  if (_pipelines.length > 0 && !_activePipelineId) {
    _loadPipelineIntoCanvas(_pipelines[0]);
  }
}

function _renderPipelineList() {
  const list = document.getElementById("orch-pipeline-list");
  if (!list) return;
  if (_pipelines.length === 0) {
    list.innerHTML = `<div class="orch-empty-list">No saved pipelines</div>`;
    return;
  }
  list.innerHTML = _pipelines
    .map(
      (p) => `
    <div class="orch-pipeline-item${p.id === _activePipelineId ? " active" : ""}"
         data-pid="${p.id}">
      <span class="orch-pipeline-name">${_esc(p.name)}</span>
      <button class="orch-pipeline-del" data-pid="${p.id}" title="Delete pipeline" aria-label="Delete ${_esc(p.name)}">
        ${createIcon("trash2", { size: 12 })}
      </button>
    </div>`
    )
    .join("");

  list.querySelectorAll(".orch-pipeline-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".orch-pipeline-del")) return;
      const p = _pipelines.find((x) => x.id === el.dataset.pid);
      if (p) _loadPipelineIntoCanvas(p);
    });
  });

  list.querySelectorAll(".orch-pipeline-del").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const pid = btn.dataset.pid;
      if (!confirm("Delete this pipeline?")) return;
      try {
        await invoke("delete_pipeline", { id: pid });
        _pipelines = _pipelines.filter((p) => p.id !== pid);
        if (_activePipelineId === pid) {
          _activePipelineId = null;
          _nodes = [];
          _connections = [];
          _renderCanvas();
        }
        _renderPipelineList();
      } catch (err) {
        addNotification("Delete failed", String(err), "error");
      }
    });
  });
}

function _loadPipelineIntoCanvas(pipeline) {
  _activePipelineId = pipeline.id;
  _nodes = pipeline.nodes.map((n) => ({ ...n, _status: "idle" }));
  // Rebuild connections from node.inputs
  _connections = [];
  for (const node of _nodes) {
    for (const fromId of node.inputs || []) {
      _connections.push({ from: fromId, to: node.id });
    }
  }
  const nameInput = document.getElementById("orch-pipeline-name");
  if (nameInput) nameInput.value = pipeline.name;
  _renderCanvas();
  _renderPipelineList();
}

async function _savePipeline() {
  const nameInput = document.getElementById("orch-pipeline-name");
  const name = nameInput?.value.trim() || "Untitled Pipeline";
  const now = new Date().toISOString();
  const pipeline = {
    id: _activePipelineId || `pipe_${Date.now()}`,
    name,
    nodes: _nodes.map(({ _status, ...n }) => ({ ...n })),
    created_at: now,
    updated_at: now,
  };
  try {
    await invoke("save_pipeline", { pipeline });
    _activePipelineId = pipeline.id;
    const existing = _pipelines.findIndex((p) => p.id === pipeline.id);
    if (existing >= 0) {
      _pipelines[existing] = pipeline;
    } else {
      _pipelines.push(pipeline);
    }
    _renderPipelineList();
    addNotification("Pipeline saved", `"${name}" saved.`, "success");
  } catch (err) {
    addNotification("Save failed", String(err), "error");
  }
}

function _newPipeline() {
  _activePipelineId = null;
  _nodes = [];
  _connections = [];
  const nameInput = document.getElementById("orch-pipeline-name");
  if (nameInput) nameInput.value = "New Pipeline";
  _renderCanvas();
  _renderPipelineList();
}

function _clearCanvas() {
  if (_running) return;
  if (!confirm("Clear all nodes?")) return;
  _nodes = [];
  _connections = [];
  _renderCanvas();
}

// ── Node management ───────────────────────────────────────────────────────────
function _addNode() {
  if (_nodes.length >= MAX_NODES) {
    addNotification("Max nodes", `Maximum ${MAX_NODES} nodes per pipeline.`, "warning");
    return;
  }
  const col = _nodes.length % 3;
  const row = Math.floor(_nodes.length / 3);
  const node = {
    id: `node_${Date.now()}`,
    label: `Agent ${_nodes.length + 1}`,
    agent_id: "",
    prompt: "",
    inputs: [],
    x: 40 + col * (NODE_W + 60),
    y: 40 + row * (NODE_H + 80),
    _status: "idle",
  };
  _nodes.push(node);
  _renderCanvas();
  // Focus the label input for immediate editing
  setTimeout(() => {
    const inp = document.querySelector(`[data-node-id="${node.id}"] .orch-node-label-input`);
    inp?.focus();
  }, 50);
}

function _removeNode(id) {
  _nodes = _nodes.filter((n) => n.id !== id);
  _connections = _connections.filter((c) => c.from !== id && c.to !== id);
  // Clean up inputs references in remaining nodes
  for (const n of _nodes) {
    n.inputs = (n.inputs || []).filter((inp) => inp !== id);
  }
  _renderCanvas();
}

function _setNodeStatus(id, status) {
  const node = _nodes.find((n) => n.id === id);
  if (node) node._status = status;
}

function _syncTaskStatuses(tasks, defaultStatus = "pending") {
  for (const task of tasks) {
    const node = _nodes.find((n) => n.id === task.id || n.label === task.role);
    if (node) node._status = task.status || defaultStatus;
  }
}

// ── Run pipeline ─────────────────────────────────────────────────────────────
async function _runPipeline() {
  if (_nodes.length === 0) {
    addNotification("No nodes", "Add at least one agent node before running.", "warning");
    return;
  }
  if (_running && !_paused) return;

  _running = true;
  _paused = false;
  for (const n of _nodes) n._status = "pending";
  _updateRunControls();
  _renderCanvas();

  const log = document.getElementById("orch-log");
  if (log) log.innerHTML = "";
  const output = document.getElementById("orch-output");
  if (output) output.innerHTML = `<div class="orch-running">Pipeline running…</div>`;

  _appendLog("Pipeline started", "info");

  // Execute nodes in topological order
  const completed = new Map(); // id → result string
  const ordered = _topoSort(_nodes, _connections);

  for (const node of ordered) {
    if (!_running) break;
    // Wait while paused
    while (_paused && _running) {
      await _sleep(200);
    }
    if (!_running) break;

    node._status = "running";
    _renderCanvas();
    _appendLog(`▶ ${node.label} starting…`, "info");

    const contextParts = (node.inputs || [])
      .map((fromId) => completed.get(fromId))
      .filter(Boolean)
      .map((r, i) => `[Input ${i + 1}]:\n${r}`)
      .join("\n\n");

    const fullPrompt = contextParts
      ? `${node.prompt}\n\nContext from upstream agents:\n${contextParts}`
      : node.prompt;

    try {
      const result = await invoke("llm_oneshot", { prompt: fullPrompt, max_tokens: 800 });
      completed.set(node.id, result);
      node._status = "done";
      node._result = result;
      _appendLog(`✓ ${node.label}: ${result.slice(0, 100)}…`, "done");
    } catch (err) {
      node._status = "error";
      node._error = String(err);
      _appendLog(`✗ ${node.label}: ${String(err)}`, "error");
    }
    _renderCanvas();
  }

  _running = false;
  _paused = false;
  _updateRunControls();
  _renderCanvas();

  // Build final summary
  const outputs = ordered
    .filter((n) => n._status === "done")
    .map((n) => `**${n.label}**:\n${n._result || ""}`)
    .join("\n\n---\n\n");

  if (output) {
    output.innerHTML = `<div class="orch-summary">
      <div class="orch-summary-title">✅ Pipeline complete — ${ordered.length} node${ordered.length !== 1 ? "s" : ""}</div>
      <div class="orch-summary-body">${_esc(outputs)}</div>
    </div>`;
  }
  addNotification("Pipeline complete", `${ordered.length} nodes finished.`, "success");
}

function _pausePipeline() {
  if (!_running) return;
  _paused = !_paused;
  _updateRunControls();
  _appendLog(_paused ? "⏸ Paused" : "▶ Resumed", "info");
}

async function _stopPipeline() {
  _running = false;
  _paused = false;
  try {
    await invoke("stop_orchestration");
  } catch {}
  for (const n of _nodes) {
    if (n._status === "running" || n._status === "pending") n._status = "idle";
  }
  _updateRunControls();
  _renderCanvas();
  _appendLog("■ Stopped", "error");
}

// ── Auto-orchestration (LLM-generated plan) ───────────────────────────────────
async function _runAutoOrchestration() {
  const goalInput = document.getElementById("orch-auto-goal");
  const goal = goalInput?.value.trim();
  if (!goal) {
    goalInput?.focus();
    return;
  }
  if (_running) return;

  _running = true;
  _updateRunControls();
  const log = document.getElementById("orch-log");
  if (log) log.innerHTML = "";
  const output = document.getElementById("orch-output");
  if (output) output.innerHTML = `<div class="orch-running">Generating plan for: ${_esc(goal)}…</div>`;
  _appendLog(`Auto-orchestration: ${goal}`, "info");

  try {
    await invoke("start_orchestrated_task", { goal });
  } catch (err) {
    _running = false;
    _updateRunControls();
    addNotification("Orchestration failed", String(err), "error");
    _appendLog(`Error: ${err}`, "error");
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────
function _updateRunControls() {
  const runBtn = document.getElementById("orch-run-btn");
  const pauseBtn = document.getElementById("orch-pause-btn");
  const stopBtn = document.getElementById("orch-stop-btn");
  const autoBtn = document.getElementById("orch-auto-btn");

  if (runBtn) runBtn.disabled = _running && !_paused;
  if (pauseBtn) {
    pauseBtn.disabled = !_running;
    pauseBtn.textContent = _paused ? "▶ Resume" : "⏸ Pause";
  }
  if (stopBtn) stopBtn.disabled = !_running;
  if (autoBtn) autoBtn.disabled = _running;
}

// ── Log ───────────────────────────────────────────────────────────────────────
function _appendLog(msg, type = "info") {
  const log = document.getElementById("orch-log");
  if (!log) return;
  const line = document.createElement("div");
  line.className = `orch-log-line orch-log-${type}`;
  line.textContent = `${_ts()} ${msg}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// ── Canvas rendering ──────────────────────────────────────────────────────────
function _renderCanvas() {
  const canvas = document.getElementById("orch-canvas");
  if (!canvas) return;

  canvas.innerHTML = `
    <svg class="orch-arrows-svg" id="orch-arrows-svg">${_buildArrows()}</svg>
    ${_nodes.map(_buildNodeHTML).join("")}
    ${_buildConnectGhost()}
  `;

  _attachNodeListeners();
}

function _buildArrows() {
  return _connections
    .map(({ from, to }) => {
      const fromNode = _nodes.find((n) => n.id === from);
      const toNode = _nodes.find((n) => n.id === to);
      if (!fromNode || !toNode) return "";
      const x1 = fromNode.x + NODE_W;
      const y1 = fromNode.y + NODE_H / 2;
      const x2 = toNode.x;
      const y2 = toNode.y + NODE_H / 2;
      const cx1 = x1 + Math.abs(x2 - x1) * 0.5;
      const cy1 = y1;
      const cx2 = x2 - Math.abs(x2 - x1) * 0.5;
      const cy2 = y2;
      return `<path class="orch-arrow" d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
        marker-end="url(#orch-arrowhead)" />`;
    })
    .join("");
}

function _buildConnectGhost() {
  if (_dragState?.type !== "connect") return "";
  return `<div class="orch-connect-ghost" id="orch-connect-ghost"></div>`;
}

function _buildNodeHTML(node) {
  const statusClass = `orch-node-${node._status || "idle"}`;
  const color = ROLE_COLORS[node.label] || ROLE_COLORS.Custom;
  const personaOptions = [
    `<option value="">Active agent</option>`,
    ..._personas.map(
      (p) =>
        `<option value="${_esc(p.id)}"${node.agent_id === p.id ? " selected" : ""}>${_esc(p.name)}</option>`
    ),
  ].join("");

  return `
    <div class="orch-node ${statusClass}"
         data-node-id="${node.id}"
         style="left:${node.x}px;top:${node.y}px;width:${NODE_W}px;border-color:${color}">
      <div class="orch-node-header" style="background:${color}22;border-color:${color}">
        <span class="orch-node-drag-handle" title="Drag to move">⠿</span>
        <input class="orch-node-label-input" value="${_esc(node.label)}"
               data-field="label" aria-label="Node label" />
        <button class="orch-node-del" data-node-id="${node.id}"
                title="Remove node" aria-label="Remove node">
          ${createIcon("x", { size: 12 })}
        </button>
      </div>
      <div class="orch-node-body">
        <select class="orch-node-persona" data-field="agent_id" aria-label="Agent persona">
          ${personaOptions}
        </select>
        <textarea class="orch-node-prompt" data-field="prompt"
                  placeholder="Prompt for this agent…"
                  rows="2" aria-label="Agent prompt">${_esc(node.prompt)}</textarea>
      </div>
      <div class="orch-node-footer">
        <div class="orch-node-status-dot" title="${node._status || "idle"}"></div>
        <span class="orch-node-status-text">${node._status || "idle"}</span>
        <button class="orch-node-connect-from" data-node-id="${node.id}"
                title="Draw connection from this node" aria-label="Connect from node">→</button>
      </div>
      ${node._result ? `<div class="orch-node-result">${_esc(node._result.slice(0, 80))}…</div>` : ""}
    </div>`;
}

function _attachNodeListeners() {
  const canvas = document.getElementById("orch-canvas");
  if (!canvas) return;

  // Field changes
  canvas.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const nodeEl = e.target.closest("[data-node-id]");
      if (!nodeEl) return;
      const node = _nodes.find((n) => n.id === nodeEl.dataset.nodeId);
      if (!node) return;
      node[e.target.dataset.field] = e.target.value;
      if (e.target.dataset.field === "label") _renderArrows();
    });
  });

  // Delete node
  canvas.querySelectorAll(".orch-node-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _removeNode(btn.dataset.nodeId);
    });
  });

  // Drag-to-move
  canvas.querySelectorAll(".orch-node-drag-handle").forEach((handle) => {
    handle.addEventListener("mousedown", _onNodeDragStart);
  });

  // Connect button
  canvas.querySelectorAll(".orch-node-connect-from").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      _onConnectStart(e, btn.dataset.nodeId);
    });
  });

  // Node result click (expand output)
  canvas.querySelectorAll(".orch-node-result").forEach((el) => {
    el.addEventListener("click", () => {
      const nodeEl = el.closest("[data-node-id]");
      const node = _nodes.find((n) => n.id === nodeEl?.dataset?.nodeId);
      if (node?._result) {
        const out = document.getElementById("orch-output");
        if (out)
          out.innerHTML = `<div class="orch-summary">
            <div class="orch-summary-title">${_esc(node.label)} — output</div>
            <div class="orch-summary-body">${_esc(node._result)}</div>
          </div>`;
      }
    });
  });
}

function _renderArrows() {
  const svg = document.getElementById("orch-arrows-svg");
  if (svg) svg.innerHTML = _buildArrows();
}

// ── Drag-to-move ──────────────────────────────────────────────────────────────
function _attachCanvasListeners() {
  const canvas = document.getElementById("orch-canvas");
  if (!canvas) return;
  canvas.addEventListener("mousemove", _onCanvasMouseMove);
  canvas.addEventListener("mouseup", _onCanvasMouseUp);
  canvas.addEventListener("mouseleave", _onCanvasMouseUp);
}

function _onNodeDragStart(e) {
  e.preventDefault();
  const nodeEl = e.target.closest("[data-node-id]");
  if (!nodeEl) return;
  const canvas = document.getElementById("orch-canvas");
  const cr = canvas.getBoundingClientRect();
  const nr = nodeEl.getBoundingClientRect();
  _dragState = {
    type: "node",
    nodeId: nodeEl.dataset.nodeId,
    offsetX: e.clientX - nr.left,
    offsetY: e.clientY - nr.top,
    canvasLeft: cr.left,
    canvasTop: cr.top,
  };
  nodeEl.classList.add("orch-node-dragging");
}

function _onConnectStart(e, fromId) {
  e.preventDefault();
  const canvas = document.getElementById("orch-canvas");
  const cr = canvas.getBoundingClientRect();
  _dragState = {
    type: "connect",
    fromId,
    x: e.clientX - cr.left,
    y: e.clientY - cr.top,
    canvasLeft: cr.left,
    canvasTop: cr.top,
  };
}

function _onCanvasMouseMove(e) {
  if (!_dragState) return;
  if (_dragState.type === "node") {
    const node = _nodes.find((n) => n.id === _dragState.nodeId);
    if (!node) return;
    let nx =
      e.clientX - _dragState.canvasLeft - _dragState.offsetX;
    let ny = e.clientY - _dragState.canvasTop - _dragState.offsetY;
    nx = Math.round(nx / GRID_SNAP) * GRID_SNAP;
    ny = Math.round(ny / GRID_SNAP) * GRID_SNAP;
    node.x = Math.max(0, nx);
    node.y = Math.max(0, ny);
    const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
    if (nodeEl) {
      nodeEl.style.left = `${node.x}px`;
      nodeEl.style.top = `${node.y}px`;
    }
    _renderArrows();
  } else if (_dragState.type === "connect") {
    _dragState.x = e.clientX - _dragState.canvasLeft;
    _dragState.y = e.clientY - _dragState.canvasTop;
    _renderArrows();
  }
}

function _onCanvasMouseUp(e) {
  if (!_dragState) return;

  if (_dragState.type === "node") {
    document
      .querySelector(`[data-node-id="${_dragState.nodeId}"]`)
      ?.classList.remove("orch-node-dragging");
  } else if (_dragState.type === "connect") {
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-node-id]");
    if (target && target.dataset.nodeId !== _dragState.fromId) {
      const toId = target.dataset.nodeId;
      const alreadyExists = _connections.some(
        (c) => c.from === _dragState.fromId && c.to === toId
      );
      if (!alreadyExists) {
        _connections.push({ from: _dragState.fromId, to: toId });
        const toNode = _nodes.find((n) => n.id === toId);
        if (toNode && !toNode.inputs.includes(_dragState.fromId)) {
          toNode.inputs.push(_dragState.fromId);
        }
      }
      _renderCanvas();
    }
  }

  _dragState = null;
}

// ── Topological sort ──────────────────────────────────────────────────────────
function _topoSort(nodes, connections) {
  const inEdges = new Map(nodes.map((n) => [n.id, []]));
  for (const c of connections) {
    if (inEdges.has(c.to)) inEdges.get(c.to).push(c.from);
  }

  const visited = new Set();
  const result = [];

  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of inEdges.get(id) || []) visit(dep);
    const node = nodes.find((n) => n.id === id);
    if (node) result.push(node);
  }

  for (const n of nodes) visit(n.id);
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function _ts() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
