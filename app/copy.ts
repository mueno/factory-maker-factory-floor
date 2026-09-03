// UI copy for the Factory Maker studio shell (page.tsx).
// One voice: a cinematic, human-led studio. No fantasy crew, no pixel-era terms.

import type { Locale } from './i18n';
import type { Archetype } from './stage';

export const COPY = {
  en: {
    brandTag: 'One thought becomes a service you can use',
    heroKicker: 'FROM IMAGINATION TO SOMETHING REAL',
    heroTitle: 'Begin with one thought. Open software that works.',
    heroLead: 'Begin with one thought.', heroAction: 'Open software', heroDestination: 'that works.',
    heroBody: 'Describe who it is for, what should happen, and what becomes possible. Factory Maker composes a real multi-screen service — and you keep every important decision.',
    trailLabel: 'YOUR STORY',
    stages: ['Imagine', 'Choose', 'Create', 'Open'], stageNotes: ['Name the possibility', 'Choose its shape', 'Watch it take shape', 'Try the result'],
    statusDone: 'Complete', statusActive: 'Now', statusWaiting: 'Waiting', human: 'HUMAN', agent: 'AGENT', both: 'HUMAN + AGENT', currentArtifact: 'CURRENT ARTIFACT',
    requestTitle: 'What would you like to bring to life?', requestBody: 'Three small thoughts are enough. We will turn them into one clear service idea before anything is built.',
    requestLabel: 'Or describe the whole idea in your own words', requestPlaceholder: 'For example: A place where friends vote on weekend ideas and share the plan.', useExample: 'Inspire me',
    dataNote: 'Your draft stays in this browser. Please use fictional or non-sensitive information.', organize: 'Shape the idea', restage: 'Shape it again',
    structuredBrief: 'YOUR IDEA', audience: 'Who it is for', outcome: 'What becomes possible', humanCheckpoint: 'YOUR CHECK', acceptPrompt: 'Make sure this captures what you meant before moving on.', acceptBrief: 'Yes, this is my idea',
    directionTitle: 'Choose the shape of your service', directionBody: 'Three concrete builds, each with its own screens, data, and live numbers. You decide which becomes real.',
    directionEmpty: 'Your idea is ready to become three distinct builds.', makeConcepts: 'Show me 3 directions', selectDirection: 'Choose this direction',
    buildTitle: 'Confirm what will be made', buildBody: 'Review the essential experience and the decisions that remain yours.',
    contractEmpty: 'Your chosen direction is ready to become a clear, buildable plan.', stageContract: 'Prepare the plan', contractLabel: 'WHAT WE WILL MAKE',
    product: 'Product', template: 'Template', goal: 'Goal', primaryAction: 'Primary action', agentMay: 'Agent may', humanKeeps: 'Human keeps',
    agentMayBody: 'Compose the screens and update the typed service data.', humanKeepsBody: 'Freezing the plan and the final decision to publish.',
    freezeBoundary: 'YOUR DECISION', freezePrompt: 'Confirming this plan opens the creation step.', freeze: 'Confirm and continue', contractFrozen: 'Plan confirmed',
    generatePrompt: 'Everything is ready. Factory Maker will now compose the working service.', generate: 'Create my service',
    craftingTitle: 'COMPOSING YOUR SERVICE', craftLogs: ['Laying out the data model and screens…', 'Wiring live stats, charts, and boards…', 'Checking every interaction before the reveal…'], poofTitle: 'READY', poofBody: 'Your service is ready to open.', skipAnimation: 'Show me the result',
    verifyTitle: 'Open it. Try it. Make it yours.', verifyBody: 'The working service and the choices behind it stay connected, while technical details remain backstage.',
    generatedOutput: 'YOUR WORKING SERVICE', openApp: 'Open the service',
    specTitle: 'WHAT GOT BUILT', specViews: 'screens', specCollections: 'data collections', specActions: 'live actions', specRecords: 'seeded records',
    verifyEmpty: 'Check the service before opening it.', runChecks: 'Check that it works',
    verifiedTitle: 'Ready to try, with your decisions preserved.', verifiedBody: 'These checks cover this guided prototype. They are not a production-readiness certification.',
    operation: 'AGENT CONNECTION', toolsHere: 'Tools available right now', operationBody: 'The browser agent receives only the tools needed for this step. Any change must target the current revision.',
    read: 'READ', write: 'WRITE', toolsRegistered: 'tools registered on document.modelContext', unsupported: 'Open in a WebMCP-capable browser to expose these tools.',
    authority: 'You carry the decision key', authorityBody: 'The AI cannot choose a direction, freeze the plan, approve a snapshot, or publish.', latest: 'LATEST STUDIO MOVE',
    recentChanges: 'Studio log and recovery', ledgerSummary: 'Every change has an owner and revision.', undo: 'Undo latest agent change', copy: 'Copy shared state', reset: 'Reset the studio',
    resetConfirm: 'Reset the local demo state? This removes this workflow from your browser.', agentStep: 'AGENT-AVAILABLE STEP',
    defaultAudience: 'Small teams evaluating AI-enabled service ideas', defaultOutcome: 'Choose one evidence-backed idea for a bounded pilot',
    archetypes: { vote: 'Voting service', kanban: 'Kanban service', tracker: 'Tracking dashboard', event: 'Event service', log: 'Collection log', habit: 'Habit tracker', custom: 'Custom composition' } as Record<Archetype | 'custom', string>,
  },
  ja: {
    brandTag: 'ひとつの想像を、使えるサービスに',
    heroKicker: '想像したことが、本当に動き出す',
    heroTitle: 'ひとつのことばから、動くソフトウェアへ。',
    heroLead: 'ひとつのことばから、', heroAction: '動くソフトウェア', heroDestination: 'へ。',
    heroBody: '「だれのため」「何が起きる」「何ができるようになる」を教えてください。Factory Makerが複数画面・ライブ集計つきの本物のサービスを組み上げ、大切な判断はあなたに残します。',
    trailLabel: 'できあがるまで',
    stages: ['想像する', '選ぶ', 'つくる', 'ひらく'], stageNotes: ['できることを描く', '形を選ぶ', '組み上がるのを見る', '実際に試す'],
    statusDone: '完了', statusActive: '現在', statusWaiting: '待機中', human: '人', agent: 'AI', both: '人 + AI', currentArtifact: '現在の成果物',
    requestTitle: 'どんなサービスを​動かしてみたい？', requestBody: '小さな3つのことばだけで大丈夫です。つくり始める前に、一つの分かりやすいサービス案へまとめます。',
    requestLabel: 'ひと続きのことばで書いても大丈夫です', requestPlaceholder: '例：友達と行きたい場所を、みんなで投票して、次の休日の予定を決められる場所', useExample: 'ひらめきをもらう',
    dataNote: '下書きはこのブラウザに保存されます。架空または機密性のない内容をお使いください。', organize: 'アイデアを形にする', restage: 'もう一度まとめる',
    structuredBrief: 'あなたのアイデア', audience: '使う人', outcome: 'できるようになること', humanCheckpoint: 'あなたの確認', acceptPrompt: '思い描いていた内容になっているか、確かめてください。', acceptBrief: 'このアイデアで進む',
    directionTitle: 'サービスの形を​選ぶ', directionBody: '画面構成・データ・ライブ集計まで異なる、3つの具体的な設計案を用意します。実際に形にする案は、あなたが選びます。',
    directionEmpty: 'あなたのアイデアから、構成の異なる3つの設計案をつくれます。', makeConcepts: '3つの設計案を見る', selectDirection: 'この設計で進む',
    buildTitle: 'つくる内容を​確かめる', buildBody: 'サービスの中心となる体験と、あなたが最後まで決めることを確認します。',
    contractEmpty: '選んだ設計から、つくる内容を一枚にまとめられます。', stageContract: 'つくる内容をまとめる', contractLabel: 'これからつくるもの',
    product: 'サービス名', template: 'テンプレート', goal: '目的', primaryAction: '主な操作', agentMay: 'AIに任せること', humanKeeps: '人が決めること',
    agentMayBody: '画面の組み立てと、型付きデータの更新。', humanKeepsBody: 'つくる内容の確定と、成果物を公開する最終判断。',
    freezeBoundary: 'あなたが決める工程', freezePrompt: 'この内容でよければ、つくる工程へ進めます。', freeze: 'この内容で進む', contractFrozen: 'つくる内容を確認しました',
    generatePrompt: '準備が整いました。Factory Makerが、実際に操作できるサービスへ組み上げます。', generate: 'サービスをつくる',
    craftingTitle: 'サービスを組み上げています', craftLogs: ['データモデルと画面構成を設計しています…', 'ライブ集計・グラフ・ボードを配線しています…', 'お披露目前に、操作が正しくつながるか確かめています…'], poofTitle: 'できました', poofBody: 'あなたのサービスを開けます。', skipAnimation: '完成した画面を見る',
    verifyTitle: '開いて、試して、​自分のものにする', verifyBody: '技術は舞台裏に置いたまま、動くサービスと、あなたが選んだ内容だけを確認できます。',
    generatedOutput: 'あなたの動くサービス', openApp: 'サービスを開く',
    specTitle: '組み上がった構成', specViews: '画面', specCollections: 'データ', specActions: '操作', specRecords: '初期データ',
    verifyEmpty: 'サービスを開く前に、動作を確かめます。', runChecks: '動作を確かめる',
    verifiedTitle: 'あなたの判断を保ったまま、試せる状態になりました。', verifiedBody: 'ここで確認しているのは、この体験の範囲です。本番運用の準備がすべて完了したことを保証するものではありません。',
    operation: 'エージェント連携', toolsHere: 'いま使えるツール', operationBody: 'ブラウザ内のAIには、この工程に必要なツールだけを渡します。変更には現在の版番号が必要です。',
    read: '読取', write: '変更', toolsRegistered: '個のツールを document.modelContext に登録済み', unsupported: 'WebMCP対応ブラウザで開くと、これらのツールをAIが利用できます。',
    authority: '最終決定の鍵は、あなたが持ちます', authorityBody: 'AIは設計の選択、仕様の確定、動作確認済みの承認、公開を行えません。', latest: 'スタジオの直近作業',
    recentChanges: 'スタジオ記録とやり直し', ledgerSummary: 'すべての変更に、担当者と版番号が付きます。', undo: 'AIの直前操作を取り消す', copy: '共有状態をコピー', reset: 'スタジオを初期化',
    resetConfirm: 'このブラウザに保存したデモの作業内容を削除し、最初からやり直しますか？', agentStep: 'AIが実行できる工程',
    defaultAudience: 'AIを活用したサービス案を検討する小規模チーム', defaultOutcome: '根拠のある一案を選び、範囲を絞った試行へ進める',
    archetypes: { vote: '投票サービス', kanban: 'カンバンサービス', tracker: '記録ダッシュボード', event: 'イベントサービス', log: '記録棚サービス', habit: '習慣トラッカー', custom: 'カスタム構成' } as Record<Archetype | 'custom', string>,
  },
} as const;

