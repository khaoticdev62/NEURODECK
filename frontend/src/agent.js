import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { state } from './state.js';
import { createIcon } from './icons.js';
import { addNotification } from './notifications.js';

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

    if (!taskInput || !runBtn || !sendCanvasBtn) return;

    let agentRunning = false;
    let agentShouldStop = false;
    let orchestratorRunning = false;
    let orchestratorShouldStop = false;
    let orchestratorPollTimer = null;
    let currentMode = "task";
    let lastCode = "";
    let lastLang = "python";
    let lastOrchestratorGoal = "";

    function setRunning(on) {
        agentRunning = on;
        runBtn.classList.toggle("hidden", on);
        stopBtn.classList.toggle("hidden", !on);
        iterLabel.classList.toggle("hidden", !on);
        taskInput.disabled = on;
    }

    function setOrchestratorRunning(on) {
        orchestratorRunning = on;
        orchestratorStartBtn.classList.toggle("hidden", on);
        orchestratorStopBtn.classList.toggle("hidden", !on);
        orchestratorGoalInput.disabled = on;
    }

    function setMode(mode) {
        currentMode = mode;
        document.querySelectorAll(".agent-mode-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.mode === mode);
        });
        document.getElementById("agent-toolbar-task")?.classList.toggle("hidden", mode !== "task");
        document.getElementById("agent-toolbar-roundtable")?.classList.toggle("hidden", mode !== "roundtable");
        orchestratorToolbar?.classList.toggle("hidden", mode !== "orchestrate");
        sendCanvasBtn.classList.toggle("hidden", mode !== "task");
        if (codePaneTitle) {
            codePaneTitle.textContent = mode === "orchestrate" ? "Orchestration Plan" : "Current Code";
        }
        if (outputTitle) {
            outputTitle.textContent = mode === "orchestrate" ? "Orchestration Status" : "Output";
        }
        if (mode === "orchestrate") {
            refreshOrchestratorStatus().catch(() => {});
        } else if (codePre) {
            codePre.textContent = lastCode || "";
        }
    }

    function renderOrchestratorStatus(status = {}) {
        const running = Boolean(status.running);
        const goal = String(status.goal || lastOrchestratorGoal || "");
        const tasks = Array.isArray(status.tasks) ? status.tasks : [];

        if (orchestratorGoalInput && !orchestratorGoalInput.value.trim() && goal) {
            orchestratorGoalInput.value = goal;
        }

        if (codePre) {
            if (tasks.length || goal || running) {
                const snapshot = {
                    running,
                    goal: goal || "(no goal)",
                    tasks: tasks.map((task) => ({
                        id: task.id,
                        role: task.role,
                        status: task.status,
                        depends_on: task.depends_on,
                        result: task.result ? String(task.result).slice(0, 220) : null,
                        error: task.error || null,
                    })),
                };
                codePre.textContent = JSON.stringify(snapshot, null, 2);
            } else {
                codePre.textContent = "No orchestration plan yet.";
            }
        }

        if (outputEl) {
            if (running) {
                outputEl.textContent = `Orchestrator running: ${goal || "awaiting goal"}`;
            } else if (tasks.length) {
                outputEl.textContent = `Orchestrator idle. ${tasks.length} task(s) in the current plan.`;
            } else {
                outputEl.textContent = "No orchestration status yet.";
            }
        }
    }

    async function refreshOrchestratorStatus() {
        if (!orchestratorGoalInput) return;
        try {
            const status = await invoke("get_orchestration_status");
            if (status && typeof status === "object") {
                renderOrchestratorStatus(status);
                setOrchestratorRunning(Boolean(status.running));
                if (status.goal) {
                    lastOrchestratorGoal = status.goal;
                }
            }
        } catch (error) {
            if (currentMode === "orchestrate") {
                renderOrchestratorStatus({ running: false, goal: lastOrchestratorGoal, tasks: [] });
                appendLog("error", `Failed to load orchestrator status: ${error}`);
            }
        }
    }

    function appendLog(type, content, step) {
        const empty = logEl.querySelector(".agent-empty-state");
        if (empty) empty.remove();

        const entry = document.createElement("div");
        entry.className = `agent-log-entry agent-log-${type}`;

        const icons = { thought: "brain", code: "fileText", exec: "zap", output: "squareTerminal", done: "shieldCheck", error: "x", info: "bell" };
        const labels = { thought: "Thinking", code: "Code Written", exec: "Executing", output: "Output", done: "Done", error: "Error", info: "Info" };

        entry.innerHTML = `<span class="agent-log-icon">${createIcon(icons[type] || "fileText", { size: 16 })}</span>
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
        let text = raw.trim();
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) text = fence[1].trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch (_) {}
        }
        return { thought: raw, code: "", lang: "python", action: "error", summary: "Failed to parse agent response" };
    }

    async function runComputerTool(tool, args = {}) {
        const computer = window.neurodeckComputerUse;
        if (!computer) {
            throw new Error("Computer use tools are not initialized.");
        }

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
                const x = Number(args.x);
                const y = Number(args.y);
                if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("computer_mouse_move requires numeric args.x and args.y.");
                await computer.mouseMove(Math.round(x), Math.round(y));
                return `Mouse moved to ${Math.round(x)}, ${Math.round(y)}.`;
            }
            case "computer_mouse_click": {
                const button = String(args.button || "left");
                await computer.click(button);
                return `${button} mouse click sent.`;
            }
            case "computer_type": {
                const text = String(args.text || "");
                if (!text) throw new Error("computer_type requires args.text.");
                await computer.type(text);
                return `Typed ${text.length} character${text.length === 1 ? "" : "s"}.`;
            }
            case "computer_key": {
                const key = String(args.key || "");
                if (!key) throw new Error("computer_key requires args.key.");
                await computer.key(key);
                return `Key sent: ${key}.`;
            }
            default:
                throw new Error(`Unsupported computer tool: ${tool}`);
        }
    }

    async function runBrowserTool(tool, args = {}) {
        switch (tool) {
            case "browser_open_session": {
                const url = String(args.url || "");
                if (!url) throw new Error("browser_open_session requires args.url.");
                const sessionId = await invoke("browser_open_session", { url });
                return `Browser session opened: ${sessionId}`;
            }
            case "browser_navigate_session": {
                const sessionId = String(args.session_id || args.sessionId || "");
                const url = String(args.url || "");
                if (!sessionId || !url) throw new Error("browser_navigate_session requires args.session_id and args.url.");
                await invoke("browser_navigate_session", { sessionId, url });
                return `Navigated session ${sessionId} to ${url}.`;
            }
            case "browser_get_content": {
                const sessionId = String(args.session_id || args.sessionId || "");
                if (!sessionId) throw new Error("browser_get_content requires args.session_id.");
                const content = await invoke("browser_get_content", { sessionId });
                return typeof content === "string" ? content.slice(0, 6000) : String(content);
            }
            case "browser_click": {
                const sessionId = String(args.session_id || args.sessionId || "");
                const selector = String(args.selector || "");
                if (!sessionId || !selector) throw new Error("browser_click requires args.session_id and args.selector.");
                await invoke("browser_click", { sessionId, selector });
                return `Clicked ${selector} in session ${sessionId}.`;
            }
            case "browser_fill": {
                const sessionId = String(args.session_id || args.sessionId || "");
                const selector = String(args.selector || "");
                const value = String(args.value || "");
                if (!sessionId || !selector) throw new Error("browser_fill requires args.session_id and args.selector.");
                await invoke("browser_fill", { sessionId, selector, value });
                return `Filled ${selector} in session ${sessionId}.`;
            }
            case "browser_screenshot": {
                const sessionId = String(args.session_id || args.sessionId || "");
                if (!sessionId) throw new Error("browser_screenshot requires args.session_id.");
                const base64 = await invoke("browser_screenshot", { sessionId });
                return `Screenshot captured (base64 bytes: ${String(base64 || "").length}).`;
            }
            case "browser_evaluate_js": {
                const sessionId = String(args.session_id || args.sessionId || "");
                const script = String(args.script || "");
                if (!sessionId || !script) throw new Error("browser_evaluate_js requires args.session_id and args.script.");
                const result = await invoke("browser_evaluate_js", { sessionId, script });
                return typeof result === "string" ? result : JSON.stringify(result);
            }
            case "browser_close_session": {
                const sessionId = String(args.session_id || args.sessionId || "");
                if (!sessionId) throw new Error("browser_close_session requires args.session_id.");
                await invoke("browser_close_session", { sessionId });
                return `Closed browser session ${sessionId}.`;
            }
            default:
                throw new Error(`Unsupported browser tool: ${tool}`);
        }
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

            appendLog("info", "Calling LLM…", step);
            let raw;
            try {
                raw = await invoke("agent_step", { task, history });
            } catch (e) {
                appendLog("error", `LLM call failed: ${e}`, step);
                break;
            }

            if (agentShouldStop) break;

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

            if (parsed.action === "computer") {
                const tool = parsed.tool || parsed.computer_tool || "";
                appendLog("exec", `Requesting computer tool: ${tool}`, step);
                let toolOut;
                try {
                    toolOut = await runComputerTool(tool, parsed.args || {});
                } catch (e) {
                    toolOut = `[Computer Use Error] ${e}`;
                }
                outputEl.textContent = toolOut;
                appendLog(toolOut.startsWith("[Computer Use Error]") ? "error" : "output", toolOut, step);
                history.push({ role: "step", content: JSON.stringify(parsed) });
                history.push({ role: "output", content: toolOut });
                continue;
            }

            if (parsed.action === "browser") {
                const tool = parsed.tool || parsed.browser_tool || "";
                appendLog("exec", `Requesting browser tool: ${tool}`, step);
                let toolOut;
                try {
                    toolOut = await runBrowserTool(tool, parsed.args || {});
                } catch (e) {
                    toolOut = `[Browser Tool Error] ${e}`;
                }
                outputEl.textContent = toolOut;
                appendLog(toolOut.startsWith("[Browser Tool Error]") ? "error" : "output", toolOut, step);
                history.push({ role: "step", content: JSON.stringify(parsed) });
                history.push({ role: "output", content: toolOut });
                continue;
            }

            if (!parsed.code) {
                appendLog("error", "Agent returned no code and action is not done.", step);
                break;
            }

            lastCode = parsed.code;
            lastLang = parsed.lang || "python";
            codePre.textContent = parsed.code;
            appendLog("code", `[${(parsed.lang || "?").toUpperCase()}] ${parsed.summary || ""}`, step);

            if (agentShouldStop) break;

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

            history.push({ role: "step", content: JSON.stringify(parsed) });
            history.push({ role: "output", content: execOut });
        }

        setRunning(false);
        addNotification("Agent Complete", "Agent loop finished all execution steps.", "success");
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

    // === ROUNDTABLE / ORCHESTRATION MODE ===
    const modeBtns = document.querySelectorAll(".agent-mode-btn");
    const toolbarTask = document.getElementById("agent-toolbar-task");
    const toolbarRt = document.getElementById("agent-toolbar-roundtable");
    const rtPersonaA = document.getElementById("rt-persona-a");
    const rtPersonaB = document.getElementById("rt-persona-b");
    const rtTopicInput = document.getElementById("rt-topic-input");
    const rtRounds = document.getElementById("rt-rounds");
    const rtStartBtn = document.getElementById("rt-start-btn");
    const rtStopBtn = document.getElementById("rt-stop-btn");

    if (
        !rtStartBtn ||
        !toolbarTask ||
        !toolbarRt ||
        !rtPersonaA ||
        !rtPersonaB ||
        !orchestratorGoalInput ||
        !orchestratorStartBtn ||
        !orchestratorStatusBtn ||
        !orchestratorStopBtn
    ) {
        return;
    }

    let rtRunning = false;
    let rtUnlistenChunk = null;
    let rtUnlistenDone = null;
    let orchUnlistenPlan = null;
    let orchUnlistenTaskStart = null;
    let orchUnlistenTaskDone = null;
    let orchUnlistenComplete = null;

    function populateRtPersonas() {
        const personas = state.availablePersonas || [];
        [rtPersonaA, rtPersonaB].forEach((sel) => {
            const saved = sel.value;
            sel.innerHTML =
                '<option value="">Choose persona…</option>' +
                personas.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
            if (saved && personas.includes(saved)) sel.value = saved;
        });
    }

    function cleanupRtListeners() {
        if (rtUnlistenChunk) { rtUnlistenChunk(); rtUnlistenChunk = null; }
        if (rtUnlistenDone) { rtUnlistenDone(); rtUnlistenDone = null; }
    }

    function cleanupOrchestratorListeners() {
        if (orchUnlistenPlan) { orchUnlistenPlan(); orchUnlistenPlan = null; }
        if (orchUnlistenTaskStart) { orchUnlistenTaskStart(); orchUnlistenTaskStart = null; }
        if (orchUnlistenTaskDone) { orchUnlistenTaskDone(); orchUnlistenTaskDone = null; }
        if (orchUnlistenComplete) { orchUnlistenComplete(); orchUnlistenComplete = null; }
        if (orchestratorPollTimer) {
            clearInterval(orchestratorPollTimer);
            orchestratorPollTimer = null;
        }
    }

    function syncModeUI(mode) {
        setMode(mode);
        if (mode === "roundtable") {
            invoke("get_personas")
                .then((p) => {
                    state.availablePersonas = p;
                    populateRtPersonas();
                })
                .catch(() => populateRtPersonas());
        }
        if (mode === "orchestrate") {
            refreshOrchestratorStatus().catch(() => {});
        }
    }

    modeBtns.forEach((btn) => {
        btn.addEventListener("click", () => syncModeUI(btn.dataset.mode));
    });

    syncModeUI("task");

    function setRtRunning(on) {
        rtRunning = on;
        rtStartBtn.classList.toggle("hidden", on);
        rtStopBtn.classList.toggle("hidden", !on);
        rtPersonaA.disabled = on;
        rtPersonaB.disabled = on;
        rtTopicInput.disabled = on;
        rtRounds.disabled = on;
    }

    function appendRtEntry(speaker) {
        const empty = logEl.querySelector(".agent-empty-state");
        if (empty) empty.remove();
        const entry = document.createElement("div");
        entry.className = "agent-log-entry agent-log-info agent-log-rt-msg";
        entry.innerHTML = `<span class="agent-log-icon">${createIcon("messageSquare", { size: 16 })}</span>
            <div class="agent-log-body">
                <div class="agent-log-label">${escapeHtml(speaker)}</div>
                <div class="agent-log-text rt-msg-text"></div>
            </div>`;
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
        return entry.querySelector(".rt-msg-text");
    }

    function setOrchestratorLogText(text) {
        outputEl.textContent = text;
    }

    function renderOrchestratorStatus(status = {}) {
        const running = Boolean(status.running);
        const goal = String(status.goal || lastOrchestratorGoal || "");
        const tasks = Array.isArray(status.tasks) ? status.tasks : [];

        if (orchestratorGoalInput && !orchestratorGoalInput.value.trim() && goal) {
            orchestratorGoalInput.value = goal;
        }

        if (codePre) {
            if (tasks.length || goal || running) {
                codePre.textContent = JSON.stringify(
                    {
                        running,
                        goal: goal || "(no goal)",
                        tasks: tasks.map((task) => ({
                            id: task.id,
                            role: task.role,
                            status: task.status,
                            depends_on: task.depends_on,
                            result: task.result ? String(task.result).slice(0, 220) : null,
                            error: task.error || null,
                        })),
                    },
                    null,
                    2,
                );
            } else {
                codePre.textContent = "No orchestration plan yet.";
            }
        }

        if (running) {
            setOrchestratorLogText(`Orchestrator running: ${goal || "awaiting goal"}`);
        } else if (tasks.length) {
            setOrchestratorLogText(`Orchestrator idle. ${tasks.length} task(s) in the current plan.`);
        } else {
            setOrchestratorLogText("No orchestration status yet.");
        }
    }

    async function refreshOrchestratorStatus() {
        try {
            const status = await invoke("get_orchestration_status");
            if (status && typeof status === "object") {
                renderOrchestratorStatus(status);
                setOrchestratorRunning(Boolean(status.running));
                if (status.goal) {
                    lastOrchestratorGoal = status.goal;
                }
            }
        } catch (error) {
            if (currentMode === "orchestrate") {
                renderOrchestratorStatus({ running: false, goal: lastOrchestratorGoal, tasks: [] });
                appendLog("error", `Failed to load orchestrator status: ${error}`);
            }
        }
    }

    async function startOrchestration() {
        const goal = orchestratorGoalInput.value.trim();
        if (!goal) {
            orchestratorGoalInput.focus();
            return;
        }

        cleanupOrchestratorListeners();
        lastOrchestratorGoal = goal;
        setMode("orchestrate");
        setOrchestratorRunning(true);
        orchestratorShouldStop = false;
        logEl.innerHTML = "";
        appendLog("info", `Starting orchestration: ${goal}`);
        setOrchestratorLogText("Starting orchestration...");

        orchUnlistenPlan = await listen("orchestrator_plan_ready", (event) => {
            const plan = event.payload || {};
            renderOrchestratorStatus({ running: true, goal: plan.goal || goal, tasks: plan.tasks || [] });
            appendLog("info", `Plan ready with ${(plan.tasks || []).length} task(s).`);
        });

        orchUnlistenTaskStart = await listen("agent_task_started", (event) => {
            const payload = event.payload || {};
            appendLog("info", `${payload.role || "Agent"} started: ${payload.id || "task"}`);
            if (orchestratorGoalInput.value.trim()) {
                refreshOrchestratorStatus().catch(() => {});
            }
        });

        orchUnlistenTaskDone = await listen("agent_task_done", (event) => {
            const payload = event.payload || {};
            if (payload.error) {
                appendLog("error", `${payload.role || "Agent"} failed: ${payload.error}`);
            } else {
                const snippet = payload.result ? String(payload.result).slice(0, 180) : "done";
                appendLog("done", `${payload.role || "Agent"} completed: ${snippet}`);
            }
            refreshOrchestratorStatus().catch(() => {});
        });

        orchUnlistenComplete = await listen("orchestration_complete", (event) => {
            const payload = event.payload || {};
            cleanupOrchestratorListeners();
            setOrchestratorRunning(false);
            renderOrchestratorStatus({ running: false, goal: payload.goal || goal, tasks: [] });
            appendLog("done", payload.summary || "Orchestration complete.");
            addNotification("Orchestration Complete", payload.summary || "Multi-agent task finished.", "success");
        });

        try {
            await invoke("start_orchestrated_task", { goal });
            orchestratorPollTimer = window.setInterval(() => {
                if (currentMode === "orchestrate") {
                    refreshOrchestratorStatus().catch(() => {});
                }
            }, 1500);
            refreshOrchestratorStatus().catch(() => {});
        } catch (error) {
            cleanupOrchestratorListeners();
            setOrchestratorRunning(false);
            appendLog("error", `Orchestration failed to start: ${error}`);
            addNotification("Orchestration Error", String(error), "error");
        }
    }

    async function startRoundtable() {
        const pA = rtPersonaA.value.trim();
        const pB = rtPersonaB.value.trim();
        const topic = rtTopicInput.value.trim();
        const rounds = parseInt(rtRounds.value, 10) || 4;

        if (!pA || !pB) {
            addNotification("Roundtable", "Select both personas before starting.", "error");
            return;
        }
        if (!topic) {
            rtTopicInput.focus();
            return;
        }

        cleanupRtListeners();
        setRtRunning(true);
        logEl.innerHTML = "";

        const cmd = `/discuss ${pA} ${pB} ${topic} rounds:${rounds}`;

        let currentTextEl = null;
        let currentSpeaker = "Roundtable";
        let pendingChunks = "";

        rtUnlistenChunk = await listen("stream_chunk", (event) => {
            const chunk = String(event.payload);
            pendingChunks += chunk;

            const speakerPattern = /\*\*([^*]{1,40}):\*\*/g;
            let lastIdx = 0;
            let match;
            while ((match = speakerPattern.exec(pendingChunks)) !== null) {
                const before = pendingChunks.slice(lastIdx, match.index).trim();
                if (before && currentTextEl) {
                    currentTextEl.textContent += before;
                }
                currentSpeaker = match[1];
                currentTextEl = appendRtEntry(currentSpeaker);
                lastIdx = match.index + match[0].length;
            }

            const remaining = pendingChunks.slice(lastIdx);
            if (remaining) {
                if (!currentTextEl) {
                    currentTextEl = appendRtEntry(currentSpeaker);
                }
                currentTextEl.textContent += remaining;
                pendingChunks = "";
            } else {
                pendingChunks = "";
            }

            logEl.scrollTop = logEl.scrollHeight;
        });

        rtUnlistenDone = await listen("stream_done", () => {
            cleanupRtListeners();
            setRtRunning(false);
            addNotification("Roundtable", "Discussion complete.", "success");
        });

        invoke("send_command", { prompt: cmd }).catch((error) => {
            appendLog("error", `Roundtable failed: ${error}`);
            cleanupRtListeners();
            setRtRunning(false);
        });
    }

    async function stopOrchestration() {
        orchestratorShouldStop = true;
        try {
            await invoke("stop_orchestration");
        } catch (_) {}
        cleanupOrchestratorListeners();
        setOrchestratorRunning(false);
        renderOrchestratorStatus({ running: false, goal: lastOrchestratorGoal, tasks: [] });
        appendLog("info", "Orchestration stopped by user.");
    }

    rtStartBtn.addEventListener("click", () => {
        if (!rtRunning) startRoundtable();
    });

    rtStopBtn.addEventListener("click", () => {
        invoke("cancel_generation").catch(() => {});
        cleanupRtListeners();
        setRtRunning(false);
        appendLog("info", "Roundtable stopped by user.");
    });

    orchestratorStartBtn.addEventListener("click", () => {
        if (!orchestratorRunning) startOrchestration();
    });

    orchestratorStatusBtn.addEventListener("click", () => {
        refreshOrchestratorStatus().catch(() => {});
    });

    orchestratorStopBtn.addEventListener("click", () => {
        stopOrchestration().catch(() => {});
    });
}
