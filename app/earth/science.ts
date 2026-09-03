export type ScenarioId = 'ssp1_26' | 'ssp2_45' | 'ssp5_85';
export type RegionId = 'global' | 'arctic' | 'north_atlantic' | 'europe' | 'japan';
export type LayerId = 'temperature' | 'sea_ice' | 'currents' | 'sea_level' | 'coupled';
export type RenderStyle = 'scientific' | 'cinematic' | 'storybook';

export type EarthSceneState = {
  revision: number;
  region: RegionId;
  layer: LayerId;
  scenario: ScenarioId;
  year: number;
  style: RenderStyle;
  story: 'arctic_amoc_europe' | 'sea_level' | null;
  lastAction: string;
};

type Range = { best: number; low: number; high: number };
type AmocEstimate = {
  best: number;
  low: null;
  high: null;
  basis: 'scenario-specific CMIP6 ensemble mean with linear reduced-order interpolation';
};

export const SCIENCE_SOURCES = [
  {
    id: 'ipcc-temperature',
    label: 'IPCC AR6 WGI, Chapter 4 — global surface temperature projections',
    href: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-4/',
  },
  {
    id: 'ipcc-ocean',
    label: 'IPCC AR6 WGI — sea level and Arctic sea-ice assessment',
    href: 'https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/',
  },
  {
    id: 'nsidc-sea-ice',
    label: 'NSIDC Sea Ice Index v4 — September Arctic extent',
    href: 'https://nsidc.org/data/seaice_index/',
  },
  {
    id: 'noaa-amoc',
    label: 'NOAA repository — Weijer et al. (2020), CMIP6 AMOC projections',
    href: 'https://repository.library.noaa.gov/view/noaa/30634',
  },
  {
    id: 'oscar-currents',
    label: 'OSCAR surface currents — July 2014 mean from six composites (NOAA CoastWatch mirror; NASA PO.DAAC archive)',
    href: 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplOscar.html',
  },
  {
    id: 'noaa-oisst',
    label: 'NOAA OISST v2.1 preliminary — August 2026 mean of 30 available daily fields',
    href: 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21NrtAgg.html',
  },
] as const;

export const REGIONS: Record<RegionId, { label: { en: string; ja: string }; lat: number; lon: number; distance: number }> = {
  global: { label: { en: 'Whole Earth', ja: '地球全体' }, lat: 18, lon: 0, distance: 5.8 },
  arctic: { label: { en: 'Arctic Ocean', ja: '北極海' }, lat: 78, lon: -35, distance: 4.25 },
  north_atlantic: { label: { en: 'North Atlantic', ja: '北大西洋' }, lat: 48, lon: -35, distance: 4.15 },
  europe: { label: { en: 'Northern Europe', ja: '北ヨーロッパ' }, lat: 55, lon: 10, distance: 4.05 },
  japan: { label: { en: 'Japan', ja: '日本周辺' }, lat: 36, lon: 139, distance: 2.8 },
};

export const SCENARIOS: Record<ScenarioId, {
  label: string;
  name: { en: string; ja: string };
  temperature: { near: Range; mid: Range; long: Range };
  seaLevel2100: Range;
}> = {
  // Temperature central estimates and very likely ranges: IPCC AR6 WGI
  // Table SPM.1. Global mean sea-level medians and likely ranges for 2100,
  // relative to 1995–2014: IPCC AR6 WGI Table 9.9.
  ssp1_26: {
    label: 'SSP1-2.6',
    name: { en: 'Low emissions', ja: '低排出' },
    temperature: {
      near: { best: 1.5, low: 1.2, high: 1.8 },
      mid: { best: 1.7, low: 1.3, high: 2.2 },
      long: { best: 1.8, low: 1.3, high: 2.4 },
    },
    seaLevel2100: { best: 0.44, low: 0.32, high: 0.62 },
  },
  ssp2_45: {
    label: 'SSP2-4.5',
    name: { en: 'Intermediate emissions', ja: '中間排出' },
    temperature: {
      near: { best: 1.5, low: 1.2, high: 1.8 },
      mid: { best: 2.0, low: 1.6, high: 2.5 },
      long: { best: 2.7, low: 2.1, high: 3.5 },
    },
    seaLevel2100: { best: 0.56, low: 0.44, high: 0.76 },
  },
  ssp5_85: {
    label: 'SSP5-8.5',
    name: { en: 'Very high emissions', ja: '非常に高い排出' },
    temperature: {
      near: { best: 1.6, low: 1.3, high: 1.9 },
      mid: { best: 2.4, low: 1.9, high: 3.0 },
      long: { best: 4.4, low: 3.3, high: 5.7 },
    },
    seaLevel2100: { best: 0.77, low: 0.63, high: 1.01 },
  },
};

