// Machine-readable authoring guide for browser agents.
// Served by the read_runtime_guide WebMCP tool so an agent can design a full
// factory-stage/v2 definition instead of settling for a preset.

import { ALL_STAGE_ACTIONS, LIMITS, STAGE_THEMES } from './types';

export const RUNTIME_GUIDE = {
  schema_version: 'factory-stage/v2',
  overview: [
    'A service definition is declarative data: collections (typed records) + views (blocks). No HTML, no JavaScript, no URLs.',
    'Humans and the browser agent mutate the same state through allowlisted commands; every write needs the current expected_revision.',
    'Design real software: multiple views, live stats, and seeded example records make the result feel finished.',
  ],
  limits: LIMITS,
  themes: STAGE_THEMES,
  actions: ALL_STAGE_ACTIONS,
  definition_shape: {
    schemaVersion: 'factory-stage/v2',
    id: 'safe id, e.g. service-myapp',
    title: '≤72 chars', description: '≤220 chars', sourceSummary: '≤280 chars (the human brief)',
    theme: 'aurora | sunrise | storybook | noir | meadow',
    collections: '[1..4] { key, label, fields: [1..6], maxRecords?, seeds?: [≤12] }',
    views: '[1..4] { key, label ≤24, blocks: [1..8] } (≤16 blocks total)',
    allowedActions: 'non-empty subset of actions',
  },
  field_types: {
    text: '{ key, label, type: "text", defaultValue? } — values ≤120 chars',
    number: '{ key, label, type: "number", min?, max?, defaultValue? }',
    select: '{ key, label, type: "select", options: [2..8 strings], defaultValue? }',
    boolean: '{ key, label, type: "boolean", defaultValue? }',
  },
  blocks: {
    hero: '{ type: "hero", eyebrow, title, body } — put one at the top of the first view',
    note: '{ type: "note", tone: info|success|warning, title?, body }',
    form: '{ type: "form", collection, title?, submitLabel, fields?: [keys] } — humans add records here',
    list: '{ type: "list", collection, title?, titleField(text), metaFields?: [≤3], badgeField?(select), checkField?(boolean: tap toggles), voteField?(number: button increments), voteLabel?, allowDelete?, sort?: {field, dir}, limit? }',
    board: '{ type: "board", collection, title?, groupField(select: one column per option), cardTitleField(text), cardMetaField?, allowMove } — a kanban',
    stats: '{ type: "stats", items: [1..4] { label, compute, suffix? } }',
    progress: '{ type: "progress", label, compute } — compute must be percent_true or percent_where',
    chart: '{ type: "chart", collection, title?, groupField(select), measure: "count" | { sum: numberField } } — horizontal bars',
    leaderboard: '{ type: "leaderboard", collection, title?, labelField(text), scoreField(number), limit? ≤10 }',
  },
  compute: '{ op: count|sum|avg|max|percent_true|percent_where, collection, field?, where?: { field, equals } }',
  commands: {
    add_record: '{ action, collection, values: { fieldKey: value } } — first text field must be non-empty',
    update_record: '{ action, collection, record_id, values }',
    delete_record: '{ action, collection, record_id }',
    toggle_field: '{ action, collection, record_id, field(boolean) }',
    increment_field: '{ action, collection, record_id, field(number), by?: ±1..100 }',
    move_record: '{ action, collection, record_id, field(select), value }',
  },
  authoring_tips: [
    'Match the user brief and its language: Japanese briefs deserve Japanese labels throughout.',
    'Two views beat one: an interaction view plus an insight view (stats + chart or leaderboard).',
    'Seed 2-4 example records so the first paint is alive, and wire stats/chart to fields users actually change.',
    'If render_service rejects the definition, fix exactly what each error path says and retry once.',
  ],
} as const;
