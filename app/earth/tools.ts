import type { EarthSceneState, LayerId, RegionId, RenderStyle, ScenarioId } from './science';

type JsonSchema = Record<string, unknown>;

export type EarthToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
};

export type ModelContext = {
  registerTool: (tool: EarthToolDefinition, options?: { signal?: AbortSignal }) => Promise<void>;
};

export type EarthToolHost = {
  read: () => unknown;
  focus: (region: RegionId, expectedRevision: number) => unknown;
  setLayer: (layer: LayerId, expectedRevision: number) => unknown;
  setScenario: (scenario: ScenarioId, year: number, expectedRevision: number) => unknown;
  setStyle: (style: RenderStyle, expectedRevision: number) => unknown;
  playStory: (story: NonNullable<EarthSceneState['story']>, expectedRevision: number) => unknown;
};

export const EARTH_TOOL_NAMES = [
  'earth_read_scene',
  'earth_focus_region',
  'earth_set_layer',
  'earth_set_scenario',
  'earth_set_render_style',
  'earth_play_story',
] as const;

const expectedRevision = {
  type: 'integer',
  minimum: 0,
  description: 'Revision returned by earth_read_scene. The write is rejected if the scene changed since you read it.',
};

function revision(input: Record<string, unknown>) {
  return Math.max(0, Number(input.expected_revision) || 0);
}

export function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null;
  const documentContext = (document as Document & { modelContext?: ModelContext }).modelContext;
  const navigatorContext = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  return documentContext ?? navigatorContext ?? null;
}

export function buildEarthTools(host: EarthToolHost): EarthToolDefinition[] {
  return [
    {
      name: 'earth_read_scene',
      title: 'Read the Earth scene',
      description: 'Read the camera focus, scientific layer, emissions scenario, year, render style, current measurements, uncertainty ranges, data provenance, and revision. Call this before changing the scene.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => host.read(),
    },
    {
      name: 'earth_focus_region',
      title: 'Fly to a region',
      description: 'Move the shared 3D globe camera to a scientifically relevant region. Use this instead of guessing screen coordinates. The human sees the same camera flight.',
      inputSchema: {
        type: 'object',
        properties: {
          region: { type: 'string', enum: ['global', 'arctic', 'north_atlantic', 'europe', 'japan'] },
          expected_revision: expectedRevision,
        },
        required: ['region', 'expected_revision'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => host.focus(input.region as RegionId, revision(input)),
    },
    {
      name: 'earth_set_layer',
      title: 'Change the scientific layer',
      description: 'Switch the visible evidence layer on the shared globe: assessed warming, observed Arctic sea ice, an AMOC projection, global mean sea level, or a coupled overview.',
      inputSchema: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: ['temperature', 'sea_ice', 'currents', 'sea_level', 'coupled'] },
          expected_revision: expectedRevision,
        },
        required: ['layer', 'expected_revision'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => host.setLayer(input.layer as LayerId, revision(input)),
    },
    {
      name: 'earth_set_scenario',
      title: 'Set an IPCC scenario and year',
      description: 'Set one assessed IPCC AR6 emissions scenario and a year from 2030 to 2100. The page displays assessment ranges and marks reduced-order interpolation rather than presenting it as a regional forecast.',
      inputSchema: {
        type: 'object',
        properties: {
          scenario: { type: 'string', enum: ['ssp1_26', 'ssp2_45', 'ssp5_85'] },
          year: { type: 'integer', minimum: 2030, maximum: 2100 },
          expected_revision: expectedRevision,
        },
        required: ['scenario', 'year', 'expected_revision'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => host.setScenario(input.scenario as ScenarioId, Math.round(Number(input.year)), revision(input)),
    },
    {
      name: 'earth_set_render_style',
      title: 'Change how the evidence is presented',
      description: 'Change presentation without changing the underlying values. Scientific emphasizes guides, cinematic emphasizes spatial motion, and storybook increases contrast and plain-language labels.',
      inputSchema: {
        type: 'object',
        properties: {
          style: { type: 'string', enum: ['scientific', 'cinematic', 'storybook'] },
          expected_revision: expectedRevision,
        },
        required: ['style', 'expected_revision'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => host.setStyle(input.style as RenderStyle, revision(input)),
    },
    {
      name: 'earth_play_story',
      title: 'Play a guided Earth story',
      description: 'Start a short, interruptible camera-and-layer sequence. arctic_amoc_europe follows observed sea-ice loss into the assessed AMOC weakening range; sea_level compares IPCC global mean sea-level ranges without claiming local inundation.',
      inputSchema: {
        type: 'object',
        properties: {
          story: { type: 'string', enum: ['arctic_amoc_europe', 'sea_level'] },
          expected_revision: expectedRevision,
        },
        required: ['story', 'expected_revision'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => host.playStory(input.story as NonNullable<EarthSceneState['story']>, revision(input)),
    },
  ];
}
