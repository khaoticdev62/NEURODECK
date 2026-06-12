import type { LiveWallpaperProfile } from "./themeContracts";

const WALLPAPERS: LiveWallpaperProfile[] = [
  { id: "neural_aurora", name: "Neural Aurora", description: "Subtle animated aurora gradient.", renderer: "css", visuals: { basePalette: ["#00d4ff", "#7c3aed", "#f472b6"] } },
];

export const wallpaperRegistry = {
  listWallpapers(): LiveWallpaperProfile[] {
    return WALLPAPERS;
  },
};
