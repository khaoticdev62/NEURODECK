const ICONS = {
  menu: `
    <line x1="4" y1="7" x2="20" y2="7"></line>
    <line x1="4" y1="12" x2="20" y2="12"></line>
    <line x1="4" y1="17" x2="20" y2="17"></line>
  `,
  panelLeftClose: `
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
    <path d="M9 4v16"></path>
    <path d="m15 9-3 3 3 3"></path>
  `,
  panelRightOpen: `
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
    <path d="M15 4v16"></path>
    <path d="m9 9 3 3-3 3"></path>
  `,
  arrowLeft: `
    <path d="M19 12H5"></path>
    <path d="m12 19-7-7 7-7"></path>
  `,
  arrowRight: `
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  `,
  arrowUpRight: `
    <path d="M7 17 17 7"></path>
    <path d="M7 7h10v10"></path>
  `,
  house: `
    <path d="M3 11 12 4l9 7"></path>
    <path d="M5 10v10h14V10"></path>
  `,
  clock3: `
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 7v5l3 3"></path>
  `,
  plus: `
    <path d="M12 5v14"></path>
    <path d="M5 12h14"></path>
  `,
  minus: `
    <path d="M5 12h14"></path>
  `,
  messageSquare: `
    <path d="M7 18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-4 3z"></path>
  `,
  code2: `
    <path d="m9 18-6-6 6-6"></path>
    <path d="m15 6 6 6-6 6"></path>
  `,
  squareTerminal: `
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
    <path d="m7 9 3 3-3 3"></path>
    <path d="M13 15h4"></path>
  `,
  server: `
    <rect x="4" y="4" width="16" height="6" rx="2"></rect>
    <rect x="4" y="14" width="16" height="6" rx="2"></rect>
    <path d="M8 7h.01"></path>
    <path d="M8 17h.01"></path>
  `,
  route: `
    <circle cx="6" cy="19" r="2"></circle>
    <circle cx="18" cy="5" r="2"></circle>
    <path d="M8 19h4a2 2 0 0 0 2-2V7"></path>
    <path d="M14 7h2"></path>
  `,
  share2: `
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <path d="m8.6 13.5 6.8 4"></path>
    <path d="m15.4 6.5-6.8 4"></path>
  `,
  globe: `
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M3 12h18"></path>
    <path d="M12 3a14 14 0 0 1 0 18"></path>
    <path d="M12 3a14 14 0 0 0 0 18"></path>
  `,
  bot: `
    <rect x="5" y="8" width="14" height="11" rx="2"></rect>
    <path d="M12 4v4"></path>
    <path d="M8 12h.01"></path>
    <path d="M16 12h.01"></path>
    <path d="M9 16h6"></path>
  `,
  brain: `
    <path d="M9.5 4A3.5 3.5 0 0 0 6 7.5V9a2.5 2.5 0 0 0-1 4.8V15a3 3 0 0 0 3 3h1"></path>
    <path d="M14.5 4A3.5 3.5 0 0 1 18 7.5V9a2.5 2.5 0 0 1 1 4.8V15a3 3 0 0 1-3 3h-1"></path>
    <path d="M12 4v16"></path>
    <path d="M9 12h6"></path>
  `,
  fileText: `
    <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
    <path d="M9 13h6"></path>
    <path d="M9 17h6"></path>
  `,
  volume2: `
    <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
    <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
    <path d="M18.5 6a8.5 8.5 0 0 1 0 12"></path>
  `,
  bell: `
    <path d="M10.3 21a2 2 0 0 0 3.4 0"></path>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path>
  `,
  settings2: `
    <path d="M12 3v3"></path>
    <path d="M12 18v3"></path>
    <path d="m4.9 4.9 2.1 2.1"></path>
    <path d="m17 17 2.1 2.1"></path>
    <path d="M3 12h3"></path>
    <path d="M18 12h3"></path>
    <path d="m4.9 19.1 2.1-2.1"></path>
    <path d="M17 7l2.1-2.1"></path>
    <circle cx="12" cy="12" r="3"></circle>
  `,
  sparkles: `
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"></path>
    <path d="M5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16z"></path>
  `,
  x: `
    <path d="M18 6 6 18"></path>
    <path d="m6 6 12 12"></path>
  `,
  mic: `
    <rect x="9" y="3" width="6" height="12" rx="3"></rect>
    <path d="M5 11a7 7 0 0 0 14 0"></path>
    <path d="M12 18v3"></path>
  `,
  camera: `
    <path d="M4 8h3l2-3h6l2 3h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path>
    <circle cx="12" cy="13" r="3.5"></circle>
  `,
  sendHorizontal: `
    <path d="m3 12 18-9-4 9 4 9-18-9z"></path>
    <path d="M17 12H7"></path>
  `,
  play: `
    <path d="m8 6 10 6-10 6z"></path>
  `,
  pause: `
    <path d="M8 6v12"></path>
    <path d="M16 6v12"></path>
  `,
  copy: `
    <rect x="9" y="9" width="11" height="11" rx="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  `,
  clipboard: `
    <rect x="7" y="4" width="10" height="16" rx="2"></rect>
    <path d="M9 4.5h6"></path>
    <path d="M10 2h4a1 1 0 0 1 1 1v2H9V3a1 1 0 0 1 1-1z"></path>
  `,
  info: `
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 10v6"></path>
    <path d="M12 7h.01"></path>
  `,
  save: `
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path>
    <path d="M7 3v6h8"></path>
    <path d="M8 21V13h8v8"></path>
  `,
  folderOpen: `
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"></path>
    <path d="M3 10h18l-2 8a2 2 0 0 1-2 1.5H6a2 2 0 0 1-2-1.5z"></path>
  `,
  loaderCircle: `
    <path d="M21 12a9 9 0 1 1-6.22-8.56"></path>
  `,
  eraser: `
    <path d="m7 21 10-10"></path>
    <path d="m5 19-2-2a2 2 0 0 1 0-2.8l7.2-7.2a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12 21"></path>
    <path d="M16 8 8 16"></path>
  `,
  wand2: `
    <path d="m21 7-1.5 1.5"></path>
    <path d="M15 3h1"></path>
    <path d="M18 6V5"></path>
    <path d="m3 21 9-9"></path>
    <path d="m14.5 6.5 3 3"></path>
  `,
  users: `
    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="10" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.9"></path>
    <path d="M16 3.1a4 4 0 0 1 0 7.8"></path>
  `,
  refreshCw: `
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"></path>
  `,
  plusCircle: `
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 8v8"></path>
    <path d="M8 12h8"></path>
  `,
  search: `
    <circle cx="11" cy="11" r="7"></circle>
    <path d="m21 21-4.3-4.3"></path>
  `,
  zap: `
    <path d="M13 2 4 14h6l-1 8 9-12h-6z"></path>
  `,
  gamepad2: `
    <line x1="6" y1="11" x2="10" y2="11"></line>
    <line x1="8" y1="9" x2="8" y2="13"></line>
    <line x1="15" y1="12" x2="15.01" y2="12"></line>
    <line x1="18" y1="10" x2="18.01" y2="10"></line>
    <path d="M6 12h-.8a2.2 2.2 0 0 1-2.2-2.2V9a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v.8a2.2 2.2 0 0 1-2.2 2.2H18"></path>
    <path d="m6 12-2 6"></path>
    <path d="m18 12 2 6"></path>
    <path d="M8 18h8"></path>
  `,
  shieldCheck: `
    <path d="M12 3 5 6v6c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6z"></path>
    <path d="m9 12 2 2 4-4"></path>
  `,
  chartColumn: `
    <path d="M3 3v18h18"></path>
    <path d="M7 15v-3"></path>
    <path d="M12 15V8"></path>
    <path d="M17 15v-6"></path>
  `,
  bug: `
    <path d="m8 2 1.9 1.9"></path>
    <path d="M14.1 3.9 16 2"></path>
    <path d="M9 7h6"></path>
    <rect x="7" y="7" width="10" height="12" rx="5"></rect>
    <path d="M5 13h2"></path>
    <path d="M17 13h2"></path>
    <path d="M5 9h2"></path>
    <path d="M17 9h2"></path>
    <path d="M10 19v3"></path>
    <path d="M14 19v3"></path>
  `,
  volumeX: `
    <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
    <path d="m16 9 5 5"></path>
    <path d="m21 9-5 5"></path>
  `,
  trash2: `
    <path d="M3 6h18"></path>
    <path d="M8 6V4h8v2"></path>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
  `,
  download: `
    <path d="M12 3v12"></path>
    <path d="m7 10 5 5 5-5"></path>
    <path d="M5 21h14"></path>
  `,
  folder: `
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  `,
  file: `
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
    <path d="M14 2v5h5"></path>
  `,
  upload: `
    <path d="M12 16V6"></path>
    <path d="m7 11 5-5 5 5"></path>
    <path d="M20 16.5v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5"></path>
  `
};

