# Development Guide

## Prerequisites

| Tool     | Version | Notes                                      |
|----------|---------|--------------------------------------------|
| Rust     | 1.85.0  | Pinned. Use `rustup override set 1.85.0`   |
| Node.js  | >= 18   | LTS recommended                            |
| Python   | >= 3.8  | Only for brand-asset generator scripts     |
| uv       | latest  | Python package manager (optional)          |

Linux additional packages:
```bash
sudo apt install libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev
```

## Quick Start

```bash
# Clone
git clone https://github.com/khaoticdev62/NEURODECK.git
cd NEURODECK

# Install JS dependencies
npm install

# Set your Gemini API key (required for LLM features)
export GEMINI_API_KEY="your_key_here"

# Run in dev mode (hot-reload Vite + Rust)
npm run tauri dev
```

## Workspace Layout

```
frontend/        — Vite frontend (vanilla JS, ~30 modules)
src-tauri/       — Tauri v2 Rust backend (~42 modules)
core/            — Shared Rust types (ts-rs bindings)
infrastructure/  — OS keychain, OAuth2, Warpinator gRPC
bootstrapper/    — Updater/bootstrap stub (reserved)
plugins/         — Lua plugins (auto-loaded at startup)
e2e/             — Playwright end-to-end tests
scripts/         — Build, CI, and utility scripts
infra/           — KFMS metadata & telemetry
docs/            — Product docs, guides, audits
```

## Useful Commands

```bash
# Frontend only (CSS/HTML iteration — Tauri commands will fail)
npm run --prefix frontend dev

# Rust fast check
cd src-tauri && cargo check

# Rust lint
cd src-tauri && cargo clippy

# Rust tests
cd src-tauri && cargo test

# Frontend build
npm run --prefix frontend build

# Full production build
npm run build

# Local CI gate
bash scripts/kfms/kfms-ci.sh run
```

## Adding a New Tauri Command

1. Define `#[tauri::command]` in a `src-tauri/src/` module (or `src-tauri/src/commands/`)
2. Add to `generate_handler![]` in `src-tauri/src/lib.rs`
3. Call from frontend via `invoke("command_name", { args })`

## CSS Specificity Trap

**Never** add `display: flex` or `display: block` to `#view-*` ID rules in `app.css`.
ID selectors (specificity 100) override `.view-content.active` (specificity 20) and break tab switching.

## Config Files

Two copies of `llm-term.toml` exist:
- Root copy: deployment artifact
- `src-tauri/llm-term.toml`: runtime copy (working dir during `cargo run`)

Edit both or rely on `config.rs` path-resolution logic.

## Commit Convention

```
type: short description (max 72 chars)

Types: feat, fix, refactor, docs, build, perf, test, security
```
