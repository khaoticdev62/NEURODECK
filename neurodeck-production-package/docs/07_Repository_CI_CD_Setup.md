# NEURODECK Repository & CI/CD Setup

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Repository Structure

```
S-Term/
├── AGENTS.md ............................. Agent guidance (coding conventions)
├── promptflow.yaml ....................... PromptFlow config (dev workflow SSoT)
├── package.json .......................... Root package, npm scripts
├── Cargo.toml ............................ Workspace root
├── Cargo.lock ............................ Dependency lockfile
├──
├── src-tauri/ ............................ Rust backend
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs ........................ AppState, module re-exports
│   │   ├── bridge.rs ..................... axum server, WsBroadcaster
│   │   ├── commands/ ..................... ~5,400-line dispatch table
│   │   │   ├── mod.rs .................... Bridge command router
│   │   │   ├── agent.rs .................. Agent execution commands
│   │   │   ├── browser.rs ................ Headless Chrome commands
│   │   │   ├── git.rs .................... Git2 integration
│   │   │   ├── session.rs ................ send_command, RAG injection
│   │   │   └── system.rs ................. Index, export, context stats
│   │   ├── db/migrations/ ................ SQLite schema evolution
│   │   └── ... (modules: llm, memory, pty_manager, scheduler,
│   │               workflow_engine, orchestrator, permissions,
│   │               lua, plugin_mgr, game, transfer, canvas_collab,
│   │               computer_use, sync, security, ftp, tunnel,
│   │               whisper, mcp, lsp, doc_indexer, dashboard,
│   │               context_packs, privacy, search, projects,
│   │               models, providers, paths, config, storage)
│   └── tests/ ............................ Integration tests
│
├── frontend/ ............................. Vite frontend
│   ├── src/
│   │   ├── main.js ....................... ~8K lines, app bootstrap
│   │   ├── app.css ....................... ~9K lines, Tactical Glass
│   │   ├── neurobridge.js ................ Tauri API replacement
│   │   ├── chat.js ....................... Message rendering
│   │   ├── canvas.js ..................... Editor + preview
│   │   ├── memory.js ..................... Memory tab UI
│   │   ├── agent.js ...................... Agent loop UI
│   │   ├── workflow_view.js .............. Node editor
│   │   ├── settings.js ................... Settings modal
│   │   ├── radial.js ..................... Radial menu
│   │   ├── graph_view.js ................. D3.js memory graph
│   │   ├── ide_view.js ................... IDE tab
│   │   ├── lsp_client.js ................. LSP completions
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── ...
│
├── electron/ ............................. Electron main process
│   ├── main.js
│   ├── preload.js
│   └── package.json
│
├── infrastructure/ ....................... Rust workspace crate
│   ├── src/ .............................. secrets, oauth, warpinator
│   └── Cargo.toml
│
├── core/ ................................. Rust workspace crate
│   └── ...
│
├── bootstrapper/ ......................... Rust workspace crate
│   └── ...
│
├── plugins/ .............................. Lua plugins (auto-loaded)
│   ├── hermes.lua
│   ├── bmad.lua
│   ├── promptgen.lua
│   └── ...
│
├── assets/ ............................... Static assets
│   ├── brand/ ............................ Logo, icons, grid images
│   ├── steam-grid/ ....................... Steam Grid assets
│   ├── steam_input/ ...................... Controller VDF mappings
│   ├── bmad-bundle/ ...................... BMAD agent bundles
│   └── deckcode/ ......................... DeckCode schema files
│
├── docs/ ................................. All documentation
│   ├── epics/ ............................ EPIC-001 through EPIC-007
│   ├── IMPLEMENTATION_PLAN.md ............ Sprint roadmap
│   ├── ANTIGRAVITY_HANDOFF.md ............ Feature backlog
│   ├── project-context.md ................ Identity & sprint history
│   ├── ROADMAP_*.md ...................... Version roadmaps
│   ├── BRIDGE_SERVER.md .................. IPC documentation
│   ├── ARCHITECTURE.md ................... High-level architecture
│   ├── USER_GUIDE.md ..................... End-user documentation
│   └── ...
│
├── neurodeck-production-package/ ......... This package (SSoT)
│   ├── README.md
│   ├── INDEX.md
│   ├── manifest.json
│   ├── checklists/
│   ├── ci/
│   ├── docs/ ............................. 00–09 specification documents
│   └── scripts/
│
├── production_code_prompt_system/ ........ PromptFlow CLI + 15 prompts
│   ├── src/promptflow/ ................... Python CLI source
│   ├── prompts/ .......................... 01–15 production prompts
│   ├── tests/ ............................ 57 Python tests
│   └── pyproject.toml
│
├── scripts/ .............................. Build & utility scripts
│   ├── dev/ .............................. Development utilities
│   │   ├── css/, js/, json/, lua/, python/
│   │   ├── add_compat_imports.py
│   │   ├── fix_tauri_remainders.py
│   │   ├── build-sidecar.ps1
│   │   └── build-sidecar.sh
│   ├── shell/ ............................ Shell build scripts
│   ├── powershell/ ....................... PowerShell build scripts
│   ├── kfms/ ............................. KFMS governance scripts
│   ├── git-hooks/ ........................ Git hooks
│   ├── promptflow-run.sh ................. PromptFlow wrapper (Unix)
│   └── promptflow-run.ps1 ................ PromptFlow wrapper (Windows)
│
├── e2e/ .................................. Playwright E2E tests
│   ├── tests/
│   ├── pages/
│   ├── support/
│   └── playwright.config.ts
│
├── tests/ ................................ Shared test fixtures
│   ├── fixtures/ ......................... Config, memory, plugin fixtures
│   └── README.md
│
├── infra/ ................................ KFMS metadata
│   ├── meta/
│   │   ├── meta.json
│   │   ├── meta.schema.json
│   │   └── CODENAME_REGISTRY.md
│   └── telemetry/
│       └── health.json
│
├── aur/ .................................. Arch Linux PKGBUILD
├── flatpak/ .............................. Flatpak manifest & build scripts
│
├── build/ ................................ Build artifacts
├── dist/ ................................. Distribution packages
├── dist-electron/ ........................ Electron unpackaged builds
│
├── _bmad/ ................................ BMAD agent configuration
├── _bmad-output/ ......................... BMAD sprint artifacts
│
├── .agents/ .............................. BMAD skill definitions
├── .loose/ ............................... KFMS loose-file inbox
│
├── .github/ .............................. GitHub templates & workflows
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
```

