# Troubleshooting Guide

## Installation Issues

### `npm install` fails
- **Cause**: Native module compilation (e.g., `electron` postinstall)
- **Fix**: Clear cache and retry:
  ```bash
  npm cache clean --force
  rm -rf node_modules
  npm install
  ```

### `cargo build` hangs on first run
- **Cause**: `mlua` with `vendored` feature compiles Lua 5.4 from source
- **Fix**: Wait 2–3 minutes. Subsequent builds are fast.

### Rust version mismatch
- **Error**: `rustc version X.Y.Z required`
- **Fix**: Run `rustup update` to get latest stable

## Runtime Issues

### Blank window / white screen
- **Cause**: Frontend build failed or bridge server not running
- **Fix**:
  1. Check terminal for Rust panic
  2. Verify `localhost:9477` responds: `curl http://localhost:9477/health`
  3. Rebuild frontend: `npm run frontend:build`

### `invoke()` calls fail (no backend response)
- **Cause**: Running standalone Vite dev without Electron/Rust context
- **Fix**: Use `npm run dev` (full Electron + Rust), not `npm run --prefix frontend dev`

### Port 9477 already in use
- **Error**: `Address already in use`
- **Fix**: `npm run dev:autokill` kills stale neurodeck processes

### LLM not responding
- **Cause**: `GEMINI_API_KEY` not set
- **Fix**: Set environment variable, or switch to Ollama in Settings

### PTY terminal not opening
- **Cause**: `portable-pty` platform mismatch or missing shell
- **Fix**: Verify shell path in Settings. Windows: `powershell.exe` or `cmd.exe`. Linux: `bash`.

## Steam Deck / Game Mode

### App doesn't launch in Game Mode
- **Cause**: Missing AppImage execute permission
- **Fix**: `chmod +x neurodeck_*.AppImage`

### Controller not working
- **Cause**: Steam Input profile not active
- **Fix**: Load the `steam_input/` profile in Steam Input settings

### 1280×800 not enforced
- **Cause**: Not running under gamescope
- **Fix**: Use `./launch_gamescope.sh` or set resolution in Steam Launch Options

## Plugin / Lua Issues

### Plugin commands missing
- **Cause**: Lua syntax error in `plugins/*.lua`
- **Fix**: Check terminal console for `[Lua Error]` lines. Fix syntax and restart.

### `/john`, `/sally` persona commands missing
- **Cause**: `plugins/bmad.lua` failed to load
- **Fix**: Check `[Lua Error]` in console. Built-in personas are fallback in `models.rs`.

## KFMS / Metadata Issues

### `./khaotic-init.sh status` shows dirty
- **Cause**: Uncommitted changes in tracked files
- **Fix**: `git add . && git commit -m "state sync"`

### `validate` fails on meta.json
- **Cause**: Manual edit of `meta.json` instead of using `stamp`
- **Fix**: Run `./scripts/kfms/khaotic-init.sh stamp` to regenerate

## Performance Issues

### Slow startup (>10s)
- **Cause**: Large plugin load or Rust debug build
- **Fix**: Use release build (`cargo build --release`). Check `plugins/` for heavy Lua.

### High CPU in idle
- **Cause**: `pollGamepads` loop or WebSocket reconnection storm
- **Fix**: Check DevTools Performance tab. Disable controller polling in Settings if not needed.

## Getting Help

1. Check this guide
2. Search [GitHub Issues](https://github.com/khaoticdev62/NEURODECK/issues)
3. Run diagnostics: `./scripts/kfms/khaotic-init.sh status`
4. Open a new issue with `kfms-ci.sh diagnose` output
