# NEURODECK — Mock Data Wiring Handoff

> Codename **MOCK ELIMINATION** — handoff document covering every hardcoded placeholder, "not supported" stub, and "coming soon" UI gate found in a full source audit, scoped to Epic 13 (`_bmad-output/planning-artifacts/epics.md`).

---

## Quick State Summary

> Audit date: 2026-06-20 — Epic 13 created, all 5 stories **pending** (none started). Story files: `_bmad-output/implementation-artifacts/13-1` through `13-5`.

| Layer | Status |
|---|---|
| Telemetry Dashboard (CPU/tokens/IPC/load time) | ❌ All 4 metrics hardcoded to 0 — Story 13.1 |
| LLM Provider Audio Transcription (Ollama/HF/Kimi/OpenAI-compat) | ❌ All 4 providers return "not supported" — Story 13.2 |
| Computer-Use Cross-Platform | ⚠️ Windows/Linux/macOS real; other platforms hard error — open question whether this is even a gap — Story 13.3 |
| Canvas AI Edit | ❌ "Coming soon" stub, no backend command exists — Story 13.4 |
| Canvas Collaboration | ⚠️ Backend fully implemented; UI shows "coming soon" stub — Story 13.4 |
| Workflow Engine Headless PTY | ❌ Placeholder string returned instead of executing command — Story 13.5 |

---

## MUST-HAVE: Blocking Fixes

### ❌ 1. Telemetry Dashboard Hardcoded Metrics (Story 13.1)
**Problem**: `TelemetryDashboardTab.tsx` lines 104/107/108/109 hardcode CPU%, tokens/sec, IPC Kbps, and model load ms to `0`.
**What to build**:
- CPU%: new/extended Tauri command reusing the existing `sysinfo` crate (already used by `get_memory_usage`).
- Tokens/sec: instrumentation inside each of the 5 `stream_response` implementations in `llm.rs`.
- IPC throughput: byte-counter instrumentation in `bridge.rs`.
- Model load time: timer around provider/model initialization.
- Decide push (`telemetry:update` event — already has a dormant listener) vs. poll (extend the existing 3s `fetchSnapshot`) before implementing.
**Files**: `src/renderer/features/diagnostics/TelemetryDashboardTab.tsx`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/llm.rs`, `src-tauri/src/bridge.rs`

### ❌ 2. LLM Provider STT Stubs (Story 13.2)
**Problem**: `llm.rs` lines 664, 948, 1315, 1712 — four providers' `transcribe_audio` unconditionally return "not supported" errors.
**What to build**: Route each provider through the existing working `whisper::transcribe` call already used by the default `start_recording`/`stop_recording` path (`commands/system.rs::transcribe_audio_whisper`); optionally add native ASR endpoint support for OpenAI-compatible servers (`/audio/transcriptions`).
**Files**: `src-tauri/src/llm.rs`, `src-tauri/src/whisper.rs`, `src-tauri/src/commands/system.rs`

### ⚠️ 3. Computer-Use Cross-Platform Boundary (Story 13.3)
**Problem**: `computer_use.rs` lines 250/298/368/404/431 hard-error on any platform outside Windows/Linux/macOS.
**Open product question**: is this an actual gap, or already-correct intentional scope? NEURODECK only ships for Windows/Linux/macOS today — see Story 13.3 Dev Notes for the explicit question to resolve before any code is written.
**Files**: `src-tauri/src/computer_use.rs`

### ❌/⚠️ 4. Canvas AI Edit + Collaboration (Story 13.4)
**Problem**: `CanvasView.tsx` lines 177/191 — both buttons show "coming soon"; Collaboration's backend already exists and is unused, AI Edit has no backend at all.
**What to build**: Collaboration — frontend-only wiring to `canvas_collab_host/join/status/send/broadcast/stop` (already implemented). AI Edit — a brand-new `canvas_ai_edit(content, lang, instruction)` command routed through the active `LlmProvider`, plus frontend wiring.
**Files**: `src/renderer/features/canvas/CanvasView.tsx`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/canvas_collab.rs`

