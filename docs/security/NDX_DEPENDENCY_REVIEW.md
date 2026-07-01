# NeuroDeck OS Dependency Review

Date: 2026-07-01

Scope: UI polish dependency foundation and current `package.json` / `package-lock.json` tree after the Vitest 4 migration and SBOM refresh.

## Summary

- Production audit: `npm audit --omit=dev` reports 0 vulnerabilities.
- Full audit: `npm audit` reports 0 vulnerabilities.
- Direct production dependency count: 35.
- SBOM: `docs/security/sbom.json` regenerated with 983 packages: 308 production, 675 dev.
- Native runtime dependency: `node-pty`.
- Current decision: the UI polish stack is approved as a lean foundation. It adds headless primitives, motion, icons, fonts, table/virtualization, charts, markdown/PDF rendering, panels, form infrastructure, error boundaries, and accessibility tooling without replacing Electron, React, Tailwind, or the existing typed IPC architecture.

## Commands Run

```text
npm audit
-> found 0 vulnerabilities

npm.cmd ls --omit=dev --depth=0
-> 35 direct production dependencies

npm run sbom
-> SBOM generated: docs/security/sbom.json
-> 983 packages (308 production, 675 dev)

npm run lint -- --quiet
-> passed

npm run typecheck
-> passed

npm run build
-> passed
```

## UI Polish Dependency Additions

| Package | Version | Runtime role | Review note |
| --- | ---: | --- | --- |
| `@base-ui/react` | 1.6.0 | Headless accessible UI primitives | Used for future polished controls without importing a competing visual theme framework. MIT. |
| `lucide-react` | 1.22.0 | Icon system | Lightweight React icon set for controller buttons, tools, nav, and status affordances. ISC. |
| `motion` | 12.42.2 | Animation and transitions | Production animation layer; must respect reduced-motion settings. MIT. |
| `class-variance-authority` | 0.7.1 | Component variant composition | Keeps button/panel/control variants deterministic and typed. Apache-2.0. |
| `tailwind-merge` | 3.6.0 | Tailwind class conflict resolution | Supports reusable polished primitives without class-order bugs. MIT. |
| `@fontsource-variable/inter` | 5.2.8 | Bundled UI font | Local font package; avoids CDN dependency. OFL-1.1. |
| `@fontsource-variable/jetbrains-mono` | 5.2.8 | Bundled code/terminal font | Local monospace font package for code/terminal surfaces. OFL-1.1. |
| `react-hook-form` | 7.80.0 | Complex form state | Needed for settings, provider setup, package/app policy forms. MIT. |
| `@hookform/resolvers` | 5.4.0 | Zod-backed form validation | Keeps forms aligned with existing Zod contract pattern. MIT. |
| `@tanstack/react-table` | 8.21.3 | Data grids and sortable lists | Useful for packages, applications, permissions, logs, and model tables. MIT. |
| `@tanstack/react-virtual` | 3.14.5 | Virtualized lists | Needed for Deck-friendly large lists without renderer jank. MIT. |
| `react-resizable-panels` | 4.12.0 | Split pane layouts | Supports editor/workbench polish while keeping keyboard/controller fallbacks required. MIT. |
| `echarts` | 6.1.0 | Charts and telemetry visuals | For system metrics, model routing, package progress, and workload charts. Apache-2.0. |
| `react-markdown` | 10.1.0 | Markdown rendering | For docs, AI replies, and knowledge surfaces. MIT. |
| `remark-gfm` | 4.0.1 | GitHub-flavored markdown | Adds tables/task lists/strikethrough to markdown rendering. MIT. |
| `rehype-sanitize` | 6.0.0 | Markdown sanitization | Required because markdown can cross trust boundaries. MIT. |
| `pdfjs-dist` | 6.1.200 | Local PDF rendering | For knowledge/docs previews without browser plugin reliance. Apache-2.0. |
| `react-error-boundary` | 6.1.2 | Renderer error isolation | Supports polished recoverable UI failures around feature panes. MIT. |

## UI Polish Dev Tooling Additions

