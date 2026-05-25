"""
NEURODECK Brand Asset Generator
Generates all app icons and Steam grid assets using Pillow.

Run from the project root:
    python assets/brand/generate_assets.py
"""

import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).parent.parent.parent
ICONS_DIR    = PROJECT_ROOT / "src-tauri" / "icons"
STEAM_DIR    = PROJECT_ROOT / "assets" / "steam-grid"
FONTS_DIR    = Path("C:/Windows/Fonts")

ICONS_DIR.mkdir(parents=True, exist_ok=True)
STEAM_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Brand colours
# ---------------------------------------------------------------------------
BG_DEEP   = (5,   5,   5,   255)   # #050505 — background
BG_GLOW   = (0,   24,  32,  255)   # #001820 — inner glow centre
CYAN      = (0,   240, 255, 255)   # #00F0FF — primary accent
TEAL      = (0,   204, 136, 255)   # #00CC88 — secondary accent
CYAN_DIM  = (0,   240, 255, 60)    # translucent cyan for tails
WHITE     = (255, 255, 255, 255)

# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------
def _font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS_DIR / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()

def font_mono_bold(size: int):
    return _font("consolab.ttf", size)

def font_mono(size: int):
    return _font("consola.ttf", size)

# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def radial_gradient(img: Image.Image, centre: tuple, radius: int,
                    inner: tuple, outer: tuple):
    """Paint a radial gradient on top of img (RGBA)."""
    cx, cy = centre
    data = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            dx, dy = x - cx, y - cy
            d = math.sqrt(dx * dx + dy * dy) / radius
            t = min(d, 1.0)
            r = int(inner[0] + (outer[0] - inner[0]) * t)
            g = int(inner[1] + (outer[1] - inner[1]) * t)
            b = int(inner[2] + (outer[2] - inner[2]) * t)
            a = int(inner[3] + (outer[3] - inner[3]) * t)
            data[x, y] = (
                min(255, max(0, r)),
                min(255, max(0, g)),
                min(255, max(0, b)),
                min(255, max(0, a)),
            )
    return img


def glow_layer(shape_img: Image.Image, radius: int = 18) -> Image.Image:
    """Return a blurred glow copy of a shape image (same size, RGBA)."""
    glow = shape_img.filter(ImageFilter.GaussianBlur(radius))
    return glow


def draw_rounded_rect(draw: ImageDraw.Draw, xy, corner_r: int, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + corner_r, y0, x1 - corner_r, y1], fill=fill)
    draw.rectangle([x0, y0 + corner_r, x1, y1 - corner_r], fill=fill)
    draw.ellipse([x0, y0, x0 + 2 * corner_r, y0 + 2 * corner_r], fill=fill)
    draw.ellipse([x1 - 2 * corner_r, y0, x1, y0 + 2 * corner_r], fill=fill)
    draw.ellipse([x0, y1 - 2 * corner_r, x0 + 2 * corner_r, y1], fill=fill)
    draw.ellipse([x1 - 2 * corner_r, y1 - 2 * corner_r, x1, y1], fill=fill)


def draw_n_glyph(draw: ImageDraw.Draw, x0: int, y0: int,
                 bar_w: int, height: int, gap: int,
                 fill, line_w: int = 2):
    """
    Draw the NEURODECK "N" circuit monogram.

    x0, y0   — top-left corner of the N bounding box
    bar_w    — width of the vertical bars (and approx diagonal stroke)
    height   — total height of the N
    gap      — space between right edge of left bar and left edge of right bar
    fill     — colour for the N body
    """
    x1 = x0 + bar_w                     # inner right of left bar
    x3 = x0 + bar_w + gap               # inner left of right bar
    x4 = x0 + bar_w + gap + bar_w       # outer right of right bar
    y1 = y0 + height

    # Left vertical bar
    draw.rectangle([x0, y0, x1, y1], fill=fill)
    # Right vertical bar
    draw.rectangle([x3, y0, x4, y1], fill=fill)
    # Diagonal parallelogram: top=(x1,y0)→(x1+bar_w,y0), bottom=(x3,y1)→(x3-bar_w,y1)
    # We approximate with a rotated rectangle via polygon
    diag = [
        (x1,          y0),   # top-left of diagonal
        (x1 + bar_w,  y0),   # top-right of diagonal (overlaps into the gap area)
        (x3,          y1),   # bottom-right of diagonal
        (x3 - bar_w,  y1),   # bottom-left of diagonal
    ]
    draw.polygon(diag, fill=fill)


