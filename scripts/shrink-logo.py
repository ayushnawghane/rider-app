#!/usr/bin/env python3
"""Shrink the oversized source logo into a small, optimized app mark.

`public/logo.png` is a ~5 MB, 10240x10240 JPEG — far too heavy to ship in the
UI. This regenerates `public/logo-mark.png` at 256x256 (~40 KB) for use in
brand tiles, etc.

Usage:
    python3 scripts/shrink-logo.py [size]
"""
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # the source is intentionally huge

SRC = "public/logo.png"
OUT = "public/logo-mark.png"


def main() -> None:
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 256
    im = Image.open(SRC)
    im.draft("RGB", (size * 2, size * 2))  # memory-efficient JPEG downscale
    im.thumbnail((size, size), Image.LANCZOS)
    im.convert("RGB").save(OUT, optimize=True)
    print(f"Wrote {OUT} at {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    main()
