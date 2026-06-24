#!/usr/bin/env python3
"""Generate favicon + social-card assets from the brand image.

Usage:
    python3 make-favicons.py [path/to/source-image.png]

Defaults to nolla-brand.png in the current directory.

Produces:
    favicon.ico          (multi-resolution: 16, 32, 48)
    favicon-16x16.png
    favicon-32x32.png
    apple-touch-icon.png (180x180)
    og-image.png         (1200x630 social card)

The black padding around the glyph is trimmed and re-padded with a small
uniform margin so the mark stays legible at tiny favicon sizes. The source
image is left untouched.
"""
import os
import sys
from PIL import Image


def main(src_path="nolla-brand.png"):
    src = Image.open(src_path).convert("RGBA")

    # Trim the black padding: find the bounding box of non-black content.
    gray = src.convert("L")
    bbox = gray.point(lambda p: 255 if p > 24 else 0).getbbox()
    glyph = src.crop(bbox)
    gw, gh = glyph.size

    # Re-pad to a square with a small uniform black margin (~8% per side).
    side = max(gw, gh)
    margin = int(side * 0.08)
    canvas = side + margin * 2
    fav = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 255))
    fav.paste(glyph, ((canvas - gw) // 2, (canvas - gh) // 2), glyph)

    fav.save("favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    fav.resize((16, 16), Image.LANCZOS).save("favicon-16x16.png")
    fav.resize((32, 32), Image.LANCZOS).save("favicon-32x32.png")
    fav.resize((180, 180), Image.LANCZOS).save("apple-touch-icon.png")

    # Social card: 1200x630, glyph centered on black.
    og = Image.new("RGBA", (1200, 630), (0, 0, 0, 255))
    target_h = 460
    ratio = target_h / gh
    logo = glyph.resize((int(gw * ratio), target_h), Image.LANCZOS)
    og.paste(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2), logo)
    og.convert("RGB").save("og-image.png")

    for f in ("favicon.ico", "favicon-16x16.png", "favicon-32x32.png",
              "apple-touch-icon.png", "og-image.png"):
        print(f"wrote {f} ({os.path.getsize(f)} bytes)")


if __name__ == "__main__":
    main(*sys.argv[1:2])