| Package | Version | Role | Review note |
| --- | ---: | --- | --- |
| `axe-core` | 4.12.1 | Accessibility audit engine | Dev/test only. MPL-2.0. |
| `@axe-core/playwright` | 4.12.1 | Playwright accessibility assertions | Dev/test only. MPL-2.0. |
| `prettier-plugin-tailwindcss` | 0.8.0 | Tailwind class sorting | Dev only; use carefully because the working tree has broad pre-existing CRLF churn. MIT. |

## Existing Production Dependencies

| Package | Version | Runtime role | Review note |
| --- | ---: | --- | --- |
| `@electron-toolkit/utils` | 4.0.0 | Electron app utilities | Runtime Electron helper. No production advisories from audit. |
| `@grpc/grpc-js` | 1.14.4 | LAN Share gRPC transport | Pure JS gRPC implementation; covered in LAN Share SBOM. |
| `@grpc/proto-loader` | 0.8.1 | LAN Share protobuf loading | Pure JS protobuf loader; covered in LAN Share SBOM. |
| `@monaco-editor/react` | 4.7.0 | Build Studio editor integration | Renderer-only editor wrapper. Keep Monaco locally bundled. |
| `@xterm/addon-fit` | 0.11.0 | Terminal viewport sizing | Renderer terminal add-on. |
| `@xterm/addon-search` | 0.16.0 | Terminal search | Renderer terminal add-on. |
| `@xterm/xterm` | 6.0.0 | Terminal renderer | Renderer terminal emulator. |
| `bonjour-service` | 1.4.2 | LAN Share mDNS | Network discovery package; covered in LAN Share SBOM. |
| `clsx` | 2.1.1 | Renderer class composition | Small utility dependency. |
| `diff` | 9.0.0 | Git/recovery diff views | Text diff library. |
| `monaco-editor` | 0.55.1 | Build Studio editor | Locally bundled; do not switch to CDN. |
| `node-pty` | 1.1.0 | Real PTY terminal sessions | Native dependency; packaging must continue to verify rebuild/install on target OS. |
| `react-router-dom` | 7.18.1 | Renderer routing | App navigation. |
| `selfsigned` | 5.5.0 | LAN Share certificate generation | Used for local Warpinator-compatible certs; covered in LAN Share SBOM. |
| `ssh2` | 1.17.0 | Remote SSH sessions | Network/crypto dependency; secrets remain encrypted at rest and never sent to renderer. |
| `tweetnacl` | 1.0.3 | LAN Share group-code crypto | Small audited crypto primitive; covered in LAN Share SBOM. |
| `zod` | 4.4.3 | Runtime IPC validation | Load-bearing validation dependency shared across main/preload/renderer. |

## Resolved Dev-Tooling Vulnerabilities

The previous review tracked 5 vulnerabilities in the old `vitest`/`vite`/`vite-node`/`esbuild` dev-server chain. This pass migrated direct `vitest` to `4.1.9` and ran `npm audit fix`; the final `npm audit` is clean.

Impact in plain English: the old findings were development-server risks, not packaged-app runtime code. They still mattered because a clean full audit is the simplest release gate to reason about. The test fixtures that depended on Node's `Blob` were adjusted to use local test blobs with `arrayBuffer()`, keeping the web TypeScript config clean.

## Decisions

1. Keep the new UI stack headless or utility-based; do not introduce a second themed component framework.
2. Keep markdown rendering paired with `rehype-sanitize` wherever user/model/workspace content can cross trust boundaries.
3. Keep fonts locally bundled through Fontsource; no CDN font dependency.
4. Use `motion` only behind the existing reduced-motion controls.
5. Keep `node-pty` as a named packaging risk because it is the direct native dependency backing the real terminal.
6. Keep Monaco locally bundled; the existing `dompurify` override remains the first place to check for Monaco transitive CVEs.

## Follow-Up

- Add focused accessibility checks with `@axe-core/playwright` as screens receive the polish pass.
- Use `react-resizable-panels` only where controller-accessible resizing semantics are provided.
- Use table virtualization for large lists, not small static settings groups.
- Re-run `npm audit`, `npm run sbom`, `npm run typecheck`, `npm run lint`, and `npm run build` after any future dependency expansion.
