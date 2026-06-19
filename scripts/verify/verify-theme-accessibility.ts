import { themeRegistry } from "../../src/shared/theme/themeRegistry";
import { adjustTokensForAccessibility } from "../../src/shared/theme/accessibilityProfiles";
import { themePresets } from "../../src/shared/theme/themePresets";

console.log("--- STARTING THEME ACCESSIBILITY SPEC COMPLIANCE TEST ---");

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
    // 1. Verify all presets define accessibility properties
    let presetsDefineA11y = true;
    for (const theme of themePresets) {
      if (
        theme.accessibility.supportsHighContrast === undefined ||
        theme.accessibility.supportsReducedMotion === undefined ||
        theme.accessibility.supportsColorblindSafe === undefined ||
        theme.accessibility.minimumContrastRatio === undefined
      ) {
        console.error(`Theme "${theme.id}" is missing accessibility support flags`);
        presetsDefineA11y = false;
        failure = true;
      }
    }
    assert(presetsDefineA11y, "All theme presets declare accessibility features support explicitly");

    // 2. Verify contrast profiles map and boost values
    const defaultTheme = themePresets[0];
    
    // High Contrast Profile Test
    const highContrastTokens = adjustTokensForAccessibility(defaultTheme.tokens, "high_contrast");
    assert(
      highContrastTokens.color.text.primary === "#FFFFFF" &&
      highContrastTokens.color.border.default === "#FFFFFF",
      "High Contrast adjustment boosts primary text and default border to pure white (#FFFFFF)"
    );

    // Colorblind Safe Profile Test
    const colorblindTokens = adjustTokensForAccessibility(defaultTheme.tokens, "colorblind_safe");
    assert(
      colorblindTokens.color.state.success === "#3B82F6" && // Blue
      colorblindTokens.color.state.error === "#F59E0B",   // Amber
      "Colorblind Safe adjustment re-maps green/red states to blue/amber contrast states"
    );

    // Dyslexia Focus Profile Test
    const dyslexiaTokens = adjustTokensForAccessibility(defaultTheme.tokens, "dyslexia_focus");
    assert(
      dyslexiaTokens.typography.fontFamily.ui.includes("OpenDyslexic") ||
      dyslexiaTokens.typography.fontFamily.ui.includes("Comic Sans") ||
      dyslexiaTokens.typography.fontFamily.ui.includes("system-ui"),
      "Dyslexia profile falls back to dyslexia-friendly font face stacks"
    );

  } catch (err: any) {
    console.error("Exception during accessibility compliance testing:", err);
    failure = true;
  }

  if (failure) {
    console.error("--- THEME ACCESSIBILITY SPEC COMPLIANCE TEST FAILED ---");
    process.exit(1);
  } else {
    console.log("--- THEME ACCESSIBILITY SPEC COMPLIANCE TEST PASSED ---");
    process.exit(0);
  }
}

run();
