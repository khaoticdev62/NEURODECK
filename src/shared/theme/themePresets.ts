import type { NeurodeckTheme, ThemeTokenSet } from "./themeContracts";

export function getDefaultTokens(): ThemeTokenSet {
  return {
    color: {
      surface: {
        app: "#0A0D10",
        base: "#11161C",
        raised: "#161D25",
        sunken: "#080A0E",
        overlay: "#19222B",
        modal: "#161D25",
        glass: "rgba(17, 22, 28, 0.7)",
        sidebar: "#0D1115",
        panel: "#11161C",
        card: "#161D25",
        input: "#080A0E",
        tooltip: "#19222B",
      },
      text: {
        primary: "#E8F4FF",
        secondary: "#B5C6D4",
        tertiary: "#8DA1B3",
        muted: "#62778A",
        inverse: "#0A0D10",
        link: "#5EEBFF",
        code: "#7CFFB2",
        command: "#5EEBFF",
        danger: "#FF5A6A",
        warning: "#FFC857",
        success: "#7CFFB2",
        info: "#5EEBFF",
      },
      accent: {
        primary: "#5EEBFF",
        secondary: "#3AB0FF",
        tertiary: "#1C82FF",
        glow: "rgba(94, 235, 255, 0.18)",
        soft: "rgba(94, 235, 255, 0.1)",
        strong: "#5EEBFF",
      },
      state: {
        idle: "transparent",
        hover: "rgba(94, 235, 255, 0.08)",
        focus: "rgba(94, 235, 255, 0.15)",
        active: "rgba(94, 235, 255, 0.2)",
        selected: "rgba(94, 235, 255, 0.1)",
        disabled: "rgba(255, 255, 255, 0.05)",
        success: "#7CFFB2",
        warning: "#FFC857",
        error: "#FF5A6A",
        info: "#5EEBFF",
        loading: "rgba(94, 235, 255, 0.5)",
      },
      border: {
        subtle: "rgba(255, 255, 255, 0.06)",
        default: "rgba(255, 255, 255, 0.12)",
        strong: "rgba(255, 255, 255, 0.25)",
        focus: "#5EEBFF",
        danger: "#FF5A6A",
        warning: "#FFC857",
        success: "#7CFFB2",
      },
      syntax: {
        keyword: "#5EEBFF",
        string: "#7CFFB2",
        number: "#FFC857",
        function: "#3AB0FF",
        variable: "#E8F4FF",
        type: "#A78BFA",
        comment: "#62778A",
        operator: "#FF5A6A",
        punctuation: "#B5C6D4",
        error: "#FF5A6A",
        warning: "#FFC857",
      },
      telemetry: {
        cpu: "#5EEBFF",
        gpu: "#A78BFA",
        memory: "#7CFFB2",
        vram: "#FFC857",
        network: "#3AB0FF",
        latency: "#7CFFB2",
        tokens: "#FF77FF",
        battery: "#7CFFB2",
        temperature: "#FF5A6A",
      },
    },
    typography: {
      fontFamily: {
        ui: '"Inter", sans-serif',
        mono: '"JetBrains Mono", monospace',
        code: '"Fira Code", monospace',
        display: '"Orbitron", sans-serif',
      },
      size: {
        xs: "10px",
        sm: "12px",
        md: "14px",
        lg: "16px",
        xl: "20px",
        xxl: "28px",
        code: "12px",
        deckReadable: "15px",
      },
      weight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
        code: "1.6",
      },
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px",
      panelGap: "12px",
      deckSafeInset: "16px",
    },
    radius: {
      sm: "4px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      card: "12px",
      modal: "16px",
      pill: "9999px",
    },
    shadow: {
      none: "none",
      subtle: "0 2px 8px rgba(0, 0, 0, 0.5)",
      panel: "0 4px 16px rgba(0, 0, 0, 0.6)",
      modal: "0 8px 32px rgba(0, 0, 0, 0.8)",
      glow: "0 0 16px rgba(94, 235, 255, 0.18)",
      focus: "0 0 12px rgba(94, 235, 255, 0.4)",
    },
    glass: {
      opacity: 0.1,
      blur: "8px",
      borderOpacity: 0.15,
      highlightOpacity: 0.05,
      noiseOpacity: 0.02,
    },
    motion: {
      durationFast: "100ms",
      durationNormal: "200ms",
      durationSlow: "400ms",
      easingStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
      easingEmphasis: "cubic-bezier(0.25, 1, 0.5, 1)",
      pulseIntensity: 1.0,
      glowIntensity: 1.0,
    },
    wallpaper: {
      tint: "#5EEBFF",
      tintOpacity: 0.05,
      vignetteOpacity: 0.3,
      grainOpacity: 0.04,
      blur: "4px",
      brightness: 0.8,
      saturation: 1.0,
      contrast: 1.0,
    },
  };
}

