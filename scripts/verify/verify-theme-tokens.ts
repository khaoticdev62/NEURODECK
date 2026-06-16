import { themePresets } from "../src/shared/theme/themePresets";
import { validateTheme } from "../src/shared/theme/themeSchemas";

console.log("--- STARTING THEME DESIGN TOKENS COMPLIANCE TEST ---");

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
    let allTokensConform = true;
    for (const theme of themePresets) {
      const result = validateTheme(theme);
      if (!result.valid) {
        console.error(`Theme "${theme.name}" (${theme.id}) fails token validation:`, result.errors);
        allTokensConform = false;
        failure = true;
      }

      // Check specific token keys and categories to ensure strict compliance
      const tokens = theme.tokens;
      if (!tokens.color.surface.app || !tokens.color.surface.base || !tokens.color.surface.raised) {
        console.error(`Theme "${theme.id}" is missing core surface colors`);
        allTokensConform = false;
        failure = true;
      }
      if (!tokens.color.text.primary || !tokens.color.text.secondary || !tokens.color.text.muted) {
        console.error(`Theme "${theme.id}" is missing core text colors`);
        allTokensConform = false;
        failure = true;
      }
      if (!tokens.color.accent.primary || !tokens.color.accent.glow) {
        console.error(`Theme "${theme.id}" is missing accent/glow colors`);
        allTokensConform = false;
        failure = true;
      }
      if (!tokens.typography.fontFamily.ui || !tokens.typography.fontFamily.mono) {
        console.error(`Theme "${theme.id}" is missing typography font definitions`);
        allTokensConform = false;
        failure = true;
      }
      if (!tokens.spacing.panelGap || !tokens.spacing.deckSafeInset) {
        console.error(`Theme "${theme.id}" is missing panel gap or deck safe inset spacing`);
        allTokensConform = false;
        failure = true;
      }
      if (!tokens.motion.durationFast || tokens.motion.glowIntensity === undefined) {
        console.error(`Theme "${theme.id}" is missing motion profiles`);
        allTokensConform = false;
        failure = true;
      }
    }

    assert(allTokensConform, "All 30+ theme presets contain complete and valid design token sets");
  } catch (err: any) {
    console.error("Exception during token compliance check:", err);
    failure = true;
  }

  if (failure) {
    console.error("--- THEME DESIGN TOKENS COMPLIANCE TEST FAILED ---");
    process.exit(1);
  } else {
    console.log("--- THEME DESIGN TOKENS COMPLIANCE TEST PASSED ---");
    process.exit(0);
  }
}

run();
