#!/usr/bin/env python3
"""Generate favicon assets from a single source image.

Usage:
    python3 make-favicons.py path/to/source-image.png

Produces, in the current directory:
    favicon.ico          (multi-resolution: 16, 32, 48)
    favicon-16x16.png
    favicon-32x32.png
    apple-touch-icon.png (180x180)

The source image should be square and reasonably large (>= 180px,
ideally 512px+) for the best-looking results.
"""
import sys
from PIL import Image


def main(src_path):
    img = Image.open(src_path).convert("RGBA")

    # Square the image (center-crop) if it isn't already.
    w, h = img.size
    if w != h:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))

    # Multi-resolution .ico
    img.save("favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Individual PNGs
    img.resize((16, 16), Image.LANCZOS).save("favicon-16x16.png")
    img.resize((32, 32), Image.LANCZOS).save("favicon-32x32.png")
    img.resize((180, 180), Image.LANCZOS).save("apple-touch-icon.png")

    print("Wrote favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
