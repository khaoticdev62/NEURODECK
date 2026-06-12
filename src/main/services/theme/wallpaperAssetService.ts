import * as fs from "fs";
import * as path from "path";
import { wallpaperRegistry } from "../../../shared/theme/wallpaperRegistry";
import type { LiveWallpaperProfile } from "../../../shared/theme/themeContracts";

export class WallpaperAssetService {
  listPresets(): LiveWallpaperProfile[] {
    return wallpaperRegistry.listWallpapers();
  }

  validateCustomWallpaperUrl(fileUrl: string): { ok: boolean; error?: string } {
    if (!fileUrl) {
      return { ok: false, error: "Wallpaper URL is empty" };
    }

    // Strip file:// prefix if present
    let filePath = fileUrl;
    if (fileUrl.startsWith("file://")) {
      // Handle OS differences (Windows file:///C:/path vs Unix file:///path)
      filePath = fileUrl.replace(/^file:\/\/\/?/, "");
      // Re-add drive letter colon on Windows if it got stripped/malformed
      if (process.platform === "win32" && !filePath.includes(":")) {
        // Safe fallback for checking path shape
      }
    }

    // Resolve absolute path
    filePath = path.resolve(filePath);

    // 1. Security Check: Block remote schemes
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return { ok: false, error: "Remote HTTP/HTTPS wallpaper URLs are blocked for security. Use local file paths." };
    }

    // 2. Security Check: File extensions limits (permit only safe image formats, block executable/scripts)
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"];
    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return { ok: false, error: `Invalid wallpaper file type "${ext}". Allowed types: ${allowedExtensions.join(", ")}` };
    }

    // 3. Existence Check
    try {
      if (!fs.existsSync(filePath)) {
        return { ok: false, error: `Wallpaper file does not exist at path: ${filePath}` };
      }

      // Check readability
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err: any) {
      return { ok: false, error: `Wallpaper path is not readable: ${err.message || String(err)}` };
    }

    return { ok: true };
  }
}

export const wallpaperAssetService = new WallpaperAssetService();
