// Stage Runtime v2 engine: deterministic state transitions and computed metrics.
// Every mutation goes through applyCommand; the UI and the browser agent share one path.

import { LIMITS, type CollectionSpec, type ComputedSpec, type FieldSpec, type FieldValue, type ServiceDefinition, type StageCommand, type StageState } from './types';

const controlPattern = /[\u0000-\u001f\u007f]/g;

export function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').replace(controlPattern, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function collectionOf(definition: ServiceDefinition, key: string): CollectionSpec | null {
  return definition.collections.find((collection) => collection.key === key) ?? null;
}

function fieldOf(spec: CollectionSpec, key: string): FieldSpec | null {
  return spec.fields.find((field) => field.key === key) ?? null;
}

function clampNumber(field: FieldSpec, value: number) {
  const min = field.min ?? LIMITS.numberMin;
  const max = field.max ?? LIMITS.numberMax;
  return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}

function coerceValue(field: FieldSpec, raw: unknown): { ok: true; value: FieldValue } | { ok: false; error: string } {
  if (field.type === 'boolean') {
    if (typeof raw !== 'boolean') return { ok: false, error: `field '${field.key}' expects a boolean` };
    return { ok: true, value: raw };
  }
  if (field.type === 'number') {
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(parsed)) return { ok: false, error: `field '${field.key}' expects a number` };
    return { ok: true, value: clampNumber(field, parsed) };
  }
  const text = cleanText(raw, LIMITS.text);
  if (field.type === 'select') {
    if (!(field.options ?? []).includes(text)) return { ok: false, error: `field '${field.key}' must be one of: ${(field.options ?? []).join(', ')}` };
    return { ok: true, value: text };
  }
  return { ok: true, value: text };
}

function defaultValue(field: FieldSpec): FieldValue {
  if (field.defaultValue !== undefined) {
    const coerced = coerceValue(field, field.defaultValue);
    if (coerced.ok) return coerced.value;
  }
  if (field.type === 'boolean') return false;
  if (field.type === 'number') return clampNumber(field, 0);
  if (field.type === 'select') return (field.options ?? [''])[0];
  return '';
}

export function createInitialState(definition: ServiceDefinition): StageState {
  const collections: StageState['collections'] = {};
  for (const spec of definition.collections) {
    const records = (spec.seeds ?? []).slice(0, spec.maxRecords ?? LIMITS.defaultRecordCap).map((seed, index) => {
      const values: Record<string, FieldValue> = {};
      for (const field of spec.fields) {
        const raw = seed[field.key];
        const coerced = raw === undefined ? null : coerceValue(field, raw);
        values[field.key] = coerced && coerced.ok ? coerced.value : defaultValue(field);
      }
      return { id: `${spec.key}-${index + 1}`, values };
    });
    collections[spec.key] = { seq: records.length, records };
  }
  return { kind: 'v2', collections };
}

export type CommandResult = { ok: true; state: StageState; detail: string } | { ok: false; error: string };

export function applyCommand(definition: ServiceDefinition, state: StageState, command: StageCommand): CommandResult {
  if (!definition.allowedActions.includes(command.action)) return { ok: false, error: `action '${command.action}' is not allowed by this service` };
  const spec = collectionOf(definition, command.collection);
  if (!spec) return { ok: false, error: `collection '${command.collection}' does not exist` };
  const bucket = state.collections[command.collection];
  if (!bucket) return { ok: false, error: `state for collection '${command.collection}' is missing` };

  const replaceBucket = (records: StageState['collections'][string]['records'], seq = bucket.seq): StageState => ({
    kind: 'v2',
    collections: { ...state.collections, [command.collection]: { seq, records } },
  });

  if (command.action === 'add_record') {
    const cap = spec.maxRecords ?? LIMITS.defaultRecordCap;
    if (bucket.records.length >= cap) return { ok: false, error: `collection '${spec.key}' is full (${cap} records)` };
    const input = command.values ?? {};
    const values: Record<string, FieldValue> = {};
    for (const field of spec.fields) {
      if (input[field.key] === undefined) { values[field.key] = defaultValue(field); continue; }
      const coerced = coerceValue(field, input[field.key]);
      if (!coerced.ok) return { ok: false, error: coerced.error };
      values[field.key] = coerced.value;
    }
    for (const key of Object.keys(input)) if (!fieldOf(spec, key)) return { ok: false, error: `unknown field '${key}' for collection '${spec.key}'` };
    const firstText = spec.fields.find((field) => field.type === 'text');
    if (firstText && !cleanText(values[firstText.key], LIMITS.text)) return { ok: false, error: `field '${firstText.key}' must not be empty` };
    const seq = bucket.seq + 1;
    const record = { id: `${spec.key}-${seq}`, values };
    const title = firstText ? String(values[firstText.key]) : record.id;
    return { ok: true, state: replaceBucket([...bucket.records, record], seq), detail: `Added '${title}' to ${spec.label}.` };
  }

  const record = bucket.records.find((item) => item.id === (command as { record_id?: string }).record_id);
  if (!record) return { ok: false, error: `record '${String((command as { record_id?: string }).record_id)}' was not found in '${spec.key}'` };

  if (command.action === 'delete_record') {
    return { ok: true, state: replaceBucket(bucket.records.filter((item) => item.id !== record.id)), detail: `Removed ${record.id} from ${spec.label}.` };
  }

  if (command.action === 'update_record') {
    const updates: Record<string, FieldValue> = {};
    for (const [key, raw] of Object.entries(command.values ?? {})) {
      const field = fieldOf(spec, key);
      if (!field) return { ok: false, error: `unknown field '${key}' for collection '${spec.key}'` };
      const coerced = coerceValue(field, raw);
      if (!coerced.ok) return { ok: false, error: coerced.error };
      updates[key] = coerced.value;
    }
    if (!Object.keys(updates).length) return { ok: false, error: 'update_record requires at least one field in values' };
    const records = bucket.records.map((item) => item.id === record.id ? { ...item, values: { ...item.values, ...updates } } : item);
    return { ok: true, state: replaceBucket(records), detail: `Updated ${Object.keys(updates).join(', ')} on ${record.id}.` };
  }

  if (command.action === 'toggle_field') {
    const field = fieldOf(spec, command.field);
    if (!field || field.type !== 'boolean') return { ok: false, error: `field '${command.field}' must be a boolean field of '${spec.key}'` };
    const next = !record.values[field.key];
    const records = bucket.records.map((item) => item.id === record.id ? { ...item, values: { ...item.values, [field.key]: next } } : item);
    return { ok: true, state: replaceBucket(records), detail: `${record.id}.${field.key} → ${String(next)}.` };
  }

  if (command.action === 'increment_field') {
    const field = fieldOf(spec, command.field);
    if (!field || field.type !== 'number') return { ok: false, error: `field '${command.field}' must be a number field of '${spec.key}'` };
    const by = command.by === undefined ? 1 : Number(command.by);
    if (!Number.isFinite(by) || by === 0 || Math.abs(by) > 100) return { ok: false, error: 'by must be a non-zero number within ±100' };
    const next = clampNumber(field, Number(record.values[field.key] ?? 0) + by);
    const records = bucket.records.map((item) => item.id === record.id ? { ...item, values: { ...item.values, [field.key]: next } } : item);
    return { ok: true, state: replaceBucket(records), detail: `${record.id}.${field.key} → ${next}.` };
  }

  const field = fieldOf(spec, command.field);
  if (!field || field.type !== 'select') return { ok: false, error: `field '${command.field}' must be a select field of '${spec.key}'` };
  const target = cleanText(command.value, LIMITS.text);
  if (!(field.options ?? []).includes(target)) return { ok: false, error: `value must be one of: ${(field.options ?? []).join(', ')}` };
  const records = bucket.records.map((item) => item.id === record.id ? { ...item, values: { ...item.values, [field.key]: target } } : item);
  return { ok: true, state: replaceBucket(records), detail: `${record.id} moved to '${target}'.` };
}

