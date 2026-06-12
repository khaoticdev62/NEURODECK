import { browserPermissionService } from "../../services/browser/browserPermissionService";

export function registerBrowserPermissionsHandlers(ipcMain: any) {
  ipcMain.handle("browser:get-permissions", async () => {
    return browserPermissionService.getDecisions();
  });

  ipcMain.handle("browser:set-permission", async (_event: any, payload: any) => {
    const { origin, permission, profileId, decision } = payload || {};
    if (!origin || !permission || !profileId || !decision) {
      return { success: false, error: "Missing required fields" };
    }
    browserPermissionService.saveDecision(origin, permission, profileId, decision);
    return { success: true };
  });

  ipcMain.handle("browser:respond-to-permission", async (_event: any, payload: any) => {
    const { requestId, decision } = payload || {};
    if (!requestId || !decision) return { success: false };
    browserPermissionService.resolveRequest(requestId, decision);
    return { success: true };
  });
}
