#!/usr/bin/env python3
"""Build per-scenario surface-warming pattern textures (E1, EARTH-DYNAMICS-PLAN.md).

For each SSP we compute the CMIP6 multi-model-mean near-surface air temperature
change, 2081-2100 minus the 1995-2014 baseline, on a common lat/lon grid, and
encode ΔT as a grayscale equirectangular PNG (0 = coldest, 255 = warmest;
range recorded in the JSON sidecar so the shader can decode °C).

Source: CMIP6 (`tas`, Amon, r1i1p1f1), the ESGF archive mirrored to Google
Cloud (gs://cmip6, public, CC BY 4.0 since Oct 2022). This is the reproducible
route to the IPCC AR6 Interactive Atlas warming pattern; we compute the
ensemble mean ourselves rather than scraping the (bot-blocked) Atlas GUI.

Attribution: 'CMIP6 near-surface air temperature (tas), WCRP/ESGF, CC BY 4.0.
Multi-model mean computed from r1i1p1f1 members; we acknowledge the modelling
groups and the Earth System Grid Federation.'

Usage: python build_warming_patterns.py   (needs xarray, zarr, gcsfs, numpy, PIL)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / 'public' / 'earth'
CATALOG = 'https://storage.googleapis.com/cmip6/cmip6-zarr-consolidated-stores.csv'
SCENARIOS = {'ssp126': 'ssp1_26', 'ssp245': 'ssp2_45', 'ssp585': 'ssp5_85'}
MEMBER = 'r1i1p1f1'
MAX_MODELS = 12          # enough for a stable mean; keeps runtime/egress modest
WIDTH, HEIGHT = 1024, 512
BASELINE = slice('1995', '2014')
FUTURE = slice('2081', '2100')
GRID_LAT = np.linspace(89.5, -89.5, HEIGHT)
GRID_LON = np.linspace(-179.5, 179.5, WIDTH)


def open_store(zstore: str) -> xr.Dataset:
    return xr.open_zarr(zstore.replace('gs://', 'gcs://'), storage_options={'token': 'anon'}, consolidated=True)


def to_common_grid(field: xr.DataArray) -> np.ndarray:
    field = field.rename({field.dims[-2]: 'lat', field.dims[-1]: 'lon'})
    lon = ((field.lon + 180) % 360) - 180
    field = field.assign_coords(lon=lon).sortby('lon').sortby('lat')
    regridded = field.interp(lat=GRID_LAT[::-1], lon=GRID_LON, kwargs={'fill_value': None})
    return regridded.sortby('lat', ascending=False).values


def scenario_delta(catalog: pd.DataFrame, experiment: str) -> tuple[np.ndarray, list[str]]:
    hist = catalog[(catalog.experiment_id == 'historical')]
    fut = catalog[(catalog.experiment_id == experiment)]
    shared = sorted(set(hist.source_id) & set(fut.source_id))
    deltas, used = [], []
    for model in shared:
        if len(used) >= MAX_MODELS:
            break
        try:
            h = open_store(hist[hist.source_id == model].zstore.iloc[0]).tas
            f = open_store(fut[fut.source_id == model].zstore.iloc[0]).tas
            base = h.sel(time=BASELINE).mean('time')
            future = f.sel(time=FUTURE).mean('time')
            delta = to_common_grid(future) - to_common_grid(base)
            if np.isfinite(delta).mean() > 0.95:
                deltas.append(delta)
                used.append(model)
                print(f'  {experiment}: {model} ΔT_global={np.nanmean(delta):.2f}°C ({len(used)})')
        except Exception as exc:  # noqa: BLE001 — skip unreadable stores, keep going
            print(f'  {experiment}: skip {model} ({type(exc).__name__})')
    return np.nanmean(np.stack(deltas), axis=0), used


def main() -> None:
    catalog = pd.read_csv(CATALOG)
    catalog = catalog[(catalog.table_id == 'Amon') & (catalog.variable_id == 'tas') & (catalog.member_id == MEMBER)]
    index = {}
    # Fixed decode range so the three scenarios share one colour scale.
    vmin, vmax = -1.0, 12.0
    for experiment, key in SCENARIOS.items():
        mean_delta, used = scenario_delta(catalog, experiment)
        encoded = np.clip((mean_delta - vmin) / (vmax - vmin) * 255.0, 0, 255).astype(np.uint8)
        out_png = OUT_DIR / f'warming-pattern-{key}.png'
        Image.fromarray(encoded, mode='L').save(out_png, optimize=True)
        index[key] = {
            'file': out_png.name,
            'global_mean_delta_c': round(float(np.nanmean(mean_delta)), 3),
            'models': used,
            'model_count': len(used),
        }
        print(f'wrote {out_png} ({out_png.stat().st_size} bytes), {len(used)} models')
    (OUT_DIR / 'warming-patterns.json').write_text(json.dumps({
        'variable': 'tas (near-surface air temperature)',
        'delta': '2081-2100 minus 1995-2014, CMIP6 multi-model mean, member r1i1p1f1',
        'encode': {'vmin_c': vmin, 'vmax_c': vmax, 'formula': 'delta_c = vmin + pixel/255 * (vmax - vmin)'},
        'projection': 'equirectangular, lon -180..180 left-to-right, lat 90..-90 top-to-bottom',
        'source': 'CMIP6 via gs://cmip6 (ESGF mirror), CC BY 4.0',
        'scenarios': index,
    }, indent=2) + '\n')
    print('wrote warming-patterns.json')


if __name__ == '__main__':
    main()
