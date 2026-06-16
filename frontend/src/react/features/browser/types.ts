export interface BrowserTab {
  id: string;
  profileId: string;
  partitionId: string;
  title: string;
  url: string;
  displayUrl: string;
  favicon?: string;
  state:
    | "new"
    | "loading"
    | "ready"
    | "blocked"
    | "crashed"
    | "offline"
    | "error"
    | "closed";
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isPrivate: boolean;
  security: "secure" | "insecure" | "warning" | "broken";
  permissions: unknown[];
  crashCount: number;
  diagnostics: {
    processId?: number;
    loadTimeMs?: number;
    lastErrorCode?: string;
    lastErrorMessage?: string;
  };
}

export interface BrowserProfile {
  id: string;
  name: string;
  partitionId: string;
  persistent: boolean;
  policy: {
    allowDownloads: boolean;
    allowPopups: boolean;
    allowMedia: boolean;
    allowNotifications: boolean;
    allowGeolocation: boolean;
    allowClipboardRead: boolean;
    allowClipboardWrite: boolean;
    allowDevTools: boolean;
    blockThirdPartyCookies: boolean;
    clearOnClose: boolean;
  };
  storage: {
    historyEnabled: boolean;
    bookmarksEnabled: boolean;
    cookiesEnabled: boolean;
    cacheEnabled: boolean;
  };
}

export interface BrowserHistoryEntry {
  id: string;
  profileId: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitedAt: string;
}

export interface BrowserBookmark {
  id: string;
  profileId: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  profileId: string;
  startTime: string;
}

export interface PermissionRequest {
  requestId: string;
  origin: string;
  permission: string;
  profileId: string;
}

export interface Notice {
  kind: "ok" | "error";
  text: string;
}