function createIcon(name, { size = 16, className = "" } = {}) {
  const markup = ICONS[name];
  if (!markup) return "";
  return `
    <span class="nd-icon-wrap ${className}">
      <svg class="nd-icon-svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">
        ${markup}
      </svg>
    </span>
  `;
}

function normalizeLabel(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/^[^A-Za-z0-9[\(]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyButtonIcon(selector, config) {
  const el = document.querySelector(selector);
  if (!el) return;

  const {
    icon,
    label = null,
    iconOnly = false,
    keepBadge = false,
    trailingIcon = false,
    size = 16,
  } = config;

  const badgeMarkup = keepBadge
    ? Array.from(el.children)
        .filter((node) => node.classList?.contains("notif-badge"))
        .map((node) => node.outerHTML)
        .join("")
    : "";

  const resolvedLabel = label ?? normalizeLabel(el.textContent);
  const iconMarkup = createIcon(icon, { size });
  const labelMarkup = !iconOnly && resolvedLabel
    ? `<span class="nd-button-label">${resolvedLabel}</span>`
    : "";

  el.classList.add("nd-icon-button");
  if (iconOnly) {
    el.classList.add("nd-icon-only");
    el.innerHTML = `${iconMarkup}${badgeMarkup}`;
    if (el.title && !el.getAttribute("aria-label")) {
      el.setAttribute("aria-label", el.title);
    }
    return;
  }

  el.classList.remove("nd-icon-only");
  el.classList.toggle("nd-icon-trailing", trailingIcon);
  el.innerHTML = trailingIcon
    ? `${labelMarkup}${iconMarkup}${badgeMarkup}`
    : `${iconMarkup}${labelMarkup}${badgeMarkup}`;
}

function applyInlineTitleIcon(selector, icon, label) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add("nd-inline-icon-label");
  el.innerHTML = `${createIcon(icon, { size: 15 })}<span class="nd-inline-label">${label ?? normalizeLabel(el.textContent)}</span>`;
}

export function applyNeurodeckIconography() {
  [
    ["#sidebar-close-btn", { icon: "panelLeftClose", iconOnly: true }],
    ["#sidebar-toggle-btn", { icon: "menu", iconOnly: true }],
    ["#inspect-close-btn", { icon: "panelRightOpen", iconOnly: true }],
    ["#close-collab-x", { icon: "x", iconOnly: true }],
    ["#close-settings-x", { icon: "x", iconOnly: true }],
    ["#transfer-modal-close-x", { icon: "x", iconOnly: true }],
    ["#close-game-context-x", { icon: "x", iconOnly: true }],
    ["#computer-use-deny-x", { icon: "x", iconOnly: true }],
    ["#close-notif-x", { icon: "x", iconOnly: true }],
    ["#new-chat-btn", { icon: "plusCircle", label: "New Chat" }],
    ["#new-chat-btn-header", { icon: "plus", label: "New" }],
    ["#mute-btn", { icon: "volume2", iconOnly: true, keepBadge: true }],
    ["#notif-btn", { icon: "bell", iconOnly: true, keepBadge: true }],
    ["#settings-btn", { icon: "settings2", iconOnly: true }],
    ["#mic-btn", { icon: "mic", iconOnly: true }],
    ["#toggle-drawer-btn", { icon: "panelRightOpen", iconOnly: true }],
    ["#screenshot-btn", { icon: "camera", iconOnly: true }],
    ["#send-btn", { icon: "sendHorizontal", label: "Send", trailingIcon: true }],
    ["#canvas-run-btn", { icon: "play", label: "Run" }],
    ["#canvas-copy-btn", { icon: "copy", label: "Copy" }],
    ["#canvas-clear-btn", { icon: "eraser", label: "Clear" }],
    ["#canvas-ai-edit-btn", { icon: "wand2", label: "AI Edit" }],
    ["#canvas-collab-btn", { icon: "users", label: "Collab" }],
    ["#canvas-collab-resync-btn", { icon: "refreshCw", label: "Force Resync" }],
    ["#canvas-refresh-btn", { icon: "refreshCw", iconOnly: true }],
    ["#terminal-add-tab-btn", { icon: "plus", iconOnly: true }],
    ["#term-clear-btn", { icon: "eraser", iconOnly: true }],
    ["#pty-reconnect-btn", { icon: "refreshCw", iconOnly: true }],
    ["#term-font-dec-btn", { icon: "minus", label: "A-" }],
    ["#term-font-inc-btn", { icon: "plus", label: "A+" }],
    ["#ssh-save-profile-btn", { icon: "plus", label: "Save Profile" }],
    ["#share-send-btn", { icon: "sendHorizontal", label: "Send File", trailingIcon: true }],
    ["#ftp-save-profile-btn", { icon: "plus", label: "Save Profile" }],
    ["#ftp-upload-btn", { icon: "upload", label: "Upload" }],
    ["#sftp-save-profile-btn", { icon: "plus", label: "Save Profile" }],
    ["#sftp-upload-btn", { icon: "upload", label: "Upload" }],
    ["#ftp-connect-btn", { icon: "globe", label: "Connect & List" }],
    ["#sftp-connect-btn", { icon: "server", label: "Connect & List" }],
    ["#share-group-code-save-btn", { icon: "shieldCheck", label: "Apply" }],
    ["#browser-back-btn", { icon: "arrowLeft", iconOnly: true }],
    ["#browser-forward-btn", { icon: "arrowRight", iconOnly: true }],
    ["#browser-refresh-btn", { icon: "refreshCw", iconOnly: true }],
    ["#browser-home-btn", { icon: "house", iconOnly: true }],
    ["#browser-url-clear-btn", { icon: "x", iconOnly: true }],
    ["#browser-go-btn", { icon: "sendHorizontal", label: "Go", trailingIcon: true }],
    ["#browser-open-ext-btn", { icon: "arrowUpRight", label: "Open Ext", trailingIcon: true }],
    ["#remote-start-btn", { icon: "play", label: "Start Server" }],
    ["#remote-stop-btn", { icon: "x", label: "Stop Server" }],
    ["#remote-copy-url-btn", { icon: "copy", iconOnly: true }],
    ["#docs-index-btn", { icon: "plusCircle", label: "Index Folder" }],
    ["#docs-clear-btn", { icon: "x", label: "Clear" }],
    ["#pl-open-gallery-btn", { icon: "fileText", label: "Templates" }],
    ["#pl-save-preset-btn", { icon: "save", label: "Save" }],
    ["#pl-toggle-preset-input-btn", { icon: "save", iconOnly: true }],
    ["#pl-optimize-ai-btn", { icon: "zap", label: "AI Optimize" }],
    ["#pl-generate-btn", { icon: "zap", label: "Generate Prompt" }],
    ["#pl-history-btn", { icon: "clock3", iconOnly: true }],
    ["#pl-copy-prompt-btn", { icon: "copy", label: "Copy" }],
    ["#pl-send-chat-btn", { icon: "messageSquare", label: "Chat" }],
    ["#pl-export-json-btn", { icon: "fileText", label: "JSON" }],
    ["#pl-export-lua-btn", { icon: "settings2", label: "Lua" }],
    ["#pl-explain-jpe-btn", { icon: "search", label: "Explain" }],
    ["#pl-copy-jpe-btn", { icon: "copy", label: "Copy" }],
    ["#pl-gallery-close", { icon: "x", iconOnly: true }],
    ["#pl-advanced-toggle", { icon: "settings2", label: "Few-Shot Examples" }],
  ].forEach(([selector, config]) => applyButtonIcon(selector, config));

  [
    ["chat", "messageSquare", "Chat"],
    ["canvas", "code2", "Canvas"],
    ["terminal", "squareTerminal", "Terminal"],
    ["ssh", "server", "SSH"],
    ["tunnel", "route", "Tunnel"],
    ["share", "share2", "Share"],
    ["browser", "globe", "Browser"],
    ["agent", "bot", "Agent"],
    ["memory", "brain", "Memory"],
    ["prompt-lab", "sparkles", "Prompt Lab"],
    ["remote", "panelRightOpen", "Remote"],
    ["docs", "fileText", "Docs"],
  ].forEach(([view, icon, label]) => {
    applyButtonIcon(`.nav-tab[data-view="${view}"]`, { icon, label });
  });

  [
    ["lan", "share2", "LAN"],
    ["sftp", "server", "SFTP"],
    ["ftp", "globe", "FTP"],
  ].forEach(([panel, icon, label]) => {
    applyButtonIcon(`.share-inner-tab[data-panel="${panel}"]`, { icon, label });
  });

  [
    ["#agent-switcher-title", "sparkles", "Agent Switch"],
    [".share-view-title", "share2", "Share & Transfer"],
    [".history-search-title", "search", "AI Shell History Search"],
    [".remote-title", "panelRightOpen", "Remote Control"],
    [".docs-title", "fileText", "Knowledge Base"],
  ].forEach(([selector, icon, label]) => applyInlineTitleIcon(selector, icon, label));

  applyButtonIcon(".agent-switcher-close", { icon: "x", iconOnly: true });

  [
    [".stv-nav-item[data-panel='sp-general']", "zap", "General"],
    [".stv-nav-item[data-panel='sp-ai']", "bot", "AI Model"],
    [".stv-nav-item[data-panel='sp-appearance']", "sparkles", "Appearance"],
    [".stv-nav-item[data-panel='sp-terminal']", "squareTerminal", "Terminal"],
    [".stv-nav-item[data-panel='sp-extensions']", "plusCircle", "Extensions"],
    [".stv-nav-item[data-panel='sp-memory']", "brain", "Memory"],
    [".stv-nav-item[data-panel='sp-network']", "globe", "Network"],
    [".stv-nav-item[data-panel='sp-computer']", "panelRightOpen", "Computer"],
    [".stv-nav-item[data-panel='sp-sync']", "refreshCw", "Sync"],
    [".stv-nav-item[data-panel='sp-voice']", "mic", "Voice"],
  ].forEach(([selector, icon, label]) => applyButtonIcon(selector, { icon, label }));
}

export { createIcon, applyButtonIcon, applyInlineTitleIcon, normalizeLabel };