def draw_circuit_tails(draw: ImageDraw.Draw,
                       nodes: list, tail_len: int, stroke_w: int,
                       color, opacity_factor: float = 0.3):
    """
    Draw horizontal circuit traces extending outward from each node.
    nodes: list of (x, y, direction) where direction is "left" or "right"
    """
    for (nx, ny, direction) in nodes:
        alpha = int(255 * opacity_factor)
        c = color[:3] + (alpha,)
        if direction == "left":
            draw.line([(nx - tail_len, ny), (nx, ny)], fill=c, width=stroke_w)
            for tick_x in [nx - tail_len // 3, nx - 2 * tail_len // 3]:
                tick_h = stroke_w * 4
                draw.line([(tick_x, ny - tick_h), (tick_x, ny + tick_h)],
                          fill=c, width=stroke_w)
        else:
            draw.line([(nx, ny), (nx + tail_len, ny)], fill=c, width=stroke_w)
            for tick_x in [nx + tail_len // 3, nx + 2 * tail_len // 3]:
                tick_h = stroke_w * 4
                draw.line([(tick_x, ny - tick_h), (tick_x, ny + tick_h)],
                          fill=c, width=stroke_w)


def draw_grid(draw: ImageDraw.Draw, w: int, h: int,
              spacing: int, color, alpha: int = 12):
    c = color[:3] + (alpha,)
    for x in range(0, w, spacing):
        draw.line([(x, 0), (x, h)], fill=c, width=1)
    for y in range(0, h, spacing):
        draw.line([(0, y), (w, y)], fill=c, width=1)


# ---------------------------------------------------------------------------
# Icon generator — single RGBA image at given size
# ---------------------------------------------------------------------------

def make_icon(size: int) -> Image.Image:
    """
    Generate the NEURODECK icon at `size`×`size` pixels.
    Background: dark rounded square with radial glow.
    Centre: circuit N monogram in cyan→teal gradient with glow.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # -- Background layer (radial gradient inside rounded square) --
    bg = Image.new("RGBA", (size, size), BG_DEEP)
    glow_bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    radial_gradient(glow_bg, (size // 2, size // 2),
                    int(size * 0.45), BG_GLOW, (0, 0, 0, 0))
    bg = Image.alpha_composite(bg, glow_bg)

    # Mask to rounded square
    corner_r = max(4, size // 7)
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    draw_rounded_rect(md, (0, 0, size - 1, size - 1), corner_r, 255)
    img.paste(bg, mask=mask)

    draw = ImageDraw.Draw(img, "RGBA")

    # -- Grid lines --
    spacing = max(8, size // 8)
    draw_grid(draw, size, size, spacing, CYAN, alpha=10)

    # -- N glyph geometry --
    margin   = size // 5          # padding from edge
    n_w      = size - 2 * margin  # total N width
    bar_w    = max(4, n_w // 6)   # thickness of each bar
    gap      = n_w - 2 * bar_w    # gap between bars
    n_h      = n_w                # square N
    nx0      = margin
    ny0      = (size - n_h) // 2

    # -- Glow pass for N --
    glow_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img, "RGBA")
    glow_fill = CYAN[:3] + (180,)
    draw_n_glyph(gd, nx0, ny0, bar_w, n_h, gap, glow_fill)
    glow_blur = glow_layer(glow_img, radius=max(2, size // 30))
    img = Image.alpha_composite(img, glow_blur)

    # -- Solid N (re-draw on composited img) --
    draw = ImageDraw.Draw(img, "RGBA")
    draw_n_glyph(draw, nx0, ny0, bar_w, n_h, gap, CYAN)

    # -- Node dots at corners of N --
    node_r   = max(2, bar_w // 2)
    nx1      = nx0 + bar_w           # right edge of left bar
    nx3      = nx0 + bar_w + gap     # left edge of right bar
    nx4      = nx3 + bar_w           # right edge of right bar
    ncx_l    = nx0 + bar_w // 2      # centre x of left bar
    ncx_r    = nx3 + bar_w // 2      # centre x of right bar
    ny1      = ny0 + n_h

    nodes_pos = [
        (ncx_l, ny0),
        (ncx_l, ny1),
        (ncx_r, ny0),
        (ncx_r, ny1),
    ]
    for (nx, ny) in nodes_pos:
        # glow halo
        gr = node_r * 3
        for rad in range(gr, node_r, -1):
            a = int(80 * (1 - (rad - node_r) / (gr - node_r)))
            c = CYAN[:3] + (a,)
            draw.ellipse([(nx - rad, ny - rad), (nx + rad, ny + rad)], fill=c)
        draw.ellipse(
            [(nx - node_r, ny - node_r), (nx + node_r, ny + node_r)],
            fill=CYAN
        )

    # -- Circuit tails --
    tail_len  = margin - node_r - 2
    stroke_w  = max(1, size // 200)
    if tail_len > 2:
        tails = [
            (ncx_l, ny0, "left"),
            (ncx_l, ny1, "left"),
            (ncx_r, ny0, "right"),
            (ncx_r, ny1, "right"),
        ]
        draw_circuit_tails(draw, tails, tail_len, stroke_w, CYAN, 0.35)

    return img


# ---------------------------------------------------------------------------
# Steam grid asset generators
# ---------------------------------------------------------------------------

def _steam_background(w: int, h: int) -> Image.Image:
    """Dark background with subtle radial glow and grid."""
    img = Image.new("RGBA", (w, h), BG_DEEP)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    radial_gradient(glow, (w // 3, h // 2), min(w, h) // 2,
                    BG_GLOW, (0, 0, 0, 0))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img, "RGBA")
    draw_grid(draw, w, h, max(20, w // 40), CYAN, alpha=8)
    return img


def _composite_n(base: Image.Image,
                 cx: int, cy: int, n_size: int) -> Image.Image:
    """Stamp a square icon onto base, centred at (cx, cy)."""
    icon = make_icon(n_size)
    x = cx - n_size // 2
    y = cy - n_size // 2
    base.paste(icon, (x, y), mask=icon)
    return base


def _neurodeck_text(draw: ImageDraw.Draw,
                    cx: int, cy: int, font_size: int, tagline: bool = True):
    """Draw 'NEURODECK' wordmark + optional tagline centred at (cx, cy)."""
    f_title = font_mono_bold(font_size)
    f_tag   = font_mono(max(12, font_size // 3))
    title   = "NEURODECK"
    tag     = "AI-NATIVE TERMINAL OS"

    # glow pass
    glow_layer_img = Image.new("RGBA", draw.im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer_img, "RGBA")
    tb = gd.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = cx - tw // 2
    ty = cy - th // 2
    gd.text((tx, ty), title, font=f_title, fill=CYAN[:3] + (160,))
    blurred = glow_layer_img.filter(ImageFilter.GaussianBlur(font_size // 8))

    # compose glow onto base (need to work around draw.im being internal)
    # We'll return the positions so caller can composite
    return tx, ty, tw, th, f_title, f_tag, tag, blurred


def make_hero(w: int = 1920, h: int = 620) -> Image.Image:
    """1920×620 Steam hero banner."""
    img = _steam_background(w, h)

    # Large N on the left third
    n_size = int(h * 0.80)
    img = _composite_n(img, w // 6, h // 2, n_size)

    # Cyan vertical accent line separating N from text
    draw = ImageDraw.Draw(img, "RGBA")
    sep_x = w // 3 + 20
    for width_i, alpha in [(6, 30), (3, 80), (1, 200)]:
        draw.line([(sep_x, 60), (sep_x, h - 60)],
                  fill=CYAN[:3] + (alpha,), width=width_i)

    # NEURODECK text — right 2/3 centred
    text_cx = sep_x + (w - sep_x) // 2
    text_cy = h // 2 - 20
    title_size = int(h * 0.22)
    f_title = font_mono_bold(title_size)
    f_tag   = font_mono(int(h * 0.065))
    title   = "NEURODECK"
    tag     = "AI-NATIVE TERMINAL OS"

    # Glow pass
    glow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img, "RGBA")
    tb = gd.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = text_cx - tw // 2
    ty = text_cy - th // 2
    gd.text((tx, ty), title, font=f_title, fill=CYAN[:3] + (180,))
    glow_blur = glow_img.filter(ImageFilter.GaussianBlur(title_size // 6))
    img = Image.alpha_composite(img, glow_blur)

    draw = ImageDraw.Draw(img, "RGBA")
    draw.text((tx, ty), title, font=f_title, fill=CYAN)

    # Tagline
    tbb = draw.textbbox((0, 0), tag, font=f_tag)
    tag_w = tbb[2] - tbb[0]
    draw.text((text_cx - tag_w // 2, ty + th + int(h * 0.04)),
              tag, font=f_tag, fill=TEAL)

    # Decorative scanline bars bottom strip
    bar_y = h - 12
    for bx in range(0, w, 4):
        alpha = 40 + (bx % 80)
        draw.line([(bx, bar_y), (bx, h - 1)],
                  fill=CYAN[:3] + (alpha,), width=2)

    return img.convert("RGB")


def make_capsule_portrait(w: int = 600, h: int = 900) -> Image.Image:
    """600×900 Steam portrait capsule."""
    img = _steam_background(w, h)

    # N centred in top portion
    n_size = int(w * 0.65)
    img = _composite_n(img, w // 2, int(h * 0.35), n_size)

    draw = ImageDraw.Draw(img, "RGBA")

    # Horizontal accent line
    sep_y = int(h * 0.60)
    for width_i, alpha in [(8, 20), (3, 70), (1, 200)]:
        draw.line([(40, sep_y), (w - 40, sep_y)],
                  fill=CYAN[:3] + (alpha,), width=width_i)

    # NEURODECK text
    title_size = int(w * 0.115)
    f_title = font_mono_bold(title_size)
    f_tag   = font_mono(int(w * 0.052))
    title = "NEURODECK"
    tag   = "AI-NATIVE TERMINAL OS"

    # Glow
    glow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img, "RGBA")
    tb = gd.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = (w - tw) // 2
    ty = sep_y + int(h * 0.06)
    gd.text((tx, ty), title, font=f_title, fill=CYAN[:3] + (180,))
    img = Image.alpha_composite(img,
            glow_img.filter(ImageFilter.GaussianBlur(title_size // 6)))

    draw = ImageDraw.Draw(img, "RGBA")
    draw.text((tx, ty), title, font=f_title, fill=CYAN)

    # Tagline
    tbb = draw.textbbox((0, 0), tag, font=f_tag)
    tag_w = tbb[2] - tbb[0]
    draw.text(((w - tag_w) // 2, ty + th + int(h * 0.025)),
              tag, font=f_tag, fill=TEAL)

    # Cyan border bottom
    border_h = 6
    for i in range(border_h):
        alpha = int(255 * (i + 1) / border_h)
        draw.line([(0, h - border_h + i), (w, h - border_h + i)],
                  fill=CYAN[:3] + (alpha,), width=1)

    return img.convert("RGB")


def make_capsule_landscape(w: int = 920, h: int = 430) -> Image.Image:
    """920×430 Steam landscape capsule."""
    img = _steam_background(w, h)

    # N on the left
    n_size = int(h * 0.72)
    img = _composite_n(img, int(w * 0.22), h // 2, n_size)

    draw = ImageDraw.Draw(img, "RGBA")

    # Vertical separator
    sep_x = int(w * 0.44)
    for width_i, alpha in [(6, 25), (2, 80), (1, 200)]:
        draw.line([(sep_x, 30), (sep_x, h - 30)],
                  fill=CYAN[:3] + (alpha,), width=width_i)

    # Text in right portion
    text_cx = sep_x + (w - sep_x) // 2
    title_size = int(h * 0.18)
    f_title = font_mono_bold(title_size)
    f_tag   = font_mono(int(h * 0.065))
    title = "NEURODECK"
    tag   = "AI-NATIVE TERMINAL OS"

    # Glow
    glow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img, "RGBA")
    tb = gd.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = text_cx - tw // 2
    ty = h // 2 - th // 2 - int(h * 0.05)
    gd.text((tx, ty), title, font=f_title, fill=CYAN[:3] + (180,))
    img = Image.alpha_composite(img,
            glow_img.filter(ImageFilter.GaussianBlur(title_size // 6)))

    draw = ImageDraw.Draw(img, "RGBA")
    draw.text((tx, ty), title, font=f_title, fill=CYAN)

    tbb = draw.textbbox((0, 0), tag, font=f_tag)
    tag_w = tbb[2] - tbb[0]
    draw.text((text_cx - tag_w // 2, ty + th + int(h * 0.04)),
              tag, font=f_tag, fill=TEAL)

    return img.convert("RGB")


def make_logo_transparent(w: int = 600, h: int = 200) -> Image.Image:
    """600×200 logo on transparent background (for Steam library logo slot)."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # N on left
    n_size = int(h * 0.85)
    icon = make_icon(n_size)
    # Remove rounded corners mask — use raw icon on transparent bg
    img.paste(icon, (20, (h - n_size) // 2), mask=icon)

    draw = ImageDraw.Draw(img, "RGBA")
    title_size = int(h * 0.35)
    f_title = font_mono_bold(title_size)
    f_tag   = font_mono(int(h * 0.14))
    title = "NEURODECK"
    tag   = "AI-NATIVE TERMINAL OS"

    # Glow
    glow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img, "RGBA")
    tx = 30 + n_size
    tb = gd.textbbox((0, 0), title, font=f_title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    ty = h // 2 - (th + int(h * 0.18)) // 2
    gd.text((tx, ty), title, font=f_title, fill=CYAN[:3] + (180,))
    img = Image.alpha_composite(img,
            glow_img.filter(ImageFilter.GaussianBlur(title_size // 6)))

    draw = ImageDraw.Draw(img, "RGBA")
    draw.text((tx, ty), title, font=f_title, fill=CYAN)
    tbb = draw.textbbox((0, 0), tag, font=f_tag)
    draw.text((tx, ty + th + 8), tag, font=f_tag, fill=TEAL)

    return img


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("NEURODECK Asset Generator")
    print("=" * 40)

    # ---- App Icons ----
    print("Generating app icons...")

    icon_32 = make_icon(32)
    icon_32.save(ICONS_DIR / "32x32.png")
    print("  [ok] 32x32.png")

    icon_128 = make_icon(128)
    icon_128.save(ICONS_DIR / "128x128.png")
    print("  [ok] 128x128.png")

    icon_256 = make_icon(256)
    icon_256.save(ICONS_DIR / "128x128@2x.png")
    print("  [ok] 128x128@2x.png (256px)")

    icon_512 = make_icon(512)
    icon_512.save(ICONS_DIR / "icon.png")
    print("  [ok] icon.png (512px)")

    # ICO: multi-resolution Windows icon
    ico_sizes = [(sz, sz) for sz in [16, 24, 32, 48, 64, 128, 256]]
    ico_frames = [make_icon(sz).convert("RGBA") for sz, _ in ico_sizes]
    ico_frames[0].save(
        ICONS_DIR / "icon.ico",
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_frames[1:],
    )
    print("  [ok] icon.ico (multi-res: 16/24/32/48/64/128/256)")

    # ICNS: approximated as a 512-PNG copy (real ICNS needs macOS icnsify)
    icon_512.save(ICONS_DIR / "icon.icns")
    print("  [ok] icon.icns (512px placeholder — convert on macOS for release)")

    # ---- Steam Grid Assets ----
    print("\nGenerating Steam grid assets...")

    hero = make_hero(1920, 620)
    hero.save(STEAM_DIR / "hero.png")
    print("  [ok] hero.png  (1920x620)")

    portrait = make_capsule_portrait(600, 900)
    portrait.save(STEAM_DIR / "capsule-portrait.png")
    print("  [ok] capsule-portrait.png  (600x900)")

    landscape = make_capsule_landscape(920, 430)
    landscape.save(STEAM_DIR / "capsule-landscape.png")
    print("  [ok] capsule-landscape.png  (920x430)")

    logo = make_logo_transparent(600, 200)
    logo.save(STEAM_DIR / "logo.png")
    print("  [ok] logo.png  (600x200, transparent bg)")

    print("\nAll assets generated successfully.")
    print(f"\nApp icons  →  {ICONS_DIR}")
    print(f"Steam grid →  {STEAM_DIR}")
    print("\nSteam grid install (on Steam Deck):")
    print("  1. Find the NEURODECK non-Steam game entry's AppID:")
    print("     grep -r 'neurodeck' ~/.local/share/Steam/userdata/*/shortcuts.vdf")
    print("  2. Copy files to:")
    print("     ~/.local/share/Steam/userdata/{userId}/config/grid/")
    print("     Naming: {appid}.png (landscape), {appid}p.png (portrait),")
    print("             {appid}_hero.png (hero), {appid}_logo.png (logo)")


if __name__ == "__main__":
    main()