// Helper to clone and override colors
function buildTheme(
  id: string,
  name: string,
  category: NeurodeckTheme["category"],
  accent: string,
  bg: string,
  surface: string,
  text: string,
  desc: string = ""
): NeurodeckTheme {
  const tokens = getDefaultTokens();
  tokens.color.accent.primary = accent;
  tokens.color.accent.strong = accent;
  tokens.color.surface.app = bg;
  tokens.color.surface.base = bg;
  tokens.color.surface.raised = surface;
  tokens.color.surface.panel = bg;
  tokens.color.surface.card = surface;
  tokens.color.surface.sidebar = bg;
  tokens.color.text.primary = text;

  return {
    id,
    name,
    description: desc || `${name} premium color palette.`,
    version: "1.0.0",
    category,
    tags: [category, name.toLowerCase()],
    displayTargets: ["steamdeck_lcd", "steamdeck_oled", "desktop_1080p"],
    performanceTier: "balanced",
    tokens,
    wallpaper: {
      defaultWallpaperId: "neural_aurora",
      supportedWallpaperIds: ["neural_aurora", "particles"],
      allowLiveWallpaper: true,
      defaultLiveWallpaperEnabled: true,
    },
    accessibility: {
      supportsHighContrast: id === "high_contrast",
      supportsReducedMotion: true,
      supportsColorblindSafe: true,
      supportsLowVision: true,
      minimumContrastRatio: 4.5,
    },
    steamDeck: {
      lcdTuned: true,
      oledTuned: true,
      dockedTuned: true,
    },
    metadata: {
      author: "NEURODECK Core Team",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productionReady: true,
    },
  };
}

