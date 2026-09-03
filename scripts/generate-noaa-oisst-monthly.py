#!/usr/bin/env python3
"""Generate an equirectangular SST texture from NOAA OISST v2.1 data.

The script averages all 30 daily preliminary OISST fields available in August
2026 on a 2-degree sampling grid, then resamples the display texture. August 1
is absent from this preliminary aggregate. Transparent pixels are missing/land
values; they are not filled procedurally.
"""

from __future__ import annotations

import csv
import io
import math
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/earth/noaa-oisst-v21-2026-08.png"
BASE_URL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21NrtAgg.csv"
QUERY = "sst[(2026-08-01T12:00:00Z):1:(2026-08-31T12:00:00Z)][0][0:8:712][0:8:1432]"

RAMP = [
    (-2.0, (25, 32, 116)),
    (0.0, (32, 78, 196)),
    (10.0, (21, 174, 221)),
    (20.0, (79, 207, 124)),
    (26.0, (242, 214, 83)),
    (32.0, (238, 84, 60)),
    (36.0, (132, 24, 76)),
]


def color_for(value: float) -> tuple[int, int, int, int]:
    for index in range(len(RAMP) - 1):
        low_value, low_color = RAMP[index]
        high_value, high_color = RAMP[index + 1]
        if value <= high_value:
            amount = max(0.0, min(1.0, (value - low_value) / (high_value - low_value)))
            rgb = tuple(round(low + (high - low) * amount) for low, high in zip(low_color, high_color))
            return (*rgb, 255)
    return (*RAMP[-1][1], 255)


def main() -> None:
    url = f"{BASE_URL}?{quote(QUERY, safe='[],:()')}"
    print(f"Downloading {url}", flush=True)
    sums: dict[tuple[float, float], list[float]] = {}
    times: set[str] = set()
    with urlopen(url, timeout=180) as response:
        reader = csv.DictReader(io.TextIOWrapper(response, encoding="utf-8"))
        next(reader)  # ERDDAP units row
        for row in reader:
            times.add(row["time"])
            try:
                value = float(row["sst"])
            except ValueError:
                continue
            if not math.isfinite(value):
                continue
            key = (round(float(row["latitude"]), 4), round(float(row["longitude"]), 4))
            cell = sums.setdefault(key, [0.0, 0.0])
            cell[0] += value
            cell[1] += 1

    lats = sorted({lat for lat, _ in sums})
    lons = sorted({lon for _, lon in sums})
    x_index = {value: index for index, value in enumerate(lons)}
    y_index = {value: len(lats) - 1 - index for index, value in enumerate(lats)}
    image = Image.new("RGBA", (len(lons), len(lats)), (0, 0, 0, 0))
    pixels = image.load()
    for (lat, lon), (total, count) in sums.items():
        pixels[x_index[lon], y_index[lat]] = color_for(total / count)

    image = image.resize((2048, 1024), Image.Resampling.BICUBIC)
    image.save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} bytes)", flush=True)
    print(f"Averaged {len(times)} daily fields: {min(times)} through {max(times)}", flush=True)


if __name__ == "__main__":
    main()
