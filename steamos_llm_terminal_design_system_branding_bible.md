# NEURODECK
## Design System & Branding Bible
### SteamOS Native AI Terminal Interface

Version: 1.0
Platform: Steam Deck / SteamOS Game Mode
Design Language: Cyberdeck Industrial / Retro ANSI / Neo-Arcade Systems UI

---

# Brand Identity

## Product Name
# NEURODECK

## Tagline Options
- "Portable Intelligence Terminal"
- "Your AI Cyberdeck"
- "The Handheld AI Operating System"
- "Game Mode Meets Machine Intelligence"
- "Terminal Interface for Synthetic Minds"

## Brand Positioning
NEURODECK is positioned as:
- a handheld cyberdeck OS
- an immersive AI workstation
- a console-native developer environment
- a retro-futuristic AI interface
- a productivity terminal disguised as a sci-fi operating system

The application should feel closer to:
- a fictional operating system
- a hacker simulator
- a military command console
- a late-90s cyberpunk terminal

than a traditional chatbot.

---

# Brand Personality

## Core Personality Traits

| Trait | Description |
|---|---|
| Tactical | Feels engineered and precise |
| Industrial | Functional over decorative |
| Immersive | Feels like an operating environment |
| Responsive | Fast and reactive |
| Underground | Cyberpunk + blacksite aesthetic |
| Modular | Highly configurable |
| Intelligent | AI-first interaction model |

---

# Visual Identity

## Modernized UI Direction — GEN-4 Tactical Interface

The original retro ANSI direction is now evolved into a modern hybrid interface optimized specifically for the Steam Deck LCD GPU budget.

The UI should combine:
- lightweight GPU-friendly rendering
- modern HUD layering
- premium game launcher aesthetics
- terminal-native rendering constraints
- tactical dashboard design
- ultra-fast redraw performance

The target aesthetic is now:
- 70% modern tactical operating system
- 20% premium game UI
- 10% retro terminal influence

NOT a pure retro terminal.

The interface should feel closer to:
- a modern sci-fi handheld OS
- a tactical command dashboard
- a premium console launcher
- a military-grade AI interface

while preserving:
- information density
- controller-first navigation
- terminal responsiveness
- ANSI compatibility

---

# Steam Deck LCD Rendering Constraints

## Critical Performance Constraints

Steam Deck LCD hardware constraints require:

| Constraint | Design Response |
|---|---|
| Limited GPU budget | Minimal overdraw |
| 1280x800 LCD | Larger readable typography |
| Shared VRAM | Lightweight animation system |
| TDP limitations | Efficient redraw regions |
| Game Mode compositor | Avoid transparency abuse |
| Battery sensitivity | Low-cost effects only |

---

# GPU-Optimized Rendering Philosophy

## NEVER USE
- gaussian blur spam
- acrylic effects
- excessive transparency
- layered alpha gradients
- heavy particle systems
- bloom effects
- realtime shadows
- expensive terminal shaders
- overdraw-heavy animations
- Electron-style rendering

## ALWAYS PREFER
- flat layered panels
- clean gradients
- minimal compositing
- rectangular segmentation
- subtle motion
- sparse glow usage
- strategic contrast
- texture illusion through typography
- ANSI-assisted depth

---

# New Visual Design Language

## Interface Style Name
# TACTICAL GLASS

TACTICAL GLASS combines:
- modern flat HUDs
- low-opacity panel framing
- segmented system cards
- tactical linework
- restrained neon accents
- adaptive terminal density
- high readability

The result should feel:
- premium
- sharp
- responsive
- cinematic
- native to Steam Deck

without becoming visually noisy.

---

# Modern UI Composition Rules

## Panel Hierarchy

The UI should use:
- primary content zones
- secondary telemetry zones
- compact status strips
- embedded overlays
- collapsible utility panels

NOT giant fullscreen text walls.

---

# Modern Layout System

## Primary Interface Layout

```text
┌──────────────────────────────────────────────┐
│ MODEL │ TOKENS │ LATENCY │ BATTERY │ GPU    │
├──────────────────────────────────────────────┤
│                                              │
│ CHAT STREAM                                  │
│                                              │
│                                              │
│                                              │
├──────────────────────┬───────────────────────┤
│ CONTEXT PANEL        │ ACTIVE AGENT          │
│ MEMORY STATE         │ SYSTEM PROMPT         │
│ TOOL STATUS          │ SESSION DATA          │
├──────────────────────┴───────────────────────┤
│ INPUT CONSOLE                                 │
└──────────────────────────────────────────────┘
```

---

# Advanced Component Styling

## Component Philosophy

Every component should resemble:
- embedded avionics
- tactical workstation modules
- high-end console UI cards
- cybernetic dashboard panels

