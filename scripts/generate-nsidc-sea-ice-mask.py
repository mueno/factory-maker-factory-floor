#!/usr/bin/env python3
"""Rasterize the NSIDC September 2025 northern sea-ice extent polygon.

The source shapefile uses the NSIDC Hughes 1980 polar stereographic projection.
This script performs the documented inverse stereographic transform, unwraps
rings at the antimeridian, and emits an equirectangular display mask.
"""

from __future__ import annotations

import io
import math
import struct
import zipfile
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/earth/nsidc-sea-ice-extent-2025-09.png"
SOURCE_URL = "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/shapefiles/shp_extent/09_Sep/extent_N_202509_polygon_v4.0.zip"
WIDTH, HEIGHT = 2048, 1024

# Hughes 1980 ellipsoid and G02135 projection parameters from the bundled .prj.
A = 6_378_273.0
INVERSE_FLATTENING = 298.279411123064
E2 = 2 / INVERSE_FLATTENING - 1 / (INVERSE_FLATTENING**2)
E = math.sqrt(E2)
LAT_TS = math.radians(70.0)
LON_0 = math.radians(-45.0)


def inverse_polar_stereographic(x: float, y: float) -> tuple[float, float]:
    rho = math.hypot(x, y)
    if rho < 1e-9:
        return 90.0, -45.0
    sin_c = math.sin(LAT_TS)
    m_c = math.cos(LAT_TS) / math.sqrt(1 - E2 * sin_c * sin_c)
    t_c = math.tan(math.pi / 4 - LAT_TS / 2) / (((1 - E * sin_c) / (1 + E * sin_c)) ** (E / 2))
    t = rho * t_c / (A * m_c)
    lat = math.pi / 2 - 2 * math.atan(t)
    for _ in range(8):
        ratio = (1 - E * math.sin(lat)) / (1 + E * math.sin(lat))
        lat = math.pi / 2 - 2 * math.atan(t * (ratio ** (E / 2)))
    lon = LON_0 + math.atan2(x, -y)
    return math.degrees(lat), ((math.degrees(lon) + 180) % 360) - 180


def rings_from_shapefile(content: bytes):
    offset = 100
    while offset + 8 <= len(content):
        _, words = struct.unpack(">2i", content[offset : offset + 8])
        payload = content[offset + 8 : offset + 8 + words * 2]
        offset += 8 + words * 2
        if len(payload) < 44 or struct.unpack("<i", payload[:4])[0] not in (5, 15, 25):
            continue
        parts_count, points_count = struct.unpack("<2i", payload[36:44])
        parts = list(struct.unpack(f"<{parts_count}i", payload[44 : 44 + parts_count * 4]))
        points_offset = 44 + parts_count * 4
        points = [struct.unpack("<2d", payload[points_offset + i * 16 : points_offset + (i + 1) * 16]) for i in range(points_count)]
        ends = parts[1:] + [points_count]
        for start, end in zip(parts, ends):
            yield points[start:end]


def unwrap_pixels(ring):
    result = []
    previous_lon = None
    unwrapped_lon = 0.0
    for x, y in ring:
        lat, lon = inverse_polar_stereographic(x, y)
        if previous_lon is None:
            unwrapped_lon = lon
        else:
            delta = lon - previous_lon
            if delta > 180:
                delta -= 360
            elif delta < -180:
                delta += 360
            unwrapped_lon += delta
        previous_lon = lon
        result.append(((unwrapped_lon + 180) / 360 * WIDTH, (90 - lat) / 180 * HEIGHT))
    return result


def main() -> None:
    print(f"Downloading {SOURCE_URL}", flush=True)
    with urlopen(SOURCE_URL, timeout=90) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
        shp_name = next(name for name in archive.namelist() if name.endswith(".shp"))
        shapefile = archive.read(shp_name)

    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    ring_count = 0
    for ring in rings_from_shapefile(shapefile):
        pixels = unwrap_pixels(ring)
        if len(pixels) < 3:
            continue
        for shift in (-WIDTH, 0, WIDTH):
            draw.polygon([(x + shift, y) for x, y in pixels], fill=255)
        ring_count += 1
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.75))
    mask.save(OUTPUT, optimize=True)
    print(f"Wrote {ring_count} rings to {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} bytes)", flush=True)


if __name__ == "__main__":
    main()
