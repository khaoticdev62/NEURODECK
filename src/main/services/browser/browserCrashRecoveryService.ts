import { browserTabManager } from "./browserTabManager";
import { browserViewManager } from "./browserViewManager";
import { browserNavigationService } from "./browserNavigationService";

export class BrowserCrashRecoveryService {
  handleCrash(tabId: string, details?: any) {
    const tab = browserTabManager.getTab(tabId);
    if (!tab) return;

    const newCrashCount = tab.crashCount + 1;
    const errorCode = details?.reason || "RENDERER_CRASH";
    const errorMessage = details?.exitCode !== undefined ? `Exit Code: ${details.exitCode}` : "Renderer process went away";

    browserTabManager.updateTab(tabId, {
      state: "crashed",
      isLoading: false,
      crashCount: newCrashCount,
      diagnostics: {
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
      },
    });

    console.error(`Tab crashed (ID: ${tabId}). Crash count: ${newCrashCount}. Reason: ${errorCode}`);
  }

  async recoverTab(tabId: string): Promise<boolean> {
    const tab = browserTabManager.getTab(tabId);
    if (!tab) return false;

    // Destroy current crashed viewport
    browserViewManager.destroyView(tabId);

    // Re-create viewport and navigate to the previous URL
    const result = await browserNavigationService.navigate(tabId, tab.url);
    if (result.success) {
      browserTabManager.updateTab(tabId, { state: "ready" });
      browserViewManager.syncActiveView();
      return true;
    }
    return false;
  }
}

export const browserCrashRecoveryService = new BrowserCrashRecoveryService();
