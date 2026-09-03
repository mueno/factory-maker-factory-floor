#!/usr/bin/env python3
"""Build open current streamlines from a public OSCAR velocity subset.

The source is OSCAR v1 served by NOAA CoastWatch ERDDAP. July 2014 is used
because it is the last complete month in this public mirror. Six 5-day
composites are averaged onto a 4x-spatially-strided grid before streamlines are
integrated. The generated JSON is bundled; no network request occurs at runtime.
"""

from __future__ import annotations

import csv
import io
import json
import math
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "app/earth/data/oscar-july-2014-streamlines.json"
BASE_URL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplOscar.csv"
QUERY = "u[102:1:107][0][0:4:480][0:4:1076],v[102:1:107][0][0:4:480][0:4:1076]"
SOURCE_URL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplOscar.html"
PO_DAAC_URL = "https://podaac.jpl.nasa.gov/dataset/oscar_l4_oc_third-deg"

SEEDS = [
    ("Kuroshio", 24.0, 123.0),
    ("Gulf Stream", 27.0, -79.0),
    ("North Atlantic Drift", 44.0, -45.0),
    ("Brazil Current", -19.0, -38.0),
    ("Agulhas Current", -35.0, 27.0),
    ("East Australian Current", -23.0, 155.0),
    ("Antarctic Circumpolar Current — Pacific", -52.0, -145.0),
    ("Antarctic Circumpolar Current — Atlantic", -51.0, -15.0),
    ("California Current", 39.0, -130.0),
    ("Canary Current", 31.0, -18.0),
    ("Benguela Current", -25.0, 10.0),
    ("Humboldt Current", -30.0, -77.0),
    ("North Equatorial Pacific", 10.0, -150.0),
    ("South Equatorial Atlantic", -6.0, -20.0),
    ("Somali Current", 7.0, 53.0),
]


def fetch_rows() -> list[dict[str, str]]:
    url = f"{BASE_URL}?{quote(QUERY, safe='[],')}"
    print(f"Downloading {url}")
    with urlopen(url, timeout=120) as response:
        text = response.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    next(reader)  # ERDDAP units row
    return list(reader)


def build_grid(rows: list[dict[str, str]]):
    sums: dict[tuple[float, float], list[float]] = {}
    times: set[str] = set()
    for row in rows:
        times.add(row["time"])
        try:
            u = float(row["u"])
            v = float(row["v"])
        except ValueError:
            continue
        if not math.isfinite(u) or not math.isfinite(v):
            continue
        lat = round(float(row["latitude"]), 8)
        lon = round(float(row["longitude"]), 8)
        key = (lat, lon)
        cell = sums.setdefault(key, [0.0, 0.0, 0.0])
        cell[0] += u
        cell[1] += v
        cell[2] += 1

    lats = sorted({round(float(row["latitude"]), 8) for row in rows})
    lons = sorted({round(float(row["longitude"]), 8) for row in rows})
    grid: dict[tuple[int, int], tuple[float, float]] = {}
    lat_index = {value: index for index, value in enumerate(lats)}
    lon_index = {value: index for index, value in enumerate(lons)}
    for (lat, lon), (u_sum, v_sum, count) in sums.items():
        grid[(lat_index[lat], lon_index[lon])] = (u_sum / count, v_sum / count)
    return lats, lons, grid, sorted(times)


def sample(lats, lons, grid, lat: float, lon: float):
    if lat <= lats[0] or lat >= lats[-1]:
        return None
    wrapped = lon % 360
    if wrapped < 20:
        wrapped += 360
    lat_step = lats[1] - lats[0]
    lon_step = lons[1] - lons[0]
    fy = (lat - lats[0]) / lat_step
    fx = (wrapped - lons[0]) / lon_step
    y0 = int(math.floor(fy))
    x0 = int(math.floor(fx))
    y1 = min(y0 + 1, len(lats) - 1)
    x1 = min(x0 + 1, len(lons) - 1)
    values = [grid.get((y0, x0)), grid.get((y0, x1)), grid.get((y1, x0)), grid.get((y1, x1))]
    valid = [value for value in values if value is not None]
    if len(valid) < 2:
        return None
    # Missing coastal corners are ignored rather than filled with invented
    # vectors; valid neighbours are averaged with bilinear weights.
    tx, ty = fx - x0, fy - y0
    weights = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty]
    weighted = [(value, weight) for value, weight in zip(values, weights) if value is not None]
    total = sum(weight for _, weight in weighted)
    if total <= 0:
        return None
    u = sum(value[0] * weight for value, weight in weighted) / total
    v = sum(value[1] * weight for value, weight in weighted) / total
    return u, v


def integrate(lats, lons, grid, seed_lat: float, seed_lon: float, direction: float):
    points = []
    lat, lon = seed_lat, seed_lon
    for _ in range(120):
        velocity = sample(lats, lons, grid, lat, lon)
        if velocity is None:
            break
        u, v = velocity
        speed = math.hypot(u, v)
        if speed < 0.035:
            break
        points.append([round(lat, 3), round(((lon + 180) % 360) - 180, 3), round(speed, 3)])
        step = 0.72
        lat += direction * step * v / speed
        lon += direction * step * u / speed / max(0.28, math.cos(math.radians(lat)))
        if abs(lat) >= 79.5:
            break
    return points


def main() -> None:
    rows = fetch_rows()
    lats, lons, grid, times = build_grid(rows)
    paths = []
    for name, lat, lon in SEEDS:
        backward = integrate(lats, lons, grid, lat, lon, -1.0)
        forward = integrate(lats, lons, grid, lat, lon, 1.0)
        points = list(reversed(backward[1:])) + forward
        if len(points) >= 10:
            paths.append({"name": name, "points": points})
        else:
            print(f"Skipped {name}: only {len(points)} points")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "dataset": "OSCAR Sea Surface Velocity, 1/3 degree, version 1",
        "period": "2014-07",
        "composites": times,
        "method": "Mean of six 5-day composites; 4x spatial stride; open streamlines integrated from named ocean seeds.",
        "source": SOURCE_URL,
        "canonicalArchive": PO_DAAC_URL,
        "paths": paths,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(paths)} paths to {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} bytes)")
    print("Composites:", ", ".join(times))


if __name__ == "__main__":
    main()
