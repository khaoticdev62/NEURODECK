/**
 * Maps legacy backend theme names and the old v5 ThemeName union
 * to the canonical v6 theme registry IDs.
 */

const LEGACY_THEME_NAME_TO_ID: Record<string, string> = {
  // Backend uppercase IDs
  BLACKSITE: "blacksite_prime",
  TERMINAL_GHOST: "ghost_terminal_pro",
  SYNTH_GRID: "hologrid_command",
  DECK_BLUE: "deckos_native",
  AMBER_CRT: "amber_terminal",
  CYBER_PUNK: "broadcast_studio",
  MATRIX: "emerald_matrix",
  SOLARIZED: "moonlight_console",
  GLITCH_RED: "crimson_debug",
  GHOST_WHITE: "monochrome_pro",
  DEEP_VOID: "violet_storm",
  NEON_ORANGE: "solar_flare_ops",
  BLOOD_MOON: "obsidian_bloom",
  GOLD_SOVEREIGN: "amber_terminal",
  TRON_LEGACY: "blueprint_engine",
  EMERALD_VOID: "aurora_deck",
  PLASMA_PINK: "neural_velvet",
  OBSIDIAN: "carbon_fiber_hud",
  ASTRAL_BLUE: "sapphire_kernel",

  // Old v5 display names
  Blacksite: "blacksite_prime",
  "Tactical Glass": "tactical_glass_ultra",
  "Ghost Terminal": "ghost_terminal_pro",
  Hologrid: "hologrid_command",
  "Minimal Ops": "minimal_ops",
  "Night Watch": "night_watch_elite",
  Broadcast: "broadcast_studio",
};

export function resolveThemeIdFromBackend(name: string | null | undefined): string | null {
  if (!name) return null;
  const normalized = name.trim();
  if (LEGACY_THEME_NAME_TO_ID[normalized]) {
    return LEGACY_THEME_NAME_TO_ID[normalized];
  }
  return normalized;
}
