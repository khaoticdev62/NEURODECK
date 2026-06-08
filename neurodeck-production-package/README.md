# NEURODECK Production Package

> **Version:** 1.8.0-ptah | **KFMS:** v1.8.0-Ptah | **Date:** 2026-06-08
>
> This package is the **north star and single source of truth** for NEURODECK application development. All architectural decisions, feature specifications, release gates, and operational runbooks live here.

---

## What NEURODECK Is

NEURODECK is an AI-powered terminal OS for Steam Deck — a single fullscreen 1280×800 window that combines:

- **LLM Chat** with RAG memory injection (Gemini + Ollama)
- **Live Code Canvas** with Monaco editor, HTML/JS preview, Python/Bash execution
- **PTY Terminal** with multi-session tabs (up to 5), shell switcher
- **SSH Tab** with password + key-file auth, saved profiles
- **Autonomous Agent** with 5-step ReAct loop, permission-gated tool use
- **Vector Memory** with cosine-similarity search, context packs, privacy tiers
- **Browser Automation** (embedded + headless Chrome sessions)
- **Workflow Engine** with visual node editor, cron scheduler triggering
- **Plugin SDK** via Lua 5.4 runtime with hot-reload
- **LAN File Transfer** (P2P + Warpinator gRPC), FTP/SFTP browser
- **Steam Deck Native** — radial menu, D-pad navigation, L2 gamepad input
- **Desktop Computer Use** — screenshot, mouse, keyboard (approval-gated)

**Architecture:** Electron 36 spawns Rust sidecar (`--bridge` mode) → axum HTTP + WebSocket on `localhost:9477`. Frontend is vanilla JS (~8K lines) with Vite build. Zero Tauri runtime.

---

## Quick Navigation

| Document | Purpose |
|---|---|
| [INDEX.md](INDEX.md) | Full document map and quick-start guide |
| [docs/00_Master_Blueprint](docs/00_NEURODECK_Master_PRD_SDS_Implementation_Blueprint.md) | Architecture, volumes, release gates |
| [docs/01_Product_PRD](docs/01_Product_PRD.md) | Feature definitions, user stories, acceptance criteria |
| [docs/02_SDS](docs/02_Software_Design_Specification.md) | Module boundaries, data flows, IPC contracts |
| [docs/03_Roadmap](docs/03_Implementation_Roadmap.md) | Sprint history, current status, next work |
| [docs/04_Security](docs/04_Security_Privacy_Hardening.md) | Threat model, hardening, privacy architecture |
| [docs/05_Steam_Deck_UX](docs/05_Steam_Deck_UX_Release_Gate.md) | 1280×800 constraints, controller nav, release gate |
| [docs/06_QA_Testing](docs/06_QA_Testing_Release_Gates.md) | Test matrix, E2E coverage, quality gates |
| [docs/07_CI_CD](docs/07_Repository_CI_CD_Setup.md) | GitHub Actions, build pipeline, release automation |
| [docs/08_Plugin_SDK](docs/08_Plugin_Automation_Workflow_Spec.md) | Lua API, marketplace, workflow engine spec |
| [docs/09_Release](docs/09_Release_Packaging_Observability.md) | Packaging scripts, installers, observability, support bundles |
| [checklists/FINAL_RELEASE](checklists/FINAL_1_0_RELEASE_CHECKLIST.md) | Go/no-go checklist for every release |
| [checklists/BACKLOG](checklists/PRODUCTION_BACKLOG.md) | Epic/story backlog with current status |

---

## Development Workflow

All development work is driven through the **Production Code Prompt System**:

```bash
# Audit before starting new work
npm run promptflow:audit

# Security review after sensitive changes
npm run promptflow:security

# Release certification before tagging
npm run promptflow:release

# Review last run
npm run promptflow:report
```

See [AGENTS.md](../AGENTS.md) for full dev commands and architecture notes.

---

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 36 |
| Frontend | Vanilla JavaScript (no framework), Vite 8 |
| Terminal | xterm.js + xterm-addon-fit |
| Markdown | marked.js |
| QR codes | qrcode (npm) |
| Backend | Rust 1.92.0, edition 2021 |
| Async runtime | tokio |
| HTTP server | axum (bridge mode) |
| Database | SQLite with WAL mode, sqlx |
| Migrations | `src-tauri/src/db/migrations/` |
| Vector DB | Custom cosine-similarity (memory.rs) |
| PTY | portable-pty |
| Lua runtime | mlua with Lua 5.4 vendored |
| Gamepad | gilrs |
| FTP | suppaftp |
| Scheduler | tokio-cron-scheduler |
| gRPC | tonic 0.11 (Warpinator) |
| mDNS | mdns-sd 0.11 |

---

## Target Platforms

- **Primary:** Steam Deck LCD/OLED, SteamOS Game Mode (1280×800)
- **Secondary:** Linux desktop (any resolution)
- **Tertiary:** Windows 10/11

---

## License

UNLICENSED — Proprietary, Khaotic Labs
