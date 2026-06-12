# NEURODECK Live Wallpaper System Plan

This document details the engineering and architectural specifications for the new high-fidelity Live Wallpaper Engine.

---

## 1. Goal

Provide visually stunning, dynamic backgrounds that react to user focus, theme changes, and diagnostics status, while enforcing strict performance budgets to prevent CPU/GPU exhaustion on the Steam Deck.

---

## 2. Technical Features

### 2.1 Multi-Renderer Architecture
Live wallpapers will be parsed and rendered using modular components depending on performance profiles:
1. **CSS Gradient / Mesh**: Lightweight, GPU-accelerated mesh gradients using CSS keyframe animations.
2. **Canvas 2D**: For particles, grids, and waveforms. Must use requestAnimationFrame with delta-time checks to lock framerate (30/45/60 FPS).
3. **WebGL**: Optional high-fidelity procedural shader rendering for desktop hosts.
4. **Static Fallback**: Fallback to a single-frame draw or a standard background image.

### 2.2 Performance Management & Battery Safety
The engine will actively monitor rendering efficiency:
- **Visibility Throttling**: The wallpaper loop immediately stops (`cancelAnimationFrame`) if the viewport switches to a full-screen view where the background is completely obscured, or if the Electron window is minimized or inactive.
- **Battery Saver Mode**: If battery saver is active, live animations are paused and replaced with their static counterparts.
- **Dynamic Degradation**: If average frame rendering time exceeds the target threshold (e.g. dropping below 30 FPS on Steam Deck LCD), the particle counts are halved, or the wallpaper falls back to static mode.
- **Reduced Motion Support**: Respects OS `prefers-reduced-motion` settings by instantly disabling all procedural ticks and showing static outputs.

### 2.3 Burn-in Aware OLED Tuning
For Steam Deck OLED:
- **True Black Base**: Ensure background pixels are fully turned off (`#000000`) for dark areas.
- **Dim Idle Mode**: Auto-dim the wallpaper intensity if no gamepad or keyboard input is received for 5 minutes.
- **Node Shifting**: Animate connection lines or star fields gently across coordinates to avoid static pattern retention.
