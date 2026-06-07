const fs = require('fs');

// ──────────────────────────────────────────────────────────────────────────────
// main.js — split _gpHandleFaceButtons into per-button helpers
// ──────────────────────────────────────────────────────────────────────────────
{
  let src = fs.readFileSync('frontend/src/main.js', 'utf8');

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

  src = replaceFunction(src, '_gpHandleFaceButtons', `function _gpFaceButtonA(gp) {
  if (!_gpButtonPressed(gp, 0)) return;
  triggerHaptic("medium");
  if (getCtrlPromptVisible()) {
    getCtrlPromptTemplateMode() ? confirmTemplateAndSend() : confirmCtrlPrompt();
  } else {
    const els = getGamepadFocusableElements();
    const activeEl = els[state.gamepadFocusIndex];
    if (activeEl) { activeEl.click(); if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") activeEl.focus(); }
    else { updateGamepadFocus(0); }
  }
}

function _gpFaceButtonB(gp) {
  if (!_gpButtonPressed(gp, 1)) return;
  triggerHaptic("medium");
  if (getCtrlPromptVisible()) { getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay(); }
  else { closeTopmostOverlay(); }
}

function _gpFaceButtonX(gp) {
  if (!_gpButtonPressed(gp, 2) || getCtrlPromptVisible()) return;
  const focused = document.querySelector(".gamepad-focused");
  if (focused && focused.classList.contains("message")) {
    triggerHaptic("doubleTick");
    const text = getMessageText(focused);
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {});
      focused.style.transition = "background 0.2s";
      const oldBg = focused.style.background;
      focused.style.background = "rgba(94, 235, 255, 0.15)";
      setTimeout(() => { focused.style.background = oldBg; }, 400);
    }
  } else {
    triggerHaptic("light");
    const chatTab = document.querySelector('.nav-tab[data-view="chat"]');
    if (chatTab) chatTab.click();
    setTimeout(() => {
      const userInput = document.getElementById("user-input");
      if (userInput) {
        userInput.focus();
        const els = getGamepadFocusableElements();
        const uidx = els.indexOf(userInput);
        if (uidx !== -1) updateGamepadFocus(uidx);
      }
    }, 50);
  }
}

function _gpFaceButtonY(gp) {
  if (!_gpButtonPressed(gp, 3) || getCtrlPromptVisible()) return;
  triggerHaptic("medium");
  const chatView = document.getElementById("view-chat");
  if (chatView && chatView.classList.contains("active")) {
    const msgs = getMessageElements();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].classList.contains("user")) {
        const text = getMessageText(msgs[i]);
        if (text) {
          const input = document.getElementById("user-input");
          if (input) {
            input.value = text; input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 300) + "px"; input.focus();
          }
          setTimeout(() => { const s = document.getElementById("send-btn"); if (s) s.click(); }, 300);
        }
        break;
      }
    }
  } else if (state.availablePersonas && state.availablePersonas.length > 0) {
    const nextPersona = state.availablePersonas[(state.availablePersonas.indexOf(state.activePersona) + 1) % state.availablePersonas.length];
    invoke("set_persona", { name: nextPersona })
      .then(() => { state.activePersona = nextPersona; const sel = document.getElementById("persona-select"); if (sel) sel.value = nextPersona; })
      .catch((err) => console.error("Error setting persona via Gamepad:", err));
  }
}

function _gpHandleFaceButtons(gp) {
  _gpFaceButtonA(gp);
  _gpFaceButtonB(gp);
  _gpFaceButtonX(gp);
  _gpFaceButtonY(gp);
}`);

  fs.writeFileSync('frontend/src/main.js', src);
  console.log('main.js done. Lines:', src.split('\n').length);
}

