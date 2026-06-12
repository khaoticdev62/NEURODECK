# NEURODECK Desktop / Docked Theme Plan

This document details how the theme engine scales, adapts, and behaves when running NEURODECK on desktop computers or when a Steam Deck is docked to external monitors (1080p, 1440p, 4K).

---

## 1. Goal

Scale UI layout density, styling details, and live wallpaper parameters dynamically to match high-resolution screens and mouse/keyboard navigation models.

---

## 2. Desktop Display Tuning

### 2.1 Multi-Pane Visual Density
- On large displays (1920×1080 and up), the UI can reveal higher density logs, side-by-side terminal panes, and persistent telemetry dashboards.
- Theme spacing scales down (more compact paddings) as mouse navigation provides sub-pixel accuracy.

### 2.2 Higher Performance Budgets
- **Particle Count**: The particle count ceiling for live wallpapers scales from 250 (handheld) up to 750 (desktop GPU).
- **WebGL Assets**: High-resolution procedural shaders and 2K/4K static images are unlocked when connected to external power and display outputs.
- **Backdrop Blur**: Enable high-resolution backdrop blur effects (`backdrop-filter: blur(16px)`).
- **Animations**: Standard standard transition timers run at full 60/120Hz.

---

## 3. Docked Mode Behavior

When the Steam Deck is docked to a TV or monitor:
- Detect screen resolution changes via resize events.
- Switch the active display profile to `docked_tv` or `desktop_1080p`.
- Adjust font sizes and margins to preserve readability from a distance (couch mode), utilizing the controller-friendly D-pad focus indicators.
