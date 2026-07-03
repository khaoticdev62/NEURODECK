# NeuroDeckOS Full UI Enhancement Dependency List

**Purpose:** Production dependency map for the NeuroDeckOS Supreme UI Enhancement pass  
**Primary platform:** Steam Deck / SteamOS  
**Application stack:** Electron + React + TypeScript + Vite + Tailwind CSS  
**Package manager:** `pnpm` recommended  
**Verified baseline date:** 2026-06-22

> Audit the existing repository before installing anything. Keep the current working build/packaging stack where possible, remove duplicates, and never expose native modules to the renderer.

# 1. Dependency and Version Policy

- Split dependencies by renderer, shared UI, Electron main/preload, core service, testing, and packaging.
- Pin Electron to an exact tested patch.
- Keep `react` and `react-dom` on the same patch.
- Keep Vite and `@vitejs/plugin-react` on compatible major lines.
- Commit `pnpm-lock.yaml` and use frozen installs in CI.
- Pin and rebuild native modules against the exact Electron ABI.
- Upgrade one dependency family at a time and rerun type, controller, accessibility, visual, and packaging tests.
- Never use `latest` in committed production manifests.
- Do not upgrade an existing stable repository only to match this document.

### Current recommended major lines

| Area              | Baseline                       |
| ----------------- | ------------------------------ |
| Electron          | 42.4.x stable                  |
| React / React DOM | 19.2.x patched                 |
| React Router      | 8.0.x                          |
| Vite              | 8.0.x                          |
| Vite React plugin | 6.x                            |
| Tailwind CSS      | 4.x                            |
| TypeScript        | Compatible stable 5.x          |
| Development Node  | Node 22 LTS or validated newer |
| xterm.js          | 6.x                            |
| Monaco Editor     | 0.55.x                         |
| Base UI           | Stable 1.x                     |

# 2. Workspace Boundaries

```text
apps/
├── desktop/       Electron main + preload
└── renderer/      React UI
packages/
├── ui/            Design system and primitives
├── controller/    Gamepad, glyphs, spatial focus
├── contracts/     Zod schemas and shared types
├── core-client/   Typed renderer client
├── testing/       Shared test utilities
└── config/        ESLint, TypeScript, Tailwind
services/
└── core/          Native and operating-system integrations
```

### Renderer-safe

React, routing, state, forms, validation, Base UI wrappers, Motion, icons, tables, virtualization, charts, Markdown, PDF rendering, Monaco, and xterm rendering.

### Main/core only

`electron`, `node-pty`, `better-sqlite3`, `execa`, filesystem APIs, child processes, secrets, package managers, system metrics, and native modules.

Never import a main/core package into the renderer.

# 3. Required Renderer Foundation

### React runtime

```text
react
react-dom
react-router
```

Rendering, routes, lazy screens, navigation state, and route error handling. Use React Router Data or Declarative Mode for the Electron SPA unless the repository already has a valid Framework Mode setup.

### State and server state

```text
zustand
@tanstack/react-query
```

Use Zustand for local shell/UI state and TanStack Query for IPC-backed service state. Do not mirror Query data into Zustand or put terminal streams into global React state.

### Runtime contracts

```text
zod
```

Validate IPC payloads, settings, manifests, imported data, profiles, and user-editable structured configuration.

# 4. Design-System Foundation

### Styling

```text
tailwindcss
@tailwindcss/vite
```

Use Tailwind v4 through the Vite plugin. Add PostCSS only for a real additional requirement.

### Accessible primitives

```text
@base-ui/react
```

Wrap Base UI in `Ndx*` components. The NeuroDeck spatial focus engine remains authoritative for controller traversal.

### Variants and classes

```text
class-variance-authority
clsx
tailwind-merge
```

Create semantic variants and one shared `cn()` utility.

### Icons

```text
lucide-react
```

Use a controlled `NdxIcon` registry; do not mix icon systems.

### Motion

```text
motion
```

Use `motion/react` for focus, route, modal, panel, and task-state transitions. Prefer CSS for simple color and border transitions.

# 5. Forms and Structured Input

### Form stack

```text
react-hook-form
@hookform/resolvers
zod
```

