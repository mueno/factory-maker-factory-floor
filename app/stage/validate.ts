// Stage Runtime v2 validation.
// validateDefinition returns human-readable errors so a browser agent can self-correct
// an authored definition instead of guessing why it was rejected.

import {
  ALL_STAGE_ACTIONS,
  LIMITS,
  STAGE_THEMES,
  type CollectionSpec,
  type ComputedSpec,
  type FieldSpec,
  type FieldValue,
  type ServiceDefinition,
  type StageAction,
  type StageBlock,
  type StageState,
  type StageTheme,
} from './types';

const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
const safeKeyPattern = /^[a-z][a-z0-9_-]{0,39}$/;
const safeIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function hasForbiddenKey(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Object.keys(value).some((key) => forbiddenKeys.has(key))) return true;
  return Object.values(value).some((nested) => hasForbiddenKey(nested, seen));
}

function isSafeText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  if (typeof value !== 'string' || value.length > maxLength || (!allowEmpty && value.trim().length === 0)) return false;
  return !/[\u0000-\u001f\u007f]/.test(value);
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value) && value >= LIMITS.numberMin && value <= LIMITS.numberMax;
  return isSafeText(value, LIMITS.text, true);
}

type Ctx = { errors: string[] };

function fail(ctx: Ctx, path: string, message: string) {
  if (ctx.errors.length < 24) ctx.errors.push(`${path}: ${message}`);
  return false;
}

function validateField(ctx: Ctx, path: string, value: unknown): value is FieldSpec {
  if (!isRecord(value)) return fail(ctx, path, 'field must be an object');
  if (!safeKeyPattern.test(String(value.key))) return fail(ctx, path, 'key must match ^[a-z][a-z0-9_-]{0,39}$');
  if (!isSafeText(value.label, LIMITS.label)) return fail(ctx, path, `label must be 1..${LIMITS.label} plain characters`);
  if (value.type !== 'text' && value.type !== 'number' && value.type !== 'select' && value.type !== 'boolean') return fail(ctx, path, 'type must be text | number | select | boolean');
  if (value.type === 'select') {
    if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > LIMITS.selectOptions) return fail(ctx, path, `select needs 2..${LIMITS.selectOptions} options`);
    if (!value.options.every((option) => isSafeText(option, LIMITS.label))) return fail(ctx, path, 'every option must be short plain text');
    if (new Set(value.options).size !== value.options.length) return fail(ctx, path, 'options must be unique');
  } else if (value.options !== undefined) return fail(ctx, path, 'options is only allowed on select fields');
  if (value.type === 'number') {
    for (const bound of ['min', 'max'] as const) {
      if (value[bound] !== undefined && (typeof value[bound] !== 'number' || !Number.isFinite(value[bound]) || Number(value[bound]) < LIMITS.numberMin || Number(value[bound]) > LIMITS.numberMax)) return fail(ctx, path, `${bound} must be a finite number within ±1,000,000`);
    }
    if (value.min !== undefined && value.max !== undefined && Number(value.min) > Number(value.max)) return fail(ctx, path, 'min must not exceed max');
  } else if (value.min !== undefined || value.max !== undefined) return fail(ctx, path, 'min/max are only allowed on number fields');
  if (value.defaultValue !== undefined && !isFieldValue(value.defaultValue)) return fail(ctx, path, 'defaultValue must be a short text, bounded number, or boolean');
  return true;
}

