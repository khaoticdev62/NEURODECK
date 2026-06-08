# NEURODECK Rollback Instructions

If a NEURODECK update causes instability, follow these steps to revert to the previous release without losing any data.

---

## What Is Preserved

Your data is stored separately from the application binary and is **never touched** by a rollback:

- `~/.config/neurodeck/llm-term.toml` — configuration
- `~/.config/neurodeck/data/` — memory records, personas, themes, sessions, profiles
- `~/.config/neurodeck/.env` — API keys and env vars
- `~/.local/share/neurodeck/logs/` — log files

---

## Steam Deck / Linux AppImage Rollback

### 1. Download the previous release

Go to: https://github.com/khaoticdev62/NEURODECK/releases

Find the previous version (e.g., `v1.6.0-bastet`) and download:
```
NEURODECK_v1.6.0-bastet_linux_amd64.AppImage
```

### 2. Replace the installed AppImage

```bash
PREV="~/Downloads/NEURODECK_v1.6.0-bastet_linux_amd64.AppImage"
INSTALLED="$HOME/Applications/neurodeck/NEURODECK.AppImage"

cp "$PREV" "$INSTALLED"
chmod +x "$INSTALLED"
```

### 3. Launch

```bash
neurodeck          # uses ~/.local/bin/neurodeck launcher
# or directly:
$HOME/Applications/neurodeck/NEURODECK.AppImage
```

---

## Windows Rollback

### 1. Download the previous NSIS installer

From GitHub Releases, download:
```
NEURODECK_v1.6.0-bastet_windows_x64.exe
```

### 2. Uninstall the current version

Go to: Settings → Apps → NEURODECK → Uninstall

Your data in `%APPDATA%\neurodeck\` is **not removed** by the uninstaller.

### 3. Run the previous installer

Double-click the downloaded `.exe` and follow the installer.

---

## Verify the Rollback

After launching:

1. Open Settings → Diagnostics
2. Confirm the version shown matches the target rollback version
3. Confirm chat history and memory records are intact

---

## If the Rollback Fails

1. Check `~/.local/share/neurodeck/logs/launch_*.log` for startup errors
2. Try Safe Mode — set `NEURODECK_SAFE_MODE=1` in `~/.config/neurodeck/.env` to skip plugin loading
3. If the config is corrupted, rename `llm-term.toml` to `llm-term.toml.bak` — the app will create a fresh default on next boot

---

## Reporting Issues

File a bug: https://github.com/khaoticdev62/NEURODECK/issues

Include:
- The version you updated from and to
- The error message or symptom
- Your platform (Steam Deck / Linux / Windows)
- Log output from `~/.local/share/neurodeck/logs/`