export type StudioCopy = (typeof COPY)[Locale];

export function translatedAction(action: string, locale: Locale) {
  if (locale === 'en') return action;
  const labels: Record<string, string> = {
    'Workspace opened': '作業場所を開きました', 'Brief staged': '企画要旨を整理しました', 'Brief accepted': '企画要旨を承認しました',
    'Concepts staged': '3つの設計案を作成しました', 'Concept selected': '設計案を選択しました', 'Contract staged': '構築仕様を作成しました',
    'Contract frozen': '構築仕様を固定しました', 'Evidence gate run': '検証を実行しました',
    'Evidence undone': '検証結果を取り消しました', 'Contract undone': '構築仕様案を取り消しました',
    'Concepts undone': '設計案を取り消しました', 'Brief undone': '企画要旨を取り消しました',
    'Service rendered': '動くサービスを組み立てました', 'Service state updated': 'サービス上の操作を反映しました', 'Service appearance patched': 'サービスの見た目を調整しました',
    'Service change undone': 'サービスを一つ前の状態に戻しました', 'Service snapshot confirmed': '公開用の状態を確定しました', 'Shared service opened': '共有されたサービスを開きました', 'Service render undone': '生成したサービスを取り消しました',
  };
  return labels[action] ?? action;
}

export type EvidenceItem = { id: string; label: string; detail: string; status: 'pass' | 'blocked' };