function validateCollection(ctx: Ctx, path: string, value: unknown): value is CollectionSpec {
  if (!isRecord(value)) return fail(ctx, path, 'collection must be an object');
  if (!safeKeyPattern.test(String(value.key))) return fail(ctx, path, 'key must match ^[a-z][a-z0-9_-]{0,39}$');
  if (!isSafeText(value.label, LIMITS.label)) return fail(ctx, path, `label must be 1..${LIMITS.label} plain characters`);
  if (!Array.isArray(value.fields) || value.fields.length < 1 || value.fields.length > LIMITS.fieldsPerCollection) return fail(ctx, path, `needs 1..${LIMITS.fieldsPerCollection} fields`);
  let ok = true;
  value.fields.forEach((field, index) => { if (!validateField(ctx, `${path}.fields[${index}]`, field)) ok = false; });
  if (ok && new Set((value.fields as FieldSpec[]).map((field) => field.key)).size !== value.fields.length) return fail(ctx, path, 'field keys must be unique');
  if (value.maxRecords !== undefined && (!Number.isInteger(value.maxRecords) || Number(value.maxRecords) < 1 || Number(value.maxRecords) > LIMITS.recordsPerCollection)) return fail(ctx, path, `maxRecords must be 1..${LIMITS.recordsPerCollection}`);
  if (value.seeds !== undefined) {
    if (!Array.isArray(value.seeds) || value.seeds.length > LIMITS.seedRecords) return fail(ctx, path, `seeds must be an array of at most ${LIMITS.seedRecords} records`);
    for (const [index, seed] of value.seeds.entries()) {
      if (!isRecord(seed) || !Object.values(seed).every(isFieldValue)) return fail(ctx, `${path}.seeds[${index}]`, 'seed values must be short text, bounded numbers, or booleans');
    }
  }
  return ok;
}

type FieldLookup = Map<string, Map<string, FieldSpec>>;

function fieldOf(lookup: FieldLookup, collection: string, field: string | undefined) {
  if (!field) return undefined;
  return lookup.get(collection)?.get(field);
}

function requireField(ctx: Ctx, path: string, lookup: FieldLookup, collection: string, field: unknown, types: FieldSpec['type'][], what: string) {
  if (typeof field !== 'string') return fail(ctx, path, `${what} must name a field of '${collection}'`);
  const spec = fieldOf(lookup, collection, field);
  if (!spec) return fail(ctx, path, `${what} '${field}' does not exist in collection '${collection}'`);
  if (!types.includes(spec.type)) return fail(ctx, path, `${what} '${field}' must be a ${types.join(' or ')} field`);
  return true;
}

export function validateComputed(ctx: Ctx, path: string, lookup: FieldLookup, value: unknown): value is ComputedSpec {
  if (!isRecord(value)) return fail(ctx, path, 'compute must be an object');
  const ops = ['count', 'sum', 'avg', 'max', 'percent_true', 'percent_where'];
  if (!ops.includes(String(value.op))) return fail(ctx, path, `op must be one of ${ops.join(', ')}`);
  if (typeof value.collection !== 'string' || !lookup.has(value.collection)) return fail(ctx, path, `collection '${String(value.collection)}' does not exist`);
  const collection = value.collection;
  if (value.op === 'sum' || value.op === 'avg' || value.op === 'max') {
    if (!requireField(ctx, path, lookup, collection, value.field, ['number'], 'field')) return false;
  } else if (value.op === 'percent_true') {
    if (!requireField(ctx, path, lookup, collection, value.field, ['boolean'], 'field')) return false;
  } else if (value.field !== undefined) return fail(ctx, path, `op '${String(value.op)}' does not take a field`);
  if (value.op === 'percent_where' && value.where === undefined) return fail(ctx, path, 'percent_where requires a where filter');
  if (value.where !== undefined) {
    if (!isRecord(value.where) || !isFieldValue(value.where.equals)) return fail(ctx, path, 'where must be { field, equals }');
    if (!requireField(ctx, path, lookup, collection, value.where.field, ['text', 'number', 'select', 'boolean'], 'where.field')) return false;
  }
  return true;
}

