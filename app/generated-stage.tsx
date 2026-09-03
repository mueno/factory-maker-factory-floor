'use client';

import { useMemo, useState } from 'react';
import { LanguageSwitch, useLocale } from './i18n';
import { SiteFooter } from './site-footer';
import { StageBlockView, type BlockCopy } from './stage/blocks';
import { stageSummary } from './stage';
import type { ServiceDefinition, StageCommand, StageEvent, StageState } from './stage';

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
    back: 'スタジオに戻る', madeWith: 'Factory Makerで作成', shared: 'AIと同じ画面を共有中', local: 'この画面で試せます',
    story: 'もとになったアイデア', undo: '一つ前に戻す', share: '試せるリンクをコピー', sharedDone: 'リンクをコピーしました', shareFailed: 'リンクをコピーできませんでした',
    humanKey: '公開を決めるのはあなたです', humanBody: 'AIは画面の組み立てとデータ更新まで。公開用の確定は、人が動作を確認してから行います。',
    verifyFirst: 'スタジオに戻って動作確認を完了すると、この作品を公開用に確定できます。', approve: 'この作品を公開用に確定', approved: '公開用に確定しました',
    backstage: '舞台裏の記録', schema: '画面定義', tools: '現在のWebMCPツール', events: '直近の操作', emptyEvents: 'まだ操作はありません。',
    blocks: { empty: 'まだ何もありません。最初の1件を追加してみてください。', remove: '削除', move: '移動', submitFallback: '追加する', requiredHint: '「{field}」を入力してください', records: '件' },
  },
  en: {
    back: 'Back to the studio', madeWith: 'Created with Factory Maker', shared: 'Sharing one screen with AI', local: 'Ready to try here',
    story: 'The idea behind this service', undo: 'Undo one step', share: 'Copy a link to try it', sharedDone: 'Link copied', shareFailed: 'Could not copy the link',
    humanKey: 'You decide whether this is ready to publish', humanBody: 'AI assembles the screens and updates the data. A person checks the experience before confirming a publishable snapshot.',
    verifyFirst: 'Return to the studio and complete the checks before confirming a publishable snapshot.', approve: 'Confirm publishable snapshot', approved: 'Snapshot confirmed',
    backstage: 'Behind-the-scenes record', schema: 'Screen definition', tools: 'Current WebMCP tools', events: 'Recent interactions', emptyEvents: 'No interactions yet.',
    blocks: { empty: 'Nothing here yet — add the first record.', remove: 'Remove', move: 'Move to', submitFallback: 'Add', requiredHint: 'Please fill in “{field}”', records: 'records' },
  },
} as const;

export function GeneratedStage({ definition, stageState, stageEvents, revision, outputHash, mcpSupported, registeredTools, verified, approved, canUndo, onCommand, onUndo, onShare, onApprove, onBack }: GeneratedStageProps) {
  const { locale } = useLocale();
  const copy = UI_COPY[locale];
  const [activeView, setActiveView] = useState(definition.views[0]?.key ?? '');
  const [shareStatus, setShareStatus] = useState<'idle' | 'done' | 'failed'>('idle');
  const summary = useMemo(() => stageSummary(definition, stageState), [definition, stageState]);
  const view = definition.views.find((item) => item.key === activeView) ?? definition.views[0];
  const blockCopy: BlockCopy = copy.blocks;

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
          {definition.views.length > 1 && (
            <nav className="stage-view-tabs" role="tablist">
              {definition.views.map((item) => (
                <button aria-selected={item.key === view.key} key={item.key} onClick={() => setActiveView(item.key)} role="tab" type="button">{item.label}</button>
              ))}
            </nav>
          )}
          <div className="stage-view-body">
            {view.blocks.map((block, index) => (
              <StageBlockView block={block} ctx={{ definition, state: stageState, locale, copy: blockCopy, onCommand }} key={`${view.key}-${index}`} />
            ))}
          </div>
        </section>

        <section className="stage-human-boundary">
          <div><span aria-hidden="true">◇</span><div><strong>{copy.humanKey}</strong><p>{copy.humanBody}</p></div></div>
          {verified ? <button type="button" disabled={approved} onClick={onApprove}>{approved ? `✓ ${copy.approved}` : copy.approve}</button> : <p>{copy.verifyFirst}</p>}
        </section>

        <details className="stage-backstage">
          <summary>{copy.backstage}</summary>
          <div className="stage-backstage-grid">
            <section>
              <span>{copy.schema}</span>
              <code>{definition.schemaVersion} · r{revision} · {outputHash}</code>
              <code>{Object.entries(summary.collections).map(([key, info]) => `${key} ${info.count}/${info.cap}`).join(' · ')}</code>
            </section>
            <section><span>{copy.tools}</span><code>{registeredTools.length ? registeredTools.join(' · ') : '—'}</code></section>
            <section><span>{copy.events}</span>{stageEvents.length ? <ol>{stageEvents.slice(0, 5).map((event) => <li key={event.seq}><b>{event.action}</b><small>{event.actor} · #{event.seq}</small></li>)}</ol> : <p>{copy.emptyEvents}</p>}</section>
          </div>
        </details>
      </section>
      <SiteFooter />
    </main>
  );
}
