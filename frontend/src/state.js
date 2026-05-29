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
