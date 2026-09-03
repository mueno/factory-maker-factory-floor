#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for Stage Runtime v2 pure logic (engine / validate / composer / share).
// Usage: node scripts/stage-runtime-smoke.cjs  (compiles app/stage to a temp dir first)

const { execFileSync } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const out = mkdtempSync(join(tmpdir(), 'stage-v2-'));
execFileSync('npx', [
  'tsc', 'app/stage/types.ts', 'app/stage/validate.ts', 'app/stage/engine.ts', 'app/stage/composer.ts', 'app/stage/share.ts', 'app/stage/guide.ts',
  '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--esModuleInterop', '--skipLibCheck', '--strict',
], { cwd: join(__dirname, '..'), stdio: 'inherit' });

const { validateDefinition, isStageState } = require(join(out, 'validate.js'));
const { applyCommand, evaluateComputed, stageSummary } = require(join(out, 'engine.js'));
const { composeConcepts, composeDefinition, ARCHETYPES } = require(join(out, 'composer.js'));

let failures = 0;
function check(name, condition, detail) {
  if (condition) { console.log(`  ok  ${name}`); return; }
  failures += 1;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const brief = { summary: '友達と行きたい場所を、みんなで投票して、次の休日の予定を決められる場所', audience: '友達', outcome: '休日の予定を決める' };

// 1. Concepts
const concepts = composeConcepts(brief, 'ja');
check('composeConcepts returns 3 distinct concepts', concepts.length === 3 && new Set(concepts.map((c) => c.archetype)).size === 3);
check('vote archetype ranks first for a voting brief', concepts[0].archetype === 'vote', concepts[0].archetype);

// 2. Every archetype composes a valid definition in both locales
for (const archetype of ARCHETYPES) {
  for (const locale of ['ja', 'en']) {
    try {
      const { definition, state } = composeDefinition(archetype, brief, locale);
      const valid = validateDefinition(definition);
      check(`compose ${archetype}/${locale} valid`, valid.ok, JSON.stringify(valid.errors ?? []));
      check(`compose ${archetype}/${locale} state valid`, isStageState(state, definition));
    } catch (error) {
      check(`compose ${archetype}/${locale}`, false, error.message);
    }
  }
}

// 3. Engine round-trip on the vote archetype
{
  const { definition, state } = composeDefinition('vote', brief, 'ja');
  const added = applyCommand(definition, state, { action: 'add_record', collection: 'options', values: { label: '温泉', by: 'テスト' } });
  check('add_record works', added.ok, added.ok ? '' : added.error);
  const id = added.state.collections.options.records.at(-1).id;
  const voted = applyCommand(definition, added.state, { action: 'increment_field', collection: 'options', record_id: id, field: 'votes', by: 3 });
  check('increment_field works', voted.ok && voted.state.collections.options.records.at(-1).values.votes === 3);
  const summary = stageSummary(definition, voted.state);
  check('summary metrics reflect votes', summary.metrics.some((m) => m.value === 3) || summary.leaders.some((l) => l.score === 3), JSON.stringify(summary.metrics));
  const denied = applyCommand(definition, voted.state, { action: 'toggle_field', collection: 'options', record_id: id, field: 'votes' });
  check('disallowed action rejected', !denied.ok);
  const badValue = applyCommand(definition, voted.state, { action: 'add_record', collection: 'options', values: { label: '' } });
  check('empty title rejected', !badValue.ok);
}

// 4. Kanban board move + computed
{
  const { definition, state } = composeDefinition('kanban', brief, 'ja');
  const first = state.collections.cards.records[2];
  const moved = applyCommand(definition, state, { action: 'move_record', collection: 'cards', record_id: first.id, field: 'status', value: '完了' });
  check('move_record works', moved.ok, moved.ok ? '' : moved.error);
  const percent = evaluateComputed({ op: 'percent_where', collection: 'cards', where: { field: 'status', equals: '完了' } }, moved.state);
  check('percent_where computes', percent === Math.round((2 / 3) * 100), String(percent));
}

// 5. Validation error reporting for agent-authored definitions
{
  const invalid = validateDefinition({
    schemaVersion: 'factory-stage/v2', id: 'service-x', title: 'X', description: 'X', sourceSummary: 'X', theme: 'aurora',
    collections: [{ key: 'items', label: 'Items', fields: [{ key: 'name', label: 'Name', type: 'text' }] }],
    views: [{ key: 'main', label: 'Main', blocks: [{ type: 'list', collection: 'items', titleField: 'missing' }] }],
    allowedActions: ['add_record'],
  });
  check('invalid titleField reported with path', !invalid.ok && invalid.errors.some((e) => e.includes('views[0].blocks[0]') && e.includes('missing')), JSON.stringify(invalid.errors ?? []));
  const proto = validateDefinition(JSON.parse('{"schemaVersion":"factory-stage/v2","__proto__":{"x":1}}'));
  check('prototype pollution rejected', !proto.ok);
}

// 6. Record cap enforced
{
  const { definition, state } = composeDefinition('habit', brief, 'en');
  let current = state;
  let full = null;
  for (let i = 0; i < 25; i += 1) {
    const result = applyCommand(definition, current, { action: 'add_record', collection: 'habits', values: { name: `habit ${i}` } });
    if (!result.ok) { full = result; break; }
    current = result.state;
  }
  check('record cap enforced', Boolean(full) && full.error.includes('full'));
}

console.log(failures ? `\n${failures} failure(s)` : '\nAll stage-runtime smoke checks passed.');
process.exit(failures ? 1 : 0);