export const themePresets: NeurodeckTheme[] = [
  // ── Core Themes ──
  buildTheme("blacksite_prime", "Blacksite Prime", "core", "#00F0FF", "#050505", "#11161B", "#D9F7FF", "Default cyber cyan terminal HUD"),
  buildTheme("tactical_glass_ultra", "Tactical Glass Ultra", "core", "#6AF0D5", "#091015", "#101923", "#ECFBFF", "Glassmorphic tactical signaling layer"),
  buildTheme("ghost_terminal_pro", "Ghost Terminal Pro", "core", "#B8F7FF", "#080A0B", "#101314", "#F0FCFF", "Low contrast ambient workspace for developers"),
  buildTheme("hologrid_command", "Hologrid Command", "core", "#7AA7FF", "#070B14", "#0E1628", "#EEF5FF", "Deep-space blue mission command dashboard"),
  buildTheme("minimal_ops", "Minimal Ops", "core", "#D8DEE9", "#0D0F12", "#15181D", "#ECEFF4", "Clean slate matte interface with high visibility"),
  buildTheme("night_watch_elite", "Night Watch Elite", "core", "#A78BFA", "#070B10", "#101722", "#F5F3FF", "Smooth night-mode purple command cockpit"),
  buildTheme("broadcast_studio", "Broadcast Studio", "core", "#FF4FD8", "#0C0A12", "#171321", "#FFF3FC", "High-energy vibrant magenta execution hub"),

  // ── Premium Themes ──
  buildTheme("oled_void", "OLED Void", "premium", "#00F0FF", "#000000", "#080808", "#E0F0FF", "True absolute black optimized for OLED displays"),
  buildTheme("aurora_deck", "Aurora Deck", "premium", "#10B981", "#022C22", "#064E3B", "#ECFDF5", "Deep forest emerald with northern lights highlights"),
  buildTheme("deep_signal", "Deep Signal", "premium", "#F59E0B", "#180C02", "#261204", "#FEF3C7", "High-frequency signal telemetry theme"),
  buildTheme("obsidian_bloom", "Obsidian Bloom", "premium", "#EC4899", "#11000B", "#1C0014", "#FDF2F8", "Dark volcanic stone with neon orchid accents"),
  buildTheme("plasma_grid", "Plasma Grid", "premium", "#8B5CF6", "#0D0B21", "#14112F", "#F5F3FF", "High energy grid design"),
  buildTheme("indigo_command", "Indigo Command", "premium", "#6366F1", "#0B0C18", "#12142B", "#EEF2FF", "Classic deep-sea navy with indigo highlights"),
  buildTheme("crimson_debug", "Crimson Debug", "premium", "#EF4444", "#1E0A0A", "#2D1010", "#FEE2E2", "Specialized security monitoring and warning HUD"),
  buildTheme("emerald_matrix", "Emerald Matrix", "premium", "#10B981", "#031E11", "#06371A", "#ECFDF5", "Classic green matrix console matrix style"),
  buildTheme("solar_flare_ops", "Solar Flare Ops", "premium", "#F97316", "#1E0F05", "#2F190B", "#FFF7ED", "Ultra bright sunset amber telemetry HUD"),
  buildTheme("moonlight_console", "Moonlight Console", "premium", "#60A5FA", "#0F172A", "#1E293B", "#F1F5F9", "Cool slate with clean blue focus tags"),
  buildTheme("blueprint_engine", "Blueprint Engine", "premium", "#3B82F6", "#09172B", "#0F2848", "#EFF6FF", "Grid-lined blueprint design system style"),
  buildTheme("carbon_fiber_hud", "Carbon Fiber HUD", "premium", "#64748B", "#0A0B0D", "#111417", "#F1F5F9", "Industrial composite textures and carbon grays"),
  buildTheme("sapphire_kernel", "Sapphire Kernel", "premium", "#2563EB", "#040A1A", "#081330", "#EEF2FF", "Pure core cobalt and deep sapphire"),
  buildTheme("violet_storm", "Violet Storm", "premium", "#7C3AED", "#12072B", "#1E0C45", "#F5F3FF", "Dark electrical thunder storm theme"),
  buildTheme("amber_terminal", "Amber Terminal", "premium", "#D97706", "#170C00", "#261500", "#FEF3C7", "High-phosphor amber CRT monitor look"),
  buildTheme("iceglass_control", "Iceglass Control", "premium", "#38BDF8", "#081A24", "#0E2938", "#F0F9FF", "Frosted glacier blue design"),
  buildTheme("cybernetic_garden", "Cybernetic Garden", "premium", "#059669", "#061F12", "#0C311F", "#ECFDF5", "Cyber plant biological matrix layout"),
  buildTheme("neural_velvet", "Neural Velvet", "premium", "#DB2777", "#1A0610", "#2D0D1E", "#FDF2F8", "Rich deep purple and plush rose accents"),
  buildTheme("deckos_native", "DeckOS Native", "premium", "#3B82F6", "#1A1D24", "#262B35", "#F3F4F6", "Matches Steam Deck Game Mode desktop UI"),
  buildTheme("monochrome_pro", "Monochrome Pro", "premium", "#F3F4F6", "#111827", "#1F2937", "#F9FAFB", "Clean slate absolute gray workspace"),

  // ── Accessibility Themes ──
  buildTheme("high_contrast_command", "High Contrast Command", "accessibility", "#FFFF00", "#000000", "#000000", "#FFFFFF", "High Contrast AAA verified black/white/yellow HUD"),
  buildTheme("low_vision_tactical", "Low Vision Tactical", "accessibility", "#00FF66", "#050B07", "#0E1A11", "#FFFFFF", "Low vision color palette with scaled text assets"),
  buildTheme("colorblind_safe_ops", "Colorblind Safe Ops", "accessibility", "#0088FF", "#080F16", "#101D2A", "#FFFFFF", "Colorblind deuteranopia safe visual tokens"),
  buildTheme("reduced_motion_glass", "Reduced Motion Glass", "accessibility", "#6AF0D5", "#0A0D10", "#11161C", "#E8F4FF", "Zero motion, static background glass theme"),
  buildTheme("dyslexia_focus_theme", "Dyslexia Focus", "accessibility", "#8B5A2B", "#F4ECD8", "#E6DABF", "#2B1E10", "Dyslexia-friendly warm sepia glare reduction theme"),
  buildTheme("warm_eye_saver", "Warm Eye Saver", "accessibility", "#F59E0B", "#1C140A", "#2E2313", "#FDF8F2", "Filter-boosted screen glare protection"),
  buildTheme("oled_pure_black", "OLED Pure Black", "accessibility", "#FFFFFF", "#000000", "#000000", "#FFFFFF", "Absolute high-contrast true black background"),
  buildTheme("lcd_balanced_contrast", "LCD Balanced Contrast", "accessibility", "#5EEBFF", "#0C0F13", "#171D24", "#E5E7EB", "Mid-level brightness for LCD panels"),

  // ── Developer Themes ──
  buildTheme("syntax_forge", "Syntax Forge", "developer", "#10B981", "#05070A", "#0E1117", "#C9D1D9", "Rich IDE theme tuned for complex codebases"),
  buildTheme("code_noir", "Code Noir", "developer", "#9CA3AF", "#09090B", "#18181B", "#E4E4E7", "Subdued gray tone coding theme"),
  buildTheme("compiler_heat", "Compiler Heat", "developer", "#EF4444", "#110707", "#220F0F", "#FEE2E2", "Vibrant compile-error telemetry mapping theme"),
  buildTheme("debug_console_theme", "Debug Console", "developer", "#3B82F6", "#0D0E12", "#181A22", "#E2E8F0", "Clean console logs dashboard theme"),
  buildTheme("stack_trace", "Stack Trace", "developer", "#F59E0B", "#150C03", "#291807", "#FFFBEB", "Warm terminal trace debugger layout"),
  buildTheme("git_diff_theme", "Git Diff", "developer", "#10B981", "#0A0D0E", "#151B1D", "#E3ECEF", "Highlighted branch manager theme"),
  buildTheme("lsp_focus", "LSP Focus", "developer", "#8B5CF6", "#050308", "#120B1F", "#F5F3FF", "Completions and signature helper focused theme"),
  buildTheme("terminal_native_theme", "Terminal Native", "developer", "#00FF00", "#000000", "#0B0C0E", "#00FF00", "Retro green phosphor monochrome styling")
];
