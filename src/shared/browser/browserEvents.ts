export type BrowserEventMap = {
  "tab-created": { tabId: string; url: string };
  "tab-closed": { tabId: string };
  "tab-switched": { tabId: string };
  "tab-updated": { tabId: string; title?: string; url?: string; isLoading?: boolean; canGoBack?: boolean; canGoForward?: boolean };
  "download-started": { id: string; filename: string; totalBytes: number };
  "download-progress": { id: string; receivedBytes: number; totalBytes: number; state: string };
  "download-complete": { id: string; filename: string; savePath: string; state: string };
  "permission-request": { requestId: string; origin: string; permission: string; tabId: string };
  "reader-mode": { title: string; text: string; url: string };
};

export type BrowserEvent = keyof BrowserEventMap;
export type BrowserEventPayload<E extends BrowserEvent> = BrowserEventMap[E];