function validateBlock(ctx: Ctx, path: string, lookup: FieldLookup, value: unknown): value is StageBlock {
  if (!isRecord(value)) return fail(ctx, path, 'block must be an object');
  const type = String(value.type);
  const optionalTitle = value.title === undefined || isSafeText(value.title, 80);
  if (!optionalTitle) return fail(ctx, path, 'title must be 1..80 plain characters');
  if (type === 'hero') {
    return isSafeText(value.eyebrow, 80) && isSafeText(value.title, LIMITS.title) && isSafeText(value.body, LIMITS.description)
      ? true : fail(ctx, path, 'hero needs eyebrow (≤80), title (≤72), body (≤220)');
  }
  if (type === 'note') {
    if (!['info', 'success', 'warning'].includes(String(value.tone))) return fail(ctx, path, 'note tone must be info | success | warning');
    if (value.title !== undefined && !isSafeText(value.title, LIMITS.label)) return fail(ctx, path, 'note title must be ≤60 characters');
    return isSafeText(value.body, LIMITS.body) ? true : fail(ctx, path, 'note body must be 1..240 characters');
  }
  const collection = String(value.collection ?? '');
  if (type === 'stats') {
    if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > LIMITS.statItems) return fail(ctx, path, `stats needs 1..${LIMITS.statItems} items`);
    let ok = true;
    value.items.forEach((item, index) => {
      if (!isRecord(item) || !isSafeText(item.label, 40)) { ok = fail(ctx, `${path}.items[${index}]`, 'label must be 1..40 characters'); return; }
      if (item.suffix !== undefined && !isSafeText(item.suffix, 12)) { ok = fail(ctx, `${path}.items[${index}]`, 'suffix must be ≤12 characters'); return; }
      if (!validateComputed(ctx, `${path}.items[${index}].compute`, lookup, item.compute)) ok = false;
    });
    return ok;
  }
  if (type === 'progress') {
    if (!isSafeText(value.label, LIMITS.label)) return fail(ctx, path, 'progress label must be 1..60 characters');
    if (!validateComputed(ctx, `${path}.compute`, lookup, value.compute)) return false;
    const op = (value.compute as ComputedSpec).op;
    return op === 'percent_true' || op === 'percent_where' ? true : fail(ctx, path, 'progress compute must be percent_true or percent_where');
  }
  if (!lookup.has(collection)) return fail(ctx, path, `collection '${collection}' does not exist`);
  if (type === 'form') {
    if (!isSafeText(value.submitLabel, 40)) return fail(ctx, path, 'submitLabel must be 1..40 characters');
    if (value.fields !== undefined) {
      if (!Array.isArray(value.fields) || value.fields.length < 1) return fail(ctx, path, 'fields must list at least one field key');
      for (const key of value.fields) if (!fieldOf(lookup, collection, String(key))) return fail(ctx, path, `form field '${String(key)}' does not exist in '${collection}'`);
    }
    return true;
  }
  if (type === 'list') {
    if (!requireField(ctx, path, lookup, collection, value.titleField, ['text'], 'titleField')) return false;
    if (value.metaFields !== undefined) {
      if (!Array.isArray(value.metaFields) || value.metaFields.length > LIMITS.metaFields) return fail(ctx, path, `metaFields must list at most ${LIMITS.metaFields} keys`);
      for (const key of value.metaFields) if (!fieldOf(lookup, collection, String(key))) return fail(ctx, path, `metaFields '${String(key)}' does not exist in '${collection}'`);
    }
    if (value.badgeField !== undefined && !requireField(ctx, path, lookup, collection, value.badgeField, ['select'], 'badgeField')) return false;
    if (value.checkField !== undefined && !requireField(ctx, path, lookup, collection, value.checkField, ['boolean'], 'checkField')) return false;
    if (value.voteField !== undefined && !requireField(ctx, path, lookup, collection, value.voteField, ['number'], 'voteField')) return false;
    if (value.voteLabel !== undefined && !isSafeText(value.voteLabel, 20)) return fail(ctx, path, 'voteLabel must be ≤20 characters');
    if (value.allowDelete !== undefined && typeof value.allowDelete !== 'boolean') return fail(ctx, path, 'allowDelete must be boolean');
    if (value.limit !== undefined && (!Number.isInteger(value.limit) || Number(value.limit) < 1 || Number(value.limit) > LIMITS.recordsPerCollection)) return fail(ctx, path, 'limit must be 1..80');
    if (value.sort !== undefined) {
      if (!isRecord(value.sort) || !['asc', 'desc'].includes(String(value.sort.dir))) return fail(ctx, path, 'sort must be { field, dir: asc | desc }');
      if (!requireField(ctx, path, lookup, collection, value.sort.field, ['text', 'number', 'select', 'boolean'], 'sort.field')) return false;
    }
    return true;
  }
  if (type === 'board') {
    if (!requireField(ctx, path, lookup, collection, value.groupField, ['select'], 'groupField')) return false;
    if (!requireField(ctx, path, lookup, collection, value.cardTitleField, ['text'], 'cardTitleField')) return false;
    if (value.cardMetaField !== undefined && !fieldOf(lookup, collection, String(value.cardMetaField))) return fail(ctx, path, `cardMetaField '${String(value.cardMetaField)}' does not exist in '${collection}'`);
    return typeof value.allowMove === 'boolean' ? true : fail(ctx, path, 'allowMove must be boolean');
  }
  if (type === 'chart') {
    if (!requireField(ctx, path, lookup, collection, value.groupField, ['select'], 'groupField')) return false;
    if (value.measure === 'count') return true;
    if (isRecord(value.measure) && requireField(ctx, path, lookup, collection, value.measure.sum, ['number'], 'measure.sum')) return true;
    return fail(ctx, path, "measure must be 'count' or { sum: numberFieldKey }");
  }
  if (type === 'leaderboard') {
    if (!requireField(ctx, path, lookup, collection, value.labelField, ['text'], 'labelField')) return false;
    if (!requireField(ctx, path, lookup, collection, value.scoreField, ['number'], 'scoreField')) return false;
    if (value.limit !== undefined && (!Number.isInteger(value.limit) || Number(value.limit) < 1 || Number(value.limit) > 10)) return fail(ctx, path, 'limit must be 1..10');
    return true;
  }
  return fail(ctx, path, `unknown block type '${type}'`);
}

