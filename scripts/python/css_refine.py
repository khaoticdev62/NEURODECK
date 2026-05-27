import re

path = "C:/Users/thecr/Desktop/S-Term/frontend/src/app.css"
with open(path, "r", encoding="utf-8") as f:
    css = f.read()

original = css

# ── 1. ROOT VARS ──────────────────────────────────────────────────────────────
css = css.replace("--panel-bg: rgba(17, 22, 28, 0.7);", "--panel-bg: #11161C;")
rgb_vars = "    --accent-rgb: 94, 235, 255;\n    --response-rgb: 124, 255, 178;\n    --error-rgb: 255, 90, 106;\n    --warning-rgb: 255, 200, 87;"
css = css.replace("    --warning-color: #FFC857;", "    --warning-color: #FFC857;\n" + rgb_vars)

# ── 2. BACKDROP-FILTER + BACKGROUND FIXES ─────────────────────────────────────
# top-nav
css = css.replace(
    "    background: rgba(6, 9, 12, 0.8);\n    backdrop-filter: blur(12px);\n    z-index: 30;",
    "    background: rgba(6, 9, 12, 0.97);\n    z-index: 30;",
)
# message.ai card
css = css.replace(
    "    background: rgba(18, 25, 34, 0.4);\n    border: 1px solid var(--border-color);\n    backdrop-filter: blur(8px);\n    color: var(--response-color);",
    "    background: rgba(18, 25, 34, 0.95);\n    border: 1px solid var(--border-color);\n    color: var(--response-color);",
)
# input-console-bar
css = css.replace(
    "    background: rgba(10, 14, 18, 0.8);\n    backdrop-filter: blur(16px);\n    border: 1px solid var(--border-color);\n    border-radius: 14px;",
    "    background: rgba(10, 14, 18, 0.97);\n    border: 1px solid var(--border-color);\n    border-radius: 14px;",
)
# settings-overlay
css = css.replace(
    "    background: rgba(0, 0, 0, 0.75);\n    backdrop-filter: blur(20px) saturate(1.4);\n    z-index: 100;",
    "    background: rgba(0, 0, 0, 0.88);\n    z-index: 100;",
)
# canvas-toolbar
css = css.replace(
    "    background: rgba(8, 12, 16, 0.9);\n    backdrop-filter: blur(8px);\n    display: flex;\n    align-items: center;\n    padding: 0 14px;\n    gap: 10px;\n    flex-shrink: 0;\n    z-index: 10;\n}\n\n.canvas-lang-select",
    "    background: rgba(8, 12, 16, 0.97);\n    display: flex;\n    align-items: center;\n    padding: 0 14px;\n    gap: 10px;\n    flex-shrink: 0;\n    z-index: 10;\n}\n\n.canvas-lang-select",
)
# tunnel-panel
css = css.replace(
    "    background: rgba(16, 22, 30, 0.45);\n    border: 1px solid var(--border-color);\n    backdrop-filter: blur(16px);\n    border-radius: 12px;\n    padding: 20px;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n}\n\n.tunnel-panel h3",
    "    background: rgba(16, 22, 30, 0.92);\n    border: 1px solid var(--border-color);\n    border-radius: 12px;\n    padding: 20px;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n}\n\n.tunnel-panel h3",
)
# share-panel
css = css.replace(
    "    background: rgba(16, 22, 30, 0.45);\n    border: 1px solid var(--border-color);\n    backdrop-filter: blur(16px);\n    border-radius: 12px;\n    padding: 20px;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n}\n\n.share-panel h3",
    "    background: rgba(16, 22, 30, 0.92);\n    border: 1px solid var(--border-color);\n    border-radius: 12px;\n    padding: 20px;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n}\n\n.share-panel h3",
)
# speed-dial-card (no background to fix)
css = css.replace(
    "    backdrop-filter: blur(8px);\n}\n\n.speed-dial-card:hover {",
    "}\n\n.speed-dial-card:hover {",
)
# blocked-content panel
css = css.replace(
    "    background: rgba(16, 20, 30, 0.6);\n    border: 1px solid rgba(255, 60, 60, 0.25);\n    border-radius: 14px;\n    backdrop-filter: blur(10px);",
    "    background: rgba(16, 20, 30, 0.92);\n    border: 1px solid rgba(255, 60, 60, 0.25);\n    border-radius: 14px;",
)
# agent-toolbar
css = css.replace(
    "    background: rgba(8, 12, 16, 0.9);\n    backdrop-filter: blur(8px);\n    display: flex;\n    align-items: center;\n    padding: 0 14px;\n    gap: 10px;\n    flex-shrink: 0;\n}\n\n/* Roundtable toolbar",
    "    background: rgba(8, 12, 16, 0.97);\n    display: flex;\n    align-items: center;\n    padding: 0 14px;\n    gap: 10px;\n    flex-shrink: 0;\n}\n\n/* Roundtable toolbar",
)
# memory-toolbar
css = css.replace(
    "    background: rgba(8, 12, 16, 0.9);\n    backdrop-filter: blur(8px);\n    display: flex;\n    align-items: center;\n    padding: 0 14px;\n    gap: 10px;\n    flex-shrink: 0;\n}\n\n.memory-search-input",
    "    background: rgba(8, 12, 16, 0.97);\n    display: flex;\n    align-items: center;\n    padding: 0 14px;\n    gap: 10px;\n    flex-shrink: 0;\n}\n\n.memory-search-input",
)
# radial-backdrop
css = css.replace(
    "    background: rgba(0, 0, 0, 0.72);\n    backdrop-filter: blur(6px);\n}\n\n.radial-ring",
    "    background: rgba(0, 0, 0, 0.88);\n}\n\n.radial-ring",
)
# toast-notif
css = css.replace(
    "    background: rgba(18, 19, 28, 0.9);\n    backdrop-filter: blur(12px);\n    border: 1px solid rgba(255, 255, 255, 0.1);",
    "    background: rgba(18, 19, 28, 0.97);\n    border: 1px solid rgba(255, 255, 255, 0.1);",
)
# history-search-overlay
css = css.replace(
    "    background: rgba(0, 0, 0, 0.65);\n    backdrop-filter: blur(16px);\n    animation: history-overlay-in",
    "    background: rgba(0, 0, 0, 0.88);\n    animation: history-overlay-in",
)
# onboarding-overlay
css = css.replace(
    "    background: rgba(5, 5, 5, 0.96);\n    backdrop-filter: blur(25px);\n    z-index: 9999;",
    "    background: rgba(5, 5, 5, 0.99);\n    z-index: 9999;",
)
# ctrl-prompt-overlay
css = css.replace(
    "    background: rgba(0, 0, 0, 0.82);\n    backdrop-filter: blur(8px);\n    opacity: 0;",
    "    background: rgba(0, 0, 0, 0.90);\n    opacity: 0;",
)
# browser-toolbar
css = css.replace(
    "    background: rgba(18, 19, 28, 0.85);\n    backdrop-filter: blur(12px);\n    display: flex;\n    align-items: center;\n    padding: 0 16px;\n    gap: 12px;\n    z-index: 10;",
    "    background: rgba(18, 19, 28, 0.97);\n    display: flex;\n    align-items: center;\n    padding: 0 16px;\n    gap: 12px;\n    z-index: 10;",
)

