import { browserNavigationService } from "../../services/browser/browserNavigationService";
import { browserFindInPageService } from "../../services/browser/browserFindInPageService";
import { browserDiagnosticsService } from "../../services/browser/browserDiagnosticsService";
import { browserUrlNormalizer } from "../../services/browser/browserUrlNormalizer";
import { browserSearchEngineService } from "../../services/browser/browserSearchEngineService";
import { browserProfileService } from "../../services/browser/browserProfileService";
import { browserTabManager } from "../../services/browser/browserTabManager";
import { browserViewManager } from "../../services/browser/browserViewManager";
import { browserSessionService } from "../../services/browser/browserSessionService";

export function registerBrowserHandlers(ipcMain: any) {
  ipcMain.handle("browser:navigate", async (_event: any, payload: any) => {
    const { tabId, url } = payload;
    if (!tabId || !url) return { success: false, error: "Missing tabId or url" };
    return browserNavigationService.navigate(tabId, url);
  });

  ipcMain.handle("browser:go-back", async (_event: any, payload: any) => {
    const { tabId } = payload;
    if (!tabId) return { success: false };
    return { success: browserNavigationService.goBack(tabId) };
  });

  ipcMain.handle("browser:go-forward", async (_event: any, payload: any) => {
    const { tabId } = payload;
    if (!tabId) return { success: false };
    return { success: browserNavigationService.goForward(tabId) };
  });

  ipcMain.handle("browser:reload", async (_event: any, payload: any) => {
    const { tabId } = payload;
    if (!tabId) return { success: false };
    return { success: browserNavigationService.reload(tabId) };
  });

  ipcMain.handle("browser:stop", async (_event: any, payload: any) => {
    const { tabId } = payload;
    if (!tabId) return { success: false };
    return { success: browserNavigationService.stop(tabId) };
  });

  ipcMain.handle("browser:find-in-page", async (_event: any, payload: any) => {
    const { tabId, text, findNext } = payload;
    if (!tabId || !text) return { success: false };
    return { success: browserFindInPageService.find(tabId, text, findNext) };
  });

  ipcMain.handle("browser:get-diagnostics", async () => {
    return browserDiagnosticsService.getReport();
  });

  ipcMain.handle("browser:normalize-url", async (_event: any, payload: any) => {
    const { url } = payload;
    if (!url) return { url: "" };
    const searchUrl = browserSearchEngineService.getSearchEngineUrl();
    return { url: browserUrlNormalizer.normalize(url, searchUrl) };
  });

  ipcMain.handle("browser:get-profiles", async () => {
    return browserProfileService.listProfiles();
  });

  ipcMain.handle("browser:set-profile", async (_event: any, payload: any) => {
    const { tabId, profileId } = payload || {};
    if (!tabId || !profileId) return { success: false };
    const profile = browserProfileService.getProfile(profileId);
    if (!profile) return { success: false };
    const success = browserTabManager.updateTab(tabId, { profileId });
    if (success) {
      browserViewManager.destroyView(tabId);
      browserViewManager.getOrCreateView(tabId);
      browserViewManager.syncActiveView();
    }
    return { success };
  });

  ipcMain.handle("browser:clear-data", async (_event: any, payload: any) => {
    const { profileId, options } = payload || {};
    if (!profileId || !options) return { success: false };
    const result = await browserSessionService.clearSessionData(profileId, options);
    return { success: result.ok };
  });

  ipcMain.handle("browser:open-devtools", async (_event: any, payload: any) => {
    const { tabId } = payload || {};
    if (!tabId) return { success: false };
    const view = browserViewManager.getOrCreateView(tabId);
    if (view && view.webContents) {
      try {
        view.webContents.openDevTools();
        return { success: true };
      } catch (_) {}
    }
    return { success: false };
  });
}
