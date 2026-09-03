# TERRA visual upgrade verification — 2026-09-04

This document records the evidence and scientific boundary for the V1–V4 Earth-rendering upgrade. It supplements `docs/AUDIT-2026-09-04.md`; the six WebMCP tool signatures and revision-based optimistic locking remain unchanged.

| Stage | Status | Implementation | Evidence |
| --- | --- | --- | --- |
| V1 — Earth surface | Complete | NASA Blue Marble day surface, Black Marble night lights, locally derived visual roughness/bump aids, and a cloud shell at 1.005× radius. The terminator is a fixed presentation light, not real-time solar position. | `docs/evidence/2026-09-04/visual-v1-global.png` |
| V2 — Ocean currents | Complete | 1,680 animated open streak segments generated from ten OSCAR-derived streamlines. The bundled sample averages six July 2014 five-day composites from the public NOAA CoastWatch mirror; NASA PO.DAAC is the canonical archive. | `docs/evidence/2026-09-04/visual-v2-japan-currents.png`, `visual-final-japan-currents.png` |
| V3 — Atmosphere and light | Complete | Two Fresnel-style atmosphere shells, ACES tone mapping, and a half-density UnrealBloomPass with restrained 0.40–0.42 strength. | `docs/evidence/2026-09-04/visual-v3-global-bloom.png` |
| V4 — Scientific textures | Complete | NOAA OISST v2.1 preliminary August 2026 mean and NSIDC September 2025 sea-ice extent mask. Missing SST cells remain transparent; future sea-ice contraction is explicitly illustrative. | `docs/evidence/2026-09-04/visual-v4-global-sst.png`, `visual-v4-arctic-sea-ice.png` |

## Final regression evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Whole-Earth photographic surface | Passed | `docs/evidence/2026-09-04/visual-final-global.png` |
| Japan focus and open Kuroshio streamline | Passed. Japan is centred with north kept visually upward; no closed return arc or dotted placeholder row is rendered. | `docs/evidence/2026-09-04/visual-final-japan-currents.png` |
| Arctic 2100 disclosure | Passed. The NSIDC-based shape is visible and the badge reads `説明用表示`. | `docs/evidence/2026-09-04/visual-final-arctic-sea-ice-2100.png` |

## Bundled asset budget

The files under `public/earth/` total 4,811,865 bytes. Every individual asset is below 4 MB and the complete set is below 15 MB. Source URLs, roles, derivation scripts, and licensing notes are listed in the README asset table.
