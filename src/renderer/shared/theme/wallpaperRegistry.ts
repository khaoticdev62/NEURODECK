import type { LiveWallpaperProfile } from "./themeContracts";

const WALLPAPERS: LiveWallpaperProfile[] = [
  {
    id: "neural_aurora",
    name: "Neural Aurora",
    description: "Subtle animated aurora gradient.",
    renderer: "css_gradient",
    visuals: { basePalette: ["#00d4ff", "#7c3aed", "#f472b6"] },
  },
  {
    id: "tactical_signal_grid",
    name: "Tactical Signal Grid",
    description: "Drifting scanlines and radar HUD sweeps.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#00F0FF", "#0088FF", "#06131D"] },
  },
  {
    id: "oled_starfield",
    name: "OLED Starfield",
    description: "Deep-space stars with true-black backgrounds.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#FFFFFF", "#5EEBFF", "#03060B"] },
  },
  {
    id: "hologrid_drift",
    name: "Hologrid Drift",
    description: "Perspective grid motion in accent colors.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#7AA7FF", "#FF4FD8", "#070B14"] },
  },
  {
    id: "command_waveform",
    name: "Command Waveform",
    description: "Gently fluctuating data-flow sine waves.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#FF5A6A", "#FFC857", "#120B10"] },
  },
  {
    id: "deep_space_radar",
    name: "Deep Space Radar",
    description: "Circular military radar sweeps and coordinates.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#6AF0D5", "#ECFBFF", "#051014"] },
  },
  {
    id: "liquid_glass_flow",
    name: "Liquid Glass Flow",
    description: "Fluid glass blobs with soft motion.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#A78BFA", "#B8F7FF", "#0A0D13"] },
  },
  {
    id: "terminal_rainfield",
    name: "Terminal Rainfield",
    description: "Sparse green phosphor code rain.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#00FF00", "#00FF66", "#000000"] },
  },
  {
    id: "memory_constellation",
    name: "Memory Constellation",
    description: "Nodes forming and breaking connection paths.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#5EEBFF", "#7CFFB2", "#081017"] },
  },
  {
    id: "agent_pulse_network",
    name: "Agent Pulse Network",
    description: "Network pulses showing orchestration traffic.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#FF4FD8", "#7AA7FF", "#12091A"] },
  },
  {
    id: "kernel_heatmap",
    name: "Kernel Heatmap",
    description: "Slow thermal field inspired by processor load.",
    renderer: "css_gradient",
    visuals: { basePalette: ["#EF4444", "#F97316", "#140A05"] },
  },
  {
    id: "audio_spectrum_glass",
    name: "Audio Spectrum Glass",
    description: "Ambient spectral bars behind the workspace.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#3B82F6", "#8B5CF6", "#090A14"] },
  },
  {
    id: "code_stream",
    name: "Code Stream",
    description: "Faded terminal statements scrolling vertically.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#C9D1D9", "#62778A", "#000000"] },
  },
  {
    id: "telemetry_nebula",
    name: "Telemetry Nebula",
    description: "Cosmic dust cloud tied to system metrics.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#A78BFA", "#FF4FD8", "#0B0713"] },
  },
  {
    id: "blueprint_motion",
    name: "Blueprint Motion",
    description: "Drafting-grid motion with vector highlights.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#3B82F6", "#0F2848", "#08111F"] },
  },
  {
    id: "blacksite_sweep",
    name: "Blacksite Sweep",
    description: "Stealth radar sweep on a near-black field.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#00F0FF", "#050505", "#0A0D10"] },
  },
  {
    id: "ghost_particles",
    name: "Ghost Particles",
    description: "Low-opacity drifting atmospheric particles.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#E8F4FF", "#8DA1B3", "#090B10"] },
  },
  {
    id: "sapphire_dataflow",
    name: "Sapphire Dataflow",
    description: "Blue packet streams and data lines.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#2563EB", "#38BDF8", "#050B18"] },
  },
  {
    id: "violet_stormfront",
    name: "Violet Stormfront",
    description: "Animated violet plasma field.",
    renderer: "css_gradient",
    visuals: { basePalette: ["#7C3AED", "#DB2777", "#130A1D"] },
  },
  {
    id: "solar_circuit",
    name: "Solar Circuit",
    description: "Golden electric line nodes flowing in angles.",
    renderer: "canvas_2d",
    visuals: { basePalette: ["#F97316", "#FFC857", "#140C05"] },
  },
];

export const wallpaperRegistry = {
  listWallpapers(): LiveWallpaperProfile[] {
    return WALLPAPERS;
  },
  getWallpaper(id: string): LiveWallpaperProfile | undefined {
    return WALLPAPERS.find((wallpaper) => wallpaper.id === id);
  },
};
