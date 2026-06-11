import { invoke } from './neurobridge.js';
import { listen } from './neurobridge.js';
import { state } from './state.js';
import { createIcon } from './icons.js';
import { addNotification } from './notifications.js';

// ── Utilities ─────────────────────────────────────────────────────────────────

function _agEscHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function _agParseStep(raw) {
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1].trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (_) {} }
    return { thought: raw, code: "", lang: "python", action: "error", summary: "Failed to parse agent response" };
}

function _agAppendLog(logEl, type, content, step) {
    const empty = logEl.querySelector(".agent-empty-state");
    if (empty) empty.remove();
    const entry = document.createElement("div");
    entry.className = `agent-log-entry agent-log-${type}`;
    const icons   = { thought:"brain", code:"fileText", exec:"zap", output:"squareTerminal", done:"shieldCheck", error:"x", info:"bell" };
    const labels  = { thought:"Thinking", code:"Code Written", exec:"Executing", output:"Output", done:"Done", error:"Error", info:"Info" };
    entry.innerHTML = `<span class="agent-log-icon">${createIcon(icons[type]||"fileText",{size:16})}</span>
        <div class="agent-log-body">
            <div class="agent-log-label">${step!==undefined?`Step ${step} — `:""}${labels[type]||type}</div>
            <div class="agent-log-text">${_agEscHtml(String(content))}</div>
        </div>`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
}

function _agAppendRtEntry(logEl, speaker) {
    const empty = logEl.querySelector(".agent-empty-state");
    if (empty) empty.remove();
    const entry = document.createElement("div");
    entry.className = "agent-log-entry agent-log-info agent-log-rt-msg";
    entry.innerHTML = `<span class="agent-log-icon">${createIcon("messageSquare",{size:16})}</span>
        <div class="agent-log-body">
            <div class="agent-log-label">${_agEscHtml(speaker)}</div>
            <div class="agent-log-text rt-msg-text"></div>
        </div>`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
    return entry.querySelector(".rt-msg-text");
}

// ── Tool dispatchers ───────────────────────────────────────────────────────────

async function _agRunComputerTool(tool, args = {}) {
    const computer = window.neurodeckComputerUse;
    if (!computer) throw new Error("Computer use tools are not initialized.");
    switch (tool) {
        case "computer_screenshot": {
            const shot = await computer.captureScreenshot({ showInAgentLog: true });
            return `Screenshot captured (${shot.mime}, ${shot.base64.length} base64 chars).`;
        }
        case "computer_find_text": {
            const text = String(args.text || "");
            if (!text.trim()) throw new Error("computer_find_text requires args.text.");
            const match = await computer.findText(text);
            return `Found "${match.text}" at x=${match.x}, y=${match.y}, width=${match.width}, height=${match.height}, confidence=${Math.round(match.confidence)}.`;
        }
        case "computer_mouse_move": {
            const x = Number(args.x), y = Number(args.y);
            if (!Number.isFinite(x)||!Number.isFinite(y)) throw new Error("computer_mouse_move requires numeric args.x and args.y.");
            await computer.mouseMove(Math.round(x), Math.round(y));
            return `Mouse moved to ${Math.round(x)}, ${Math.round(y)}.`;
        }
        case "computer_mouse_click": { await computer.click(String(args.button||"left")); return `${args.button||"left"} mouse click sent.`; }
        case "computer_type": {
            const text = String(args.text||"");
            if (!text) throw new Error("computer_type requires args.text.");
            await computer.type(text);
            return `Typed ${text.length} character${text.length===1?"":"s"}.`;
        }
        case "computer_key": {
            const key = String(args.key||"");
            if (!key) throw new Error("computer_key requires args.key.");
            await computer.key(key);
            return `Key sent: ${key}.`;
        }
        default: throw new Error(`Unsupported computer tool: ${tool}`);
    }
}

function _btRequire(args, ...keys) {
    for (const k of keys) { if (!String(args[k] || args[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] || "")) throw new Error(`${keys[0]}'s tool requires args.${k}.`); }
}

function _btSessionId(args) { return String(args.session_id || args.sessionId || ""); }

