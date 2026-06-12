# NEURODECK Steam Deck Visual Optimization Plan

This document outlines visual and performance optimization protocols tailored specifically for the Steam Deck LCD and OLED models.

---

## 1. Goal

Ensure complete readability, visual excellence, accessibility, and high performance at 1280×800 resolution on a 7-inch display, while preserving battery life and thermals.

---

## 2. Display Optimization Matrices

### 2.1 Steam Deck LCD Tuning
- **Screen Limitations**: Shorter color gamut, lower contrast ratios.
- **Optimization Strategy**:
  - Boost text color luminosity values slightly (closer to high contrast) to avoid muddy readability.
  - Enhance border contrast using thicker lines or higher opacity accent variables.
  - Reduce backdrop blur radius (CSS filter `blur`) to prevent GPU overhead on the LCD APU.

### 2.2 Steam Deck OLED Tuning
- **Screen Strengths**: Infinite contrast ratio, wider gamut, 90Hz refresh rate.
- **Optimization Strategy**:
  - Leverage true black (`#000000`) backgrounds to maximize power efficiency and contrast.
  - Use vibrant HSL accents (HDR-friendly color range) without causing visual glare.
  - Implement 45/90Hz refresh alignment to match native display rates, avoiding frame judder.
  - Mitigate burn-in risk by fading or shifting static high-brightness elements.

---

## 3. Handheld Ergonomics & Readability (1280×800)

- **Font Scale Boost**: When `deckMode` is active, apply a global font multiplier (+10-15%) across secondary metadata, logs, and shortcuts.
- **Interactive Targets**: Enforce a minimum hit target of 40×40px for touch/pointer inputs.
- **Contrast Ratios**: Strictly maintain WCAG AA readability (>4.5:1) for all core UI states on both display types.
