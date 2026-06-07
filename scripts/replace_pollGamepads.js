const fs = require('fs');
const src = fs.readFileSync('frontend/src/main.js', 'utf8');
const lines = src.split('\n');

// Find pollGamepads start and end
const startIdx = lines.findIndex(l => /^function pollGamepads\(\)/.test(l));
if (startIdx < 0) { console.error('pollGamepads not found'); process.exit(1); }

let depth = 0, endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (depth === 0 && i > startIdx) { endIdx = i; break; }
}
if (endIdx < 0) { console.error('end not found'); process.exit(1); }
console.log('pollGamepads:', startIdx+1, '-', endIdx+1);

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);

const replacement = `function _gpButtonPressed(gp, index) {
  return !!(gp.buttons[index] && gp.buttons[index].pressed && !state.previousGamepadState.buttons[index]);
}

function _gpHandleFaceButtons(gp) {
  // A — confirm / click focused element
  if (_gpButtonPressed(gp, 0)) {
    triggerHaptic("medium");
    if (getCtrlPromptVisible()) {
      getCtrlPromptTemplateMode() ? confirmTemplateAndSend() : confirmCtrlPrompt();
    } else {
      const els = getGamepadFocusableElements();
      const activeEl = els[state.gamepadFocusIndex];
      if (activeEl) {
        activeEl.click();
        if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") activeEl.focus();
      } else {
        updateGamepadFocus(0);
      }
    }
  }
  // B — close overlays / back
  if (_gpButtonPressed(gp, 1)) {
    triggerHaptic("medium");
    if (getCtrlPromptVisible()) {
      getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay();
    } else {
      closeTopmostOverlay();
    }
  }
  // X — copy focused message or jump to chat input
  if (_gpButtonPressed(gp, 2) && !getCtrlPromptVisible()) {
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
  // Y — regenerate last message or cycle persona
  if (_gpButtonPressed(gp, 3) && !getCtrlPromptVisible()) {
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
              input.value = text;
              input.style.height = "auto";
              input.style.height = Math.min(input.scrollHeight, 300) + "px";
              input.focus();
            }
            setTimeout(() => { const s = document.getElementById("send-btn"); if (s) s.click(); }, 300);
          }
          break;
        }
      }
    } else if (state.availablePersonas && state.availablePersonas.length > 0) {
      const nextPersona = state.availablePersonas[(state.availablePersonas.indexOf(state.activePersona) + 1) % state.availablePersonas.length];
      invoke("set_persona", { name: nextPersona })
        .then(() => {
          state.activePersona = nextPersona;
          const sel = document.getElementById("persona-select");
          if (sel) sel.value = nextPersona;
        })
        .catch((err) => console.error("Error setting persona via Gamepad:", err));
    }
  }
}

function _gpHandleShoulderButtons(gp) {
  // L2/R2 in share view — cycle inner tabs
  if (_gpButtonPressed(gp, 6) || _gpButtonPressed(gp, 7)) {
    const shareView = document.getElementById("view-share");
    if (shareView && shareView.classList.contains("active")) {
      const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
      const idx = subtabs.findIndex((t) => t.classList.contains("active"));
      if (idx !== -1) {
        subtabs[_gpButtonPressed(gp, 6) ? (idx - 1 + subtabs.length) % subtabs.length : (idx + 1) % subtabs.length].click();
        triggerHaptic("light");
      }
    }
  }
  // R2 outside share view — toggle ctrl-prompt
  if (_gpButtonPressed(gp, 7)) {
    const shareView = document.getElementById("view-share");
    if (!(shareView && shareView.classList.contains("active"))) {
      if (getCtrlPromptVisible()) {
        triggerHaptic("light");
        getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay();
      } else {
        openCtrlPromptOverlay();
        triggerHaptic("medium");
        if (state.gamepadActive && window.showVirtualKeyboard) {
          setTimeout(() => {
            const searchEl = document.getElementById("ctrl-prompt-search");
            if (searchEl) { searchEl.focus(); window.showVirtualKeyboard(searchEl); }
          }, 120);
        }
      }
    }
  }
  // L1/R1 in ctrl-prompt — navigate categories
  if ((_gpButtonPressed(gp, 4) || _gpButtonPressed(gp, 5)) && getCtrlPromptVisible()) {
    triggerHaptic("light");
    navigateCtrlPromptCat(_gpButtonPressed(gp, 4) ? -1 : 1);
  }
  // L1/R1 outside ctrl-prompt — scroll chat or cycle tabs
  if ((_gpButtonPressed(gp, 4) || _gpButtonPressed(gp, 5)) && !getCtrlPromptVisible()) {
    const chatView = document.getElementById("view-chat");
    if (chatView && chatView.classList.contains("active")) {
      const workspace = document.getElementById("chat-workspace");
      if (workspace) workspace.scrollTop += _gpButtonPressed(gp, 4) ? -(workspace.clientHeight * 0.8) : (workspace.clientHeight * 0.8);
    }
    const sshView = document.getElementById("view-ssh");
    if (sshView && sshView.classList.contains("active")) {
      const focused = document.querySelector("#ssh-profiles-list .ssh-profile-item.gamepad-focused");
      if (focused) focused.click();
    }
    const tabs = Array.from(document.querySelectorAll(".nav-tab"));
    const activeTabIdx = tabs.findIndex((tab) => tab.classList.contains("active"));
    if (activeTabIdx !== -1) {
      const nextIdx = _gpButtonPressed(gp, 4) ? (activeTabIdx - 1 + tabs.length) % tabs.length : (activeTabIdx + 1) % tabs.length;
      if (nextIdx !== activeTabIdx) {
        tabs[nextIdx].click();
        triggerHaptic("light");
        state.gamepadFocusIndex = -1;
        document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused"));
      }
    }
  }
}

function _gpHandleMenuButtons(gp) {
  if (_gpButtonPressed(gp, 8) && !getCtrlPromptVisible()) {
    triggerHaptic("medium");
    const runBtn = document.getElementById("canvas-run-btn");
    if (runBtn) runBtn.click();
  }
  if (_gpButtonPressed(gp, 9) && !getCtrlPromptVisible()) {
    triggerHaptic("medium");
    const settingsOverlay = document.getElementById("settings-overlay");
    if (settingsOverlay) {
      if (settingsOverlay.classList.contains("active")) document.getElementById("close-settings").click();
      else document.getElementById("settings-btn").click();
    }
  }
}

function _gpHandleDpad(gp) {
  if (_gpButtonPressed(gp, 12) || _gpButtonPressed(gp, 13)) {
    const goUp = _gpButtonPressed(gp, 12);
    if (getCtrlPromptVisible()) {
      if (getCtrlPromptTemplateMode()) navigateTemplatePlaceholder(goUp ? -1 : 1);
      else navigateCtrlPromptList(goUp ? -1 : 1);
    } else {
      const shareView = document.getElementById("view-share");
      const sshView   = document.getElementById("view-ssh");
      if (shareView && shareView.classList.contains("active")) {
        const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
        const idx = subtabs.findIndex((t) => t.classList.contains("active"));
        if (idx !== -1) subtabs[goUp ? (idx - 1 + subtabs.length) % subtabs.length : (idx + 1) % subtabs.length].click();
      } else if (sshView && sshView.classList.contains("active")) {
        const items = Array.from(document.querySelectorAll("#ssh-profiles-list .ssh-profile-item"));
        if (items.length > 0) {
          const selIdx = items.findIndex((el) => el.classList.contains("gamepad-focused"));
          const nextIdx = goUp
            ? Math.max(0, selIdx === -1 ? items.length - 1 : selIdx - 1)
            : Math.min(items.length - 1, selIdx === -1 ? 0 : selIdx + 1);
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
  }
  if ((_gpButtonPressed(gp, 14) || _gpButtonPressed(gp, 15)) && getCtrlPromptVisible()) {
    const goLeft = _gpButtonPressed(gp, 14);
    if (getCtrlPromptTemplateMode()) cycleTemplatePlaceholder(goLeft ? -1 : 1);
    else navigateCtrlPromptCat(goLeft ? -1 : 1);
  }
  if ((_gpButtonPressed(gp, 14) || _gpButtonPressed(gp, 15)) && !getCtrlPromptVisible()) {
    const els = getGamepadFocusableElements();
    const activeEl = els[state.gamepadFocusIndex];
    const handled = activeEl && (() => {
      if (activeEl.tagName === "INPUT" && activeEl.type === "range") {
        const step = parseInt(activeEl.step, 10) || 5;
        activeEl.value = _gpButtonPressed(gp, 14)
          ? Math.max(parseInt(activeEl.min, 10) || 0, parseInt(activeEl.value, 10) - step)
          : Math.min(parseInt(activeEl.max, 10) || 100, parseInt(activeEl.value, 10) + step);
        activeEl.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      if (activeEl.tagName === "SELECT") {
        const idx = _gpButtonPressed(gp, 14) ? Math.max(0, activeEl.selectedIndex - 1) : Math.min(activeEl.options.length - 1, activeEl.selectedIndex + 1);
        if (idx !== activeEl.selectedIndex) { activeEl.selectedIndex = idx; activeEl.dispatchEvent(new Event("change", { bubbles: true })); }
        return true;
      }
      return false;
    })();
    if (!handled) {
      const tabs = Array.from(document.querySelectorAll(".nav-tab"));
      const activeTabIdx = tabs.findIndex((t) => t.classList.contains("active"));
      if (activeTabIdx !== -1) {
        const nextIdx = _gpButtonPressed(gp, 14) ? (activeTabIdx - 1 + tabs.length) % tabs.length : (activeTabIdx + 1) % tabs.length;
        tabs[nextIdx].click();
        state.gamepadFocusIndex = -1;
        document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused"));
      }
    }
  }
}

function _gpHandleGripButtons(gp) {
  if (getCtrlPromptVisible()) return;
  if (_gpButtonPressed(gp, 17)) { triggerHaptic("light"); const s = document.getElementById("sidebar"); if (s) s.classList.toggle("collapsed"); }
  if (_gpButtonPressed(gp, 18)) { triggerHaptic("light"); const d = document.getElementById("inspect-drawer"); if (d) d.classList.toggle("collapsed"); }
  if (_gpButtonPressed(gp, 19)) { triggerHaptic("heavy"); const c = document.getElementById("canvas-clear-btn"); if (c) c.click(); }
  if (_gpButtonPressed(gp, 20)) { triggerHaptic("light"); cycleTheme(); }
}

function _gpHandleRadialMenu(gp, l2Held, l2WasHeld) {
  if (l2Held && !l2WasHeld) {
    showRadialMenu();
  } else if (l2Held) {
    const seg = getRadialSegmentFromStick(gp.axes[0] || 0, gp.axes[1] || 0);
    if (seg !== state.radialSelectedSegment) { updateRadialDisplay(seg); triggerHaptic("tick"); }
  } else if (!l2Held && l2WasHeld) {
    activateRadialSegment(state.radialSelectedSegment);
    hideRadialMenu();
  }
}

function _gpHandleTouchpadAndScroll(gp, l2Held) {
  const rtX = gp.axes[2] || 0, rtY = gp.axes[3] || 0;
  if (Math.sqrt(rtX * rtX + rtY * rtY) > TP_DEADZONE && !l2Held) moveTpCursor(rtX * TP_SENSITIVITY, rtY * TP_SENSITIVITY);
  if (_gpButtonPressed(gp, 11) && state.tpCursorVisible) { triggerHaptic("medium"); tpClick(0); }
  if (!l2Held && Math.abs(gp.axes[1] || 0) > 0.2) {
    const scrollEl = getActiveScrollContainer();
    if (scrollEl) { scrollEl.scrollTop += (gp.axes[1] || 0) * TP_SCROLL_SPEED; showTpScrollIndicator(true); }
  }
  if (_gpButtonPressed(gp, 1) && state.tpCursorVisible) {
    const c = document.getElementById("tp-cursor");
    if (c) c.classList.remove("tp-visible");
    state.tpCursorVisible = false;
  }
  if (_gpButtonPressed(gp, 1) && !getCtrlPromptVisible()) {
    const vkEl = document.getElementById("vk-overlay");
    if (vkEl && vkEl.classList.contains("vk-visible") && window.hideVirtualKeyboard) window.hideVirtualKeyboard();
  }
}

function pollGamepads() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) { gp = gamepads[i]; break; }
  }
  if (!gp) {
    if (state.gamepadActive) {
      state.gamepadActive = false;
      document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused"));
      state.gamepadFocusIndex = -1;
    }
    requestAnimationFrame(pollGamepads);
    return;
  }
  state.gamepadActive = true;

  const l2Held    = (gp.buttons[6] ? gp.buttons[6].value : 0) > 0.5;
  const l2WasHeld = state.previousGamepadState.l2Held;

  _gpHandleFaceButtons(gp);
  _gpHandleShoulderButtons(gp);
  _gpHandleMenuButtons(gp);
  _gpHandleDpad(gp);
  _gpHandleGripButtons(gp);
  _gpHandleRadialMenu(gp, l2Held, l2WasHeld);
  _gpHandleTouchpadAndScroll(gp, l2Held);

  for (let i = 0; i < gp.buttons.length; i++) {
    state.previousGamepadState.buttons[i] = !!(gp.buttons[i] && gp.buttons[i].pressed);
  }
  state.previousGamepadState.l2Held = l2Held;

  requestAnimationFrame(pollGamepads);
}`;

const result = [...before, replacement, ...after].join('\n');
fs.writeFileSync('frontend/src/main.js', result);
console.log('Done. Total lines:', result.split('\n').length);
console.log('Replaced lines', startIdx+1, 'to', endIdx+1);