export type DefinitionResult = { ok: true; definition: ServiceDefinition } | { ok: false; errors: string[] };

export function validateDefinition(value: unknown): DefinitionResult {
  const ctx: Ctx = { errors: [] };
  if (!isRecord(value) || hasForbiddenKey(value)) return { ok: false, errors: ['definition must be a plain object without prototype keys'] };
  if (value.schemaVersion !== 'factory-stage/v2') return { ok: false, errors: ["schemaVersion must be 'factory-stage/v2'"] };
  if (!safeIdPattern.test(String(value.id))) fail(ctx, 'id', 'must match ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$');
  if (!isSafeText(value.title, LIMITS.title)) fail(ctx, 'title', `must be 1..${LIMITS.title} plain characters`);
  if (!isSafeText(value.description, LIMITS.description)) fail(ctx, 'description', `must be 1..${LIMITS.description} plain characters`);
  if (!isSafeText(value.sourceSummary, LIMITS.sourceSummary)) fail(ctx, 'sourceSummary', `must be 1..${LIMITS.sourceSummary} plain characters`);
  if (!STAGE_THEMES.includes(value.theme as StageTheme)) fail(ctx, 'theme', `must be one of ${STAGE_THEMES.join(', ')}`);
  if (!Array.isArray(value.collections) || value.collections.length < 1 || value.collections.length > LIMITS.collections) {
    fail(ctx, 'collections', `must contain 1..${LIMITS.collections} collections`);
    return { ok: false, errors: ctx.errors };
  }
  value.collections.forEach((collection, index) => validateCollection(ctx, `collections[${index}]`, collection));
  if (ctx.errors.length) return { ok: false, errors: ctx.errors };
  const specs = value.collections as CollectionSpec[];
  if (new Set(specs.map((collection) => collection.key)).size !== specs.length) fail(ctx, 'collections', 'collection keys must be unique');
  const lookup: FieldLookup = new Map(specs.map((collection) => [collection.key, new Map(collection.fields.map((field) => [field.key, field]))]));
  for (const [index, collection] of specs.entries()) {
    for (const [seedIndex, seed] of (collection.seeds ?? []).entries()) {
      for (const key of Object.keys(seed)) {
        if (!lookup.get(collection.key)?.has(key)) fail(ctx, `collections[${index}].seeds[${seedIndex}]`, `unknown field '${key}'`);
      }
    }
  }
  if (!Array.isArray(value.views) || value.views.length < 1 || value.views.length > LIMITS.views) {
    fail(ctx, 'views', `must contain 1..${LIMITS.views} views`);
    return { ok: false, errors: ctx.errors };
  }
  let totalBlocks = 0;
  value.views.forEach((view, index) => {
    if (!isRecord(view) || !safeKeyPattern.test(String(view.key)) || !isSafeText(view.label, 24)) {
      fail(ctx, `views[${index}]`, 'each view needs key (^[a-z][a-z0-9_-]*$) and label (≤24 chars)');
      return;
    }
    if (!Array.isArray(view.blocks) || view.blocks.length < 1 || view.blocks.length > LIMITS.blocksPerView) {
      fail(ctx, `views[${index}].blocks`, `must contain 1..${LIMITS.blocksPerView} blocks`);
      return;
    }
    totalBlocks += view.blocks.length;
    view.blocks.forEach((block, blockIndex) => validateBlock(ctx, `views[${index}].blocks[${blockIndex}]`, lookup, block));
  });
  const views = value.views as ServiceDefinition['views'];
  if (Array.isArray(value.views) && new Set(views.map((view) => view.key)).size !== views.length) fail(ctx, 'views', 'view keys must be unique');
  if (totalBlocks > LIMITS.totalBlocks) fail(ctx, 'views', `at most ${LIMITS.totalBlocks} blocks in total`);
  if (!Array.isArray(value.allowedActions) || value.allowedActions.length < 1 || value.allowedActions.some((action) => !ALL_STAGE_ACTIONS.includes(action as StageAction))) {
    fail(ctx, 'allowedActions', `must be a non-empty subset of ${ALL_STAGE_ACTIONS.join(', ')}`);
  } else if (new Set(value.allowedActions).size !== value.allowedActions.length) fail(ctx, 'allowedActions', 'must not repeat actions');
  if (ctx.errors.length) return { ok: false, errors: ctx.errors };
  return { ok: true, definition: value as unknown as ServiceDefinition };
}