export function translatedEvidence(item: EvidenceItem, locale: Locale): EvidenceItem {
  if (locale === 'en') return item;
  const labels: Record<string, string> = { contract: '固定した仕様', schema: '型付きの画面定義', revision: '古い書き込みの拒否', tools: 'ページ上のWebMCP', boundary: '人の決定権', readback: '画面への反映' };
  const details: Record<string, string> = {
    contract: '生成結果を、この出力ハッシュと固定仕様に結び付けました。', revision: '一つ前の版への書き込みを拒否し、状態が変わらないことを確認しました。',
    schema: '許可された画面部品と型付きデータだけで、サービスが構成されていることを確認しました。',
    tools: item.status === 'pass' ? 'document.modelContext が、この工程のツールを受け付けました。' : 'この確認にはWebMCP対応ブラウザが必要です。',
    boundary: '設計の選択と仕様固定が、人の操作として記録されています。', readback: '仕様、版番号、出力ハッシュ、ツールの状態が同じデータを参照しています。',
  };
  return { ...item, label: labels[item.id] ?? item.label, detail: details[item.id] ?? item.detail };
}

export function translatedNotice(message: string, locale: Locale) {
  if (locale === 'en') return message;
  if (message.startsWith('Blocked stale write')) return '古い版への書き込みを拒否しました。現在の版を読み直してください。';
  if (message.startsWith('Invalid service definition')) return '提出されたサービス定義に問題があり、組み立てを中止しました。エラー内容をAIへ返しています。';
  if (message.endsWith('selected by a human.')) return '人が構築する設計を選びました。';
  const messages: Record<string, string> = {
    'Ready for a human or browser agent.': '人またはブラウザ内のAIから始められます。',
    'The agent staged a structured brief. Human acceptance is required.': 'AIが企画要旨を整理しました。内容を人が確認してください。',
    'Three concepts are ready. Only a human can choose one.': '3つの設計案ができました。構築する案は人が選びます。',
    'Build contract staged. The agent cannot freeze it.': 'つくる内容をまとめました。よければ、あなたが次へ進めてください。',
    'Evidence gate passed. The output remains human-controlled.': '検証に合格しました。最終的な決定権は人に残っています。',
    'Evidence recorded; WebMCP browser verification is still required.': '検証結果を記録しました。WebMCP対応ブラウザでの確認が一つ残っています。',
    'Last reversible agent change was undone with a compensating revision.': '取り消せる直前のAI操作を、新しい版として打ち消しました。',
    'Brief accepted by a human. Concept staging is now available.': '人が企画要旨を承認しました。設計案を作成できます。',
    'Contract frozen by a human. The build tool is now available.': 'つくる内容が決まりました。サービスを形にできます。',
    'Factory reset to a clean demo state.': 'この端末のデモを初期化しました。', 'Shared state copied to clipboard.': '共有状態をクリップボードにコピーしました。',
    'Clipboard access was unavailable.': 'クリップボードにアクセスできませんでした。',
    'A typed working service is ready to open and test.': '型付きの画面部品から、実際に操作できるサービスを組み立てました。',
    'The service responded and saved the new state.': '操作結果をサービスへ反映し、このブラウザに保存しました。',
    'The browser agent updated the same service state shown on screen.': 'ブラウザ内のAIが、画面に表示されているサービスの状態を更新しました。',
    'The service appearance changed within the allowlisted Stage Runtime contract.': '許可された範囲で、サービス名、説明、配色のいずれかを変更しました。',
    'The previous service state was restored as a new revision.': '一つ前のサービスの状態を、新しい版として復元しました。',
    'A human confirmed the current service snapshot for publication.': '人が動作確認済みの状態を、公開用として確定しました。',
  };
  return messages[message] ?? message;
}
