import { browserTabManager } from "./browserTabManager";
import { browserDownloadService } from "./browserDownloadService";

export type BrowserDiagnosticsReport = {
  status: "ready" | "loading" | "blocked" | "crashed" | "offline" | "error";
  activeTabId: string | null;
  activeProfile: string | null;
  partitionId: string | null;
  currentUrl: string | null;
  loadState: string;
  canGoBack: boolean;
  canGoForward: boolean;
  crashCount: number;
  activeDownloadsCount: number;
  blockedAttemptsCount: number;
};

export class BrowserDiagnosticsService {
  getReport(): BrowserDiagnosticsReport {
    const activeTab = browserTabManager.getActiveTab();
    const activeDownloads = browserDownloadService.listDownloads().filter((d) => d.state === "progressing");

    let status: BrowserDiagnosticsReport["status"] = "ready";
    if (activeTab) {
      if (activeTab.state === "crashed") status = "crashed";
      else if (activeTab.state === "blocked") status = "blocked";
      else if (activeTab.state === "error") status = "error";
      else if (activeTab.isLoading) status = "loading";
    }

    return {
      status,
      activeTabId: activeTab ? activeTab.id : null,
      activeProfile: activeTab ? activeTab.profileId : null,
      partitionId: activeTab ? activeTab.partitionId : null,
      currentUrl: activeTab ? activeTab.url : null,
      loadState: activeTab ? activeTab.state : "offline",
      canGoBack: activeTab ? activeTab.canGoBack : false,
      canGoForward: activeTab ? activeTab.canGoForward : false,
      crashCount: activeTab ? activeTab.crashCount : 0,
      activeDownloadsCount: activeDownloads.length,
      blockedAttemptsCount: browserTabManager.listTabs().filter((t) => t.state === "blocked").length,
    };
  }
}

export const browserDiagnosticsService = new BrowserDiagnosticsService();
