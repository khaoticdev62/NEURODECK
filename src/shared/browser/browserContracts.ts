export type BrowserTabId = string;

export type BrowserTabState =
  | "new"
  | "loading"
  | "ready"
  | "blocked"
  | "crashed"
  | "offline"
  | "error"
  | "closed";

export type BrowserSecurityState = "secure" | "insecure" | "warning" | "broken";

export type BrowserPermissionDecision =
  | "allow_once"
  | "allow_always"
  | "block_once"
  | "block_always"
  | "use_profile_default";

export type BrowserPermissionState = {
  origin: string;
  permission: string;
  decision: BrowserPermissionDecision;
  profileId: string;
  createdAt: string;
  expiresAt?: string;
};

export type BrowserTab = {
  id: BrowserTabId;
  profileId: string;
  partitionId: string;

  title: string;
  url: string;
  displayUrl: string;
  favicon?: string;

  state: BrowserTabState;

  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isPrivate: boolean;

  security: BrowserSecurityState;

  permissions: BrowserPermissionState[];

  createdAt: string;
  updatedAt: string;
  lastNavigationAt?: string;

  crashCount: number;

  diagnostics: {
    processId?: number;
    loadTimeMs?: number;
    lastErrorCode?: string;
    lastErrorMessage?: string;
  };
};

export type BrowserProfile = {
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
};

export type BrowserHistoryEntry = {
  id: string;
  profileId: string;
  url: string;
  title: string;
  favicon?: string;
  visitCount: number;
  lastVisitedAt: string;
};

export type BrowserBookmark = {
  id: string;
  profileId: string;
  title: string;
  url: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DownloadItem = {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  profileId: string;
  tabId?: string;
  startTime: string;
  endTime?: string;
  errorReason?: string;
};
