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

// ── renderCommandPalette: extract per-action button builder ───────────────────
src = replaceFunction(src, 'renderCommandPalette', `function _cpBuildActionBtn(action, index) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = \`command-palette-item\${index === commandPaletteState.activeIndex ? " active" : ""}\`;
  btn.setAttribute("data-command-index", String(index));
  const main = document.createElement("span");
  main.className = "command-palette-item-main";
  const icon = document.createElement("span");
  icon.className = "command-palette-item-icon";
  icon.innerHTML = createIcon(action.icon, { size: 15 });
  const copy = document.createElement("span");
  copy.className = "command-palette-item-copy";
  const title = document.createElement("span");
  title.className = "command-palette-item-title";
  title.appendChild(highlightLabel(action.label, action._labelMatches || []));
  const subtitle = document.createElement("span");
  subtitle.className = "command-palette-item-subtitle";
  subtitle.textContent = action.group;
  copy.append(title, subtitle);
  main.append(icon.firstElementChild || icon, copy);
  btn.appendChild(main);
  btn.addEventListener("click", () => {
    const selected = commandPaletteState.filtered[index];
    if (!selected) return;
    addPaletteHistory(selected.label);
    closeCommandPalette();
    selected.run();
  });
  return btn;
}

function renderCommandPalette() {
  const list = document.getElementById("command-palette-list");
  const input = document.getElementById("command-palette-input");
  if (!list || !input) return;
  commandPaletteState.filtered = getCommandPaletteFilteredActions();
  if (commandPaletteState.activeIndex >= commandPaletteState.filtered.length) {
    commandPaletteState.activeIndex = Math.max(0, commandPaletteState.filtered.length - 1);
  }
  if (!commandPaletteState.filtered.length) {
    const empty = document.createElement("div");
    empty.className = "command-palette-empty";
    empty.textContent = \`No commands match "\${input.value}".\`;
    list.replaceChildren(empty); return;
  }
  list.replaceChildren();
  let lastGroup = null;
  commandPaletteState.filtered.forEach((action, index) => {
    if (action.group !== lastGroup) {
      const header = document.createElement("div");
      header.className = "command-palette-group-header";
      header.textContent = action.group;
      header.setAttribute("role", "separator");
      header.setAttribute("aria-label", \`\${action.group} commands\`);
      list.appendChild(header);
      lastGroup = action.group;
    }
    list.appendChild(_cpBuildActionBtn(action, index));
  });
}`);

// ── _gpHandleShoulderButtons: split L1/R1 and L2/R2 ─────────────────────────
src = replaceFunction(src, '_gpHandleShoulderButtons', `function _gpShoulderL2R2(gp) {
  if (_gpButtonPressed(gp, 6) || _gpButtonPressed(gp, 7)) {
    const shareView = document.getElementById("view-share");
    if (shareView && shareView.classList.contains("active")) {
      const subtabs = Array.from(document.querySelectorAll(".share-inner-tab"));
      const idx = subtabs.findIndex((t) => t.classList.contains("active"));
      if (idx !== -1) { subtabs[_gpButtonPressed(gp, 6) ? (idx - 1 + subtabs.length) % subtabs.length : (idx + 1) % subtabs.length].click(); triggerHaptic("light"); }
    }
  }
  if (_gpButtonPressed(gp, 7)) {
    const shareView = document.getElementById("view-share");
    if (!(shareView && shareView.classList.contains("active"))) {
      if (getCtrlPromptVisible()) {
        triggerHaptic("light");
        getCtrlPromptTemplateMode() ? exitTemplateMode() : closeCtrlPromptOverlay();
      } else {
        openCtrlPromptOverlay(); triggerHaptic("medium");
        if (state.gamepadActive && window.showVirtualKeyboard) {
          setTimeout(() => { const s = document.getElementById("ctrl-prompt-search"); if (s) { s.focus(); window.showVirtualKeyboard(s); } }, 120);
        }
      }
    }
  }
}

function _gpShoulderL1R1(gp) {
  if ((_gpButtonPressed(gp, 4) || _gpButtonPressed(gp, 5)) && getCtrlPromptVisible()) {
    triggerHaptic("light"); navigateCtrlPromptCat(_gpButtonPressed(gp, 4) ? -1 : 1); return;
  }
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
      if (nextIdx !== activeTabIdx) { tabs[nextIdx].click(); triggerHaptic("light"); state.gamepadFocusIndex = -1; document.querySelectorAll(".gamepad-focused").forEach((el) => el.classList.remove("gamepad-focused")); }
    }
  }
}

function _gpHandleShoulderButtons(gp) {
  _gpShoulderL2R2(gp);
  _gpShoulderL1R1(gp);
}`);

fs.writeFileSync('frontend/src/main.js', src);
console.log('Done. Total lines:', src.split('\n').length);
