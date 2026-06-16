# NEURODECK QA & Testing Release Gates

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Test Pyramid

```
        ┌─────────┐
        │   E2E   │  ~390 Playwright tests
        │ (UI)    │  Navigation, smoke, screenshots
        ├─────────┤
        │   Int   │  10 integration tests
        │ (Rust)  │  Config persistence, memory RAG, bridge broadcaster
        ├─────────┤
        │  Unit   │  111 Rust unit tests
        │ (Rust)  │  Permissions, workflow engine, security, privacy
        ├─────────┤
        │  Unit   │  0 frontend unit tests (intentional — E2E covers UI)
        │   (JS)  │
        └─────────┘
```

---

## 2. Rust Test Suite

### 2.1 Unit Tests (`cargo test --lib`)

| Module | Tests | Focus |
|---|---|---|
| `permissions` | 19 | Capability checks, registry CRUD, default profiles |
| `workflow_engine` | 11 | Parser, templates, conditions, transforms |
| `security` | 8 | Terminal blocklist, error sanitization, safe commands |
| `memory` | 12 | Store, search, cosine similarity, export |
| `sync` | 4 | Encrypt/decrypt round-trip, wrong token rejection |
| `tunnel` | 3 | Token generation, validation, prefix rejection |
| `transfer` | 4 | Unique destination paths, peer discovery |
| `storage` | 3 | Save/load session round-trip |
| `search` | 2 | Universal search basics |
| `self_heal` | 2 | Config rebuild, persona registry reset |
| `context_packs` | 2 | Pack CRUD |
| `projects` | 2 | Project CRUD |
| `game` | 2 | ACF parsing, game detection |
| `plugin_mgr` | 4 | Plugin discovery, toggle, validation |
| `config` | 6 | Config load, save, merge, defaults |
| `providers` | 3 | Provider factory, agent lookup |
| `models` | 2 | Theme/persona serialization |
| `canvas_collab` | 3 | Message encoding, peer relay |
| `computer_use` | 4 | OCR parsing, input validation |
| `ftp` | 3 | List line parsing |
| `dashboard` | 2 | Stats aggregation |
| **Total** | **111** | |

### 2.2 Integration Tests (`cargo test --tests`)

| Test File | Focus |
|---|---|
| `tests/config_persistence.rs` | Config round-trip, path resolution |
| `tests/memory_rag.rs` | Embedding generation, RAG retrieval, privacy filter |
| `tests/bridge_broadcaster.rs` | WebSocket broadcast, event emission |

### 2.3 Running Tests

```bash
# Fast unit tests
cd src-tauri && cargo test --lib

# Integration tests
cd src-tauri && cargo test --tests

# Individual test binary (avoids Windows PDB limit)
cd src-tauri && cargo test --test config_persistence

# With coverage
cd src-tauri && cargo tarpaulin --lib --out html
```

**Windows note:** `cargo test --workspace --all-targets` may hit LNK1318 (PDB limit). Use `--lib` or individual `--test <name>` instead.

---

## 3. E2E Test Suite (Playwright)

### 3.1 Coverage

| Area | Tests | Status |
|---|---|---|
| Boot sequence | 5 | ✅ |
| Navigation (all 19 views) | 20 | ✅ |
| Chat | 15 | ✅ |
| Canvas | 10 | ✅ |
| Terminal / PTY | 8 | ✅ |
| SSH | 6 | ✅ |
| Memory | 8 | ✅ |
| Settings | 12 | ✅ |
| Agent | 5 | ✅ |
| Workflow | 6 | ✅ |
| Scheduler | 4 | ✅ |
| Browser | 4 | ✅ |
| Radial menu | 5 | ✅ |
| Command Palette | 4 | ✅ |
| Notifications | 4 | ✅ |
| Accessibility | 10 | ✅ |
| Game detection | 4 | ✅ |
| LAN Transfer | 3 | ✅ |
| Plugin manager | 4 | ✅ |
| Git | 6 | ✅ |
| IDE / LSP | 5 | ✅ |
| Dashboard | 4 | ✅ |
| Onboarding | 5 | ✅ |
| **Total** | **~390** | |

### 3.2 Running E2E

```bash
# Install Playwright deps
cd e2e && npm install && npx playwright install

# Run all tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/navigation.spec.ts

# Update snapshots
npx playwright test --update-snapshots
```

---

## 4. Manual Smoke Test Matrix

### 4.1 Pre-Release Smoke (Every Build)

| Step | Action | Expected |
|---|---|---|
| 1 | `npm run dev` | Boot sequence completes, all views reachable |
| 2 | Chat → send message | LLM responds, tokens stream, markdown renders |
| 3 | Canvas → HTML → Run | Preview iframe shows result |
| 4 | Canvas → Python → Run | Output panel shows stdout |
| 5 | Terminal → type `ls` | PTY responds, xterm.js renders |
| 6 | Terminal → New Tab | Second session spawns, switchable |
| 7 | Memory → add fact | Record stored, appears in list |
| 8 | Settings → toggle theme | Theme changes immediately |
| 9 | Radial menu (L2/backtick) | 15 segments visible, navigation works |
| 10 | Command Palette (Ctrl+K) | Fuzzy search works, Enter navigates |

### 4.2 Steam Deck Smoke (Physical Hardware)

| Step | Action | Expected |
|---|---|---|
| 1 | Launch in Game Mode | gamescope 1280×800, controller works |
| 2 | D-pad navigation | All tabs reachable |
| 3 | L2 radial menu | All 15 segments selectable |
| 4 | Steam keyboard | Opens in text inputs |
| 5 | Agent run | Completes without crash |
| 6 | PTY session | Spawns, responds, doesn't hang |

---

## 5. Quality Gates

### 5.1 CI Gate (Every PR)

```bash
cargo check                    # Must pass
cargo test --lib               # 111 tests must pass
cargo test --tests             # 10 integration tests must pass
npm run --prefix frontend build # Must succeed
npm run promptflow:audit       # Must complete (report-only)
```

### 5.2 Release Gate (Every Tag)

```bash
# All CI gates +
cargo clippy                   # Zero warnings (or documented)
npx playwright test            # ~390 E2E tests pass
npm run build                  # Full production build succeeds
npm run promptflow:release     # Must output APPROVED or APPROVED WITH WARNINGS
./scripts/shell/build_appimage.sh  # Linux AppImage builds
.\package_release.ps1          # Windows NSIS builds
```

---

## 6. Known Testing Gaps

| Gap | Risk | Mitigation |
|---|---|---|
| Frontend has 0 unit tests | UI logic tested via E2E only | Playwright coverage at ~390 tests |
| No automated Steam Deck tests | Game Mode regressions | Manual smoke test matrix |
| No load/stress tests | Performance degradation at scale | Memory search benchmark, PTY TTL watchdog |
| No visual regression for all themes | Theme breakage | E2E snapshot tests for default theme |
| Whisper STT requires hardware | Cannot test in CI | Manual validation on target devices |