Each panel should have:
- strong edge definition
- soft inner contrast
- restrained glow accents
- segmented borders
- lightweight motion states

---

# Modern Surface System

## Surface Layers

| Layer | Purpose |
|---|---|
| Base Layer | Deep matte background |
| Panel Layer | Functional cards |
| Accent Layer | Active highlights |
| Signal Layer | Streaming telemetry |
| Overlay Layer | Menus and modals |

---

# Modern Color System

## Gen-4 Palette

| Name | Hex | Purpose |
|---|---|---|
| Carbon Black | #0A0D10 | Main background |
| Slate Graphite | #11161C | Secondary panels |
| Ice Cyan | #5EEBFF | Accent |
| Volt Green | #7CFFB2 | AI output |
| Soft White | #E8F4FF | Text |
| Amber Signal | #FFC857 | Notifications |
| Error Red | #FF5A6A | Errors |
| Deep Indigo | #1A2230 | Subpanels |

---

# Typography Modernization

## New Typography Rules

Typography should prioritize:
- readability at handheld distance
- terminal density
- clean modern shapes
- anti-fatigue spacing

Preferred stack:
1. JetBrains Mono
2. Berkeley Mono
3. IBM Plex Mono
4. Geist Mono

---

# Motion Design System

## Motion Philosophy 2.0

Motion should feel:
- mechanical
- predictive
- lightweight
- responsive
- GPU-cheap

---

# Allowed Motion Types

| Motion | Cost | Usage |
|---|---|---|
| Opacity fade | Low | Menus |
| Positional slide | Low | Panels |
| Cursor pulse | Very Low | Active typing |
| Scan sweep | Medium | Rare transitions |
| Border illumination | Low | Focus state |

---

# Forbidden Motion Types

- fullscreen particle effects
- realtime blur distortion
- expensive CRT shaders
- layered alpha animations
- bouncing UI physics
- excessive spring motion

---

# Steam Deck Native UX Rules

## Physical Ergonomics

The UI must account for:
- thumb reach zones
- handheld viewing distance
- eye fatigue
- quick suspend/resume usage
- controller-only operation

---

# Deck-Optimized Interaction Zones

## Reach Priority

| Zone | Importance |
|---|---|
| Bottom Center | Highest |
| Lower Left | High |
| Lower Right | High |
| Top Corners | Lowest |

Critical interactions should NEVER live permanently in top corners.

---

# Advanced HUD Concepts

## Dynamic Telemetry Layer

Optional telemetry strip:
- VRAM usage
- token/sec
- CPU load
- model context size
- battery drain estimate
- inference latency

This should resemble:
- spaceship diagnostics
- tactical combat HUDs
- server monitoring dashboards

---

# Modern Terminal Rendering

## Rendering Hybrid

NEURODECK should blend:
- ANSI rendering
- modern HUD framing
- structured panel systems
- adaptive spacing
- responsive telemetry

The interface should NEVER look like:
- plain SSH
- stock Linux terminal
- basic chat application

---

# Modern Input Console

## Input Bar Evolution

The input system should resemble:
- modern command palettes
- AAA game console overlays
- tactical command entry systems

Features:
- predictive command hints
- inline macro chips
- contextual slash suggestions
- expandable multiline mode
- active token counter

---

# Modern Chat Rendering

## Message Styling

User messages:
- compact
- right aligned
- minimal chrome
- sharp outlines

AI responses:
- structured cards
- segmented sections
- syntax-aware formatting
- adaptive spacing
- embedded metadata

---

# GPU-Efficient Visual Tricks

## Fake Depth Techniques

Use:
- dual-tone borders
- edge highlights
- strategic spacing
- typography layering
- low-cost gradients
- shadow illusion through contrast

Instead of:
- realtime shadows
- blur systems
- layered transparency

---

# Sixel & ANSI Enhancement Strategy

Optional advanced modes:
- sixel headers
- ANSI microanimations
- procedural ASCII dividers
- lightweight texture overlays

These should remain optional to preserve battery life.

---

# Modern Modal Design

## Modal Philosophy

Modals should:
- feel embedded
- avoid fullscreen takeovers
- preserve system context
- support fast dismissal

Design inspiration:
- modern game overlays
- tactical system popups
- SteamOS native panels

---

# Lighting Philosophy

## Glow Usage Rules

Glow should:
- communicate importance
- guide focus
- indicate activity

Glow should NEVER:
- dominate the screen
- reduce readability
- bloom aggressively

Maximum glow opacity target:
- 15%

---

# Modern Branding Evolution

## Brand Tone Shift

Original Direction:
- underground retro terminal

New Direction:
- premium tactical AI operating system

The visual identity now sits between:
- Blackmagic Design UI
- SteamOS Game Mode
- Destiny tactical HUDs
- Cyberpunk operating systems
- high-end terminal dashboards

