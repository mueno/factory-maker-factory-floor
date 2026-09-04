# TERRA data sources and licenses

TERRA ships derived visualization textures under `public/earth/`. The source
data are third-party scientific datasets, redistributed here in modified form
(regridded to equirectangular grids and encoded as PNG). Each keeps its own
license; this file records provenance and required attribution. Derivation
scripts live in `scripts/data/`.

## Warming patterns — `warming-pattern-ssp{1_26,2_45,5_85}.png` (+ `warming-patterns.json`)

- **What**: CMIP6 multi-model-mean near-surface air temperature change (`tas`),
  2081–2100 minus 1995–2014, per SSP, encoded as a grayscale ΔT field. The 3D
  globe blends the two bracketing scenario patterns and rescales them to the
  assessed (or, pre-2025, observed) global-mean warming — standard AR6
  pattern-scaling. Global means baked in: SSP1-2.6 ≈ 1.69 °C, SSP2-4.5 ≈ 2.83 °C,
  SSP5-8.5 ≈ 5.24 °C (12-model mean, member r1i1p1f1).
- **Source**: CMIP6 (`tas`, Amon), ESGF archive mirrored to Google Cloud
  (`gs://cmip6`). Built by `scripts/data/build_warming_patterns.py`.
- **License**: CC BY 4.0 (CMIP6 model output, re-licensed October 2022).
- **Attribution**: “CMIP6 near-surface air temperature (`tas`), WCRP/ESGF,
  CC BY 4.0. Multi-model mean computed from r1i1p1f1 members; we acknowledge the
  modelling groups and the Earth System Grid Federation.” This route reproduces
  the IPCC AR6 WGI Interactive Atlas warming pattern (Iturbide et al. 2022,
  doi:10.1038/s41597-022-01739-y, CC BY 4.0).

## Sea-ice decades — `nsidc-sea-ice-decades.png` (+ `.json`) and `nsidc-sea-ice-extent-2025-09.png`

- **What**: Observed September (annual-minimum) Arctic sea-ice extent, ≥15%
  concentration. The decades file packs 1980/2000/2010/2020 into R/G/B/A; the
  2025 mask ships separately. The globe blends between observed decades for
  years ≤2025 and contracts the 2025 edge illustratively beyond.
- **Source**: NSIDC Sea Ice Index v4 (G02135), September monthly extent
  polygons, via the NOAA@NSIDC HTTPS file system. Built by
  `scripts/data/build_sea_ice_decades.py`.
- **License**: NOAA@NSIDC open data; citation required as a condition of use.
- **Citation**: Fetterer, F., Knowles, K., Meier, W. N., Savoie, M.,
  Windnagel, A. K. & Stafford, T. (2025). *Sea Ice Index* (G02135, Version 4).
  NSIDC. https://doi.org/10.7265/a98x-0f50

## Coastal-zone glow — `coast-glow-2048.png` (+ `.json`)

- **What**: A distance-to-coast falloff field used for a coastal-zone emphasis
  glow whose intensity scales with assessed global mean sea-level rise. **Not**
  a sea-level, inundation, or flood dataset, and labelled as such in the UI.
- **Source**: Natural Earth 50m coastline. Built by
  `scripts/data/build_coast_glow.py`.
- **License**: Public domain. Optional credit: “Made with Natural Earth.”

## Ocean currents — `data/oscar-july-2014-streamlines.json`

- **What**: Open streamlines derived from OSCAR surface-current estimates,
  July 2014 mean of six 5-day composites.
- **Source**: OSCAR (NASA PO.DAAC is the canonical archive; the bundled sample
  averages the public NOAA CoastWatch mirror).
- **Attribution**: “Currents: OSCAR (NASA PO.DAAC), July 2014 mean.”

## Base imagery — `blue-marble-2048.png`, `black-marble-2016-3600.jpg`, `clouds-2048.jpg`, roughness/bump aids

- **Source**: NASA Blue Marble / Black Marble Earth imagery (NASA Earth
  Observatory). **License**: public domain (NASA imagery), with courtesy credit
  to NASA Earth Observatory. Roughness/bump aids are locally derived from the
  Blue Marble surface.

## SST (observed) — `noaa-oisst-v21-2026-08.png`

- **What**: Observed sea-surface temperature used by the SST emphasis in the
  coupled/currents context.
- **Source**: NOAA OISST v2.1 preliminary, August 2026 mean.
- **Citation/attribution**: NOAA OISST v2.1 (Huang et al.); NOAA open data.

---

All derived PNGs are modified from the sources above (regridded, normalized,
and encoded as textures). The application code is MIT-licensed; these data
files retain their own licenses as recorded here.
