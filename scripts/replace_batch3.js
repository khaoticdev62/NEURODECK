const fs = require('fs');
let src = fs.readFileSync('frontend/src/main.js', 'utf8');

// ── 1. Extract _applyInitialState from the .then() handler ──────────────────
// Find the get_initial_state invoke and replace its .then(async (initialState) => {...})
// with a named function
{
  const lines = src.split('\n');
  const invokeIdx = lines.findIndex(l => l.trim() === 'invoke("get_initial_state")');
  if (invokeIdx < 0) { console.error('get_initial_state invoke not found'); process.exit(1); }

  // Find the .then(async (initialState) => { start
  const thenIdx = lines.findIndex((l, i) => i >= invokeIdx && l.includes('.then(async (initialState) =>'));
  if (thenIdx < 0) { console.error('.then(async (initialState) not found'); process.exit(1); }

  // Find the end of this .then block — depth counting from the opening brace
  let depth = 0, endIdx = -1;
  let started = false;
  for (let i = thenIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') depth--;
    }
    if (started && depth === 0) { endIdx = i; break; }
  }
  // endIdx is the line with `)` closing the .then(
  console.log('get_initial_state .then: lines', thenIdx+1, '-', endIdx+1);

  // Extract the body (lines between { and the closing })
  // Line thenIdx: `  .then(async (initialState) => {`
  // Lines thenIdx+1 to endIdx-1: the body
  // Line endIdx: `  })`
  const bodyLines = lines.slice(thenIdx + 1, endIdx);

  const namedFn = `async function _applyInitialState(initialState) {
${bodyLines.join('\n')}
}`;

  const newThen = `  .then(_applyInitialState)`;

  // Build replacement: insert named fn before the invoke line, replace .then line through endIdx
  const before = lines.slice(0, invokeIdx);
  const invokeCallLines = [lines[invokeIdx]]; // the invoke("get_initial_state") line
  const after = lines.slice(endIdx + 1);

  src = [...before, namedFn, '', ...invokeCallLines, newThen, ...after].join('\n');
  console.log('_applyInitialState extracted');
}

// ── 2. Extract initGameContextPanel helpers ──────────────────────────────────
function replaceFunction(src, fnName, newCode) {
  const lines = src.split('\n');
  const startIdx = lines.findIndex(l => l.startsWith('function ' + fnName + '(') || l.startsWith('async function ' + fnName + '('));
  if (startIdx < 0) { console.error('NOT FOUND: ' + fnName); return src; }
  let depth = 0, endIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') depth++; if (ch === '}') depth--; }
    if (depth === 0 && i > startIdx) { endIdx = i; break; }
  }
  console.log(fnName + ': lines ' + (startIdx+1) + '-' + (endIdx+1));
  return [...lines.slice(0, startIdx), newCode, ...lines.slice(endIdx + 1)].join('\n');
}

