# Gamescope & Steam Deck Game Mode Guide

How to run NEURODECK in Steam Deck Game Mode using gamescope, and how to configure it for the best experience on the 1280×800 screen.

---

## What Is Gamescope?

Gamescope is the compositor Valve uses for Steam Deck Game Mode. It creates a dedicated, fullscreen display environment with a fixed resolution — separate from the KDE Desktop in Desktop Mode. Running NEURODECK through gamescope gives you:

- True 1280×800 fullscreen (no taskbar, no window chrome)
- Correct HDR/SDR handling for the Steam Deck LCD/OLED
- No compositor tearing or vsync issues
- The same rendering path as commercial games

---

## Option 1 — Launch Script (Recommended)

Use the included `launch_gamescope.sh` at the project root:

```bash
chmod +x launch_gamescope.sh
./launch_gamescope.sh
```

This is what the script runs:

```bash
gamescope -W 1280 -H 800 -r 60 -f -- ./neurodeck
```

| Flag | Meaning |
|---|---|
| `-W 1280` | Output width: 1280px (native Steam Deck LCD resolution) |
| `-H 800` | Output height: 800px |
| `-r 60` | Frame rate cap: 60 FPS |
| `-f` | Force fullscreen (no window decoration) |
| `-- ./neurodeck` | The actual binary to run inside gamescope |

---

## Option 2 — Add as a Non-Steam Game

For a persistent Game Mode entry accessible from the Steam library:

1. **Deploy** NEURODECK to the Steam Deck first:
   ```bash
   chmod +x install.sh && ./install.sh
   ```
   This copies the binary and assets to `~/Applications/neurodeck/`.

2. **Switch to Desktop Mode** and open Steam.

3. Click **Games → Add a Non-Steam Game to My Library**.

4. Browse to `~/Applications/neurodeck/launch_gamescope.sh` (or the `neurodeck` binary directly).

5. In Library, right-click NEURODECK → **Properties → Launch Options**:
   ```
   gamescope -W 1280 -H 800 -r 60 -f -- %command%
   ```

6. **Return to Game Mode.** NEURODECK will appear in your library and launch fullscreen.

---

## Option 3 — Steam Launch Options Only

If you've already added NEURODECK as a non-Steam game without gamescope, set the launch options in Steam:

```
gamescope -W 1280 -H 800 -f -- %command%
```

---

## OLED Steam Deck

The OLED model runs at 1280×800 natively (same panel resolution). No resolution changes needed — the same flags work. For the higher refresh rate (90Hz):

```bash
gamescope -W 1280 -H 800 -r 90 -f -- ./neurodeck
```

---

## Troubleshooting

**NEURODECK doesn't fill the whole screen**
- Make sure `-f` (fullscreen) is in the gamescope args.
- Check that no other compositor (e.g. kwin) is overriding the window.

**Black screen / nothing launches**
- Run from a Desktop Mode terminal to see stderr: `gamescope -W 1280 -H 800 -f -- ./neurodeck`
- Verify the binary path is correct. The installer puts it at `~/Applications/neurodeck/neurodeck`.

**Frame rate is choppy**
- Add `-r 40` to cap at 40 FPS (better battery life), or `-r 60` for smooth scrolling.
- NEURODECK is a WebView app — it can occasionally spike GPU usage during animations. 40 FPS is perfectly usable.

**Controller doesn't work in gamescope**
- Ensure the NEURODECK Steam Input profile is applied. See [`docs/steam_input_guide.md`](steam_input_guide.md).
- If Steam Input is unavailable (non-Steam launch without Steam running), keyboard fallbacks still work: backtick opens the radial menu, arrow keys navigate it.

**Gamescope not found**
- On SteamOS, gamescope is always present. On a non-Steam-OS Linux machine: `sudo pacman -S gamescope` or `sudo apt install gamescope`.

---

## Desktop Mode vs Game Mode

| Feature | Desktop Mode | Game Mode (gamescope) |
|---|---|---|
| Resolution | Window at any size | Locked 1280×800 fullscreen |
| Controller | Gamepad API via xpad/hid | Steam Input (full haptics, profile) |
| Performance | KDE compositor overhead | Direct compositor — lower latency |
| Overlays | None | Steam overlay available |
| Recommended for | Development | Daily use |

For development, use `npm run tauri dev` in Desktop Mode — hot-reload works there. For daily use, deploy with `install.sh` and launch via gamescope.
