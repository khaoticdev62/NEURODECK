import type { LiveWallpaperProfile } from "./themeContracts";

function wallpaper(
  id: string,
  name: string,
  description: string,
  renderer: LiveWallpaperProfile["renderer"],
  basePalette: string[]
): LiveWallpaperProfile {
  return { id, name, description, renderer, visuals: { basePalette } };
}

const WALLPAPERS: LiveWallpaperProfile[] = [
  wallpaper("neural_aurora", "Neural Aurora", "Subtle animated aurora gradient.", "css_gradient", ["#00d4ff", "#7c3aed", "#f472b6"]),
  wallpaper("tactical_signal_grid", "Tactical Signal Grid", "Drifting scanlines and radar HUD sweeps.", "canvas_2d", ["#00F0FF", "#0088FF", "#06131D"]),
  wallpaper("oled_starfield", "OLED Starfield", "Deep-space stars with true-black backgrounds.", "canvas_2d", ["#FFFFFF", "#5EEBFF", "#03060B"]),
  wallpaper("hologrid_drift", "Hologrid Drift", "Perspective grid motion in accent colors.", "canvas_2d", ["#7AA7FF", "#FF4FD8", "#070B14"]),
  wallpaper("command_waveform", "Command Waveform", "Gently fluctuating data-flow sine waves.", "canvas_2d", ["#FF5A6A", "#FFC857", "#120B10"]),
  wallpaper("deep_space_radar", "Deep Space Radar", "Circular military radar sweeps and coordinates.", "canvas_2d", ["#6AF0D5", "#ECFBFF", "#051014"]),
  wallpaper("liquid_glass_flow", "Liquid Glass Flow", "Fluid glass blobs with soft motion.", "canvas_2d", ["#A78BFA", "#B8F7FF", "#0A0D13"]),
  wallpaper("terminal_rainfield", "Terminal Rainfield", "Sparse green phosphor code rain.", "canvas_2d", ["#00FF00", "#00FF66", "#000000"]),
  wallpaper("memory_constellation", "Memory Constellation", "Nodes forming and breaking connection paths.", "canvas_2d", ["#5EEBFF", "#7CFFB2", "#081017"]),
  wallpaper("agent_pulse_network", "Agent Pulse Network", "Network pulses showing orchestration traffic.", "canvas_2d", ["#FF4FD8", "#7AA7FF", "#12091A"]),
  wallpaper("kernel_heatmap", "Kernel Heatmap", "Slow thermal field inspired by processor load.", "css_gradient", ["#EF4444", "#F97316", "#140A05"]),
  wallpaper("audio_spectrum_glass", "Audio Spectrum Glass", "Ambient spectral bars behind the workspace.", "canvas_2d", ["#3B82F6", "#8B5CF6", "#090A14"]),
  wallpaper("code_stream", "Code Stream", "Faded terminal statements scrolling vertically.", "canvas_2d", ["#C9D1D9", "#62778A", "#000000"]),
  wallpaper("telemetry_nebula", "Telemetry Nebula", "Cosmic dust cloud tied to system metrics.", "canvas_2d", ["#A78BFA", "#FF4FD8", "#0B0713"]),
  wallpaper("blueprint_motion", "Blueprint Motion", "Drafting-grid motion with vector highlights.", "canvas_2d", ["#3B82F6", "#0F2848", "#08111F"]),
  wallpaper("blacksite_sweep", "Blacksite Sweep", "Stealth radar sweep on a near-black field.", "canvas_2d", ["#00F0FF", "#050505", "#0A0D10"]),
  wallpaper("ghost_particles", "Ghost Particles", "Low-opacity drifting atmospheric particles.", "canvas_2d", ["#E8F4FF", "#8DA1B3", "#090B10"]),
  wallpaper("sapphire_dataflow", "Sapphire Dataflow", "Blue packet streams and data lines.", "canvas_2d", ["#2563EB", "#38BDF8", "#050B18"]),
  wallpaper("violet_stormfront", "Violet Stormfront", "Animated violet plasma field.", "css_gradient", ["#7C3AED", "#DB2777", "#130A1D"]),
  wallpaper("solar_circuit", "Solar Circuit", "Golden electric line nodes flowing in angles.", "canvas_2d", ["#F97316", "#FFC857", "#140C05"]),
];

export const wallpaperRegistry = {
  listWallpapers(): LiveWallpaperProfile[] {
    return WALLPAPERS;
  },
  getWallpaper(id: string): LiveWallpaperProfile | undefined {
    return WALLPAPERS.find((wallpaper) => wallpaper.id === id);
  },
};
