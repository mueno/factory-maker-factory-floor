// Procedural ambient audio for TERRA (E: NASA-style narration + ambient bed).
//
// Everything is generated with the Web Audio API — no audio files — so it stays
// static-host friendly. The bed is a slow evolving pad plus filtered "wind"
// noise and an icy shimmer, whose timbre tracks the scene: warmer scenarios add
// tension and brightness, the sea-ice layer adds airy wind, currents add a slow
// tremolo. Transitions get a soft swell. Master gain stays low and is muted by
// default until the user enables it.

import type { EarthSceneState, LayerId } from './science';

type Voice = { osc: OscillatorNode; gain: GainNode };

export type AudioEngine = {
  start: () => Promise<void>;
  stop: () => void;
  setEnabled: (on: boolean) => void;
  update: (scene: EarthSceneState, warming: number) => void;
  swell: () => void;
  isEnabled: () => boolean;
};

// A minor / suspended pad chord (semitone offsets from the root) per layer, so
// each theme has a recognisable colour without sounding like an alarm.
const CHORDS: Record<LayerId, number[]> = {
  coupled: [0, 7, 10, 14],
  temperature: [0, 4, 7, 11],
  sea_ice: [0, 7, 12, 19],
  currents: [0, 5, 7, 12],
  sea_level: [0, 3, 7, 10],
};

const ROOT_HZ = 110; // A2

function makeNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createAudioEngine(): AudioEngine {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let padBus: GainNode | null = null;
  let voices: Voice[] = [];
  let windGain: GainNode | null = null;
  let windFilter: BiquadFilterNode | null = null;
  let shimmer: Voice | null = null;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  let enabled = false;
  let started = false;

  const targetMaster = () => (enabled ? 0.06 : 0);

  const build = (ctx: AudioContext) => {
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Pad bus through a gentle lowpass shared by all chord voices.
    padBus = ctx.createGain();
    padBus.gain.value = 0.5;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.6;
    padBus.connect(padFilter).connect(master);

    // Slow LFO breathing the filter cutoff for an evolving pad.
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(padFilter.frequency);
    lfo.start();

    voices = CHORDS.coupled.map((semitone, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = ROOT_HZ * Math.pow(2, semitone / 12);
      const gain = ctx.createGain();
      gain.gain.value = index === 0 ? 0.5 : 0.28;
      osc.connect(gain).connect(padBus!);
      osc.start();
      return { osc, gain };
    });

    // Filtered noise "wind" for polar / ice scenes.
    const wind = ctx.createBufferSource();
    wind.buffer = makeNoiseBuffer(ctx);
    wind.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 620;
    windFilter.Q.value = 0.7;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();

    // High shimmer partial (adds "cold" brightness on the ice layer).
    const shOsc = ctx.createOscillator();
    shOsc.type = 'sine';
    shOsc.frequency.value = ROOT_HZ * 6;
    const shGain = ctx.createGain();
    shGain.gain.value = 0;
    shOsc.connect(shGain).connect(master);
    shOsc.start();
    shimmer = { osc: shOsc, gain: shGain };
  };

  const start = async () => {
    if (started) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    build(context);
    if (context.state === 'suspended') await context.resume();
    started = true;
    if (master && context) master.gain.setTargetAtTime(targetMaster(), context.currentTime, 0.6);
  };

  const setEnabled = (on: boolean) => {
    enabled = on;
    if (master && context) master.gain.setTargetAtTime(targetMaster(), context.currentTime, 0.4);
  };

  const update = (scene: EarthSceneState, warming: number) => {
    if (!context || !padBus) return;
    const now = context.currentTime;
    const chord = CHORDS[scene.layer] ?? CHORDS.coupled;
    // Warmer worlds detune slightly and brighten (rising tension), bounded.
    const warmT = Math.max(0, Math.min(1, (warming - 1) / 4));
    voices.forEach((voice, index) => {
      const semitone = chord[index % chord.length];
      const detune = index === 0 ? 0 : (warmT * 8) * (index % 2 === 0 ? 1 : -1);
      voice.osc.frequency.setTargetAtTime(ROOT_HZ * Math.pow(2, semitone / 12), now, 1.2);
      voice.osc.detune.setTargetAtTime(detune, now, 1.5);
      const target = index === 0 ? 0.5 : 0.24 + warmT * 0.12;
      voice.gain.gain.setTargetAtTime(target, now, 1.5);
    });
    // Wind rises on ice/arctic; currents get a touch; elsewhere near silent.
    const windy = scene.layer === 'sea_ice' ? 0.05 : scene.region === 'arctic' ? 0.035 : scene.layer === 'currents' ? 0.02 : 0.006;
    windGain?.gain.setTargetAtTime(windy, now, 1.8);
    if (windFilter) windFilter.frequency.setTargetAtTime(scene.layer === 'sea_ice' ? 780 : 560, now, 1.8);
    // Shimmer only on the ice layer.
    shimmer?.gain.gain.setTargetAtTime(scene.layer === 'sea_ice' ? 0.014 : 0, now, 1.6);
    // LFO speeds up slightly on the currents layer (flowing feel).
    lfo?.frequency.setTargetAtTime(scene.layer === 'currents' ? 0.11 : 0.05, now, 2);
  };

  const swell = () => {
    if (!context || !master || !enabled) return;
    const now = context.currentTime;
    const base = targetMaster();
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(Math.min(0.12, base * 1.8), now + 0.25);
    master.gain.linearRampToValueAtTime(base, now + 1.4);
  };

  const stop = () => {
    enabled = false;
    if (!context) return;
    const ctx = context;
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    window.setTimeout(() => {
      try {
        voices.forEach((voice) => voice.osc.stop());
        shimmer?.osc.stop();
        lfo?.stop();
        void ctx.close();
      } catch { /* already closed */ }
      context = null; master = null; padBus = null; voices = []; windGain = null;
      windFilter = null; shimmer = null; lfo = null; lfoGain = null; started = false;
    }, 500);
  };

  return { start, stop, setEnabled, update, swell, isEnabled: () => enabled };
}
