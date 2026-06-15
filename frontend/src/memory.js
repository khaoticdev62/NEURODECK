import { invoke } from "./neurobridge.js";
import { createIcon } from "./icons.js";

// ── Utilities ────────────────────────────────────────────────────────────────

function _memEscHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Projects ─────────────────────────────────────────────────────────────────

async function _memLoadProjects(ctx) {
  const listEl = document.getElementById("memory-projects-list");
  if (!listEl) return;
  try {
    ctx.projects = await invoke("list_projects");
  } catch (e) {
    console.error("list_projects error", e);
    ctx.projects = [];
  }
  listEl.innerHTML = "";
  const allItem = document.createElement("div");
  allItem.className = `memory-project-item${ctx.activeProjectId === "" ? " active" : ""}`;
  allItem.dataset.projectId = "";
  allItem.innerHTML = `<span class="memory-project-dot" style="background:#888"></span><span class="memory-project-name">All</span>`;
  allItem.onclick = () => {
    ctx.activeProjectId = "";
    _memSetActiveProject(ctx);
    _memRenderList(ctx);
  };
  listEl.appendChild(allItem);

  ctx.projects.forEach((p) => {
    const item = document.createElement("div");
    item.className = `memory-project-item${ctx.activeProjectId === p.id ? " active" : ""}`;
    item.dataset.projectId = p.id;
    item.innerHTML = `<span class="memory-project-dot" style="background:${_memEscHtml(p.color || "#3b82f6")}"></span><span class="memory-project-name">${_memEscHtml(p.name)}</span>`;
    item.onclick = () => {
      ctx.activeProjectId = p.id;
      _memSetActiveProject(ctx);
      _memRenderList(ctx);
    };
    listEl.appendChild(item);
  });
}

function _memSetActiveProject(ctx) {
  document.querySelectorAll(".memory-project-item[data-project-id]").forEach((el) => {
    el.classList.toggle("active", el.dataset.projectId === (ctx.activeProjectId || ""));
  });
}

async function _memCreateProject(ctx) {
  const name = await showPrompt("Project name:", "", { title: "New Project" });
  if (!name || !name.trim()) return;
  try {
    await invoke("create_project", { name: name.trim(), description: "", color: "#3b82f6" });
    await _memLoadProjects(ctx);
  } catch (e) {
    console.error("create_project error", e);
  }
}

// ── Context Packs ─────────────────────────────────────────────────────────────

async function _memLoadPacks(ctx) {
  const listEl = document.getElementById("memory-packs-list");
  if (!listEl) return;
  try {
    ctx.packs = await invoke("list_packs");
  } catch (e) {
    console.error("list_packs error", e);
    ctx.packs = [];
  }
  listEl.innerHTML = "";
  const allItem = document.createElement("div");
  allItem.className = `memory-project-item${ctx.activePackId === "" ? " active" : ""}`;
  allItem.dataset.packId = "";
  allItem.innerHTML = `<span class="memory-project-dot" style="background:#888"></span><span class="memory-project-name">All</span>`;
  allItem.onclick = () => {
    ctx.activePackId = "";
    _memSetActivePack(ctx);
    _memRenderList(ctx);
  };
  listEl.appendChild(allItem);

  ctx.packs.forEach((p) => {
    const item = document.createElement("div");
    item.className = `memory-project-item${ctx.activePackId === p.id ? " active" : ""}`;
    item.dataset.packId = p.id;
    item.innerHTML = `<span class="memory-project-dot" style="background:${_memEscHtml(p.color || "#8b5cf6")}"></span><span class="memory-project-name">${_memEscHtml(p.name)}</span>`;
    item.onclick = () => {
      ctx.activePackId = p.id;
      _memSetActivePack(ctx);
      _memRenderList(ctx);
    };
    listEl.appendChild(item);
  });
}

function _memSetActivePack(ctx) {
  document.querySelectorAll(".memory-project-item[data-pack-id]").forEach((el) => {
    el.classList.toggle("active", el.dataset.packId === (ctx.activePackId || ""));
  });
}

async function _memCreatePack(ctx) {
  const name = await showPrompt("Context Pack name:", "", { title: "New Context Pack" });
  if (!name || !name.trim()) return;
  try {
    await invoke("create_pack", { name: name.trim(), description: "", color: "#8b5cf6" });
    await _memLoadPacks(ctx);
  } catch (e) {
    console.error("create_pack error", e);
  }
}

