# NEURODECK Workstation — UI Kit

An interactive, high-fidelity recreation of the **NEURODECK** handheld AI workstation shell,
built at the native Steam Deck resolution (**1280 × 800**) and scaled to fit any viewport.

It composes the design-system primitives (`Button`, `Badge`, `StatusChip`, `Panel`,
`IconButton`, `ModelCard`, `AgentCard`, `SessionCard`, …) inside product-specific layout
components.

## Run it
Open `index.html`. The shell is fully interactive:

- **Nav rail** (left, 72px) switches views: Chat, Models, Agents, Sessions, Doctor (+ placeholder
  Memory / Plugins / Settings).
- **Chat workspace** — type a prompt and press Enter (or **Send**); a simulated response streams
  into a tactical-glass response card with copy/regenerate actions and a latency readout.
- **Command palette** — open with the **Command** pill, the in-app button, or **Ctrl/⌘ + K**.
  Arrow keys + Enter to run; a permission-gated plugin command shows as disabled.
- **Models / Agents / Sessions / Doctor** views are built from the system cards, with live
  model selection reflected in the status bar and context panel.
- **Context panel** (right, 280px) shows the active model, pinned memory, and retrieved context.
- **Controller hint bar** (bottom) mirrors the A/B/X/Y/L1·R1 mapping.

## Files
- `index.html` — Steam Deck frame, scaling, and mount.
- `icons.tsx` — curated Lucide-geometry icon set (the product's icon system).
- `StatusBar.tsx` — 40px persistent status band (wordmark, session, telemetry, online state).
- `NavRail.tsx` — controller-first primary navigation.
- `ChatWorkspace.tsx` — conversation viewport + role-tagged response cards + streaming.
- `InputConsole.tsx` — multiline prompt/command entry pinned to the bottom edge.
- `CommandPalette.tsx` — fuzzy universal launcher with keyboard/controller nav.
- `FeatureViews.tsx` — Models, Agents, Sessions, Diagnostics views (from system cards).
- `Shell.tsx` — composes everything and owns app state.

## Notes
- This is a **cosmetic recreation** for design work — responses and telemetry are simulated, and
  Memory / Plugins / Settings are intentionally left as labelled placeholders (not part of this
  mock). Behaviour mirrors the real renderer's structure, not its production logic.
- Source of truth: `khaoticdev62/NEURODECK` → `frontend/src/react/` (layout, cards, primitives)
  and the Full Screen Catalog / Component Library docs.
