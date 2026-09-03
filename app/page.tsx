'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageSwitch, type Locale, useLocale } from './i18n';
import { SiteFooter } from './site-footer';

type Phase = 'brief' | 'brief_review' | 'concept_ready' | 'concept_review' | 'contract_ready' | 'contract_review' | 'build_ready' | 'evidence_ready' | 'verified';
type Actor = 'agent' | 'human' | 'system';
type EvidenceStatus = 'pass' | 'blocked';
type StructuredBrief = { summary: string; audience: string; outcome: string };
type Concept = { id: string; label: string; promise: string; primaryAction: string; accent: 'blue' | 'amber' | 'violet' };
type BuildContract = { productName: string; template: string; goal: string; primaryAction: string; agentPermission: string; humanBoundary: string };
type Evidence = { id: string; label: string; detail: string; status: EvidenceStatus };
type FactoryEvent = { id: string; actor: Actor; action: string; detail: string; revision: number; at: string };
type PreviewResult = { name: string; score: number; lane: 'Run a pilot' | 'Clarify evidence' | 'Park for now'; rationale: string };
type FactoryState = {
  phase: Phase; revision: number; rawBrief: string; brief: StructuredBrief | null; briefAccepted: boolean;
  concepts: Concept[]; selectedConceptId: string | null; contract: BuildContract | null; contractFrozen: boolean;
  generated: boolean; outputHash: string | null; evidence: Evidence[]; events: FactoryEvent[]; previewResult: PreviewResult | null; pilotApproved: boolean;
};
type JsonSchema = Record<string, unknown>;
type ToolDefinition = {
  name: string; title?: string; description: string; inputSchema?: JsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, signal?: AbortSignal) => unknown | Promise<unknown>;
};
type ModelContext = { registerTool: (tool: ToolDefinition, options?: { signal?: AbortSignal }) => Promise<void> };
type WorkshopEffect = 'idle' | 'crafting' | 'poof';
type SpriteKind = 'wizard' | 'fairy' | 'dwarf';

const STORAGE_KEY = 'factory-floor-state-v1';
const demoBrief = 'I need a small tool for a consultancy to triage incoming AI project ideas. It should help people decide what to test first and keep final decisions with a human.';
const demoBriefJa = 'AIを活用した新規事業案を整理し、どれを先に試すか判断できる小さなサービスをつくりたい。最終判断は人が行い、判断の根拠も残したい。';
const concepts: Concept[] = [
  { id: 'decision-board', label: 'Decision Board', promise: 'Compare ideas by impact, effort, and evidence before a person approves the next test.', primaryAction: 'Score a project candidate', accent: 'blue' },
  { id: 'guided-intake', label: 'Guided Intake', promise: 'Turn an unstructured request into a complete, reviewable project brief.', primaryAction: 'Complete a bounded intake', accent: 'amber' },
  { id: 'evidence-queue', label: 'Evidence Queue', promise: 'Track assumptions, supporting signals, and questions that block a responsible decision.', primaryAction: 'Review an evidence gap', accent: 'violet' },
];
const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
const initialState: FactoryState = {
  phase: 'brief', revision: 0, rawBrief: '', brief: null, briefAccepted: false, concepts: [], selectedConceptId: null,
  contract: null, contractFrozen: false, generated: false, outputHash: null, evidence: [], previewResult: null, pilotApproved: false,
  events: [{ id: 'event-0', actor: 'system', action: 'Workspace opened', detail: 'Blank factory state created.', revision: 0, at: 'Now' }],
};

const spritePatterns: Record<SpriteKind, string[]> = {
  wizard: [
    '....V.......', '...VVV......', '..VVVVV.....', '.VVVVVVV....',
    '...SSS......', '..SDSDS.....', '...SWS......', '...BBB......',
    '..BBBBB.....', '.BBBYBBB....', '..B.B.B.....', '.BB...BB....',
  ],
  fairy: [
    '.....Y......', '.C...Y...C..', '..C.SSS.C...', '...SDSDS....',
    '..C.SSS.C...', '.CC..PPP.CC.', '..C.PPP.C...', '....PPP.....',
    '...PPPPP....', '....P.P.....', '...P...P....', '..P.....P...',
  ],
  dwarf: [
    '...RRRR.....', '..RRRRRR....', '..R....R....', '...SSSS.....',
    '..SDSDS.....', '...OOO......', '..OOOOO.....', '...GGG......',
    '..GGGGG.....', '.GGGHGGG....', '..G.G.G.....', '.KK...KK....',
  ],
};

const spriteTone: Record<string, string> = {
  V: 'violet', S: 'skin', D: 'ink', W: 'white', B: 'blue', Y: 'gold',
  C: 'wing', P: 'pink', R: 'red', O: 'orange', G: 'green', H: 'wood', K: 'boot',
};

