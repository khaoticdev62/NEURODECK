import { themeRegistry } from "../../src/shared/theme/themeRegistry";
import { themeSettingsService } from "../../src/main/services/theme/themeSettingsService";
import { validateTheme, validateThemeSettings } from "../../src/shared/theme/themeSchemas";

console.log("--- STARTING THEME SYSTEM SERVICE VALIDATION ---");

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
    // 1. Verify Presets load in Registry
    const presets = themeRegistry.listThemes();
    assert(presets.length >= 30, `Registry loaded ${presets.length} themes (expected >= 30)`);

    // 2. Validate all loaded presets against schema
    let presetsValid = true;
    for (const preset of presets) {
      const validation = validateTheme(preset);
      if (!validation.valid) {
        console.error(`[FAIL] Theme preset "${preset.id}" is invalid:`, validation.errors);
        presetsValid = false;
        failure = true;
      }
    }
    assert(presetsValid, "All 30+ theme presets conform perfectly to Theme schema");

    // 3. Verify ThemeSettingsService defaults and get/set settings
    const settings = themeSettingsService.getSettings();
    assert(!!settings, "ThemeSettingsService loaded settings object");
    assert(validateThemeSettings(settings).valid, "hydrated settings conform to ThemeSettings schema");

    // Try changing settings
    const originalTheme = settings.activeThemeId;
    const testTheme = "tactical_glass_ultra";
    const updateResult = themeSettingsService.setSettings({ activeThemeId: testTheme });
    assert(updateResult.ok === true, "ThemeSettingsService successfully sets custom settings");

    const updated = themeSettingsService.getSettings();
    assert(updated.activeThemeId === testTheme, `Active theme changed to ${testTheme}`);

    // Revert settings
    themeSettingsService.setSettings({ activeThemeId: originalTheme });

    // 4. Verify token resolution with profiles
    const lcdTokens = themeRegistry.resolveTokens("blacksite_prime", "steamdeck_lcd", "default", "normal");
    assert(!!lcdTokens, "Resolved tokens successfully for LCD profile");
    assert(lcdTokens?.color.text.primary === "#FFFFFF", "LCD Profile boosted primary text brightness to #FFFFFF");

    const oledTokens = themeRegistry.resolveTokens("blacksite_prime", "steamdeck_oled", "default", "normal");
    assert(!!oledTokens, "Resolved tokens successfully for OLED profile");
    assert(oledTokens?.color.surface.app === "#000000", "OLED Profile applied true black app background");

    const highContrastTokens = themeRegistry.resolveTokens("blacksite_prime", "steamdeck_lcd", "high_contrast", "normal");
    assert(!!highContrastTokens, "Resolved tokens successfully for high contrast profile");
    assert(highContrastTokens?.color.text.primary === "#FFFFFF", "High contrast boosted text color");

  } catch (err: any) {
    console.error("Exception during theme system testing:", err);
    failure = true;
  }

  if (failure) {
    console.error("--- THEME SYSTEM SERVICE VALIDATION FAILED ---");
    process.exit(1);
  } else {
    console.log("--- THEME SYSTEM SERVICE VALIDATION PASSED ---");
    process.exit(0);
  }
}

run();
