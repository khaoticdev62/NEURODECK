import { invoke } from "@tauri-apps/api/core";
import { createIcon } from "./icons.js";

let currentCommands = [];
let editingId = null;

export function initCliMakerView() {
  loadCommands();
  wireEditor();
  wireFilters();
  populateIconSelect();
}

async function loadCommands() {
  const list = document.getElementById("cli-maker-list");
  if (!list) return;
  try {
    const json = await invoke("cli_list_commands");
    currentCommands = JSON.parse(json || "[]");
    renderList("all");
  } catch (e) {
    list.innerHTML = `<div class="cli-maker-empty">Error: ${escapeHtml(String(e))}</div>`;
  }
}

function renderList(filter) {
  const list = document.getElementById("cli-maker-list");
  const filtered = filter === "all" ? currentCommands : currentCommands.filter(c => c.category === filter);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="cli-maker-empty">No commands.</div>`;
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="cli-cmd-row" data-id="${escapeHtml(c.id)}">
      <span class="cli-cmd-icon">${createIcon(c.icon || "zap", { size: 14 })}</span>
      <span class="cli-cmd-name">${escapeHtml(c.name)}</span>
      <span class="cli-cmd-cat cli-cat-${c.category}">${escapeHtml(c.category)}</span>
      <button class="cli-btn-small" data-action="edit">Edit</button>
      <button class="cli-btn-small" data-action="run">Run</button>
      <button class="cli-btn-small" data-action="del">×</button>
    </div>
  `).join("");

  list.querySelectorAll(".cli-cmd-row").forEach(row => {
    row.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      const id = row.dataset.id;
      if (action === "edit") editCommand(id);
      else if (action === "run") runCommand(id);
      else if (action === "del") deleteCommand(id);
    });
  });
}

function wireFilters() {
  document.querySelectorAll("#cli-maker-filters .cli-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cli-maker-filters .cli-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderList(btn.dataset.filter);
    });
  });

  document.getElementById("cli-new-cmd-btn")?.addEventListener("click", () => {
    editingId = null;
    clearEditor();
    document.getElementById("cli-editor-title").textContent = "New Command";
  });
}

function wireEditor() {
  const categorySelect = document.getElementById("cli-cmd-category");
  categorySelect?.addEventListener("change", () => renderDynamicFields(categorySelect.value));

  document.getElementById("cli-save-btn")?.addEventListener("click", saveCommand);
  document.getElementById("cli-test-btn")?.addEventListener("click", testCommand);
  document.getElementById("cli-export-btn")?.addEventListener("click", exportLua);

  // Shortcut recorder
  const shortcutInput = document.getElementById("cli-shortcut-input");
  shortcutInput?.addEventListener("keydown", (e) => {
    e.preventDefault();
    const keys = [];
    if (e.ctrlKey) keys.push("Ctrl");
    if (e.altKey) keys.push("Alt");
    if (e.shiftKey) keys.push("Shift");
    if (e.key.length === 1) keys.push(e.key.toUpperCase());
    else if (!["Control", "Alt", "Shift"].includes(e.key)) keys.push(e.key);
    shortcutInput.value = keys.join("+");
  });
}

function renderDynamicFields(category) {
  const container = document.getElementById("cli-dynamic-fields");
  if (!container) return;

  switch (category) {
    case "prompt":
      container.innerHTML = `
        <textarea id="cli-prompt-template" class="cli-input" rows="4" placeholder="Prompt template (use {{input}} for user text)"></textarea>
        <label><input type="checkbox" id="cli-prompt-llm"> Send to LLM</label>
      `;
      break;
    case "shell":
      container.innerHTML = `
        <input type="text" id="cli-shell-command" class="cli-input" placeholder="Shell command (use {{input}} for args)">
        <input type="text" id="cli-shell-cwd" class="cli-input" placeholder="Working directory (optional)">
        <div style="color:var(--error-color);font-size:0.75rem;">⚠️ Shell commands run with user privileges.</div>
      `;
      break;
    case "view":
      container.innerHTML = `
        <select id="cli-view-name" class="cli-select">
          <option value="chat">Chat</option>
          <option value="canvas">Canvas</option>
          <option value="terminal">Terminal</option>
          <option value="ssh">SSH</option>
          <option value="tunnel">Tunnel</option>
          <option value="share">Share</option>
          <option value="browser">Browser</option>
          <option value="agent">Agent</option>
          <option value="memory">Memory</option>
          <option value="prompt-lab">Prompt Lab</option>
          <option value="remote">Remote</option>
          <option value="docs">Docs</option>
          <option value="git">Git</option>
          <option value="api-lab">API Lab</option>
          <option value="cli-maker">CLI Maker</option>
        </select>
      `;
      break;
    case "chain":
      container.innerHTML = `
        <div class="cli-chain-list" id="cli-chain-list"></div>
        <button class="cli-maker-btn" id="cli-add-chain-step">+ Add Step</button>
      `;
      document.getElementById("cli-add-chain-step")?.addEventListener("click", () => {
        const list = document.getElementById("cli-chain-list");
        const select = document.createElement("select");
        select.className = "cli-select";
        currentCommands.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.name;
          select.appendChild(opt);
        });
        list.appendChild(select);
      });
      break;
    case "plugin":
      container.innerHTML = `
        <textarea id="cli-plugin-code" class="cli-input" rows="6" placeholder="Lua code..."></textarea>
      `;
      break;
  }
}