const COPY = {
  en: {
    brandTag: 'A human-led service workshop with an AI crew', protocolLive: 'WebMCP familiar online', protocolFallback: 'UI mode',
    heroKicker: 'A 16-BIT SERVICE WORKSHOP', heroTitle: 'Cast a rough idea into a service you can test.',
    heroLead: 'Cast a rough idea', heroAction: 'into a service', heroDestination: 'you can test.',
    heroBody: 'Write the idea on a shared scroll. The AI crew shapes the brief, routes, and build; you choose the route, seal the contract, and decide what moves forward.',
    revision: 'SCROLL', sharedState: 'Shared with the crew', trailLabel: 'WORKSHOP QUEST',
    stages: ['Spell', 'Route', 'Craft', 'Reveal'], stageNotes: ['Shape the intent', 'Choose one path', 'Seal and assemble', 'Try the result'],
    statusDone: 'Complete', statusActive: 'Now', statusWaiting: 'Waiting', human: 'HUMAN', agent: 'AGENT', both: 'HUMAN + AGENT', currentArtifact: 'CURRENT ARTIFACT',
    requestTitle: 'What service will you summon?', requestBody: 'You are the workshop mage. Describe the outcome you want, and the AI crew will draft a short scroll for your review.',
    requestLabel: 'What should this service make possible?', requestPlaceholder: 'For example: Build a small service that helps…', useExample: 'Load a sample spell',
    dataNote: 'This scroll is stored in your browser. Use fictional or non-sensitive information.', organize: 'Shape the spell', restage: 'Rewrite the brief scroll',
    structuredBrief: 'BRIEF SCROLL', audience: 'Audience', outcome: 'Desired outcome', humanCheckpoint: 'MAGE CHECKPOINT', acceptPrompt: 'Check that the scroll matches your intent before the crew continues.', acceptBrief: 'Approve this scroll',
    directionTitle: 'Choose the route the crew will build', directionBody: 'The AI crew can draw three bounded routes. Only you can select the one that becomes the build contract.',
    directionEmpty: 'The approved scroll is ready for three traceable routes.', makeConcepts: 'Draw 3 routes', selectedByYou: 'Selected by you', selectDirection: 'Take this route',
    buildTitle: 'Seal the build scroll before crafting', buildBody: 'The visible contract limits what the crew may build. Any later change creates a new revision.',
    contractEmpty: 'The selected route is ready for a bounded build scroll.', stageContract: 'Draft the build scroll', contractLabel: 'BUILD SCROLL',
    product: 'Product', template: 'Template', goal: 'Goal', primaryAction: 'Primary action', agentMay: 'Agent may', humanKeeps: 'Human keeps',
    freezeBoundary: 'MAGE DECISION', freezePrompt: 'Sealing fixes the target and opens the crafting step.', freeze: 'Seal the build scroll', contractFrozen: 'Build scroll sealed',
    generatePrompt: 'The crew can now assemble one allowlisted template from this exact contract.', generate: 'Ask the crew to build',
    craftingTitle: 'THE CREW IS CRAFTING', craftLogs: ['Pip the fairy is mapping the interface…', 'Dock the dwarf is forging the state controls…', 'The crew is locking the final pieces to this revision…'], poofTitle: 'POOF!', poofBody: 'The service is coming out of the workshop.', skipAnimation: 'Skip the scene',
    verifyTitle: 'Unbox the service and test it', verifyBody: 'The result, its source scroll, and deterministic checks stay connected by revision and output hash.',
    generatedOutput: 'UNBOXED SERVICE', openApp: 'Enter the service',
    verifyEmpty: 'Run checks for the frozen contract, stale writes, WebMCP, human authority, and UI read-back.', runChecks: 'Run evidence checks',
    verifiedTitle: 'Evidence attached. Human authority preserved.', verifiedBody: 'Passing these checks demonstrates this bounded workflow; it is not a production-readiness certification.',
    fairyName: 'PIP · INTERFACE FAIRY', fairyGuide: 'Open the blue door to try the service. You and the browser agent will see the same result.',
    dwarfName: 'DOCK · STATE SMITH', dwarfGuide: 'The revision and output hash are bolted together. Run the checks before you approve anything.',
    operation: 'WORKSHOP CREW', toolsHere: 'Magic tools ready now', operationBody: 'The AI crew receives only the tools needed for this stage. Any change must target the current revision.',
    read: 'READ', write: 'WRITE', toolsRegistered: 'tools registered on document.modelContext', unsupported: 'Open in a WebMCP-capable browser to expose these tools.',
    authority: 'You carry the decision key', authorityBody: 'The AI cannot choose a route, seal the contract, approve a pilot, or release an app.', latest: 'LATEST WORKSHOP MOVE',
    recentChanges: 'Workshop log and recovery', ledgerSummary: 'Every change has an owner and revision.', undo: 'Undo latest crew change', copy: 'Copy shared state', reset: 'Reset workshop',
    resetConfirm: 'Reset the local demo state? This removes this workflow from your browser.', resetDone: 'The demo was reset on this device.', copied: 'Shared state copied to the clipboard.', agentStep: 'AGENT-AVAILABLE STEP',
    defaultAudience: 'Small teams evaluating AI-enabled service ideas', defaultOutcome: 'Choose one evidence-backed idea for a bounded pilot',
    previewBack: 'Back to Factory Maker', previewFrom: 'GENERATED FROM FROZEN CONTRACT', previewQuestion: 'Which idea deserves a pilot next?',
    previewBody: 'Score one candidate. The recommendation is visible to both person and agent, but only a person can approve the pilot.', factoryRevision: 'FACTORY REVISION', contractLocked: 'Contract locked',
    projectInput: 'PROJECT INPUT', scoreCandidate: 'Score a candidate', bounded: 'Bounded', projectName: 'Project name', fictionalData: 'Use fictional or non-sensitive evaluation data.',
    impact: 'Impact', effort: 'Effort', confidence: 'Confidence', calculate: 'Calculate recommendation', recommendedLane: 'RECOMMENDED LANE', score: 'SCORE',
    approve: 'Approve pilot — human only', approved: 'Approved by you ✓', sameResult: 'This is the same result returned to the browser agent.', noScore: 'No score yet',
    noScoreBody: 'Use the form or ask the browser agent to call', agentCan: 'AGENT CAN', agentCanBody: 'Read state · score a candidate · explain the result', humanKeepsBody: 'Approval · exceptions · release authority',
  },
  ja: {
    brandTag: '魔法使いとAI職人たちのサービス工房', protocolLive: 'WebMCP 妖精リンク ON', protocolFallback: '通常UI',
    heroKicker: '16-BIT サービス工房', heroTitle: 'ひらめきを、動くサービスへ召喚。',
    heroLead: 'ひらめきを、', heroAction: '動くサービスへ', heroDestination: '召喚。',
    heroBody: '作りたいものを共有の巻物に書くと、AI職人が企画要旨、方向案、動く画面を組み立てます。進む道を選び、仕様を封印し、公開を決めるのはあなたです。',
    revision: '巻物', sharedState: '工房で共有', trailLabel: '工房クエスト',
    stages: ['呪文', '道しるべ', '組み立て', 'お披露目'], stageNotes: ['意図を整える', '進む道を選ぶ', '仕様を封印して生成', '完成品を試す'],
    statusDone: '完了', statusActive: '現在', statusWaiting: '待機中', human: '人', agent: 'AI', both: '人 + AI', currentArtifact: '現在の成果物',
    requestTitle: 'どんなサービスを\u200B召喚しますか？', requestBody: 'あなたが工房を導く魔法使いです。実現したい結果を書くと、AI職人が確認用の短い巻物にまとめます。',
    requestLabel: 'このサービスで、何をできるようにしたいですか？', requestPlaceholder: '例：○○に困っている人が、△△できる小さなサービスを作りたい', useExample: 'おためしの呪文を読む',
    dataNote: 'この巻物はブラウザ内に保存されます。架空または機密性のない情報をお使いください。', organize: '呪文を整える', restage: '企画の巻物を書き直す',
    structuredBrief: '企画の巻物', audience: '利用する人', outcome: '実現したい結果', humanCheckpoint: '魔法使いの確認', acceptPrompt: 'AI職人がまとめた内容を読み、意図どおりか確かめてください。', acceptBrief: 'この巻物で進む',
    directionTitle: '職人たちが作る道を\u200B選ぶ', directionBody: 'AI職人が範囲を絞った3つの方向案を描きます。実際に組み立てる一案は、あなたが選びます。',
    directionEmpty: '承認した巻物から、根拠を追える3つの道を描けます。', makeConcepts: '3つの道を描く', selectedByYou: '選択済み', selectDirection: 'この道を進む',
    buildTitle: '組み立てる範囲を\u200B巻物に封印する', buildBody: '画面上の構築仕様で、AI職人が作れる範囲を限定します。封印後の変更は、新しい版として記録します。',
    contractEmpty: '選んだ道から、範囲を限定した構築の巻物を作れます。', stageContract: '構築の巻物を作る', contractLabel: '構築の巻物',
    product: 'サービス名', template: 'テンプレート', goal: '目的', primaryAction: '主な操作', agentMay: 'AIに任せること', humanKeeps: '人が決めること',
    freezeBoundary: '魔法使いが決める工程', freezePrompt: '封印すると構築対象が確定し、組み立てへ進めます。', freeze: '構築の巻物を封印する', contractFrozen: '構築の巻物は封印済み',
    generatePrompt: 'この巻物だけを使い、許可済みテンプレートから動く画面を組み立てます。', generate: '職人たちに組み立てを頼む',
    craftingTitle: '小人と妖精が組み立て中', craftLogs: ['妖精ピピが画面の配置を描いています…', '小人ドックが状態管理の歯車を鍛えています…', '職人たちが最後の部品を現在の版へ固定しています…'], poofTitle: 'ボカンッ！', poofBody: '完成したサービスが工房から飛び出します。', skipAnimation: '演出を省略して完成へ',
    verifyTitle: '完成したサービスを\u200B開いて確かめる', verifyBody: '成果物、元の巻物、検証結果を、版番号と出力ハッシュで結び付けて確認します。',
    generatedOutput: '工房から届いたサービス', openApp: '完成したサービスに入る',
    verifyEmpty: '固定した仕様、古い書き込みの拒否、WebMCP、人の権限、画面への反映を検証します。', runChecks: '検証を実行する',
    verifiedTitle: '根拠を添付し、人の決定権を確認しました。', verifiedBody: 'ここでの合格は、この限定された流れの確認結果です。本番運用できることを保証するものではありません。',
    fairyName: '妖精ピピ · 画面づくり', fairyGuide: '青い扉から完成したサービスに入れます。人とブラウザ内のAIは、同じ結果を確認できます。',
    dwarfName: '小人ドック · 状態管理', dwarfGuide: '版番号と出力ハッシュを固定したぞ。承認する前に、検証ボタンで根拠を確かめよう。',
    operation: '工房のAI職人たち', toolsHere: 'いま使える魔法道具', operationBody: 'AI職人には、この工程に必要な道具だけを渡します。変更には現在の版番号が必要です。',
    read: '読取', write: '変更', toolsRegistered: '個のツールを document.modelContext に登録済み', unsupported: 'WebMCP対応ブラウザで開くと、これらのツールをAIが利用できます。',
    authority: '最終決定の鍵は、あなたが持ちます', authorityBody: 'AI職人は道の選択、仕様の封印、試行の承認、公開を行えません。', latest: '工房の直近作業',
    recentChanges: '工房日誌とやり直し', ledgerSummary: 'すべての変更に、担当者と版番号が付きます。', undo: 'AI職人の直前操作を取り消す', copy: '共有状態をコピー', reset: '工房を初期化',
    resetConfirm: 'このブラウザに保存したデモの作業内容を削除し、最初からやり直しますか？', resetDone: 'この端末のデモを初期化しました。', copied: '共有状態をクリップボードにコピーしました。', agentStep: 'AIが実行できる工程',
    defaultAudience: 'AIを活用したサービス案を検討する小規模チーム', defaultOutcome: '根拠のある一案を選び、範囲を絞った試行へ進める',
    previewBack: 'Factory Makerに戻る', previewFrom: '固定した仕様から生成', previewQuestion: '次に試す価値がある案はどれ？',
    previewBody: '候補を一つ評価します。人とAIは同じ結果を見ますが、試行を承認できるのは人だけです。', factoryRevision: 'Factory Makerの版', contractLocked: '仕様固定済み',
    projectInput: '候補の入力', scoreCandidate: '候補を評価する', bounded: '範囲限定', projectName: '候補名', fictionalData: '架空または機密性のない評価データをお使いください。',
    impact: '効果', effort: '工数', confidence: '確信度', calculate: '推奨結果を計算する', recommendedLane: '推奨する進め方', score: '点',
    approve: '試行を承認する（人のみ）', approved: '承認済み ✓', sameResult: 'ブラウザ内のAIにも、同じ結果が返ります。', noScore: 'まだ評価していません',
    noScoreBody: 'フォームを使うか、ブラウザ内のAIに次のツールを依頼してください：', agentCan: 'AIができること', agentCanBody: '状態の読取・候補の採点・結果の説明', humanKeepsBody: '承認・例外判断・公開の決定',
  },
} as const;

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `ff-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function eventFor(actor: Actor, action: string, detail: string, revision: number): FactoryEvent {
  return { id: `${revision}-${action.toLowerCase().replaceAll(' ', '-')}`, actor, action, detail, revision, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
}
function publicState(state: FactoryState) {
  return {
    phase: state.phase, revision: state.revision, brief: state.brief, briefAccepted: state.briefAccepted,
    concepts: state.concepts.map(({ id, label, promise }) => ({ id, label, promise })), selectedConceptId: state.selectedConceptId,
    contract: state.contract, contractFrozen: state.contractFrozen, generated: state.generated, outputHash: state.outputHash, evidence: state.evidence, pilotApproved: state.pilotApproved,
    blockers: [!state.briefAccepted && 'A human must accept the structured brief.', !state.selectedConceptId && 'A human must select one concept.', !state.contractFrozen && 'A human must freeze the build contract.', !state.generated && 'The bounded preview has not been generated.', state.evidence.some((item) => item.status === 'blocked') && 'At least one evidence check is blocked.'].filter(Boolean),
  };
}
function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null;
  return (document as Document & { modelContext?: ModelContext }).modelContext ?? null;
}
function conceptForDisplay(concept: Concept, locale: Locale) {
  if (locale === 'en') return concept;
  const translated: Record<string, Pick<Concept, 'label' | 'promise' | 'primaryAction'>> = {
    'decision-board': { label: '意思決定ボード', promise: '効果、工数、根拠を並べ、人が次に試す案を承認できるようにします。', primaryAction: '候補を採点する' },
    'guided-intake': { label: '企画整理ガイド', promise: '曖昧な依頼を、漏れがなく確認できる企画要旨へ整理します。', primaryAction: '範囲を絞って依頼を整理する' },
    'evidence-queue': { label: '根拠キュー', promise: '仮説、裏付け、判断を止めている未確認事項を一か所で追跡します。', primaryAction: '不足している根拠を確認する' },
  };
  return { ...concept, ...translated[concept.id] };
}
function translatedLane(lane: PreviewResult['lane'], locale: Locale) {
  if (locale === 'en') return lane;
  return lane === 'Run a pilot' ? '小さく試す' : lane === 'Clarify evidence' ? '根拠を補う' : 'いったん保留';
}
function translatedAction(action: string, locale: Locale) {
  if (locale === 'en') return action;
  const labels: Record<string, string> = {
    'Workspace opened': '作業場所を開きました', 'Brief staged': '企画要旨を整理しました', 'Brief accepted': '企画要旨を承認しました',
    'Concepts staged': '3つの方向案を作成しました', 'Concept selected': '方向案を選択しました', 'Contract staged': '構築仕様を作成しました',
    'Contract frozen': '構築仕様を固定しました', 'Preview generated': '動くサービスを生成しました', 'Evidence gate run': '検証を実行しました',
    'Evidence undone': '検証結果を取り消しました', 'Preview undone': '生成結果を取り消しました', 'Contract undone': '構築仕様案を取り消しました',
    'Concepts undone': '方向案を取り消しました', 'Brief undone': '企画要旨を取り消しました', 'Candidate scored': '候補を採点しました', 'Pilot approved': '試行を承認しました',
  };
  return labels[action] ?? action;
}
function translatedEvidence(item: Evidence, locale: Locale): Evidence {
  if (locale === 'en') return item;
  const labels: Record<string, string> = { contract: '固定した仕様', revision: '古い書き込みの拒否', tools: 'ページ上のWebMCP', boundary: '人の決定権', readback: '画面への反映' };
  const details: Record<string, string> = {
    contract: '生成結果を、この出力ハッシュと固定仕様に結び付けました。', revision: '一つ前の版への書き込みを拒否し、状態が変わらないことを確認しました。',
    tools: item.status === 'pass' ? 'document.modelContext が、この工程のツールを受け付けました。' : 'この確認にはWebMCP対応ブラウザが必要です。',
    boundary: '方向の選択と仕様固定が、人の操作として記録されています。', readback: '仕様、版番号、出力ハッシュ、ツールの状態が同じデータを参照しています。',
  };
  return { ...item, label: labels[item.id] ?? item.label, detail: details[item.id] ?? item.detail };
}
function translatedNotice(message: string, locale: Locale) {
  if (locale === 'en') return message;
  if (message.startsWith('Blocked stale write')) return '古い版への書き込みを拒否しました。現在の版を読み直してください。';
  if (message.startsWith('Generated app scored')) return '生成したサービスが候補を採点し、画面上の結果を更新しました。';
  if (message.endsWith('selected by a human.')) return '人が構築する方向を選びました。';
  const messages: Record<string, string> = {
    'Ready for a human or browser agent.': '人またはブラウザ内のAIから始められます。',
    'The agent staged a structured brief. Human acceptance is required.': 'AIが企画要旨を整理しました。内容を人が確認してください。',
    'Three concepts are ready. Only a human can choose one.': '3つの方向案ができました。構築する案は人が選びます。',
    'Build contract staged. The agent cannot freeze it.': '構築仕様案ができました。固定できるのは人だけです。',
    'Working micro-app generated. Open it or run the evidence gate.': '動くサービスを生成しました。開いて試すか、検証を実行してください。',
    'Evidence gate passed. The output remains human-controlled.': '検証に合格しました。最終的な決定権は人に残っています。',
    'Evidence recorded; WebMCP browser verification is still required.': '検証結果を記録しました。WebMCP対応ブラウザでの確認が一つ残っています。',
    'Last reversible agent change was undone with a compensating revision.': '取り消せる直前のAI操作を、新しい版として打ち消しました。',
    'Brief accepted by a human. Concept staging is now available.': '人が企画要旨を承認しました。方向案を作成できます。',
    'Contract frozen by a human. The build tool is now available.': '人が構築仕様を固定しました。生成へ進めます。',
    'Pilot approved by a human and recorded in the shared ledger.': '人が試行を承認し、共有履歴に記録しました。',
    'Factory reset to a clean demo state.': 'この端末のデモを初期化しました。', 'Shared state copied to clipboard.': '共有状態をクリップボードにコピーしました。',
  };
  return messages[message] ?? message;
}

function PixelSprite({ kind, className = '' }: { kind: SpriteKind; className?: string }) {
  return (
    <span className={`pixel-sprite pixel-${kind} ${className}`} aria-hidden="true">
      {spritePatterns[kind].flatMap((row, rowIndex) => row.split('').map((tone, columnIndex) => (
        <i className={spriteTone[tone] ? `pixel-tone-${spriteTone[tone]}` : ''} key={`${rowIndex}-${columnIndex}`} />
      )))}
    </span>
  );
}

export default function Home() {
  const { locale } = useLocale();
  const t = COPY[locale];
  const [state, setState] = useState<FactoryState>(initialState);
  const [mcpSupported, setMcpSupported] = useState(false);
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [view, setView] = useState<'factory' | 'preview'>('factory');
  const [notice, setNotice] = useState('Ready for a human or browser agent.');
  const [workshopEffect, setWorkshopEffect] = useState<WorkshopEffect>('idle');
  const [craftCountdown, setCraftCountdown] = useState(3);
  const stateRef = useRef(state);
  const mcpSupportedRef = useRef(false);
  const craftRevisionRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FactoryState;
        stateRef.current = parsed;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(parsed);
      }
    } catch { window.localStorage.removeItem(STORAGE_KEY); }
  }, []);

  const replaceState = useCallback((updater: (previous: FactoryState) => FactoryState) => {
    setState((previous) => {
      const next = updater(previous); stateRef.current = next; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next;
    });
  }, []);
  const stale = useCallback((expected: unknown, current: FactoryState) => {
    if (expected !== current.revision) {
      setNotice(`Blocked stale write: expected r${String(expected)}, current r${current.revision}.`);
      return { ok: false, error: 'stale_revision', expected_revision: expected, current_revision: current.revision, state_changed: false };
    }
    return null;
  }, []);

  const stageBrief = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (current.contractFrozen) return { ok: false, error: 'contract_frozen', state_changed: false };
    const summary = String(input.summary ?? current.rawBrief).trim().slice(0, 280);
    const audience = String(input.audience ?? 'Small consultancy teams evaluating AI project ideas').trim().slice(0, 140);
    const outcome = String(input.outcome ?? 'Choose one evidence-backed idea for a bounded pilot').trim().slice(0, 180);
    if (!summary) return { ok: false, error: 'summary_required', state_changed: false };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'brief_review', revision, brief: { summary, audience, outcome }, briefAccepted: false, concepts: [], selectedConceptId: null, contract: null, contractFrozen: false, generated: false, evidence: [], events: [eventFor('agent', 'Brief staged', 'Structured intent is ready for human review.', revision), ...previous.events] }; });
    setNotice('The agent staged a structured brief. Human acceptance is required.');
    return { ok: true, next: 'human_accept_brief', revision: current.revision + 1 };
  }, [replaceState, stale]);
  const stageConcepts = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (!current.briefAccepted) return { ok: false, error: 'brief_not_accepted', state_changed: false };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'concept_review', revision, concepts, events: [eventFor('agent', 'Concepts staged', 'Three bounded directions created from the accepted brief.', revision), ...previous.events] }; });
    setNotice('Three concepts are ready. Only a human can choose one.');
    return { ok: true, concept_count: 3, next: 'human_select_concept', revision: current.revision + 1 };
  }, [replaceState, stale]);
  const stageContract = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    const chosen = concepts.find((concept) => concept.id === current.selectedConceptId);
    if (!chosen) return { ok: false, error: 'concept_not_selected', state_changed: false };
    const contract: BuildContract = { productName: chosen.label, template: 'bounded-decision-board/v1', goal: chosen.promise, primaryAction: chosen.primaryAction, agentPermission: 'Read state, score candidates, and stage recommendations.', humanBoundary: 'Only a human may approve a pilot or release an output.' };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'contract_review', revision, contract, events: [eventFor('agent', 'Contract staged', 'A template-bounded build contract is ready to freeze.', revision), ...previous.events] }; });
    setNotice('Build contract staged. The agent cannot freeze it.');
    return { ok: true, contract, next: 'human_freeze_contract', revision: current.revision + 1 };
  }, [replaceState, stale]);
  const generatePreview = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (!current.contractFrozen || !current.contract) return { ok: false, error: 'contract_not_frozen', state_changed: false };
    const outputHash = hashText(JSON.stringify(current.contract));
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: 'evidence_ready', revision, generated: true, outputHash, evidence: [], pilotApproved: false, events: [eventFor('agent', 'Preview generated', `Bounded template compiled as ${outputHash}.`, revision), ...previous.events] }; });
    setNotice('Working micro-app generated. Open it or run the evidence gate.');
    return { ok: true, output_hash: outputHash, next: 'run_factory_checks', revision: current.revision + 1 };
  }, [replaceState, stale]);
  useEffect(() => {
    if (workshopEffect === 'idle') return;
    if (workshopEffect === 'crafting') {
      const timer = window.setTimeout(() => {
        if (craftCountdown > 1) setCraftCountdown((previous) => previous - 1);
        else {
          setCraftCountdown(0);
          setWorkshopEffect('poof');
        }
      }, 1000);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      const expectedRevision = craftRevisionRef.current;
      setWorkshopEffect('idle');
      craftRevisionRef.current = null;
      if (expectedRevision !== null) generatePreview({ expected_revision: expectedRevision });
    }, 850);
    return () => window.clearTimeout(timer);
  }, [craftCountdown, generatePreview, workshopEffect]);
  const runChecks = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    if (!current.generated || !current.outputHash) return { ok: false, error: 'preview_not_generated', state_changed: false };
    const support = mcpSupportedRef.current; const staleProbe = stale(Math.max(0, current.revision - 1), current);
    const checks: Evidence[] = [
      { id: 'contract', label: 'Frozen contract', detail: `Output is bound to ${current.outputHash}.`, status: current.contractFrozen ? 'pass' : 'blocked' },
      { id: 'revision', label: 'Stale-write guard', detail: `r${Math.max(0, current.revision - 1)} was rejected against current r${current.revision}; no state changed.`, status: staleProbe?.error === 'stale_revision' ? 'pass' : 'blocked' },
      { id: 'tools', label: 'Top-level WebMCP', detail: support ? 'document.modelContext accepted phase tools.' : 'Open in a supported WebMCP browser to complete this check.', status: support ? 'pass' : 'blocked' },
      { id: 'boundary', label: 'Human authority', detail: 'Concept selection and contract freeze are recorded as human events.', status: current.selectedConceptId && current.contractFrozen ? 'pass' : 'blocked' },
      { id: 'readback', label: 'UI read-back', detail: 'Visible contract, revision, hash, and tool surface share one state object.', status: 'pass' },
    ];
    const allPass = checks.every((item) => item.status === 'pass');
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, phase: allPass ? 'verified' : 'evidence_ready', revision, evidence: checks, events: [eventFor('agent', 'Evidence gate run', allPass ? 'All deterministic checks passed.' : 'One check needs a supported WebMCP browser.', revision), ...previous.events] }; });
    setNotice(allPass ? 'Evidence gate passed. The output remains human-controlled.' : 'Evidence recorded; WebMCP browser verification is still required.');
    return { ok: allPass, checks, output_hash: current.outputHash, revision: current.revision + 1 };
  }, [replaceState, stale]);
  const undoAgentChange = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const mismatch = stale(input.expected_revision, current); if (mismatch) return mismatch;
    const lastAgentAction = current.events.find((item) => item.actor === 'agent')?.action;
    if (!lastAgentAction) return { ok: false, error: 'nothing_to_undo', state_changed: false };
    if (lastAgentAction === 'Evidence gate run') replaceState((previous) => ({ ...previous, phase: 'evidence_ready', revision: previous.revision + 1, evidence: [], events: [eventFor('agent', 'Evidence undone', 'Evidence records removed; generated output preserved.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Preview generated') replaceState((previous) => ({ ...previous, phase: 'build_ready', revision: previous.revision + 1, generated: false, outputHash: null, previewResult: null, events: [eventFor('agent', 'Preview undone', 'Generated output removed; frozen contract preserved.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Contract staged' && !current.contractFrozen) replaceState((previous) => ({ ...previous, phase: 'contract_ready', revision: previous.revision + 1, contract: null, events: [eventFor('agent', 'Contract undone', 'Staged contract removed.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Concepts staged' && !current.selectedConceptId) replaceState((previous) => ({ ...previous, phase: 'concept_ready', revision: previous.revision + 1, concepts: [], events: [eventFor('agent', 'Concepts undone', 'Staged concepts removed.', previous.revision + 1), ...previous.events] }));
    else if (lastAgentAction === 'Brief staged' && !current.briefAccepted) replaceState((previous) => ({ ...previous, phase: 'brief', revision: previous.revision + 1, brief: null, events: [eventFor('agent', 'Brief undone', 'Structured brief removed.', previous.revision + 1), ...previous.events] }));
    else return { ok: false, error: 'human_boundary', message: 'The latest agent change is protected by a later human decision.', state_changed: false };
    setNotice('Last reversible agent change was undone with a compensating revision.');
    return { ok: true, revision: current.revision + 1 };
  }, [replaceState, stale]);
  const scoreCandidate = useCallback((input: Record<string, unknown>) => {
    const current = stateRef.current; const name = String(input.name ?? 'Untitled candidate').trim().slice(0, 80);
    const impact = Math.min(5, Math.max(1, Number(input.impact) || 1)); const effort = Math.min(5, Math.max(1, Number(input.effort) || 1)); const confidence = Math.min(5, Math.max(1, Number(input.confidence) || 1));
    const score = impact * confidence * 4 - effort * 3; const lane = score >= 55 ? 'Run a pilot' : score >= 28 ? 'Clarify evidence' : 'Park for now';
    const result: PreviewResult = { name, score, lane, rationale: `${impact}/5 impact × ${confidence}/5 confidence, adjusted for ${effort}/5 effort.` };
    replaceState((previous) => { const revision = previous.revision + 1; return { ...previous, revision, previewResult: result, pilotApproved: false, events: [eventFor('agent', 'Candidate scored', `${name} routed to “${lane}”.`, revision), ...previous.events] }; });
    setNotice(`Generated app scored “${name}” and updated the visible result.`);
    return { ok: true, result, revision: current.revision + 1, human_approval_required: lane === 'Run a pilot' };
  }, [replaceState]);

  const activeToolNames = useMemo(() => {
    if (view === 'preview') return ['read_generated_app_state', 'score_project_candidate'];
    const names = ['read_factory_state'];
    if (state.phase === 'brief' || state.phase === 'brief_review') names.push('stage_brief');
    if (state.phase === 'concept_ready') names.push('stage_concepts');
    if (state.phase === 'contract_ready' || state.phase === 'contract_review') names.push('stage_build_contract');
    if (state.phase === 'build_ready') names.push('generate_template_preview');
    if (state.phase === 'evidence_ready' || state.phase === 'verified') names.push('run_factory_checks', 'read_evidence');
    if (state.events.some((item) => item.actor === 'agent')) names.push('undo_last_stage');
    return names.slice(0, 8);
  }, [state.events, state.phase, view]);
  const toolSignature = activeToolNames.join('|');
  useEffect(() => {
    const context = getModelContext(); const supported = Boolean(context?.registerTool); mcpSupportedRef.current = supported; let active = true;
    queueMicrotask(() => { if (!active) return; setMcpSupported(supported); setRegistrationError(null); if (!supported) setRegisteredTools([]); });
    if (!context) return () => { active = false; };
    const toolNames = toolSignature.split('|').filter(Boolean);
    const toolDefinitions = toolNames.map<ToolDefinition>((name) => {
      if (name === 'read_factory_state') return { name, title: 'Read factory state', description: 'Read the current Factory Maker phase, revision, human decisions, blockers, output hash, and evidence. Use before any mutation.', inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => publicState(stateRef.current) };
      if (name === 'read_generated_app_state') return { name, title: 'Read generated app state', description: 'Read the currently generated decision app, its latest visible result, and the parent factory revision.', inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ revision: stateRef.current.revision, output_hash: stateRef.current.outputHash, latest_result: stateRef.current.previewResult, pilot_approved_by_human: stateRef.current.pilotApproved }) };
      if (name === 'stage_brief') return { name, title: 'Stage structured brief', description: 'Stage a bounded intent card from the visible fuzzy brief. Does not accept it; a human must review and accept the card.', inputSchema: { type: 'object', properties: { summary: { type: 'string', minLength: 1, maxLength: 280 }, audience: { type: 'string', minLength: 1, maxLength: 140 }, outcome: { type: 'string', minLength: 1, maxLength: 180 }, expected_revision: { type: 'integer', minimum: 0 } }, required: ['summary', 'audience', 'outcome', 'expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: stageBrief };
      if (name === 'stage_concepts') return { name, title: 'Stage three concepts', description: 'Create exactly three traceable, template-bounded concepts from the human-accepted brief. Does not choose a winner.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: stageConcepts };
      if (name === 'stage_build_contract') return { name, title: 'Stage build contract', description: 'Stage the bounded implementation contract for the human-selected concept. Does not freeze the contract.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: stageContract };
      if (name === 'generate_template_preview') return { name, title: 'Generate bounded preview', description: 'Generate a working micro-app only from the frozen contract and allowlisted template. Returns the output hash.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: generatePreview };
      if (name === 'run_factory_checks') return { name, title: 'Run evidence gate', description: 'Run deterministic contract, stale-write, WebMCP, human-boundary, and UI read-back checks for the generated output.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: runChecks };
      if (name === 'read_evidence') return { name, title: 'Read evidence', description: 'Read check records and the output hash for the current generated revision.', inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ output_hash: stateRef.current.outputHash, evidence: stateRef.current.evidence }) };
      if (name === 'score_project_candidate') return { name, title: 'Score project candidate', description: 'Score one project idea in the visible generated Decision Board. Updates the same result card the human sees; it never approves a pilot.', inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 80 }, impact: { type: 'integer', minimum: 1, maximum: 5 }, effort: { type: 'integer', minimum: 1, maximum: 5 }, confidence: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['name', 'impact', 'effort', 'confidence'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: scoreCandidate };
      return { name: 'undo_last_stage', title: 'Undo last agent stage', description: 'Append a compensating revision for the latest reversible agent mutation. Never undoes a later human decision.', inputSchema: { type: 'object', properties: { expected_revision: { type: 'integer', minimum: 0 } }, required: ['expected_revision'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: undoAgentChange };
    });
    const controller = new AbortController();
    Promise.all(toolDefinitions.map((tool) => context.registerTool(tool, { signal: controller.signal }))).then(() => { if (active) setRegisteredTools(toolNames); }).catch((error: unknown) => { if (active && !controller.signal.aborted) setRegistrationError(error instanceof Error ? error.message : 'Tool registration failed.'); });
    return () => { active = false; controller.abort(); };
  }, [generatePreview, runChecks, scoreCandidate, stageBrief, stageConcepts, stageContract, toolSignature, undoAgentChange]);

  const selectedConcept = concepts.find((concept) => concept.id === state.selectedConceptId) ?? null;
  const activeStage = !state.briefAccepted ? 0 : !state.selectedConceptId ? 1 : !state.generated ? 2 : 3;
  const stageComplete = [state.briefAccepted, Boolean(state.selectedConceptId), state.generated, state.phase === 'verified'];
  const acceptBrief = () => replaceState((previous) => { if (!previous.brief) return previous; const revision = previous.revision + 1; setNotice('Brief accepted by a human. Concept staging is now available.'); return { ...previous, phase: 'concept_ready', revision, briefAccepted: true, events: [eventFor('human', 'Brief accepted', 'Human accepted the structured intent card.', revision), ...previous.events] }; });
  const selectConcept = (id: string) => replaceState((previous) => { const revision = previous.revision + 1; const concept = concepts.find((item) => item.id === id); setNotice(`${concept?.label ?? 'Concept'} selected by a human.`); return { ...previous, phase: 'contract_ready', revision, selectedConceptId: id, contract: null, contractFrozen: false, generated: false, evidence: [], events: [eventFor('human', 'Concept selected', `${concept?.label ?? id} selected as the build direction.`, revision), ...previous.events] }; });
  const freezeContract = () => replaceState((previous) => { if (!previous.contract) return previous; const revision = previous.revision + 1; setNotice('Contract frozen by a human. The build tool is now available.'); return { ...previous, phase: 'build_ready', revision, contractFrozen: true, events: [eventFor('human', 'Contract frozen', 'Build authority is bound to this immutable revision.', revision), ...previous.events] }; });
  const approvePilot = () => replaceState((previous) => { if (previous.previewResult?.lane !== 'Run a pilot' || previous.pilotApproved) return previous; const revision = previous.revision + 1; setNotice('Pilot approved by a human and recorded in the shared ledger.'); return { ...previous, revision, pilotApproved: true, events: [eventFor('human', 'Pilot approved', `${previous.previewResult.name} approved for a bounded pilot.`, revision), ...previous.events] }; });
  const resetFactory = () => { if (!window.confirm(t.resetConfirm)) return; stateRef.current = initialState; setState(initialState); setView('factory'); setWorkshopEffect('idle'); setCraftCountdown(3); craftRevisionRef.current = null; window.localStorage.removeItem(STORAGE_KEY); setNotice('Factory reset to a clean demo state.'); };
  const copyState = async () => { try { await navigator.clipboard.writeText(JSON.stringify(publicState(state), null, 2)); setNotice('Shared state copied to clipboard.'); } catch { setNotice('Clipboard access was unavailable.'); } };
  const startWorkshopBuild = () => {
    const expectedRevision = state.revision;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      generatePreview({ expected_revision: expectedRevision });
      return;
    }
    craftRevisionRef.current = expectedRevision;
    setCraftCountdown(3);
    setWorkshopEffect('crafting');
  };
  const finishWorkshopBuild = () => {
    const expectedRevision = craftRevisionRef.current ?? state.revision;
    craftRevisionRef.current = null;
    setWorkshopEffect('idle');
    generatePreview({ expected_revision: expectedRevision });
  };

  if (view === 'preview' && state.generated) return <GeneratedPreview state={state} mcpSupported={mcpSupported} registeredTools={registeredTools} scoreCandidate={scoreCandidate} approvePilot={approvePilot} onBack={() => setView('factory')} />;

  const stageOwners = [t.both, t.human, t.both, t.both];
  const stageIcons = ['✦', '➜', '⚒', '★'];
  const craftLogIndex = Math.min(t.craftLogs.length - 1, Math.max(0, 3 - craftCountdown));
  const currentTitles = [t.requestTitle, t.directionTitle, t.buildTitle, t.verifyTitle];
  const currentBodies = [t.requestBody, t.directionBody, t.buildBody, t.verifyBody];
  const visibleNotice = registrationError ?? (
    notice === 'Ready for a human or browser agent.' && state.revision > 0
      ? locale === 'ja'
        ? `この端末に保存された作業を復元しました。直近の変更：${translatedAction(state.events[0]?.action ?? '', locale)}。`
        : `Restored the workflow saved on this device. Latest change: ${state.events[0]?.action ?? 'unknown'}.`
      : translatedNotice(notice, locale)
  );
  return (
    <main className={`app-shell lang-${locale}`}>
      <header className="product-header">
        <div className="product-brand" aria-label="Factory Maker"><span className="brand-symbol">FM</span><span><b>FACTORY MAKER</b><small>{t.brandTag}</small></span></div>
        <div className="header-controls"><LanguageSwitch /><span className={`protocol-pill ${mcpSupported ? '' : 'offline'}`}><i aria-hidden="true" /> {mcpSupported ? t.protocolLive : t.protocolFallback}</span></div>
      </header>
      <div className="product-page">
        <section className="product-hero">
          <div className="hero-copy"><p className="hero-kicker"><span aria-hidden="true">✦</span>{t.heroKicker}</p><h1 aria-label={t.heroTitle}><span className="hero-lead">{t.heroLead}{locale === 'en' ? ' ' : null}</span><span className="hero-build-line"><span className="hero-action">{t.heroAction}</span>{locale === 'en' ? ' ' : null}<wbr /><span className="hero-destination">{t.heroDestination}</span></span></h1><p>{t.heroBody}</p></div>
          <div className="hero-visual">
            <div className="hero-sprite-scene" aria-hidden="true"><span className="pixel-star star-one">✦</span><span className="pixel-star star-two">✦</span><PixelSprite kind="wizard" className="hero-wizard" /><PixelSprite kind="fairy" className="hero-fairy" /><PixelSprite kind="dwarf" className="hero-dwarf" /><span className="pixel-worktable"><i /><b /><em /></span></div>
            <div className="revision-badge" aria-label={`${t.revision} ${state.revision}`}><span>{t.revision}</span><strong>r{state.revision}</strong><small>{t.sharedState}</small></div>
          </div>
        </section>
        <section className="trail-section" aria-labelledby="trail-title">
          <div className="section-label-row"><span id="trail-title">{t.trailLabel}</span><b>r{state.revision}</b></div>
          <ol className="evidence-trail">
            {t.stages.map((label, index) => {
              const status = stageComplete[index] ? 'done' : index === activeStage ? 'active' : 'waiting';
              return <li className={status} key={label} aria-current={status === 'active' ? 'step' : undefined}><span className="trail-node"><b aria-hidden="true">{stageComplete[index] ? '✓' : stageIcons[index]}</b><small>0{index + 1}</small></span><div className="trail-copy"><span>{label}</span><strong>{t.stageNotes[index]}</strong><small>{stageOwners[index]} · {status === 'done' ? t.statusDone : status === 'active' ? t.statusActive : t.statusWaiting}</small></div>{status === 'active' && <em className="now-flag">NOW</em>}</li>;
            })}
          </ol>
        </section>
        <div className={`status-strip ${registrationError ? 'error' : ''}`} role="status"><span aria-hidden="true">{registrationError ? '!' : '↳'}</span><p>{visibleNotice}</p><code>r{state.revision}</code></div>
        <div className="workbench">
          <section className="artifact-panel" aria-labelledby="artifact-title">
            <header className="artifact-header"><div><span>{t.currentArtifact} · 0{activeStage + 1}</span><h2 id="artifact-title">{currentTitles[activeStage]}</h2><p>{currentBodies[activeStage]}</p></div><ActorBadge label={stageOwners[activeStage]} type={activeStage === 1 ? 'human' : 'both'} /></header>
            {activeStage === 0 && <div className="artifact-content request-artifact">
              <label htmlFor="brief">{t.requestLabel}</label>
              <textarea id="brief" value={state.rawBrief} onChange={(event) => replaceState((previous) => ({ ...previous, rawBrief: event.target.value }))} maxLength={420} placeholder={t.requestPlaceholder} />
              <div className="field-meta"><small>{t.dataNote}</small><span>{state.rawBrief.length}/420</span></div>
              <div className="request-actions">{!state.rawBrief && <button className="quiet-button" type="button" onClick={() => replaceState((previous) => ({ ...previous, rawBrief: locale === 'ja' ? demoBriefJa : demoBrief }))}>{t.useExample}</button>}<button className="primary-button" type="button" disabled={!state.rawBrief.trim()} onClick={() => stageBrief({ expected_revision: state.revision, summary: state.rawBrief, audience: t.defaultAudience, outcome: t.defaultOutcome })}><span aria-hidden="true">✦</span>{state.brief ? t.restage : t.organize}</button></div>
              {state.brief && <div className="structured-card"><div className="structured-title"><span>{t.structuredBrief}</span><code>r{state.revision}</code></div><p>{state.brief.summary}</p><dl><div><dt>{t.audience}</dt><dd>{state.brief.audience}</dd></div><div><dt>{t.outcome}</dt><dd>{state.brief.outcome}</dd></div></dl></div>}
              {state.brief && !state.briefAccepted && <HumanAction eyebrow={t.humanCheckpoint} body={t.acceptPrompt} action={t.acceptBrief} onClick={acceptBrief} />}
            </div>}
            {activeStage === 1 && <div className="artifact-content">{state.concepts.length === 0 ? <EmptyStage label={t.directionEmpty} action={t.makeConcepts} eyebrow={t.agentStep} onClick={() => stageConcepts({ expected_revision: state.revision })} /> : <div className="direction-grid">{state.concepts.map((concept, index) => { const display = conceptForDisplay(concept, locale); return <button className={`direction-card ${concept.accent}`} key={concept.id} type="button" onClick={() => selectConcept(concept.id)}><span className="direction-number">0{index + 1}</span><span className="direction-visual" aria-hidden="true"><i /><i /><i /></span><strong>{display.label}</strong><small>{display.promise}</small><em>{t.selectDirection} →</em></button>; })}</div>}</div>}
            {activeStage === 2 && <div className="artifact-content">{!state.contract ? <EmptyStage label={t.contractEmpty} action={t.stageContract} eyebrow={t.agentStep} onClick={() => stageContract({ expected_revision: state.revision })} /> : <>
              <div className="contract-sheet"><div className="contract-title"><span>{t.contractLabel}</span><code>{state.contractFrozen ? `LOCKED · r${state.revision}` : `DRAFT · r${state.revision}`}</code></div><dl>
                <div><dt>{t.product}</dt><dd>{selectedConcept ? conceptForDisplay(selectedConcept, locale).label : state.contract.productName}</dd></div><div><dt>{t.template}</dt><dd><code>{state.contract.template}</code></dd></div>
                <div><dt>{t.goal}</dt><dd>{selectedConcept ? conceptForDisplay(selectedConcept, locale).promise : state.contract.goal}</dd></div><div><dt>{t.primaryAction}</dt><dd>{selectedConcept ? conceptForDisplay(selectedConcept, locale).primaryAction : state.contract.primaryAction}</dd></div>
                <div><dt>{t.agentMay}</dt><dd>{locale === 'ja' ? '状態の読取、候補の採点、推奨案の下書き。' : state.contract.agentPermission}</dd></div><div className="human-contract"><dt>{t.humanKeeps}</dt><dd>{locale === 'ja' ? '試行の承認と、成果物を公開する最終判断。' : state.contract.humanBoundary}</dd></div>
              </dl></div>
              {!state.contractFrozen ? <HumanAction eyebrow={t.freezeBoundary} body={t.freezePrompt} action={t.freeze} onClick={freezeContract} /> : workshopEffect === 'idle' ? <div className="generation-step"><div><span>✓ {t.contractFrozen}</span><p>{t.generatePrompt}</p></div><button className="primary-button" type="button" onClick={startWorkshopBuild}><span aria-hidden="true">⚒</span>{t.generate}</button></div> : <WorkshopAnimation effect={workshopEffect} countdown={craftCountdown} title={t.craftingTitle} log={t.craftLogs[craftLogIndex]} poofTitle={t.poofTitle} poofBody={t.poofBody} skipLabel={t.skipAnimation} onSkip={finishWorkshopBuild} />}
            </>}</div>}
            {activeStage === 3 && <div className="artifact-content">
              <div className="generated-card"><div className="generated-thumb" aria-hidden="true"><span /><div><i /><i /><i /></div><b>Decision Board</b></div><div><span>{t.generatedOutput}</span><h3>{selectedConcept ? conceptForDisplay(selectedConcept, locale).label : state.contract?.productName}</h3><code>{state.outputHash}</code></div><button type="button" onClick={() => setView('preview')}>{t.openApp} ↗</button></div>
              <div className="crew-guides"><article><PixelSprite kind="fairy" /><div><strong>{t.fairyName}</strong><p>{t.fairyGuide}</p></div></article><article><PixelSprite kind="dwarf" /><div><strong>{t.dwarfName}</strong><p>{t.dwarfGuide}</p></div></article></div>
              {state.evidence.length === 0 ? <EmptyStage label={t.verifyEmpty} action={t.runChecks} eyebrow={t.agentStep} onClick={() => runChecks({ expected_revision: state.revision })} /> : <div className="evidence-list">{state.evidence.map((rawItem) => { const item = translatedEvidence(rawItem, locale); return <article className={item.status} key={item.id}><span aria-hidden="true">{item.status === 'pass' ? '✓' : '!'}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><em>{item.status === 'pass' ? (locale === 'ja' ? '合格' : 'PASS') : (locale === 'ja' ? '要確認' : 'CHECK')}</em></article>; })}</div>}
              {state.phase === 'verified' && <div className="verified-banner"><span>✓</span><div><strong>{t.verifiedTitle}</strong><p>{t.verifiedBody}</p></div></div>}
            </div>}
          </section>
          <aside className="operation-panel companion-panel" aria-label={t.operation}>
            <header><div className="agent-avatar" aria-hidden="true"><PixelSprite kind="fairy" /></div><div><span>{t.operation}</span><strong>{t.toolsHere}</strong></div><i className={`online-dot ${mcpSupported ? '' : 'offline'}`} aria-hidden="true" /></header>
            <p>{t.operationBody}</p><div className="operation-tools">{activeToolNames.map((name) => <div key={name}><span className={name.startsWith('read_') ? 'read' : 'write'}>{name.startsWith('read_') ? t.read : t.write}</span><code>{name}</code></div>)}</div>
            <small className="registration-readback">{mcpSupported ? `${registeredTools.length}/${activeToolNames.length} ${t.toolsRegistered}` : t.unsupported}</small>
            <div className="authority-card"><span aria-hidden="true">◇</span><div><strong>{t.authority}</strong><p>{t.authorityBody}</p></div></div>
            <div className="latest-event"><span>{t.latest}</span><strong>{translatedAction(state.events[0]?.action ?? '', locale)}</strong><small>{state.events[0]?.actor === 'human' ? t.human : state.events[0]?.actor === 'agent' ? t.agent : 'SYSTEM'} · r{state.events[0]?.revision}</small></div>
          </aside>
        </div>
        <details className="ledger"><summary><span><b>{t.recentChanges}</b><small>{t.ledgerSummary}</small></span><em>{state.events.length}</em></summary><div className="ledger-body"><div className="ledger-actions"><button type="button" onClick={() => undoAgentChange({ expected_revision: state.revision })}>↶ {t.undo}</button><button type="button" onClick={copyState}>{t.copy}</button><button className="danger-quiet" type="button" onClick={resetFactory}>{t.reset}</button></div><div className="event-list">{state.events.slice(0, 8).map((item) => <div key={item.id}><span className={`event-actor ${item.actor}`}>{item.actor === 'human' ? 'H' : item.actor === 'agent' ? 'AI' : 'S'}</span><p><strong>{translatedAction(item.action, locale)}</strong><small>{item.actor === 'human' ? t.human : item.actor === 'agent' ? t.agent : 'SYSTEM'}</small></p><code>r{item.revision}</code><time>{item.at}</time></div>)}</div></div></details>
      </div>
      <SiteFooter />
    </main>
  );
}

function ActorBadge({ label, type }: { label: string; type: 'human' | 'both' }) { return <span className={`actor-badge ${type}`}><i aria-hidden="true" />{label}</span>; }
function HumanAction({ eyebrow, body, action, onClick }: { eyebrow: string; body: string; action: string; onClick: () => void }) { return <div className="human-action"><div><span>{eyebrow}</span><p>{body}</p></div><button type="button" onClick={onClick}>{action}</button></div>; }
function EmptyStage({ label, action, eyebrow, onClick }: { label: string; action: string; eyebrow: string; onClick: () => void }) { return <div className="empty-stage"><div><span>{eyebrow}</span><p>{label}</p></div><button type="button" onClick={onClick}>✦ {action}</button></div>; }

function WorkshopAnimation({ effect, countdown, title, log, poofTitle, poofBody, skipLabel, onSkip }: { effect: WorkshopEffect; countdown: number; title: string; log: string; poofTitle: string; poofBody: string; skipLabel: string; onSkip: () => void }) {
  if (effect === 'poof') return (
    <div className="workshop-animation poof" role="status" aria-live="assertive">
      <div className="pixel-poof" aria-hidden="true"><i /><i /><i /><i /><span className="pixel-gift"><b /><em /></span></div>
      <strong>{poofTitle}</strong><p>{poofBody}</p>
    </div>
  );
  return (
    <div className="workshop-animation crafting" role="status" aria-live="polite">
      <header><span>{title}</span><strong aria-label={`${countdown}`}>{countdown}</strong></header>
      <div className="working-crew" aria-hidden="true"><PixelSprite kind="fairy" className="working-fairy" /><span className="pixel-anvil"><i /><b /></span><PixelSprite kind="dwarf" className="working-dwarf" /></div>
      <div className="craft-log"><span aria-hidden="true">›</span><p>{log}</p></div>
      <div className={`craft-progress step-${countdown}`} aria-hidden="true"><i /></div>
      <button type="button" onClick={onSkip}>{skipLabel}</button>
    </div>
  );
}

function GeneratedPreview({ state, mcpSupported, registeredTools, scoreCandidate, approvePilot, onBack }: { state: FactoryState; mcpSupported: boolean; registeredTools: string[]; scoreCandidate: (input: Record<string, unknown>) => unknown; approvePilot: () => void; onBack: () => void }) {
  const { locale } = useLocale(); const t = COPY[locale];
  const [name, setName] = useState(locale === 'ja' ? '問い合わせ支援の試行' : 'Support knowledge pilot'); const [impact, setImpact] = useState(4); const [effort, setEffort] = useState(2); const [confidence, setConfidence] = useState(4);
  return <main className="preview-shell"><header className="preview-header"><button type="button" onClick={onBack}>← {t.previewBack}</button><div><span>{t.previewFrom}</span><strong>Decision Board</strong></div><div className="preview-controls"><LanguageSwitch compact /><span className={`protocol-pill ${mcpSupported ? '' : 'offline'}`}><i aria-hidden="true" />{mcpSupported ? `${registeredTools.length} WebMCP` : t.protocolFallback}</span></div></header>
    <section className="preview-main"><div className="preview-intro"><div><p className="hero-kicker">OUTPUT · {state.outputHash}</p><h1>{t.previewQuestion}</h1><p>{t.previewBody}</p></div><div className="revision-badge"><span>{t.factoryRevision}</span><strong>r{state.revision}</strong><small>{t.contractLocked}</small></div></div>
      <div className="score-workspace"><form onSubmit={(event) => { event.preventDefault(); scoreCandidate({ name, impact, effort, confidence }); }}><div className="score-heading"><div><span>{t.projectInput}</span><h2>{t.scoreCandidate}</h2></div><em>{t.bounded}</em></div><label>{t.projectName}<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><p className="form-note">{t.fictionalData}</p><div className="range-grid"><RangeField label={t.impact} value={impact} setValue={setImpact} /><RangeField label={t.effort} value={effort} setValue={setEffort} /><RangeField label={t.confidence} value={confidence} setValue={setConfidence} /></div><button className="primary-button" type="submit">{t.calculate}</button></form>
        <section className={`result-panel ${state.previewResult ? 'has-result' : ''}`} aria-live="polite">{state.previewResult ? <><span className="result-label">{t.recommendedLane}</span><h2>{translatedLane(state.previewResult.lane, locale)}</h2><strong>{state.previewResult.name}</strong><div className="score-ring"><b>{state.previewResult.score}</b><small>{t.score}</small></div><p>{locale === 'ja' ? '効果と確信度を掛け合わせ、必要工数を差し引いた固定式で算出しています。' : state.previewResult.rationale}</p>{state.previewResult.lane === 'Run a pilot' && <button type="button" disabled={state.pilotApproved} onClick={approvePilot}>{state.pilotApproved ? t.approved : t.approve}</button>}<small className="result-readback">{t.sameResult}</small></> : <><span className="empty-orb">✦</span><h2>{t.noScore}</h2><p>{t.noScoreBody} <code>score_project_candidate</code></p></>}</section>
      </div><div className="preview-boundary"><div><span>{t.agentCan}</span><strong>{t.agentCanBody}</strong></div><div><span>{t.humanKeeps}</span><strong>{t.humanKeepsBody}</strong></div></div>
    </section><SiteFooter /></main>;
}
function RangeField({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) { return <label className="range-field"><span>{label}<b>{value}</b></span><input type="range" min="1" max="5" value={value} onChange={(event) => setValue(Number(event.target.value))} /><small>1</small><small>5</small></label>; }