// ──────────────────────────────────────────────────────────────────────────────
// settings.js — split _refreshThemeCards
// ──────────────────────────────────────────────────────────────────────────────
{
  let src = fs.readFileSync('frontend/src/settings.js', 'utf8');

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

  src = replaceFunction(src, '_refreshThemeCards', `function _themeApplyPreview(tc) {
  const el = document.getElementById("theme-preview-overlay");
  if (!el) return;
  el.style.setProperty("--preview-bg", tc.Background || tc.background || "#050505");
  el.style.setProperty("--preview-fg", tc.Foreground || tc.foreground || "#D9F7FF");
  el.style.setProperty("--preview-accent", tc.Accent || tc.accent || "#00F0FF");
  el.style.setProperty("--preview-response", tc.Response || tc.response || "#00FF88");
  el.style.setProperty("--preview-warning", tc.Warning || tc.warning || "#FFB000");
  el.style.setProperty("--preview-error", tc.Error || tc.error || "#FF3C5A");
}

function _themeWireCardHover(card, cardData, allCards, tCtx) {
  card.addEventListener("mouseenter", () => _themeApplyPreview(cardData.tc));
  card.addEventListener("mouseleave", () => {
    const selected = allCards.find(c => c.name === tCtx.hoveredTheme);
    if (selected) _themeApplyPreview(selected.tc);
  });
  card.addEventListener("click", () => {
    document.querySelectorAll(".onboarding-theme-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    tCtx.hoveredTheme = card.dataset.name;
    _themeApplyPreview(cardData.tc);
  });
}

function _themeWireApplyBtn(applyBtn, customThemes, tCtx) {
  if (!applyBtn) return;
  applyBtn.onclick = () => {
    const selectedTheme = tCtx.hoveredTheme;
    const custom = customThemes.find(t => t.name === selectedTheme);
    if (custom) {
      _ctApplyThemeObj(custom);
      localStorage.setItem("selectedTheme", selectedTheme);
    } else {
      invoke("set_theme", { name: selectedTheme }).then(theme => {
        if (theme) { window.applyThemeColors(theme); localStorage.setItem("selectedTheme", selectedTheme); _refreshThemeCards(); }
      });
    }
    if (typeof addNotification === "function") addNotification("Theme Applied", \`"\${selectedTheme}" is now active.\`, "success");
  };
}

function _themeWireResetBtn(resetBtn, cards, allCards, savedTheme, tCtx) {
  if (!resetBtn) return;
  resetBtn.onclick = () => {
    tCtx.hoveredTheme = savedTheme;
    cards.forEach(c => c.classList.toggle("active", c.dataset.name === savedTheme));
    const originalCard = allCards.find(c => c.name === savedTheme);
    if (originalCard) _themeApplyPreview(originalCard.tc);
  };
}

async function _refreshThemeCards() {
  const grid = document.getElementById("theme-cards-grid");
  if (!grid) return;

  let presetNames = [];
  try { presetNames = await invoke("get_themes"); } catch (_) {}

  if (!_stSettingsThemeCache) {
    _stSettingsThemeCache = {};
    for (const tname of presetNames) {
      try { const colors = await invoke("set_theme", { name: tname }); if (colors) _stSettingsThemeCache[tname] = colors; } catch (_) {}
    }
  }

  const savedTheme = localStorage.getItem("selectedTheme") || "BLACKSITE";
  const customThemes = _ctLoadThemes();
  const allCards = [];
  presetNames.forEach(tname => {
    const tc = _stSettingsThemeCache[tname] || {};
    allCards.push({ name: tname, bg: tc.Background, fg: tc.Foreground, accent: tc.Accent, tc });
  });
  customThemes.forEach(t => {
    allCards.push({ name: t.name, bg: t.background, fg: t.foreground, accent: t.accent, tc: { Background: t.background, Foreground: t.foreground, Accent: t.accent, Response: t.response, Warning: t.warning, Error: t.error } });
  });

  grid.innerHTML = allCards.map(c => \`
    <div class="onboarding-theme-card \${c.name === savedTheme ? "active" : ""}" data-name="\${c.name}" role="button" tabindex="0">
      <div style="font-weight:bold;margin-bottom:4px;font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;">\${c.name}</div>
      <div class="onboarding-theme-swatch">
         <span style="background:\${c.accent||"#00f0ff"}"></span>
         <span style="background:\${c.bg||"#050505"}"></span>
         <span style="background:\${c.fg||"#d9f7ff"}"></span>
      </div>
    </div>
  \`).join("");

  const cards = Array.from(grid.querySelectorAll(".onboarding-theme-card"));
  const tCtx = { hoveredTheme: savedTheme };

  const currentCard = allCards.find(c => c.name === savedTheme);
  if (currentCard) _themeApplyPreview(currentCard.tc);

  cards.forEach(card => {
    const cardData = allCards.find(c => c.name === card.dataset.name);
    _themeWireCardHover(card, cardData, allCards, tCtx);
  });

  _themeWireApplyBtn(document.getElementById("theme-apply-btn"), customThemes, tCtx);
  _themeWireResetBtn(document.getElementById("theme-reset-btn"), cards, allCards, savedTheme, tCtx);
}`);

  fs.writeFileSync('frontend/src/settings.js', src);
  console.log('settings.js done. Lines:', src.split('\n').length);
}