async function _btOpenSession(args) {
    const url = String(args.url || "");
    if (!url) throw new Error("browser_open_session requires args.url.");
    return `Browser session opened: ${await invoke("browser_open_session", { url })}`;
}

async function _btNavigateSession(args) {
    const sessionId = _btSessionId(args), url = String(args.url || "");
    if (!sessionId || !url) throw new Error("browser_navigate_session requires args.session_id and args.url.");
    await invoke("browser_navigate_session", { sessionId, url });
    return `Navigated session ${sessionId} to ${url}.`;
}

async function _btGetContent(args) {
    const sessionId = _btSessionId(args);
    if (!sessionId) throw new Error("browser_get_content requires args.session_id.");
    const content = await invoke("browser_get_content", { sessionId });
    return typeof content === "string" ? content.slice(0, 6000) : String(content);
}

async function _btClick(args) {
    const sessionId = _btSessionId(args), selector = String(args.selector || "");
    if (!sessionId || !selector) throw new Error("browser_click requires args.session_id and args.selector.");
    await invoke("browser_click", { sessionId, selector });
    return `Clicked ${selector} in session ${sessionId}.`;
}

async function _btFill(args) {
    const sessionId = _btSessionId(args), selector = String(args.selector || ""), value = String(args.value || "");
    if (!sessionId || !selector) throw new Error("browser_fill requires args.session_id and args.selector.");
    await invoke("browser_fill", { sessionId, selector, value });
    return `Filled ${selector} in session ${sessionId}.`;
}

async function _btScreenshot(args) {
    const sessionId = _btSessionId(args);
    if (!sessionId) throw new Error("browser_screenshot requires args.session_id.");
    const b64 = await invoke("browser_screenshot", { sessionId });
    return `Screenshot captured (base64 bytes: ${String(b64 || "").length}).`;
}

async function _btEvaluateJs(args) {
    const sessionId = _btSessionId(args), script = String(args.script || "");
    if (!sessionId || !script) throw new Error("browser_evaluate_js requires args.session_id and args.script.");
    const result = await invoke("browser_evaluate_js", { sessionId, script });
    return typeof result === "string" ? result : JSON.stringify(result);
}

async function _btCloseSession(args) {
    const sessionId = _btSessionId(args);
    if (!sessionId) throw new Error("browser_close_session requires args.session_id.");
    await invoke("browser_close_session", { sessionId });
    return `Closed browser session ${sessionId}.`;
}

const _BROWSER_TOOL_DISPATCH = {
    browser_open_session: _btOpenSession,
    browser_navigate_session: _btNavigateSession,
    browser_get_content: _btGetContent,
    browser_click: _btClick,
    browser_fill: _btFill,
    browser_screenshot: _btScreenshot,
    browser_evaluate_js: _btEvaluateJs,
    browser_close_session: _btCloseSession,
};

async function _agRunBrowserTool(tool, args = {}) {
    const handler = _BROWSER_TOOL_DISPATCH[tool];
    if (!handler) throw new Error(`Unsupported browser tool: ${tool}`);
    return handler(args);
}

// ── State helpers ─────────────────────────────────────────────────────────────

function _agSetRunning(on, ag) {
    ag.agentRunning = on;
    ag.runBtn.classList.toggle("hidden", on);
    ag.stopBtn.classList.toggle("hidden", !on);
    ag.iterLabel.classList.toggle("hidden", !on);
    ag.taskInput.disabled = on;
}

function _agSetOrchestratorRunning(on, ag) {
    ag.orchestratorRunning = on;
    ag.orchestratorStartBtn.classList.toggle("hidden", on);
    ag.orchestratorStopBtn.classList.toggle("hidden", !on);
    ag.orchestratorGoalInput.disabled = on;
}

function _agSetRtRunning(on, ag) {
    ag.rtRunning = on;
    ag.rtStartBtn.classList.toggle("hidden", on);
    ag.rtStopBtn.classList.toggle("hidden", !on);
    ag.rtPersonaA.disabled = on;
    ag.rtPersonaB.disabled = on;
    ag.rtTopicInput.disabled = on;
    ag.rtRounds.disabled = on;
}

