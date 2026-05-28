import { invoke } from "@tauri-apps/api/core";
import { createIcon } from "./icons.js";

// ── State ──────────────────────────────────────────────────────────────────────
let _cmds       = [];
let _editingId  = null;
let _flags      = [];   // [{ name, short, type, required, desc, default }]
let _subcmds    = [];   // [{ name, desc, action }]
let _initialized = false;

const ICONS = ["zap","messageSquare","code2","squareTerminal","server","route","globe",
  "bot","brain","share2","panelRightOpen","sparkles","fileText","gitBranch","send",
  "copy","play","settings2","search","trash","cpu","layers","terminal","box","rocket"];

// ── Init ───────────────────────────────────────────────────────────────────────
export function initCliMakerView() {
  if (_initialized) return;
  _initialized = true;
  _populateIconSelect();
  _wireFilters();
  _wireEditor();
  _loadCommands();
}

// ── Load / Render list ────────────────────────────────────────────────────────
async function _loadCommands() {
  const listEl = document.getElementById("cli-maker-list");
  if (!listEl) return;
  try {
    const json = await invoke("cli_list_commands");
    _cmds = JSON.parse(json || "[]");
    _renderList("all");
  } catch (e) {
    listEl.innerHTML = `<div class="cli-maker-empty">Error: ${_esc(String(e))}</div>`;
  }
}