export const SEA_ICE_OBSERVATIONS = {
  baseline: { year: 1979, extent: 7.05 },
  latest: { year: 2025, extent: 4.75 },
  unit: 'million km²',
  threshold: 1,
} as const;

// Multi-model CMIP6 mean AMOC decline by 2100: Weijer et al. (2020),
// DOI 10.1029/2019GL086075. The paper reports 24% for SSP1-2.6,
// 29% for SSP2-4.5, and 39% for SSP5-8.5. These are scenario-specific
// ensemble means, not the endpoints of an assessed uncertainty interval.
export const AMOC_2100_BY_SCENARIO: Record<ScenarioId, number> = {
  ssp1_26: 24,
  ssp2_45: 29,
  ssp5_85: 39,
};

function interpolateRange(a: Range, b: Range, t: number): Range {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    best: a.best + (b.best - a.best) * clamped,
    low: a.low + (b.low - a.low) * clamped,
    high: a.high + (b.high - a.high) * clamped,
  };
}

export function temperatureForYear(scenario: ScenarioId, year: number): Range & { period: string } {
  const data = SCENARIOS[scenario].temperature;
  if (year <= 2040) return { ...data.near, period: '2021–2040' };
  if (year <= 2060) return { ...data.mid, period: '2041–2060' };
  if (year >= 2081) return { ...data.long, period: '2081–2100' };
  return { ...interpolateRange(data.mid, data.long, (year - 2060) / 21), period: 'interpolated between IPCC assessment windows' };
}

export function seaLevelForYear(scenario: ScenarioId, year: number): Range {
  const endpoint = SCENARIOS[scenario].seaLevel2100;
  // Transparent reduced-order interpolation from the midpoint of the IPCC
  // 1995–2014 reference period. This is not a replacement for a regional model.
  const progress = Math.max(0, Math.min(1, (year - 2005) / 95));
  return {
    best: endpoint.best * progress,
    low: endpoint.low * progress,
    high: endpoint.high * progress,
  };
}

export function amocForYear(scenario: ScenarioId, year: number): AmocEstimate {
  const progress = Math.max(0, Math.min(1, (year - 2025) / 75));
  return {
    best: AMOC_2100_BY_SCENARIO[scenario] * progress,
    low: null,
    high: null,
    basis: 'scenario-specific CMIP6 ensemble mean with linear reduced-order interpolation',
  };
}

export function illustrativeSeaIceForYear(year: number) {
  if (year <= SEA_ICE_OBSERVATIONS.latest.year) {
    const progress = Math.max(0, Math.min(1, (year - SEA_ICE_OBSERVATIONS.baseline.year) /
      (SEA_ICE_OBSERVATIONS.latest.year - SEA_ICE_OBSERVATIONS.baseline.year)));
    return {
      extent: SEA_ICE_OBSERVATIONS.baseline.extent +
        (SEA_ICE_OBSERVATIONS.latest.extent - SEA_ICE_OBSERVATIONS.baseline.extent) * progress,
      basis: 'linear display between NSIDC observations',
    };
  }
  const progress = Math.max(0, Math.min(1, (year - SEA_ICE_OBSERVATIONS.latest.year) / 25));
  return {
    extent: SEA_ICE_OBSERVATIONS.latest.extent +
      (SEA_ICE_OBSERVATIONS.threshold - SEA_ICE_OBSERVATIONS.latest.extent) * progress,
    basis: 'illustrative path to the IPCC practically ice-free threshold; not a year-specific forecast',
  };
}

export function createInitialScene(): EarthSceneState {
  return {
    revision: 0,
    region: 'global',
    layer: 'coupled',
    scenario: 'ssp2_45',
    year: 2050,
    style: 'cinematic',
    story: null,
    lastAction: 'scene_initialized',
  };
}

export function sceneScience(scene: EarthSceneState) {
  return {
    temperature: temperatureForYear(scene.scenario, scene.year),
    seaLevel: seaLevelForYear(scene.scenario, scene.year),
    amocDecline: amocForYear(scene.scenario, scene.year),
    seaIce: SEA_ICE_OBSERVATIONS,
    seaIceDisplay: illustrativeSeaIceForYear(scene.year),
    seaIceThresholdCase: scene.year >= 2050,
  };
}
