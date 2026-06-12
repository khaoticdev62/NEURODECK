import { browserTabManager } from "./browserTabManager";
import { browserViewManager } from "./browserViewManager";
import { browserUrlNormalizer } from "./browserUrlNormalizer";
import { browserSearchEngineService } from "./browserSearchEngineService";
import { isUrlAllowed } from "../../../shared/browser/browserSecurityPolicy";
import { vpnRouteManager } from "../browser-vpn/vpnRouteManager";

export class BrowserNavigationService {
  async navigate(tabId: string, inputUrl: string): Promise<{ success: boolean; error?: string }> {
    const tab = browserTabManager.getTab(tabId);
    if (!tab) return { success: false, error: "Tab not found" };

    const searchUrl = browserSearchEngineService.getSearchEngineUrl();
    const normalized = browserUrlNormalizer.normalize(inputUrl, searchUrl);

    if (vpnRouteManager.shouldBlockBrowserRequest(tab.profileId, normalized)) {
      browserTabManager.updateTab(tabId, { state: "blocked" });
      return { success: false, error: "VPN kill switch blocked navigation" };
    }

    // Run security check
    const check = isUrlAllowed(normalized);
    if (!check.allowed) {
      browserTabManager.updateTab(tabId, { state: "blocked" });
      return { success: false, error: check.reason };
    }

    const view = browserViewManager.getOrCreateView(tabId);
    if (!view) return { success: false, error: "Failed to create web viewport" };

    try {
      browserTabManager.updateTab(tabId, {
        url: normalized,
        displayUrl: normalized,
        state: "loading",
        isLoading: true,
      });

      await view.webContents.loadURL(normalized);
      return { success: true };
    } catch (err: any) {
      browserTabManager.updateTab(tabId, {
        state: "error",
        isLoading: false,
        diagnostics: {
          lastErrorCode: err.code || "LOAD_FAILED",
          lastErrorMessage: err.message || String(err),
        },
      });
      return { success: false, error: err.message || String(err) };
    }
  }

  goBack(tabId: string): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view && view.webContents.navigationHistory.canGoBack()) {
      view.webContents.navigationHistory.goBack();
      return true;
    }
    return false;
  }

  goForward(tabId: string): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view && view.webContents.navigationHistory.canGoForward()) {
      view.webContents.navigationHistory.goForward();
      return true;
    }
    return false;
  }

  reload(tabId: string): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view) {
      view.webContents.reload();
      return true;
    }
    return false;
  }

  hardReload(tabId: string): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view) {
      view.webContents.reloadIgnoringCache();
      return true;
    }
    return false;
  }

  stop(tabId: string): boolean {
    const view = browserViewManager.getOrCreateView(tabId);
    if (view) {
      view.webContents.stop();
      return true;
    }
    return false;
  }
}

export const browserNavigationService = new BrowserNavigationService();
