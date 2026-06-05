# NEURODECK Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18.0.0 | Frontend build, Electron |
| npm | >= 9.0.0 | Package management |
| Rust | 1.92.0 | Sidecar backend |
| cargo | bundled with Rust | Rust build |
| Python | 3.11+ | Optional asset generation |

## Windows Setup

1. **Install Node.js** from [nodejs.org](https://nodejs.org/) (LTS recommended).
2. **Install Rust** via [rustup.rs](https://rustup.rs/).
3. **Set `GEMINI_API_KEY`** environment variable:
   ```powershell
   $env:GEMINI_API_KEY = "your-api-key-here"
   ```
4. **Install dependencies**:
   ```bash
   npm run setup
   ```
5. **Run in dev mode**:
   ```bash
   npm run dev
   ```

## Linux / Steam Deck Setup

1. **Install Node.js and Rust** via your package manager or the official installers.
2. **Set `GEMINI_API_KEY`**:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```
3. **Install and run**:
   ```bash
   npm run setup
   npm run dev
   ```

For Steam Deck Game Mode, use the provided `launch_gamescope.sh` script after building the AppImage:
```bash
npm run build
./launch_gamescope.sh
```

## macOS Setup

Same as Linux. Note: macOS builds are supported but not the primary target.

## First Run Checklist

- [ ] `GEMINI_API_KEY` is set (or use Ollama for offline mode)
- [ ] `npm run rust:check` succeeds
- [ ] `npm run frontend:build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] Onboarding wizard appears (first boot)

## Common Issues

| Issue | Fix |
|-------|-----|
| `cargo build` fails on first run | `mlua` compiles Lua 5.4 from source — wait 2–3 minutes |
| `invoke()` calls fail in standalone Vite dev | Use `npm run dev` (Tauri/Electron context required) |
| Port 9477 already in use | Kill existing neurodeck process: `npm run dev:autokill` |
| `GEMINI_API_KEY` not set | Falls back to Ollama silently; set key for Gemini |

## Verification Commands

```bash
npm run rust:check       # Fast Rust type-check
npm run rust:test        # Rust unit tests (76 tests)
npm run frontend:build   # Vite production build
npm run frontend:test    # Vitest frontend tests
npm run quality:fallow:dead-code  # Dead-code scan
npm run quality:fallow:dupes      # Duplication scan
```
