const fs = require('fs');
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

// ── getGamepadFocusableElements: extract selectors array + modal check ────────
src = replaceFunction(src, 'getGamepadFocusableElements', `const _GP_FOCUSABLE_SELECTORS = [
  "#sidebar:not(.collapsed) #sidebar-close-btn",
  "#sidebar:not(.collapsed) #new-chat-btn",
  "#sidebar:not(.collapsed) .history-item",
  "#sidebar-toggle-btn", ".nav-tab", "#mute-btn", "#notif-btn", "#settings-btn",
  "#view-chat.active #user-input", "#view-chat.active #mic-btn",
  "#view-chat.active #toggle-drawer-btn", "#view-chat.active #send-btn",
  "#view-chat.active .code-header-btn", "#view-chat.active .message",
  "#view-canvas.active #canvas-run-btn", "#view-canvas.active #canvas-clear-btn",
  "#view-canvas.active #canvas-copy-btn", "#view-canvas.active #canvas-lang-select",
  "#view-canvas.active #canvas-collab-btn",
  "#view-terminal.active #pty-reconnect-btn",
  "#view-tunnel.active #tunnel-check-btn", "#view-tunnel.active #tunnel-toggle-btn",
  "#view-tunnel.active #tunnel-cmd-input", "#view-tunnel.active #tunnel-cmd-send",
  "#view-tunnel.active #tunnel-filepath-input", "#view-tunnel.active #tunnel-filecontent-input",
  "#view-tunnel.active #tunnel-file-send", "#view-tunnel.active #tunnel-dirpath-input",
  "#view-tunnel.active #tunnel-dir-send",
  "#view-share.active .peer-item", "#view-share.active #share-dropzone",
  "#view-share.active #share-filepath-input", "#view-share.active #share-send-btn",
  "#view-memory.active #memory-search-input", "#view-memory.active #memory-refresh-btn",
  "#view-memory.active #memory-fact-input", "#view-memory.active #memory-fact-save-btn",
  "#view-agent.active #agent-task-input", "#view-agent.active #agent-run-btn",
  "#view-agent.active #agent-stop-btn", "#view-agent.active #agent-send-canvas-btn",
  "#view-docs.active #docs-search-input", "#view-docs.active #docs-search-btn",
  "#view-docs.active #docs-index-btn", "#view-docs.active #docs-clear-btn",
  "#view-docs.active .docs-remove-btn",
  "#inspect-drawer:not(.collapsed) #inspect-close-btn",
];

function _gpCheckModalFocusable() {
  const modals = ["notif-modal", "game-context-modal", "computer-use-modal", "transfer-modal"];
  for (const id of modals) {
    const els = getActiveModalFocusableElements(id);
    if (els) return els;
  }
  const settingsEls = getActiveModalFocusableElements("settings-overlay", "select, input, button");
  if (settingsEls) return settingsEls;
  return null;
}

function getGamepadFocusableElements() {
  if (getCtrlPromptVisible()) return [];
  const modalEls = _gpCheckModalFocusable();
  if (modalEls) return modalEls;
  const elements = [];
  _GP_FOCUSABLE_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && !el.disabled) elements.push(el);
    });
  });
  return elements;
}`);

