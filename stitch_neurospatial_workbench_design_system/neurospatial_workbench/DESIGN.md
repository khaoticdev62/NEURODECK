---
name: NeuroSpatial Workbench
colors:
  surface: '#14121a'
  surface-dim: '#14121a'
  surface-bright: '#3a3841'
  surface-container-lowest: '#0e0d15'
  surface-container-low: '#1c1b22'
  surface-container: '#201f27'
  surface-container-high: '#2b2931'
  surface-container-highest: '#35343c'
  on-surface: '#e5e0ec'
  on-surface-variant: '#c9c4d6'
  inverse-surface: '#e5e0ec'
  inverse-on-surface: '#312f38'
  outline: '#928e9f'
  outline-variant: '#484553'
  surface-tint: '#c8bfff'
  primary: '#c8bfff'
  on-primary: '#2e0599'
  primary-container: '#917eff'
  on-primary-container: '#28008a'
  inverse-primary: '#5e49c8'
  secondary: '#4dd6fd'
  on-secondary: '#003543'
  secondary-container: '#00b2d7'
  on-secondary-container: '#003f4e'
  tertiary: '#59dbbd'
  on-tertiary: '#00382d'
  tertiary-container: '#00a488'
  on-tertiary-container: '#003127'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c8bfff'
  on-primary-fixed: '#1a0063'
  on-primary-fixed-variant: '#452daf'
  secondary-fixed: '#b5ebff'
  secondary-fixed-dim: '#4dd6fd'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004e5f'
  tertiary-fixed: '#79f8d8'
  tertiary-fixed-dim: '#59dbbd'
  on-tertiary-fixed: '#002019'
  on-tertiary-fixed-variant: '#005142'
  background: '#14121a'
  on-background: '#e5e0ec'
  surface-variant: '#35343c'
typography:
  display:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  safe-margin: 40px
  hit-target: 44px
---

## Brand & Style

The design system is a high-performance, controller-first interface designed for the Steam Deck. It merges the structural density of **VS Code** with the cinematic depth of **Apple tvOS** and the minimalist clarity of **Claude Desktop**. 

The brand personality is **Technical Elegance**: it feels like a professional-grade instrument that is simultaneously approachable and calming. The UI leverages a "Sovereign Dark" aesthetic—deep, multi-layered blacks that reduce eye strain during long sessions while providing a canvas for vibrant, high-fidelity data visualizations. 

The emotional response is one of **Hyper-Focus and Flow**. Every interaction is designed to feel substantial and tactile, grounding the user in a spatial environment where AI isn't just a tool, but a physical presence within the workbench.

## Colors
The palette is built on a "Deep Space" scale. Surfaces use incremental shifts in hex value to establish hierarchy rather than relying on heavy shadows. 

- **Primary (Neural Violet):** Used for core AI actions, focus rings, and active intelligence states.
- **Secondary (Signal Cyan):** Used for connectivity indicators, data streaming, and secondary interactive elements.
- **Success (Intelligence Teal):** Specifically used for completed AI computations and positive outcomes.
- **Neutral Scale:** Primary text is off-white to prevent "bloom" on the Steam Deck LCD screen. Tertiary text is reserved for metadata and inactive breadcrumbs.

## Typography
The system uses a dual-sans approach. **Geist** provides a technical, sharp edge for headers and UI anchors, while **Inter** ensures maximum legibility for conversational text and documentation at lower resolutions.

- **Legibility:** All body text must maintain at least a 14px size for handheld readability.
- **Monospace:** JetBrains Mono is strictly reserved for code blocks, terminal outputs, and coordinate data.
- **Hierarchy:** Use FontWeight 600 for labels to ensure they punch through the dark background surfaces.

## Layout & Spacing
The layout is optimized for the **1280x800 (16:10)** aspect ratio. 

- **Grid:** A 12-column fluid grid is used for the main workspace, but most interactions occur within a 3-pane VS Code-style structure (Sidebar / Main / Inspector).
- **Controller Targets:** A mandatory 44px minimum touch/focus target is enforced for all interactive elements to accommodate thumbstick navigation and capacitive touch.
- **Safe Areas:** A 40px margin is maintained on all edges to ensure UI elements aren't obscured by the physical bezel or the user's thumbs.
- **Focus Rhythm:** Vertical lists use 8px spacing between items to ensure clear separation when the focus scale effect is active.

## Elevation & Depth
This design system rejects flat design in favor of "Solid Dimensionality." Depth is communicated through color-stepping and light simulation.

- **Hairline Edges:** Every panel and card features a 1px top-border (inner-glow) hexed at `#FFFFFF` with 12% opacity to simulate overhead light hitting the edge.
- **Tonal Stacking:** `background_deepest` is the "void" behind all windows. `background_primary` is the main app canvas. `background_elevated` is for floating panels or active modal overlays.
- **Focus Scale:** Following tvOS conventions, focused elements scale up by 5% and gain a 2px outer glow using the Primary Accent color.
- **Shadows:** Avoid drop shadows on flat surfaces. Use them only for "Elevated" and "Hero" panels, using a 32px blur with 40% opacity of the `background_deepest` color.

## Shapes
Shapes follow a progressive rounding scale. The larger the surface, the softer the corners.

- **Small (8px):** Buttons, chips, and small tags.
- **Inputs (10px):** Text fields and dropdowns.
- **Panels (14px):** Sidebar containers and main content areas.
- **Hero (22px):** Centered modal dialogs and the primary AI "Pulse" container.

## Components

### Buttons & Inputs
- **Buttons:** Solid containers using `background_surface` for inactive and `primary_color` for active/primary actions. All buttons include a subtle inner gradient (top-to-bottom, 10% white to 0%).
- **Inputs:** Darker than the surface they sit on (`background_deepest`), with a 1px border of `text_tertiary` at 20% opacity.

### Neural Pulse (AI State)
The "Neural Pulse" is a 120x120px circular component located in the top-right or center-screen.
- **Idle:** A single 2px ring of Neural Violet at 30% opacity, slowly breathing (2s cycle).
- **Listening:** Multiple concentric rings expanding outward, using Signal Cyan.
- **Analyzing:** A rotating "refraction" effect where a gradient blur spins behind a frosted mask.
- **Streaming:** High-frequency vibration of the inner ring with Intelligence Teal sparks.

### Focus Rings
The focus ring is not a simple border. It is a 3px "halo" of `primary_color` with a 4px blur, ensuring it is visible even in peripheral vision while using a controller.

### Lists & Cards
Lists utilize `background_surface` with "Gap Spacing." Highlighting a list item triggers a horizontal "slide-in" of a 4px vertical bar on the left edge in Neural Violet.