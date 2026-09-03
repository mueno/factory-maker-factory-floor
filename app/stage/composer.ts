// Stage Runtime v2 composer: turns an accepted brief into three distinct,
// fully-composed service directions. Used when no browser agent authors a
// definition itself — the local composer must still feel like real software.

import { cleanText, createInitialState } from './engine';
import { LIMITS, type ServiceDefinition, type StageState, type StageTheme } from './types';
import { validateDefinition } from './validate';

export type Archetype = 'tracker' | 'kanban' | 'vote' | 'event' | 'log' | 'habit';
export const ARCHETYPES: Archetype[] = ['tracker', 'kanban', 'vote', 'event', 'log', 'habit'];

export type ConceptSpec = {
  id: string;
  archetype: Archetype;
  label: string;
  promise: string;
  primaryAction: string;
  accent: 'blue' | 'amber' | 'violet';
};

export type BriefInput = { summary: string; audience: string; outcome: string };

const japanesePattern = /[぀-ヿ㐀-鿿]/;

function detectLocale(brief: BriefInput): 'ja' | 'en' {
  return japanesePattern.test(`${brief.summary}${brief.audience}${brief.outcome}`) ? 'ja' : 'en';
}

const KEYWORDS: Record<Archetype, RegExp> = {
  vote: /投票|多数決|ランキング|人気|アンケート|vote|poll|rank|choose|pick/i,
  event: /イベント|予定|出欠|参加|集ま|飲み会|文化祭|旅行|パーティ|event|rsvp|party|trip|meetup|attend/i,
  tracker: /家計|経費|お金|円|支出|収支|予算|記録.*金額|expense|budget|money|spend|cost|track/i,
  kanban: /タスク|進捗|かんばん|カンバン|プロジェクト|手順|やること|作業|task|kanban|project|workflow|todo|plan/i,
  log: /本|読書|映画|マンガ|コレクション|レビュー|星|観察|日記|book|movie|review|collect|library|journal/i,
  habit: /習慣|毎日|継続|トレーニング|運動|勉強|ストレッチ|habit|daily|streak|routine|practice|exercise/i,
};

export function rankArchetypes(brief: BriefInput): Archetype[] {
  const text = `${brief.summary} ${brief.audience} ${brief.outcome}`;
  const scored = ARCHETYPES.map((archetype) => {
    const matches = text.match(KEYWORDS[archetype]);
    return { archetype, score: matches ? matches.length + (KEYWORDS[archetype].test(brief.summary) ? 1 : 0) : 0 };
  }).sort((left, right) => right.score - left.score);
  const ranked = scored.filter((entry) => entry.score > 0).map((entry) => entry.archetype);
  for (const fallback of ['vote', 'kanban', 'tracker', 'event', 'log', 'habit'] as Archetype[]) {
    if (!ranked.includes(fallback)) ranked.push(fallback);
  }
  return ranked;
}

function subject(brief: BriefInput, locale: 'ja' | 'en') {
  const cleaned = cleanText(brief.audience, 30).replace(/[。.!！?？]+$/g, '');
  return cleaned || (locale === 'ja' ? 'みんな' : 'Everyone');
}

