import type { NeurodeckTheme, ThemeDisplayTarget, ThemeTokenSet } from "./themeContracts";
import { themePresets } from "./themePresets";
import { adjustTokensForDisplay } from "./displayProfiles";
import { adjustTokensForAccessibility } from "./accessibilityProfiles";
import { adjustTokensForMotion } from "./motionProfiles";
import { validateTheme } from "./themeSchemas";

export class ThemeRegistry {
  private themesMap = new Map<string, NeurodeckTheme>();

  constructor() {
    for (const preset of themePresets) {
      this.themesMap.set(preset.id, preset);
    }
  }

  getTheme(id: string): NeurodeckTheme | undefined {
    return this.themesMap.get(id);
  }

  listThemes(): NeurodeckTheme[] {
    return Array.from(this.themesMap.values());
  }

  registerCustomTheme(theme: NeurodeckTheme): { ok: boolean; error?: string } {
    const check = validateTheme(theme);
    if (!check.valid) {
      return { ok: false, error: `Validation failed: ${check.errors.join(", ")}` };
    }
    this.themesMap.set(theme.id, theme);
    return { ok: true };
  }

  resolveTokens(
    themeId: string,
    displayProfile: ThemeDisplayTarget,
    accessibilityProfile: string,
    motionProfile: string
  ): ThemeTokenSet | undefined {
    const theme = this.getTheme(themeId);
    if (!theme) return undefined;

    // Apply baseline preset tokens
    let tokens = JSON.parse(JSON.stringify(theme.tokens)) as ThemeTokenSet;

    // Chain display scaling corrections
    tokens = adjustTokensForDisplay(tokens, displayProfile);

    // Chain accessibility mode corrections
    tokens = adjustTokensForAccessibility(tokens, accessibilityProfile);

    // Chain motion corrections
    tokens = adjustTokensForMotion(tokens, motionProfile);

    return tokens;
  }
}

export const themeRegistry = new ThemeRegistry();
