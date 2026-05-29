/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEURODECK v1.3.0-Isis — Input Command Registry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for ALL keyboard shortcuts and gamepad/controller
 * commands. Used to:
 *   • Render the shortcuts help overlay dynamically
 *   • Validate bindings during development
 *   • Generate Steam Input action labels
 *   • Provide consistent command naming across the app
 */

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────────────────

export const KEYBOARD_SHORTCUTS = [
  // ═══ Navigation ═══
  { keys: ["Ctrl", "K"], action: "Command Palette", scope: "global", description: "Open the command palette overlay" },
  { keys: ["F1"], action: "App Manual", scope: "global", description: "Open the JPE Manual — full feature reference and health diagnostics" },
  { keys: ["Ctrl", "Shift", "P"], action: "Prompt Library", scope: "global", description: "Open the controller prompt picker" },
  { keys: ["Ctrl", "Shift", "M"], action: "Agent Switcher", scope: "global", description: "Toggle the agent/model switcher panel" },
  { keys: ["?"], action: "Keyboard Help", scope: "global", description: "Show this shortcuts reference (when not typing)" },
  { keys: ["Esc"], action: "Close / Cancel", scope: "global", description: "Close modal, palette, or cancel AI generation" },

  // ═══ Chat ═══
  { keys: ["Enter"], action: "Send Message", scope: "chat", description: "Send the current message (Shift+Enter for newline)" },
  { keys: ["Ctrl", "F"], action: "Search Chat", scope: "chat", description: "Toggle chat message search overlay" },
  { keys: ["Ctrl", "Shift", "A"], action: "Attach Files", scope: "chat", description: "Open file picker for message attachments" },
  { keys: ["Ctrl", "M"], action: "Mute / Unmute TTS", scope: "global", description: "Toggle text-to-speech audio output" },
  { keys: ["Ctrl", "R"], action: "Voice Input", scope: "chat", description: "Toggle microphone voice input" },
  { keys: ["Ctrl", "P"], action: "Cycle Persona", scope: "global", description: "Switch to the next AI persona" },

  // ═══ Session ═══
  { keys: ["Ctrl", "N"], action: "New Session", scope: "global", description: "Start a new chat session" },
  { keys: ["Ctrl", "S"], action: "Save Session", scope: "global", description: "Save the current chat session to disk" },
  { keys: ["Ctrl", "L"], action: "Load Session", scope: "global", description: "Load the most recent chat session" },

  // ═══ View / Layout ═══
  { keys: ["Ctrl", "Alt", "1"], action: "Toggle Sidebar", scope: "global", description: "Show or hide the left sidebar" },
  { keys: ["Ctrl", "Alt", "2"], action: "Toggle Drawer", scope: "global", description: "Show or hide the right context drawer" },
  { keys: ["Ctrl", "Alt", "3"], action: "Clear Canvas", scope: "canvas", description: "Clear the visual canvas editor" },
  { keys: ["Ctrl", "Alt", "4"], action: "Cycle Theme", scope: "global", description: "Switch to the next UI theme" },
  { keys: ["`"], action: "Radial Menu", scope: "global", description: "Toggle the view-switching radial menu" },

  // ═══ Browser ═══
  { keys: ["F5"], action: "Refresh Page", scope: "browser", description: "Reload the current browser view" },
  { keys: ["Ctrl", "L"], action: "Focus Address Bar", scope: "browser", description: "Focus and select the browser URL input" },
  { keys: ["Alt", "←"], action: "Back", scope: "browser", description: "Navigate to the previous page" },
  { keys: ["Alt", "→"], action: "Forward", scope: "browser", description: "Navigate to the next page" },

  // ═══ Tools ═══
  { keys: ["Ctrl", "B"], action: "Run Lua Script", scope: "chat", description: "Execute any pending Lua script in the chat" },
  { keys: ["Ctrl", "Shift", "C"], action: "Copy Last Response", scope: "chat", description: "Copy the most recent AI response to clipboard" },

  // ═══ Radial Menu (when open) ═══
  { keys: ["1"], action: "Chat", scope: "radial", description: "Select Chat view in radial menu" },
  { keys: ["2"], action: "Canvas", scope: "radial", description: "Select Canvas view in radial menu" },
  { keys: ["3"], action: "Terminal", scope: "radial", description: "Select Terminal view in radial menu" },
  { keys: ["4"], action: "SSH", scope: "radial", description: "Select SSH view in radial menu" },
  { keys: ["5"], action: "Tunnel", scope: "radial", description: "Select Tunnel view in radial menu" },
  { keys: ["6"], action: "Browser", scope: "radial", description: "Select Browser view in radial menu" },
  { keys: ["7"], action: "Agent", scope: "radial", description: "Select Agent view in radial menu" },
  { keys: ["8"], action: "Memory", scope: "radial", description: "Select Memory view in radial menu" },
  { keys: ["9"], action: "Share", scope: "radial", description: "Select Share view in radial menu" },
  { keys: ["0"], action: "Remote", scope: "radial", description: "Select Remote view in radial menu" },
  { keys: ["ArrowUp"], action: "Navigate Up", scope: "radial", description: "Move selection up in radial menu" },
  { keys: ["ArrowRight"], action: "Navigate Right", scope: "radial", description: "Move selection right in radial menu" },
  { keys: ["ArrowDown"], action: "Navigate Down", scope: "radial", description: "Move selection down in radial menu" },
  { keys: ["ArrowLeft"], action: "Navigate Left", scope: "radial", description: "Move selection left in radial menu" },
  { keys: ["Enter"], action: "Confirm", scope: "radial", description: "Activate selected radial segment" },
  { keys: ["Esc"], action: "Close", scope: "radial", description: "Dismiss radial menu without selecting" },
];

