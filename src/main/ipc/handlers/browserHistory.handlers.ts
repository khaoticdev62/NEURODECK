import { browserHistoryService } from "../../services/browser/browserHistoryService";

export function registerBrowserHistoryHandlers(ipcMain: any) {
  ipcMain.handle("browser:get-history", async (_event: any, payload: any) => {
    const { profileId } = payload || {};
    return browserHistoryService.getHistory(profileId);
  });

  ipcMain.handle("browser:delete-history", async (_event: any, payload: any) => {
    const { id } = payload || {};
    if (!id) return { success: false };
    browserHistoryService.deleteEntry(id);
    return { success: true };
  });

  ipcMain.handle("browser:clear-history", async (_event: any, payload: any) => {
    const { profileId } = payload || {};
    browserHistoryService.clearHistory(profileId);
    return { success: true };
  });
}
