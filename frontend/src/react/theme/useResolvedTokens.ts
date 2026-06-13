import { useTheme } from "./ThemeProvider";
import type { ThemeTokenSet } from "../../shared/theme/themeContracts";

/**
 * Returns the fully resolved theme token set for the active theme, including
 * display-profile, accessibility-profile, and motion-profile corrections.
 *
 * Use this in canvas/SVG renderers or anywhere that needs raw token values
 * instead of CSS custom properties.
 */
export function useResolvedTokens(): ThemeTokenSet {
  const { resolvedTokens } = useTheme();
  return resolvedTokens;
}