function _renderList(filter) {
  const listEl = document.getElementById("cli-maker-list");
  if (!listEl) return;
  const filtered = filter === "all" ? _cmds : _cmds.filter(c => c.category === filter);
  if (!filtered.length) {
    listEl.innerHTML = `<div class="cli-maker-empty">No ${filter === "all" ? "" : filter + " "}commands yet.</div>`;
    return;
  }
  listEl.innerHTML = filtered.map(c => `
    <div class="cli-cmd-row${_editingId === c.id ? " cli-cmd-selected" : ""}"
         data-id="${_esc(c.id)}" role="listitem" tabindex="0"
         aria-label="${_esc(c.name)} — ${_esc(c.description)}">
      <span class="cli-cmd-icon">${createIcon(c.icon || "zap", { size: 13 })}</span>
      <span class="cli-cmd-name">${_esc(c.name)}</span>
      <span class="cli-cmd-cat cli-cat-${_esc(c.category)}">${_esc(c.category)}</span>
      <div class="cli-cmd-actions">
        <button class="cli-btn-small" data-action="edit"  title="Edit"   aria-label="Edit ${_esc(c.name)}">✎</button>
        <button class="cli-btn-small" data-action="run"   title="Run"    aria-label="Run ${_esc(c.name)}">▶</button>
        <button class="cli-btn-small" data-action="del"   title="Delete" aria-label="Delete ${_esc(c.name)}">×</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll(".cli-cmd-row").forEach(row => {
    const id = row.dataset.id;
    row.addEventListener("click", e => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "edit")      _editCommand(id);
      else if (action === "run")  _runCommand(id);
      else if (action === "del")  _deleteCommand(id);
    });
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); _editCommand(id); }
    });
  });
}

// ── Filters ───────────────────────────────────────────────────────────────────
function _wireFilters() {
  document.querySelectorAll("#cli-maker-filters .cli-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cli-maker-filters .cli-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _renderList(btn.dataset.filter);
    });
  });
  document.getElementById("cli-new-cmd-btn")?.addEventListener("click", () => {
    _editingId = null;
    _flags = [];
    _subcmds = [];
    _clearEditor();
    document.getElementById("cli-editor-title").textContent = "New Command";
  });
}

// ── Editor wiring ─────────────────────────────────────────────────────────────
function _wireEditor() {
  document.getElementById("cli-cmd-category")?.addEventListener("change", () => {
    const cat = document.getElementById("cli-cmd-category").value;
    _renderDynamicFields(cat);
    _updateHelpPreview();
  });

  // Live preview on any input change
  ["cli-cmd-name","cli-cmd-desc"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", _updateHelpPreview);
  });

  // Shortcut recorder
  document.getElementById("cli-shortcut-input")?.addEventListener("keydown", e => {
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey)  parts.push("Ctrl");
    if (e.altKey)   parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.key.length === 1) parts.push(e.key.toUpperCase());
    else if (!["Control","Alt","Shift"].includes(e.key)) parts.push(e.key);
    e.target.value = parts.join("+");
    _updateHelpPreview();
  });

  document.getElementById("cli-save-btn")?.addEventListener("click",          _saveCommand);
  document.getElementById("cli-test-btn")?.addEventListener("click",          _testCommand);
  document.getElementById("cli-export-btn")?.addEventListener("click",        _exportLuaClipboard);
  document.getElementById("cli-save-plugin-btn")?.addEventListener("click",   _saveAsPlugin);
  document.getElementById("cli-export-script-btn")?.addEventListener("click", _exportAsScript);
  document.getElementById("cli-add-flag-btn")?.addEventListener("click",      _addFlag);
  document.getElementById("cli-add-subcmd-btn")?.addEventListener("click",    _addSubcmd);

  // Language toggle visibility
  document.getElementById("cli-cmd-category")?.addEventListener("change", () => {
    const cat = document.getElementById("cli-cmd-category")?.value;
    const showLang = cat === "shell" || cat === "plugin";
    const langSel = document.getElementById("cli-lang-select");
    if (langSel) langSel.style.display = showLang ? "" : "none";
  });

  _renderDynamicFields("prompt");
}

// ── Dynamic action fields ─────────────────────────────────────────────────────
function _renderDynamicFields(category) {
  const container = document.getElementById("cli-dynamic-fields");
  if (!container) return;

  switch (category) {
    case "prompt":
      container.innerHTML = `
        <textarea id="cli-prompt-template" class="cli-input cli-textarea"
                  rows="4" placeholder="Prompt template (use {{input}} for user text)"
                  aria-label="Prompt template"></textarea>
        <label class="cli-check-label">
          <input type="checkbox" id="cli-prompt-llm" aria-label="Send to LLM">
          Send to LLM (vs. just echo)
        </label>
      `;
      container.querySelectorAll("textarea, input").forEach(el => el.addEventListener("input", _updateHelpPreview));
      break;

    case "shell":
      container.innerHTML = `
        <input type="text" id="cli-shell-command" class="cli-input"
               placeholder='Shell command (e.g. ls -la "{{input}}")' aria-label="Shell command">
        <input type="text" id="cli-shell-cwd" class="cli-input"
               placeholder="Working directory (optional)" aria-label="Working directory">
        <div class="cli-warn-row">⚠️ Shell commands run with user privileges.</div>
      `;
      container.querySelectorAll("input").forEach(el => el.addEventListener("input", _updateHelpPreview));
      break;

    case "view":
      container.innerHTML = `
        <select id="cli-view-name" class="cli-select" aria-label="Target view">
          ${["chat","canvas","terminal","ssh","tunnel","share","browser","agent","memory",
             "prompt-lab","remote","docs","git","api-lab","cli-maker","graph","scheduler",
             "workflow","ide","orchestrator"]
            .map(v => `<option value="${v}">${v}</option>`).join("")}
        </select>
      `;
      container.querySelector("select")?.addEventListener("change", _updateHelpPreview);
      break;

    case "chain":
      container.innerHTML = `
        <div class="cli-chain-list" id="cli-chain-list"></div>
        <button class="cli-maker-btn cli-maker-btn-sm" id="cli-add-chain-step" aria-label="Add step">+ Add Step</button>
      `;
      document.getElementById("cli-add-chain-step")?.addEventListener("click", () => {
        const list = document.getElementById("cli-chain-list");
        if (!list) return;
        const wrap = document.createElement("div");
        wrap.className = "cli-chain-step";
        const select = document.createElement("select");
        select.className = "cli-select";
        select.setAttribute("aria-label", "Chain step");
        _cmds.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.name;
          select.appendChild(opt);
        });
        const del = document.createElement("button");
        del.className = "cli-btn-small";
        del.textContent = "×";
        del.setAttribute("aria-label", "Remove step");
        del.addEventListener("click", () => wrap.remove());
        wrap.appendChild(select);
        wrap.appendChild(del);
        list.appendChild(wrap);
        _updateHelpPreview();
      });
      break;

    case "plugin":
      container.innerHTML = `
        <textarea id="cli-plugin-code" class="cli-input cli-textarea cli-code-area"
                  rows="8" placeholder="-- Lua code\nregisterCommand('name', function(args)\n  return args\nend)"
                  spellcheck="false" aria-label="Lua code"></textarea>
      `;
      container.querySelector("textarea")?.addEventListener("input", _updateHelpPreview);
      break;
  }

  // Show flags/subcmds section only for shell/prompt
  const showFlags = category !== "view" && category !== "chain";
  document.getElementById("cli-flags-section")?.style && (document.getElementById("cli-flags-section").style.display = showFlags ? "" : "none");
  document.getElementById("cli-subcmds-section")?.style && (document.getElementById("cli-subcmds-section").style.display = showFlags ? "" : "none");
}

// ── Flags ─────────────────────────────────────────────────────────────────────
function _addFlag(flag = { name: "", short: "", type: "string", required: false, desc: "", default: "" }) {
  const list = document.getElementById("cli-flags-list");
  if (!list) return;
  const idx = _flags.length;
  _flags.push({ ...flag });

  const row = document.createElement("div");
  row.className = "cli-flag-row";
  row.dataset.idx = idx;
  row.innerHTML = `
    <input type="text" class="cli-input cli-flag-name" placeholder="--name" value="${_esc(flag.name)}"
           aria-label="Flag name" title="Flag name (without --)">
    <input type="text" class="cli-flag-short cli-input" placeholder="-n" value="${_esc(flag.short)}"
           maxlength="2" aria-label="Short flag" title="Single-char shorthand">
    <select class="cli-select cli-flag-type" aria-label="Flag type" title="Value type">
      ${["string","number","boolean","file"].map(t =>
        `<option value="${t}" ${flag.type === t ? "selected" : ""}>${t}</option>`).join("")}
    </select>
    <label class="cli-check-label" title="Required">
      <input type="checkbox" class="cli-flag-req" ${flag.required ? "checked" : ""} aria-label="Required">Req
    </label>
    <input type="text" class="cli-input cli-flag-desc" placeholder="Description" value="${_esc(flag.desc)}"
           aria-label="Flag description" style="flex:2">
    <button class="cli-btn-small" aria-label="Remove flag">×</button>
  `;

  row.querySelectorAll("input, select").forEach(el => el.addEventListener("input", () => {
    _flags[idx] = _gatherFlag(row);
    _updateHelpPreview();
  }));
  row.querySelector("button").addEventListener("click", () => {
    _flags.splice(idx, 1);
    row.remove();
    _updateHelpPreview();
  });

  list.appendChild(row);
  _updateHelpPreview();
}

function _gatherFlag(row) {
  return {
    name:     row.querySelector(".cli-flag-name")?.value.trim().replace(/^-+/, "") || "",
    short:    row.querySelector(".cli-flag-short")?.value.trim().replace(/^-/, "").slice(0, 1) || "",
    type:     row.querySelector(".cli-flag-type")?.value || "string",
    required: row.querySelector(".cli-flag-req")?.checked || false,
    desc:     row.querySelector(".cli-flag-desc")?.value.trim() || "",
    default:  "",
  };
}

// ── Subcommands ───────────────────────────────────────────────────────────────
function _addSubcmd(sub = { name: "", desc: "", action: "" }) {
  const list = document.getElementById("cli-subcmds-list");
  if (!list) return;
  const idx = _subcmds.length;
  _subcmds.push({ ...sub });

  const row = document.createElement("div");
  row.className = "cli-subcmd-row";
  row.innerHTML = `
    <input type="text" class="cli-input cli-subcmd-name" placeholder="subcommand" value="${_esc(sub.name)}"
           aria-label="Subcommand name">
    <input type="text" class="cli-input cli-subcmd-desc" placeholder="Description" value="${_esc(sub.desc)}"
           aria-label="Subcommand description" style="flex:2">
    <button class="cli-btn-small" aria-label="Remove subcommand">×</button>
  `;

  row.querySelectorAll("input").forEach(el => el.addEventListener("input", () => {
    _subcmds[idx] = { name: row.querySelector(".cli-subcmd-name")?.value.trim() || "", desc: row.querySelector(".cli-subcmd-desc")?.value.trim() || "" };
    _updateHelpPreview();
  }));
  row.querySelector("button").addEventListener("click", () => {
    _subcmds.splice(idx, 1);
    row.remove();
    _updateHelpPreview();
  });

  list.appendChild(row);
  _updateHelpPreview();
}

// ── --help preview ────────────────────────────────────────────────────────────
function _updateHelpPreview() {
  const preview = document.getElementById("cli-help-preview");
  if (!preview) return;

  const name = document.getElementById("cli-cmd-name")?.value.trim() || "mycommand";
  const desc = document.getElementById("cli-cmd-desc")?.value.trim() || "(no description)";
  const shortcut = document.getElementById("cli-shortcut-input")?.value.trim();
  const cat = document.getElementById("cli-cmd-category")?.value || "prompt";

  const lines = [];
  lines.push(`USAGE`);
  lines.push(`  /${name} [OPTIONS]${_subcmds.length ? " <subcommand>" : ""} [ARGS...]`);
  lines.push("");
  lines.push(`DESCRIPTION`);
  lines.push(`  ${desc}`);

  if (_flags.length) {
    lines.push("");
    lines.push("OPTIONS");
    for (const f of _flags) {
      if (!f.name) continue;
      const short = f.short ? `, -${f.short}` : "";
      const req   = f.required ? " (required)" : "";
      const type  = f.type !== "boolean" ? ` <${f.type}>` : "";
      lines.push(`  --${f.name}${short}${type}${req}`);
      if (f.desc) lines.push(`      ${f.desc}`);
    }
  }

  if (_subcmds.length) {
    lines.push("");
    lines.push("SUBCOMMANDS");
    for (const s of _subcmds) {
      if (!s.name) continue;
      lines.push(`  ${s.name.padEnd(16)} ${s.desc || ""}`);
    }
  }

  if (cat === "shell") {
    const cmd = document.getElementById("cli-shell-command")?.value.trim();
    if (cmd) { lines.push(""); lines.push("EXECUTES"); lines.push(`  ${cmd}`); }
  }

  if (shortcut) {
    lines.push("");
    lines.push(`SHORTCUT  ${shortcut}`);
  }

  preview.textContent = lines.join("\n");
}

// ── Gather form → def ─────────────────────────────────────────────────────────
function _gatherDef() {
  const category = document.getElementById("cli-cmd-category")?.value || "prompt";
  const action = (() => {
    switch (category) {
      case "prompt": return {
        type: "Prompt",
        data: {
          template: document.getElementById("cli-prompt-template")?.value || "",
          use_llm:  document.getElementById("cli-prompt-llm")?.checked || false,
        }
      };
      case "shell": return {
        type: "Shell",
        data: {
          command: document.getElementById("cli-shell-command")?.value || "",
          cwd:     document.getElementById("cli-shell-cwd")?.value || null,
        }
      };
      case "view": return {
        type: "View",
        data: { view_name: document.getElementById("cli-view-name")?.value || "chat" }
      };
      case "chain": {
        const steps = Array.from(document.querySelectorAll("#cli-chain-list select")).map(s => s.value);
        return { type: "Chain", data: { steps } };
      }
      case "plugin": return {
        type: "Plugin",
        data: { lua_code: document.getElementById("cli-plugin-code")?.value || "" }
      };
      default: return { type: "Prompt", data: { template: "", use_llm: false } };
    }
  })();

  const currentFlags = Array.from(document.querySelectorAll("#cli-flags-list .cli-flag-row"))
    .map(r => _gatherFlag(r))
    .filter(f => f.name);

  const currentSubcmds = Array.from(document.querySelectorAll("#cli-subcmds-list .cli-subcmd-row"))
    .map(r => ({
      name: r.querySelector(".cli-subcmd-name")?.value.trim() || "",
      desc: r.querySelector(".cli-subcmd-desc")?.value.trim() || "",
    }))
    .filter(s => s.name);

  return {
    id:          _editingId || `cmd-${Date.now()}`,
    name:        document.getElementById("cli-cmd-name")?.value.trim() || "Untitled",
    description: document.getElementById("cli-cmd-desc")?.value.trim() || "",
    icon:        document.getElementById("cli-icon-select")?.value || "zap",
    category,
    action,
    flags:       currentFlags,
    subcommands: currentSubcmds,
    shortcut:    document.getElementById("cli-shortcut-input")?.value || null,
    radial_bind: document.getElementById("cli-radial-select")?.value
                   ? parseInt(document.getElementById("cli-radial-select").value)
                   : null,
  };
}

// ── Save / Test / Export ──────────────────────────────────────────────────────
async function _saveCommand() {
  const def = _gatherDef();
  try {
    if (_editingId) {
      await invoke("cli_update_command", { id: _editingId, def: JSON.stringify(def) });
    } else {
      await invoke("cli_create_command", { def: JSON.stringify(def) });
    }
    _editingId = def.id;
    await _loadCommands();
    _showOutput(`✓ Saved "${def.name}"`);
  } catch (e) {
    _showOutput(`✗ Save failed: ${e}`, true);
  }
}

async function _testCommand() {
  const def = _gatherDef();
  _showOutput("Running…");
  try {
    if (!_editingId) {
      // Save first so we can run by ID
      const id = await invoke("cli_create_command", { def: JSON.stringify(def) });
      _editingId = typeof id === "string" ? id : def.id;
    }
    const result = await invoke("cli_run_command", { id: _editingId, args: "test" });
    _showOutput(result);
  } catch (e) {
    _showOutput(`Error: ${e}`, true);
  }
}

async function _exportLuaClipboard() {
  if (!_editingId) { _showOutput("Save the command first."); return; }
  try {
    const lua = await invoke("cli_export_lua", { id: _editingId });
    await navigator.clipboard.writeText(lua);
    _showOutput("✓ Lua copied to clipboard.");
  } catch (e) {
    _showOutput(`Export failed: ${e}`, true);
  }
}

async function _saveAsPlugin() {
  const def = _gatherDef();
  if (!_editingId) {
    try {
      await invoke("cli_create_command", { def: JSON.stringify(def) });
      _editingId = def.id;
    } catch {}
  }
  try {
    const path = await invoke("cli_maker_save_plugin", { id: _editingId });
    _showOutput(`✓ Plugin saved to:\n${path}\n\nReload plugins in Settings → Plugin Manager to activate.`);
    await _loadCommands();
  } catch (e) {
    _showOutput(`Save plugin failed: ${e}`, true);
  }
}

async function _exportAsScript() {
  if (!_editingId) { await _saveCommand(); }
  const cat  = document.getElementById("cli-cmd-category")?.value || "prompt";
  const lang = document.getElementById("cli-lang-select")?.value
    || (cat === "shell" ? "bash" : "lua");
  try {
    const path = await invoke("cli_maker_export", { id: _editingId, format: lang });
    _showOutput(`✓ Script exported to:\n${path}`);
  } catch (e) {
    _showOutput(`Export failed: ${e}`, true);
  }
}

function _showOutput(text, isError = false) {
  const el = document.getElementById("cli-preview-output");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#fca5a5" : "";
}

// ── Run / Delete ──────────────────────────────────────────────────────────────
async function _runCommand(id) {
  _showOutput("Running…");
  try {
    const result = await invoke("cli_run_command", { id, args: "" });
    _showOutput(result);
  } catch (e) {
    _showOutput(`Error: ${e}`, true);
  }
}

async function _deleteCommand(id) {
  if (!confirm("Delete this command?")) return;
  try {
    await invoke("cli_delete_command", { id });
    if (_editingId === id) { _editingId = null; _clearEditor(); }
    await _loadCommands();
  } catch (e) {
    _showOutput(`Delete failed: ${e}`, true);
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────
function _editCommand(id) {
  const cmd = _cmds.find(c => c.id === id);
  if (!cmd) return;
  _editingId = id;
  _flags     = [...(cmd.flags || [])];
  _subcmds   = [...(cmd.subcommands || [])];

  document.getElementById("cli-editor-title").textContent = `Edit: ${cmd.name}`;
  document.getElementById("cli-cmd-name").value           = cmd.name;
  document.getElementById("cli-cmd-desc").value           = cmd.description;
  document.getElementById("cli-cmd-category").value       = cmd.category;
  document.getElementById("cli-icon-select").value        = cmd.icon || "zap";
  document.getElementById("cli-shortcut-input").value     = cmd.shortcut || "";
  document.getElementById("cli-radial-select").value      = cmd.radial_bind != null ? String(cmd.radial_bind) : "";

  const showLang = cmd.category === "shell" || cmd.category === "plugin";
  const langSel  = document.getElementById("cli-lang-select");
  if (langSel) langSel.style.display = showLang ? "" : "none";

  _renderDynamicFields(cmd.category);

  if (cmd.action?.type === "Prompt") {
    document.getElementById("cli-prompt-template")?.setAttribute && (document.getElementById("cli-prompt-template").value = cmd.action.data.template || "");
    if (document.getElementById("cli-prompt-llm")) document.getElementById("cli-prompt-llm").checked = cmd.action.data.use_llm || false;
  } else if (cmd.action?.type === "Shell") {
    if (document.getElementById("cli-shell-command")) document.getElementById("cli-shell-command").value = cmd.action.data.command || "";
    if (document.getElementById("cli-shell-cwd"))     document.getElementById("cli-shell-cwd").value     = cmd.action.data.cwd || "";
  } else if (cmd.action?.type === "View") {
    if (document.getElementById("cli-view-name")) document.getElementById("cli-view-name").value = cmd.action.data.view_name || "chat";
  } else if (cmd.action?.type === "Plugin") {
    if (document.getElementById("cli-plugin-code")) document.getElementById("cli-plugin-code").value = cmd.action.data.lua_code || "";
  }

  // Re-render flags / subcmds
  const flagsList = document.getElementById("cli-flags-list");
  if (flagsList) { flagsList.innerHTML = ""; _flags.forEach(f => _addFlag(f)); }
  const subcmdsList = document.getElementById("cli-subcmds-list");
  if (subcmdsList) { subcmdsList.innerHTML = ""; _subcmds.forEach(s => _addSubcmd(s)); }

  _renderList(document.querySelector("#cli-maker-filters .cli-filter.active")?.dataset.filter || "all");
  _updateHelpPreview();
}

// ── Clear editor ──────────────────────────────────────────────────────────────
function _clearEditor() {
  const els = ["cli-cmd-name","cli-cmd-desc","cli-shortcut-input"];
  els.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  const radial = document.getElementById("cli-radial-select");
  if (radial) radial.value = "";
  const cat = document.getElementById("cli-cmd-category");
  if (cat) cat.value = "prompt";
  _renderDynamicFields("prompt");
  const flagsList = document.getElementById("cli-flags-list");
  if (flagsList) flagsList.innerHTML = "";
  const subcmdsList = document.getElementById("cli-subcmds-list");
  if (subcmdsList) subcmdsList.innerHTML = "";
  _flags = [];
  _subcmds = [];
  _updateHelpPreview();
  _showOutput("No output yet.");
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function _populateIconSelect() {
  const select = document.getElementById("cli-icon-select");
  if (!select) return;
  select.innerHTML = ICONS.map(i => `<option value="${i}">${i}</option>`).join("");
}

function _esc(s) {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
}
