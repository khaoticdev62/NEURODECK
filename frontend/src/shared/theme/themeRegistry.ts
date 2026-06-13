/**
 * Frontend theme registry.
 *
 * Re-exports the canonical ThemeRegistry from `src/shared/theme/themeRegistry`
 * so the React UI applies the same display, accessibility, and motion profile
 * transforms as the rest of the app. Previously this facade ignored the
 * profile arguments, so Steam Deck LCD/OLED tuning, high-contrast modes, and
 * reduced-motion settings were never applied.
 */

export {
  ThemeRegistry,
  themeRegistry,
} from "../../../../src/shared/theme/themeRegistry";
