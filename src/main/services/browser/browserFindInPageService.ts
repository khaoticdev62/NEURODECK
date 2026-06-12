import { browserViewManager } from "./browserViewManager";

export class BrowserFindInPageService {
  find(tabId: string, text: string, findNext: boolean = false): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view && view.webContents) {
      view.webContents.findInPage(text, { findNext });
      return true;
    }
    return false;
  }

  stopFind(tabId: string, clearSelection: boolean = true): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view && view.webContents) {
      view.webContents.stopFindInPage(clearSelection ? "clearSelection" : "keepSelection");
      return true;
    }
    return false;
  }
}

export const browserFindInPageService = new BrowserFindInPageService();
