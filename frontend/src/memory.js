import { invoke } from '@tauri-apps/api/core';
import { createIcon } from './icons.js';

export function initMemoryView() {
    const searchInput = document.getElementById("memory-search-input");
    const refreshBtn = document.getElementById("memory-refresh-btn");
    const factInput = document.getElementById("memory-fact-input");
    const factSaveBtn = document.getElementById("memory-fact-save-btn");
    const listEl = document.getElementById("memory-list");
    const totalCount = document.getElementById("memory-total-count");
    const pinnedCount = document.getElementById("memory-pinned-count");
    const filteredCount = document.getElementById("memory-filtered-count");

    if (!listEl) return;

    let allRecords = [];
    let activeFilter = "all";

    function _nsIcon(ns) {
        const map = { chat: "💬", documents: "📄", game_notes: "🎮", fact: "📌" };
        return map[ns] || "🔹";
    }

    function roleLabel(role) {
        const map = { user: "User", ai: "AI", fact: "Fact" };
        return map[role] || role || "—";
    }

    function roleBadgeClass(role) {
        const map = { user: "mem-role-user", ai: "mem-role-ai", fact: "mem-role-fact" };
        return map[role] || "mem-role-other";
    }

    function tsFromId(id) {
        const m = id.match(/(\d{8})/);
        if (m) {
            const d = m[1];
            return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
        }
        return "";
    }

    function escHtml(s) {
        return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function renderList() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const pinned = allRecords.filter(r => r.metadata.pinned === "true");

        let filtered = allRecords;
        if (activeFilter === "pinned")           filtered = allRecords.filter(r => r.metadata.pinned === "true");
        else if (activeFilter === "user")        filtered = allRecords.filter(r => r.metadata.role === "user");
        else if (activeFilter === "ai")          filtered = allRecords.filter(r => r.metadata.role === "ai");
        else if (activeFilter === "fact")        filtered = allRecords.filter(r => r.metadata.role === "fact");
        else if (activeFilter.startsWith("ns:")) {
            const ns = activeFilter.slice(3);
            filtered = allRecords.filter(r => (r.metadata.namespace || "chat") === ns);
        }

        if (query) {
            filtered = filtered.filter(r => r.content.toLowerCase().includes(query) || r.id.toLowerCase().includes(query));
        }

        filtered.sort((a, b) => {
            const ap = a.metadata.pinned === "true" ? 0 : 1;
            const bp = b.metadata.pinned === "true" ? 0 : 1;
            return ap - bp;
        });

        if (totalCount) totalCount.textContent = `${allRecords.length} record${allRecords.length !== 1 ? "s" : ""}`;
        if (pinnedCount) pinnedCount.textContent = `${pinned.length} pinned`;
        if (filteredCount) filteredCount.textContent = `showing ${filtered.length}`;

        listEl.querySelectorAll(".memory-record-card").forEach(el => el.remove());
        const emptyState = document.getElementById("memory-empty-state");

        if (filtered.length === 0) {
            if (emptyState) {
                emptyState.style.display = "";
                emptyState.querySelector("p").textContent = query || activeFilter !== "all"
                    ? "No records match this filter."
                    : "No memory records yet.";
            }
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        filtered.forEach(record => {
            const isPinned  = record.metadata.pinned === "true";
            const role      = record.metadata.role || "other";
            const ns        = record.metadata.namespace || "chat";
            const sourcePath = record.metadata.source_file || "";
            const gameId    = record.metadata.game_app_id || "";
            const card = document.createElement("div");
            card.className = `memory-record-card${isPinned ? " memory-record-pinned" : ""}`;
            card.dataset.id = record.id;

            const nsBadge = `<span class="memory-ns-badge memory-ns-${escHtml(ns)}" title="Namespace: ${escHtml(ns)}">${_nsIcon(ns)}</span>`;
            const sourceRow = sourcePath
                ? `<div class="memory-record-source">${escHtml(sourcePath)}</div>` : "";
            const gameThumb = gameId
                ? `<img class="memory-game-thumb" src="https://cdn.cloudflare.steamstatic.com/steam/apps/${escHtml(gameId)}/header.jpg"
                       alt="Game ${escHtml(gameId)}" loading="lazy" onerror="this.remove()">` : "";

            card.innerHTML = `
                <div class="memory-record-header">
                    ${nsBadge}
                    <span class="memory-record-role ${roleBadgeClass(role)}">${roleLabel(role)}</span>
                    <span class="memory-record-ts">${tsFromId(record.id)}</span>
                    <div class="memory-record-actions">
                        <button class="memory-icon-btn mem-pin-btn${isPinned ? " pinned" : ""}" title="${isPinned ? "Unpin" : "Pin"}" data-id="${escHtml(record.id)}" data-pinned="${isPinned}">${createIcon('plusCircle', { size: 13 })}</button>
                        <button class="memory-icon-btn mem-del-btn" title="Delete" data-id="${escHtml(record.id)}">${createIcon('trash2', { size: 13 })}</button>
                    </div>
                </div>
                ${gameThumb}
                <div class="memory-record-content">${escHtml(record.content)}</div>
                ${sourceRow}
                <div class="memory-record-id">${escHtml(record.id)}</div>`;

            card.querySelector(".mem-pin-btn").onclick = async function() {
                const id = this.dataset.id;
                const wasPinned = this.dataset.pinned === "true";
                try {
                    await invoke("memory_pin", { id, pinned: !wasPinned });
                    const rec = allRecords.find(r => r.id === id);
                    if (rec) {
                        if (!wasPinned) rec.metadata.pinned = "true";
                        else delete rec.metadata.pinned;
                    }
                    renderList();
                } catch(e) { console.error("pin error", e); }
            };

            card.querySelector(".mem-del-btn").onclick = async function() {
                const id = this.dataset.id;
                if (!confirm("Delete this memory record?")) return;
                try {
                    await invoke("memory_delete", { id });
                    allRecords = allRecords.filter(r => r.id !== id);
                    renderList();
                } catch(e) { console.error("delete error", e); }
            };

            listEl.appendChild(card);
        });
    }

    async function loadMemory() {
        if (refreshBtn) refreshBtn.innerHTML = `${createIcon('refreshCw', { size: 13 })}`;
        try {
            allRecords = await invoke("memory_list_all");
        } catch(e) {
            console.error("memory_list_all error", e);
            allRecords = [];
        }
        allRecords.sort((a, b) => b.id.localeCompare(a.id));
        renderList();
        if (refreshBtn) refreshBtn.innerHTML = `${createIcon('refreshCw', { size: 13 })}<span>Refresh</span>`;
    }

    document.querySelector('[data-view="memory"]')?.addEventListener("click", () => {
        setTimeout(loadMemory, 50);
    });

    if (refreshBtn) refreshBtn.onclick = loadMemory;

    if (searchInput) {
        let debounce = null;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounce);
            debounce = setTimeout(renderList, 200);
        });
    }

    document.querySelectorAll(".memory-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".memory-filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeFilter = btn.dataset.filter;
            renderList();
        });
    });

    async function saveFact() {
        const content = factInput ? factInput.value.trim() : "";
        if (!content) { if (factInput) factInput.focus(); return; }
        if (factSaveBtn) { factSaveBtn.innerHTML = `${createIcon('zap', { size: 13 })}<span>Saving...</span>`; factSaveBtn.disabled = true; }
        try {
            const id = await invoke("memory_add_fact", { content });
            allRecords.unshift({ id, content, metadata: { role: "fact", pinned: "true" } });
            if (factInput) factInput.value = "";
            renderList();
        } catch(e) { console.error("memory_add_fact error", e); }
        if (factSaveBtn) { factSaveBtn.innerHTML = `${createIcon('plusCircle', { size: 13 })}<span>Save Fact</span>`; factSaveBtn.disabled = false; }
    }

    if (factSaveBtn) factSaveBtn.onclick = saveFact;
    if (factInput) {
        factInput.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveFact(); }
        });
    }
}