export function isServiceDefinition(value: unknown): value is ServiceDefinition {
  return validateDefinition(value).ok;
}

export function isStageState(value: unknown, definition?: ServiceDefinition): value is StageState {
  if (!isRecord(value) || hasForbiddenKey(value) || value.kind !== 'v2' || !isRecord(value.collections)) return false;
  const entries = Object.entries(value.collections);
  if (definition) {
    const keys = definition.collections.map((collection) => collection.key);
    if (entries.length !== keys.length || !keys.every((key) => isRecord((value.collections as Record<string, unknown>)[key]))) return false;
  }
  for (const [key, bucketValue] of entries) {
    if (!safeKeyPattern.test(key) || !isRecord(bucketValue)) return false;
    const bucket = bucketValue as Record<string, unknown>;
    if (!Number.isInteger(bucket.seq) || Number(bucket.seq) < 0 || Number(bucket.seq) > 1_000_000) return false;
    if (!Array.isArray(bucket.records) || bucket.records.length > LIMITS.recordsPerCollection) return false;
    const spec = definition?.collections.find((collection) => collection.key === key);
    if (spec && bucket.records.length > (spec.maxRecords ?? LIMITS.defaultRecordCap)) return false;
    const ids = new Set<string>();
    for (const recordValue of bucket.records) {
      if (!isRecord(recordValue) || !safeIdPattern.test(String(recordValue.id)) || !isRecord(recordValue.values)) return false;
      if (ids.has(String(recordValue.id))) return false;
      ids.add(String(recordValue.id));
      const values = recordValue.values as Record<string, unknown>;
      if (spec) {
        const fieldKeys = spec.fields.map((field) => field.key);
        if (!fieldKeys.every((fieldKey) => fieldKey in values) || Object.keys(values).some((fieldKey) => !fieldKeys.includes(fieldKey))) return false;
        for (const field of spec.fields) {
          const fieldValue = values[field.key];
          if (field.type === 'boolean' && typeof fieldValue !== 'boolean') return false;
          if (field.type === 'number' && (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue))) return false;
          if ((field.type === 'text') && !isSafeText(fieldValue, LIMITS.text, true)) return false;
          if (field.type === 'select' && (typeof fieldValue !== 'string' || !(field.options ?? []).includes(fieldValue))) return false;
        }
      } else if (!Object.values(values).every(isFieldValue)) return false;
    }
  }
  return true;
}
