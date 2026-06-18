/**
 * Frontend theme contracts.
 *
 * This module re-exports the canonical theme contracts from
 * `src/shared/theme/themeContracts` so the React UI and the backend share the
 * same token shape, display targets, accessibility profiles, and settings
 * schema. Keeping a single source of truth prevents the frontend token facade
 * from drifting out of sync with the canonical design system.
 */

import type {
  ThemeId,
  ThemeDisplayTarget,
  ThemePerformanceTier,
  WallpaperRendererType,
  ThemeTokenSet,
  NeurodeckTheme,
  ThemeSettings,
} from "../../../shared/theme/themeContracts";

export type {
  ThemeId,
  ThemeDisplayTarget,
  ThemePerformanceTier,
  WallpaperRendererType,
  ThemeTokenSet,
  NeurodeckTheme,
  ThemeSettings,
};

/** Alias kept for backward compatibility with existing component code. */
export type PerformanceTier = ThemePerformanceTier;

/**
 * The accessibility profile values are declared inline on the canonical
 * `ThemeSettings.accessibilityProfile` field, so we derive the named union
 * here for frontend components that need it directly.
 */
export type AccessibilityProfile = ThemeSettings["accessibilityProfile"];

/**
 * Slim frontend wallpaper profile. The canonical profile is richer, but the
 * React UI only needs the fields used for selection and canvas rendering.
 */
export interface LiveWallpaperProfile {
  id: string;
  name: string;
  description?: string;
  renderer: WallpaperRendererType | string;
  visuals: {
    basePalette: string[];
  };
}
