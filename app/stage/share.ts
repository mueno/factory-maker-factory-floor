// Shareable stage snapshots (URL fragment payloads), including a one-way
// adapter that upgrades legacy factory-stage/v1 links to v2 definitions.

import { createInitialState } from './engine';
import type { ServiceDefinition, SharedStageSnapshot, StageState } from './types';
import { hasForbiddenKey, isRecord, isStageState, validateDefinition } from './validate';

export function encodeSharedStage(snapshot: SharedStageSnapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

type LegacyOption = { id: string; label: string; votes: number };
type LegacyTask = { id: string; label: string; done: boolean };

function adaptLegacy(definition: Record<string, unknown>, state: Record<string, unknown>): { definition: ServiceDefinition; state: StageState } | null {
  const title = String(definition.title ?? 'Shared service').slice(0, 72) || 'Shared service';
  const description = String(definition.description ?? '').slice(0, 220) || title;
  const sourceSummary = String(definition.sourceSummary ?? title).slice(0, 280) || title;
  const kind = definition.kind;
  if (kind === 'voting' && Array.isArray(state.options)) {
    const seeds = (state.options as LegacyOption[]).slice(0, 24).map((option) => ({ label: String(option.label).slice(0, 120), votes: Number(option.votes) || 0 }));
    const candidate: ServiceDefinition = {
      schemaVersion: 'factory-stage/v2', id: 'service-vote', title, description, sourceSummary, theme: 'sunrise',
      collections: [{ key: 'options', label: 'Options', fields: [
        { key: 'label', label: 'Option', type: 'text' },
        { key: 'votes', label: 'Votes', type: 'number', min: 0, max: 100000 },
      ], maxRecords: 24, seeds }],
      views: [{ key: 'vote', label: 'Vote', blocks: [
        { type: 'hero', eyebrow: 'Shared vote', title, body: description },
        { type: 'list', collection: 'options', titleField: 'label', voteField: 'votes', voteLabel: 'Vote', sort: { field: 'votes', dir: 'desc' } },
        { type: 'leaderboard', collection: 'options', labelField: 'label', scoreField: 'votes', limit: 8 },
      ] }],
      allowedActions: ['add_record', 'increment_field'],
    };
    const checked = validateDefinition(candidate);
    return checked.ok ? { definition: checked.definition, state: createInitialState(checked.definition) } : null;
  }
  if (kind === 'planner' && Array.isArray(state.tasks)) {
    const seeds = (state.tasks as LegacyTask[]).slice(0, 30).map((task) => ({ title: String(task.label).slice(0, 120), done: Boolean(task.done) }));
    const candidate: ServiceDefinition = {
      schemaVersion: 'factory-stage/v2', id: 'service-plan', title, description, sourceSummary, theme: 'storybook',
      collections: [{ key: 'tasks', label: 'Tasks', fields: [
        { key: 'title', label: 'Task', type: 'text' },
        { key: 'done', label: 'Done', type: 'boolean' },
      ], maxRecords: 30, seeds }],
      views: [{ key: 'plan', label: 'Plan', blocks: [
        { type: 'hero', eyebrow: 'Shared plan', title, body: description },
        { type: 'progress', label: 'Progress', compute: { op: 'percent_true', collection: 'tasks', field: 'done' } },
        { type: 'list', collection: 'tasks', titleField: 'title', checkField: 'done' },
        { type: 'form', collection: 'tasks', submitLabel: 'Add', fields: ['title'] },
      ] }],
      allowedActions: ['add_record', 'toggle_field'],
    };
    const checked = validateDefinition(candidate);
    return checked.ok ? { definition: checked.definition, state: createInitialState(checked.definition) } : null;
  }
  return null;
}

export function decodeSharedStage(encoded: string): SharedStageSnapshot | null {
  try {
    if (!encoded || encoded.length > 24_000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!isRecord(parsed) || hasForbiddenKey(parsed)) return null;
    const outputHash = typeof parsed.outputHash === 'string' && parsed.outputHash.length <= 120 ? parsed.outputHash : null;
    if (!outputHash) return null;
    if (parsed.format === 'factory-stage-share/v2') {
      const checked = validateDefinition(parsed.definition);
      if (!checked.ok || !isStageState(parsed.state, checked.definition)) return null;
      return { format: 'factory-stage-share/v2', definition: checked.definition, state: parsed.state, outputHash };
    }
    if (parsed.format === 'factory-stage-share/v1' && isRecord(parsed.definition) && isRecord(parsed.state)) {
      const adapted = adaptLegacy(parsed.definition, parsed.state);
      if (!adapted) return null;
      return { format: 'factory-stage-share/v2', definition: adapted.definition, state: adapted.state, outputHash };
    }
    return null;
  } catch {
    return null;
  }
}