### ❌ 5. Workflow Engine Headless PTY (Story 13.5)
**Problem**: `workflow_engine.rs` lines 460-463 return a placeholder string instead of executing the configured command in headless/bridge mode.
**What to build**: Replace the placeholder with real command execution — recommended approach is a non-interactive `tokio::process::Command` subprocess call rather than a full interactive PTY session (workflow automation likely doesn't need TTY-detecting behavior). The `EventEmitter` trait from `bridge.rs` is already imported in this file and may be the intended output-emission mechanism.
**Files**: `src-tauri/src/workflow_engine.rs`, `src-tauri/src/pty_manager.rs`, `src-tauri/src/bridge.rs`

---

## HIGH PRIORITY: Core Feature Gaps

Reserved for secondary findings surfaced while implementing the 5 stories that aren't blocking but worth tracking:

- The *default* STT path (`start_recording`/`stop_recording`, not the per-provider `transcribe_audio` trait method) also does not use Whisper today, per `CLAUDE.md`. Story 13.2 explicitly scopes this out as a separate, larger follow-up — do not assume it's covered.

---

## COOL / Differentiating Features

N/A for this handoff — Epic 13 is entirely about closing mock/stub gaps in existing features, not adding new differentiating capability. Stated explicitly here so this document isn't mistaken for an incomplete handoff.

---

## Technical Debt / Known Issues

| Issue | Location | Notes |
|---|---|---|
| `telemetry:update` event has no emitter | `TelemetryDashboardTab.tsx` ~line 121 | Frontend already listens; nothing backend-side emits it yet — Story 13.1 should decide push vs. poll |
| STT default path also doesn't use Whisper | `CLAUDE.md` line 168, `commands/system.rs` | Story 13.2 only fixes the 4 LLM-provider stubs; the generic `start_recording`/`stop_recording` flow is a separate, larger gap |
| Computer-use error message wording inconsistent across the 5 functions | `computer_use.rs` | Minor — unify wording regardless of the platform-boundary product decision |
| Canvas AI Edit needs new backend command from scratch | `commands/mod.rs` | Unlike Collaboration, there is no existing partial implementation to wire up |

---

## Dependency Watch

| Crate | Version | Note |
|---|---|---|
| `sysinfo` | 0.33 | Already used for `get_memory_usage`; Story 13.1 should reuse, not add a new system-stats crate |
| `whisper-rs` / Whisper.cpp binary | (per `whisper.rs`) | Story 13.2 depends on a user-configured Whisper model/binary already existing via Settings → Voice; provider STT wiring will inherit that same configuration requirement |

---

## Feature Priority Matrix

| Feature | Impact | Effort | Ship Order |
|---|---|---|---|
| Canvas Collaboration activation (13.4 collab half) | 🟠 High | Low (backend exists) | 1 |
| LLM provider STT wiring (13.2) | 🟠 High | Medium (whisper.rs reuse) | 2 |
| Telemetry real metrics (13.1) | 🟡 Medium | Medium | 3 |
| Workflow engine headless PTY (13.5) | 🟡 Medium | Medium | 4 |
| Canvas AI Edit activation (13.4 AI half) | 🟡 Medium | Medium-High (new backend command) | 5 |
| Computer-use platform boundary (13.3) | 🟢 Low (likely doc-only resolution) | Low–High (depends on product decision) | 6 |

---

## Open Questions (resolve before implementation)

1. **Story 13.3** — Is the cross-platform computer-use gap real work, or already-correct intentional scope? Needs an explicit yes/no on "do we support any platform beyond Windows/Linux/macOS?" before any code is written.
2. **Story 13.2** — Should Hugging Face's STT call HF's hosted Inference API for ASR, or should all four providers uniformly delegate to local Whisper.cpp (recommended default)?
3. **Story 13.2** (secondary, flagged as out-of-scope-but-related) — The default `start_recording`/`stop_recording` path also doesn't use Whisper per `CLAUDE.md` line 168; worth a follow-up epic/story if not folded into 13.2.
4. **Story 13.4** — Does the "Workspace session" gating language in the current Canvas stub refer to a real concept anywhere else in the app? Audit found none — if confirmed absent, it should be removed entirely as placeholder copy rather than treated as a real requirement.
