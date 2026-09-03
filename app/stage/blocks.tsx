'use client';

// Block renderers for Stage Runtime v2. Every human interaction is translated
// into the same typed StageCommand path the browser agent uses.

import { useMemo, useState } from 'react';
import { evaluateComputed, recordsOf } from './engine';
import type { BoardBlock, ChartBlock, CollectionSpec, FieldSpec, FieldValue, FormBlock, LeaderboardBlock, ListBlock, ProgressBlock, ServiceDefinition, StageBlock, StageCommand, StageRecord, StageState, StatsBlock } from './types';

export type BlockCopy = {
  empty: string;
  remove: string;
  move: string;
  submitFallback: string;
  requiredHint: string;
  records: string;
};

type BlockContext = {
  definition: ServiceDefinition;
  state: StageState;
  locale: 'ja' | 'en';
  copy: BlockCopy;
  onCommand: (command: StageCommand) => unknown;
};

function collectionSpec(definition: ServiceDefinition, key: string): CollectionSpec | null {
  return definition.collections.find((collection) => collection.key === key) ?? null;
}

function formatNumber(value: number, locale: 'ja' | 'en') {
  return value.toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US');
}

function badgeTone(spec: CollectionSpec | null, field: string | undefined, value: FieldValue | undefined) {
  if (!spec || !field || value === undefined) return 0;
  const options = spec.fields.find((item) => item.key === field)?.options ?? [];
  return Math.max(0, options.indexOf(String(value))) % 5;
}

function FieldInput({ field, value, onChange }: { field: FieldSpec; value: string | boolean; onChange: (next: string | boolean) => void }) {
  if (field.type === 'boolean') {
    return (
      <label className="stage-field stage-field-boolean">
        <input checked={value === true} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label className="stage-field">
        <span>{field.label}</span>
        <select onChange={(event) => onChange(event.target.value)} value={String(value)}>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="stage-field">
      <span>{field.label}</span>
      <input
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        maxLength={field.type === 'text' ? 120 : undefined}
        onChange={(event) => onChange(event.target.value)}
        type={field.type === 'number' ? 'number' : 'text'}
        value={String(value)}
      />
    </label>
  );
}

function FormView({ block, ctx }: { block: FormBlock; ctx: BlockContext }) {
  const spec = collectionSpec(ctx.definition, block.collection);
  const fields = useMemo(() => {
    if (!spec) return [];
    const keys = block.fields ?? spec.fields.map((field) => field.key);
    return keys.map((key) => spec.fields.find((field) => field.key === key)).filter((field): field is FieldSpec => Boolean(field));
  }, [block.fields, spec]);
  const emptyDraft = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field.type === 'boolean' ? false : field.type === 'select' ? String(field.defaultValue ?? field.options?.[0] ?? '') : ''])), [fields]);
  const [draft, setDraft] = useState<Record<string, string | boolean>>(emptyDraft);
  if (!spec) return null;
  const firstText = fields.find((field) => field.type === 'text');
  const ready = !firstText || String(draft[firstText.key] ?? '').trim().length > 0;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    const values: Record<string, FieldValue> = {};
    for (const field of fields) {
      const raw = draft[field.key];
      if (field.type === 'boolean') values[field.key] = raw === true;
      else if (field.type === 'number') { if (String(raw).trim() !== '') values[field.key] = Number(raw); }
      else if (String(raw ?? '').trim() !== '') values[field.key] = String(raw);
    }
    ctx.onCommand({ action: 'add_record', collection: block.collection, values });
    setDraft(emptyDraft);
  };
  return (
    <section className="stage-block stage-form">
      {block.title && <h2>{block.title}</h2>}
      <form onSubmit={submit}>
        <div className="stage-field-grid">
          {fields.map((field) => <FieldInput field={field} key={field.key} onChange={(next) => setDraft((previous) => ({ ...previous, [field.key]: next }))} value={draft[field.key] ?? (field.type === 'boolean' ? false : '')} />)}
        </div>
        <button className="stage-primary-action" disabled={!ready} type="submit">{block.submitLabel || ctx.copy.submitFallback}</button>
        {!ready && firstText && <small className="stage-hint">{ctx.copy.requiredHint.replace('{field}', firstText.label)}</small>}
      </form>
    </section>
  );
}

function sortedRecords(block: ListBlock, records: StageRecord[]) {
  const sorted = block.sort
    ? [...records].sort((left, right) => {
        const a = left.values[block.sort!.field];
        const b = right.values[block.sort!.field];
        const compare = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
        return block.sort!.dir === 'desc' ? -compare : compare;
      })
    : records;
  return block.limit ? sorted.slice(0, block.limit) : sorted;
}

