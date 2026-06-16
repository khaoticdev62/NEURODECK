function readStoredBoolean(key, fallback) {
  const storage = globalThis?.localStorage;
  if (!storage) return fallback;

  try {
    const value = storage.getItem(key);
    if (value === null) return fallback;
    return value === "true";
  } catch {
    return fallback;
  }
}

export { readStoredBoolean };

export const state = {
  currentSessionId: "",
  execToken: "",
  activePersona: "Default",
  availablePersonas: [],
  isMuted: readStoredBoolean("isMuted", false),
  isProcessRunning: false,
  terminalSessions: [],
  activeTerminalSessionId: null,
  ptySessionId: null,
  sshSessionId: null,
  ftpCurrentPath: "/",
  sftpCurrentPath: "/",
  isRecording: false,
  notifications: [],
  unreadNotifCount: 0,
  currentAIMessage: null,
  currentAIText: "",
  activeTerminalBody: null,
  activeExecuteBtn: null,
  pendingLuaScript: "",
  streamStartTime: 0,
  firstChunkTime: 0,
  totalTokens: 0,
  currentRagSources: null,
  radialMenuVisible: false,
  gamepadActive: false,
  hapticsEnabled: readStoredBoolean("hapticsEnabled", true),
  gamepadFocusIndex: -1,
  previousGamepadState: { buttons: [] },
  tpCursorX: 640,
  tpCursorY: 400,
  tpCursorVisible: false,
  tpCursorHideTimer: null,
  tpScrollVisible: false,
  tpScrollHideTimer: null,
  radialSelectedSegment: null,
  activeProvider: "gemini",
  activeAgentId: "",
  agents: [],
  tunnelStatus: "offline",
  selectedPeerIp: null,
  pendingTransferId: null,
  // ── Chat Virtualization ─────────────────────────────────────────────────
  chatMessageRegistry: [],
  chatMessageObserver: null,
  chatCullThreshold: 50,
  chatKeepRendered: 30,
  // ── Slash Command Palette ───────────────────────────────────────────────
  slashPaletteOpen: false,
  slashPaletteSelected: 0,
  slashPaletteFilter: "",
  // ── Chat Search ─────────────────────────────────────────────────────────
  chatSearch: {
    query: "",
    matches: [],
    activeIndex: -1,
    filter: "all",
    open: false,
  },
  // ── Model Comparison ────────────────────────────────────────────────────
  comparisonMode: false,
  compareStreaming: false,
  compareLeft: {
    provider: "gemini",
    currentAIMessage: null,
    currentAIText: "",
    totalTokens: 0,
    firstChunkTime: 0,
    streamStartTime: 0,
  },
  compareRight: {
    provider: "ollama",
    currentAIMessage: null,
    currentAIText: "",
    totalTokens: 0,
    firstChunkTime: 0,
    streamStartTime: 0,
  },
};

export function wireDragAndDrop(dropzone, pathInput, onDropCallback) {
  if (!dropzone || !pathInput) return;
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      pathInput.value = file.path || file.name;
      if (onDropCallback) {
        onDropCallback(file);
      }
    }
  });
}
