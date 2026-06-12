import type { LiveWallpaperProfile, WallpaperRendererType } from "./themeContracts";

function buildWallpaper(
  id: string,
  name: string,
  desc: string,
  renderer: WallpaperRendererType,
  category: LiveWallpaperProfile["category"],
  colors: string[]
): LiveWallpaperProfile {
  return {
    id,
    name,
    description: desc,
    renderer,
    category,
    compatibleThemes: [], // Matches all themes by default
    displayTargets: ["steamdeck_lcd", "steamdeck_oled", "desktop_1080p"],
    performance: {
      tier: "balanced",
      targetFpsLCD: 60,
      targetFpsOLED: 90,
      targetFpsDesktop: 120,
      maxCpuPercentDeck: 5.0,
      maxMemoryMb: 80,
      maxParticleCountDeck: 250,
      maxParticleCountDesktop: 750,
      supportsFrameSkipping: true,
      supportsReducedMotion: true,
      supportsBatterySaver: true,
    },
    visuals: {
      basePalette: colors,
      accentPalette: colors.slice().reverse(),
      tintable: true,
      opacityRange: [0.05, 0.4],
      brightnessRange: [0.1, 0.9],
      contrastRange: [0.8, 1.2],
    },
    safety: {
      burnInAware: id === "oled_starfield",
      avoidsFlashing: true,
      reducedMotionFallbackId: "none",
      staticFallbackId: "none",
    },
    metadata: {
      productionReady: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export const liveWallpapers: LiveWallpaperProfile[] = [
  buildWallpaper("neural_aurora", "Neural Aurora", "Slow gradient mesh polar lights animation, low CPU usage", "css_gradient", "ambient", ["#5EEBFF", "#7CFFB2"]),
  buildWallpaper("tactical_signal_grid", "Tactical Signal Grid", "Drifting scanlines and radar HUD sweeps", "canvas_2d", "tactical", ["#00F0FF", "#0088FF"]),
  buildWallpaper("oled_starfield", "OLED Starfield", "Deep space stars, true blacks, burn-in aware layout", "canvas_2d", "minimal", ["#FFFFFF", "#5EEBFF"]),
  buildWallpaper("hologrid_drift", "Hologrid Drift", "Perspective grid scrolling in accent colors", "canvas_2d", "tactical", ["#7AA7FF", "#FF4FD8"]),
  buildWallpaper("command_waveform", "Command Waveform", "Gently fluctuating sine waves representing data flow", "canvas_2d", "data", ["#FF5A6A", "#FFC857"]),
  buildWallpaper("deep_space_radar", "Deep Space Radar", "Circular military radar sweeps and coordinates", "canvas_2d", "tactical", ["#6AF0D5", "#ECFBFF"]),
  buildWallpaper("liquid_glass_flow", "Liquid Glass Flow", "Smooth fluid metal blobs moving organically", "canvas_2d", "ambient", ["#A78BFA", "#B8F7FF"]),
  buildWallpaper("terminal_rainfield", "Terminal Rainfield", "Sparse binary columns drop, green phosphor phosphor", "canvas_2d", "developer", ["#00FF00", "#00FF66"]),
  buildWallpaper("memory_constellation", "Memory Constellation", "Drifting nodes forming and breaking connection paths", "canvas_2d", "data", ["#5EEBFF", "#7CFFB2"]),
  buildWallpaper("agent_pulse_network", "Agent Pulse Network", "Interactive network pulses showing data transfers", "canvas_2d", "data", ["#FF4FD8", "#7AA7FF"]),
  buildWallpaper("kernel_heatmap", "Kernel Heatmap", "Slow color field inspired by processor thermals", "css_gradient", "ambient", ["#EF4444", "#F97316"]),
  buildWallpaper("audio_spectrum_glass", "Audio Spectrum", "Sound waves spectrum analyzer display style", "canvas_2d", "data", ["#3B82F6", "#8B5CF6"]),
  buildWallpaper("code_stream", "Code Stream", "Faded terminal statements streaming vertically", "canvas_2d", "developer", ["#C9D1D9", "#62778A"]),
  buildWallpaper("telemetry_nebula", "Telemetry Nebula", "Cosmic dust particle field linked to system metrics", "canvas_2d", "ambient", ["#A78BFA", "#FF4FD8"]),
  buildWallpaper("blueprint_motion", "Blueprint Motion", "Engine grid with drafting compass and vector highlights", "canvas_2d", "minimal", ["#3B82F6", "#0F2848"]),
  buildWallpaper("blacksite_sweep", "Blacksite Sweep", "Stealth radar interface sweep", "canvas_2d", "tactical", ["#00F0FF", "#050505"]),
  buildWallpaper("ghost_particles", "Ghost Particles", "Low-opacity drifting dust particles", "canvas_2d", "minimal", ["#E8F4FF", "#8DA1B3"]),
  buildWallpaper("sapphire_dataflow", "Sapphire Dataflow", "Vibrant blue streams of networking data packets", "canvas_2d", "data", ["#2563EB", "#38BDF8"]),
  buildWallpaper("violet_stormfront", "Violet Stormfront", "Fast flashing dynamic plasma storm", "css_gradient", "cinematic", ["#7C3AED", "#DB2777"]),
  buildWallpaper("solar_circuit", "Solar Circuit", "Golden electric line nodes flowing in angles", "canvas_2d", "minimal", ["#F97316", "#FFC857"])
];

export class WallpaperRegistry {
  private wallpapersMap = new Map<string, LiveWallpaperProfile>();

  constructor() {
    for (const wp of liveWallpapers) {
      this.wallpapersMap.set(wp.id, wp);
    }
  }

  getWallpaper(id: string): LiveWallpaperProfile | undefined {
    return this.wallpapersMap.get(id);
  }

  listWallpapers(): LiveWallpaperProfile[] {
    return Array.from(this.wallpapersMap.values());
  }
}

export const wallpaperRegistry = new WallpaperRegistry();
