import { wallpaperRegistry } from "../../src/shared/theme/wallpaperRegistry";
import { wallpaperAssetService } from "../../src/main/services/theme/wallpaperAssetService";
import { validateWallpaperProfile } from "../../src/shared/theme/themeSchemas";

console.log("--- STARTING LIVE WALLPAPER CONFIGURATION AND SECURITY TEST ---");

let failure = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    failure = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

function run() {
  try {
    // 1. Verify wallpapers exist in registry
    const wallpapers = wallpaperRegistry.listWallpapers();
    assert(wallpapers.length >= 10, `Registry loaded ${wallpapers.length} wallpapers`);

    // 2. Validate all wallpaper profiles against schema
    let profilesValid = true;
    for (const wp of wallpapers) {
      const validation = validateWallpaperProfile(wp);
      if (!validation.valid) {
        console.error(`Wallpaper "${wp.id}" is invalid:`, validation.errors);
        profilesValid = false;
        failure = true;
      }
    }
    assert(profilesValid, "All wallpaper profiles conform to schema rules");

    // 3. Security check: validateCustomWallpaperUrl rejects remote paths
    const remoteUrl = "https://example.com/malicious-wallpaper.png";
    const remoteCheck = wallpaperAssetService.validateCustomWallpaperUrl(remoteUrl);
    assert(
      remoteCheck.ok === false && remoteCheck.error?.includes("Remote HTTP/HTTPS wallpaper URLs are blocked"),
      "wallpaperAssetService successfully blocks remote HTTP/HTTPS URLs"
    );

    // 4. File type check: validateCustomWallpaperUrl rejects dynamic scripting/HTML
    const jsUrl = "file:///C:/Users/test/malicious-wallpaper.js";
    const jsCheck = wallpaperAssetService.validateCustomWallpaperUrl(jsUrl);
    assert(
      jsCheck.ok === false && jsCheck.error?.includes("Invalid wallpaper file type"),
      "wallpaperAssetService successfully blocks dynamic JS wallpapers"
    );

    // 5. Valid files logic
    // Create a temporary mock image file
    const fs = require("fs");
    const path = require("path");
    const tempImgPath = path.resolve(__dirname, "../temp-wallpaper-test.png");
    fs.writeFileSync(tempImgPath, "fake image data");

    const localCheck = wallpaperAssetService.validateCustomWallpaperUrl(`file://${tempImgPath}`);
    assert(localCheck.ok === true, "wallpaperAssetService accepts valid local photo paths");

    // Clean up
    if (fs.existsSync(tempImgPath)) {
      fs.unlinkSync(tempImgPath);
    }

  } catch (err: any) {
    console.error("Exception during wallpaper config check:", err);
    failure = true;
  }

  if (failure) {
    console.error("--- LIVE WALLPAPER CONFIGURATION AND SECURITY TEST FAILED ---");
    process.exit(1);
  } else {
    console.log("--- LIVE WALLPAPER CONFIGURATION AND SECURITY TEST PASSED ---");
    process.exit(0);
  }
}

run();