function _agCleanupRtListeners(ag) {
    if (ag.rtUnlistenChunk)  { ag.rtUnlistenChunk();  ag.rtUnlistenChunk  = null; }
    if (ag.rtUnlistenDone)   { ag.rtUnlistenDone();   ag.rtUnlistenDone   = null; }
}

function _agCleanupOrchestratorListeners(ag) {
    if (ag.orchUnlistenPlan)       { ag.orchUnlistenPlan();       ag.orchUnlistenPlan       = null; }
    if (ag.orchUnlistenTaskStart)  { ag.orchUnlistenTaskStart();  ag.orchUnlistenTaskStart  = null; }
    if (ag.orchUnlistenTaskDone)   { ag.orchUnlistenTaskDone();   ag.orchUnlistenTaskDone   = null; }
    if (ag.orchUnlistenComplete)   { ag.orchUnlistenComplete();   ag.orchUnlistenComplete   = null; }
    if (ag.orchestratorPollTimer)  { clearInterval(ag.orchestratorPollTimer); ag.orchestratorPollTimer = null; }
}

function _agPopulateRtPersonas(ag) {
    const personas = state.availablePersonas || [];
    [ag.rtPersonaA, ag.rtPersonaB].forEach(sel => {
        const saved = sel.value;
        sel.innerHTML = '<option value="">Choose persona…</option>' +
            personas.map(p => `<option value="${_agEscHtml(p)}">${_agEscHtml(p)}</option>`).join("");
        if (saved && personas.includes(saved)) sel.value = saved;
    });
}

