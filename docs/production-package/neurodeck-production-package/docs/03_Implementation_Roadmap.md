# NEURODECK Implementation Roadmap

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## Sprint History

| Sprint | Feature | Version | Status |
|---|---|---|---|
| 3.1 | Monaco Editor Integration (Canvas + IDE) | v1.3.0-Isis | ✅ Complete |
| 3.2 | Whisper STT Upgrade (offline transcription) | v1.3.0-Isis | ✅ Complete |
| 3.3 | Knowledge Graph View (D3.js force-directed) | v1.3.0-Isis | ✅ Complete |
| 3.4 | Task Scheduler (cron-style agent runs) | v1.3.0-Isis | ✅ Complete |
| 3.5 | Git Integration (git2 bindings, 20+ commands) | v1.3.0-Isis | ✅ Complete |
| 4.1 | Workflow Visual Builder (node editor, `.ndwf`) | v1.3.0-Isis | ✅ Complete |
| 4.2 | Multi-Agent Orchestrator (task decomposition) | v1.3.0-Isis | ✅ Complete |
| 4.3 | Browser Automation (headless + embedded) | v1.3.0-Isis | ✅ Complete |
| 4.3 | Command Palette (Ctrl+K, fuzzy search) | v1.3.0-Isis | ✅ Complete |
| 4.4 | Plugin Marketplace (GitHub registry, install) | v1.3.0-Isis | ✅ Complete |
| 4.5 | Desktop Computer Use (screenshot, mouse, keyboard) | v1.3.0-Isis | ✅ Complete |
| 4.6 | Cloud Sync (encrypted, ring/AES-GCM) | v1.3.0-Isis | ✅ Complete |
| 5.1 | Real-Time Collaborative Workspaces (LAN TCP) | v1.3.0-Isis | ✅ Complete |
| 5.3 | Multi-LSP Client (6 language servers) | v1.3.0-Isis | ✅ Complete |
| 5.4 | JPE Diagnostics & Manual UI | v1.4.0-Osiris | ✅ Complete |
| 5.5 | Hermes 3 Native Integration | v1.4.0-Osiris | ✅ Complete |
| 6.1 | Context Packs, Privacy & Dashboard (Epic 3) | v1.5.0-Horus | ✅ Complete |
| 6.2 | Accessibility & Keyboard-First Refinements | v1.6.0-Bastet | ✅ Complete |
| 6.3 | Browser Citation Surfaces | v1.6.0-Bastet | ✅ Complete |
| 6.4 | Agent Permission Registry (Story 4.1) | v1.8.0-Ptah | ✅ Complete |
| 6.5 | Bridge Dispatch Repair (Story 4.2) | v1.8.0-Ptah | ✅ Complete |
| 6.6 | Workflow Execution Engine (Story 4.3) | v1.8.0-Ptah | ✅ Complete |
| 6.7 | Plugin Permission Gating (Story 4.4) | v1.8.0-Ptah | ✅ Complete |
| 7.0 | PromptFlow Integration (Production Code Prompt System) | v1.8.0-Ptah | ✅ Complete |
| 7.1 | Production Package Hardening | v1.8.0-Ptah | ✅ Complete |
| 8.0 | Model Runtime Provider Stack (Phases 8–10) | v1.8.0-Ptah | ✅ Complete |

---

## Current State

### Completed (v1.8.0-ptah)
- 143+ Rust unit tests passing; 10 integration tests passing
- Bridge server: ~298/300 commands wired (>99% coverage)
- 1 command intentionally unavailable: `set_kiosk_mode`
- Model runtime/provider stack delivered:
  - `list_provider_runtimes`, `discover_installed_models`, `get_provider_health`, `run_model_probe`
  - `get_model_compatibility_scores`, `pick_best_local_model`
  - `get_agent_model_policies`, `get_allowed_models_for_agent`, `validate_agent_model`
  - `evaluate_recovery`, `record_recovery_event`, `get_recovery_event_log`, `get_model_support_metrics`
- SettingsView uses registry-driven provider list; DiagnosticsView uses bridge-backed connection matrix
- Dead-code verification works without the `fallow` CLI using committed baseline
- Root `npm run frontend:test` fixed via bash wrapper to avoid Vitest setup-file context bug
- Frontend: 15 radial segments, 19+ views, Command Palette, all modals with FocusTrap
- CSS: Tactical Glass theme system, no horizontal overflow at 1280×800
- Security: 9 capabilities, deny-by-default, 3 built-in profiles
- Workflow engine: 9 node types, headless execution, scheduler triggering, run history
- Permission system: Runtime enforcement in agent, shell, browser, computer, memory, plugin commands

---

## Next Work

### Immediate (v1.8.x patch releases)
1. **Production Package completion** — This package becomes the SSoT
2. **Steam Deck E2E validation** — Run full test matrix on physical hardware
3. **Windows installer signing** — Code-sign NSIS installer
4. **AppImage CI fix** — Restore Linux automated build

### Short-term (v1.9.x)
1. **Mobile Companion App** (Sprint 5.2) — React Native/Expo, deferred from v1.5
2. **WebSocket/CRDT collaboration hardening** — Upgrade LAN TCP to WebSocket, add CRDT
3. **Local LLM model manager** — HuggingFace GGUF browser/downloader

### Long-term (v2.0.x — KFMS resets to Anubis)
1. **Multi-device sync** — Encrypted sync across Steam Deck + desktop + phone
2. **Plugin marketplace v2** — In-app purchases, ratings, verified publishers
3. **Advanced agent orchestration** — Sub-agent spawning, parallel tool use

---

## Release Cadence

| Type | Frequency | Gate |
|---|---|---|
| Patch (1.8.x) | Weekly | `cargo check`, `cargo test --lib`, `npm run build` |
| Minor (1.9.0) | Monthly | Full PromptFlow `pre-release` sequence |
| Major (2.0.0) | Quarterly | All 12 release gates + KFMS codename reset |

---

## Definition of Done

Every sprint work item must satisfy:
1. `cargo check` succeeds with no new errors
2. `cargo test --lib` passes (new tests added for new code)
3. `npm run --prefix frontend build` succeeds
4. Feature works at 1280×800 without horizontal overflow
5. Controller navigation works (D-pad, A/B, L2 radial)
6. AGENTS.md updated if conventions changed
7. Production Package docs updated if specs changed
8. PromptFlow audit run completed for the feature area