---

# Future UI Expansion Strategy

## Planned UI Modes

| Mode | Description |
|---|---|
| Classic ANSI | Retro terminal mode |
| Tactical Glass | Default modern UI |
| Minimal Ops | Ultra-light productivity mode |
| Hologrid | Experimental animated mode |
| Broadcast | Stream-friendly layout |

---

# Final UI Experience Goal

NEURODECK should ultimately feel like:
- a next-generation handheld AI workstation
- a tactical cyberdeck operating system
- a premium Steam Deck-native AI shell
- a futuristic command environment

The user should immediately think:
"This feels like software designed FOR the Steam Deck — not software merely running on it."

---

# Visual Identity

## Core Aesthetic

NEURODECK combines:
- CRT terminal aesthetics
- industrial military interfaces
- arcade operator panels
- cyberpunk command systems
- ASCII visual language
- chromatic aberration inspired color accents
- subtle analog degradation

Visual inspiration categories:
- ANSI terminals
- tactical HUD systems
- SCP-style command interfaces
- synthwave monochrome displays
- retro operating systems
- command line dashboards

---

# Design Pillars

## Pillar 1 — Functional Immersion
Every UI element should feel usable in-universe.

## Pillar 2 — Information Density
High information density without visual clutter.

## Pillar 3 — Controller-First UX
The UI must feel native on Steam Deck.

## Pillar 4 — Motion With Purpose
Animations should communicate system state.

## Pillar 5 — Terminal Authenticity
Preserve real terminal characteristics.

---

# Logo System

## Primary Logo

Text-based wordmark:

```text
███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗
████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║██║  ██║█████╗  ██║     █████╔╝
██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║  ██║██╔══╝  ██║     ██╔═██╗
██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝██████╔╝███████╗╚██████╗██║  ██╗
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝
```

---

# Iconography

## Icon Design Language
Icons should:
- use monospaced geometry
- use thin-line terminal styling
- support ANSI rendering
- render cleanly at low resolutions
- prioritize readability over realism

## Icon Categories
- networking
- AI state
- sessions
- memory
- filesystem
- streaming
- personas
- agents
- notifications

---

# Color System

## Primary Palette

| Name | Hex | Usage |
|---|---|---|
| Void Black | #050505 | Main background |
| Signal Cyan | #00F0FF | Primary accent |
| Terminal Green | #00FF88 | AI responses |
| Plasma Amber | #FFB000 | Warnings |
| Crimson Fault | #FF3C5A | Errors |
| Ghost White | #D9F7FF | Text |
| Neon Purple | #A855F7 | Persona highlights |

---

# Theme Presets

## Default Theme — BLACKSITE

```toml
background = "#050505"
foreground = "#D9F7FF"
accent = "#00F0FF"
response = "#00FF88"
warning = "#FFB000"
error = "#FF3C5A"
```

## Theme — TERMINAL_GHOST

```toml
background = "#000000"
foreground = "#00FF66"
accent = "#00FFCC"
response = "#88FFAA"
warning = "#FFD166"
error = "#EF476F"
```

## Theme — SYNTH_GRID

```toml
background = "#0F0A1A"
foreground = "#E0E0FF"
accent = "#FF00FF"
response = "#00FFFF"
warning = "#FFC857"
error = "#FF006E"
```

---

# Typography System

## Primary Font Characteristics

Requirements:
- monospaced
- crisp at low DPI
- terminal optimized
- ANSI-friendly
- highly legible on 7-inch displays

## Recommended Fonts

| Font | Usage |
|---|---|
| JetBrains Mono | Primary UI |
| IBM Plex Mono | System text |
| Iosevka | Dense interfaces |
| Cascadia Mono | Alternate UI |
| Terminus | Retro mode |

---

# Terminal Layout Standards

## Resolution Target
1280x800

## Safe Margins

| Area | Margin |
|---|---|
| Outer Frame | 16px |
| Chat Padding | 12px |
| Input Padding | 8px |
| Modal Spacing | 20px |

---

# UI Architecture

## Main Layout

```text
┌──────────────────────────────────────────┐
│ HEADER / STATUS BAR                      │
├──────────────────────────────────────────┤
│                                          │
│ CHAT VIEWPORT                            │
│                                          │
│ STREAMING OUTPUT                         │
│                                          │
├──────────────────────────────────────────┤
│ INPUT FIELD                              │
├──────────────────────────────────────────┤
│ HOTKEY BAR / SYSTEM STATUS               │
└──────────────────────────────────────────┘
```

---

# Animation System

## Motion Philosophy
Animations should emulate:
- terminal refreshes
- CRT phosphor pulses
- system diagnostics
- packet transmission
- AI computation

---

# Animation Categories