Use for settings, profiles, provider setup, permissions, routing, mappings, install reviews, and secure configuration. Focus the first invalid field and announce errors.

# 6. Data-Dense UI and Layout

### Tables

```text
@tanstack/react-table
```

Processes, permissions, audit, packages, models, storage, and transfers.

### Virtualization

```text
@tanstack/react-virtual
```

Long files, logs, activity, search, timelines, catalogs, and marketplace lists. Preserve logical focus IDs across recycled rows.

### Split panes

```text
react-resizable-panels
```

Editor, terminal, file preview, browser, logs, and comparison layouts. Add controller resize commands.

# 7. Feature-Scoped UI

### Code editor

```text
monaco-editor
@monaco-editor/react (optional wrapper)
```

Configure workers, lazy loading, themes, controller mode, LSP bridge, diff views, resize, and model disposal.

### Terminal renderer

```text
@xterm/xterm
@xterm/addon-fit
@xterm/addon-search
@xterm/addon-web-links
@xterm/addon-serialize
```

Add WebGL, Unicode 11, or clipboard addons only after capability and performance testing. Never store terminal buffers in React state.

### Workflow canvas

```text
@xyflow/react
@dagrejs/dagre
```

Use `elkjs` instead of Dagre only when advanced layout is genuinely required. Support non-drag controller movement.

### Charts

```text
echarts
```

Build a NeuroDeck wrapper, import only needed charts, provide text summaries, and respect reduced motion.

### Markdown

```text
react-markdown
remark-gfm
rehype-sanitize
dompurify
```

Do not enable raw HTML by default. Use `shiki` only as a lazy optional syntax highlighter.

### PDF preview

```text
pdfjs-dist
```

Configure its worker for Vite/Electron and support search, thumbnails, page focus, and controller zoom.

### Localization

```text
i18next
react-i18next
```

Use `Intl` before adding date libraries. Locale detection is optional when profile settings are authoritative.

### Error containment

```text
react-error-boundary
```

Use feature-level boundaries so a chart, extension, editor, or browser failure cannot kill the shell.

# 8. Controller and Spatial Focus

No third-party package is mandatory for base controller input.

Use:

```text
Browser Gamepad API
requestAnimationFrame
Performance API
ResizeObserver
IntersectionObserver
```

Build internal packages:

```text
@ndx/controller
@ndx/focus
@ndx/glyphs
@ndx/haptics
@ndx/controller-testing
```

They must implement device normalization, semantic actions, repeat/dead-zone handling, holds, chords, profiles, spatial focus, focus memory/restoration, glyphs, and test injection.

Add a small SDL3 native helper only when Steam Input and Gamepad API cannot expose required controls. Keep it outside the renderer.

# 9. Optional Local Fonts

```text
@fontsource-variable/inter
@fontsource-variable/jetbrains-mono
```

Alternative UI family:

```text
@fontsource-variable/ibm-plex-sans
```

Choose one UI family and one monospace family, bundle locally, subset when possible, validate licensing, and keep system fallbacks. Do not fetch fonts at runtime.

# 10. Electron Build Foundation

### Development dependencies

```text
electron
vite
@vitejs/plugin-react
typescript
@types/node
@types/react
@types/react-dom
@electron/rebuild
```

Keep the repository's existing Electron/Vite integration. Use either `electron-vite` or a custom Vite multi-entry configuration—not several competing Electron-Vite plugins.

`@electron/rebuild` is required when native modules such as `node-pty`, `better-sqlite3`, or `sharp` are used.

# 11. Main/Core Dependencies Supporting the UI

### Real terminal backend

```text
node-pty
```

PTY lifecycle, input, resize, streaming output, and exit state.

### Persistent state

```text
better-sqlite3
```

Keep database access in the core service. Use one SQLite driver.

### Noninteractive processes

```text
execa
```

Use for bounded commands; do not replace interactive PTYs with it.

### File watching

```text
chokidar
```

Workspace, external file, extension, and import-directory changes.

### Logging

```text
pino
pino-pretty (development only)
```

Structured logs with secret redaction.

### Concurrency limits

```text
p-limit
```

Bound scanning, metadata, indexing, and capability checks.

### Image processing

```text
sharp (optional native)
```

Only for actual thumbnails, conversion, or optimization.

