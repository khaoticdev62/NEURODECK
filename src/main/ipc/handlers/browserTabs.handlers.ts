import { browserTabManager } from "../../services/browser/browserTabManager";
import { browserViewManager } from "../../services/browser/browserViewManager";

export function registerBrowserTabsHandlers(ipcMain: any) {
  ipcMain.handle("browser:create-tab", async (_event: any, payload: any) => {
    const { url, profileId } = payload || {};
    const tab = browserTabManager.createTab(url, profileId);
    browserViewManager.getOrCreateView(tab.id);
    browserViewManager.syncActiveView();
    return tab;
  });

  ipcMain.handle("browser:close-tab", async (_event: any, payload: any) => {
    const { tabId } = payload || {};
    if (!tabId) return { success: false };
    browserViewManager.destroyView(tabId);
    const success = browserTabManager.closeTab(tabId);
    browserViewManager.syncActiveView();
    return { success };
  });

  ipcMain.handle("browser:switch-tab", async (_event: any, payload: any) => {
    const { tabId } = payload || {};
    if (!tabId) return { success: false };
    const success = browserTabManager.switchTab(tabId);
    browserViewManager.syncActiveView();
    return { success };
  });

  ipcMain.handle("browser:duplicate-tab", async (_event: any, payload: any) => {
    const { tabId } = payload || {};
    if (!tabId) return null;
    const tab = browserTabManager.duplicateTab(tabId);
    if (tab) {
      browserViewManager.getOrCreateView(tab.id);
      browserViewManager.syncActiveView();
    }
    return tab;
  });

  ipcMain.handle("browser:get-tabs", async () => {
    return browserTabManager.listTabs();
  });

  ipcMain.handle("browser:get-active-tab", async () => {
    return browserTabManager.getActiveTab();
  });
}
