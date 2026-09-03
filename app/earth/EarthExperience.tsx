'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageSwitch, useLocale } from '../i18n';
import { SiteFooter } from '../site-footer';
import { EarthGlobe, type EarthGlobeHandle } from './EarthGlobe';
import {
  AMOC_2100_BY_SCENARIO,
  createInitialScene,
  REGIONS,
  SCENARIOS,
  SCIENCE_SOURCES,
  sceneScience,
  type EarthSceneState,
  type LayerId,
  type RegionId,
  type RenderStyle,
  type ScenarioId,
} from './science';
import { buildEarthTools, EARTH_TOOL_NAMES, getModelContext } from './tools';

type RecognitionEvent = Event & { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;
type Drawer = 'closed' | 'data' | 'conditions' | 'display';
type MutationMode = 'interaction' | 'story' | 'start-story';

const COPY = {
  en: {
    brand: 'TERRA',
    tag: 'Live Earth',
    science: 'Built from published climate assessments',
    prompt: 'Ask Earth what you want to understand…',
    listen: 'Speak',
    stop: 'Stop listening',
    topics: 'Explore a connection',
    layers: 'What to see',
    viewpoints: 'Viewpoint',
    timeline: 'Year',
    coupled: 'The whole picture',
    temperature: 'Warming',
    sea_ice: 'Arctic ice',
    currents: 'Atlantic circulation',
    sea_level: 'Sea level',
    global: 'Whole Earth',
    arctic: 'Arctic Ocean',
    north_atlantic: 'North Atlantic',
    europe: 'Northern Europe',
    japan: 'Around Japan',
    scientific: 'See the numbers',
    cinematic: 'See the motion',
    storybook: 'Explain simply',
    data: 'Sources',
    conditions: 'Time & assumptions',
    places: 'Place',
    display: 'How to explore',
    close: 'Close',
    reset: 'Return to selected place',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    interaction: 'Drag to rotate · Scroll or pinch to zoom',
    audioOn: 'Ambient sound on',
    audioOff: 'Turn on ambient sound',
    narrationOn: 'Narration on',
    narrationOff: 'Narration off',
    connected: 'AI can control this scene',
    disconnected: 'Open in a WebMCP-enabled browser for AI control',
    explore: 'Explore',
    story: 'Follow the Arctic → Atlantic story',
    sourcesTitle: 'About what you are seeing',
    sourcesIntro: 'The scene links published observations and assessed ranges. It is designed for exploration, not prediction.',
    currentData: 'Current evidence',
    activity: 'Recent shared actions',
    limitation: 'Exploratory visualization. It does not run a global climate model, predict weather, or map local flooding.',
    hint: 'Try “Show the Arctic in 2050” or “What happens if Atlantic circulation weakens?”',
    conditionsIntro: 'Choose a year and one of the IPCC assessed emissions pathways.',
    displayIntro: 'These choices change the explanation, not the underlying values.',
    assessedRange: 'IPCC assessed range',
    explanatory: 'Explanatory view',
    amocReduced: 'Reduced display based on the scenario-specific CMIP6 ensemble mean',
    currentVisualBasis: 'Currents: OSCAR (NASA PO.DAAC), July 2014 mean · open streamlines from six 5-day composites',
    temperatureVisualBasis: 'Sea surface temperature: NOAA OISST v2.1 preliminary · August 2026 mean of 30 available daily fields',
    seaIceVisualBasis: 'Sea-ice shape: NSIDC Sea Ice Index v4 · September 2025 extent; future years are illustrative',
    lightingNote: 'The day/night boundary is presentation lighting, not the current solar position.',
    seaLevelReduced: 'Reduced-order display',
    observed: 'Observed',
    illustrative: 'Illustrative',
    renderUnavailable: '3D rendering is unavailable. The scientific information remains available.',
  },
  ja: {
    brand: 'TERRA',
    tag: '対話でめぐる地球',
    science: '公開された気候研究に基づく表示',
    prompt: '知りたいことを、地球に話しかける…',
    listen: '声で尋ねる',
    stop: '音声入力を止める',
    topics: 'つながりから探す',
    layers: '見るテーマ',
    viewpoints: '視点',
    timeline: '年代',
    coupled: '地球全体のつながり',
    temperature: '気温の変化',
    sea_ice: '北極の海氷',
    currents: '大西洋の海流',
    sea_level: '海面の上昇',
    global: '地球全体',
    arctic: '北極海',
    north_atlantic: '北大西洋',
    europe: '北ヨーロッパ',
    japan: '日本周辺',
    scientific: '数値を詳しく',
    cinematic: '動きで見る',
    storybook: 'やさしく読む',
    data: '資料',
    conditions: '年代と前提',
    places: '場所',
    display: '表示',
    close: '閉じる',
    reset: '選んだ場所に戻る',
    zoomIn: '拡大する',
    zoomOut: '縮小する',
    interaction: 'ドラッグで回す · スクロール／ピンチで拡大・縮小',
    audioOn: '環境音 ON',
    audioOff: '環境音をつける',
    narrationOn: '読み上げ ON',
    narrationOff: '読み上げ OFF',
    connected: 'AIもこの地球を動かせます',
    disconnected: 'WebMCP対応ブラウザではAIからも操作できます',
    explore: '表示する',
    story: '北極から大西洋への変化をたどる',
    sourcesTitle: 'いま見ている情報について',
    sourcesIntro: '公開された観測値と研究上の評価幅を結び、変化のつながりを理解するための画面です。',
    currentData: '現在の表示',
    activity: '人とAIの操作履歴',
    limitation: '地球の変化を理解するための可視化です。全球気候モデル、天気予報、地域の浸水予測ではありません。',
    hint: '例：「2050年の北極を見せて」「大西洋の海流が弱まるとどうなる？」',
    conditionsIntro: '年代と、IPCCが評価した排出経路を選べます。',
    displayIntro: 'ここで変わるのは説明の仕方です。数値そのものは変わりません。',
    assessedRange: 'IPCCの評価幅',
    explanatory: '変化を理解するための表示',
    amocReduced: 'シナリオ別CMIP6モデル平均をもとにした簡略表示',
    currentVisualBasis: '海流：OSCAR（NASA PO.DAAC）2014年7月平均 · 5日合成値6期間から生成した開いた流線',
    temperatureVisualBasis: '海面水温：NOAA OISST v2.1速報値 · 2026年8月に取得できる30日分の平均',
    seaIceVisualBasis: '海氷の形：NSIDC Sea Ice Index v4 · 2025年9月の分布を基準とし、将来年は説明用表示',
    lightingNote: '昼夜の境界は画面演出用の固定照明で、現在の太陽位置を示すものではありません。',
    seaLevelReduced: '簡略表示',
    observed: '観測値',
    illustrative: '説明用表示',
    renderUnavailable: '3D表示を利用できません。科学情報は引き続き確認できます。',
  },
} as const;

const TOPIC_REGIONS: Record<LayerId, RegionId> = {
  coupled: 'global',
  temperature: 'global',
  sea_ice: 'arctic',
  currents: 'north_atlantic',
  sea_level: 'global',
};

const LAYER_GLYPHS: Record<LayerId, string> = {
  coupled: '◎',
  temperature: '↗',
  sea_ice: '◇',
  currents: '≈',
  sea_level: '⌁',
};

const REGION_GLYPHS: Record<RegionId, string> = {
  global: '◉',
  arctic: '△',
  north_atlantic: '≈',
  europe: '◇',
  japan: '○',
};

function fixed(value: number, digits = 1) {
  return value.toFixed(digits);
}

function narration(scene: EarthSceneState, locale: 'en' | 'ja') {
  const science = sceneScience(scene);
  if (locale === 'ja') {
    if (scene.layer === 'sea_ice') {
      return `${scene.year}年の北極海氷を、NSIDCの2025年9月の分布とIPCCの「ほぼ氷のない北極海」の基準から説明用に描いています。将来の特定年における海氷分布を予測したものではありません。`;
    }
    if (scene.layer === 'currents') {
      return `${SCENARIOS[scene.scenario].label}のCMIP6モデル平均では、AMOCは2100年までに約${AMOC_2100_BY_SCENARIO[scene.scenario]}％弱まります。この画面の${scene.year}年値は、その平均値と2025年を直線で結んだ簡略表示です。光の流線は、衛星観測などから推定されたOSCARの2014年7月の海面流速を平均して生成しています。`;
    }
    if (scene.layer === 'sea_level') {
      return `${scene.year}年の世界平均海面は、基準期間より約${fixed(science.seaLevel.best, 2)}m高い表示です。IPCCの評価幅は${fixed(science.seaLevel.low, 2)}〜${fixed(science.seaLevel.high, 2)}mです。地域の浸水を予測したものではありません。`;
    }
    if (scene.layer === 'temperature') {
      return `${SCENARIOS[scene.scenario].label}では、${scene.year}年の世界平均気温は産業革命前より約${fixed(science.temperature.best)}℃高くなる評価です。IPCCの評価幅は${fixed(science.temperature.low)}〜${fixed(science.temperature.high)}℃です。地球上の色はNOAA OISSTによる2026年8月の海面水温で、将来予測ではありません。`;
    }
    return `${scene.year}年の地球を、気温、北極海氷、大西洋の循環、海面上昇のつながりとして見ています。気になる変化を選ぶか、言葉で尋ねてください。`;
  }
  if (scene.layer === 'sea_ice') return `The ${scene.year} Arctic sea-ice view illustrates change from the NSIDC September 2025 extent toward the IPCC practically ice-free threshold. It is not a forecast of the ice shape in a specific future year.`;
  if (scene.layer === 'currents') return `The CMIP6 ensemble mean for ${SCENARIOS[scene.scenario].label} shows about ${AMOC_2100_BY_SCENARIO[scene.scenario]} percent AMOC weakening by 2100. This ${scene.year} value linearly connects 2025 with that mean. The luminous streamlines are generated from the July 2014 mean of OSCAR surface-current estimates derived from satellite and related observations.`;
  if (scene.layer === 'sea_level') return `Global mean sea level is shown at about ${fixed(science.seaLevel.best, 2)} metres in ${scene.year}, with an assessed range of ${fixed(science.seaLevel.low, 2)}–${fixed(science.seaLevel.high, 2)} metres. This is not local inundation.`;
  if (scene.layer === 'temperature') return `Under ${SCENARIOS[scene.scenario].label}, global surface temperature in ${scene.year} is assessed at about ${fixed(science.temperature.best)}°C above 1850–1900, with a range of ${fixed(science.temperature.low)}–${fixed(science.temperature.high)}°C. Globe colors show NOAA OISST sea-surface temperature for August 2026, not a future forecast.`;
  return `Explore how warming, Arctic sea ice, Atlantic circulation, and sea-level rise connect in ${scene.year}. Choose a topic or ask in your own words.`;
}

function sceneHeading(scene: EarthSceneState, locale: 'en' | 'ja') {
  const headings = {
    en: {
      coupled: 'One Earth. Many connected changes.',
      temperature: 'How much warmer could Earth become?',
      sea_ice: 'Watch the Arctic’s summer shield shrink.',
      currents: 'Follow the Atlantic’s moving heat.',
      sea_level: 'See global sea level rise over time.',
    },
    ja: {
      coupled: '地球の変化は、ひとつにつながっている。',
      temperature: '地球は、どこまで暖かくなるのか。',
      sea_ice: '北極の夏から、白い海が減っていく。',
      currents: '海が運ぶ熱の流れを追う。',
      sea_level: '世界の海面が上がる過程を見る。',
    },
  };
  return headings[locale][scene.layer];
}

function currentSourceFor(layer: LayerId) {
  if (layer === 'sea_ice') return 'NSIDC Sea Ice Index v4';
  if (layer === 'currents') return 'OSCAR 2014-07 · Weijer et al. 2020';
  if (layer === 'temperature') return 'NOAA OISST v2.1 2026-08 · IPCC AR6 WGI';
  return 'IPCC AR6 WGI';
}

export function EarthExperience() {
  const { locale } = useLocale();
  const t = COPY[locale];
  const [scene, setScene] = useState(createInitialScene);
  const [command, setCommand] = useState('');
  const [notice, setNotice] = useState('');
  const [logs, setLogs] = useState<string[]>(['earth_read_scene → r0']);
  const [registered, setRegistered] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [narrationOn, setNarrationOn] = useState(true);
  const [audioOn, setAudioOn] = useState(false);
  const [globeReady, setGlobeReady] = useState(true);
  const [drawer, setDrawer] = useState<Drawer>('closed');
  const [showGestureHint, setShowGestureHint] = useState(true);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const sceneRef = useRef(scene);
  const globeRef = useRef<EarthGlobeHandle | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const audioRef = useRef<{ context: AudioContext; gain: GainNode; pan: StereoPannerNode; oscillator: OscillatorNode } | null>(null);
  const storyTimers = useRef<number[]>([]);
  const yearCommitTimer = useRef<number | null>(null);
  const playStoryRef = useRef<(story: NonNullable<EarthSceneState['story']>) => void>(() => undefined);
  const localeRef = useRef(locale);
  const narrationRef = useRef(narrationOn);

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => { narrationRef.current = narrationOn; }, [narrationOn]);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowGestureHint(false), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  const speak = useCallback((next: EarthSceneState) => {
    if (!narrationRef.current || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narration(next, localeRef.current));
    utterance.lang = localeRef.current === 'ja' ? 'ja-JP' : 'en-US';
    utterance.rate = 0.96;
    speechSynthesis.speak(utterance);
  }, []);

  const cancelPendingStory = useCallback(() => {
    storyTimers.current.forEach(window.clearTimeout);
    storyTimers.current = [];
  }, []);

  const mutate = useCallback((
    expectedRevision: number,
    action: string,
    change: (current: EarthSceneState) => EarthSceneState,
    mode: MutationMode = 'interaction',
  ) => {
    const current = sceneRef.current;
    if (expectedRevision !== current.revision) return { ok: false, error: 'revision_conflict', current_revision: current.revision };
    if (mode !== 'story') cancelPendingStory();
    const changed = change(current);
    const next = {
      ...changed,
      story: mode === 'interaction' ? null : changed.story,
      revision: current.revision + 1,
      lastAction: action,
    };
    sceneRef.current = next;
    setScene(next);
    setLogs((items) => [`${action} → r${next.revision}`, ...items].slice(0, 6));
    window.setTimeout(() => speak(next), 500);
    return { ok: true, scene: next, science: sceneScience(next) };
  }, [cancelPendingStory, speak]);

  const host = useMemo(() => ({
    read: () => ({ scene: sceneRef.current, science: sceneScience(sceneRef.current), sources: SCIENCE_SOURCES, limitation: COPY.en.limitation }),
    focus: (region: RegionId, revision: number) => mutate(revision, `earth_focus_region(${region})`, (current) => ({ ...current, region, story: null })),
    setLayer: (layer: LayerId, revision: number) => mutate(revision, `earth_set_layer(${layer})`, (current) => ({ ...current, layer, story: null })),
    setScenario: (scenario: ScenarioId, year: number, revision: number) => mutate(revision, `earth_set_scenario(${scenario},${year})`, (current) => ({ ...current, scenario, year, story: null })),
    setStyle: (style: RenderStyle, revision: number) => mutate(revision, `earth_set_render_style(${style})`, (current) => ({ ...current, style })),
    playStory: (story: NonNullable<EarthSceneState['story']>, revision: number) => {
      const result = mutate(revision, `earth_play_story(${story})`, (current) => ({ ...current, story }), 'start-story');
      if (result.ok) window.setTimeout(() => playStoryRef.current(story), 0);
      return result;
    },
  }), [mutate]);

  useEffect(() => {
    const context = getModelContext();
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tools = buildEarthTools(host);
    Promise.all(tools.map((tool) => context.registerTool(tool, { signal: controller.signal })))
      .then(() => setRegistered(tools.map((tool) => tool.name)))
      .catch(() => { if (!controller.signal.aborted) setRegistered([]); });
    return () => controller.abort();
  }, [host]);

  const startStory = useCallback((story: NonNullable<EarthSceneState['story']>) => {
    cancelPendingStory();
    const steps: Array<[number, Partial<EarthSceneState>, string]> = story === 'sea_level'
      ? [
          [0, { region: 'global', layer: 'sea_level', year: 2050, story: 'sea_level' }, 'story: assessed global mean sea level'],
          [5000, { region: 'japan', layer: 'sea_level', year: 2100, story: null }, 'story: global mean sea level near Japan (not local inundation)'],
        ]
      : [
          [0, { region: 'arctic', layer: 'sea_ice', year: 2050, story: 'arctic_amoc_europe' }, 'story: Arctic sea ice'],
          [4500, { region: 'north_atlantic', layer: 'currents', year: 2085 }, 'story: North Atlantic circulation'],
          [9000, { region: 'europe', layer: 'temperature', year: 2100, story: null }, 'story: assessed European context'],
        ];
    storyTimers.current = steps.map(([delay, patch, action]) => window.setTimeout(() => {
      mutate(sceneRef.current.revision, action, (current) => ({ ...current, ...patch }), 'story');
    }, delay));
  }, [cancelPendingStory, mutate]);

  useEffect(() => { playStoryRef.current = startStory; }, [startStory]);
  useEffect(() => () => storyTimers.current.forEach(window.clearTimeout), []);
  useEffect(() => () => {
    if (yearCommitTimer.current !== null) window.clearTimeout(yearCommitTimer.current);
  }, []);

  const scheduleYearChange = useCallback((year: number) => {
    setDraftYear(year);
    if (yearCommitTimer.current !== null) window.clearTimeout(yearCommitTimer.current);
    const expectedRevision = sceneRef.current.revision;
    const scenario = sceneRef.current.scenario;
    yearCommitTimer.current = window.setTimeout(() => {
      yearCommitTimer.current = null;
      host.setScenario(scenario, year, expectedRevision);
      setDraftYear(null);
    }, 250);
  }, [host]);

  const chooseTopic = useCallback((layer: LayerId) => {
    mutate(sceneRef.current.revision, `explore_topic(${layer})`, (current) => ({
      ...current,
      layer,
      region: TOPIC_REGIONS[layer],
      story: null,
    }));
  }, [mutate]);

  const executeCommand = useCallback((raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    cancelPendingStory();
    let patch: Partial<EarthSceneState> = {};
    if (/北極|arctic/.test(value)) patch = { ...patch, region: 'arctic', layer: 'sea_ice' };
    if (/大西洋|atlantic|amoc|海流/.test(value)) patch = { ...patch, region: 'north_atlantic', layer: 'currents' };
    if (/ヨーロッパ|欧州|europe/.test(value)) patch = { ...patch, region: 'europe', layer: 'temperature' };
    if (/日本|東京|japan|tokyo/.test(value)) patch = { ...patch, region: 'japan' };
    if (/海面|sea.level|inundation/.test(value)) patch = { ...patch, layer: 'sea_level' };
    if (/やさしく|わかりやす|simple|storybook/.test(value)) patch = { ...patch, style: 'storybook' };
    if (/数値|詳しく|科学|scientific/.test(value)) patch = { ...patch, style: 'scientific' };
    if (/動き|映画|cinematic/.test(value)) patch = { ...patch, style: 'cinematic' };
    if (/低排出|ssp1/.test(value)) patch = { ...patch, scenario: 'ssp1_26' };
    if (/高排出|ssp5/.test(value)) patch = { ...patch, scenario: 'ssp5_85' };
    const year = value.match(/20[3-9]0|2100/)?.[0];
    if (year) patch.year = Number(year);
    if (Object.keys(patch).length === 0) {
      setNotice(locale === 'ja'
        ? '場所や年代、「海氷」「海流」「気温」「海面」など、見たいものを含めて尋ねてください。'
        : 'Mention a place, year, sea ice, current, temperature, or sea level.');
      return;
    }
    const current = sceneRef.current;
    const next = { ...current, ...patch, revision: current.revision + 1, lastAction: `voice_or_text(${raw.slice(0, 52)})`, story: null };
    sceneRef.current = next;
    setScene(next);
    setLogs((items) => [`voice/text → r${next.revision}`, ...items].slice(0, 6));
    setNotice('');
    setCommand('');
    speak(next);
  }, [cancelPendingStory, locale, speak]);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const constructor = (window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;
    if (!constructor) {
      setNotice(locale === 'ja'
        ? 'このブラウザでは音声入力を利用できません。入力欄から尋ねてください。'
        : 'Voice input is unavailable in this browser. Use the text field.');
      return;
    }
    const recognition = new constructor();
    recognition.lang = locale === 'ja' ? 'ja-JP' : 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setCommand(transcript);
      executeCommand(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice(locale === 'ja' ? '音声を取得できませんでした。マイクの利用許可をご確認ください。' : 'Voice input failed. Check microphone permission.');
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [executeCommand, listening, locale]);

  const toggleAudio = useCallback(async () => {
    if (audioRef.current) {
      const active = !audioOn;
      audioRef.current.gain.gain.setTargetAtTime(active ? 0.025 : 0, audioRef.current.context.currentTime, 0.08);
      setAudioOn(active);
      return;
    }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    oscillator.type = 'sine';
    oscillator.frequency.value = 92;
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    gain.gain.value = 0.025;
    oscillator.connect(filter).connect(gain).connect(pan).connect(context.destination);
    oscillator.start();
    audioRef.current = { context, gain, pan, oscillator };
    setAudioOn(true);
  }, [audioOn]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const frequency = scene.region === 'arctic' ? 68 : scene.layer === 'currents' ? 116 : 92;
    audio.oscillator.frequency.setTargetAtTime(frequency, audio.context.currentTime, 0.8);
    audio.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, REGIONS[scene.region].lon / 180)), audio.context.currentTime, 0.8);
  }, [scene]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    speechSynthesis?.cancel();
    const audio = audioRef.current;
    if (audio) {
      audio.oscillator.stop();
      void audio.context.close();
    }
  }, []);

  const science = sceneScience(scene);
  const layerKeys: LayerId[] = ['coupled', 'temperature', 'sea_ice', 'currents', 'sea_level'];
  const regionKeys: RegionId[] = ['global', 'arctic', 'north_atlantic', 'europe', 'japan'];
  const styleKeys: RenderStyle[] = ['cinematic', 'scientific', 'storybook'];
  const source = currentSourceFor(scene.layer);
  const displayedYear = draftYear ?? scene.year;
  const seaIceBasisLabel = scene.year <= 2025 ? t.observed : t.illustrative;
  const modelContextReady = registered.length === EARTH_TOOL_NAMES.length;

  return (
    <main className={`terra-shell terra-${scene.style}`}>
      <section className="terra-stage" aria-label={t.tag}>
        <EarthGlobe ref={globeRef} scene={scene} onCapability={setGlobeReady} />

        <header className="terra-header">
          <div className="terra-brand">
            <span aria-hidden="true">◉</span>
            <div><strong>{t.brand}</strong><small>{t.tag}</small></div>
          </div>
          <div className="terra-header-actions">
            <button className="terra-science-button" onClick={() => setDrawer('data')}>
              <i aria-hidden="true" />
              <span>{t.science}</span>
            </button>
            <LanguageSwitch compact />
          </div>
        </header>

        <aside className="terra-layer-panel" aria-label={t.layers}>
          <div className="terra-layer-heading">
            <span>{t.layers}</span>
            <small>{t[scene.layer]}</small>
          </div>
          <nav aria-label={t.topics}>
            {layerKeys.map((layer) => (
              <button
                key={layer}
                className={scene.layer === layer ? 'active' : ''}
                onClick={() => chooseTopic(layer)}
                aria-pressed={scene.layer === layer}
              >
                <span aria-hidden="true">{LAYER_GLYPHS[layer]}</span>
                <strong>{t[layer]}</strong>
              </button>
            ))}
          </nav>
        </aside>

        <section className="terra-story-card" aria-live="polite">
          <div className="terra-context-line">
            <span>{scene.year}</span>
            <span>{SCENARIOS[scene.scenario].label}</span>
            <span>{t[scene.region]}</span>
          </div>
          <h1>{sceneHeading(scene, locale)}</h1>
          <p>{narration(scene, locale)}</p>
          <div className="terra-highlight">
            {scene.layer === 'temperature' && <><strong>+{fixed(science.temperature.best)}°C</strong><span>{fixed(science.temperature.low)}–{fixed(science.temperature.high)}°C · {t.assessedRange}</span></>}
            {scene.layer === 'sea_ice' && <><strong>{fixed(science.seaIceDisplay.extent, 2)} million km²</strong><span className="terra-basis-badge">{seaIceBasisLabel}</span></>}
            {scene.layer === 'currents' && <><strong>−{fixed(science.amocDecline.best)}%</strong><span>{t.amocReduced}</span></>}
            {scene.layer === 'sea_level' && <><strong>+{fixed(science.seaLevel.best, 2)}m</strong><span>{fixed(science.seaLevel.low, 2)}–{fixed(science.seaLevel.high, 2)}m · {t.assessedRange}</span><em className="terra-basis-badge">{t.seaLevelReduced}</em></>}
            {scene.layer === 'coupled' && <><strong>+{fixed(science.temperature.best)}°C</strong><span>{source}</span></>}
          </div>
          {scene.layer === 'currents' && <small className="terra-visual-basis">{t.currentVisualBasis}</small>}
          {scene.layer === 'temperature' && <small className="terra-visual-basis">{t.temperatureVisualBasis}</small>}
          {scene.layer === 'sea_ice' && <small className="terra-visual-basis">{t.seaIceVisualBasis}</small>}
          <button className="terra-inline-link" onClick={() => setDrawer('data')}>{t.data} <span aria-hidden="true">↗</span></button>
        </section>

        {!globeReady && <div className="terra-error">{t.renderUnavailable}</div>}

        {showGestureHint && (
          <button className="terra-gesture-hint" onClick={() => setShowGestureHint(false)}>
            <span aria-hidden="true">↔</span>{t.interaction}
          </button>
        )}

        <section className="terra-conductor" aria-label={locale === 'ja' ? '地球を操作する' : 'Control Earth'}>
          <div className="terra-suggestions">
            <button onClick={() => executeCommand(locale === 'ja' ? '2050年の北極を見せて' : 'Show the Arctic in 2050')}>
              {locale === 'ja' ? '2050年の北極を見る' : 'See the Arctic in 2050'}
            </button>
            <button onClick={() => host.playStory('arctic_amoc_europe', sceneRef.current.revision)}>{t.story}</button>
          </div>
          <div className="terra-hud-deck">
            <div className="terra-view-row">
              <span className="terra-control-label">{t.viewpoints}</span>
              <div className="terra-view-options">
                {regionKeys.map((region) => (
                  <button
                    key={region}
                    className={scene.region === region ? 'active' : ''}
                    onClick={() => host.focus(region, sceneRef.current.revision)}
                    aria-pressed={scene.region === region}
                  >
                    <span aria-hidden="true">{REGION_GLYPHS[region]}</span>
                    <strong>{t[region]}</strong>
                  </button>
                ))}
              </div>
              <div className="terra-camera-actions" aria-label={locale === 'ja' ? '地球の表示倍率' : 'Globe zoom controls'}>
                <button onClick={() => globeRef.current?.zoomOut()} aria-label={t.zoomOut} title={t.zoomOut}>−</button>
                <button onClick={() => globeRef.current?.resetView()} aria-label={t.reset} title={t.reset}>⌾</button>
                <button onClick={() => globeRef.current?.zoomIn()} aria-label={t.zoomIn} title={t.zoomIn}>＋</button>
              </div>
            </div>

            <div className="terra-time-row">
              <div className="terra-time-value"><span>{t.timeline}</span><strong>{displayedYear}</strong></div>
              <input
                aria-label={locale === 'ja' ? '表示する年代' : 'Year to display'}
                type="range"
                min="2030"
                max="2100"
                step="5"
                value={displayedYear}
                onChange={(event) => scheduleYearChange(Number(event.target.value))}
              />
              <button className="terra-assumption-button" onClick={() => setDrawer('conditions')}>
                <span>{SCENARIOS[scene.scenario].label}</span>
                <strong>{SCENARIOS[scene.scenario].name[locale]}</strong>
              </button>
            </div>

            <div className="terra-prompt-shell">
              <button className={`terra-mic ${listening ? 'active' : ''}`} onClick={toggleListening} aria-label={listening ? t.stop : t.listen}>
                {listening ? '■' : '●'}
              </button>
              <form onSubmit={(event) => { event.preventDefault(); executeCommand(command); }}>
                <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder={t.prompt} aria-label={t.prompt} />
                <button type="submit" aria-label={t.explore}>↑</button>
              </form>
              <button className="terra-presentation-button" onClick={() => setDrawer('display')}>
                <span aria-hidden="true">{scene.style === 'cinematic' ? '◌' : scene.style === 'scientific' ? '⌁' : '✦'}</span>
                <strong>{t[scene.style]}</strong>
              </button>
              <div className={`terra-engine-state ${modelContextReady ? 'connected' : ''}`}>
                <i aria-hidden="true" />
                <span>{modelContextReady ? t.connected : t.disconnected}</span>
              </div>
            </div>
          </div>
          <p className={notice ? 'is-notice' : ''}>{notice || t.hint}</p>
        </section>

        {drawer !== 'closed' && (
          <>
            <button className="terra-drawer-scrim" aria-label={t.close} onClick={() => setDrawer('closed')} />
            <aside className="terra-drawer" role="dialog" aria-modal="true" aria-labelledby="terra-drawer-title">
              <div className="terra-drawer-header">
                <div>
                  <small>{t.brand}</small>
                  <h2 id="terra-drawer-title">
                    {drawer === 'data' ? t.sourcesTitle : drawer === 'conditions' ? t.conditions : t.display}
                  </h2>
                </div>
                <button onClick={() => setDrawer('closed')} aria-label={t.close}>×</button>
              </div>

              {drawer === 'data' && (
                <div className="terra-drawer-content">
                  <p className="terra-drawer-lead">{t.sourcesIntro}</p>
                  <section className="terra-data-summary">
                    <small>{t.currentData}</small>
                    <strong>{t[scene.layer]} · {scene.year}</strong>
                    {scene.layer === 'sea_ice' && <em className="terra-basis-badge">{seaIceBasisLabel}</em>}
                    <p>{narration(scene, locale)}</p>
                    <span>{source}</span>
                  </section>
                  <div className="terra-source-list">
                    {SCIENCE_SOURCES.map((item) => (
                      <a key={item.id} href={item.href} target="_blank" rel="noreferrer">
                        <span>{item.label}</span><b aria-hidden="true">↗</b>
                      </a>
                    ))}
                  </div>
                  <p className="terra-visual-note">{t.lightingNote}</p>
                  <p className="terra-limit">{t.limitation}</p>
                  <details className="terra-activity">
                    <summary>{t.activity}</summary>
                    <div><strong>{modelContextReady ? t.connected : t.disconnected}</strong><span>r{scene.revision} · {registered.length}/{EARTH_TOOL_NAMES.length} tools</span></div>
                    <ul>{logs.slice(0, 5).map((log) => <li key={log}>{log}</li>)}</ul>
                  </details>
                </div>
              )}

              {drawer === 'conditions' && (
                <div className="terra-drawer-content">
                  <p className="terra-drawer-lead">{t.conditionsIntro}</p>
                  <section className="terra-year-control">
                    <div><span>{t.conditions}</span><strong>{displayedYear}</strong></div>
                    <input
                      aria-label={locale === 'ja' ? '表示する年代' : 'Year to display'}
                      type="range"
                      min="2030"
                      max="2100"
                      step="5"
                      value={displayedYear}
                      onChange={(event) => scheduleYearChange(Number(event.target.value))}
                    />
                    <div className="terra-range-labels"><span>2030</span><span>2100</span></div>
                  </section>
                  <section className="terra-place-control">
                    <span>{t.places}</span>
                    <div>
                      {regionKeys.map((region) => (
                        <button key={region} className={scene.region === region ? 'active' : ''} onClick={() => host.focus(region, sceneRef.current.revision)}>
                          {t[region]}
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="terra-choice-cards">
                    {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
                      <button key={id} className={scene.scenario === id ? 'active' : ''} onClick={() => host.setScenario(id, scene.year, sceneRef.current.revision)}>
                        <span>{SCENARIOS[id].label}</span>
                        <strong>{SCENARIOS[id].name[locale]}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {drawer === 'display' && (
                <div className="terra-drawer-content">
                  <p className="terra-drawer-lead">{t.displayIntro}</p>
                  <div className="terra-choice-cards terra-display-cards">
                    {styleKeys.map((style) => (
                      <button key={style} className={scene.style === style ? 'active' : ''} onClick={() => host.setStyle(style, sceneRef.current.revision)}>
                        <span aria-hidden="true">{style === 'cinematic' ? '◌' : style === 'scientific' ? '⌁' : '✦'}</span>
                        <strong>{t[style]}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="terra-sound-controls">
                    <button className={audioOn ? 'active' : ''} onClick={toggleAudio}>{audioOn ? t.audioOn : t.audioOff}</button>
                    <button className={narrationOn ? 'active' : ''} onClick={() => { setNarrationOn((value) => !value); speechSynthesis.cancel(); }}>
                      {narrationOn ? t.narrationOn : t.narrationOff}
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </>
        )}
      </section>

      <section className="terra-below">
        <p>{locale === 'ja' ? '読むだけでは見えなかった、地球のつながりへ。' : 'See the connections that text alone cannot reveal.'}</p>
        <h2>{narration(scene, locale)}</h2>
        <button onClick={() => setDrawer('data')}>{t.sourcesTitle}</button>
      </section>
      <SiteFooter />
    </main>
  );
}