const CONCEPT_COPY: Record<Archetype, { ja: { label: string; promise: string; action: string }; en: { label: string; promise: string; action: string } }> = {
  vote: {
    ja: { label: '投票アリーナ', promise: '案の追加・投票・順位・参加状況までひとつの画面に。結果はランキングとグラフで動きます。', action: '案を追加して投票する' },
    en: { label: 'Voting Arena', promise: 'Add options, vote, and watch a live leaderboard with participation stats.', action: 'Add options and cast votes' },
  },
  kanban: {
    ja: { label: '進行ボード', promise: 'やることをカードにして「未着手・進行中・完了」を動かすカンバン。進捗率と残数も自動集計。', action: 'カードを追加して動かす' },
    en: { label: 'Flow Board', promise: 'A kanban board with moving cards plus automatic progress and workload stats.', action: 'Add and move cards' },
  },
  tracker: {
    ja: { label: '記録ダッシュボード', promise: '金額とカテゴリ付きで記録し、合計・平均・内訳グラフをリアルタイムに確認できます。', action: '記録を追加して集計を見る' },
    en: { label: 'Tracking Dashboard', promise: 'Log entries with amounts and categories; totals, averages, and a breakdown chart update live.', action: 'Log entries and watch totals' },
  },
  event: {
    ja: { label: 'イベント司令室', promise: '出欠の回答と準備タスクを1つのアプリで管理。参加率グラフと準備の進捗が常に見えます。', action: '出欠を集めて準備を進める' },
    en: { label: 'Event Command Room', promise: 'Collect RSVPs and run the prep checklist in one app, with live attendance charts.', action: 'Collect RSVPs and prep tasks' },
  },
  log: {
    ja: { label: '記録棚', promise: '星評価とステータス付きで作品や観察を記録。自分だけのランキング棚が育ちます。', action: '評価付きで記録する' },
    en: { label: 'Collection Shelf', promise: 'Log items with star ratings and shelves; your personal ranked library grows as you go.', action: 'Log items with ratings' },
  },
  habit: {
    ja: { label: '継続トラッカー', promise: '今日のチェックと連続日数で習慣を可視化。達成率がその場で更新されます。', action: '今日の分をチェックする' },
    en: { label: 'Streak Tracker', promise: 'Check off daily habits and watch streaks and completion rates update instantly.', action: 'Check off today' },
  },
};

export function composeConcepts(brief: BriefInput, locale: 'ja' | 'en' = detectLocale(brief)): ConceptSpec[] {
  const ranked = rankArchetypes(brief).slice(0, 3);
  const accents: ConceptSpec['accent'][] = ['blue', 'amber', 'violet'];
  return ranked.map((archetype, index) => {
    const copy = CONCEPT_COPY[archetype][locale];
    return { id: `dir-${archetype}`, archetype, label: copy.label, promise: copy.promise, primaryAction: copy.action, accent: accents[index] };
  });
}

const THEME_BY_ARCHETYPE: Record<Archetype, StageTheme> = {
  vote: 'sunrise', kanban: 'aurora', tracker: 'noir', event: 'meadow', log: 'storybook', habit: 'meadow',
};

type Copy = { title: string; description: string; eyebrow: string };

function baseCopy(archetype: Archetype, brief: BriefInput, locale: 'ja' | 'en'): Copy {
  const who = subject(brief, locale);
  const outcome = cleanText(brief.outcome, 60);
  if (locale === 'ja') {
    const titles: Record<Archetype, string> = {
      vote: `${who}の投票アリーナ`, kanban: `${who}の進行ボード`, tracker: `${who}の記録ダッシュボード`,
      event: `${who}のイベント司令室`, log: `${who}の記録棚`, habit: `${who}の継続トラッカー`,
    };
    return {
      title: titles[archetype].slice(0, LIMITS.title),
      description: (outcome ? `ゴールは「${outcome}」。` : '') + CONCEPT_COPY[archetype].ja.promise.slice(0, LIMITS.description - 40),
      eyebrow: CONCEPT_COPY[archetype].ja.action,
    };
  }
  const titles: Record<Archetype, string> = {
    vote: `${who} Voting Arena`, kanban: `${who} Flow Board`, tracker: `${who} Dashboard`,
    event: `${who} Event Room`, log: `${who} Shelf`, habit: `${who} Streaks`,
  };
  return {
    title: titles[archetype].slice(0, LIMITS.title),
    description: (outcome ? `Goal: ${outcome}. ` : '') + CONCEPT_COPY[archetype].en.promise.slice(0, LIMITS.description - 40),
    eyebrow: CONCEPT_COPY[archetype].en.action,
  };
}

