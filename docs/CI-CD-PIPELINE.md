# NEURODECK CI/CD Pipeline Documentation

## Overview

NEURODECK uses a **multi-stage GitHub Actions pipeline** designed for bulletproof, deterministic builds on Steam Deck and Linux. The pipeline prioritizes **reliability over speed**, with automatic retry and recovery from transient failures.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ KFMS Release Gate                                               │
│ • Version bump detection                                        │
│ • Release metadata validation                                   │
│ • Build readiness scoring (PASS/HOLD/GO)                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│Windows │  │AppImage  │  │ Flatpak  │
│Build   │  │Build     │  │Build     │
│(2x     │  │(2x       │  │(1x       │
│ retries)│  │ retries) │  │ retry)   │
└────────┘  └──────────┘  └──────────┘
    │            │            │
    └────────────┼────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Publish Release  │
        │ • GitHub Release │
        │ • SHA256 Sums    │
        │ • Manifests      │
        └──────────────────┘
```

---

## Workflows

### 1. **steam-deck-validation.yml** — Continuous Validation

**Trigger:** Every push to `master`, every PR, manual trigger

**What it does:**
- Builds a test AppImage from the current branch
- Validates x86-64 architecture (rejects ARM)
- Checks glibc, GLVND, SDL2, EGL library requirements
- Validates `.desktop` file and AppImage metadata
- Checks Flatpak permissions (Wayland, gamepad, GPU, keychain)
- Verifies GPU stack (Vulkan ICD, GLVND for OpenGL)
- Warns if AppImage >1GB
- Generates a validation summary to GitHub Actions results

**Why:** Catches binary incompatibilities **before they reach users**. Validates every commit to master automatically.

**Jobs:**
1. `build-test-appimage` — Compile AppImage
2. `validate-appimage-runtime` — Library & architecture checks
3. `validate-desktop-integration` — Desktop file & metadata
4. `validate-flatpak-permissions` — Sandbox permission schema
5. `validate-steam-deck-runtime` — glibc, SDL2, GPU stack

---

### 2. **release-build.yml** — Production Release Pipeline

**Trigger:** Git tag matching `v[0-9]+.[0-9]+.[0-9]+-*`, manual workflow dispatch, GitHub Release publish

**What it does:**
- Pre-builds frontend once, caches for reuse across all platform jobs
- Validates KFMS release metadata
- Builds Windows NSIS installer (with optional code-signing)
- Builds Steam Deck AppImage (with LD_PRELOAD libwayland injection)
- Builds Flatpak bundle (wraps pre-built AppImage)
- Publishes all artifacts to GitHub Release
- Generates SHA256 checksums
- Posts build summary to GitHub Actions

**Resilience Features:**
1. **NPM Retry:** `npm ci` retries up to 3× with exponential backoff and cache clean
2. **Frontend Build Retry:** Vite build retries up to 3× with dist cleanup
3. **Apt Lock Wait:** AppImage build waits up to 30s for apt locks before installing
4. **Chronological Artifact Discovery:** AppImage discovery uses file mtime, not alphabetical sort
5. **Steam Deck Target:** AppImage builds target `znver2` (AMD Zen 2) instead of `native` for compatibility

**Jobs:**
1. `prebuild-frontend` — npm ci + Vite build with retry
2. `kfms-gate` — Release metadata validation
3. `build-windows` — NSIS + ZIP with code-signing
4. `build-appimage` — Self-contained Linux binary
5. `build-flatpak` — Wraps AppImage in Flatpak sandbox
6. `publish-release` — Upload to GitHub with checksums

---

## Release Readiness Gates (KFMS)

Every release tag triggers KFMS scoring:

| Gate | Status | Meaning |
|------|--------|---------|
| `hardening_check` | PASS | All security audits pass |
| `cargo_check` | PASS | Rust type-check succeeds |
| `cargo_test` | PASS | Unit tests pass |
| `frontend_build` | PASS | Vite build succeeds |
| **Score** | **100** | GO — ready to ship |

If any gate fails, the release is **HELD** and not published.

---

## Environment Variables

### Required (GitHub Secrets)

| Variable | Purpose | Where Used |
|----------|---------|-----------|
| `GEMINI_API_KEY` | Google Gemini LLM | Rust binary at runtime |
| `GITHUB_TOKEN` | GitHub API access | Release publishing, artifact upload |
| `NEURODECK_CERT_P12` | Code signing cert (Windows) | Optional Windows signing |
| `NEURODECK_CERT_PASSWORD` | Cert password | Optional Windows signing |

### Built-in CI/CD

| Variable | Value | Purpose |
|----------|-------|---------|
| `CARGO_TERM_COLOR` | `always` | Colored Rust output |
| `RUST_BACKTRACE` | `short` | Panic diagnostics |
| `SCCACHE_GHA_ENABLED` | `true` | GitHub Actions cache |
| `RUSTC_WRAPPER` | `sccache` | Incremental Rust cache |
| `CARGO_BUILD_JOBS` | `8` | Parallel compilation |
| `WEBKIT_DISABLE_DMABUF_RENDERER` | `1` | Steam Deck rendering fix |

---

## Build Artifacts

### Windows Release

```
dist/
├── neurodeck_1.6.0_windows_x64.exe      (NSIS installer)
├── neurodeck_1.6.0_windows_x64.zip      (Portable ZIP)
├── build-manifest.json                   (Metadata)
└── SHA256SUMS.txt                        (Checksums)
```

**Size:** ~150-200 MB (exe), ~50 MB (zip)

### Steam Deck AppImage

```
dist/
├── neurodeck_1.6.0_steamdeck_amd64.AppImage
├── SHA256SUMS-appimage.txt
└── build-manifest.json
```

**Size:** ~95-110 MB

**Contains:**
- Rust binary (self-contained)
- WebKit 4.1 + GTK 3.0
- system libwayland (system override via LD_PRELOAD in launch wrapper)
- `install.sh`, `launch_gamescope.sh`
- All dependencies (100% portable)

### Flatpak Bundle

```
dist/
└── neurodeck_1.6.0_linux.flatpak
```

**Size:** ~150 MB

**Contains:**
- AppImage binary (extracted)
- Flatpak metadata (manifest, permissions, desktop file)
- Sandbox configuration (Wayland, gamepad, GPU, keychain)

### Checksums

```
SHA256SUMS.txt
├── neurodeck_1.6.0_windows_x64.exe
├── neurodeck_1.6.0_windows_x64.zip
├── neurodeck_1.6.0_steamdeck_amd64.AppImage
└── neurodeck_1.6.0_linux.flatpak
```

---

## Performance Optimizations

### Build Time Breakdown (Target: 30-40 min)

| Phase | Time | Optimization |
|-------|------|-------------|
| System health check | 1-2 min | Parallel diagnostics |
| Frontend pre-build | 5-7 min | Cached npm + Vite |
| KFMS gate | 1-2 min | Parallel validation |
| Windows build | 8-12 min | sccache + parallel jobs |
| AppImage build | 8-12 min | sccache + mold linker |
| Flatpak build | 5-8 min | AppImage-wrap (no compilation) |
| Publish + artifacts | 2-3 min | Parallel upload |

**Cache Strategy:**
- Frontend: `frontend-dist-{sha}` artifact (shared across Windows + AppImage)
- Cargo: `{platform}-cargo-{lock-hash}` (preserves incremental builds)
- npm: `{platform}-npm-{lock-hash}` (preserves node_modules)
- sccache: GitHub Actions GHA storage

**Parallel Builds:**
- Windows and AppImage build in parallel (both depend on `prebuild-frontend`)
- System health check, KFMS gate, and frontend pre-build in parallel
- Publish only after both builds complete

---

## Local Testing

### Run Steam Deck validation locally (Linux)

```bash
# Requires flatpak-builder, protoc, Rust 1.92.0
bash flatpak/generate-cargo-sources.sh
flatpak-builder --dry-run build-dir flatpak/com.neurodeck.app.json
```

### Build Windows installer locally (Windows)

```powershell
scripts/powershell/build.ps1 -Target win -SkipGate
```

### Build AppImage locally (Linux)

```bash
bash scripts/shell/build_appimage.sh
```

---

## Troubleshooting

### Build fails with "apt lock held"

**Root cause:** Another apt/dpkg operation is in progress

**Fix:** The CI pipeline waits for apt locks before installing. If you see this locally, run:

```bash
sudo pkill -9 apt apt-get dpkg
sudo rm -f /var/lib/dpkg/lock* /var/lib/apt/lists/lock
sudo dpkg --configure -a
```

### "npm ci" fails with ENOENT / socket hang up

**Root cause:** Network timeout or registry outage

**Fix:** The pipeline auto-falls back to CNPMJS → Yarn registries. If you see this locally:

```bash
npm cache clean --force
npm config set registry https://cnpmjs.org/
npm ci --prefer-offline
```

### Cargo build fails with "cannot find -lmold"

**Root cause:** mold linker not installed

**Fix:** The pipeline installs it automatically. Locally:

```bash
sudo apt-get install mold
export RUSTFLAGS="-C link-arg=-fuse-ld=mold"
cargo build
```

### "cargo cache corruption" / "parity with previous"

**Root cause:** Cargo registry cache inconsistent

**Fix:** The pipeline clears cache and retries. Locally:

```bash
cargo clean
rm -rf ~/.cargo/registry/cache
cargo build
```

### Zombie processes blocking build

**Root cause:** Stuck cargo/rustc from interrupted build

**Fix:** The pipeline kills zombies automatically. Locally:

```bash
pkill -9 cargo rustc
pkill -9 npm
```

---

## Release Checklist

Before merging to master or cutting a release:

- [ ] All tests pass locally (`npm test`)
- [ ] Rust builds cleanly (`cargo build --release`)
- [ ] AppImage builds locally (`bash scripts/shell/build_appimage.sh`)
- [ ] KFMS metadata is current (`scripts/kfms/khaotic-init.sh status`)
- [ ] Release notes updated (`docs/RELEASE_NOTES.md`)
- [ ] Version bumped (`src-tauri/tauri.conf.json`, `package.json`, `Cargo.toml`)

Then push a tag:

```bash
git tag v1.6.1-ra
git push origin v1.6.1-ra
```

CI/CD automatically:
1. Runs KFMS gate
2. Builds all platforms
3. Publishes to GitHub Release

---

## Future Improvements

- [ ] Docker image for reproducible builds
- [ ] Signed releases (GPG signatures)
- [ ] AppImage delta updates (zsync)
- [ ] Nightly builds to separate release channel
- [ ] Performance benchmarks in CI
- [ ] Automated release notes from commits

---

## References

- [KFMS Metadata Standard](../infra/meta/meta.json)
- [Release Policy](../infra/meta/meta.json#L37-L50)
- [Build Scripts](../scripts/)
- [GitHub Actions](../.github/workflows/)
