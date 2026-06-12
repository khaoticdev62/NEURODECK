import { themeSettingsService } from "../../services/theme/themeSettingsService";
import { wallpaperRegistry } from "../../../shared/theme/wallpaperRegistry";
import { wallpaperAssetService } from "../../services/theme/wallpaperAssetService";

export function registerWallpaperHandlers(ipcMain: any) {
  ipcMain.handle("wallpaper:get", async () => {
    const settings = themeSettingsService.getSettings();
    return { id: settings.activeWallpaperId || "neural_aurora" };
  });

  ipcMain.handle("wallpaper:set", async (_event: any, payload: any) => {
    const id = payload?.id;
    if (!id) {
      return { ok: false, error: "Missing wallpaper id" };
    }
    return themeSettingsService.setSettings({ activeWallpaperId: id });
  });

  ipcMain.handle("wallpaper:list", async () => {
    return wallpaperRegistry.listWallpapers().map((w) => ({
      id: w.id,
      name: w.name,
      renderer: w.renderer,
      category: w.category,
    }));
  });

  ipcMain.handle("wallpaper:validate-custom-url", async (_event: any, payload: any) => {
    const fileUrl = payload?.fileUrl;
    if (!fileUrl) {
      return { ok: false, error: "Missing fileUrl" };
    }
    return wallpaperAssetService.validateCustomWallpaperUrl(fileUrl);
  });
}
