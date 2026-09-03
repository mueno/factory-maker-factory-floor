export type ServiceKind = 'voting' | 'planner' | 'decision';
export type StageTheme = 'aurora' | 'sunrise' | 'storybook';

export type HeroBlock = {
  id: 'hero';
  type: 'hero';
  eyebrow: string;
  title: string;
  body: string;
};

export type VotingBlock = {
  id: 'voting-board';
  type: 'voting-board';
  prompt: string;
  addLabel: string;
};

export type PlannerBlock = {
  id: 'progress-list';
  type: 'progress-list';
  prompt: string;
  addLabel: string;
};

export type DecisionBlock = {
  id: 'decision-score';
  type: 'decision-score';
  prompt: string;
};

export type SummaryBlock = {
  id: 'live-summary';
  type: 'live-summary';
  label: string;
};

export type ServiceBlock = HeroBlock | VotingBlock | PlannerBlock | DecisionBlock | SummaryBlock;

export type ServiceDefinition = {
  schemaVersion: 'factory-stage/v1';
  id: string;
  kind: ServiceKind;
  theme: StageTheme;
  title: string;
  description: string;
  sourceSummary: string;
  blocks: ServiceBlock[];
  allowedActions: StageCommand['action'][];
  stateSchema: {
    type: 'object';
    kind: ServiceKind;
    maxItems: number;
    fields: string[];
  };
};

export type VotingState = {
  kind: 'voting';
  options: Array<{ id: string; label: string; votes: number }>;
  lastVoteId: string | null;
};

export type PlannerState = {
  kind: 'planner';
  tasks: Array<{ id: string; label: string; done: boolean }>;
};

export type DecisionResult = {
  name: string;
  score: number;
  lane: 'Run a pilot' | 'Clarify evidence' | 'Park for now';
  impact: number;
  effort: number;
  confidence: number;
};

export type DecisionState = {
  kind: 'decision';
  result: DecisionResult | null;
};

export type StageState = VotingState | PlannerState | DecisionState;

export type StageEvent = {
  seq: number;
  type: 'click' | 'submit' | 'change' | 'system';
  action: StageCommand['action'] | 'service-rendered' | 'service-patched' | 'service-restored';
  detail: string;
  actor: 'human' | 'agent' | 'system';
  at: string;
};

export type StageCommand =
  | { action: 'cast_vote'; option_id: string }
  | { action: 'add_item'; label: string }
  | { action: 'toggle_task'; task_id: string }
  | { action: 'score_candidate'; name: string; impact: number; effort: number; confidence: number };

export type ServicePatch = {
  title?: string;
  description?: string;
  theme?: StageTheme;
};

export type SharedStageSnapshot = {
  format: 'factory-stage-share/v1';
  definition: ServiceDefinition;
  state: StageState;
  outputHash: string;
};

type BuildInput = {
  selectedConceptId: string;
  productName: string;
  summary: string;
  audience: string;
  outcome: string;
};

const themes: StageTheme[] = ['aurora', 'sunrise', 'storybook'];
const japanesePattern = /[\u3040-\u30ff\u3400-\u9fff]/;
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
const serviceKinds: ServiceKind[] = ['voting', 'planner', 'decision'];
const allActions: StageCommand['action'][] = ['cast_vote', 'add_item', 'toggle_task', 'score_candidate'];
const decisionLanes: DecisionResult['lane'][] = ['Run a pilot', 'Clarify evidence', 'Park for now'];
const safeIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function shortSubject(value: string, fallback: string) {
  const cleaned = cleanText(value, 44).replace(/[。.!！?？]+$/g, '');
  return cleaned || fallback;
}

function serviceKindForConcept(id: string): ServiceKind {
  if (id === 'community-vote') return 'voting';
  if (id === 'guided-plan' || id === 'guided-intake' || id === 'evidence-queue') return 'planner';
  return 'decision';
}

function themeForKind(kind: ServiceKind): StageTheme {
  if (kind === 'voting') return 'sunrise';
  if (kind === 'planner') return 'storybook';
  return 'aurora';
}