src = replaceFunction(src, 'initGameContextPanel', `function _gcApplyHeaderState(headerImg, fallbackEl, fallbackNameEl, appId, name) {
  if (!headerImg || !fallbackEl) return;
  const fallbackName = name || "No Active Game";
  if (fallbackNameEl) fallbackNameEl.innerText = fallbackName;
  if (!appId || appId === "-") {
    headerImg.removeAttribute("src");
    headerImg.style.display = "none";
    fallbackEl.classList.add("active");
    return;
  }
  fallbackEl.classList.remove("active");
  headerImg.style.display = "block";
  headerImg.src = \`https://cdn.cloudflare.steamstatic.com/steam/apps/\${appId}/header.jpg\`;
}

function _gcHandleBadgeClick(gameBadge, gameModal, headerImg, fallbackEl, fallbackNameEl, gcCtx) {
  if (!gameBadge || !gameModal) return;
  gameBadge.onclick = () => {
    invoke("get_game_context")
      .then((ctx) => {
        const nameEl = document.getElementById("game-context-name");
        const appidEl = document.getElementById("game-context-appid");
        const statusEl = document.getElementById("game-context-status");
        const notesEl = document.getElementById("game-context-notes");
        const promptView = document.getElementById("game-context-prompt-view");
        const sessionNotesEl = document.getElementById("game-session-notes");

        const name = ctx.name || "None Detected";
        const appId = ctx.app_id || "-";
        const isRunning = ctx.is_running === "true";
        const notes = ctx.notes || "No optimization profile found.";

        if (nameEl) nameEl.innerText = name;
        if (appidEl) appidEl.innerText = appId;
        if (statusEl) {
          statusEl.innerText = isRunning ? "Running" : "Offline";
          statusEl.style.color = isRunning ? "var(--response-color)" : "rgba(255,255,255,0.4)";
        }
        if (notesEl) notesEl.innerText = notes;
        _gcApplyHeaderState(headerImg, fallbackEl, fallbackNameEl, appId, name);
        if (promptView) {
          promptView.value = \`[Active SteamOS Game Context]\\nThe user is currently playing the game: \${name} (Steam AppID: \${appId}).\\nSteam Deck Optimization Notes: \${notes}\\nPlease adapt your answers to help the user with this game if applicable, keeping their hardware context in mind.\`;
        }
        if (sessionNotesEl && appId !== "-") {
          invoke("get_game_notes", { appId })
            .then((savedNotes) => { sessionNotesEl.value = savedNotes || ""; sessionNotesEl.dataset.appId = appId; })
            .catch(() => { sessionNotesEl.value = ""; sessionNotesEl.dataset.appId = appId; });
        }
        gameModal.classList.add("active");
        if (!gcCtx.trap) gcCtx.trap = new FocusTrap(gameModal);
        gcCtx.trap.activate();
      })
      .catch((err) => { console.error("Error loading game context panel:", err); });
  };
}

function initGameContextPanel() {
  const gameBadge = document.getElementById("game-badge");
  const gameModal = document.getElementById("game-context-modal");
  const closeX = document.getElementById("close-game-context-x");
  const closeBtn = document.getElementById("close-game-context");
  const headerImg = document.getElementById("game-context-header");
  const fallbackEl = document.getElementById("game-context-fallback");
  const fallbackNameEl = document.getElementById("game-context-fallback-name");
  const gcCtx = { trap: null };

  const dismiss = () => { if (gameModal) { gameModal.classList.remove("active"); if (gcCtx.trap) gcCtx.trap.deactivate(); } };

  if (headerImg && fallbackEl) {
    headerImg.addEventListener("load", () => { fallbackEl.classList.remove("active"); headerImg.style.display = "block"; });
    headerImg.addEventListener("error", () => { headerImg.style.display = "none"; fallbackEl.classList.add("active"); });
  }

  _gcHandleBadgeClick(gameBadge, gameModal, headerImg, fallbackEl, fallbackNameEl, gcCtx);

  const sessionNotesEl = document.getElementById("game-session-notes");
  const saveIndicator = document.getElementById("game-notes-save-indicator");
  if (sessionNotesEl) {
    sessionNotesEl.addEventListener("blur", () => {
      const appId = sessionNotesEl.dataset.appId;
      if (!appId || appId === "-") return;
      invoke("save_game_note", { appId, content: sessionNotesEl.value })
        .then(() => { if (saveIndicator) { saveIndicator.style.opacity = "1"; setTimeout(() => { saveIndicator.style.opacity = "0"; }, 1500); } })
        .catch((err) => { console.error("Failed to save game note:", err); });
    });
  }

  if (closeX) closeX.onclick = dismiss;
  if (closeBtn) closeBtn.onclick = dismiss;
  if (gameModal) gameModal.addEventListener("click", (e) => { if (e.target === gameModal) dismiss(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && gameModal?.classList.contains("active")) dismiss(); });
}`);

