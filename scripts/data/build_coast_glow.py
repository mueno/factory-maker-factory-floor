#!/usr/bin/env python3
"""Build the coastal-proximity glow texture (E3, docs/EARTH-DYNAMICS-PLAN.md).

Source: Natural Earth 50m coastline (public domain). Output: an equirectangular
grayscale PNG where brightness falls off with distance from the nearest
coastline. This is a *coastal zone emphasis* texture — it is not a sea-level or
inundation dataset, and the UI must label it accordingly.

Usage: python build_coast_glow.py  (writes public/earth/coast-glow-2048.png)
"""
from __future__ import annotations

import io
import json
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import shapefile  # pyshp
from PIL import Image, ImageDraw
from scipy import ndimage

REPO = Path(__file__).resolve().parents[2]
OUT_PNG = REPO / 'public' / 'earth' / 'coast-glow-2048.png'
OUT_META = REPO / 'public' / 'earth' / 'coast-glow-2048.json'
SOURCE = 'https://naciscdn.org/naturalearth/50m/physical/ne_50m_coastline.zip'
WIDTH, HEIGHT = 2048, 1024
SIGMA_KM = 220.0  # e-folding distance of the glow
KM_PER_DEG_EQ = 111.32


def fetch_coastline() -> shapefile.Reader:
    print(f'downloading {SOURCE}')
    with urllib.request.urlopen(SOURCE, timeout=120) as response:
        payload = response.read()
    archive = zipfile.ZipFile(io.BytesIO(payload))
    names = {Path(name).suffix: name for name in archive.namelist()}
    return shapefile.Reader(
        shp=io.BytesIO(archive.read(names['.shp'])),
        dbf=io.BytesIO(archive.read(names['.dbf'])),
        shx=io.BytesIO(archive.read(names['.shx'])),
    )


def rasterize(reader: shapefile.Reader) -> np.ndarray:
    image = Image.new('L', (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(image)

    def to_px(lon: float, lat: float) -> tuple[float, float]:
        return ((lon + 180.0) / 360.0 * WIDTH, (90.0 - lat) / 180.0 * HEIGHT)

    for shape in reader.shapes():
        points = shape.points
        parts = list(shape.parts) + [len(points)]
        for start, end in zip(parts[:-1], parts[1:]):
            segment = [to_px(lon, lat) for lon, lat in points[start:end]]
            if len(segment) >= 2:
                draw.line(segment, fill=255, width=1)
    return np.asarray(image) > 0


def main() -> None:
    mask = rasterize(fetch_coastline())
    print(f'coastline pixels: {int(mask.sum())}')
    # Distance in pixels from the nearest coastline pixel, then to km at the
    # equator. The cos(lat) shrink of a longitude degree makes high-latitude
    # glow slightly wide; acceptable for an emphasis layer (documented).
    distance_px = ndimage.distance_transform_edt(~mask)
    km_per_px = 360.0 / WIDTH * KM_PER_DEG_EQ
    distance_km = distance_px * km_per_px
    glow = np.exp(-distance_km / SIGMA_KM)
    encoded = np.clip(glow * 255.0, 0, 255).astype(np.uint8)
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(encoded, mode='L').save(OUT_PNG, optimize=True)
    OUT_META.write_text(json.dumps({
        'source': 'Natural Earth 50m coastline (public domain)',
        'source_url': SOURCE,
        'sigma_km': SIGMA_KM,
        'note': 'Coastal-zone emphasis distance field. Not a sea-level or inundation dataset.',
        'projection': 'equirectangular, lon -180..180 left-to-right, lat 90..-90 top-to-bottom',
    }, indent=2) + '\n')
    print(f'wrote {OUT_PNG} ({OUT_PNG.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