function ListView({ block, ctx }: { block: ListBlock; ctx: BlockContext }) {
  const spec = collectionSpec(ctx.definition, block.collection);
  const records = sortedRecords(block, recordsOf(ctx.state, block.collection));
  const canToggle = Boolean(block.checkField) && ctx.definition.allowedActions.includes('toggle_field');
  const canVote = Boolean(block.voteField) && ctx.definition.allowedActions.includes('increment_field');
  const canDelete = Boolean(block.allowDelete) && ctx.definition.allowedActions.includes('delete_record');
  return (
    <section className="stage-block stage-list">
      {block.title && <h2>{block.title}</h2>}
      {records.length === 0 && <p className="stage-empty">{ctx.copy.empty}</p>}
      <ul>
        {records.map((record) => {
          const checked = block.checkField ? record.values[block.checkField] === true : false;
          const title = <strong>{String(record.values[block.titleField] ?? record.id)}</strong>;
          const body = (
            <>
              {block.checkField && <i aria-hidden="true" className={`stage-check ${checked ? 'on' : ''}`} />}
              <div className="stage-list-main">
                {title}
                <small>
                  {(block.metaFields ?? []).map((key) => {
                    const value = record.values[key];
                    if (value === undefined || value === '' || value === false) return null;
                    return <span key={key}>{typeof value === 'number' ? formatNumber(value, ctx.locale) : String(value === true ? spec?.fields.find((field) => field.key === key)?.label ?? key : value)}</span>;
                  })}
                </small>
              </div>
              {block.badgeField && record.values[block.badgeField] !== undefined && (
                <em className={`stage-badge tone-${badgeTone(spec, block.badgeField, record.values[block.badgeField])}`}>{String(record.values[block.badgeField])}</em>
              )}
            </>
          );
          return (
            <li className={checked ? 'done' : ''} key={record.id}>
              {canToggle
                ? <button className="stage-row-toggle" onClick={() => ctx.onCommand({ action: 'toggle_field', collection: block.collection, record_id: record.id, field: block.checkField! })} type="button">{body}</button>
                : <div className="stage-row-static">{body}</div>}
              {canVote && (
                <button className="stage-vote" onClick={() => ctx.onCommand({ action: 'increment_field', collection: block.collection, record_id: record.id, field: block.voteField! })} type="button">
                  <b>{formatNumber(Number(record.values[block.voteField!] ?? 0), ctx.locale)}</b>
                  <span>{block.voteLabel ?? '+1'}</span>
                </button>
              )}
              {canDelete && (
                <button aria-label={`${ctx.copy.remove}: ${String(record.values[block.titleField] ?? record.id)}`} className="stage-delete" onClick={() => ctx.onCommand({ action: 'delete_record', collection: block.collection, record_id: record.id })} type="button">×</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BoardView({ block, ctx }: { block: BoardBlock; ctx: BlockContext }) {
  const spec = collectionSpec(ctx.definition, block.collection);
  const options = spec?.fields.find((field) => field.key === block.groupField)?.options ?? [];
  const records = recordsOf(ctx.state, block.collection);
  const canMove = block.allowMove && ctx.definition.allowedActions.includes('move_record');
  return (
    <section className="stage-block stage-board">
      {block.title && <h2>{block.title}</h2>}
      <div className="stage-board-columns" style={{ gridTemplateColumns: `repeat(${Math.max(1, options.length)}, minmax(0, 1fr))` }}>
        {options.map((option, columnIndex) => {
          const cards = records.filter((record) => record.values[block.groupField] === option);
          return (
            <div className={`stage-board-column tone-${columnIndex % 5}`} key={option}>
              <header><span>{option}</span><b>{cards.length}</b></header>
              {cards.map((record) => (
                <article key={record.id}>
                  <strong>{String(record.values[block.cardTitleField] ?? record.id)}</strong>
                  {block.cardMetaField && record.values[block.cardMetaField] !== '' && record.values[block.cardMetaField] !== undefined && <small>{String(record.values[block.cardMetaField])}</small>}
                  {canMove && (
                    <div className="stage-card-moves">
                      {columnIndex > 0 && <button aria-label={`${ctx.copy.move}: ${options[columnIndex - 1]}`} onClick={() => ctx.onCommand({ action: 'move_record', collection: block.collection, record_id: record.id, field: block.groupField, value: options[columnIndex - 1] })} type="button">←</button>}
                      {columnIndex < options.length - 1 && <button aria-label={`${ctx.copy.move}: ${options[columnIndex + 1]}`} onClick={() => ctx.onCommand({ action: 'move_record', collection: block.collection, record_id: record.id, field: block.groupField, value: options[columnIndex + 1] })} type="button">→</button>}
                    </div>
                  )}
                </article>
              ))}
              {cards.length === 0 && <p className="stage-empty">—</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatsView({ block, ctx }: { block: StatsBlock; ctx: BlockContext }) {
  return (
    <section className="stage-block stage-stats">
      <div className="stage-stat-grid">
        {block.items.map((item) => (
          <div key={item.label}>
            <b>{formatNumber(evaluateComputed(item.compute, ctx.state), ctx.locale)}{item.suffix && <small>{item.suffix}</small>}</b>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressView({ block, ctx }: { block: ProgressBlock; ctx: BlockContext }) {
  const percent = Math.min(100, Math.max(0, evaluateComputed(block.compute, ctx.state)));
  return (
    <section className="stage-block stage-progress-block">
      <header><span>{block.label}</span><b>{percent}%</b></header>
      <div className="stage-progress"><i style={{ width: `${percent}%` }} /></div>
    </section>
  );
}

function ChartView({ block, ctx }: { block: ChartBlock; ctx: BlockContext }) {
  const spec = collectionSpec(ctx.definition, block.collection);
  const options = spec?.fields.find((field) => field.key === block.groupField)?.options ?? [];
  const records = recordsOf(ctx.state, block.collection);
  const measure = block.measure;
  const rows = options.map((option) => {
    const matching = records.filter((record) => record.values[block.groupField] === option);
    const value = measure === 'count'
      ? matching.length
      : Math.round(matching.reduce((sum, record) => sum + Number(record.values[measure.sum] ?? 0), 0) * 100) / 100;
    return { option, value };
  });
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="stage-block stage-chart">
      {block.title && <h2>{block.title}</h2>}
      <div className="stage-chart-rows">
        {rows.map((row, index) => (
          <div className="stage-chart-row" key={row.option}>
            <span>{row.option}</span>
            <div className="stage-chart-track"><i className={`tone-${index % 5}`} style={{ width: `${Math.round((row.value / max) * 100)}%` }} /></div>
            <b>{formatNumber(row.value, ctx.locale)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeaderboardView({ block, ctx }: { block: LeaderboardBlock; ctx: BlockContext }) {
  const records = [...recordsOf(ctx.state, block.collection)]
    .sort((left, right) => Number(right.values[block.scoreField] ?? 0) - Number(left.values[block.scoreField] ?? 0))
    .slice(0, block.limit ?? 5);
  const max = Math.max(1, ...records.map((record) => Number(record.values[block.scoreField] ?? 0)));
  return (
    <section className="stage-block stage-leaderboard">
      {block.title && <h2>{block.title}</h2>}
      {records.length === 0 && <p className="stage-empty">{ctx.copy.empty}</p>}
      <ol>
        {records.map((record, index) => {
          const score = Number(record.values[block.scoreField] ?? 0);
          return (
            <li className={index === 0 ? 'first' : ''} key={record.id}>
              <span className="stage-rank">{index + 1}</span>
              <div className="stage-rank-main">
                <strong>{String(record.values[block.labelField] ?? record.id)}</strong>
                <div className="stage-chart-track"><i style={{ width: `${Math.round((score / max) * 100)}%` }} /></div>
              </div>
              <b>{formatNumber(score, ctx.locale)}</b>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function StageBlockView({ block, ctx }: { block: StageBlock; ctx: BlockContext }) {
  if (block.type === 'hero') {
    return (
      <header className="service-hero">
        <span>{block.eyebrow}</span>
        <h1>{block.title}</h1>
        <p>{block.body}</p>
      </header>
    );
  }
  if (block.type === 'note') {
    return (
      <section className={`stage-block stage-note tone-${block.tone}`}>
        {block.title && <strong>{block.title}</strong>}
        <p>{block.body}</p>
      </section>
    );
  }
  if (block.type === 'form') return <FormView block={block} ctx={ctx} />;
  if (block.type === 'list') return <ListView block={block} ctx={ctx} />;
  if (block.type === 'board') return <BoardView block={block} ctx={ctx} />;
  if (block.type === 'stats') return <StatsView block={block} ctx={ctx} />;
  if (block.type === 'progress') return <ProgressView block={block} ctx={ctx} />;
  if (block.type === 'chart') return <ChartView block={block} ctx={ctx} />;
  return <LeaderboardView block={block} ctx={ctx} />;
}

export type { BlockContext };
