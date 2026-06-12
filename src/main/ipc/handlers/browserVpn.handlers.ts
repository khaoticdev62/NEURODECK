import { vpnConfigImportService } from "../../services/browser-vpn/vpnConfigImportService";
import { vpnDiagnosticsService } from "../../services/browser-vpn/vpnDiagnosticsService";
import { vpnRouteManager } from "../../services/browser-vpn/vpnRouteManager";

export function registerBrowserVpnHandlers(ipcMain: any) {
  ipcMain.handle("vpn:list-profiles", async () => vpnRouteManager.listProfiles());
  ipcMain.handle("vpn:get-profile", async (_event: any, payload: any) => vpnRouteManager.getProfile(payload?.profileId ?? payload?.id ?? ""));
  ipcMain.handle("vpn:create-profile", async (_event: any, payload: any) => vpnRouteManager.createProfile(payload));
  ipcMain.handle("vpn:update-profile", async (_event: any, payload: any) => vpnRouteManager.updateProfile(payload));
  ipcMain.handle("vpn:delete-profile", async (_event: any, payload: any) => ({ success: vpnRouteManager.deleteProfile(payload?.profileId ?? payload?.id ?? "") }));
  ipcMain.handle("vpn:import-config", async (_event: any, payload: any) => vpnConfigImportService.importText(payload?.text ?? "", payload?.kind));
  ipcMain.handle("vpn:validate-config", async (_event: any, payload: any) => vpnConfigImportService.importText(payload?.text ?? "", payload?.kind));
  ipcMain.handle("vpn:list-templates", async () => vpnRouteManager.listTemplates());
  ipcMain.handle("vpn:connect", async (_event: any, payload: any) => vpnRouteManager.connect(payload?.profileId ?? payload?.id ?? "", payload?.browserProfileId));
  ipcMain.handle("vpn:disconnect", async (_event: any, payload: any) => vpnRouteManager.disconnect(payload?.profileId ?? payload?.id ?? ""));
  ipcMain.handle("vpn:verify", async (_event: any, payload: any) => vpnRouteManager.verify(payload?.profileId ?? payload?.id ?? ""));
  ipcMain.handle("vpn:repair", async (_event: any, payload: any) => vpnRouteManager.repair(payload?.profileId ?? payload?.id ?? ""));
  ipcMain.handle("vpn:get-status", async (_event: any, payload: any) => vpnDiagnosticsService.getReport(payload?.profileId ?? payload?.id));
  ipcMain.handle("vpn:get-evidence", async (_event: any, payload: any) => vpnRouteManager.getEvidence(payload?.profileId ?? payload?.id ?? undefined));
  ipcMain.handle("vpn:get-recovery-events", async () => vpnRouteManager.getRecoveryEvents());
  ipcMain.handle("vpn:set-kill-switch", async (_event: any, payload: any) => vpnRouteManager.setKillSwitch(payload?.profileId ?? payload?.id ?? "", Boolean(payload?.enabled)));
  ipcMain.handle("vpn:apply-browser-proxy", async (_event: any, payload: any) => vpnRouteManager.applyBrowserProxy(payload?.profileId ?? payload?.id ?? "", payload?.browserProfileId));
  ipcMain.handle("vpn:clear-browser-proxy", async (_event: any, payload: any) => vpnRouteManager.clearBrowserProxy(payload?.profileId ?? payload?.id ?? "", payload?.browserProfileId));
  ipcMain.handle("vpn:get-provider-matrix", async () => vpnRouteManager.getProviderMatrix());
  ipcMain.handle("vpn:export-redacted-profile", async (_event: any, payload: any) => vpnRouteManager.exportRedactedProfile(payload?.profileId ?? payload?.id ?? ""));
}
