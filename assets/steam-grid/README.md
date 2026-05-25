# NEURODECK — Steam Grid Assets

Custom artwork for NEURODECK as a non-Steam game in the Steam library and Game Mode.

## Files

| File | Size | Purpose |
|---|---|---|
| `capsule-landscape.png` | 920×430 | Steam library landscape capsule (default shelf view) |
| `capsule-portrait.png` | 600×900 | Steam library portrait capsule |
| `hero.png` | 1920×620 | Steam game detail hero banner |
| `logo.png` | 600×200 | Steam library logo overlay (transparent bg) |

## Install on Steam Deck

### Step 1 — Find your AppID

After adding NEURODECK as a non-Steam game, find its generated AppID:

```bash
grep -r -a "neurodeck" ~/.local/share/Steam/userdata/*/shortcuts.vdf 2>/dev/null
```

Or open Steam → Library → right-click NEURODECK → Properties → the URL contains the AppID.

### Step 2 — Copy assets

```bash
GRID_DIR=~/.local/share/Steam/userdata/{YOUR_USER_ID}/config/grid

cp capsule-landscape.png  "$GRID_DIR/{APPID}.png"
cp capsule-portrait.png   "$GRID_DIR/{APPID}p.png"
cp hero.png               "$GRID_DIR/{APPID}_hero.png"
cp logo.png               "$GRID_DIR/{APPID}_logo.png"
```

Replace `{YOUR_USER_ID}` and `{APPID}` with your actual values.

### Step 3 — Restart Steam

```bash
steam -shutdown && steam
```

The artwork will appear in your library immediately on next launch.

---

## Regenerate Assets

From the project root:

```bash
python assets/brand/generate_assets.py
```

Requires Python 3.8+ with Pillow (`pip install Pillow`).
