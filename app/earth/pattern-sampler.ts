// CPU-side sampler for the warming-pattern textures, mirroring the exact blend
// the globe shader performs (bracketing SSP textures → rescale to the target
// global warming). Used by region pins so a pinned city's "+X°C here" number is
// consistent with the colour on the globe. Honest by construction: it reads the
// same CMIP6-derived textures, not an invented function.

import { globalWarmingForYear, type ScenarioId } from './science';

const VMIN = -1.0;
const VMAX = 12.0;
const GLOBAL_MEAN: Record<ScenarioId, number> = { ssp1_26: 1.692, ssp2_45: 2.829, ssp5_85: 5.235 };
const ORDER: ScenarioId[] = ['ssp1_26', 'ssp2_45', 'ssp5_85'];
const SOURCES: Record<ScenarioId, string> = {
  ssp1_26: '/earth/warming-pattern-ssp1_26.png',
  ssp2_45: '/earth/warming-pattern-ssp2_45.png',
  ssp5_85: '/earth/warming-pattern-ssp5_85.png',
};

type Sampled = { width: number; height: number; data: Uint8ClampedArray };

const cache: Partial<Record<ScenarioId, Sampled>> = {};
let loading: Promise<void> | null = null;

function load(scenario: ScenarioId): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(image, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        cache[scenario] = { width: canvas.width, height: canvas.height, data };
      }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = SOURCES[scenario];
  });
}

export function ensurePatternsLoaded(): Promise<void> {
  if (loading) return loading;
  loading = Promise.all(ORDER.map(load)).then(() => undefined);
  return loading;
}

function sampleDelta(scenario: ScenarioId, lat: number, lon: number): number | null {
  const image = cache[scenario];
  if (!image) return null;
  const u = ((lon + 180) % 360) / 360;
  const v = (90 - lat) / 180;
  const px = Math.max(0, Math.min(image.width - 1, Math.floor(u * image.width)));
  const py = Math.max(0, Math.min(image.height - 1, Math.floor(v * image.height)));
  const r = image.data[(py * image.width + px) * 4];
  return VMIN + (r / 255) * (VMAX - VMIN);
}

// Local temperature change (°C) at a point, matching the globe's blend+rescale.
// Returns null until textures have loaded.
export function localWarmingAt(lat: number, lon: number, scenario: ScenarioId, year: number): number | null {
  const target = globalWarmingForYear(scenario, year).value;
  let lowIndex = 0;
  for (let i = 0; i < ORDER.length - 1; i += 1) if (target >= GLOBAL_MEAN[ORDER[i]]) lowIndex = i;
  const highIndex = Math.min(ORDER.length - 1, lowIndex + 1);
  const lowMean = GLOBAL_MEAN[ORDER[lowIndex]];
  const highMean = GLOBAL_MEAN[ORDER[highIndex]];
  const mix = highMean === lowMean ? 0 : Math.max(0, Math.min(1, (target - lowMean) / (highMean - lowMean)));
  const blendedMean = lowMean + (highMean - lowMean) * mix;
  const scale = blendedMean > 0.05 ? target / blendedMean : 0;
  const low = sampleDelta(ORDER[lowIndex], lat, lon);
  const high = sampleDelta(ORDER[highIndex], lat, lon);
  if (low === null || high === null) return null;
  return (low + (high - low) * mix) * scale;
}
