#!/usr/bin/env python3
"""Derive small PBR rendering masks from the bundled NASA Blue Marble image.

These masks are visual rendering aids, not scientific measurement layers. The
source image already contains NASA's shaded topography; the bump proxy preserves
that shading over land while keeping the ocean flat.
"""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/earth/blue-marble-2048.png"
ROUGHNESS = ROOT / "public/earth/blue-marble-land-roughness-2048.png"
BUMP = ROOT / "public/earth/blue-marble-shaded-bump-2048.jpg"


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    pixels = source.load()
    land = Image.new("L", source.size)
    land_pixels = land.load()

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue = pixels[x, y]
            brightness = (red + green + blue) / 3
            # Blue Marble ocean is blue-dominant. Keep bright polar ice and
            # pale land in the land/ice side of the rendering mask.
            ocean = blue > red * 1.18 and blue > green * 0.92 and brightness < 152
            land_pixels[x, y] = 38 if ocean else 232

    land = land.filter(ImageFilter.GaussianBlur(radius=1.2))
    land.save(ROUGHNESS, optimize=True)

    shaded = ImageOps.grayscale(source)
    shaded = ImageEnhance.Contrast(shaded).enhance(1.35)
    bump = Image.composite(shaded, Image.new("L", source.size, 116), land)
    bump = bump.filter(ImageFilter.GaussianBlur(radius=0.7))
    bump.save(BUMP, quality=86, optimize=True, progressive=True)

    for path in (ROUGHNESS, BUMP):
        print(f"{path.relative_to(ROOT)}\t{path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
