'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageSwitch, useLocale } from '../i18n';
import { SiteFooter } from '../site-footer';
import { WorldLayer } from '../adlib/world-layer';
import type { WorldHandle } from '../adlib/world';
import { EarthGlobe } from './EarthGlobe';
import {
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

const COPY = {
  en: {
    brand: 'TERRA', tag: 'Live Earth Stage', science: 'ASSESSED SCIENCE — NOT A LOCAL FORECAST',
    prompt: 'Ask Earth to show you a connection…', send: 'Explore', listen: 'Speak', stop: 'Stop',
    subtitle: 'Speak, and the evidence moves.', description: 'A shared scientific stage where people and browser agents change the same camera, layer, scenario, and year.',
    layers: 'Evidence layers', places: 'Camera', scenario: 'Scenario', year: 'Year', style: 'Presentation',
    temperature: 'Global warming', sea_ice: 'Arctic sea ice', currents: 'AMOC', sea_level: 'Global sea level', coupled: 'Coupled story',
    global: 'Earth', arctic: 'Arctic', north_atlantic: 'N. Atlantic', europe: 'Europe', japan: 'Japan',
    scientific: 'Scientific', cinematic: 'Cinematic', storybook: 'Plain language',
    source: 'Sources & limits', tools: 'Agent actions', audioOn: 'Spatial audio on', audioOff: 'Enable spatial audio',
    narrationOn: 'Voice on', narrationOff: 'Voice off', webmcpOn: 'WebMCP connected', webmcpOff: 'Open in a WebMCP browser',
    observed: 'Observed', assessed: 'Assessed range', simplified: 'Reduced-order display', playStory: 'Play Arctic → AMOC story',
    hint: 'Try: “Show the Arctic in 2050”, “How does sea level change?”, or “Explain it simply.”',
    limitation: 'Exploratory visualization. It does not run a global climate model, predict weather, or map local flooding.',
  },
  ja: {
    brand: 'TERRA', tag: '対話型地球ステージ', science: '評価済み科学情報 — 地域予報ではありません',
    prompt: '地球に、見たいつながりを話しかける…', send: '体験する', listen: '話す', stop: '停止',
    subtitle: '語りかけると、根拠が動き出す。', description: '人とブラウザ内AIが、同じカメラ・レイヤー・シナリオ・年代を動かして探究する科学ステージです。',
    layers: '根拠レイヤー', places: '視点', scenario: 'シナリオ', year: '年代', style: '見せ方',
    temperature: '世界平均気温', sea_ice: '北極海氷', currents: 'AMOC', sea_level: '世界平均海面', coupled: '連鎖を見る',
    global: '地球', arctic: '北極', north_atlantic: '北大西洋', europe: '欧州', japan: '日本',
    scientific: '科学者向け', cinematic: '映画的', storybook: 'やさしく',
    source: '出典と限界', tools: 'AIの操作履歴', audioOn: '空間音響 ON', audioOff: '空間音響を開始',
    narrationOn: '読み上げ ON', narrationOff: '読み上げ OFF', webmcpOn: 'WebMCP 接続中', webmcpOff: 'WebMCP対応ブラウザで接続',
    observed: '観測値', assessed: '評価レンジ', simplified: '簡略表示モデル', playStory: '北極→AMOCの物語を見る',
    hint: '例：「2050年の北極を見せて」「海面はどう変わる？」「もっとやさしく説明して」',
    limitation: '探究用の可視化です。全球気候モデル、天気予報、地域浸水マップではありません。',
  },
} as const;

function fixed(value: number, digits = 1) { return value.toFixed(digits); }

function narration(scene: EarthSceneState, locale: 'en' | 'ja') {
  const science = sceneScience(scene);
  if (locale === 'ja') {
    if (scene.layer === 'sea_ice') return `${scene.year}年の海氷形状は、NSIDCの観測値とIPCCの100万平方キロメートル未満という基準を結ぶ説明用表示です。特定年の予測ではありません。`;
    if (scene.layer === 'currents') return `${scene.year}年のAMOC弱化は約${fixed(science.amocDecline.best)}パーセント。2100年の34から45パーセントという研究範囲を用いた簡略表示です。`;
    if (scene.layer === 'sea_level') return `${scene.year}年の世界平均海面上昇は約${fixed(science.seaLevel.best, 2)}メートル。表示範囲は${fixed(science.seaLevel.low, 2)}から${fixed(science.seaLevel.high, 2)}メートルです。地域の浸水予測ではありません。`;
    return `${SCENARIOS[scene.scenario].label}の${scene.year}年。世界平均気温は産業革命前より約${fixed(science.temperature.best)}度高く、評価範囲は${fixed(science.temperature.low)}から${fixed(science.temperature.high)}度です。`;
  }
  if (scene.layer === 'sea_ice') return `The ${scene.year} ice shape connects NSIDC observations to the IPCC practically ice-free threshold for explanation. It is not a year-specific forecast.`;
  if (scene.layer === 'currents') return `The reduced-order AMOC display shows about ${fixed(science.amocDecline.best)} percent weakening in ${scene.year}, anchored to the published 34 to 45 percent range for 2100.`;
  if (scene.layer === 'sea_level') return `Global mean sea level is displayed at about ${fixed(science.seaLevel.best, 2)} metres in ${scene.year}, with a range of ${fixed(science.seaLevel.low, 2)} to ${fixed(science.seaLevel.high, 2)} metres. This is not local inundation.`;
  return `Under ${SCENARIOS[scene.scenario].label} in ${scene.year}, global surface temperature is assessed at about ${fixed(science.temperature.best)} degrees Celsius above 1850 to 1900, with a range of ${fixed(science.temperature.low)} to ${fixed(science.temperature.high)}.`;
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
  const sceneRef = useRef(scene);
  const recognitionRef = useRef<Recognition | null>(null);
  const audioRef = useRef<{ context: AudioContext; gain: GainNode; pan: StereoPannerNode; oscillator: OscillatorNode } | null>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const storyTimers = useRef<number[]>([]);
  const playStoryRef = useRef<() => void>(() => undefined);
  const localeRef = useRef(locale);
  const narrationRef = useRef(narrationOn);

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => { narrationRef.current = narrationOn; }, [narrationOn]);

  const speak = useCallback((next: EarthSceneState) => {
    if (!narrationRef.current || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narration(next, localeRef.current));
    utterance.lang = localeRef.current === 'ja' ? 'ja-JP' : 'en-US';
    utterance.rate = 0.96;
    speechSynthesis.speak(utterance);
  }, []);

  const mutate = useCallback((expectedRevision: number, action: string, change: (current: EarthSceneState) => EarthSceneState) => {
    const current = sceneRef.current;
    if (expectedRevision !== current.revision) return { ok: false, error: 'revision_conflict', current_revision: current.revision };
    const next = { ...change(current), revision: current.revision + 1, lastAction: action };
    sceneRef.current = next;
    setScene(next);
    setLogs((items) => [`${action} → r${next.revision}`, ...items].slice(0, 6));
    worldRef.current?.pulse(0.5, 0.46, 1.1, action.includes('layer') ? 'cyan' : 'gold');
    window.setTimeout(() => speak(next), 500);
    return { ok: true, scene: next, science: sceneScience(next) };
  }, [speak]);

  const host = useMemo(() => ({
    read: () => ({ scene: sceneRef.current, science: sceneScience(sceneRef.current), sources: SCIENCE_SOURCES, limitation: COPY.en.limitation }),
    focus: (region: RegionId, revision: number) => mutate(revision, `earth_focus_region(${region})`, (current) => ({ ...current, region, story: null })),
    setLayer: (layer: LayerId, revision: number) => mutate(revision, `earth_set_layer(${layer})`, (current) => ({ ...current, layer, story: null })),
    setScenario: (scenario: ScenarioId, year: number, revision: number) => mutate(revision, `earth_set_scenario(${scenario},${year})`, (current) => ({ ...current, scenario, year, story: null })),
    setStyle: (style: RenderStyle, revision: number) => mutate(revision, `earth_set_render_style(${style})`, (current) => ({ ...current, style })),
    playStory: (story: NonNullable<EarthSceneState['story']>, revision: number) => {
      const result = mutate(revision, `earth_play_story(${story})`, (current) => ({ ...current, story }));
      if (result.ok) window.setTimeout(() => playStoryRef.current(), 0);
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

  const startStory = useCallback(() => {
    storyTimers.current.forEach(window.clearTimeout);
    const steps: Array<[number, Partial<EarthSceneState>, string]> = [
      [0, { region: 'arctic', layer: 'sea_ice', year: 2050, story: 'arctic_amoc_europe' }, 'story: Arctic sea ice'],
      [4500, { region: 'north_atlantic', layer: 'currents', year: 2085 }, 'story: North Atlantic circulation'],
      [9000, { region: 'europe', layer: 'temperature', year: 2100, story: null }, 'story: assessed European context'],
    ];
    storyTimers.current = steps.map(([delay, patch, action]) => window.setTimeout(() => {
      const current = sceneRef.current;
      const next = { ...current, ...patch, revision: current.revision + 1, lastAction: action };
      sceneRef.current = next;
      setScene(next);
      setLogs((items) => [`${action} → r${next.revision}`, ...items].slice(0, 6));
      speak(next);
    }, delay));
  }, [speak]);

  useEffect(() => { playStoryRef.current = startStory; }, [startStory]);

  useEffect(() => () => storyTimers.current.forEach(window.clearTimeout), []);

  const executeCommand = useCallback((raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    let patch: Partial<EarthSceneState> = {};
    if (/北極|arctic/.test(value)) patch = { ...patch, region: 'arctic', layer: 'sea_ice' };
    if (/大西洋|atlantic|amoc|海流/.test(value)) patch = { ...patch, region: 'north_atlantic', layer: 'currents' };
    if (/ヨーロッパ|欧州|europe/.test(value)) patch = { ...patch, region: 'europe', layer: 'temperature' };
    if (/日本|東京|japan|tokyo/.test(value)) patch = { ...patch, region: 'japan' };
    if (/海面|sea.level|inundation/.test(value)) patch = { ...patch, layer: 'sea_level' };
    if (/やさしく|わかりやす|simple|storybook/.test(value)) patch = { ...patch, style: 'storybook' };
    if (/科学|scientific/.test(value)) patch = { ...patch, style: 'scientific' };
    if (/映画|cinematic/.test(value)) patch = { ...patch, style: 'cinematic' };
    if (/低排出|ssp1/.test(value)) patch = { ...patch, scenario: 'ssp1_26' };
    if (/高排出|ssp5/.test(value)) patch = { ...patch, scenario: 'ssp5_85' };
    const year = value.match(/20[3-9]0|2100/)?.[0];
    if (year) patch.year = Number(year);
    if (Object.keys(patch).length === 0) {
      setNotice(locale === 'ja' ? '地域、年代、海氷、海流、気温、海面、または見せ方を含めて話してください。' : 'Mention a region, year, sea ice, current, temperature, sea level, or presentation style.');
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
  }, [locale, speak]);

  const toggleListening = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const constructor = (window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;
    if (!constructor) {
      setNotice(locale === 'ja' ? 'このブラウザは音声認識に対応していません。下の入力欄をお使いください。' : 'Speech recognition is unavailable in this browser. Use the text field below.');
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
    recognition.onerror = () => { setListening(false); setNotice(locale === 'ja' ? '音声を取得できませんでした。マイク権限をご確認ください。' : 'Voice input failed. Check microphone permission.'); };
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
    if (audio) { audio.oscillator.stop(); void audio.context.close(); }
  }, []);

  const science = sceneScience(scene);
  const layerKeys: LayerId[] = ['coupled', 'temperature', 'sea_ice', 'currents', 'sea_level'];
  const regionKeys: RegionId[] = ['global', 'arctic', 'north_atlantic', 'europe', 'japan'];
  const styleKeys: RenderStyle[] = ['scientific', 'cinematic', 'storybook'];
  const currentSource = scene.layer === 'sea_ice' ? 'NSIDC Sea Ice Index v4' : scene.layer === 'currents' ? 'NOAA / Weijer et al. 2020' : 'IPCC AR6 WGI';
  const onWorldCapability = useCallback(() => undefined, []);
  const onWorldHandle = useCallback((handle: WorldHandle | null) => { worldRef.current = handle; }, []);

  return (
    <main className={`terra-shell terra-${scene.style}`}>
      <WorldLayer active onCapability={onWorldCapability} onHandle={onWorldHandle} />
      <section className="terra-stage" aria-label={t.tag}>
        <EarthGlobe scene={scene} onCapability={setGlobeReady} />
        <header className="terra-header">
          <div className="terra-brand"><span>◉</span><div><strong>{t.brand}</strong><small>{t.tag}</small></div></div>
          <div className="terra-header-actions">
            <span className="terra-science-badge"><i />{t.science}</span>
            <span className="terra-source-chip">{currentSource}</span>
            <LanguageSwitch compact />
          </div>
        </header>

        <div className="terra-intro">
          <p>{t.tag}</p>
          <h1>{t.subtitle}</h1>
          <span>{t.description}</span>
        </div>

        {!globeReady && <div className="terra-error">3D rendering is unavailable. The scientific controls remain usable.</div>}

        <aside className="terra-panel" aria-label={t.layers}>
          <div className="terra-panel-title"><strong>{t.layers}</strong><span>r{scene.revision}</span></div>
          <div className="terra-layer-list">
            {layerKeys.map((layer) => (
              <button key={layer} className={scene.layer === layer ? 'active' : ''} onClick={() => host.setLayer(layer, sceneRef.current.revision)}>
                <i /><span><strong>{t[layer]}</strong><small>{layer === 'sea_ice' ? t.observed : layer === 'currents' ? t.simplified : t.assessed}</small></span>
              </button>
            ))}
          </div>
          <div className="terra-control-group"><label>{t.places}</label><div className="terra-chips">
            {regionKeys.map((region) => <button key={region} className={scene.region === region ? 'active' : ''} onClick={() => host.focus(region, sceneRef.current.revision)}>{t[region]}</button>)}
          </div></div>
          <div className="terra-control-group"><label>{t.scenario}</label><select value={scene.scenario} onChange={(event) => host.setScenario(event.target.value as ScenarioId, scene.year, sceneRef.current.revision)}>
            {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => <option key={id} value={id}>{SCENARIOS[id].label} · {SCENARIOS[id].name[locale]}</option>)}
          </select></div>
          <div className="terra-control-group"><label htmlFor="earth-year">{t.year} · {scene.year}</label><input id="earth-year" type="range" min="2030" max="2100" step="5" value={scene.year} onChange={(event) => host.setScenario(scene.scenario, Number(event.target.value), sceneRef.current.revision)} /></div>
          <div className="terra-control-group"><label>{t.style}</label><div className="terra-segmented">
            {styleKeys.map((style) => <button key={style} className={scene.style === style ? 'active' : ''} onClick={() => host.setStyle(style, sceneRef.current.revision)}>{t[style]}</button>)}
          </div></div>
        </aside>

        <section className="terra-metrics" aria-live="polite">
          <div><small>ΔT · 1850–1900</small><strong>{fixed(science.temperature.best)}°C</strong><span>{fixed(science.temperature.low)}–{fixed(science.temperature.high)}°C</span></div>
          <div><small>GMSL · 1995–2014</small><strong>{fixed(science.seaLevel.best, 2)}m</strong><span>{fixed(science.seaLevel.low, 2)}–{fixed(science.seaLevel.high, 2)}m</span></div>
          <div><small>AMOC · reduced display</small><strong>−{fixed(science.amocDecline.best)}%</strong><span>−{fixed(science.amocDecline.low)}–{fixed(science.amocDecline.high)}%</span></div>
        </section>

        <section className="terra-command" aria-label="Earth voice conductor">
          <button className={`terra-mic ${listening ? 'active' : ''}`} onClick={toggleListening} aria-label={listening ? t.stop : t.listen}>{listening ? '■' : '●'}</button>
          <div className="terra-command-body"><div className={`terra-wave ${listening ? 'active' : ''}`}>{Array.from({ length: 31 }, (_, index) => <i key={index} style={{ height: `${8 + ((index * 17) % 26)}px` }} />)}</div>
            <form onSubmit={(event) => { event.preventDefault(); executeCommand(command); }}><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder={t.prompt} aria-label={t.prompt} /><button>{t.send}</button></form>
            <p>{notice || t.hint}</p></div>
          <div className="terra-audio-controls"><button className={audioOn ? 'active' : ''} onClick={toggleAudio}>{audioOn ? t.audioOn : t.audioOff}</button><button className={narrationOn ? 'active' : ''} onClick={() => { setNarrationOn((value) => !value); speechSynthesis.cancel(); }}>{narrationOn ? t.narrationOn : t.narrationOff}</button></div>
        </section>

        <section className="terra-ledger">
          <div><strong>{registered.length === EARTH_TOOL_NAMES.length ? t.webmcpOn : t.webmcpOff}</strong><small>{registered.length}/{EARTH_TOOL_NAMES.length} tools</small></div>
          <ul>{logs.slice(0, 3).map((log) => <li key={log}>✓ {log}</li>)}</ul>
        </section>

        <button className="terra-story" onClick={() => host.playStory('arctic_amoc_europe', sceneRef.current.revision)}>▶ {t.playStory}</button>
      </section>

      <section className="terra-evidence">
        <div><p>{t.source}</p><h2>{narration(scene, locale)}</h2><span>{t.limitation}</span></div>
        <div className="terra-source-grid">{SCIENCE_SOURCES.map((source) => <a key={source.id} href={source.href} target="_blank" rel="noreferrer"><strong>{source.label}</strong><span>Open source ↗</span></a>)}</div>
      </section>
      <SiteFooter />
    </main>
  );
}
