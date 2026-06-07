const fs = require('fs');
const src = fs.readFileSync('frontend/src/main.js', 'utf8');
const lines = src.split('\n');

const startIdx = lines.findIndex(l => /^function initManualModal\(\)/.test(l));
if (startIdx < 0) { console.error('not found'); process.exit(1); }
let depth = 0, endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  for (const ch of lines[i]) { if (ch === '{') depth++; if (ch === '}') depth--; }
  if (depth === 0 && i > startIdx) { endIdx = i; break; }
}
console.log('initManualModal:', startIdx+1, '-', endIdx+1);

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);

const replacement = `const _MANUAL_VIEW_MAPPING = {
  "chat": "chat", "canvas": "canvas", "terminal": "terminal",
  "ssh": "ssh", "tunnel": "tunnel", "share": "share", "browser": "browser",
  "agent": "agent", "memory": "memory", "prompt lab": "prompt-lab",
  "remote": "remote", "docs": "docs", "git": "git", "api lab": "api-lab",
  "cli maker": "cli-maker", "graph": "graph", "scheduler": "scheduler",
  "flow": "workflow", "ide": "ide", "settings": "settings",
  "plugins marketplace": "plugins", "prompt sidebar": "prompt-sidebar"
};

function _mmCloseManual(mmCtx) {
  mmCtx.modal.classList.remove("active");
  if (mmCtx.trap) mmCtx.trap.deactivate();
}

function _mmBuildUI(contentContainer, mmCtx) {
  if (!contentContainer) return;
  const parts = manualContent.split(/\\n##\\s+/);
  const introMarkdown = parts[0];
  const sections = parts.slice(1);

  let html = '<div class="manual-intro-banner">' + marked.parse(introMarkdown) + '</div>';
  html += '<div class="manual-accordions-list">';

  sections.forEach((sec) => {
    const secLines = sec.split("\\n");
    const headingLine = secLines[0].trim();
    const contentMarkdown = secLines.slice(1).join("\\n").trim();
    const headingMatch = headingLine.match(/^(\\d+)\\.\\s*([^\\s]+)\\s+(.*)$/);
    let number = "", emoji = "\\u{1F4D6}", title = headingLine;
    if (headingMatch) { number = headingMatch[1]; emoji = headingMatch[2]; title = headingMatch[3]; }
    const cleanTitle = title.toLowerCase().replace(/\\([^)]*\\)/g, "").replace(/[^a-z0-9\\s]/g, "").trim();
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
              \${viewId ? \`<button class="manual-action-btn launch-btn" data-view="\${viewId}">\${createIcon("externalLink", { size: 12 })}<span>Launch \${escapeHtml(title.replace(/\\s*\\(.*\\)/g, ""))}</span></button>\` : ""}
              <button class="manual-action-btn ai-btn" data-feature="\${escapeHtml(title.replace(/\\s*\\(.*\\)/g, ""))}">\${createIcon("sparkles", { size: 12 })}<span>Ask AI</span></button>
            </div>
          </div>
        </div>
      </div>
    \`;
  });

  html += '</div>';
  contentContainer.innerHTML = html;

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

async function _mmRunHealthDiagnostics() {
  const ptyDot = document.getElementById("manual-health-pty");
  const netDot = document.getElementById("manual-health-net");
  const keyDot = document.getElementById("manual-health-key");
  const refreshBtn = document.getElementById("manual-health-refresh");
  if (!ptyDot || !netDot || !keyDot) return;
  ptyDot.className = "health-dot pending";
  netDot.className = "health-dot pending";
  keyDot.className = "health-dot pending";
  if (refreshBtn) refreshBtn.classList.add("spinning");
  try {
    const result = await invoke("run_onboarding_diagnostics");
    ptyDot.className = "health-dot " + (result.pty_ok ? "success" : "error");
    ptyDot.title = result.pty_details || (result.pty_ok ? "PTY working correctly" : "PTY failed");
    netDot.className = "health-dot " + (result.network_ok ? "success" : "error");
    netDot.title = result.network_details || (result.network_ok ? "Network working correctly" : "Network failed");
    keyDot.className = "health-dot " + (result.keychain_ok ? "success" : "error");
    keyDot.title = result.keychain_details || (result.keychain_ok ? "Keychain working correctly" : "Keychain failed");
  } catch (err) {
    console.error("Manual health diagnostics failed:", err);
    [ptyDot, netDot, keyDot].forEach(dot => { dot.className = "health-dot error"; dot.title = String(err); });
  } finally {
    if (refreshBtn) refreshBtn.classList.remove("spinning");
  }
}

function _mmWireSearch(searchInput, contentContainer) {
  if (!searchInput || !contentContainer) return;
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const introBanner = contentContainer.querySelector(".manual-intro-banner");
    if (introBanner) introBanner.style.display = query ? "none" : "";
    contentContainer.querySelectorAll(".manual-accordion-card").forEach(card => {
      const title = card.getAttribute("data-title").toLowerCase();
      const content = card.getAttribute("data-content");
      card.style.display = (title.includes(query) || content.includes(query)) ? "" : "none";
    });
  });
}

function initManualModal() {
  const manualBtn = document.getElementById("manual-btn");
  const manualModal = document.getElementById("manual-modal");
  const closeX = document.getElementById("close-manual-x");
  const closeBtn = document.getElementById("close-manual-btn");
  const contentContainer = document.getElementById("manual-content-container");
  if (!manualBtn || !manualModal) return;

  const mmCtx = { modal: manualModal, trap: null };

  manualBtn.addEventListener("click", () => {
    manualModal.classList.add("active");
    if (!mmCtx.trap) mmCtx.trap = new FocusTrap(manualModal);
    mmCtx.trap.activate();
    if (contentContainer && contentContainer.innerHTML.trim() === "") _mmBuildUI(contentContainer, mmCtx);
    _mmRunHealthDiagnostics();
  });

  const refreshBtn = document.getElementById("manual-health-refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", _mmRunHealthDiagnostics);

  _mmWireSearch(document.getElementById("manual-search"), contentContainer);
  if (closeX) closeX.addEventListener("click", () => _mmCloseManual(mmCtx));
  if (closeBtn) closeBtn.addEventListener("click", () => _mmCloseManual(mmCtx));
}`;

const result = [...before, replacement, ...after].join('\n');
fs.writeFileSync('frontend/src/main.js', result);
console.log('Done. Total lines:', result.split('\n').length);
