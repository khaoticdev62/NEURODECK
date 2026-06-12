import * as fs from "fs";
import { themeSettingsService } from "./themeSettingsService";
import { validateThemeSettings } from "../../../shared/theme/themeSchemas";
import type { ThemeSettings } from "../../../shared/theme/themeContracts";

export class ThemeImportExportService {
  async exportSettings(targetPath: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const settings = themeSettingsService.getSettings();
      const payload = {
        generator: "NEURODECK Theme System",
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        settings,
      };

      fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), "utf-8");
      return { ok: true };
    } catch (err: any) {
      console.error("Export theme settings failed:", err);
      return { ok: false, error: err.message || String(err) };
    }
  }

  async importSettings(sourcePath: string): Promise<{ ok: boolean; settings?: ThemeSettings; error?: string }> {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { ok: false, error: "Source file does not exist" };
      }

      const content = fs.readFileSync(sourcePath, "utf-8");
      const parsed = JSON.parse(content);

      if (!parsed || typeof parsed !== "object") {
        return { ok: false, error: "Invalid file format: must be JSON object" };
      }

      const settings = parsed.settings || parsed; // Support both wrapped and raw exports
      const validation = validateThemeSettings(settings);

      if (!validation.valid) {
        return { ok: false, error: `Validation failed: ${validation.errors.join(", ")}` };
      }

      const saveResult = themeSettingsService.setSettings(settings);
      if (!saveResult.ok) {
        return { ok: false, error: `Failed to save imported settings: ${saveResult.errors?.join(", ")}` };
      }

      return { ok: true, settings };
    } catch (err: any) {
      console.error("Import theme settings failed:", err);
      return { ok: false, error: err.message || String(err) };
    }
  }
}

export const themeImportExportService = new ThemeImportExportService();