// ── 3. Extract navTabs tab.onclick to a named function ──────────────────────
// Find `navTabs.forEach((tab) => {` and extract the tab.onclick body
{
  const lines = src.split('\n');
  const forEachIdx = lines.findIndex(l => l.trim() === 'navTabs.forEach((tab) => {');
  if (forEachIdx < 0) { console.error('navTabs.forEach not found'); process.exit(1); }

  // Find the onclick function start: `  tab.onclick = function () {`
  const onclickIdx = lines.findIndex((l, i) => i > forEachIdx && l.includes('tab.onclick = function ()'));
  if (onclickIdx < 0) { console.error('tab.onclick not found'); process.exit(1); }

  // Find end of the onclick function
  let depth = 0, onclickEnd = -1, started = false;
  for (let i = onclickIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') depth--;
    }
    if (started && depth === 0) { onclickEnd = i; break; }
  }
  console.log('navTabs.forEach tab.onclick: lines', onclickIdx+1, '-', onclickEnd+1);

  // Extract body (lines between the opening { and closing })
  const bodyLines = lines.slice(onclickIdx + 1, onclickEnd);

  // Find the end of the navTabs.forEach block (2 lines after onclickEnd: `  };` and `});`)
  const forEachEnd = onclickEnd + 2;

  const namedFn = `function _navTabClick(tab, navTabs) {
${bodyLines.join('\n')}
}`;

  const newForEach = `navTabs.forEach((tab) => {
  tab.onclick = function () { _navTabClick(tab, navTabs); };
});`;

  const before = lines.slice(0, forEachIdx);
  const after = lines.slice(forEachEnd + 1);

  src = [...before, namedFn, '', newForEach, ...after].join('\n');
  console.log('_navTabClick extracted');
}

