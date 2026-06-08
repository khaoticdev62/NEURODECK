# NEURODECK Release, Packaging & Observability

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Packaging

### 1.1 Windows

| Format | Output | Script |
|---|---|---|
| NSIS Installer | `dist/NEURODECK_{version}_windows_x64.exe` | `.\package_release.ps1` |
| Portable ZIP | `dist/NEURODECK_{version}_windows_x64.zip` | `.\package_release.ps1` |

**Requirements:**
- Code signing certificate (optional, prevents SmartScreen)
- Self-signed for testing: `New-SelfSignedCertificate -Type CodeSigning`

### 1.2 Linux

| Format | Output | Script |
|---|---|---|
| AppImage | `dist/neurodeck_{version}_amd64.AppImage` | `./scripts/shell/build_appimage.sh` |
| Steam Deck AppImage | `dist/neurodeck_{version}_steamdeck_amd64.AppImage` | Same script with `--steamdeck` flag |

**Steam Deck deploy:**
```bash
./install.sh  # Copies AppImage to ~/Applications/neurodeck/
```

### 1.3 macOS

- Not currently packaged (no CI build)
- Binary runs via `cargo run --release` on macOS
- Code signing with Apple Developer ID required for distribution

---

## 1.4 Build Optimizations

The release pipeline applies several optimizations to keep multi-platform builds under 30 minutes:

| Optimization | Savings | Scope |
|---|---|---|
| **Frontend pre-build + cache** | 5–10 min per platform | `actions/cache@v4` keyed on `frontend/src/**` + `package.json` hash; build shared across Windows and Linux jobs |
| **sccache** | 20–40% faster Rust compile | `RUSTC_WRAPPER=sccache` with GHA cache backend; persists `~/.cache/sccache` across runs |
| **mold linker** (Linux only) | 30–40% faster link | `RUSTFLAGS="-C linker=mold"` on `ubuntu-22.04` runner |
| **`CARGO_BUILD_JOBS=8`** | Parallel compilation | Matches GHA runner core count; set via env on all Rust build steps |
| **Parallel platform jobs** | ~30 min → ~20 min wall clock | Windows and Linux builds run concurrently after validate + frontend-build steps |
| **`Swatinem/rust-cache@v2`** | Warm cargo registry | Caches `~/.cargo/registry`, `~/.cargo/git`, `target/` across runs within the same branch |

**Expected total wall clock time:** ~20–25 minutes for a full Windows + Linux release build (down from ~45–60 min without optimizations).

---

## 2. Release Process

### 2.1 Pre-Release Checklist

1. Run `npm run promptflow:release` — must output `APPROVED` or `APPROVED WITH WARNINGS`
2. Run full E2E suite: `cd e2e && npx playwright test`
3. Run Steam Deck smoke test on physical hardware
4. Update `CHANGELOG.md`
5. Update version in:
   - `package.json` (root + frontend + electron)
   - `src-tauri/Cargo.toml`
   - `infra/meta/meta.json`
   - `docs/IMPLEMENTATION_PLAN.md`
   - `neurodeck-production-package/manifest.json`
6. Run `./scripts/kfms/khaotic-init.sh stamp`
7. Tag: `git tag v{version}-{codename}`
8. Push tag: `git push origin v{version}-{codename}`

### 2.2 KFMS Release Gates

| Gate | Check |
|---|---|
| meta.json | Version, codename, build SHA correct |
| health.json | All 5 checks true |
| CODENAME_REGISTRY.md | No collision, correct index |
| `khaotic-init.sh validate` | Passes |
| `khaotic-init.sh status` | Clean root, no loose files |

---

## 3. Observability

### 3.0 Runtime Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Gemini API key; if unset, sidecar falls back to Ollama |
| `NEURODECK_PORT` | `9477` | Bridge HTTP + WebSocket port; auto-selected if port is occupied |
| `NEURODECK_SAFE_MODE` | — | If set (any value), skips all Lua plugin loading at sidecar boot |
| `ELECTRON_DEV` | — | Enables DevTools, loads Vite dev server on port 1420 |

**Safe Mode:** Set `NEURODECK_SAFE_MODE=1` to boot without any plugins — useful when a broken plugin prevents startup. The sidecar logs `SAFE MODE active — plugin loading is disabled` on startup.

**Port conflict:** If `9477` is held by another process, Electron's `findFreePort()` selects the next available port in the range `9477–9577` and sets `NEURODECK_PORT` before spawning the sidecar. The preload reads the port via `electronAPI.getBridgePort()`.

### 3.1 Logging

- Backend: `tracing` crate with structured logs
- Frontend: Console logs + `window.__neurodeck_logs` buffer
- Log levels: `ERROR`, `WARN`, `INFO`, `DEBUG`
- Log location: OS-specific app data directory

### 3.2 Support Bundle

Generated via `generate_support_bundle` command:

```
support-bundle-{timestamp}.zip
├── system-info.json      # OS, version, architecture
├── config-redacted.toml  # Config with secrets removed
├── logs/                 # Last 7 days of logs
├── memory-stats.json     # Record counts, DB size
└── health-check.json     # PTY, network, keychain status
```

**Redaction rules:**
- API keys: `AIza[...]` → `[REDACTED_API_KEY]`
- Bearer tokens: `Bearer [...]` → `[REDACTED_TOKEN]`
- Paths: `/home/username/` → `~/`

### 3.3 Diagnostics Panel

JPE Diagnostics & Manual UI (`#manual-modal`):
- Real-time health: PTY binary check, network connectivity, keychain access
- Searchable manual with accordion sections
- Capability health checks per provider

### 3.4 Telemetry

- `infra/telemetry/health.json` — BMAD orchestration readiness
- 5 boolean checks must all be `true`:
  1. Config valid
  2. Database accessible
  3. Provider responsive
  4. Memory DB initialized
  5. Plugin system healthy

---

## 4. Crash Recovery

### 4.1 Config Self-Heal

`self_heal::maintain_runtime_layout()` runs every 45s:
- Creates missing config directories
- Rebuilds invalid config from defaults
- Resets invalid persona registry

### 4.2 Session Restore

- Active session saved on graceful exit
- Restored on next boot via `load_latest_session`
- Draft recovery: unsent prompt preserved in `localStorage`

### 4.3 Boot Diagnostics

Cinematic boot overlay performs health checks:
1. `list_plugins` — plugin count
2. `get_config` — config loaded
3. `get_personas` — personas available
4. `get_themes` — themes loaded
5. `get_doc_count` — indexed docs
6. `get_context_stats` — provider, model, RAM, memory count

If any check fails, boot continues with warning indicator.

---

## 5. Version Artifacts

| Artifact | Location |
|---|---|
| Binary | `dist-electron/win-unpacked/NEURODECK.exe` |
| AppImage | `dist/neurodeck_{version}_amd64.AppImage` |
| Checksums | `dist/SHA256SUMS.txt` |
| Build manifest | `dist/build-manifest.json` |
| KFMS meta | `infra/meta/meta.json` |
| Health | `infra/telemetry/health.json` |
