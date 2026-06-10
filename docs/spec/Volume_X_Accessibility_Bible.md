# Volume X — Accessibility Bible

## Philosophy
Every feature must be discoverable, operable, understandable, and recoverable. Users must never be blocked by color, motion, vision, input method, reading difficulty, or motor limitations.

## Accessibility Layers
Visual, motor, cognitive, reading, controller, keyboard, assistive technology.

## Requirements
Every action supports primary controller binding, alternate binding, and accessibility alternative.

## Focus Accessibility
Focus must show border, glow, highlight, and hint. Never rely on color alone. Minimum focus indicator: 2px.

## Modes
High contrast, large text, reduced motion, colorblind, dyslexia support, screen reader support.

## High Contrast
7:1 minimum contrast. White text, black backgrounds, high visibility focus.

## Large Text
Scale levels: 100%, 125%, 150%, 175%, 200%. No clipping or hidden controls.

## Reduced Motion
Disable transitions, animations, pulses, micro-interactions. Replace with instant state changes.

## Testing Matrix
Controller only, keyboard only, touch only, screen reader, large text, high contrast, reduced motion, colorblind modes.

## Release Gates
Blocked by missing focus states, ARIA labels, keyboard inaccessible actions, controller dead ends, unreadable text, or color-only states.