// ── 4. Extract runBootSequence inner functions to module level ───────────────
{
  const lines = src.split('\n');
  const iifeIdx = lines.findIndex(l => l.includes('(async function runBootSequence()'));
  if (iifeIdx < 0) { console.error('runBootSequence IIFE not found'); process.exit(1); }

  // Find end of IIFE
  let depth = 0, iifeEnd = -1, started = false;
  for (let i = iifeIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') depth--;
    }
    if (started && depth === 0) { iifeEnd = i; break; }
  }
  console.log('runBootSequence IIFE: lines', iifeIdx+1, '-', iifeEnd+1);

  const bootHelpers = `function _bootEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _bootToken(value, cls = "boot-val") {
  return \`<span class="\${cls}">\${_bootEscapeHtml(value)}</span>\`;
}

function _bootStatusToken(label, tone = "boot-ok") {
  return \`<span class="\${tone}">\${_bootEscapeHtml(label)}</span>\`;
}

function _bootNextAddr(bCtx) {
  return \`[0x\${(bCtx.addrIndex++).toString(16).padStart(4, "0")}]\`;
}

function _bootSetProgress(progressFill, progressPct, progressLabel, pct, label) {
  const clamped = Math.min(pct, 100);
  if (progressFill) progressFill.style.width = \`\${clamped}%\`;
  if (progressPct) progressPct.textContent = \`\${Math.round(clamped)}%\`;
  if (label && progressLabel) progressLabel.textContent = label.toUpperCase().slice(0, 48);
}

function _bootAddLine(logScroll, addr, html, extraClass) {
  const line = document.createElement("div");
  line.className = \`boot-log-line\${extraClass ? \` \${extraClass}\` : ""}\`;
  line.innerHTML = \`<span class="boot-addr">\${addr}</span>  \${html}\`;
  logScroll.appendChild(line);
  logScroll.scrollTop = logScroll.scrollHeight;
}

function _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, labelText) {
  bCtx.step += 1;
  const pct = Math.min((bCtx.step / Math.max(totalSteps, 1)) * 100, 97);
  _bootSetProgress(progressFill, progressPct, progressLabel, pct, labelText);
}

async function _bootRenderPipeline(bCtx, logScroll, progressFill, progressPct, progressLabel, pipeline, totalSteps, delay) {
  const toneMap = { ok: "boot-ok", warn: "boot-warn", err: "boot-err", info: "boot-info", neutral: "boot-neutral" };
  for (const entry of pipeline) {
    const tone = toneMap[entry.status] || "boot-ok";
    let html;
    if (entry.category === "plugin") {
      const detail = entry.detail ? \` <span style="opacity:0.42">// \${_bootEscapeHtml(entry.detail)}</span>\` : "";
      html = \`\${_bootEscapeHtml(entry.label)}\${detail}\`;
    } else {
      const detail = entry.detail ? \` · \${_bootEscapeHtml(entry.detail)}\` : "";
      html = \`\${_bootEscapeHtml(entry.label)}\${detail}\`;
    }
    _bootAddLine(logScroll, _bootNextAddr(bCtx), html);
    _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, entry.label);
    await delay(entry.category === "plugin" ? 110 : 140);
  }
}

async function _bootLlmHandshake(bCtx, logScroll, progressFill, progressPct, progressLabel, diag, totalSteps, delay) {
  const provider = diag?.provider ?? "ollama";
  const model = diag?.model ?? "llama2";
  _bootAddLine(logScroll, _bootNextAddr(bCtx), \`Running provider handshake against \${_bootToken(provider.toUpperCase())}…\`);
  _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, "Provider handshake");
  await delay(120);
  const llmResult = await invoke("test_llm_connection", { provider, model, url: diag?.ollama_base_url ?? "http://localhost:11434", key: null })
    .then((message) => ({ ok: true, message }))
    .catch((error) => ({ ok: false, message: String(error) }));
  const llmTone = llmResult.ok ? "boot-ok" : "boot-warn";
  const llmLabel = llmResult.ok ? "CONNECTED" : "DEGRADED";
  _bootAddLine(logScroll, _bootNextAddr(bCtx), \`LLM session \${_bootStatusToken(llmLabel, llmTone)} · \${_bootToken(model)} <span style="opacity:0.52">\${_bootEscapeHtml(llmResult.message)}</span>\`);
  _bootAdvanceProgress(bCtx, progressFill, progressPct, progressLabel, totalSteps, "LLM session");
  await delay(200);
  return llmResult;
}`;

  const newIife = `(async function runBootSequence() {
  const overlay = document.getElementById("boot-overlay");
  const logScroll = document.getElementById("boot-log-scroll");
  const progressFill = document.getElementById("boot-progress-fill");
  const progressPct = document.getElementById("boot-progress-pct");
  const progressLabel = document.getElementById("boot-progress-label-text");

  if (!overlay || !logScroll) {
    document.dispatchEvent(new CustomEvent("neurodeck-boot-complete"));
    return;
  }

  try {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const bCtx = { step: 0, addrIndex: 1 };

    const diag = await invoke("get_boot_diagnostics").catch((e) => {
      console.error("[Boot] get_boot_diagnostics failed:", e);
      return null;
    });
    const pipeline = Array.isArray(diag?.pipeline) ? diag.pipeline : [];
    const totalSteps = Math.max(pipeline.length, 1) + 2;

    await _bootRenderPipeline(bCtx, logScroll, progressFill, progressPct, progressLabel, pipeline, totalSteps, delay);
    const llmResult = await _bootLlmHandshake(bCtx, logScroll, progressFill, progressPct, progressLabel, diag, totalSteps, delay);

    const memoryReady = diag?.memory_ready ?? false;
    const finalTone = llmResult.ok && memoryReady ? "boot-ok" : "boot-warn";
    _bootAddLine(logScroll, _bootNextAddr(bCtx), \`<strong class="\${finalTone}" style="letter-spacing:0.06em">NEURODECK ONLINE · STARTUP DIAGNOSTICS COMPLETE</strong>\`, "boot-final");
    _bootSetProgress(progressFill, progressPct, progressLabel, 100, "NEURODECK ONLINE");
    await delay(1100);

    overlay.classList.add("fade-out");
    await delay(680);
  } catch (err) {
    console.error("[Boot] Sequence error:", err);
  } finally {
    if (overlay && overlay.parentNode) overlay.remove();
    document.dispatchEvent(new CustomEvent("neurodeck-boot-complete"));
  }
})();`;

  const before = lines.slice(0, iifeIdx);
  const after = lines.slice(iifeEnd + 1);

  src = [...before, bootHelpers, '', newIife, ...after].join('\n');
  console.log('runBootSequence extracted');
}

fs.writeFileSync('frontend/src/main.js', src);
console.log('Done. Total lines:', src.split('\n').length);