// ──────────────────────────────────────────────────────────────────────────────
// chat.js — split stream_done handler and keydown handler
// ──────────────────────────────────────────────────────────────────────────────
{
  let src = fs.readFileSync('frontend/src/chat.js', 'utf8');
  const lines = src.split('\n');

  // Helper: find a line containing the exact string, starting from offset
  function findLine(lines, str, startFrom = 0) {
    for (let i = startFrom; i < lines.length; i++) {
      if (lines[i].includes(str)) return i;
    }
    return -1;
  }

  // Helper: find end of a function/block starting at startIdx (finds matching })
  function findBlockEnd(lines, startIdx) {
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) { if (ch === '{') { depth++; started = true; } if (ch === '}') depth--; }
      if (started && depth === 0) return i;
    }
    return -1;
  }

  // ── 1. stream_done handler ─────────────────────────────────────────────────
  const streamDoneIdx = findLine(lines, 'listen("stream_done", function ()');
  const streamDoneEnd = findBlockEnd(lines, streamDoneIdx);
  console.log('stream_done: lines', streamDoneIdx+1, '-', streamDoneEnd+1);

  const newStreamDone = `function _chatBuildRagSourceItem(src, idx) {
  const srcEl = document.createElement("div");
  srcEl.className = "rag-source-item";
  const srcHeader = document.createElement("div");
  srcHeader.className = "rag-source-header";
  srcHeader.innerHTML = \`<span class="rag-source-chip">[\${idx + 1}]</span> <span class="rag-source-title">\${window.sanitizeHtml(src.title || src.id)}</span> <span class="rag-source-role">\${window.sanitizeHtml(src.role)}</span>\`;
  const srcSnippet = document.createElement("div");
  srcSnippet.className = "rag-source-snippet";
  srcSnippet.innerText = src.content_snippet;
  srcEl.onclick = () => {
    const searchInput = document.getElementById("memory-search-input");
    if (searchInput) searchInput.value = src.id;
    const memoryTab = document.querySelector('[data-view="memory"]');
    if (memoryTab) memoryTab.click();
  };
  srcEl.appendChild(srcHeader);
  srcEl.appendChild(srcSnippet);
  return srcEl;
}

function _chatBuildRagSourcesUI(ragSources, msgCard) {
  if (!ragSources || ragSources.length === 0) return;
  const ragContainer = document.createElement("div");
  ragContainer.className = "rag-sources-container";
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "rag-sources-toggle";
  toggleBtn.innerHTML = \`<span class="rag-toggle-text">📚 Injected Context (\${ragSources.length})</span><span class="rag-toggle-icon">▼</span>\`;
  const listEl = document.createElement("div");
  listEl.className = "rag-sources-list";
  listEl.style.display = "none";
  toggleBtn.onclick = () => {
    const isHidden = listEl.style.display === "none";
    listEl.style.display = isHidden ? "block" : "none";
    toggleBtn.querySelector(".rag-toggle-icon").innerText = isHidden ? "▲" : "▼";
  };
  ragSources.forEach((src, idx) => listEl.appendChild(_chatBuildRagSourceItem(src, idx)));
  ragContainer.appendChild(toggleBtn);
  ragContainer.appendChild(listEl);
  msgCard.appendChild(ragContainer);
}

function _chatFinalizeStreamMessage(msgCard, capturedText, finalTokens, provider, timeStr, msgId) {
  const metaRow = document.createElement("div");
  metaRow.className = "msg-meta";
  const modelEl = document.createElement("span"); modelEl.className = "msg-meta-model"; modelEl.textContent = provider;
  const sepA = document.createElement("span"); sepA.className = "msg-meta-sep"; sepA.textContent = "·";
  const timeEl = document.createElement("span"); timeEl.textContent = timeStr;
  const sepB = document.createElement("span"); sepB.className = "msg-meta-sep"; sepB.textContent = "·";
  const tokenEl = document.createElement("span"); tokenEl.textContent = \`\${finalTokens} tokens\`;
  metaRow.append(modelEl, sepA, timeEl, sepB, tokenEl);
  msgCard.appendChild(metaRow);
  msgCard.appendChild(makeCopyBtn(() => capturedText));
  const reg = state.chatMessageRegistry.find(r => r.id === msgId);
  if (reg) msgCard.appendChild(makeActionMenuBtn(reg));
  _chatBuildRagSourcesUI(state.currentRagSources, msgCard);
  state.currentRagSources = null;
}

listen("stream_done", function () {
    triggerHaptic("success");
    document.getElementById("tool-status").innerText = "Idle";
    hideGenBar();
    if (state.currentAIMessage) {
        const msgCard = state.currentAIMessage.querySelector(".message-card");
        if (msgCard) {
            renderAiMessageText(state.currentAIMessage, state.currentAIText);
            const capturedText = state.currentAIText;
            const finalTokens = state.totalTokens;
            const provider = (state.activeProvider || "gemini").toUpperCase();
            const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const msgId = state.currentAIMessage.dataset.msgId;
            if (msgId) { const reg = state.chatMessageRegistry.find(r => r.id === msgId); if (reg) reg.text = capturedText; }
            _chatFinalizeStreamMessage(msgCard, capturedText, finalTokens, provider, timeStr, msgId);
        }
        if (typeof window.announceToScreenReader === 'function') {
            const preview = state.currentAIText.slice(0, 120).replace(/\\s+/g, ' ').trim();
            window.announceToScreenReader(\`Response received. \${preview}\${state.currentAIText.length > 120 ? '...' : ''}\`);
        }
    }
    const _ttsMode = localStorage.getItem("neurodeck_tts_mode") || "complete";
    if (!state.isMuted && _ttsMode === "complete" && state.currentAIText && state.currentAIText.trim().length > 0) {
        let speechText = cleanTextForSpeech(state.currentAIText);
        if (speechText.length > 0) invoke("speak_text", { text: speechText }).catch(err => console.error("TTS Error:", err));
    }
    state.currentAIMessage = null;
    state.currentAIText = "";
    invoke("remote_send_to_clients", { message: JSON.stringify({ type: "chat_token", text: "", done: true }) }).catch(() => {});
    refreshSessionsList();
    updateContextDrawer();
});`;

  const linesArr = src.split('\n');
  const sdLines = [...linesArr.slice(0, streamDoneIdx), newStreamDone, ...linesArr.slice(streamDoneEnd + 1)];
  src = sdLines.join('\n');

  // ── 2. keydown handler ─────────────────────────────────────────────────────
  const newLines = src.split('\n');
  const kdIdx = findLine(newLines, 'window.addEventListener("keydown", function(e)');
  const kdEnd = findBlockEnd(newLines, kdIdx);
  console.log('keydown: lines', kdIdx+1, '-', kdEnd+1);

  const newKeydown = `function _chatKeyCtrlAlt(e) {
    if (!e.ctrlKey || !e.altKey) return;
    if (e.key === "1") { e.preventDefault(); const sidebar = document.getElementById("sidebar"); if (sidebar) sidebar.classList.toggle("collapsed"); }
    if (e.key === "2") { e.preventDefault(); const inspectDrawer = document.getElementById("inspect-drawer"); if (inspectDrawer) inspectDrawer.classList.toggle("collapsed"); }
    if (e.key === "3") { e.preventDefault(); const clearBtn = document.getElementById("canvas-clear-btn"); if (clearBtn) clearBtn.click(); }
    if (e.key === "4") { e.preventDefault(); cycleTheme(); }
}

function _chatKeyCtrlSearch(e) {
    if (!e.ctrlKey || e.key !== "f") return;
    e.preventDefault();
    const chatView = document.getElementById("view-chat");
    if (chatView && chatView.classList.contains("active")) {
        if (state.chatSearch.open) { closeChatSearch(); } else { openChatSearch(); }
    }
}

function _chatKeyCtrlSaveLoad(e) {
    if (!e.ctrlKey) return;
    if (e.key === "s") {
        e.preventDefault();
        invoke("save_session").then((msg) => {
            appendChatMessage("system", \`System: \${String(msg)}\`);
            const stitleEl = document.getElementById("session-title");
            if (stitleEl) stitleEl.innerText = "Session: " + state.currentSessionId;
            refreshSessionsList();
        }).catch((err) => { appendChatMessage("system", \`System error saving session: \${String(err)}\`, { error: true }); });
    }
    if (e.key === "l") {
        e.preventDefault();
        invoke("load_latest_session").then((data) => { applyLoadedSessionData(data); })
          .catch((err) => { appendChatMessage("system", \`Error loading session: \${String(err)}\`, { error: true }); });
    }
}

function _chatKeyCtrlAction(e) {
    if (!e.ctrlKey && e.key !== "Escape") return;
    if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        if (state.pendingLuaScript) { runLuaScript(state.pendingLuaScript); }
        else { appendChatMessage("system", "System: No pending Lua script found in chat to execute.", { error: true }); }
    }
    if (e.ctrlKey && e.key === "r") { e.preventDefault(); const micBtn = document.getElementById("mic-btn"); if (micBtn) micBtn.click(); }
    if (e.ctrlKey && e.key === "m") { e.preventDefault(); toggleMute(); }
    if (e.ctrlKey && e.key === "n") { e.preventDefault(); startNewSession(); }
    if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        if (state.availablePersonas.length > 0) {
            let currentIndex = state.availablePersonas.indexOf(state.activePersona);
            let nextPersona = state.availablePersonas[(currentIndex + 1) % state.availablePersonas.length];
            invoke("set_persona", { name: nextPersona }).then((msg) => {
                state.activePersona = nextPersona;
                let select = document.getElementById("persona-select");
                if (select) select.value = nextPersona;
                appendChatMessage("system", \`System: Persona cycled to \${nextPersona}\`);
            }).catch((err) => { console.error("Error cycling persona:", err); });
        }
    }
    if (e.key === "Escape" && state.currentAIMessage !== null) {
        e.preventDefault();
        invoke("cancel_generation").catch((err) => { console.error("Error cancelling generation:", err); });
    }
}

window.addEventListener("keydown", function(e) {
    _chatKeyCtrlAlt(e);
    _chatKeyCtrlSearch(e);
    _chatKeyCtrlSaveLoad(e);
    _chatKeyCtrlAction(e);
});`;

  const kdLines2 = src.split('\n');
  src = [...kdLines2.slice(0, kdIdx), newKeydown, ...kdLines2.slice(kdEnd + 1)].join('\n');

  fs.writeFileSync('frontend/src/chat.js', src);
  console.log('chat.js done. Lines:', src.split('\n').length);
}

console.log('All done.');