// ─────────────────────────────────────────────────────────────────────────────
// GAMEPAD / CONTROLLER COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

export const GAMEPAD_COMMANDS = [
  // ═══ Face Buttons ═══
  { button: "A (Cross)", action: "Select / Click", scope: "global", description: "Click the currently focused element" },
  { button: "B (Circle)", action: "Back / Close", scope: "global", description: "Close modal, menu, or dismiss cursor overlay" },
  { button: "X (Square)", action: "Copy / Chat", scope: "global", description: "Copy focused message, or jump to Chat & focus input" },
  { button: "Y (Triangle)", action: "Regenerate / Persona", scope: "global", description: "Regenerate last AI response, or cycle persona" },

  // ═══ Shoulders & Triggers ═══
  { button: "L1", action: "Cycle Left / Page Up", scope: "global", description: "Cycle tabs left, scroll chat up, or SSH profile up" },
  { button: "R1", action: "Cycle Right / Page Down", scope: "global", description: "Cycle tabs right, scroll chat down, or SSH profile down" },
  { button: "L2 (Hold)", action: "Radial Menu", scope: "global", description: "Hold to show 12-segment radial view menu (left stick to select)" },
  { button: "R2", action: "Prompt Picker", scope: "global", description: "Toggle the controller prompt picker overlay" },

  // ═══ D-Pad ═══
  { button: "D-Pad Up", action: "Focus Up", scope: "global", description: "Move focus up, cycle share subtab up, or navigate SSH profiles" },
  { button: "D-Pad Down", action: "Focus Down", scope: "global", description: "Move focus down, cycle share subtab down, or navigate SSH profiles" },
  { button: "D-Pad Left", action: "Adjust / Tab Left", scope: "global", description: "Adjust sliders/selects left, or cycle tabs left" },
  { button: "D-Pad Right", action: "Adjust / Tab Right", scope: "global", description: "Adjust sliders/selects right, or cycle tabs right" },

  // ═══ System Buttons ═══
  { button: "Select (View)", action: "Run Canvas", scope: "canvas", description: "Execute code in the Canvas editor" },
  { button: "Start (Menu)", action: "Settings", scope: "global", description: "Toggle the Settings modal" },

  // ═══ Grip Buttons ═══
  { button: "L4 (Left Grip)", action: "Toggle Sidebar", scope: "global", description: "Show or hide the left sidebar" },
  { button: "R4 (Right Grip)", action: "Toggle Drawer", scope: "global", description: "Show or hide the right context drawer" },
  { button: "L5 (Left Paddle)", action: "Clear Canvas", scope: "canvas", description: "Clear the visual canvas editor" },
  { button: "R5 (Right Paddle)", action: "Cycle Theme", scope: "global", description: "Switch to the next UI theme" },

  // ═══ Stick Clicks ═══
  { button: "L3 (Left Stick Click)", action: "Scroll Mode", scope: "global", description: "Left touchpad click (scroll wheel mode)" },
  { button: "R3 (Right Stick Click)", action: "Cursor Click", scope: "global", description: "Click at the touchpad cursor position" },

  // ═══ Touchpads ═══
  { button: "Left Touchpad", action: "Scroll", scope: "global", description: "Vertical swipe to scroll active panel" },
  { button: "Right Touchpad", action: "Mouse Cursor", scope: "global", description: "Move the OS mouse cursor (absolute mode in Steam)" },
  { button: "Right Touchpad Click", action: "Left Click", scope: "global", description: "Primary mouse click at cursor position" },
  { button: "Right Touchpad Double-Tap", action: "Right Click", scope: "global", description: "Secondary mouse click at cursor position" },
];

