import { themeSettingsService } from "../src/main/services/theme/themeSettingsService";
import { themeDiagnosticsService } from "../src/main/services/theme/themeDiagnosticsService";
import { adjustTokensForMotion } from "../src/shared/theme/motionProfiles";
import { themePresets } from "../src/shared/theme/themePresets";

console.log("--- STARTING THEME PERFORMANCE AND HARDWARE PROFILE TEST ---");

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
    const originalSettings = themeSettingsService.getSettings();

    // 1. Verify target frame limits on different display profiles
    themeSettingsService.setSettings({ displayProfile: "steamdeck_lcd", performanceTier: "balanced" });
    let diag = themeDiagnosticsService.getDiagnosticsReport();
    assert(diag.performance.frameRateCapFps === 60, "LCD target framerate resolves to 60 FPS under Balanced");

    themeSettingsService.setSettings({ displayProfile: "steamdeck_oled", performanceTier: "premium" });
    diag = themeDiagnosticsService.getDiagnosticsReport();
    assert(diag.performance.frameRateCapFps === 90, "OLED target framerate resolves to 90 FPS under Premium");

    themeSettingsService.setSettings({ displayProfile: "desktop_4k", performanceTier: "showcase" });
    diag = themeDiagnosticsService.getDiagnosticsReport();
    assert(diag.performance.frameRateCapFps === 120, "Desktop 4K target framerate resolves to 120 FPS under Showcase");

    // 2. Test Battery Saver overrides
    themeSettingsService.setSettings({ displayProfile: "steamdeck_oled", performanceTier: "battery_saver" });
    diag = themeDiagnosticsService.getDiagnosticsReport();
    assert(diag.performance.frameRateCapFps === 30, "Battery Saver profile overrides target FPS to 30 FPS cap on OLED");
    assert(diag.performance.reducedMotionActive === true, "Battery Saver automatically requests reduced motion mode");

    // 3. Verify motion profile adjustments (reduced vs normal)
    const baseTheme = themePresets[0];
    const normalTokens = adjustTokensForMotion(baseTheme.tokens, "normal");
    assert(normalTokens.motion.glowIntensity > 0, "Normal motion preserves active glow intensity");

    const reducedTokens = adjustTokensForMotion(baseTheme.tokens, "reduced");
    assert(
      reducedTokens.motion.durationFast === "0ms" &&
      reducedTokens.motion.glowIntensity === 0 &&
      reducedTokens.motion.pulseIntensity === 0,
      "Reduced motion profile zeroes transition durations, glows, and pulses"
    );

    // Revert settings
    themeSettingsService.setSettings(originalSettings);

  } catch (err: any) {
    console.error("Exception during theme performance check:", err);
    failure = true;
  }

  if (failure) {
    console.error("--- THEME PERFORMANCE AND HARDWARE PROFILE TEST FAILED ---");
    process.exit(1);
  } else {
    console.log("--- THEME PERFORMANCE AND HARDWARE PROFILE TEST PASSED ---");
    process.exit(0);
  }
}

run();
