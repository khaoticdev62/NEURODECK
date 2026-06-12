import type { NeurodeckTheme, ThemeTokenSet } from "./themeContracts";
import {
  resolveSemanticTokens,
  type SemanticTokenSet,
} from "../../../../src/shared/theme/designTokens";
import { themePresets } from "../../../../src/shared/theme/themePresets";

const THEMES: NeurodeckTheme[] = themePresets as unknown as NeurodeckTheme[];

export const themeRegistry = {
  listThemes(): NeurodeckTheme[] {
    return THEMES;
  },

  getTheme(id: string): NeurodeckTheme | undefined {
    return THEMES.find((t) => t.id === id);
  },

  resolveTokens(
    activeThemeId: string,
    _displayProfile?: string,
    accessibilityProfile?: string,
    _motionProfile?: string
  ): ThemeTokenSet | undefined {
    const theme = this.getTheme(activeThemeId);
    if (!theme) return undefined;

    // TODO: apply accessibilityProfile overrides (high contrast, large text,
    // colorblind-safe palettes) here once per-profile transforms are defined.
    void accessibilityProfile;
    void _displayProfile;
    void _motionProfile;

    return theme.tokens;
  },

  resolveSemanticTokens(
    activeThemeId: string,
    accessibilityProfile?: string,
    motionProfile?: string
  ): SemanticTokenSet | undefined {
    const tokens = this.resolveTokens(activeThemeId, undefined, accessibilityProfile, motionProfile);
    if (!tokens) return undefined;

    return resolveSemanticTokens(tokens, {
      reducedMotion:
        accessibilityProfile === "reduced_motion" || motionProfile === "reduced",
    });
  },
};