function gatherDef() {
  const category = document.getElementById("cli-cmd-category")?.value || "prompt";
  const action = (() => {
    switch (category) {
      case "prompt":
        return {
          type: "Prompt",
          data: {
            template: document.getElementById("cli-prompt-template")?.value || "",
            use_llm: document.getElementById("cli-prompt-llm")?.checked || false,
          }
        };
      case "shell":
        return {
          type: "Shell",
          data: {
            command: document.getElementById("cli-shell-command")?.value || "",
            cwd: document.getElementById("cli-shell-cwd")?.value || null,
          }
        };
      case "view":
        return {
          type: "View",
          data: { view_name: document.getElementById("cli-view-name")?.value || "chat" }
        };
      case "chain": {
        const steps = Array.from(document.querySelectorAll("#cli-chain-list select")).map(s => s.value);
        return { type: "Chain", data: { steps } };
      }
      case "plugin":
        return {
          type: "Plugin",
          data: { lua_code: document.getElementById("cli-plugin-code")?.value || "" }
        };
      default:
        return { type: "Prompt", data: { template: "", use_llm: false } };
    }
  })();

  return {
    id: editingId || `cmd-${Date.now()}`,
    name: document.getElementById("cli-cmd-name")?.value || "Untitled",
    description: document.getElementById("cli-cmd-desc")?.value || "",
    icon: document.getElementById("cli-icon-select")?.value || "zap",
    category,
    action,
    shortcut: document.getElementById("cli-shortcut-input")?.value || null,
    radial_bind: document.getElementById("cli-radial-select")?.value ? parseInt(document.getElementById("cli-radial-select").value) : null,
  };
}

async function saveCommand() {
  const def = gatherDef();
  try {
    if (editingId) {
      await invoke("cli_update_command", { id: editingId, def: JSON.stringify(def) });
    } else {
      await invoke("cli_create_command", { def: JSON.stringify(def) });
    }
    await loadCommands();
    clearEditor();
  } catch (e) {
    alert("Save failed: " + e);
  }
}

async function testCommand() {
  const def = gatherDef();
  const preview = document.getElementById("cli-preview-output");
  try {
    const result = await invoke("cli_run_command", { id: def.id, args: "test args" });
    preview.textContent = result;
  } catch (e) {
    preview.textContent = "Error: " + e;
  }
}

async function exportLua() {
  if (!editingId) { alert("Save the command first."); return; }
  try {
    const lua = await invoke("cli_export_lua", { id: editingId });
    await navigator.clipboard.writeText(lua);
    alert("Lua exported to clipboard!");
  } catch (e) {
    alert("Export failed: " + e);
  }
}

async function runCommand(id) {
  const preview = document.getElementById("cli-preview-output");
  try {
    const result = await invoke("cli_run_command", { id, args: "" });
    preview.textContent = result;
  } catch (e) {
    preview.textContent = "Error: " + e;
  }
}

async function deleteCommand(id) {
  if (!confirm("Delete this command?")) return;
  try {
    await invoke("cli_delete_command", { id });
    await loadCommands();
  } catch (e) {
    alert("Delete failed: " + e);
  }
}

function editCommand(id) {
  const cmd = currentCommands.find(c => c.id === id);
  if (!cmd) return;
  editingId = id;
  document.getElementById("cli-editor-title").textContent = `Edit: ${cmd.name}`;
  document.getElementById("cli-cmd-name").value = cmd.name;
  document.getElementById("cli-cmd-desc").value = cmd.description;
  document.getElementById("cli-cmd-category").value = cmd.category;
  document.getElementById("cli-icon-select").value = cmd.icon;
  document.getElementById("cli-shortcut-input").value = cmd.shortcut || "";
  document.getElementById("cli-radial-select").value = cmd.radial_bind !== null ? String(cmd.radial_bind) : "";

  renderDynamicFields(cmd.category);

  // Populate dynamic fields based on action type
  if (cmd.action?.type === "Prompt") {
    document.getElementById("cli-prompt-template").value = cmd.action.data.template || "";
    document.getElementById("cli-prompt-llm").checked = cmd.action.data.use_llm || false;
  } else if (cmd.action?.type === "Shell") {
    document.getElementById("cli-shell-command").value = cmd.action.data.command || "";
    document.getElementById("cli-shell-cwd").value = cmd.action.data.cwd || "";
  } else if (cmd.action?.type === "View") {
    document.getElementById("cli-view-name").value = cmd.action.data.view_name || "chat";
  } else if (cmd.action?.type === "Plugin") {
    document.getElementById("cli-plugin-code").value = cmd.action.data.lua_code || "";
  }
}

function clearEditor() {
  editingId = null;
  document.getElementById("cli-cmd-name").value = "";
  document.getElementById("cli-cmd-desc").value = "";
  document.getElementById("cli-shortcut-input").value = "";
  document.getElementById("cli-radial-select").value = "";
  renderDynamicFields(document.getElementById("cli-cmd-category")?.value || "prompt");
}

function populateIconSelect() {
  const select = document.getElementById("cli-icon-select");
  if (!select) return;
  const icons = ["zap", "messageSquare", "code2", "squareTerminal", "server", "route", "globe", "bot", "brain", "share2", "panelRightOpen", "sparkles", "fileText", "gitBranch", "send", "copy", "play", "settings2", "search", "trash"];
  select.innerHTML = icons.map(i => `<option value="${i}">${i}</option>`).join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
