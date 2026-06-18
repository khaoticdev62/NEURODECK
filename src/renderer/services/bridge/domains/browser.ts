export const browser = {
  async open(url: string) {
    if (window.electronAPI?.browserOpen) return window.electronAPI.browserOpen(url);
    return { success: false };
  },
  async navigate(url: string) {
    if (window.electronAPI?.browserNavigate) return window.electronAPI.browserNavigate(url);
    return { success: false };
  },
  async back() {
    if (window.electronAPI?.browserBack) return window.electronAPI.browserBack();
    return { success: false };
  },
  async forward() {
    if (window.electronAPI?.browserForward) return window.electronAPI.browserForward();
    return { success: false };
  },
  async getUrl() {
    if (window.electronAPI?.browserGetUrl) return window.electronAPI.browserGetUrl();
    return { url: "" };
  },
  async hide() {
    if (window.electronAPI?.browserHide) return window.electronAPI.browserHide();
    return { success: false };
  },
  async show() {
    if (window.electronAPI?.browserShow) return window.electronAPI.browserShow();
    return { success: false };
  },
  async setBounds(bounds: { x: number; y: number; width: number; height: number }) {
    if (window.electronAPI?.browserSetBounds) return window.electronAPI.browserSetBounds(bounds);
    return { success: false };
  },
  async getContent() {
    if (window.electronAPI?.browserGetContent) return window.electronAPI.browserGetContent();
    return { content: "" };
  },
  async saveToMemory() {
    if (window.electronAPI?.browserSaveToMemory) return window.electronAPI.browserSaveToMemory();
    return { success: false };
  },
  async reload() {
    if (window.electronAPI?.browserReload) return window.electronAPI.browserReload();
    return { success: false };
  },
  async zoomIn() {
    if (window.electronAPI?.browserZoomIn) return window.electronAPI.browserZoomIn();
    return { zoomLevel: 0 };
  },
  async zoomOut() {
    if (window.electronAPI?.browserZoomOut) return window.electronAPI.browserZoomOut();
    return { zoomLevel: 0 };
  },
  async zoomReset() {
    if (window.electronAPI?.browserZoomReset) return window.electronAPI.browserZoomReset();
    return { zoomLevel: 0 };
  },
  async find(text: string) {
    if (window.electronAPI?.browserFind) return window.electronAPI.browserFind(text);
    return { success: false };
  },
  async stopFind() {
    if (window.electronAPI?.browserStopFind) return window.electronAPI.browserStopFind();
    return { success: false };
  },

  // Bookmarks
  async addBookmark(title: string, url: string) {
    if (window.electronAPI?.browserBookmarkAdd)
      return window.electronAPI.browserBookmarkAdd(title, url);
    return { success: false, bookmarks: [] };
  },
  async removeBookmark(url: string) {
    if (window.electronAPI?.browserBookmarkRemove)
      return window.electronAPI.browserBookmarkRemove(url);
    return { success: false, bookmarks: [] };
  },
  async listBookmarks() {
    if (window.electronAPI?.browserBookmarkList) return window.electronAPI.browserBookmarkList();
    return { bookmarks: [] };
  },

  // History
  async listHistory() {
    if (window.electronAPI?.browserHistoryList) return window.electronAPI.browserHistoryList();
    return { history: [] };
  },
  async clearHistory() {
    if (window.electronAPI?.browserHistoryClear) return window.electronAPI.browserHistoryClear();
    return { success: false };
  },

  // Reader mode
  async readerMode() {
    if (window.electronAPI?.browserReaderMode) return window.electronAPI.browserReaderMode();
    return { success: false, title: "", text: "", url: "" };
  },

  // Ad blocker
  async toggleAdblock() {
    if (window.electronAPI?.browserAdblockToggle) return window.electronAPI.browserAdblockToggle();
    return { enabled: false };
  },
  async getAdblockStatus() {
    if (window.electronAPI?.browserAdblockStatus) return window.electronAPI.browserAdblockStatus();
    return { enabled: false };
  },

  onBrowserEvent(callback: (data: { event: string; payload: Record<string, unknown> }) => void) {
    if (window.electronAPI?.onBrowserEvent) return window.electronAPI.onBrowserEvent(callback);
    return () => {};
  },
};