function matches(record: { values: Record<string, FieldValue> }, where?: ComputedSpec['where']) {
  if (!where) return true;
  return record.values[where.field] === where.equals;
}

export function evaluateComputed(compute: ComputedSpec, state: StageState): number {
  const bucket = state.collections[compute.collection];
  if (!bucket) return 0;
  const all = bucket.records;
  const filtered = all.filter((record) => matches(record, compute.where));
  if (compute.op === 'count') return filtered.length;
  if (compute.op === 'percent_where') return all.length ? Math.round((filtered.length / all.length) * 100) : 0;
  if (compute.op === 'percent_true') {
    const key = compute.field ?? '';
    return filtered.length ? Math.round((filtered.filter((record) => record.values[key] === true).length / filtered.length) * 100) : 0;
  }
  const key = compute.field ?? '';
  const numbers = filtered.map((record) => Number(record.values[key] ?? 0)).filter((value) => Number.isFinite(value));
  if (compute.op === 'sum') return Math.round(numbers.reduce((sum, value) => sum + value, 0) * 100) / 100;
  if (compute.op === 'avg') return numbers.length ? Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 100) / 100 : 0;
  return numbers.length ? Math.max(...numbers) : 0;
}

export function stageSummary(definition: ServiceDefinition, state: StageState) {
  const collections: Record<string, { label: string; count: number; cap: number }> = {};
  for (const spec of definition.collections) {
    collections[spec.key] = {
      label: spec.label,
      count: state.collections[spec.key]?.records.length ?? 0,
      cap: spec.maxRecords ?? LIMITS.defaultRecordCap,
    };
  }
  const metrics: Array<{ label: string; value: number; suffix?: string }> = [];
  for (const view of definition.views) {
    for (const block of view.blocks) {
      if (block.type === 'stats') for (const item of block.items) metrics.push({ label: item.label, value: evaluateComputed(item.compute, state), suffix: item.suffix });
      if (block.type === 'progress') metrics.push({ label: block.label, value: evaluateComputed(block.compute, state), suffix: '%' });
      if (metrics.length >= 6) break;
    }
    if (metrics.length >= 6) break;
  }
  const leaders: Array<{ label: string; score: number }> = [];
  for (const view of definition.views) {
    for (const block of view.blocks) {
      if (block.type !== 'leaderboard') continue;
      const bucket = state.collections[block.collection];
      const top = [...(bucket?.records ?? [])].sort((left, right) => Number(right.values[block.scoreField] ?? 0) - Number(left.values[block.scoreField] ?? 0))[0];
      if (top) leaders.push({ label: String(top.values[block.labelField] ?? top.id), score: Number(top.values[block.scoreField] ?? 0) });
    }
  }
  return { schema: 'factory-stage/v2', title: definition.title, views: definition.views.map((view) => view.key), collections, metrics, leaders: leaders.slice(0, 3) };
}

export function recordsOf(state: StageState, collection: string) {
  return state.collections[collection]?.records ?? [];
}
