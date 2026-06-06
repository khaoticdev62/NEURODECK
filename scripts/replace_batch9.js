const fs = require('fs');

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

let src = fs.readFileSync('frontend/src/main.js', 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. _mmBuildUI (88 lines) → extract accordion + launch + AI button wiring
// ─────────────────────────────────────────────────────────────────────────────
src = replaceFunction(src, '_mmBuildUI', `function _mmWireAccordions(contentContainer) {
  contentContainer.querySelectorAll(".manual-accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const card = header.closest(".manual-accordion-card");
      const wasExpanded = card.classList.contains("expanded");
      contentContainer.querySelectorAll(".manual-accordion-card.expanded").forEach(otherCard => {
        if (otherCard !== card) {
          otherCard.classList.remove("expanded");
          otherCard.querySelector(".manual-accordion-header").setAttribute("aria-expanded", "false");
          otherCard.querySelector(".manual-accordion-body").style.maxHeight = null;
        }
      });
      card.classList.toggle("expanded", !wasExpanded);
      header.setAttribute("aria-expanded", !wasExpanded ? "true" : "false");
      const body = card.querySelector(".manual-accordion-body");
      body.style.maxHeight = !wasExpanded ? body.scrollHeight + "px" : null;
    });
  });
}

function _mmWireLaunchBtns(contentContainer, mmCtx) {
  contentContainer.querySelectorAll(".launch-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const vid = btn.getAttribute("data-view");
      _mmCloseManual(mmCtx);
      if (vid === "settings") { openSettingsModal(); }
      else if (vid === "plugins") { openSettingsModal(); setTimeout(() => activateSettingsPanel("sp-extensions"), 50); }
      else if (vid === "prompt-sidebar") { openCtrlPromptOverlay(); }
      else { const tab = document.querySelector('.nav-tab[data-view="' + vid + '"]'); if (tab) tab.click(); }
    });
  });
}

function _mmWireAiBtns(contentContainer, mmCtx) {
  contentContainer.querySelectorAll(".ai-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const feature = btn.getAttribute("data-feature");
      _mmCloseManual(mmCtx);
      const chatTab = document.querySelector('.nav-tab[data-view="chat"]');
      if (chatTab) chatTab.click();
      const chatInput = document.getElementById("user-input");
      if (chatInput) {
        chatInput.value = "How do I use the " + feature + " feature in NEURODECK?";
        chatInput.dispatchEvent(new Event("input", { bubbles: true }));
        chatInput.focus();
      }
    });
  });
}

function _mmBuildUI(contentContainer, mmCtx) {
  if (!contentContainer) return;
  const parts = manualContent.split(/\n##\s+/);
  const introMarkdown = parts[0];
  const sections = parts.slice(1);

  let html = '<div class="manual-intro-banner">' + marked.parse(introMarkdown) + '</div>';
  html += '<div class="manual-accordions-list">';

  sections.forEach((sec) => {
    const secLines = sec.split("\n");
    const headingLine = secLines[0].trim();
    const contentMarkdown = secLines.slice(1).join("\n").trim();
    const headingMatch = headingLine.match(/^(\d+)\.\s*([^\s]+)\s+(.*)$/);
    let number = "", emoji = "\u{1F4D6}", title = headingLine;
    if (headingMatch) { number = headingMatch[1]; emoji = headingMatch[2]; title = headingMatch[3]; }
    const cleanTitle = title.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    const viewId = _MANUAL_VIEW_MAPPING[cleanTitle] || "";
    const renderedContent = marked.parse(contentMarkdown);
    html += \`
      <div class="manual-accordion-card" data-title="\${escapeHtml(title)}" data-content="\${escapeHtml(contentMarkdown.toLowerCase())}">
        <button class="manual-accordion-header" aria-expanded="false">
          <span class="manual-header-emoji">\${emoji}</span>
          <span class="manual-header-title"><span class="manual-header-num">\${number}.</span> \${escapeHtml(title)}</span>
          <span class="manual-header-chevron">\${createIcon("chevronDown", { size: 14 })}</span>
        </button>
        <div class="manual-accordion-body">
          <div class="manual-accordion-inner">
            <div class="manual-markdown-content">\${renderedContent}</div>
            <div class="manual-actions-row">
              \${viewId ? \`<button class="manual-action-btn launch-btn" data-view="\${viewId}">\${createIcon("externalLink", { size: 12 })}<span>Launch \${escapeHtml(title.replace(/\s*\(.*\)/g, ""))}</span></button>\` : ""}
              <button class="manual-action-btn ai-btn" data-feature="\${escapeHtml(title.replace(/\s*\(.*\)/g, ""))}">\${createIcon("sparkles", { size: 12 })}<span>Ask AI</span></button>
            </div>
          </div>
        </div>
      </div>
    \`;
  });

  html += '</div>';
  contentContainer.innerHTML = html;
  _mmWireAccordions(contentContainer);
  _mmWireLaunchBtns(contentContainer, mmCtx);
  _mmWireAiBtns(contentContainer, mmCtx);
}`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. updateCanvasToolbarButtons (71 lines) → extract save plugin click handler
// ─────────────────────────────────────────────────────────────────────────────
src = replaceFunction(src, 'updateCanvasToolbarButtons', `function _canvasSavePluginClick() {
  const code = document.getElementById("canvas-editor").value;
  let activeFile = window.neurodeckCanvas.activePluginFile;
  if (activeFile) {
    invoke("save_plugin", { fileName: activeFile, content: code })
      .then(() => { alert(\`Plugin '\${activeFile}' saved successfully.\`); })
      .catch((err) => { alert(\`Failed to save plugin: \${err}\`); });
  } else {
    const fileNameInput = prompt("Enter filename for the new plugin (must end with .lua):", "my_plugin.lua");
    if (!fileNameInput) return;
    let sanitized = fileNameInput.trim();
    if (!sanitized.endsWith(".lua")) sanitized += ".lua";
    if (sanitized.includes("/") || sanitized.includes("\\\\") || sanitized.includes("..")) {
      alert("Invalid file name. Do not include path slashes or dots.");
      return;
    }
    invoke("save_plugin", { fileName: sanitized, content: code })
      .then(() => {
        window.neurodeckCanvas.activePluginFile = sanitized;
        const fileTitle = document.getElementById("canvas-file-title");
        if (fileTitle) fileTitle.textContent = sanitized;
        alert(\`Plugin '\${sanitized}' saved successfully.\`);
      })
      .catch((err) => { alert(\`Failed to save plugin: \${err}\`); });
  }
}

function updateCanvasToolbarButtons() {
  const lang = window.neurodeckCanvas.currentLang;
  let saveBtn = document.getElementById("canvas-save-plugin-btn");
  if (lang === "lua") {
    if (!saveBtn) {
      saveBtn = document.createElement("button");
      saveBtn.className = "canvas-btn";
      saveBtn.id = "canvas-save-plugin-btn";
      saveBtn.innerHTML = \`\${createIcon("save", { size: 14 })}<span>Save Plugin</span>\`;
      saveBtn.style.marginLeft = "8px";
      const runBtn = document.getElementById("canvas-run-btn");
      if (runBtn) runBtn.parentNode.insertBefore(saveBtn, runBtn.nextSibling);
      saveBtn.onclick = () => _canvasSavePluginClick();
    }
    saveBtn.style.display = "inline-block";
  } else {
    if (saveBtn) saveBtn.style.display = "none";
  }
}`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. renderRecommendedModels (70 lines) → extract per-card builder
// ─────────────────────────────────────────────────────────────────────────────
src = replaceFunction(src, 'renderRecommendedModels', `function _recBuildModelCard(m) {
  const tierLabel = TIER_LABEL[m.tier] || m.tier;
  const vramStr = m.vram_mb > 0 ? \`\${m.vram_mb} MB RAM\` : "Cloud";
  const card = document.createElement("div");
  card.className = "agent-rec-card";
  card.addEventListener("click", () => instantiateRecommended(m.provider, m.model, m.name));

  const top = document.createElement("div");
  top.className = "agent-rec-top";
  const name = document.createElement("span");
  name.className = "agent-rec-name";
  name.textContent = String(m.name ?? "");
  const tier = document.createElement("span");
  tier.className = "agent-tier-badge";
  tier.textContent = String(tierLabel);
  top.append(name, tier);

  const meta = document.createElement("div");
  meta.className = "agent-rec-meta";
  const providerBadge = document.createElement("span");
  providerBadge.className = \`agent-provider-badge agent-provider-\${String(m.provider ?? "")}\`;
  providerBadge.textContent = String(PROVIDER_BADGE[m.provider] || m.provider);
  const vram = document.createElement("span");
  vram.className = "agent-vram";
  vram.textContent = vramStr;
  const deck = document.createElement("span");
  deck.className = \`agent-deck-badge\${m.steam_deck_ok ? "" : " warn"}\`;
  deck.textContent = m.steam_deck_ok ? "✅ Deck OK" : "⚠️ Heavy";
  meta.append(providerBadge, vram, deck);

  const desc = document.createElement("div");
  desc.className = "agent-rec-desc";
  desc.textContent = String(m.description ?? "");

  const tags = document.createElement("div");
  tags.className = "agent-rec-tags";
  (m.tags || []).filter((t) => ["recommended", "long-context", "multilingual", "code"].includes(t)).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "agent-tag";
    span.textContent = String(tag);
    tags.appendChild(span);
  });

  const modelId = document.createElement("div");
  modelId.className = "agent-rec-model-id";
  modelId.textContent = String(m.model ?? "");

  card.append(top, meta, desc, tags, modelId);
  return card;
}

function renderRecommendedModels() {
  const grid = document.getElementById("agent-rec-grid");
  if (!grid) return;
  grid.innerHTML = \`<div class="agent-rec-loading">Loading recommendations…</div>\`;
  invoke("get_recommended_models")
    .then((models) => {
      grid.replaceChildren();
      models.forEach((m) => grid.appendChild(_recBuildModelCard(m)));
    })
    .catch(() => {
      grid.innerHTML = \`<div class="agent-empty">Failed to load recommendations.</div>\`;
    });
}`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. initDocsView (161 lines) → extract refresh, search, button wiring
// ─────────────────────────────────────────────────────────────────────────────
src = replaceFunction(src, 'initDocsView', `async function _docsRefreshFileList(ctx) {
  try {
    const files = await invoke("get_indexed_docs");
    ctx.indexedFiles = files;
    const count = await invoke("get_doc_count");
    ctx.countBadge.textContent = \`\${count} chunk\${count === 1 ? "" : "s"} indexed\`;
    if (files.length === 0) {
      ctx.fileList.innerHTML = '<div class="docs-empty-msg">No documents indexed yet.</div>';
      return;
    }
    ctx.fileList.replaceChildren();
    files.forEach((f) => {
      const name = f.replace(/\\\\/g, "/").split("/").pop();
      const row = document.createElement("div");
      row.className = "docs-file-row";
      row.dataset.path = f;
      row.title = f;
      const icon = document.createElement("span");
      icon.className = "docs-file-icon";
      icon.innerHTML = createIcon("file", { size: 14 });
      const fileName = document.createElement("span");
      fileName.className = "docs-file-name";
      fileName.textContent = name;
      const btn = document.createElement("button");
      btn.className = "docs-remove-btn";
      btn.dataset.path = f;
      btn.title = "Remove from index";
      btn.setAttribute("aria-label", \`Remove \${name} from index\`);
      btn.innerHTML = createIcon("x", { size: 12 });
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        btn.innerHTML = createIcon("zap", { size: 12 });
        btn.disabled = true;
        await invoke("remove_indexed_doc", { filePath: btn.dataset.path });
        await _docsRefreshFileList(ctx);
      });
      row.append(icon, fileName, btn);
      ctx.fileList.appendChild(row);
    });
  } catch (_) {
    ctx.countBadge.textContent = "Error loading";
  }
}

async function _docsRunSearch(ctx) {
  const query = ctx.searchInput.value.trim();
  if (!query) return;
  ctx.resultsList.innerHTML = '<div class="docs-search-spinner"></div>';
  ctx.resultsLabel.textContent = "Searching…";
  try {
    const results = await invoke("search_docs_semantic", { query, limit: 10 });
    if (results.length === 0) {
      ctx.resultsList.innerHTML = '<div class="docs-empty-msg">No relevant passages found.</div>';
      ctx.resultsLabel.textContent = "Results — 0 found";
      return;
    }
    ctx.resultsLabel.textContent = \`Results — \${results.length} found\`;
    ctx.resultsList.replaceChildren();
    results.forEach((r) => {
      const pct = Math.round(r.score * 100);
      const name = r.file.replace(/\\\\/g, "/").split("/").pop();
      const row = document.createElement("div");
      row.className = "docs-result-row";
      const header = document.createElement("div");
      header.className = "docs-result-header";
      const file = document.createElement("span");
      file.className = "docs-result-file";
      file.title = r.file;
      const icon = document.createElement("span");
      icon.innerHTML = createIcon("fileText", { size: 13 });
      const label = document.createElement("span");
      label.textContent = name;
      file.append(icon.firstElementChild || icon, label);
      const score = document.createElement("span");
      score.className = "docs-result-score";
      score.textContent = \`\${pct}%\`;
      header.append(file, score);
      const snippet = document.createElement("div");
      snippet.className = "docs-result-snippet";
      snippet.textContent = String(r.snippet ?? "");
      row.append(header, snippet);
      ctx.resultsList.appendChild(row);
    });
  } catch (err) {
    const error = document.createElement("div");
    error.className = "docs-empty-msg";
    error.style.color = "var(--error-color)";
    error.textContent = \`Search failed: \${String(err)}\`;
    ctx.resultsList.replaceChildren(error);
    ctx.resultsLabel.textContent = "Results — error";
  }
}

function _docsWireButtons(searchBtn, indexBtn, clearBtn, ctx) {
  searchBtn.addEventListener("click", () => _docsRunSearch(ctx));
  ctx.searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") _docsRunSearch(ctx); });
  indexBtn.addEventListener("click", async () => {
    const dir = prompt("Enter absolute folder path to index:");
    if (!dir || !dir.trim()) return;
    try {
      indexBtn.disabled = true;
      indexBtn.textContent = "Indexing…";
      await invoke("index_directory", { path: dir.trim() });
      await _docsRefreshFileList(ctx);
      if (window.addNotification)
        window.addNotification("Docs Indexed", \`Folder indexed: \${dir.trim().split(/[\\\\/]/).pop()}\`, "success");
    } catch (err) {
      alert(\`Indexing failed: \${err}\`);
    } finally {
      indexBtn.disabled = false;
      indexBtn.textContent = "+ Index Folder";
    }
  });
  clearBtn.addEventListener("click", async () => {
    if (!confirm("Remove all indexed documents from the knowledge base?")) return;
    await invoke("clear_doc_index");
    await _docsRefreshFileList(ctx);
    ctx.resultsList.innerHTML = '<div class="docs-empty-msg">Search to find relevant passages.</div>';
    ctx.resultsLabel.textContent = "Results";
  });
  document.querySelector('.nav-tab[data-view="docs"]')?.addEventListener("click", () => _docsRefreshFileList(ctx));
}

function initDocsView() {
  const searchInput = document.getElementById("docs-search-input");
  const searchBtn = document.getElementById("docs-search-btn");
  const indexBtn = document.getElementById("docs-index-btn");
  const clearBtn = document.getElementById("docs-clear-btn");
  const fileList = document.getElementById("docs-file-list");
  const resultsList = document.getElementById("docs-results-list");
  const resultsLabel = document.getElementById("docs-results-label");
  const countBadge = document.getElementById("docs-count-badge");
  const ctx = { indexedFiles: [], fileList, countBadge, resultsList, resultsLabel, searchInput };
  _docsWireButtons(searchBtn, indexBtn, clearBtn, ctx);
}`);

fs.writeFileSync('frontend/src/main.js', src);
console.log('Done. Total lines:', src.split('\n').length);