---

## 2. Git Workflow

| Branch | Purpose |
|---|---|
| `master` | Production-ready, tagged releases only |
| `release/v1.8.x` | Release line, cherry-picks from master |
| `feature/*` | Individual features, rebased before merge |
| `hotfix/*` | Critical fixes, fast-tracked to master |

### Commit Rules
- KFMS post-commit hook stamps `infra/meta/meta.json`
- No commits without `cargo check` passing
- PRs require CI gate green + 1 review

---

## 3. CI/CD Pipelines

### 3.0 Complete Workflow Inventory

All 12 GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR + push master | Main CI: check, lint, test, build |
| `ci-gate.yml` | PR | 6-gate production quality gate |
| `production-ci.yml` | push master | Simplified main-branch CI |
| `release-build.yml` | workflow_dispatch / push tag | Multi-platform release (Windows NSIS + Linux AppImage) |
| `production-release.yml` | workflow_dispatch | Production release automation |
| `steam-deck-validation.yml` | push master | AppImage runtime, gamepad, Vulkan/OpenGL, glibc, binary arch validation |
| `plugin-qa.yml` | `plugins/**` change | Lua QA: `@name`/`@version`/`@author` annotations, size ≤ 512 KB, 8 blocked APIs |
| `validate-codename.yml` | `infra/meta/**` change | KFMS codename collision detection, registry alignment, tag format |
| `kfms-release.yml` | release tag push | Full KFMS validation on publish |
| `validate-meta-schema.yml` | `infra/meta/**` change | `meta.json` JSON Schema validation via `ajv-cli` |
| `verify-telemetry.yml` | `infra/meta/**` change | `health.json` integrity, 5-check truth, version/codename drift detection |
| `security.yml` | push master | `cargo-audit`, `cargo-deny`, `npm-audit`, CodeQL SAST, secret scanning |

