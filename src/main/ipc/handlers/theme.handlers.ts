import { themeSettingsService } from "../../services/theme/themeSettingsService";
import { themeRegistry } from "../../../shared/theme/themeRegistry";
import { themeDiagnosticsService } from "../../services/theme/themeDiagnosticsService";
import { themeImportExportService } from "../../services/theme/themeImportExportService";

export function registerThemeHandlers(ipcMain: any) {
  ipcMain.handle("theme:get", async () => {
    return themeSettingsService.getSettings();
  });

  ipcMain.handle("theme:set", async (_event: any, payload: any) => {
    const settings = payload?.settings || payload;
    return themeSettingsService.setSettings(settings);
  });

  ipcMain.handle("theme:list", async () => {
    return themeRegistry.listThemes().map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
    }));
  });

  ipcMain.handle("theme:diagnostics", async () => {
    return themeDiagnosticsService.getDiagnosticsReport();
  });

  ipcMain.handle("theme:export", async (_event: any, payload: any) => {
    if (!payload?.filePath) {
      return { ok: false, error: "Missing filePath argument" };
    }
    return themeImportExportService.exportSettings(payload.filePath);
  });

  ipcMain.handle("theme:import", async (_event: any, payload: any) => {
    if (!payload?.filePath) {
      return { ok: false, error: "Missing filePath argument" };
    }
    return themeImportExportService.importSettings(payload.filePath);
  });
}