function _memNsIcon(ns) {
  const map = { chat: "💬", documents: "📄", game_notes: "🎮", fact: "📌" };
  return map[ns] || "🔹";
}

function _memRoleLabel(role) {
  const map = { user: "User", ai: "AI", fact: "Fact" };
  return map[role] || role || "—";
}

function _memRoleBadgeClass(role) {
  const map = { user: "mem-role-user", ai: "mem-role-ai", fact: "mem-role-fact" };
  return map[role] || "mem-role-other";
}

function _memTsFromId(id) {
  const m = id.match(/(\d{8})/);
  if (!m) return "";
  const d = m[1];
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// ── Card builder ─────────────────────────────────────────────────────────────

function _memBuildRecordCard(record, ctx) {
  const isPinned = record.metadata.pinned === "true";
  const role = record.metadata.role || "other";
  const ns = record.metadata.namespace || "chat";
  const sourcePath = record.metadata.source_file || "";
  const gameId = record.metadata.game_app_id || "";
  const chunkIdx = record.metadata.chunk_index;
  const chunkTotal = record.metadata.chunk_total;

  const nsBadge = `<span class="memory-ns-badge memory-ns-${_memEscHtml(ns)}" title="Namespace: ${_memEscHtml(ns)}">${_memNsIcon(ns)}</span>`;
  const sourceRow = sourcePath
    ? `<div class="memory-record-source">${_memEscHtml(sourcePath)}</div>`
    : "";
  const chunkBc =
    chunkIdx !== undefined && chunkTotal !== undefined
      ? `<div class="memory-chunk-breadcrumb"><span class="memory-chunk-icon">⛶</span> chunk ${chunkIdx}/${chunkTotal}</div>`
      : "";
  const gameThumb = gameId
    ? `<img class="memory-game-thumb" src="https://cdn.cloudflare.steamstatic.com/steam/apps/${_memEscHtml(gameId)}/header.jpg" alt="Game ${_memEscHtml(gameId)}" loading="lazy" onerror="this.remove()">`
    : "";

  const projectOptions = (ctx.projects || [])
    .map(
      (p) =>
        `<option value="${_memEscHtml(p.id)}"${record.project_id === p.id ? " selected" : ""}>${_memEscHtml(p.name)}</option>`
    )
    .join("");
  const projectSelect = `<select class="mem-project-select" data-id="${_memEscHtml(record.id)}" title="Project"><option value="">—</option>${projectOptions}</select>`;

  const packOptions = (ctx.packs || [])
    .map(
      (p) =>
        `<option value="${_memEscHtml(p.id)}"${record.pack_id === p.id ? " selected" : ""}>${_memEscHtml(p.name)}</option>`
    )
    .join("");
  const packSelect = `<select class="mem-pack-select" data-id="${_memEscHtml(record.id)}" title="Context Pack"><option value="">—</option>${packOptions}</select>`;

  const card = document.createElement("div");
  card.className = `memory-record-card${isPinned ? " memory-record-pinned" : ""}`;
  card.dataset.id = record.id;
  card.innerHTML = `
        <div class="memory-record-header">
            ${nsBadge}
            <span class="memory-record-role ${_memRoleBadgeClass(role)}">${_memRoleLabel(role)}</span>
            <span class="memory-record-ts">${_memTsFromId(record.id)}</span>
            ${projectSelect}${packSelect}
            <div class="memory-record-actions">
                <button class="memory-icon-btn mem-pin-btn${isPinned ? " pinned" : ""}" title="${isPinned ? "Unpin" : "Pin"}" data-id="${_memEscHtml(record.id)}" data-pinned="${isPinned}">${createIcon("plusCircle", { size: 13 })}</button>
                <button class="memory-icon-btn mem-del-btn" title="Delete" data-id="${_memEscHtml(record.id)}">${createIcon("trash2", { size: 13 })}</button>
            </div>
        </div>
        ${gameThumb}
        <div class="memory-record-content">${_memEscHtml(record.content)}</div>
        ${sourceRow}${chunkBc}
        <div class="memory-record-id">${_memEscHtml(record.id)}</div>`;

  card.querySelector(".mem-pin-btn").onclick = async function () {
    const id = this.dataset.id;
    const wasPinned = this.dataset.pinned === "true";
    try {
      await invoke("memory_pin", { id, pinned: !wasPinned });
      const rec = ctx.allRecords.find((r) => r.id === id);
      if (rec) {
        if (!wasPinned) rec.metadata.pinned = "true";
        else delete rec.metadata.pinned;
      }
      _memRenderList(ctx);
    } catch (e) {
      console.error("pin error", e);
    }
  };

  card.querySelector(".mem-del-btn").onclick = async function () {
    const id = this.dataset.id;
    const confirmed = await showConfirm("Delete this memory record?", {
      confirmText: "Delete",
      cancelText: "Keep",
    });
    if (!confirmed) return;
    try {
      await invoke("memory_delete", { id });
      ctx.allRecords = ctx.allRecords.filter((r) => r.id !== id);
      _memRenderList(ctx);
    } catch (e) {
      console.error("delete error", e);
    }
  };

  // Project assignment dropdown
  const projSelectEl = card.querySelector(".mem-project-select");
  if (projSelectEl) {
    projSelectEl.onchange = async function () {
      const memoryId = this.dataset.id;
      const projectId = this.value || null;
      try {
        await invoke("set_memory_project", { memory_id: memoryId, project_id: projectId });
        const rec = ctx.allRecords.find((r) => r.id === memoryId);
        if (rec) rec.project_id = projectId || undefined;
      } catch (e) {
        console.error("set_memory_project error", e);
      }
    };
  }

  // Pack assignment dropdown
  const packSelectEl = card.querySelector(".mem-pack-select");
  if (packSelectEl) {
    packSelectEl.onchange = async function () {
      const memoryId = this.dataset.id;
      const packId = this.value || null;
      try {
        await invoke("set_memory_pack", { memory_id: memoryId, pack_id: packId });
        const rec = ctx.allRecords.find((r) => r.id === memoryId);
        if (rec) rec.pack_id = packId || undefined;
      } catch (e) {
        console.error("set_memory_pack error", e);
      }
    };
  }

  return card;
}

// ── List renderer ─────────────────────────────────────────────────────────────

function _memRenderList(ctx) {
  const { listEl, searchInput, totalCount, pinnedCount, filteredCount } = ctx;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const pinned = ctx.allRecords.filter((r) => r.metadata.pinned === "true");

  let filtered = ctx.allRecords;
  if (ctx.activeFilter === "pinned")
    filtered = ctx.allRecords.filter((r) => r.metadata.pinned === "true");
  else if (ctx.activeFilter === "user")
    filtered = ctx.allRecords.filter((r) => r.metadata.role === "user");
  else if (ctx.activeFilter === "ai")
    filtered = ctx.allRecords.filter((r) => r.metadata.role === "ai");
  else if (ctx.activeFilter === "fact")
    filtered = ctx.allRecords.filter((r) => r.metadata.role === "fact");
  else if (ctx.activeFilter.startsWith("ns:")) {
    const ns = ctx.activeFilter.slice(3);
    filtered = ctx.allRecords.filter((r) => (r.metadata.namespace || "chat") === ns);
  }
  if (ctx.activeProjectId) {
    filtered = filtered.filter((r) => r.project_id === ctx.activeProjectId);
  }
  if (ctx.activePackId) {
    filtered = filtered.filter((r) => r.pack_id === ctx.activePackId);
  }
  if (query)
    filtered = filtered.filter(
      (r) => r.content.toLowerCase().includes(query) || r.id.toLowerCase().includes(query)
    );
  filtered.sort(
    (a, b) => (a.metadata.pinned === "true" ? 0 : 1) - (b.metadata.pinned === "true" ? 0 : 1)
  );

  if (totalCount)
    totalCount.textContent = `${ctx.allRecords.length} record${ctx.allRecords.length !== 1 ? "s" : ""}`;
  if (pinnedCount) pinnedCount.textContent = `${pinned.length} pinned`;
  if (filteredCount) filteredCount.textContent = `showing ${filtered.length}`;

  listEl.querySelectorAll(".memory-record-card").forEach((el) => el.remove());
  const emptyState = document.getElementById("memory-empty-state");

  if (filtered.length === 0) {
    if (emptyState) {
      emptyState.style.display = "";
      emptyState.querySelector("p").textContent =
        query || ctx.activeFilter !== "all"
          ? "No records match this filter."
          : "No memory records yet.";
    }
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  filtered.forEach((record) => listEl.appendChild(_memBuildRecordCard(record, ctx)));
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function _memLoad(ctx) {
  const { refreshBtn } = ctx;
  if (refreshBtn) refreshBtn.innerHTML = `${createIcon("refreshCw", { size: 13 })}`;
  try {
    const _memRes = await invoke("memory_list_all");
    ctx.allRecords = Array.isArray(_memRes) ? _memRes : (_memRes?.records ?? []);
  } catch (e) {
    console.error("memory_list_all error", e);
    ctx.allRecords = [];
  }
  ctx.allRecords.sort((a, b) => b.id.localeCompare(a.id));
  _memRenderList(ctx);
  if (refreshBtn)
    refreshBtn.innerHTML = `${createIcon("refreshCw", { size: 13 })}<span>Refresh</span>`;
}

// ── Save Fact ─────────────────────────────────────────────────────────────────

async function _memSaveFact(ctx) {
  const { factInput, factSaveBtn } = ctx;
  const content = factInput ? factInput.value.trim() : "";
  if (!content) {
    if (factInput) factInput.focus();
    return;
  }
  if (factSaveBtn) {
    factSaveBtn.innerHTML = `${createIcon("zap", { size: 13 })}<span>Saving...</span>`;
    factSaveBtn.disabled = true;
  }
  try {
    const id = await invoke("memory_add_fact", { content });
    ctx.allRecords.unshift({ id, content, metadata: { role: "fact", pinned: "true" } });
    if (factInput) factInput.value = "";
    _memRenderList(ctx);
  } catch (e) {
    console.error("memory_add_fact error", e);
  }
  if (factSaveBtn) {
    factSaveBtn.innerHTML = `${createIcon("plusCircle", { size: 13 })}<span>Save Fact</span>`;
    factSaveBtn.disabled = false;
  }
}

// ── Backup list ───────────────────────────────────────────────────────────────

function _memBuildBackupRow(b, ctx) {
  const row = document.createElement("div");
  row.className = "memory-backup-row";
  row.innerHTML = `
        <div class="memory-backup-meta">
            <span class="memory-backup-name">${_memEscHtml(b.name)}</span>
            <span class="memory-backup-date">${_memEscHtml(b.created_at)}</span>
            <span class="memory-backup-count">${b.record_count} records</span>
        </div>
        <button class="memory-btn memory-btn-restore" data-name="${_memEscHtml(b.name)}" aria-label="Restore ${_memEscHtml(b.name)}">Restore</button>`;
  row.querySelector(".memory-btn-restore").onclick = async function () {
    const name = this.dataset.name;
    const confirmed = await showConfirm(
      `Restore from backup "${name}"?\nThis will REPLACE all current memory records.`,
      { confirmText: "Restore", cancelText: "Cancel" }
    );
    if (!confirmed) return;
    this.disabled = true;
    this.textContent = "Restoring…";
    try {
      await invoke("memory_restore_backup", { backupName: name });
      window.addNotification?.("Memory Restored", `Restored from ${name}`, "success");
      await _memLoad(ctx);
    } catch (e) {
      window.addNotification?.("Restore Failed", String(e), "error");
      this.disabled = false;
      this.textContent = "Restore";
    }
  };
  return row;
}

async function _memRenderBackupList(ctx) {
  const { backupList } = ctx;
  if (!backupList) return;
  backupList.innerHTML = '<div class="memory-backup-empty">Loading…</div>';
  try {
    const backups = await invoke("memory_list_backups");
    if (backups.length === 0) {
      backupList.innerHTML =
        '<div class="memory-backup-empty">No backups yet. Click 💾 Backup to create one.</div>';
      return;
    }
    backupList.innerHTML = "";
    backups.forEach((b) => backupList.appendChild(_memBuildBackupRow(b, ctx)));
  } catch (e) {
    backupList.innerHTML = `<div class="memory-backup-empty">Error: ${_memEscHtml(String(e))}</div>`;
  }
}

// ── Export / Import / Backup wiring ──────────────────────────────────────────

function _memInitDataButtons(ctx) {
  const exportBtn = document.getElementById("memory-export-btn");
  if (exportBtn) {
    exportBtn.onclick = async function () {
      exportBtn.disabled = true;
      exportBtn.textContent = "Exporting…";
      try {
        const path = await invoke("memory_export");
        window.addNotification?.("Memory Exported", `Saved to: ${path}`, "success");
      } catch (e) {
        window.addNotification?.("Export Failed", String(e), "error");
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = "⬆ Export";
      }
    };
  }

  const importFile = document.getElementById("memory-import-file");
  const importLabel = document.querySelector("label[for='memory-import-file']");
  if (importFile) {
    importFile.onchange = async function () {
      const file = importFile.files?.[0];
      if (!file) return;
      const merge = await showConfirm(
        `Import "${file.name}"?\n\nClick OK to MERGE.\nClick Cancel to REPLACE all current memory.`
      );
      if (importLabel) importLabel.textContent = "Importing…";
      try {
        const count = await invoke("memory_import_data", { data: await file.text(), merge });
        window.addNotification?.(
          "Memory Imported",
          `${count} records ${merge ? "merged" : "replaced"}.`,
          "success"
        );
        await _memLoad(ctx);
      } catch (e) {
        window.addNotification?.("Import Failed", String(e), "error");
      } finally {
        if (importLabel) importLabel.textContent = "⬇ Import";
        importFile.value = "";
      }
    };
  }

  const backupBtn = document.getElementById("memory-backup-btn");
  if (backupBtn) {
    backupBtn.onclick = async function () {
      backupBtn.disabled = true;
      backupBtn.textContent = "Backing up…";
      try {
        const path = await invoke("memory_backup_auto");
        window.addNotification?.("Backup Created", `Saved to: ${path}`, "success");
      } catch (e) {
        window.addNotification?.("Backup Failed", String(e), "error");
      } finally {
        backupBtn.disabled = false;
        backupBtn.textContent = "💾 Backup";
      }
    };
  }

  const showBackupsBtn = document.getElementById("memory-show-backups-btn");
  const backupPanel = document.getElementById("memory-backup-panel");
  const backupClose = document.getElementById("memory-backup-close");
  ctx.backupList = document.getElementById("memory-backup-list");
  if (showBackupsBtn && backupPanel) {
    showBackupsBtn.onclick = async function () {
      const open = backupPanel.style.display !== "none";
      backupPanel.style.display = open ? "none" : "";
      showBackupsBtn.setAttribute("aria-expanded", String(!open));
      if (!open) await _memRenderBackupList(ctx);
    };
  }
  if (backupClose && backupPanel) {
    backupClose.onclick = function () {
      backupPanel.style.display = "none";
      document.getElementById("memory-show-backups-btn")?.setAttribute("aria-expanded", "false");
    };
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function initMemoryView() {
  const listEl = document.getElementById("memory-list");
  if (!listEl) return;

  const ctx = {
    listEl,
    searchInput: document.getElementById("memory-search-input"),
    refreshBtn: document.getElementById("memory-refresh-btn"),
    factInput: document.getElementById("memory-fact-input"),
    factSaveBtn: document.getElementById("memory-fact-save-btn"),
    totalCount: document.getElementById("memory-total-count"),
    pinnedCount: document.getElementById("memory-pinned-count"),
    filteredCount: document.getElementById("memory-filtered-count"),
    backupList: null,
    allRecords: [],
    activeFilter: "all",
    activeProjectId: "",
    projects: [],
    activePackId: "",
    packs: [],
  };

  document.querySelector('[data-view="memory"]')?.addEventListener("click", () =>
    setTimeout(() => {
      _memLoad(ctx);
      _memLoadProjects(ctx);
      _memLoadPacks(ctx);
    }, 50)
  );
  if (ctx.refreshBtn)
    ctx.refreshBtn.onclick = () => {
      _memLoad(ctx);
      _memLoadProjects(ctx);
      _memLoadPacks(ctx);
    };

  const addProjectBtn = document.getElementById("memory-project-add-btn");
  if (addProjectBtn) addProjectBtn.onclick = () => _memCreateProject(ctx);

  const addPackBtn = document.getElementById("memory-pack-add-btn");
  if (addPackBtn) addPackBtn.onclick = () => _memCreatePack(ctx);

  if (ctx.searchInput) {
    let debounce = null;
    ctx.searchInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => _memRenderList(ctx), 200);
    });
  }

  document.querySelectorAll(".memory-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".memory-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ctx.activeFilter = btn.dataset.filter;
      _memRenderList(ctx);
    });
  });

  if (ctx.factSaveBtn) ctx.factSaveBtn.onclick = () => _memSaveFact(ctx);
  if (ctx.factInput)
    ctx.factInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        _memSaveFact(ctx);
      }
    });

  _memInitDataButtons(ctx);
}