### System metrics

```text
systeminformation (optional)
```

Use behind a core adapter and verify every SteamOS metric.

Prefer Electron `safeStorage` plus a reference-based vault before adding another credential library.

# 12. Code Quality

```text
eslint
@eslint/js
typescript-eslint
eslint-plugin-react-hooks
eslint-plugin-react-refresh
eslint-plugin-jsx-a11y
eslint-plugin-import-x
eslint-plugin-boundaries
prettier
prettier-plugin-tailwindcss
knip
syncpack
```

Optional local workflow:

```text
husky
lint-staged
```

Use boundary lint rules to prevent renderer-to-core imports, direct raw primitive imports, and design-system bypasses. CI remains authoritative.

# 13. Testing and Visual QA

### Unit and component

```text
vitest
@vitest/coverage-v8
jsdom
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
```

### Electron E2E and visual regression

```text
@playwright/test
```

Use semantic controller-event injection, not mouse-only tests.

### Accessibility

```text
axe-core
@axe-core/playwright
@axe-core/react
```

`@axe-core/react` belongs in development only. Automated checks do not replace manual controller, contrast, screen-reader, and large-text testing.

### Component workshop

```text
storybook
@storybook/react-vite
@storybook/addon-a11y
@storybook/addon-vitest
```

### Test-only network/service mocks

```text
msw
```

MSW handlers must never enter production bundles.

### Property-based testing

```text
fast-check
```

Use for focus graphs, controller sequences, route metadata, and reducer invariants.

# 14. Packaging and Release

Choose one packaging stack.

### Existing electron-builder project

```text
electron-builder
electron-updater
```

### Electron Forge project

```text
@electron-forge/cli
@electron-forge/plugin-vite
```

Do not maintain both stacks.

Additional optional hardening and assets:

```text
@electron/fuses
svgo
```

# 15. SteamOS Host Dependencies

These are host tools, not renderer npm packages.

### Development

```text
git
Node.js 22 LTS
Corepack
pnpm
Python 3
make
gcc/g++
pkg-config
```

On Arch-derived development systems, compiler tools commonly come from `base-devel`.

### Runtime capabilities, detected rather than assumed

```text
flatpak
xdg-utils
NetworkManager / nmcli
OpenSSH client
git
D-Bus
systemctl --user
PipeWire
WirePlumber
BlueZ
udisks2
polkit
```

Normal users must not need to disable the SteamOS read-only filesystem or install a compiler toolchain.

# 16. Optional Enhancements

Install only for approved features:

```text
fuse.js          Local fuzzy matching when the search service is insufficient
culori           Theme contrast and perceptual color calculations
wavesurfer.js    Voice-note and audio waveforms
qrcode           Short-lived secure pairing codes
pixi.js          Only for a proven high-performance canvas need
```

Lazy-load feature-heavy packages.

# 17. Avoid or Justify Explicitly

Do not install several competing packages in the same role.

### UI systems

Choose Base UI or the repository's proven alternative; do not combine it with a complete Radix, Headless UI, MUI, Ant Design, and Chakra stack.

### State

Do not combine Zustand, Redux, MobX, Jotai, Recoil, and Valtio without an isolated, documented reason.

### Charts

Do not mix ECharts, Recharts, Chart.js, Victory, and multiple D3 wrappers.

### Other anti-patterns

- Native modules bundled into renderer
- Raw HTML without sanitization
- Abandoned gamepad wrappers
- Particle and animated-gradient libraries
- Several icon packs
- Carousel packages for normal focus lists
- Heavy 3D engines for shell decoration
- Production imports from test mocks
- Multiple Electron packaging systems

# 18. Recommended pnpm Commands

Run only after auditing current dependencies.

### Core renderer

```bash
pnpm add \
  react@19.2 react-dom@19.2 react-router@8 \
  zustand @tanstack/react-query zod \
  @base-ui/react class-variance-authority clsx tailwind-merge \
  lucide-react motion react-error-boundary
```

### Forms, tables, virtualization, and panes

```bash
pnpm add \
  react-hook-form @hookform/resolvers \
  @tanstack/react-table @tanstack/react-virtual \
  react-resizable-panels
```

### Feature surfaces

