import type { NeurodeckTheme, ThemeTokenSet } from "./themeContracts";

// ─── Shared structural defaults (non-colour tokens) ──────────────────────────
const MOTION = {
  durationFast: "150ms",
  durationNormal: "250ms",
  durationSlow: "400ms",
};

const TYPOGRAPHY = {
  fontFamily: {
    ui: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, ui-monospace, monospace",
    display: "Orbitron, Inter, system-ui, sans-serif",
  },
};

// ─── Theme token builders ─────────────────────────────────────────────────────

function blacksiteTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#0a0a0b", base: "#111113", raised: "#18181b", sunken: "#050506",
        overlay: "rgba(0,0,0,0.72)", modal: "#131315", glass: "rgba(20,20,23,0.64)",
        sidebar: "#0e0e10", panel: "#121214", card: "#161618", input: "#1a1a1d",
        tooltip: "#1c1c1f",
      },
      text: {
        primary: "#f2f2f5", secondary: "#c9c9d1", tertiary: "#9f9fad", muted: "#6e6e7c",
        inverse: "#0a0a0b", link: "#60a5fa", code: "#a5f3fc", command: "#d8b4fe",
        danger: "#f87171", warning: "#fbbf24", success: "#34d399", info: "#38bdf8",
      },
      accent: {
        primary: "#00d4ff", secondary: "#7c3aed", tertiary: "#f472b6",
        glow: "rgba(0,212,255,0.45)", soft: "rgba(0,212,255,0.16)", strong: "#00e5ff",
      },
      state: { success: "#34d399", warning: "#fbbf24", error: "#f87171", info: "#38bdf8" },
      border: {
        subtle: "rgba(255,255,255,0.06)", default: "rgba(255,255,255,0.12)",
        strong: "rgba(255,255,255,0.22)", focus: "rgba(0,212,255,0.55)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.64, blur: "12px" },
    motion: MOTION,
  };
}

function terminalGhostTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#000000", base: "#050f08", raised: "#0a1a0e", sunken: "#000000",
        overlay: "rgba(0,0,0,0.80)", modal: "#061009", glass: "rgba(0,20,10,0.68)",
        sidebar: "#030d06", panel: "#060f08", card: "#09140b", input: "#0c1a0f",
        tooltip: "#0e1c11",
      },
      text: {
        primary: "#d0ffe8", secondary: "#88ffb8", tertiary: "#55cc88", muted: "#337755",
        inverse: "#000000", link: "#00ffcc", code: "#44ffaa", command: "#00cc88",
        danger: "#ff4466", warning: "#ffcc00", success: "#00ff88", info: "#00ccff",
      },
      accent: {
        primary: "#00ffcc", secondary: "#00cc88", tertiary: "#88ffaa",
        glow: "rgba(0,255,204,0.40)", soft: "rgba(0,255,204,0.12)", strong: "#44ffdd",
      },
      state: { success: "#00ff88", warning: "#ffcc00", error: "#ff4466", info: "#00ccff" },
      border: {
        subtle: "rgba(0,255,150,0.08)", default: "rgba(0,255,150,0.16)",
        strong: "rgba(0,255,150,0.30)", focus: "rgba(0,255,204,0.55)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.68, blur: "10px" },
    motion: MOTION,
  };
}

function synthGridTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#0f0a1a", base: "#161024", raised: "#1e1530", sunken: "#080511",
        overlay: "rgba(10,5,20,0.80)", modal: "#130e22", glass: "rgba(20,12,35,0.70)",
        sidebar: "#0d0918", panel: "#110d1f", card: "#171228", input: "#1c1530",
        tooltip: "#1f1833",
      },
      text: {
        primary: "#f0e8ff", secondary: "#c8b0ff", tertiary: "#9f80e8", muted: "#6a50a8",
        inverse: "#0f0a1a", link: "#c084fc", code: "#f0abfc", command: "#f472b6",
        danger: "#ff6090", warning: "#ffd166", success: "#00ffcc", info: "#00ffff",
      },
      accent: {
        primary: "#ff00ff", secondary: "#00ffff", tertiary: "#7c3aed",
        glow: "rgba(255,0,255,0.45)", soft: "rgba(255,0,255,0.14)", strong: "#ff44ff",
      },
      state: { success: "#00ffcc", warning: "#ffd166", error: "#ff6090", info: "#00ffff" },
      border: {
        subtle: "rgba(255,0,255,0.08)", default: "rgba(255,0,255,0.18)",
        strong: "rgba(255,0,255,0.35)", focus: "rgba(255,0,255,0.60)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.70, blur: "14px" },
    motion: MOTION,
  };
}

function deckBlueTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#0a0f1d", base: "#0e1525", raised: "#141c2f", sunken: "#060b16",
        overlay: "rgba(5,10,25,0.78)", modal: "#0d1423", glass: "rgba(12,18,35,0.66)",
        sidebar: "#090e1b", panel: "#0c1220", card: "#111829", input: "#15203a",
        tooltip: "#17223d",
      },
      text: {
        primary: "#d5f2ff", secondary: "#90cff0", tertiary: "#5aa8d0", muted: "#3a6888",
        inverse: "#0a0f1d", link: "#38bdf8", code: "#7dd3fc", command: "#93c5fd",
        danger: "#f87171", warning: "#fbbf24", success: "#34d399", info: "#00c0ff",
      },
      accent: {
        primary: "#00c0ff", secondary: "#0078ff", tertiary: "#00ffcc",
        glow: "rgba(0,192,255,0.42)", soft: "rgba(0,192,255,0.14)", strong: "#33d0ff",
      },
      state: { success: "#34d399", warning: "#fbbf24", error: "#f87171", info: "#00c0ff" },
      border: {
        subtle: "rgba(0,150,255,0.08)", default: "rgba(0,150,255,0.18)",
        strong: "rgba(0,150,255,0.32)", focus: "rgba(0,192,255,0.58)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.66, blur: "12px" },
    motion: MOTION,
  };
}

function amberCrtTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#110a00", base: "#1a1000", raised: "#231600", sunken: "#0a0500",
        overlay: "rgba(15,8,0,0.82)", modal: "#1c1100", glass: "rgba(28,16,0,0.72)",
        sidebar: "#0f0800", panel: "#181000", card: "#201400", input: "#281a00",
        tooltip: "#2c1c00",
      },
      text: {
        primary: "#ffe8a0", secondary: "#ffcc55", tertiary: "#cc9933", muted: "#7a5a1a",
        inverse: "#110a00", link: "#ffb000", code: "#ffd700", command: "#ffcc00",
        danger: "#ff3300", warning: "#ff8c00", success: "#88cc00", info: "#44aaff",
      },
      accent: {
        primary: "#ffb000", secondary: "#ff8c00", tertiary: "#ffd700",
        glow: "rgba(255,176,0,0.42)", soft: "rgba(255,176,0,0.14)", strong: "#ffcc22",
      },
      state: { success: "#88cc00", warning: "#ff8c00", error: "#ff3300", info: "#44aaff" },
      border: {
        subtle: "rgba(255,176,0,0.09)", default: "rgba(255,176,0,0.20)",
        strong: "rgba(255,176,0,0.35)", focus: "rgba(255,176,0,0.60)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.72, blur: "8px" },
    motion: MOTION,
  };
}

function cyberPunkTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#0c0614", base: "#12081e", raised: "#190d28", sunken: "#07030d",
        overlay: "rgba(8,3,15,0.82)", modal: "#10071a", glass: "rgba(16,6,24,0.72)",
        sidebar: "#0a0512", panel: "#0f0618", card: "#150820", input: "#1b0b28",
        tooltip: "#1e0d2c",
      },
      text: {
        primary: "#e0f8ff", secondary: "#88eeff", tertiary: "#44ccdd", muted: "#226677",
        inverse: "#0c0614", link: "#00ffff", code: "#ff77bb", command: "#ff00aa",
        danger: "#ff0055", warning: "#ffff00", success: "#00ffcc", info: "#00ffff",
      },
      accent: {
        primary: "#ff007f", secondary: "#00ffff", tertiary: "#ff44cc",
        glow: "rgba(255,0,127,0.48)", soft: "rgba(255,0,127,0.14)", strong: "#ff33aa",
      },
      state: { success: "#00ffcc", warning: "#ffff00", error: "#ff0055", info: "#00ffff" },
      border: {
        subtle: "rgba(255,0,127,0.09)", default: "rgba(255,0,127,0.20)",
        strong: "rgba(255,0,127,0.38)", focus: "rgba(255,0,127,0.62)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.72, blur: "13px" },
    motion: MOTION,
  };
}

function matrixTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#000000", base: "#030a03", raised: "#061206", sunken: "#000000",
        overlay: "rgba(0,0,0,0.88)", modal: "#041004", glass: "rgba(0,14,0,0.74)",
        sidebar: "#020802", panel: "#040e04", card: "#071207", input: "#0a1a0a",
        tooltip: "#0c1c0c",
      },
      text: {
        primary: "#88ff88", secondary: "#55cc55", tertiary: "#339933", muted: "#1a5a1a",
        inverse: "#000000", link: "#33ff33", code: "#aaffaa", command: "#66ff66",
        danger: "#ff3333", warning: "#aacc00", success: "#00ff44", info: "#44aaff",
      },
      accent: {
        primary: "#00ff00", secondary: "#33cc33", tertiary: "#88ff44",
        glow: "rgba(0,255,0,0.40)", soft: "rgba(0,255,0,0.11)", strong: "#44ff44",
      },
      state: { success: "#00ff44", warning: "#aacc00", error: "#ff3333", info: "#44aaff" },
      border: {
        subtle: "rgba(0,255,0,0.08)", default: "rgba(0,255,0,0.18)",
        strong: "rgba(0,255,0,0.33)", focus: "rgba(0,255,0,0.58)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.74, blur: "8px" },
    motion: MOTION,
  };
}

function solarizedTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#002b36", base: "#073642", raised: "#0d424e", sunken: "#001c24",
        overlay: "rgba(0,25,32,0.80)", modal: "#063240", glass: "rgba(5,40,50,0.68)",
        sidebar: "#002030", panel: "#053640", card: "#0a3d49", input: "#0f4450",
        tooltip: "#124855",
      },
      text: {
        primary: "#eee8d5", secondary: "#d0cbb0", tertiary: "#93a1a1", muted: "#657b83",
        inverse: "#002b36", link: "#268bd2", code: "#2aa198", command: "#859900",
        danger: "#dc322f", warning: "#cb4b16", success: "#859900", info: "#268bd2",
      },
      accent: {
        primary: "#268bd2", secondary: "#2aa198", tertiary: "#859900",
        glow: "rgba(38,139,210,0.38)", soft: "rgba(38,139,210,0.14)", strong: "#4aa3e8",
      },
      state: { success: "#859900", warning: "#cb4b16", error: "#dc322f", info: "#268bd2" },
      border: {
        subtle: "rgba(130,180,210,0.10)", default: "rgba(130,180,210,0.20)",
        strong: "rgba(130,180,210,0.36)", focus: "rgba(38,139,210,0.55)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.68, blur: "10px" },
    motion: MOTION,
  };
}

function glitchRedTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#140000", base: "#1e0404", raised: "#280808", sunken: "#0a0000",
        overlay: "rgba(15,0,0,0.84)", modal: "#1c0303", glass: "rgba(28,4,4,0.72)",
        sidebar: "#110202", panel: "#1a0303", card: "#220606", input: "#2a0808",
        tooltip: "#2e0a0a",
      },
      text: {
        primary: "#ffcccc", secondary: "#ff9999", tertiary: "#cc5555", muted: "#7a2222",
        inverse: "#140000", link: "#ff6666", code: "#ffaaaa", command: "#ff4444",
        danger: "#ff0000", warning: "#ff9900", success: "#44ff88", info: "#4488ff",
      },
      accent: {
        primary: "#ff3333", secondary: "#ff6600", tertiary: "#ff0066",
        glow: "rgba(255,51,51,0.45)", soft: "rgba(255,51,51,0.14)", strong: "#ff5555",
      },
      state: { success: "#44ff88", warning: "#ff9900", error: "#ff0000", info: "#4488ff" },
      border: {
        subtle: "rgba(255,51,51,0.09)", default: "rgba(255,51,51,0.20)",
        strong: "rgba(255,51,51,0.36)", focus: "rgba(255,51,51,0.62)",
      },
    },
    typography: TYPOGRAPHY,
    glass: { opacity: 0.72, blur: "10px" },
    motion: MOTION,
  };
}

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
    _accessibilityProfile?: string,
    _motionProfile?: string
  ): ThemeTokenSet | undefined {
    return this.getTheme(activeThemeId)?.tokens;
  },
};
