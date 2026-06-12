import { browserDownloadService } from "../../services/browser/browserDownloadService";

export function registerBrowserDownloadsHandlers(ipcMain: any) {
  ipcMain.handle("browser:get-downloads", async () => {
    return browserDownloadService.listDownloads();
  });

  ipcMain.handle("browser:cancel-download", async (_event: any, payload: any) => {
    const { id } = payload || {};
    if (!id) return { success: false };
    browserDownloadService.updateDownloadProgress(id, 0, "cancelled");
    return { success: true };
  });
}