```bash
pnpm add \
  monaco-editor \
  @xterm/xterm @xterm/addon-fit @xterm/addon-search \
  @xterm/addon-web-links @xterm/addon-serialize \
  @xyflow/react @dagrejs/dagre echarts \
  react-markdown remark-gfm rehype-sanitize dompurify \
  pdfjs-dist i18next react-i18next
```

### Optional local assets and media

```bash
pnpm add \
  @fontsource-variable/inter \
  @fontsource-variable/jetbrains-mono \
  culori wavesurfer.js qrcode
```

### Core service only

```bash
pnpm add \
  node-pty better-sqlite3 execa chokidar pino p-limit
```

Optional core:

```bash
pnpm add sharp systeminformation
```

### Build

```bash
pnpm add -D \
  electron@42.4.1 vite@8 @vitejs/plugin-react@6 \
  tailwindcss@4 @tailwindcss/vite@4 \
  typescript @types/node @types/react @types/react-dom \
  @electron/rebuild
```

### Quality

```bash
pnpm add -D \
  eslint @eslint/js typescript-eslint \
  eslint-plugin-react-hooks eslint-plugin-react-refresh \
  eslint-plugin-jsx-a11y eslint-plugin-import-x \
  eslint-plugin-boundaries \
  prettier prettier-plugin-tailwindcss knip syncpack
```

### Tests

```bash
pnpm add -D \
  vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom \
  @playwright/test axe-core @axe-core/playwright @axe-core/react \
  msw fast-check
```

### Storybook

```bash
pnpm add -D \
  storybook @storybook/react-vite \
  @storybook/addon-a11y @storybook/addon-vitest
```

# 19. Suggested Package Placement

| Package family                | Workspace                         |
| ----------------------------- | --------------------------------- |
| React, Router, Query, Zustand | `apps/renderer`                   |
| Base UI, Motion, Lucide       | `packages/ui`                     |
| Tokens and Tailwind config    | `packages/ui` / `packages/config` |
| Zod schemas                   | `packages/contracts`              |
| Gamepad and focus             | `packages/controller`             |
| Monaco, xterm, XYFlow         | Feature package or renderer       |
| node-pty, SQLite, Execa       | `services/core`                   |
| Electron                      | `apps/desktop`                    |
| Playwright                    | Root test workspace               |
| Storybook                     | `packages/ui` or dedicated app    |
| Shared test utilities         | `packages/testing`                |

# 20. Validation Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm test:controller
pnpm test:a11y
pnpm test:visual
pnpm build
pnpm package:linux
pnpm exec knip
pnpm exec syncpack lint
pnpm audit
pnpm exec electron-rebuild
```

Run `pnpm exec playwright install` in the supported development/CI environment.

# 21. Acceptance Checklist

- [ ] No duplicate UI framework
- [ ] No duplicate state manager
- [ ] No duplicate chart library
- [ ] No native module in renderer
- [ ] No raw Base UI imports outside NDX wrappers
- [ ] No direct icon imports outside the registry
- [ ] No unvalidated IPC payload
- [ ] No production test mocks
- [ ] No abandoned dependency without an exception record
- [ ] Lockfile committed
- [ ] Native modules rebuilt for Electron
- [ ] Licenses reviewed
- [ ] Bundle sizes measured
- [ ] Monaco lazy-loaded
- [ ] xterm route-loaded
- [ ] ECharts modularly imported
- [ ] PDF.js worker configured
- [ ] Motion honors reduced motion
- [ ] Storybook covers design primitives and states
- [ ] Axe tests pass
- [ ] Controller traversal passes
- [ ] 1280 × 800 visual regression passes
- [ ] Linux/Steam Deck package launches

# 22. Final Recommended Stack

```text
Electron
React
React Router
TypeScript
Vite
Tailwind CSS
Base UI
Motion
Lucide
Zustand
TanStack Query
TanStack Table
TanStack Virtual
React Hook Form
Zod
Monaco Editor
xterm.js
XYFlow
ECharts
React Markdown
PDF.js
i18next
Vitest
Testing Library
Playwright
axe-core
Storybook
```

Every additional dependency must earn its place through a real feature, measurable benefit, maintained production path, and clear process boundary.