function localCopy(isJapanese: boolean, kind: ServiceKind, input: BuildInput) {
  const audience = shortSubject(input.audience, isJapanese ? 'みんな' : 'Everyone');
  if (kind === 'voting') {
    return isJapanese
      ? {
          title: `${audience}の\u200B投票広場`,
          description: `目標は「${cleanText(input.outcome, 120)}」。案を追加してすぐに使える投票サービスです。`,
          eyebrow: 'みんなの声を集めよう',
          prompt: 'いちばん気になる案に、一票を入れてください。',
          addLabel: '投票する案を追加',
          summary: '投票結果',
          items: ['案A', '案B', '案C'],
        }
      : {
          title: `${audience} Vote`,
          description: `A ready-to-use voting service to ${cleanText(input.outcome, 120)}.`,
          eyebrow: 'Bring every voice into the room',
          prompt: 'Cast one vote for the option you want to move forward.',
          addLabel: 'Add another option',
          summary: 'Live result',
          items: ['Option A', 'Option B', 'Option C'],
        };
  }
  if (kind === 'planner') {
    return isJapanese
      ? {
          title: `${audience}の\u200B一歩ずつプラン`,
          description: `「${cleanText(input.outcome, 120)}」に向けた手順を、終わったものから確認できます。`,
          eyebrow: 'できたことが、目に見える',
          prompt: '終わった項目に印を付けて、次の一歩を確かめましょう。',
          addLabel: '新しい項目を追加',
          summary: '進み具合',
          items: ['目的を確かめる', '最初の一歩を決める', '結果を共有する'],
        }
      : {
          title: `${audience} Step Plan`,
          description: `A practical checklist for reaching this outcome: ${cleanText(input.outcome, 120)}.`,
          eyebrow: 'See each step become complete',
          prompt: 'Mark what is done and keep the next step visible.',
          addLabel: 'Add a new step',
          summary: 'Progress',
          items: ['Confirm the purpose', 'Choose the first step', 'Share the result'],
        };
  }
  return isJapanese
    ? {
        title: `${audience}の\u200B比較スタジオ`,
        description: `目標は「${cleanText(input.outcome, 120)}」。効果・工数・確信度を同じ基準で比べます。`,
        eyebrow: '迷いを、比べられる形に',
        prompt: '候補を一つ入力し、三つの基準で確かめてください。',
        addLabel: '',
        summary: 'おすすめの進め方',
        items: [] as string[],
      }
    : {
        title: `${audience} Decision Studio`,
        description: `Compare impact, effort, and confidence before deciding how to ${cleanText(input.outcome, 120)}.`,
        eyebrow: 'Turn uncertainty into a visible choice',
        prompt: 'Enter one candidate and check it against three shared criteria.',
        addLabel: '',
        summary: 'Recommended next step',
        items: [] as string[],
      };
}