// ─────────────────────────────────────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function renderShortcutsOverlay() {
  const overlay = document.getElementById("shortcuts-overlay");
  if (!overlay) return;

  const card = overlay.querySelector(".shortcuts-card");
  if (!card) return;

  // Group shortcuts by scope
  const groups = {};
  for (const sc of KEYBOARD_SHORTCUTS) {
    const scopeLabel = scopeDisplayName(sc.scope);
    if (!groups[scopeLabel]) groups[scopeLabel] = [];
    groups[scopeLabel].push(sc);
  }

  // Order groups intentionally
  const groupOrder = ["Navigation", "Chat", "Session", "View & Layout", "Browser", "Tools", "Radial Menu"];
  const orderedGroups = groupOrder.filter((g) => groups[g]);

  let html = `
    <div class="shortcuts-header">
      <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
      <button class="shortcuts-close" id="shortcuts-close" aria-label="Close shortcuts">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="shortcuts-grid">
  `;

  for (const groupName of orderedGroups) {
    const items = groups[groupName];
    html += `<div class="shortcuts-group"><h4>${escapeHtml(groupName)}</h4>`;
    for (const item of items) {
      const kbdHtml = item.keys.map((k) => `<kbd>${escapeHtml(k)}</kbd>`).join("");
      html += `<div class="shortcuts-row" title="${escapeHtml(item.description)}">${kbdHtml}<span>${escapeHtml(item.action)}</span></div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  card.innerHTML = html;

  // Re-attach close listener
  const closeBtn = card.querySelector("#shortcuts-close");
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.classList.add("hidden");
    };
  }
}

function scopeDisplayName(scope) {
  const map = {
    global: "Navigation",
    chat: "Chat",
    canvas: "View & Layout",
    browser: "Browser",
    radial: "Radial Menu",
  };
  return map[scope] || "Tools";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION (dev-only)
// ─────────────────────────────────────────────────────────────────────────────

export function validateShortcuts() {
  const seen = new Map();
  const issues = [];
  for (const sc of KEYBOARD_SHORTCUTS) {
    const key = sc.keys.join("+").toLowerCase();
    if (seen.has(key)) {
      issues.push(`Duplicate shortcut "${key}" between "${seen.get(key)}" and "${sc.action}"`);
    } else {
      seen.set(key, sc.action);
    }
  }
  if (issues.length) {
    console.warn("[Shortcuts] Validation issues:", issues);
  }
  return issues;
}
