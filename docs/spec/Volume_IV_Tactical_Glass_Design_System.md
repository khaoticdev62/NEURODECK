# Volume IV — Tactical Glass Design System Core

## Design Philosophy
PromptDrive should feel like SteamOS native, JetBrains IDE, Blackmagic Resolve, AAA tactical HUD, and professional workstation. It must not feel like a generic dashboard or RGB gamer UI.

## Layer Hierarchy

- L0 Background
- L1 Surface
- L2 Interactive
- L3 Focus
- L4 Overlay
- L5 Modal
- L6 Critical

## Core Tokens

```json
{
  "surface.primary": "#0A0D10",
  "surface.secondary": "#11161C",
  "surface.tertiary": "#1A212B",
  "text.primary": "#E8F4FF",
  "text.secondary": "#8DA1B3",
  "text.muted": "#5F7284",
  "accent.primary": "#5EEBFF",
  "accent.success": "#7CFFB2",
  "accent.warning": "#FFC857",
  "accent.error": "#FF5A6A"
}
```

## Typography

Primary: Inter. Monospace: JetBrains Mono. Fallback: IBM Plex Sans.

Type scale: display 36, heading 28, title 22, body 16, caption 14, micro 12.

## Spacing

```json
{ "xs": 4, "sm": 8, "md": 12, "lg": 16, "xl": 24, "xxl": 32, "hero": 48 }
```

No arbitrary spacing.

## Motion

Allowed: fade, slide, reveal, pulse. Forbidden: bounce, elastic overshoot, particle effects, heavy blur, screen shake.

## Focus States

Default transparent border. Hover surface border. Focus 2px accent border. Active accent-tinted background. Disabled opacity .4.

## Controller Hint System

Every actionable component displays context-aware hints such as `[A] Select`, `[B] Back`, `[R4] Accept`, `[R5] Execute`.

## Built-In Themes

Tactical Glass, Blacksite, Ghost Terminal, Night Watch, Minimal Ops, HoloGrid.

## Accessibility Tokens

High contrast sets white focus and text on black backgrounds. Reduced motion sets durations to zero. Large text scales by 1.25+.

## Tailwind Mapping

Tailwind config must expose semantic colors, tokenized spacing, tokenized font family, focus ring utilities, and motion duration tokens.