// ── _gpHandleDpad: split into vertical + horizontal handlers ──────────────────
src = replaceFunction(src, '_gpHandleDpad', `function _gpDpadVertical(gp, goUp) {
  if (getCtrlPromptVisible()) {
    if (getCtrlPromptTemplateMode()) navigateTemplatePlaceholder(goUp ? -1 : 1);
    else navigateCtrlPromptList(goUp ? -1 : 1);
    return;
  }
  const shareView = document.getElementById("view-share");
  const sshView = document.getElementById("view-ssh");
  if (shareView && shareView.classList.contains("active")) {
    const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
    const idx = subtabs.findIndex((t) => t.classList.contains("active"));
    if (idx !== -1) subtabs[goUp ? (idx - 1 + subtabs.length) % subtabs.length : (idx + 1) % subtabs.length].click();
  } else if (sshView && sshView.classList.contains("active")) {
    const items = Array.from(document.querySelectorAll("#ssh-profiles-list .ssh-profile-item"));
    if (items.length > 0) {
      const selIdx = items.findIndex((el) => el.classList.contains("gamepad-focused"));
      const nextIdx = goUp ? Math.max(0, selIdx === -1 ? items.length - 1 : selIdx - 1) : Math.min(items.length - 1, selIdx === -1 ? 0 : selIdx + 1);
      items.forEach((el) => el.classList.remove("gamepad-focused"));
      items[nextIdx].classList.add("gamepad-focused");
      items[nextIdx].scrollIntoView({ block: "nearest" });
    } else {
      updateGamepadFocus(goUp ? state.gamepadFocusIndex - 1 : state.gamepadFocusIndex + 1);
    }
  } else {
    updateGamepadFocus(goUp ? state.gamepadFocusIndex - 1 : state.gamepadFocusIndex + 1);
  }
}

function _gpDpadHorizontal(gp, goLeft) {
  if (getCtrlPromptVisible()) {
    if (getCtrlPromptTemplateMode()) cycleTemplatePlaceholder(goLeft ? -1 : 1);
    else navigateCtrlPromptCat(goLeft ? -1 : 1);
    return;
  }
  const els = getGamepadFocusableElements();
  const activeEl = els[state.gamepadFocusIndex];
  const handled = activeEl && (() => {
    if (activeEl.tagName === "INPUT" && activeEl.type === "range") {
      const step = parseInt(activeEl.step, 10) || 5;
      activeEl.value = goLeft
        ? Math.max(parseInt(activeEl.min, 10) || 0, parseInt(activeEl.value, 10) - step)
        : Math.min(parseInt(activeEl.max, 10) || 100, parseInt(activeEl.value, 10) + step);
      activeEl.dispatchEvent(new Event("input", { bubbles: true })); return true;
    }
    if (activeEl.tagName === "SELECT") {
      const idx = goLeft ? Math.max(0, activeEl.selectedIndex - 1) : Math.min(activeEl.options.length - 1, activeEl.selectedIndex + 1);
      if (idx !== activeEl.selectedIndex) { activeEl.selectedIndex = idx; activeEl.dispatchEvent(new Event("change", { bubbles: true })); }
      return true;
    }
    return false;
  })();
  if (!handled) {
    const tabs = Array.from(document.querySelectorAll(".nav-tab"));
    const activeTabIdx = tabs.findIndex((t) => t.classList.contains("active"));
    if (activeTabIdx !== -1) {
      const nextIdx = goLeft ? (activeTabIdx - 1 + tabs.length) % tabs.length : (activeTabIdx + 1) % tabs.length;
      tabs[nextIdx].click(); state.gamepadFocusIndex = -1;
      document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused"));
    }
  }
}

function _gpHandleDpad(gp) {
  if (_gpButtonPressed(gp, 12) || _gpButtonPressed(gp, 13)) _gpDpadVertical(gp, _gpButtonPressed(gp, 12));
  if (_gpButtonPressed(gp, 14) || _gpButtonPressed(gp, 15)) _gpDpadHorizontal(gp, _gpButtonPressed(gp, 14));
}`);

// ── initCommandPalette: extract input + global keydown wiring ─────────────────
src = replaceFunction(src, 'initCommandPalette', `function _cpWireInputEl(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    commandPaletteState.query = input.value;
    commandPaletteState.activeIndex = 0;
    renderCommandPalette();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); moveCommandPaletteSelection(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveCommandPaletteSelection(-1); }
    else if (event.key === "Enter") { event.preventDefault(); runCommandPaletteActiveAction(); }
    else if (event.key === "Escape") { event.preventDefault(); closeCommandPalette(); }
  });
}

function _cpWireGlobalKeydown() {
  document.addEventListener("keydown", (event) => {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (isShortcut) {
      event.preventDefault();
      if (commandPaletteState.open) { closeCommandPalette(); }
      else { if (quickSwitcherState.open) closeQuickSwitcher(); openCommandPalette(); }
      return;
    }
    if (!commandPaletteState.open) return;
    if (event.key === "Escape") { event.preventDefault(); closeCommandPalette(); }
  }, true);
}

function initCommandPalette() {
  const overlay = document.getElementById("command-palette-overlay");
  const openBtn = document.getElementById("command-palette-btn");
  const closeBtn = document.getElementById("command-palette-close");
  const input = document.getElementById("command-palette-input");
  if (openBtn) openBtn.onclick = () => openCommandPalette();
  if (closeBtn) closeBtn.onclick = closeCommandPalette;
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCommandPalette(); });
  _cpWireInputEl(input);
  _cpWireGlobalKeydown();
}`);

fs.writeFileSync('frontend/src/main.js', src);
console.log('Done. Total lines:', src.split('\n').length);
