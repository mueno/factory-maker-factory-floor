'use client';

import { useMemo, useState } from 'react';
import { LanguageSwitch, useLocale } from './i18n';
import { SiteFooter } from './site-footer';
import type { ServiceDefinition, StageCommand, StageEvent, StageState } from './stage-runtime';
import { stageSummary } from './stage-runtime';

type GeneratedStageProps = {
  definition: ServiceDefinition;
  stageState: StageState;
  stageEvents: StageEvent[];
  revision: number;
  outputHash: string;
  mcpSupported: boolean;
  registeredTools: string[];
  verified: boolean;
  approved: boolean;
  canUndo: boolean;
  onCommand: (command: StageCommand) => unknown;
  onUndo: () => void;
  onShare: () => Promise<boolean>;
  onApprove: () => void;
  onBack: () => void;
};

const UI_COPY = {
  ja: {
    back: '工房に戻る', madeWith: 'Factory Makerで作成', shared: 'AIと同じ画面を共有中', local: 'この画面で試せます',
    story: 'もとになったアイデア', undo: '一つ前に戻す', share: '試せるリンクをコピー', sharedDone: 'リンクをコピーしました', shareFailed: 'リンクをコピーできませんでした',
    addPlaceholder: '新しい項目を入力', add: '追加する', votes: '票', vote: 'この案に投票', leading: '現在の一位', noVotes: '最初の一票を待っています',
    complete: '完了', remaining: '残り', candidate: '候補名', impact: '効果', effort: '工数', confidence: '確信度', calculate: 'おすすめを計算する',
    noResult: '候補を入力すると、ここにおすすめの進め方が表示されます。', score: '点',
    lanePilot: '小さく試す', laneEvidence: '根拠を補う', lanePark: 'いったん保留',
    humanKey: '公開を決めるのはあなたです', humanBody: 'AIは画面を組み立てたり、入力結果を更新したりできます。公開用の確定は、人が動作を確認してから行います。',
    verifyFirst: '工房に戻って動作確認を完了すると、この作品を公開用に確定できます。', approve: 'この作品を公開用に確定', approved: '公開用に確定しました',
    backstage: '舞台裏の記録', schema: '画面定義', tools: '現在のWebMCPツール', events: '直近の操作', emptyEvents: 'まだ操作はありません。',
  },
  en: {
    back: 'Back to the workshop', madeWith: 'Created with Factory Maker', shared: 'Sharing one screen with AI', local: 'Ready to try here',
    story: 'The idea behind this service', undo: 'Undo one step', share: 'Copy a link to try it', sharedDone: 'Link copied', shareFailed: 'Could not copy the link',
    addPlaceholder: 'Enter a new item', add: 'Add item', votes: 'votes', vote: 'Vote for this', leading: 'Current leader', noVotes: 'Waiting for the first vote',
    complete: 'complete', remaining: 'remaining', candidate: 'Candidate name', impact: 'Impact', effort: 'Effort', confidence: 'Confidence', calculate: 'Calculate a recommendation',
    noResult: 'Enter one candidate to see a recommended next step.', score: 'score',
    lanePilot: 'Run a small pilot', laneEvidence: 'Clarify the evidence', lanePark: 'Park for now',
    humanKey: 'You decide whether this is ready to publish', humanBody: 'AI can assemble the screen and update its working state. A person checks the experience before confirming a publishable snapshot.',
    verifyFirst: 'Return to the workshop and complete the checks before confirming a publishable snapshot.', approve: 'Confirm publishable snapshot', approved: 'Snapshot confirmed',
    backstage: 'Behind-the-scenes record', schema: 'Screen definition', tools: 'Current WebMCP tools', events: 'Recent interactions', emptyEvents: 'No interactions yet.',
  },
} as const;

function laneLabel(lane: 'Run a pilot' | 'Clarify evidence' | 'Park for now', locale: 'ja' | 'en') {
  const copy = UI_COPY[locale];
  if (lane === 'Run a pilot') return copy.lanePilot;
  if (lane === 'Clarify evidence') return copy.laneEvidence;
  return copy.lanePark;
}