export function createServiceDefinition(input: BuildInput): { definition: ServiceDefinition; state: StageState } {
  const kind = serviceKindForConcept(input.selectedConceptId);
  const isJapanese = japanesePattern.test(`${input.summary}${input.audience}${input.outcome}`);
  const copy = localCopy(isJapanese, kind, input);
  const commonBlocks: ServiceBlock[] = [
    { id: 'hero', type: 'hero', eyebrow: copy.eyebrow, title: copy.title, body: copy.description },
  ];
  const mainBlock: ServiceBlock = kind === 'voting'
    ? { id: 'voting-board', type: 'voting-board', prompt: copy.prompt, addLabel: copy.addLabel }
    : kind === 'planner'
      ? { id: 'progress-list', type: 'progress-list', prompt: copy.prompt, addLabel: copy.addLabel }
      : { id: 'decision-score', type: 'decision-score', prompt: copy.prompt };
  const definition: ServiceDefinition = {
    schemaVersion: 'factory-stage/v1',
    id: `service-${kind}`,
    kind,
    theme: themeForKind(kind),
    title: copy.title,
    description: copy.description,
    sourceSummary: cleanText(input.summary, 280),
    blocks: [...commonBlocks, mainBlock, { id: 'live-summary', type: 'live-summary', label: copy.summary }],
    allowedActions: kind === 'voting'
      ? ['cast_vote', 'add_item']
      : kind === 'planner'
        ? ['toggle_task', 'add_item']
        : ['score_candidate'],
    stateSchema: {
      type: 'object',
      kind,
      maxItems: 8,
      fields: kind === 'voting' ? ['options[].id', 'options[].label', 'options[].votes', 'lastVoteId'] : kind === 'planner' ? ['tasks[].id', 'tasks[].label', 'tasks[].done'] : ['result'],
    },
  };
  const state: StageState = kind === 'voting'
    ? { kind, options: copy.items.map((label, index) => ({ id: `option-${index + 1}`, label, votes: 0 })), lastVoteId: null }
    : kind === 'planner'
      ? { kind, tasks: copy.items.map((label, index) => ({ id: `task-${index + 1}`, label, done: false })) }
      : { kind, result: null };
  return { definition, state };
}

function boundedScore(value: unknown) {
  return Math.min(5, Math.max(1, Math.round(Number(value) || 1)));
}