function _agSetMode(mode, ag) {
    ag.currentMode = mode;
    document.querySelectorAll(".agent-mode-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
    document.getElementById("agent-toolbar-task")?.classList.toggle("hidden", mode !== "task");
    document.getElementById("agent-toolbar-roundtable")?.classList.toggle("hidden", mode !== "roundtable");
    ag.orchestratorToolbar?.classList.toggle("hidden", mode !== "orchestrate");
    ag.orchestratorPanel?.classList.toggle("hidden", mode !== "orchestrate");
    ag.sendCanvasBtn.classList.toggle("hidden", mode !== "task");
    if (ag.codePaneTitle) ag.codePaneTitle.textContent = mode === "orchestrate" ? "Orchestration Plan" : "Current Code";
    if (ag.outputTitle)   ag.outputTitle.textContent   = mode === "orchestrate" ? "Orchestration Status" : "Output";
    if (mode === "orchestrate")      { _agRefreshOrchestratorStatus(ag).catch(() => {}); }
    else if (ag.codePre)             { ag.codePre.textContent = ag.lastCode || ""; }
}

function _agSyncModeUI(mode, ag) {
    _agSetMode(mode, ag);
    if (mode === "roundtable") {
        invoke("get_personas").then(p => { state.availablePersonas = p; _agPopulateRtPersonas(ag); }).catch(() => _agPopulateRtPersonas(ag));
    }
    if (mode === "orchestrate") { _agRefreshOrchestratorStatus(ag).catch(() => {}); }
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

function _agRenderOrchestratorStatus(status = {}, ag) {
    const running = Boolean(status.running);
    const goal    = String(status.goal || ag.lastOrchestratorGoal || "");
    const tasks   = Array.isArray(status.tasks) ? status.tasks : [];
    if (ag.orchestratorGoalInput && !ag.orchestratorGoalInput.value.trim() && goal) {
        ag.orchestratorGoalInput.value = goal;
    }
    if (ag.codePre) {
        if (tasks.length || goal || running) {
            ag.codePre.textContent = JSON.stringify({
                running,
                goal: goal || "(no goal)",
                tasks: tasks.map(task => ({
                    id: task.id, role: task.role, status: task.status, depends_on: task.depends_on,
                    result: task.result ? String(task.result).slice(0, 220) : null, error: task.error || null,
                })),
            }, null, 2);
        } else {
            ag.codePre.textContent = "No orchestration plan yet.";
        }
    }
    if (running)           ag.outputEl.textContent = `Orchestrator running: ${goal||"awaiting goal"}`;
    else if (tasks.length) ag.outputEl.textContent = `Orchestrator idle. ${tasks.length} task(s) in the current plan.`;
    else                   ag.outputEl.textContent = "No orchestration status yet.";
}

async function _agRefreshOrchestratorStatus(ag) {
    try {
        const status = await invoke("get_orchestration_status");
        if (status && typeof status === "object") {
            _agRenderOrchestratorStatus(status, ag);
            _agSetOrchestratorRunning(Boolean(status.running), ag);
            if (status.goal) ag.lastOrchestratorGoal = status.goal;
        }
    } catch (error) {
        if (ag.currentMode === "orchestrate") {
            _agRenderOrchestratorStatus({ running: false, goal: ag.lastOrchestratorGoal, tasks: [] }, ag);
            _agAppendLog(ag.logEl, "error", `Failed to load orchestrator status: ${error}`);
        }
    }
}

async function _agWireOrchestratorListeners(goal, ag) {
    ag.orchUnlistenPlan = await listen("orchestrator_plan_ready", event => {
        const plan = event.payload || {};
        _agRenderOrchestratorStatus({ running: true, goal: plan.goal || goal, tasks: plan.tasks || [] }, ag);
        _agAppendLog(ag.logEl, "info", `Plan ready with ${(plan.tasks||[]).length} task(s).`);
    });
    ag.orchUnlistenTaskStart = await listen("agent_task_started", event => {
        const p = event.payload || {};
        _agAppendLog(ag.logEl, "info", `${p.role||"Agent"} started: ${p.id||"task"}`);
        if (ag.orchestratorGoalInput.value.trim()) _agRefreshOrchestratorStatus(ag).catch(() => {});
    });
    ag.orchUnlistenTaskDone = await listen("agent_task_done", event => {
        const p = event.payload || {};
        if (p.error) { _agAppendLog(ag.logEl, "error", `${p.role||"Agent"} failed: ${p.error}`); }
        else { _agAppendLog(ag.logEl, "done", `${p.role||"Agent"} completed: ${p.result?String(p.result).slice(0,180):"done"}`); }
        _agRefreshOrchestratorStatus(ag).catch(() => {});
    });
    ag.orchUnlistenComplete = await listen("orchestration_complete", event => {
        const p = event.payload || {};
        _agCleanupOrchestratorListeners(ag);
        _agSetOrchestratorRunning(false, ag);
        _agRenderOrchestratorStatus({ running: false, goal: p.goal || goal, tasks: [] }, ag);
        _agAppendLog(ag.logEl, "done", p.summary || "Orchestration complete.");
        addNotification("Orchestration Complete", p.summary || "Multi-agent task finished.", "success");
    });
}

async function _agStartOrchestration(ag) {
    const goal = ag.orchestratorGoalInput.value.trim();
    if (!goal) { ag.orchestratorGoalInput.focus(); return; }
    _agCleanupOrchestratorListeners(ag);
    ag.lastOrchestratorGoal = goal;
    _agSetMode("orchestrate", ag);
    _agSetOrchestratorRunning(true, ag);
    ag.logEl.innerHTML = "";
    _agAppendLog(ag.logEl, "info", `Starting orchestration: ${goal}`);
    ag.outputEl.textContent = "Starting orchestration...";
    await _agWireOrchestratorListeners(goal, ag);
    try {
        await invoke("start_orchestrated_task", { goal });
        ag.orchestratorPollTimer = window.setInterval(() => {
            if (ag.currentMode === "orchestrate") _agRefreshOrchestratorStatus(ag).catch(() => {});
        }, 1500);
        _agRefreshOrchestratorStatus(ag).catch(() => {});
    } catch (error) {
        _agCleanupOrchestratorListeners(ag);
        _agSetOrchestratorRunning(false, ag);
        _agAppendLog(ag.logEl, "error", `Orchestration failed to start: ${error}`);
        addNotification("Orchestration Error", String(error), "error");
    }
}

async function _agStopOrchestration(ag) {
    try { await invoke("stop_orchestration"); } catch (_) {}
    _agCleanupOrchestratorListeners(ag);
    _agSetOrchestratorRunning(false, ag);
    _agRenderOrchestratorStatus({ running: false, goal: ag.lastOrchestratorGoal, tasks: [] }, ag);
    _agAppendLog(ag.logEl, "info", "Orchestration stopped by user.");
}

// ── Roundtable ────────────────────────────────────────────────────────────────

async function _agWireRtListeners(ag) {
    let currentTextEl = null, currentSpeaker = "Roundtable", pendingChunks = "";
    ag.rtUnlistenChunk = await listen("stream_chunk", event => {
        pendingChunks += String(event.payload);
        const pat = /\*\*([^*]{1,40}):\*\*/g;
        let lastIdx = 0, match;
        while ((match = pat.exec(pendingChunks)) !== null) {
            const before = pendingChunks.slice(lastIdx, match.index).trim();
            if (before && currentTextEl) currentTextEl.textContent += before;
            currentSpeaker = match[1];
            currentTextEl = _agAppendRtEntry(ag.logEl, currentSpeaker);
            lastIdx = match.index + match[0].length;
        }
        const remaining = pendingChunks.slice(lastIdx);
        if (remaining) {
            if (!currentTextEl) currentTextEl = _agAppendRtEntry(ag.logEl, currentSpeaker);
            currentTextEl.textContent += remaining;
        }
        pendingChunks = "";
        ag.logEl.scrollTop = ag.logEl.scrollHeight;
    });
    ag.rtUnlistenDone = await listen("stream_done", () => {
        _agCleanupRtListeners(ag);
        _agSetRtRunning(false, ag);
        addNotification("Roundtable", "Discussion complete.", "success");
    });
}

async function _agStartRoundtable(ag) {
    const pA = ag.rtPersonaA.value.trim(), pB = ag.rtPersonaB.value.trim();
    const topic = ag.rtTopicInput.value.trim();
    const rounds = parseInt(ag.rtRounds.value, 10) || 4;
    if (!pA || !pB) { addNotification("Roundtable", "Select both personas before starting.", "error"); return; }
    if (!topic) { ag.rtTopicInput.focus(); return; }
    _agCleanupRtListeners(ag);
    _agSetRtRunning(true, ag);
    ag.logEl.innerHTML = "";
    await _agWireRtListeners(ag);
    invoke("send_command", { message: `/discuss ${pA} ${pB} ${topic} rounds:${rounds}` }).catch(error => {
        _agAppendLog(ag.logEl, "error", `Roundtable failed: ${error}`);
        _agCleanupRtListeners(ag);
        _agSetRtRunning(false, ag);
    });
}

// ── Agent loop ────────────────────────────────────────────────────────────────

async function _agHandleToolStep(parsed, step, ag, history) {
    const isBrowser = parsed.action === "browser";
    const tool      = parsed.tool || (isBrowser ? parsed.browser_tool : parsed.computer_tool) || "";
    const prefix    = isBrowser ? "[Browser Tool Error]" : "[Computer Use Error]";
    _agAppendLog(ag.logEl, "exec", `Requesting ${isBrowser?"browser":"computer"} tool: ${tool}`, step);
    let toolOut;
    try { toolOut = isBrowser ? await _agRunBrowserTool(tool, parsed.args||{}) : await _agRunComputerTool(tool, parsed.args||{}); }
    catch (e) { toolOut = `${prefix} ${e}`; }
    ag.outputEl.textContent = toolOut;
    _agAppendLog(ag.logEl, toolOut.startsWith(prefix) ? "error" : "output", toolOut, step);
    history.push({ role: "step", content: JSON.stringify(parsed) });
    history.push({ role: "output", content: toolOut });
    return true;
}

async function _agHandleCodeStep(parsed, step, ag, history) {
    ag.lastCode = parsed.code;
    ag.lastLang = parsed.lang || "python";
    ag.codePre.textContent = parsed.code;
    _agAppendLog(ag.logEl, "code", `[${(parsed.lang||"?").toUpperCase()}] ${parsed.summary||""}`, step);
    if (ag.agentShouldStop) return;
    _agAppendLog(ag.logEl, "exec", `Running ${parsed.lang} code…`, step);
    ag.outputEl.innerHTML = '<span class="agent-output-spinner">⟳ Executing…</span>';
    let execOut;
    try { execOut = await invoke("agent_exec_code", { code: parsed.code, lang: parsed.lang }); }
    catch (e) { execOut = `[Error] ${e}`; }
    ag.outputEl.textContent = execOut;
    _agAppendLog(ag.logEl, "output", execOut.length > 300 ? execOut.slice(0, 300) + "…" : execOut, step);
    history.push({ role: "step", content: JSON.stringify(parsed) });
    history.push({ role: "output", content: execOut });
}

async function _agRunLoop(task, ag) {
    const history = [], MAX_STEPS = 5;
    _agSetRunning(true, ag);
    ag.agentShouldStop = false;
    ag.logEl.innerHTML = "";
    ag.outputEl.innerHTML = '<span class="agent-output-empty">Waiting…</span>';
    ag.codePre.textContent = "";

    // Pre-flight permission check
    try {
        const config = await invoke("get_config");
        const registry = config.security?.permission_registry;
        const activeAgent = config.llm?.active_agent_id || "default";
        if (registry) {
            const profile = (registry.profiles || []).find((p) => p.id === activeAgent)
                || (registry.profiles || []).find((p) => p.id === registry.default_profile_id);
            const granted = new Set(profile?.granted || []);
            const missing = [];
            if (!granted.has("shell_exec")) missing.push("Shell Execution");
            if (!granted.has("network")) missing.push("Network Access");
            if (!granted.has("memory_read")) missing.push("Memory Read");
            if (missing.length > 0) {
                _agAppendLog(ag.logEl, "info", `⚠️ Agent "${profile?.name || activeAgent}" lacks: ${missing.join(", ")}. Some features may fail.`, 0);
            }
        }
    } catch (e) { /* ignore permission check errors */ }

    for (let step = 1; step <= MAX_STEPS; step++) {
        if (ag.agentShouldStop) { _agAppendLog(ag.logEl, "info", "Agent stopped by user.", step); break; }
        ag.iterLabel.textContent = `Step ${step} / ${MAX_STEPS}`;
        _agAppendLog(ag.logEl, "info", "Calling LLM…", step);
        let raw;
        try { raw = await invoke("agent_step", { task, history }); }
        catch (e) { _agAppendLog(ag.logEl, "error", `LLM call failed: ${e}`, step); break; }
        if (ag.agentShouldStop) break;
        const parsed = _agParseStep(raw);
        _agAppendLog(ag.logEl, "thought", parsed.thought || "(no thought)", step);
        if (parsed.action === "done")  { _agAppendLog(ag.logEl, "done",  parsed.summary || "Task complete.", step); break; }
        if (parsed.action === "error") { _agAppendLog(ag.logEl, "error", parsed.summary || "Agent reported an error.", step); break; }
        if (parsed.action === "computer" || parsed.action === "browser") {
            await _agHandleToolStep(parsed, step, ag, history); continue;
        }
        if (!parsed.code) { _agAppendLog(ag.logEl, "error", "Agent returned no code and action is not done.", step); break; }
        if (ag.agentShouldStop) break;
        await _agHandleCodeStep(parsed, step, ag, history);
    }

    _agSetRunning(false, ag);
    addNotification("Agent Complete", "Agent loop finished all execution steps.", "success");
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function _agWireAllEvents(ag) {
    ag.runBtn.onclick = () => {
        const task = ag.taskInput.value.trim();
        if (!task) { ag.taskInput.focus(); return; }
        _agRunLoop(task, ag);
    };
    ag.taskInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey && !ag.agentRunning) { e.preventDefault(); ag.runBtn.click(); }
    });
    ag.stopBtn.onclick = () => { ag.agentShouldStop = true; };
    ag.sendCanvasBtn.onclick = () => {
        if (!ag.lastCode) return;
        window.neurodeckCanvas.loadCode(ag.lastLang, ag.lastCode);
        document.querySelector('[data-view="canvas"]')?.click();
    };
    ag.modeBtns.forEach(btn => btn.addEventListener("click", () => _agSyncModeUI(btn.dataset.mode, ag)));
    ag.rtStartBtn.addEventListener("click", () => { if (!ag.rtRunning) _agStartRoundtable(ag); });
    ag.rtStopBtn.addEventListener("click", () => {
        invoke("cancel_generation").catch(() => {});
        _agCleanupRtListeners(ag);
        _agSetRtRunning(false, ag);
        _agAppendLog(ag.logEl, "info", "Roundtable stopped by user.");
    });
    ag.orchestratorStartBtn.addEventListener("click",  () => { if (!ag.orchestratorRunning) _agStartOrchestration(ag); });
    ag.orchestratorStatusBtn.addEventListener("click", () => { _agRefreshOrchestratorStatus(ag).catch(() => {}); });
    ag.orchestratorStopBtn.addEventListener("click",   () => { _agStopOrchestration(ag).catch(() => {}); });
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function initAgentView() {
    const taskInput = document.getElementById("agent-task-input");
    const runBtn = document.getElementById("agent-run-btn");
    const stopBtn = document.getElementById("agent-stop-btn");
    const iterLabel = document.getElementById("agent-iter-label");
    const logEl = document.getElementById("agent-log");
    const codePre = document.getElementById("agent-code-content");
    const outputEl = document.getElementById("agent-output");
    const sendCanvasBtn = document.getElementById("agent-send-canvas-btn");
    const orchestratorGoalInput = document.getElementById("orchestrator-goal-input");
    const orchestratorStartBtn = document.getElementById("orchestrator-start-btn");
    const orchestratorStatusBtn = document.getElementById("orchestrator-status-btn");
    const orchestratorStopBtn = document.getElementById("orchestrator-stop-btn");
    const orchestratorToolbar = document.getElementById("agent-toolbar-orchestrate");
    const codePaneTitle = document.getElementById("agent-code-pane-title");
    const outputTitle = document.getElementById("agent-output-title");
    const orchestratorPanel = document.getElementById("agent-orchestrator-panel");
    const orchestratorTaskList = document.getElementById("orchestrator-task-list");
    const modeBtns = document.querySelectorAll(".agent-mode-btn");
    const toolbarTask = document.getElementById("agent-toolbar-task");
    const toolbarRt = document.getElementById("agent-toolbar-roundtable");
    const rtPersonaA = document.getElementById("rt-persona-a");
    const rtPersonaB = document.getElementById("rt-persona-b");
    const rtTopicInput = document.getElementById("rt-topic-input");
    const rtRounds = document.getElementById("rt-rounds");
    const rtStartBtn = document.getElementById("rt-start-btn");
    const rtStopBtn = document.getElementById("rt-stop-btn");

    if (!taskInput || !runBtn || !sendCanvasBtn || !rtStartBtn || !toolbarTask || !toolbarRt ||
        !rtPersonaA || !rtPersonaB || !orchestratorGoalInput || !orchestratorStartBtn ||
        !orchestratorStatusBtn || !orchestratorStopBtn) return;

    const ag = {
        taskInput, runBtn, stopBtn, iterLabel, logEl, codePre, outputEl, sendCanvasBtn,
        orchestratorGoalInput, orchestratorStartBtn, orchestratorStatusBtn, orchestratorStopBtn,
        orchestratorToolbar, codePaneTitle, outputTitle, orchestratorPanel, orchestratorTaskList,
        toolbarTask, toolbarRt, modeBtns, rtPersonaA, rtPersonaB, rtTopicInput, rtRounds, rtStartBtn, rtStopBtn,
        agentRunning: false, agentShouldStop: false, orchestratorRunning: false, orchestratorPollTimer: null,
        currentMode: "task", lastCode: "", lastLang: "python", lastOrchestratorGoal: "", rtRunning: false,
        rtUnlistenChunk: null, rtUnlistenDone: null,
        orchUnlistenPlan: null, orchUnlistenTaskStart: null, orchUnlistenTaskDone: null, orchUnlistenComplete: null,
    };
    _agWireAllEvents(ag);
    _agSyncModeUI("task", ag);
}