### 3.1 CI Gate (`.github/workflows/ci-gate.yml`)

```yaml
name: CI Gate
on: [push, pull_request]
jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@1.92.0
      - uses: Swatinem/rust-cache@v2
      - run: cd src-tauri && cargo check
      - run: cd src-tauri && cargo test --lib
      - run: cd src-tauri && cargo test --tests
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run frontend:build
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: cd e2e && npm install && npx playwright install
      - run: cd e2e && npx playwright test
```

### 3.2 Release Build (`.github/workflows/release-build.yml`)

```yaml
name: Release Build
on:
  push:
    tags: ['v*']
jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/shell/build_appimage.sh
      - uses: actions/upload-artifact@v4
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - run: .\package_release.ps1
      - uses: actions/upload-artifact@v4
```

### 3.3 KFMS Validation (`.github/workflows/validate-meta-schema.yml`)

- Validates `infra/meta/meta.json` against JSON Schema
- Verifies codename maps to correct MINOR version
- Checks `health.json` has all 5 checks true

---

### 3.4 KFMS CLI (Post-Commit Hook)

The KFMS post-commit hook in `.git/hooks/post-commit` runs automatically after every commit:

```bash
bash scripts/kfms/khaotic-init.sh stamp    # Re-stamps meta.json (SHA, timestamp, dirty flag)
bash scripts/kfms/khaotic-init.sh validate # Validates schema and governance rules
bash scripts/kfms/khaotic-init.sh status   # Prints health summary to terminal
```

Available commands:

| Command | Purpose |
|---|---|
| `stamp` | Updates build block in `meta.json` (SHA, tag, timestamp, dirty flag); syncs `health.json`, `CODENAME_REGISTRY.md`, `IMPLEMENTATION_PLAN.md` |
| `validate` | Checks `meta.json` against JSON Schema, validates codename/version alignment |
| `status` | Prints KFMS health summary: version, codename, release decision, score |
| `sweep` | Moves loose root files to `.loose/inbox/` (non-destructive housekeeping) |
| `sync` | Syncs derived artifacts from `meta.json` without re-stamping |

---

## 4. Build Scripts

| Script | Platform | Purpose |
|---|---|---|
| `npm run dev` | All | Hot-reload dev (Electron + Rust + Vite) |
| `npm run build` | All | Production build |
| `npm run sidecar:build` | All | Rust release build |
| `npm run frontend:build` | All | Vite production build |
| `./scripts/shell/build_appimage.sh` | Linux | AppImage package |
| `.\package_release.ps1` | Windows | NSIS installer + zip |
| `./install.sh` | Linux | SteamOS deploy to ~/Applications/ |
| `./launch_gamescope.sh` | Linux | Run in gamescope 1280×800 |

---

## 5. Environment Setup

### Prerequisites

```bash
# Rust
rustup default 1.92.0

# Node.js >= 18
npm install

# Python (for PromptFlow)
pip install -e "./production_code_prompt_system[dev]"

# Env var
export GEMINI_API_KEY="your-key"
# Windows: set GEMINI_API_KEY=your-key
```

### Verification

```bash
npm run promptflow:doctor    # Validate setup
npm run rust:check           # cargo check
npm run rust:test            # cargo test --lib
npm run frontend:build       # Vite build
```