function nextItemId(prefix: string, labels: string[]) {
  let index = labels.length + 1;
  let candidate = `${prefix}-${index}`;
  while (labels.includes(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

export function applyStageCommand(definition: ServiceDefinition, state: StageState, command: StageCommand): { ok: true; state: StageState; detail: string } | { ok: false; error: string } {
  if (definition.kind !== state.kind) return { ok: false, error: 'state_kind_mismatch' };
  if (!definition.allowedActions.includes(command.action)) return { ok: false, error: 'action_not_allowed' };
  if (command.action === 'cast_vote' && state.kind === 'voting') {
    const selected = state.options.find((option) => option.id === command.option_id);
    if (!selected) return { ok: false, error: 'option_not_found' };
    if (selected.votes >= 1_000_000) return { ok: false, error: 'vote_limit_reached' };
    return {
      ok: true,
      state: { ...state, lastVoteId: command.option_id, options: state.options.map((option) => option.id === command.option_id ? { ...option, votes: option.votes + 1 } : option) },
      detail: `Vote recorded for ${command.option_id}.`,
    };
  }
  if (command.action === 'toggle_task' && state.kind === 'planner') {
    if (!state.tasks.some((task) => task.id === command.task_id)) return { ok: false, error: 'task_not_found' };
    return {
      ok: true,
      state: { ...state, tasks: state.tasks.map((task) => task.id === command.task_id ? { ...task, done: !task.done } : task) },
      detail: `Task ${command.task_id} toggled.`,
    };
  }
  if (command.action === 'add_item' && (state.kind === 'voting' || state.kind === 'planner')) {
    const label = cleanText(command.label, 60);
    const items = state.kind === 'voting' ? state.options : state.tasks;
    if (!label) return { ok: false, error: 'label_required' };
    if (items.length >= definition.stateSchema.maxItems) return { ok: false, error: 'item_limit_reached' };
    if (items.some((item) => item.label.toLocaleLowerCase() === label.toLocaleLowerCase())) return { ok: false, error: 'duplicate_label' };
    if (state.kind === 'voting') {
      const id = nextItemId('option', state.options.map((item) => item.id));
      return { ok: true, state: { ...state, options: [...state.options, { id, label, votes: 0 }] }, detail: `${label} added as a voting option.` };
    }
    const id = nextItemId('task', state.tasks.map((item) => item.id));
    return { ok: true, state: { ...state, tasks: [...state.tasks, { id, label, done: false }] }, detail: `${label} added as a plan item.` };
  }
  if (command.action === 'score_candidate' && state.kind === 'decision') {
    const name = cleanText(command.name, 80);
    if (!name) return { ok: false, error: 'name_required' };
    const impact = boundedScore(command.impact);
    const effort = boundedScore(command.effort);
    const confidence = boundedScore(command.confidence);
    const score = impact * confidence * 4 - effort * 3;
    const lane = score >= 55 ? 'Run a pilot' : score >= 28 ? 'Clarify evidence' : 'Park for now';
    return { ok: true, state: { kind: 'decision', result: { name, impact, effort, confidence, score, lane } }, detail: `${name} routed to ${lane}.` };
  }
  return { ok: false, error: 'command_state_mismatch' };
}

export function applyServicePatch(definition: ServiceDefinition, patch: ServicePatch): { ok: true; definition: ServiceDefinition } | { ok: false; error: string } {
  if (Object.keys(patch).some((key) => forbiddenKeys.has(key))) return { ok: false, error: 'unsafe_patch_key' };
  const title = patch.title === undefined ? definition.title : cleanText(patch.title, 72);
  const description = patch.description === undefined ? definition.description : cleanText(patch.description, 220);
  const theme = patch.theme ?? definition.theme;
  if (!title) return { ok: false, error: 'title_required' };
  if (!description) return { ok: false, error: 'description_required' };
  if (!themes.includes(theme)) return { ok: false, error: 'theme_not_allowed' };
  return {
    ok: true,
    definition: {
      ...definition,
      title,
      description,
      theme,
      blocks: definition.blocks.map((block) => block.type === 'hero' ? { ...block, title, body: description } : block),
    },
  };
}

export function stageSummary(state: StageState) {
  if (state.kind === 'voting') {
    const totalVotes = state.options.reduce((sum, option) => sum + option.votes, 0);
    const leader = [...state.options].sort((left, right) => right.votes - left.votes)[0] ?? null;
    return { kind: state.kind, total_votes: totalVotes, leading_option: leader?.label ?? null, options: state.options };
  }
  if (state.kind === 'planner') {
    const complete = state.tasks.filter((task) => task.done).length;
    return { kind: state.kind, complete, total: state.tasks.length, percent: state.tasks.length ? Math.round((complete / state.tasks.length) * 100) : 0, tasks: state.tasks };
  }
  return { kind: state.kind, result: state.result };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasForbiddenKey(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Object.keys(value).some((key) => forbiddenKeys.has(key))) return true;
  return Object.values(value).some((nested) => hasForbiddenKey(nested, seen));
}

function isSafeText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  if (typeof value !== 'string' || value.length > maxLength || (!allowEmpty && value.length === 0)) return false;
  return !/[\u0000-\u001f\u007f]/.test(value);
}

function hasUniqueIds(items: Array<{ id: string }>) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function isServiceBlock(value: unknown): value is ServiceBlock {
  if (!isRecord(value) || !isSafeText(value.id, 80) || !isSafeText(value.type, 40)) return false;
  if (value.type === 'hero') {
    return value.id === 'hero' && isSafeText(value.eyebrow, 80) && isSafeText(value.title, 72) && isSafeText(value.body, 220);
  }
  if (value.type === 'voting-board') {
    return value.id === 'voting-board' && isSafeText(value.prompt, 180) && isSafeText(value.addLabel, 80);
  }
  if (value.type === 'progress-list') {
    return value.id === 'progress-list' && isSafeText(value.prompt, 180) && isSafeText(value.addLabel, 80);
  }
  if (value.type === 'decision-score') {
    return value.id === 'decision-score' && isSafeText(value.prompt, 180);
  }
  return value.type === 'live-summary' && value.id === 'live-summary' && isSafeText(value.label, 80);
}

export function isServiceDefinition(value: unknown): value is ServiceDefinition {
  if (!isRecord(value) || hasForbiddenKey(value)) return false;
  if (value.schemaVersion !== 'factory-stage/v1' || !serviceKinds.includes(value.kind as ServiceKind)) return false;
  if (!safeIdPattern.test(String(value.id)) || !themes.includes(value.theme as StageTheme)) return false;
  if (!isSafeText(value.title, 72) || !isSafeText(value.description, 220) || !isSafeText(value.sourceSummary, 280)) return false;
  if (!Array.isArray(value.blocks) || !Array.isArray(value.allowedActions) || !isRecord(value.stateSchema)) return false;
  if (value.blocks.length !== 3 || !value.blocks.every(isServiceBlock)) return false;
  if (value.allowedActions.some((action) => !allActions.includes(action as StageCommand['action']))) return false;
  const expectedActions = value.kind === 'voting' ? ['cast_vote', 'add_item'] : value.kind === 'planner' ? ['toggle_task', 'add_item'] : ['score_candidate'];
  if (value.allowedActions.length !== expectedActions.length || !expectedActions.every((action) => value.allowedActions.includes(action))) return false;
  const expectedMain = value.kind === 'voting' ? 'voting-board' : value.kind === 'planner' ? 'progress-list' : 'decision-score';
  if (!value.blocks.some((block) => block.type === 'hero') || !value.blocks.some((block) => block.type === expectedMain) || !value.blocks.some((block) => block.type === 'live-summary')) return false;
  if (value.stateSchema.type !== 'object' || value.stateSchema.kind !== value.kind) return false;
  if (!Number.isInteger(value.stateSchema.maxItems) || Number(value.stateSchema.maxItems) < 1 || Number(value.stateSchema.maxItems) > 8) return false;
  return Array.isArray(value.stateSchema.fields) && value.stateSchema.fields.length > 0 && value.stateSchema.fields.length <= 8 && value.stateSchema.fields.every((field) => isSafeText(field, 64));
}

export function isStageState(value: unknown, kind?: ServiceKind): value is StageState {
  if (!isRecord(value) || hasForbiddenKey(value) || !serviceKinds.includes(value.kind as ServiceKind)) return false;
  if (kind && value.kind !== kind) return false;
  if (value.kind === 'voting') {
    if (!Array.isArray(value.options) || value.options.length > 8) return false;
    const options = value.options;
    if (!options.every((item) => isRecord(item) && safeIdPattern.test(String(item.id)) && isSafeText(item.label, 60) && Number.isInteger(item.votes) && Number(item.votes) >= 0 && Number(item.votes) <= 1_000_000)) return false;
    if (!hasUniqueIds(options as Array<{ id: string }>)) return false;
    return value.lastVoteId === null || (typeof value.lastVoteId === 'string' && options.some((item) => item.id === value.lastVoteId));
  }
  if (value.kind === 'planner') {
    if (!Array.isArray(value.tasks) || value.tasks.length > 8) return false;
    const tasks = value.tasks;
    return tasks.every((item) => isRecord(item) && safeIdPattern.test(String(item.id)) && isSafeText(item.label, 60) && typeof item.done === 'boolean') && hasUniqueIds(tasks as Array<{ id: string }>);
  }
  if (value.result === null) return true;
  if (!isRecord(value.result) || !isSafeText(value.result.name, 80)) return false;
  if (!Number.isFinite(value.result.score) || Number(value.result.score) < -11 || Number(value.result.score) > 97) return false;
  if (!decisionLanes.includes(value.result.lane as DecisionResult['lane'])) return false;
  return ['impact', 'effort', 'confidence'].every((key) => Number.isInteger(value.result?.[key]) && Number(value.result?.[key]) >= 1 && Number(value.result?.[key]) <= 5);
}

export function encodeSharedStage(snapshot: SharedStageSnapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function decodeSharedStage(encoded: string): SharedStageSnapshot | null {
  try {
    if (!encoded || encoded.length > 16_000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!isRecord(parsed) || hasForbiddenKey(parsed) || parsed.format !== 'factory-stage-share/v1' || !isSafeText(parsed.outputHash, 120)) return null;
    if (!isServiceDefinition(parsed.definition) || !isStageState(parsed.state, parsed.definition.kind)) return null;
    return parsed as SharedStageSnapshot;
  } catch {
    return null;
  }
}
