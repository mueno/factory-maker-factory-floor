#!/usr/bin/env python3
"""Build the decadal September sea-ice mask texture (E2, docs/EARTH-DYNAMICS-PLAN.md).

Source: NSIDC Sea Ice Index v4 (G02135) September monthly extent polygons.
Citation (required by NSIDC): Fetterer, F., Knowles, K., Meier, W. N.,
Savoie, M., Windnagel, A. K. & Stafford, T. (2025). Sea Ice Index (G02135,
Version 4). NSIDC. https://doi.org/10.7265/a98x-0f50

Output: one RGBA PNG packing four observed September extent masks
(R=1980, G=2000, B=2010, A=2020) on the standard equirectangular grid, plus a
JSON sidecar. The 2025 mask already ships as nsidc-sea-ice-extent-2025-09.png.

Usage: python build_sea_ice_decades.py
"""
from __future__ import annotations

import io
import json
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import pyproj
import shapefile  # pyshp
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
OUT_PNG = REPO / 'public' / 'earth' / 'nsidc-sea-ice-decades.png'
OUT_META = REPO / 'public' / 'earth' / 'nsidc-sea-ice-decades.json'
YEARS = [1980, 2000, 2010, 2020]  # packed into R, G, B, A
URL = ('https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/shapefiles/'
       'shp_extent/09_Sep/extent_N_{year}09_polygon_v4.0.zip')
WIDTH, HEIGHT = 2048, 1024


def fetch_polygons(year: int) -> shapefile.Reader:
    url = URL.format(year=year)
    print(f'downloading {url}')
    with urllib.request.urlopen(url, timeout=120) as response:
        payload = response.read()
    archive = zipfile.ZipFile(io.BytesIO(payload))
    names = {Path(name).suffix: name for name in archive.namelist()}
    prj = archive.read(names['.prj']).decode('ascii', 'replace') if '.prj' in names else ''
    reader = shapefile.Reader(
        shp=io.BytesIO(archive.read(names['.shp'])),
        dbf=io.BytesIO(archive.read(names['.dbf'])),
        shx=io.BytesIO(archive.read(names['.shx'])),
    )
    reader.prj_text = prj  # type: ignore[attr-defined]
    return reader


def ring_area(points: list[tuple[float, float]]) -> float:
    total = 0.0
    for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]):
        total += x1 * y2 - x2 * y1
    return total / 2.0


def rasterize(reader: shapefile.Reader) -> np.ndarray:
    """Fill rings in polar-stereographic space, then reproject the raster.

    Drawing directly in lon/lat breaks on antimeridian-crossing and
    pole-enclosing rings (full-width streak artifacts); in the native NSIDC
    projection every ring is a well-behaved planar polygon.
    """
    crs = pyproj.CRS.from_wkt(reader.prj_text) if reader.prj_text else pyproj.CRS.from_epsg(3411)
    ps_size = 1600
    ps_extent = 4_200_000.0  # metres; NSIDC northern grid fits inside

    def to_ps_px(x: float, y: float) -> tuple[float, float]:
        return ((x + ps_extent) / (2 * ps_extent) * ps_size,
                (ps_extent - y) / (2 * ps_extent) * ps_size)

    accumulator = np.zeros((ps_size, ps_size), dtype=bool)
    for shape in reader.shapes():
        points = shape.points
        parts = list(shape.parts) + [len(points)]
        for start, end in zip(parts[:-1], parts[1:]):
            ring = points[start:end]
            if len(ring) < 3:
                continue
            ring_image = Image.new('1', (ps_size, ps_size), 0)
            ImageDraw.Draw(ring_image).polygon([to_ps_px(x, y) for x, y in ring], fill=1)
            accumulator ^= np.asarray(ring_image, dtype=bool)

    # Reproject: for every equirect pixel north of 35N, sample the PS raster.
    transformer = pyproj.Transformer.from_crs('EPSG:4326', crs, always_xy=True)
    rows = int((90.0 - 35.0) / 180.0 * HEIGHT)
    lats = 90.0 - (np.arange(rows) + 0.5) / HEIGHT * 180.0
    lons = -180.0 + (np.arange(WIDTH) + 0.5) / WIDTH * 360.0
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    ps_x, ps_y = transformer.transform(lon_grid.ravel(), lat_grid.ravel())
    col = np.clip(((np.asarray(ps_x) + ps_extent) / (2 * ps_extent) * ps_size).astype(int), 0, ps_size - 1)
    row = np.clip(((ps_extent - np.asarray(ps_y)) / (2 * ps_extent) * ps_size).astype(int), 0, ps_size - 1)
    north = accumulator[row, col].reshape(rows, WIDTH)
    out = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
    out[:rows] = north * 255
    # Soften the edge by one smoothing pass at target resolution.
    return np.asarray(Image.fromarray(out).resize((WIDTH // 2, HEIGHT // 2), Image.LANCZOS).resize((WIDTH, HEIGHT), Image.LANCZOS))


def main() -> None:
    channels = [rasterize(fetch_polygons(year)) for year in YEARS]
    for year, channel in zip(YEARS, channels):
        coverage = float((channel > 127).mean()) * 100
        print(f'  {year}: {coverage:.2f}% of the equirect grid')
    rgba = np.stack(channels, axis=-1).astype(np.uint8)
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode='RGBA').save(OUT_PNG, optimize=True)
    OUT_META.write_text(json.dumps({
        'channels': {'R': YEARS[0], 'G': YEARS[1], 'B': YEARS[2], 'A': YEARS[3]},
        'month': 'September (annual minimum)',
        'source': 'NSIDC Sea Ice Index v4 (G02135) monthly extent polygons',
        'citation': 'Fetterer et al. (2025). Sea Ice Index, Version 4. NSIDC. doi:10.7265/a98x-0f50',
        'projection': 'equirectangular, lon -180..180 left-to-right, lat 90..-90 top-to-bottom',
        'note': 'Observed September extent (>=15% concentration). 2025 mask ships separately.',
    }, indent=2) + '\n')
    print(f'wrote {OUT_PNG} ({OUT_PNG.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
