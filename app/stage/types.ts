// Stage Runtime v2 — composable, typed micro-app definitions.
// Everything an agent can build is declared here; nothing executable is ever accepted.

export type StageTheme = 'aurora' | 'sunrise' | 'storybook' | 'noir' | 'meadow';
export type FieldType = 'text' | 'number' | 'select' | 'boolean';
export type FieldValue = string | number | boolean;

export const STAGE_THEMES: StageTheme[] = ['aurora', 'sunrise', 'storybook', 'noir', 'meadow'];

export const LIMITS = {
  collections: 4,
  fieldsPerCollection: 6,
  selectOptions: 8,
  views: 4,
  blocksPerView: 8,
  totalBlocks: 16,
  recordsPerCollection: 80,
  defaultRecordCap: 40,
  seedRecords: 12,
  statItems: 4,
  metaFields: 3,
  text: 120,
  label: 60,
  title: 72,
  body: 240,
  description: 220,
  sourceSummary: 280,
  numberMin: -1_000_000,
  numberMax: 1_000_000,
} as const;

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];        // select only, 2..8 entries
  min?: number;              // number only
  max?: number;              // number only
  defaultValue?: FieldValue; // used when add_record omits the field
};

export type CollectionSpec = {
  key: string;
  label: string;
  fields: FieldSpec[];
  maxRecords?: number;       // 1..80, default 40
  seeds?: Array<Record<string, FieldValue>>;
};

export type ComputedSpec = {
  op: 'count' | 'sum' | 'avg' | 'max' | 'percent_true' | 'percent_where';
  collection: string;
  field?: string;                                  // number field (sum/avg/max), boolean field (percent_true)
  where?: { field: string; equals: FieldValue };   // optional filter; required for percent_where
};

export type HeroBlock = { type: 'hero'; eyebrow: string; title: string; body: string };
export type NoteBlock = { type: 'note'; tone: 'info' | 'success' | 'warning'; title?: string; body: string };
export type FormBlock = { type: 'form'; collection: string; title?: string; submitLabel: string; fields?: string[] };
export type ListBlock = {
  type: 'list';
  collection: string;
  title?: string;
  titleField: string;
  metaFields?: string[];
  badgeField?: string;       // select field shown as a colored chip
  checkField?: string;       // boolean field toggled by tapping the row
  voteField?: string;        // number field incremented by a button
  voteLabel?: string;
  allowDelete?: boolean;
  sort?: { field: string; dir: 'asc' | 'desc' };
  limit?: number;
};
export type BoardBlock = {
  type: 'board';
  collection: string;
  title?: string;
  groupField: string;        // select field: one column per option
  cardTitleField: string;
  cardMetaField?: string;
  allowMove: boolean;
};
export type StatsBlock = { type: 'stats'; items: Array<{ label: string; compute: ComputedSpec; suffix?: string }> };
export type ProgressBlock = { type: 'progress'; label: string; compute: ComputedSpec };
export type ChartBlock = {
  type: 'chart';
  collection: string;
  title?: string;
  groupField: string;        // select field
  measure: 'count' | { sum: string };
};
export type LeaderboardBlock = {
  type: 'leaderboard';
  collection: string;
  title?: string;
  labelField: string;
  scoreField: string;
  limit?: number;
};

export type StageBlock =
  | HeroBlock
  | NoteBlock
  | FormBlock
  | ListBlock
  | BoardBlock
  | StatsBlock
  | ProgressBlock
  | ChartBlock
  | LeaderboardBlock;

export type ViewSpec = { key: string; label: string; blocks: StageBlock[] };

export type StageAction = 'add_record' | 'update_record' | 'delete_record' | 'toggle_field' | 'increment_field' | 'move_record';
export const ALL_STAGE_ACTIONS: StageAction[] = ['add_record', 'update_record', 'delete_record', 'toggle_field', 'increment_field', 'move_record'];

export type ServiceDefinition = {
  schemaVersion: 'factory-stage/v2';
  id: string;
  title: string;
  description: string;
  sourceSummary: string;
  theme: StageTheme;
  collections: CollectionSpec[];
  views: ViewSpec[];
  allowedActions: StageAction[];
};

export type StageRecord = { id: string; values: Record<string, FieldValue> };
export type StageState = {
  kind: 'v2';
  collections: Record<string, { seq: number; records: StageRecord[] }>;
};

export type StageCommand =
  | { action: 'add_record'; collection: string; values: Record<string, FieldValue> }
  | { action: 'update_record'; collection: string; record_id: string; values: Record<string, FieldValue> }
  | { action: 'delete_record'; collection: string; record_id: string }
  | { action: 'toggle_field'; collection: string; record_id: string; field: string }
  | { action: 'increment_field'; collection: string; record_id: string; field: string; by?: number }
  | { action: 'move_record'; collection: string; record_id: string; field: string; value: string };

export type StageEvent = {
  seq: number;
  type: 'click' | 'submit' | 'change' | 'system';
  action: string;
  detail: string;
  actor: 'human' | 'agent' | 'system';
  at: string;
};

export type ServicePatch = { title?: string; description?: string; theme?: StageTheme };

export type SharedStageSnapshot = {
  format: 'factory-stage-share/v2';
  definition: ServiceDefinition;
  state: StageState;
  outputHash: string;
};