## Token Streaming
Characters appear incrementally.

## Pulse Effects
Active panels softly pulse.

## Scanline Sweeps
Used during loading transitions.

## Data Flickers
Micro-flickers during inference.

## Signal Corruption
Intentional occasional distortion.

---

# Audio Design Language

## Audio Style
Minimal, tactile, low-frequency UI sounds.

## Audio Inspiration
- military hardware
- retro keyboard switches
- data center ambiance
- Geiger counter clicks
- synth pulses

---

# Interaction Design

## Controller-First Navigation

Rules:
- every action reachable without touchscreen
- no hover-dependent UX
- radial menus for dense actions
- low travel distance between primary actions

---

# Input Feedback Standards

| Event | Feedback |
|---|---|
| Submit Prompt | short pulse + confirmation sound |
| Error | red flash |
| Streaming | animated cursor |
| Save Complete | subtle green pulse |
| Persona Change | purple chroma transition |

---

# HUD Components

## Status Bar
Contains:
- model name
- token speed
- latency
- memory usage
- battery status
- online/offline state

## Chat Viewport
Supports:
- markdown
- syntax highlighting
- ANSI art
- inline metadata
- timestamps

## Input Console
Supports:
- multiline input
- macros
- slash commands
- clipboard paste

---

# Modal System

## Modal Types

| Modal | Purpose |
|---|---|
| Persona Switcher | Change AI modes |
| Export Menu | Save conversations |
| Settings | Configure system |
| Theme Selector | Change chroma schemes |
| Macro Wheel | Quick actions |

---

# Branding Rules

## Always Avoid
- glossy modern UI
- rounded mobile-app aesthetics
- oversized whitespace
- social media styling
- soft pastel palettes
- browser-like interfaces

## Always Emphasize
- technical density
- industrial framing
- terminal realism
- scanline textures
- monochrome layering
- angular structures

---

# Lore Positioning (Optional)

NEURODECK can optionally be framed as:
- an abandoned military AI console
- a blacksite portable terminal
- a rogue synthetic intelligence shell
- a cyberpunk field workstation

This layer should remain optional and non-blocking.

---

# ASCII Language System

ASCII should be used for:
- separators
- panel borders
- startup screens
- loading visuals
- diagnostics
- splash animations

Example:

```text
[ SYS://NEURODECK ]
> MODEL STATUS: ONLINE
> MEMORY FABRIC: STABLE
> INPUT LAYER: STEAM_INPUT_ACTIVE
```

---

# Startup Sequence Design

## Boot Flow

```text
INITIALIZING MEMORY FABRIC...
LOADING PERSONA INDEX...
ESTABLISHING MODEL LINK...
STEAM INPUT DETECTED...
NEURODECK READY.
```

---

# Suggested Splash Screens

## Variant 1 — Tactical

```text
[ NEURODECK ]
PORTABLE SYNTHETIC INTELLIGENCE TERMINAL
```

## Variant 2 — Retro ANSI

```text
:: NEURODECK v1.0 ::
SYSTEM LINK ESTABLISHED
```

---

# Accessibility Design

## Requirements
- scalable UI
- controller-only operation
- low-vision themes
- reduced animation mode
- configurable chroma intensity
- configurable text density

---

# Performance UX Rules

## Never Allow
- input lag
- dropped stream updates
- modal lockups
- frame hitching during token rendering
- blocking UI updates

## Preferred Targets

| Metric | Target |
|---|---|
| Input Response | <16ms |
| Stream Rendering | <100ms |
| Theme Switching | instant |
| Startup Time | <2s |

---

# Marketing Positioning

## Primary Audience
- developers
- tinkerers
- terminal enthusiasts
- Steam Deck power users
- AI hobbyists
- cyberpunk aesthetic fans

## Market Identity
NEURODECK should occupy a niche between:
- developer tooling
- immersive operating systems
- AI utilities
- cyberpunk simulation software

---

# Store Description Draft

"NEURODECK transforms your Steam Deck into a handheld AI cyberdeck. Built with a fully immersive terminal UI, native controller support, and streaming local AI integration, it delivers a retro-futuristic command environment designed for developers, tinkerers, and terminal enthusiasts."

---

# Future Branding Expansion

Potential ecosystem extensions:
- NEURODECK CORE
- NEURODECK AGENTS
- NEURODECK OPS
- NEURODECK GRID
- NEURODECK SHELL
- NEURODECK MEMORY

---

# Final Experience Goal

NEURODECK should feel like:
- carrying a sci-fi terminal in your backpack
- booting into an underground AI operating system
- using a tactical handheld intelligence console
- interacting with a living terminal environment

The user should immediately feel:
- immersion
- responsiveness
- control
- atmosphere
- technical power
- handheld-native usability