export function GeneratedStage({ definition, stageState, stageEvents, revision, outputHash, mcpSupported, registeredTools, verified, approved, canUndo, onCommand, onUndo, onShare, onApprove, onBack }: GeneratedStageProps) {
  const { locale } = useLocale();
  const copy = UI_COPY[locale];
  const [newItem, setNewItem] = useState('');
  const [candidateName, setCandidateName] = useState(locale === 'ja' ? '最初に試すサービス案' : 'First service pilot');
  const [impact, setImpact] = useState(4);
  const [effort, setEffort] = useState(2);
  const [confidence, setConfidence] = useState(4);
  const [shareStatus, setShareStatus] = useState<'idle' | 'done' | 'failed'>('idle');
  const summary = useMemo(() => stageSummary(stageState), [stageState]);

  const addItem = () => {
    if (!newItem.trim()) return;
    onCommand({ action: 'add_item', label: newItem });
    setNewItem('');
  };

  const share = async () => {
    setShareStatus(await onShare() ? 'done' : 'failed');
  };

  return (
    <main className={`preview-shell service-preview theme-${definition.theme}`}>
      <header className="preview-header">
        <button type="button" onClick={onBack}>← {copy.back}</button>
        <div><span>{copy.madeWith}</span><strong>{definition.title}</strong></div>
        <div className="preview-controls">
          <LanguageSwitch compact />
          <span className={`protocol-pill ${mcpSupported ? '' : 'offline'}`}><i aria-hidden="true" />{mcpSupported ? copy.shared : copy.local}</span>
        </div>
      </header>

      <section className="generated-stage-shell">
        <div className="stage-command-bar">
          <div><span>{copy.story}</span><p>{definition.sourceSummary}</p></div>
          <div className="stage-command-actions">
            <button type="button" onClick={onUndo} disabled={!canUndo}>↶ {copy.undo}</button>
            <button type="button" onClick={share}>↗ {copy.share}</button>
          </div>
        </div>
        {shareStatus !== 'idle' && <p className={`share-status ${shareStatus}`} role="status">{shareStatus === 'done' ? copy.sharedDone : copy.shareFailed}</p>}

        <section className="service-canvas" aria-label={definition.title}>
          {definition.blocks.map((block) => {
            if (block.type === 'hero') return (
              <header className="service-hero" key={block.id}>
                <span>{block.eyebrow}</span>
                <h1>{block.title}</h1>
                <p>{block.body}</p>
              </header>
            );
            if (block.type === 'voting-board' && stageState.kind === 'voting') return (
              <section className="service-workspace voting-workspace" key={block.id}>
                <h2>{block.prompt}</h2>
                <div className="vote-options">
                  {stageState.options.map((option, index) => (
                    <article className={stageState.lastVoteId === option.id ? 'just-voted' : ''} key={option.id}>
                      <span className="option-number">0{index + 1}</span>
                      <strong>{option.label}</strong>
                      <p><b>{option.votes}</b> {copy.votes}</p>
                      <button type="button" onClick={() => onCommand({ action: 'cast_vote', option_id: option.id })}>{copy.vote}</button>
                    </article>
                  ))}
                </div>
                <form className="stage-add-form" onSubmit={(event) => { event.preventDefault(); addItem(); }}>
                  <label><span>{block.addLabel}</span><input value={newItem} maxLength={60} placeholder={copy.addPlaceholder} onChange={(event) => setNewItem(event.target.value)} /></label>
                  <button type="submit" disabled={!newItem.trim()}>{copy.add}</button>
                </form>
              </section>
            );
            if (block.type === 'progress-list' && stageState.kind === 'planner') return (
              <section className="service-workspace planner-workspace" key={block.id}>
                <h2>{block.prompt}</h2>
                <div className="task-list">
                  {stageState.tasks.map((task, index) => (
                    <button className={task.done ? 'done' : ''} type="button" key={task.id} onClick={() => onCommand({ action: 'toggle_task', task_id: task.id })}>
                      <span>{task.done ? '✓' : index + 1}</span><strong>{task.label}</strong><i aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <form className="stage-add-form" onSubmit={(event) => { event.preventDefault(); addItem(); }}>
                  <label><span>{block.addLabel}</span><input value={newItem} maxLength={60} placeholder={copy.addPlaceholder} onChange={(event) => setNewItem(event.target.value)} /></label>
                  <button type="submit" disabled={!newItem.trim()}>{copy.add}</button>
                </form>
              </section>
            );
            if (block.type === 'decision-score' && stageState.kind === 'decision') return (
              <section className="service-workspace decision-workspace" key={block.id}>
                <h2>{block.prompt}</h2>
                <form onSubmit={(event) => { event.preventDefault(); onCommand({ action: 'score_candidate', name: candidateName, impact, effort, confidence }); }}>
                  <label className="candidate-field"><span>{copy.candidate}</span><input value={candidateName} maxLength={80} onChange={(event) => setCandidateName(event.target.value)} /></label>
                  <div className="stage-range-grid">
                    <StageRange label={copy.impact} value={impact} onChange={setImpact} />
                    <StageRange label={copy.effort} value={effort} onChange={setEffort} />
                    <StageRange label={copy.confidence} value={confidence} onChange={setConfidence} />
                  </div>
                  <button className="stage-primary-action" type="submit">{copy.calculate}</button>
                </form>
              </section>
            );
            if (block.type === 'live-summary') return (
              <section className="service-summary" key={block.id} aria-live="polite">
                <span>{block.label}</span>
                {summary.kind === 'voting' && <>{summary.total_votes > 0 ? <><strong>{copy.leading}: {summary.leading_option}</strong><p>{summary.total_votes} {copy.votes}</p></> : <strong>{copy.noVotes}</strong>}</>}
                {summary.kind === 'planner' && <><strong>{summary.percent}% {copy.complete}</strong><div className="stage-progress"><i style={{ width: `${summary.percent}%` }} /></div><p>{summary.complete}/{summary.total} {copy.complete} · {Math.max(0, summary.total - summary.complete)} {copy.remaining}</p></>}
                {summary.kind === 'decision' && <>{summary.result ? <><strong>{laneLabel(summary.result.lane, locale)}</strong><div className="stage-score"><b>{summary.result.score}</b><small>{copy.score}</small></div><p>{summary.result.name}</p></> : <strong>{copy.noResult}</strong>}</>}
              </section>
            );
            return null;
          })}
        </section>

        <section className="stage-human-boundary">
          <div><span aria-hidden="true">◇</span><div><strong>{copy.humanKey}</strong><p>{copy.humanBody}</p></div></div>
          {verified ? <button type="button" disabled={approved} onClick={onApprove}>{approved ? `✓ ${copy.approved}` : copy.approve}</button> : <p>{copy.verifyFirst}</p>}
        </section>

        <details className="stage-backstage">
          <summary>{copy.backstage}</summary>
          <div className="stage-backstage-grid">
            <section><span>{copy.schema}</span><code>{definition.schemaVersion} · {definition.kind} · r{revision} · {outputHash}</code></section>
            <section><span>{copy.tools}</span><code>{registeredTools.length ? registeredTools.join(' · ') : '—'}</code></section>
            <section><span>{copy.events}</span>{stageEvents.length ? <ol>{stageEvents.slice(0, 5).map((event) => <li key={event.seq}><b>{event.action}</b><small>{event.actor} · #{event.seq}</small></li>)}</ol> : <p>{copy.emptyEvents}</p>}</section>
          </div>
        </details>
      </section>
      <SiteFooter />
    </main>
  );
}

function StageRange({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><span>{label}<b>{value}</b></span><input type="range" min="1" max="5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