# ── 3. BOX-SHADOW GLOW CAPS ────────────────────────────────────────────────────
replacements = [
    ("box-shadow: 0 0 6px #78ff80;", "box-shadow: 0 0 6px rgba(124, 255, 178, 0.15);"),
    (
        "box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);",
        "box-shadow: 0 0 10px rgba(94, 235, 255, 0.15);",
    ),
    (
        "box-shadow: 0 0 8px rgba(255, 60, 90, 0.3);",
        "box-shadow: 0 0 8px rgba(255, 90, 106, 0.15);",
    ),
    (
        "box-shadow: 0 0 12px rgba(0, 240, 255, 0.45);",
        "box-shadow: 0 0 12px rgba(94, 235, 255, 0.15);",
    ),
    (
        "box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);",
        "box-shadow: 0 0 8px rgba(94, 235, 255, 0.12);",
    ),
    (
        "box-shadow: 0 0 10px rgba(124, 58, 237, 0.3);",
        "box-shadow: 0 0 10px rgba(124, 58, 237, 0.15);",
    ),
    (
        "box-shadow: 0 0 12px var(--accent-color) !important;",
        "box-shadow: 0 0 12px rgba(94, 235, 255, 0.15) !important;",
    ),
    ("box-shadow: 0 0 4px var(--accent-color);", "box-shadow: 0 0 4px rgba(94, 235, 255, 0.12);"),
    (
        "box-shadow: 0 0 16px var(--accent-color), 0 0 8px var(--accent-color) inset;",
        "box-shadow: 0 0 16px rgba(94, 235, 255, 0.15), 0 0 8px rgba(94, 235, 255, 0.10) inset;",
    ),
    (
        "box-shadow: 0 0 8px rgba(0, 240, 255, 0.35);",
        "box-shadow: 0 0 8px rgba(94, 235, 255, 0.12);",
    ),
    (
        "box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);",
        "box-shadow: 0 0 10px rgba(94, 235, 255, 0.12);",
    ),
    ("box-shadow: 0 0 12px var(--accent-color);", "box-shadow: 0 0 12px rgba(94, 235, 255, 0.15);"),
    (
        "box-shadow: 0 0 15px rgba(0, 240, 255, 0.25), 0 4px 20px rgba(0, 0, 0, 0.3);",
        "box-shadow: 0 0 15px rgba(94, 235, 255, 0.12), 0 4px 20px rgba(0, 0, 0, 0.3);",
    ),
    (
        "box-shadow: 0 4px 15px rgba(0, 240, 255, 0.3);",
        "box-shadow: 0 4px 15px rgba(94, 235, 255, 0.12);",
    ),
    ("box-shadow: 0 0 20px var(--accent-color);", "box-shadow: 0 0 20px rgba(94, 235, 255, 0.15);"),
    (
        "box-shadow: 0 8px 24px rgba(0, 240, 255, 0.12), 0 0 2px var(--accent-color) inset;",
        "box-shadow: 0 8px 24px rgba(94, 235, 255, 0.10), 0 0 2px rgba(94, 235, 255, 0.10) inset;",
    ),
    (
        "box-shadow: 0 0 10px rgba(124, 58, 237, 0.3);",
        "box-shadow: 0 0 10px rgba(124, 58, 237, 0.15);",
    ),
    (
        "box-shadow: 0 0 6px rgba(255, 60, 90, 0.5);",
        "box-shadow: 0 0 6px rgba(255, 90, 106, 0.15);",
    ),
    (
        "box-shadow: 0 0 35px rgba(0, 240, 255, 0.25);",
        "box-shadow: 0 0 35px rgba(94, 235, 255, 0.15);",
    ),
    (
        "box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);",
        "box-shadow: 0 0 15px rgba(94, 235, 255, 0.15);",
    ),
    (
        "box-shadow: 0 0 20px var(--accent-color, #00F0FF);",
        "box-shadow: 0 0 20px rgba(94, 235, 255, 0.15);",
    ),
    (
        "box-shadow: 0 0 8px rgba(255, 60, 90, 0.3);",
        "box-shadow: 0 0 8px rgba(255, 90, 106, 0.15);",
    ),
    (
        "box-shadow: 0 0 12px #00f0ff, 0 0 24px rgba(0,240,255,0.4);",
        "box-shadow: 0 0 12px rgba(94, 235, 255, 0.15);",
    ),
    ("box-shadow: 0 0 8px rgba(0,240,255,0.7);", "box-shadow: 0 0 8px rgba(94, 235, 255, 0.15);"),
    (
        "box-shadow: 0 0 60px rgba(0, 240, 255, 0.18), 0 0 120px rgba(0, 0, 0, 0.8);",
        "box-shadow: 0 0 60px rgba(94, 235, 255, 0.12), 0 0 120px rgba(0, 0, 0, 0.8);",
    ),
    ("box-shadow: 0 0 6px #00e676;", "box-shadow: 0 0 6px rgba(124, 255, 178, 0.15);"),
    (
        "box-shadow: 0 0 8px rgba(0, 240, 255, 0.6), 0 0 2px rgba(0, 240, 255, 0.9) inset;",
        "box-shadow: 0 0 8px rgba(94, 235, 255, 0.15), 0 0 2px rgba(94, 235, 255, 0.12) inset;",
    ),
    (
        "box-shadow: 0 0 6px rgba(0, 240, 255, 0.4);",
        "box-shadow: 0 0 6px rgba(94, 235, 255, 0.12);",
    ),
]

for old, new in replacements:
    css = css.replace(old, new)

# ── 4. HARDCODED BORDER COLOR FIX ─────────────────────────────────────────────
css = css.replace(
    ".message.user .message-card {\n    background: #0f172a;\n    border: 1px solid rgba(0, 240, 255, 0.15);\n    color: #f1f5f9;\n}",
    ".message.user .message-card {\n    background: #0f172a;\n    border: 1px solid rgba(94, 235, 255, 0.15);\n    color: var(--fg-color);\n}",
)

# ── VERIFY ─────────────────────────────────────────────────────────────────────
remaining = [i + 1 for i, line in enumerate(css.split("\n")) if "backdrop-filter" in line]
print(f"Remaining backdrop-filter lines: {remaining}")

if remaining:
    for ln in remaining:
        print(f"  Line {ln}: {css.split(chr(10))[ln-1]}")

changed = sum(1 for a, b in zip(original.split("\n"), css.split("\n")) if a != b)
print(f"Modified lines: {changed}")

with open(path, "w", encoding="utf-8") as f:
    f.write(css)

print("Done.")