function definitionFor(archetype: Archetype, brief: BriefInput, locale: 'ja' | 'en'): ServiceDefinition {
  const ja = locale === 'ja';
  const copy = baseCopy(archetype, brief, locale);
  const common = {
    schemaVersion: 'factory-stage/v2' as const,
    id: `service-${archetype}`,
    title: copy.title,
    description: copy.description,
    sourceSummary: cleanText(brief.summary, LIMITS.sourceSummary) || copy.title,
    theme: THEME_BY_ARCHETYPE[archetype],
  };
  const hero = { type: 'hero' as const, eyebrow: copy.eyebrow, title: copy.title, body: copy.description };

  if (archetype === 'vote') {
    return {
      ...common,
      collections: [{
        key: 'options', label: ja ? '候補' : 'Options',
        fields: [
          { key: 'label', label: ja ? '案' : 'Option', type: 'text' },
          { key: 'votes', label: ja ? '票' : 'Votes', type: 'number', min: 0, max: 100000 },
          { key: 'by', label: ja ? '提案者' : 'Proposed by', type: 'text' },
        ],
        maxRecords: 24,
        seeds: ja
          ? [{ label: '案A', votes: 0, by: '運営' }, { label: '案B', votes: 0, by: '運営' }, { label: '案C', votes: 0, by: '運営' }]
          : [{ label: 'Option A', votes: 0, by: 'host' }, { label: 'Option B', votes: 0, by: 'host' }, { label: 'Option C', votes: 0, by: 'host' }],
      }],
      views: [
        {
          key: 'vote', label: ja ? '投票' : 'Vote',
          blocks: [
            hero,
            { type: 'list', collection: 'options', title: ja ? '一票を入れる' : 'Cast your vote', titleField: 'label', metaFields: ['by'], voteField: 'votes', voteLabel: ja ? '投票' : 'Vote', sort: { field: 'votes', dir: 'desc' } },
            { type: 'form', collection: 'options', title: ja ? '新しい案を追加' : 'Add a new option', submitLabel: ja ? '案を追加' : 'Add option', fields: ['label', 'by'] },
          ],
        },
        {
          key: 'results', label: ja ? '結果' : 'Results',
          blocks: [
            { type: 'stats', items: [
              { label: ja ? '総投票数' : 'Total votes', compute: { op: 'sum', collection: 'options', field: 'votes' } },
              { label: ja ? '候補数' : 'Options', compute: { op: 'count', collection: 'options' } },
              { label: ja ? '最高得票' : 'Top score', compute: { op: 'max', collection: 'options', field: 'votes' } },
            ] },
            { type: 'leaderboard', collection: 'options', title: ja ? '現在のランキング' : 'Live ranking', labelField: 'label', scoreField: 'votes', limit: 8 },
          ],
        },
      ],
      allowedActions: ['add_record', 'increment_field', 'update_record', 'delete_record'],
    };
  }

  if (archetype === 'kanban') {
    const statuses = ja ? ['未着手', '進行中', '完了'] : ['To do', 'Doing', 'Done'];
    const priorities = ja ? ['高', '中', '低'] : ['High', 'Mid', 'Low'];
    return {
      ...common,
      collections: [{
        key: 'cards', label: ja ? 'カード' : 'Cards',
        fields: [
          { key: 'title', label: ja ? 'やること' : 'Task', type: 'text' },
          { key: 'status', label: ja ? '状態' : 'Status', type: 'select', options: statuses, defaultValue: statuses[0] },
          { key: 'priority', label: ja ? '優先度' : 'Priority', type: 'select', options: priorities, defaultValue: priorities[1] },
          { key: 'owner', label: ja ? '担当' : 'Owner', type: 'text' },
        ],
        maxRecords: 40,
        seeds: ja
          ? [
            { title: 'ゴールを1行で決める', status: '完了', priority: '高', owner: 'あなた' },
            { title: '最初のタスクを3つ書き出す', status: '進行中', priority: '高', owner: 'あなた' },
            { title: '完成イメージを共有する', status: '未着手', priority: '中', owner: '' },
          ]
          : [
            { title: 'Write the one-line goal', status: 'Done', priority: 'High', owner: 'you' },
            { title: 'List the first three tasks', status: 'Doing', priority: 'High', owner: 'you' },
            { title: 'Share the target picture', status: 'To do', priority: 'Mid', owner: '' },
          ],
      }],
      views: [
        {
          key: 'board', label: ja ? 'ボード' : 'Board',
          blocks: [
            hero,
            { type: 'board', collection: 'cards', groupField: 'status', cardTitleField: 'title', cardMetaField: 'owner', allowMove: true },
          ],
        },
        {
          key: 'manage', label: ja ? '追加と集計' : 'Add & stats',
          blocks: [
            { type: 'form', collection: 'cards', title: ja ? 'カードを追加' : 'Add a card', submitLabel: ja ? '追加する' : 'Add card', fields: ['title', 'priority', 'owner'] },
            { type: 'progress', label: ja ? '完了率' : 'Completion', compute: { op: 'percent_where', collection: 'cards', where: { field: 'status', equals: statuses[2] } } },
            { type: 'stats', items: [
              { label: ja ? '全カード' : 'All cards', compute: { op: 'count', collection: 'cards' } },
              { label: ja ? '進行中' : 'In flight', compute: { op: 'count', collection: 'cards', where: { field: 'status', equals: statuses[1] } } },
              { label: ja ? '残り' : 'Remaining', compute: { op: 'count', collection: 'cards', where: { field: 'status', equals: statuses[0] } } },
            ] },
            { type: 'chart', collection: 'cards', title: ja ? '優先度の内訳' : 'By priority', groupField: 'priority', measure: 'count' },
          ],
        },
      ],
      allowedActions: ['add_record', 'move_record', 'update_record', 'delete_record'],
    };
  }

  if (archetype === 'tracker') {
    const categories = ja ? ['食費', '交通', '娯楽', '仕事', 'その他'] : ['Food', 'Transit', 'Fun', 'Work', 'Other'];
    return {
      ...common,
      collections: [{
        key: 'entries', label: ja ? '記録' : 'Entries',
        fields: [
          { key: 'label', label: ja ? '内容' : 'Item', type: 'text' },
          { key: 'amount', label: ja ? '金額' : 'Amount', type: 'number', min: 0, max: 1000000 },
          { key: 'category', label: ja ? 'カテゴリ' : 'Category', type: 'select', options: categories, defaultValue: categories[0] },
        ],
        maxRecords: 60,
        seeds: ja
          ? [{ label: 'ランチ', amount: 900, category: '食費' }, { label: '電車', amount: 320, category: '交通' }]
          : [{ label: 'Lunch', amount: 9, category: 'Food' }, { label: 'Train', amount: 3, category: 'Transit' }],
      }],
      views: [
        {
          key: 'log', label: ja ? '記録' : 'Log',
          blocks: [
            hero,
            { type: 'form', collection: 'entries', title: ja ? '記録を追加' : 'Add an entry', submitLabel: ja ? '記録する' : 'Log it' },
            { type: 'list', collection: 'entries', title: ja ? '最近の記録' : 'Recent entries', titleField: 'label', metaFields: ['amount'], badgeField: 'category', allowDelete: true, sort: { field: 'amount', dir: 'desc' }, limit: 12 },
          ],
        },
        {
          key: 'insights', label: ja ? '分析' : 'Insights',
          blocks: [
            { type: 'stats', items: [
              { label: ja ? '合計' : 'Total', compute: { op: 'sum', collection: 'entries', field: 'amount' }, ...(ja ? { suffix: '円' } : {}) },
              { label: ja ? '平均' : 'Average', compute: { op: 'avg', collection: 'entries', field: 'amount' }, ...(ja ? { suffix: '円' } : {}) },
              { label: ja ? '件数' : 'Entries', compute: { op: 'count', collection: 'entries' } },
              { label: ja ? '最大' : 'Largest', compute: { op: 'max', collection: 'entries', field: 'amount' }, ...(ja ? { suffix: '円' } : {}) },
            ] },
            { type: 'chart', collection: 'entries', title: ja ? 'カテゴリ別の合計' : 'Total by category', groupField: 'category', measure: { sum: 'amount' } },
          ],
        },
      ],
      allowedActions: ['add_record', 'update_record', 'delete_record'],
    };
  }

  if (archetype === 'event') {
    const answers = ja ? ['参加', '未定', '欠席'] : ['Yes', 'Maybe', 'No'];
    return {
      ...common,
      collections: [
        {
          key: 'guests', label: ja ? '出欠' : 'RSVPs',
          fields: [
            { key: 'name', label: ja ? '名前' : 'Name', type: 'text' },
            { key: 'answer', label: ja ? '回答' : 'Answer', type: 'select', options: answers, defaultValue: answers[0] },
            { key: 'note', label: ja ? 'ひとこと' : 'Note', type: 'text' },
          ],
          maxRecords: 40,
        },
        {
          key: 'prep', label: ja ? '準備タスク' : 'Prep tasks',
          fields: [
            { key: 'title', label: ja ? '準備すること' : 'Task', type: 'text' },
            { key: 'done', label: ja ? '完了' : 'Done', type: 'boolean' },
          ],
          maxRecords: 30,
          seeds: ja
            ? [{ title: '日程を決める', done: true }, { title: '場所を予約する', done: false }, { title: '持ち物リストを共有', done: false }]
            : [{ title: 'Fix the date', done: true }, { title: 'Book the place', done: false }, { title: 'Share the packing list', done: false }],
        },
      ],
      views: [
        {
          key: 'rsvp', label: ja ? '出欠' : 'RSVP',
          blocks: [
            hero,
            { type: 'form', collection: 'guests', title: ja ? '出欠を回答する' : 'Reply here', submitLabel: ja ? '回答を送る' : 'Send reply' },
            { type: 'chart', collection: 'guests', title: ja ? '回答の内訳' : 'Replies', groupField: 'answer', measure: 'count' },
            { type: 'list', collection: 'guests', title: ja ? '回答一覧' : 'All replies', titleField: 'name', metaFields: ['note'], badgeField: 'answer' },
          ],
        },
        {
          key: 'prep', label: ja ? '準備' : 'Prep',
          blocks: [
            { type: 'progress', label: ja ? '準備の進み' : 'Prep progress', compute: { op: 'percent_true', collection: 'prep', field: 'done' } },
            { type: 'list', collection: 'prep', title: ja ? 'タップで完了にする' : 'Tap to complete', titleField: 'title', checkField: 'done' },
            { type: 'form', collection: 'prep', title: ja ? '準備タスクを追加' : 'Add a prep task', submitLabel: ja ? '追加する' : 'Add task', fields: ['title'] },
            { type: 'stats', items: [
              { label: ja ? '参加' : 'Yes', compute: { op: 'count', collection: 'guests', where: { field: 'answer', equals: answers[0] } } },
              { label: ja ? '未定' : 'Maybe', compute: { op: 'count', collection: 'guests', where: { field: 'answer', equals: answers[1] } } },
              { label: ja ? '残タスク' : 'Open tasks', compute: { op: 'count', collection: 'prep', where: { field: 'done', equals: false } } },
            ] },
          ],
        },
      ],
      allowedActions: ['add_record', 'toggle_field', 'update_record', 'move_record', 'delete_record'],
    };
  }

  if (archetype === 'log') {
    const shelves = ja ? ['読みたい', '読書中', '読了'] : ['Want', 'Reading', 'Finished'];
    return {
      ...common,
      collections: [{
        key: 'items', label: ja ? '記録' : 'Items',
        fields: [
          { key: 'title', label: ja ? 'タイトル' : 'Title', type: 'text' },
          { key: 'rating', label: ja ? '星（1-5）' : 'Stars (1-5)', type: 'number', min: 0, max: 5 },
          { key: 'shelf', label: ja ? '棚' : 'Shelf', type: 'select', options: shelves, defaultValue: shelves[0] },
          { key: 'memo', label: ja ? 'ひとこと' : 'Memo', type: 'text' },
        ],
        maxRecords: 60,
      }],
      views: [
        {
          key: 'log', label: ja ? '記録' : 'Log',
          blocks: [
            hero,
            { type: 'form', collection: 'items', title: ja ? '1件記録する' : 'Log one item', submitLabel: ja ? '棚に入れる' : 'Add to shelf' },
            { type: 'board', collection: 'items', title: ja ? '棚の様子' : 'Shelves', groupField: 'shelf', cardTitleField: 'title', cardMetaField: 'memo', allowMove: true },
          ],
        },
        {
          key: 'best', label: ja ? 'ランキング' : 'Ranking',
          blocks: [
            { type: 'stats', items: [
              { label: ja ? '登録数' : 'Items', compute: { op: 'count', collection: 'items' } },
              { label: ja ? '平均評価' : 'Avg stars', compute: { op: 'avg', collection: 'items', field: 'rating' } },
              { label: ja ? '読了' : 'Finished', compute: { op: 'count', collection: 'items', where: { field: 'shelf', equals: shelves[2] } } },
            ] },
            { type: 'leaderboard', collection: 'items', title: ja ? 'マイベスト' : 'My best', labelField: 'title', scoreField: 'rating', limit: 10 },
          ],
        },
      ],
      allowedActions: ['add_record', 'update_record', 'move_record', 'delete_record'],
    };
  }

  // habit
  return {
    ...common,
    collections: [{
      key: 'habits', label: ja ? '習慣' : 'Habits',
      fields: [
        { key: 'name', label: ja ? '習慣' : 'Habit', type: 'text' },
        { key: 'today', label: ja ? '今日やった' : 'Done today', type: 'boolean' },
        { key: 'streak', label: ja ? '連続日数' : 'Streak', type: 'number', min: 0, max: 3650 },
      ],
      maxRecords: 20,
      seeds: ja
        ? [{ name: '朝のストレッチ', today: false, streak: 3 }, { name: '10分読書', today: false, streak: 1 }]
        : [{ name: 'Morning stretch', today: false, streak: 3 }, { name: 'Read 10 minutes', today: false, streak: 1 }],
    }],
    views: [
      {
        key: 'today', label: ja ? '今日' : 'Today',
        blocks: [
          hero,
          { type: 'progress', label: ja ? '今日の達成率' : "Today's completion", compute: { op: 'percent_true', collection: 'habits', field: 'today' } },
          { type: 'list', collection: 'habits', title: ja ? 'タップでチェック' : 'Tap to check off', titleField: 'name', metaFields: ['streak'], checkField: 'today' },
          { type: 'form', collection: 'habits', title: ja ? '習慣を追加' : 'Add a habit', submitLabel: ja ? '追加する' : 'Add habit', fields: ['name'] },
        ],
      },
      {
        key: 'records', label: ja ? '記録' : 'Records',
        blocks: [
          { type: 'stats', items: [
            { label: ja ? '習慣の数' : 'Habits', compute: { op: 'count', collection: 'habits' } },
            { label: ja ? '最長連続' : 'Longest streak', compute: { op: 'max', collection: 'habits', field: 'streak' }, suffix: ja ? '日' : 'd' },
          ] },
          { type: 'leaderboard', collection: 'habits', title: ja ? '連続日数ランキング' : 'Streak ranking', labelField: 'name', scoreField: 'streak', limit: 8 },
        ],
      },
    ],
    allowedActions: ['add_record', 'toggle_field', 'increment_field', 'update_record', 'delete_record'],
  };
}

export function composeDefinition(archetype: Archetype, brief: BriefInput, locale: 'ja' | 'en' = detectLocale(brief)): { definition: ServiceDefinition; state: StageState } {
  const candidate = definitionFor(archetype, brief, locale);
  const checked = validateDefinition(candidate);
  if (!checked.ok) throw new Error(`composer produced an invalid definition: ${checked.errors.join(' / ')}`);
  return { definition: checked.definition, state: createInitialState(checked.definition) };
}
