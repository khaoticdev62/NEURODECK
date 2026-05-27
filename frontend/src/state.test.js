import { describe, it, expect, vi } from "vitest";
import { readStoredBoolean, state } from "./state.js";

describe("default state shape", () => {
  it("has all expected top-level keys", () => {
    const expectedKeys = [
      "currentSessionId",
      "execToken",
      "activePersona",
      "availablePersonas",
      "isMuted",
      "isProcessRunning",
      "terminalSessions",
      "activeTerminalSessionId",
      "ptySessionId",
      "sshSessionId",
      "ftpCurrentPath",
      "sftpCurrentPath",
      "isRecording",
      "notifications",
      "unreadNotifCount",
      "currentAIMessage",
      "currentAIText",
      "activeTerminalBody",
      "activeExecuteBtn",
      "pendingLuaScript",
      "streamStartTime",
      "firstChunkTime",
      "totalTokens",
      "radialMenuVisible",
      "gamepadActive",
      "hapticsEnabled",
      "gamepadFocusIndex",
      "previousGamepadState",
      "tpCursorX",
      "tpCursorY",
      "tpCursorVisible",
      "tpCursorHideTimer",
      "tpScrollVisible",
      "tpScrollHideTimer",
      "radialSelectedSegment",
      "activeProvider",
      "activeAgentId",
      "agents",
      "tunnelStatus",
      "selectedPeerIp",
      "pendingTransferId",
      "chatMessageRegistry",
      "chatMessageObserver",
      "chatCullThreshold",
      "chatKeepRendered",
      "slashPaletteOpen",
      "slashPaletteSelected",
      "slashPaletteFilter",
      "chatSearch",
      "comparisonMode",
      "compareStreaming",
      "compareLeft",
      "compareRight",
    ];

    const actualKeys = Object.keys(state);
    for (const key of expectedKeys) {
      expect(actualKeys).toContain(key);
    }
  });

  it("has correct primitive defaults", () => {
    expect(state.currentSessionId).toBe("");
    expect(state.execToken).toBe("");
    expect(state.activePersona).toBe("Default");
    expect(state.isMuted).toBeTypeOf("boolean");
    expect(state.isProcessRunning).toBe(false);
    expect(state.ptySessionId).toBeNull();
    expect(state.sshSessionId).toBeNull();
    expect(state.ftpCurrentPath).toBe("/");
    expect(state.sftpCurrentPath).toBe("/");
    expect(state.isRecording).toBe(false);
    expect(state.unreadNotifCount).toBe(0);
    expect(state.currentAIText).toBe("");
    expect(state.streamStartTime).toBe(0);
    expect(state.firstChunkTime).toBe(0);
    expect(state.totalTokens).toBe(0);
    expect(state.radialMenuVisible).toBe(false);
    expect(state.gamepadActive).toBe(false);
    expect(state.gamepadFocusIndex).toBe(-1);
    expect(state.tpCursorX).toBe(640);
    expect(state.tpCursorY).toBe(400);
    expect(state.tpCursorVisible).toBe(false);
    expect(state.tpScrollVisible).toBe(false);
    expect(state.radialSelectedSegment).toBeNull();
    expect(state.activeProvider).toBe("gemini");
    expect(state.activeAgentId).toBe("");
    expect(state.tunnelStatus).toBe("offline");
    expect(state.selectedPeerIp).toBeNull();
    expect(state.pendingTransferId).toBeNull();
    expect(state.chatCullThreshold).toBe(50);
    expect(state.chatKeepRendered).toBe(30);
    expect(state.slashPaletteOpen).toBe(false);
    expect(state.slashPaletteSelected).toBe(0);
    expect(state.slashPaletteFilter).toBe("");
    expect(state.comparisonMode).toBe(false);
    expect(state.compareStreaming).toBe(false);
  });

  it("has array defaults for collections", () => {
    expect(Array.isArray(state.terminalSessions)).toBe(true);
    expect(Array.isArray(state.notifications)).toBe(true);
    expect(Array.isArray(state.availablePersonas)).toBe(true);
    expect(Array.isArray(state.agents)).toBe(true);
    expect(Array.isArray(state.chatMessageRegistry)).toBe(true);
  });

  it("has correct nested chatSearch shape", () => {
    expect(state.chatSearch).toEqual({
      query: "",
      matches: [],
      activeIndex: -1,
      filter: "all",
      open: false,
    });
  });

  it("has correct nested compareLeft shape", () => {
    expect(state.compareLeft.provider).toBe("gemini");
    expect(state.compareLeft.currentAIMessage).toBeNull();
    expect(state.compareLeft.currentAIText).toBe("");
    expect(state.compareLeft.totalTokens).toBe(0);
    expect(state.compareLeft.firstChunkTime).toBe(0);
    expect(state.compareLeft.streamStartTime).toBe(0);
  });

  it("has correct nested compareRight shape", () => {
    expect(state.compareRight.provider).toBe("ollama");
  });

  it("reads stored booleans safely when storage is unavailable", () => {
    const originalLocalStorage = globalThis.localStorage;
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage unavailable");
      },
    });
    try {
      expect(readStoredBoolean("isMuted", false)).toBe(false);
      expect(readStoredBoolean("hapticsEnabled", true)).toBe(true);
    } finally {
      if (originalLocalStorage === undefined) {
        vi.unstubAllGlobals();
      } else {
        vi.stubGlobal("localStorage", originalLocalStorage);
      }
    }
  });
});
