// Adlib app state: the current improvised app, its brain-owned state JSON,
// undo snapshots, and the normalized interaction log. localStorage-backed.

import { LIMITS, type AdlibEvent, type AppSnapshot, type BrainKind } from './protocol';

const STORAGE_KEY = 'adlib-app-v1';

export type AdlibApp = {
  title: string;
  html: string;        // sanitized — the only markup ever stored or rendered
  state: unknown;      // the brain's memory, opaque JSON
  brain: BrainKind | null; // which kind of brain authored the current app
  snapshots: AppSnapshot[];
  events: AdlibEvent[];
  seq: number;
  turns: number;
};

export const emptyApp: AdlibApp = { title: '', html: '', state: null, brain: null, snapshots: [], events: [], seq: 0, turns: 0 };

export function pushSnapshot(app: AdlibApp): AdlibApp {
  if (!app.html) return app;
  const snapshot: AppSnapshot = { title: app.title, html: app.html, state: app.state };
  return { ...app, snapshots: [snapshot, ...app.snapshots].slice(0, LIMITS.snapshots) };
}

export function applyBrainResult(app: AdlibApp, result: { title?: string; html: string; state?: unknown }, mode: 'replace' | 'morph'): AdlibApp {
  const base = mode === 'replace' ? { ...pushSnapshot(app), events: [], seq: 0 } : pushSnapshot(app);
  return {
    ...base,
    title: (result.title ?? app.title ?? '').slice(0, LIMITS.title) || app.title,
    html: result.html,
    state: result.state === undefined ? app.state : result.state,
    turns: app.turns + 1,
  };
}

export function undo(app: AdlibApp): AdlibApp | null {
  const [latest, ...rest] = app.snapshots;
  if (!latest) return null;
  return { ...app, title: latest.title, html: latest.html, state: latest.state, snapshots: rest };
}

export function recordEvent(app: AdlibApp, event: Omit<AdlibEvent, 'seq' | 'ts'>): { app: AdlibApp; event: AdlibEvent } {
  const seq = app.seq + 1;
  const full: AdlibEvent = { ...event, seq, ts: Date.now() };
  return { app: { ...app, seq, events: [full, ...app.events].slice(0, LIMITS.eventQueue) }, event: full };
}

export function persist(app: AdlibApp) {
  try {
    const payload = JSON.stringify({ title: app.title, html: app.html, state: app.state, brain: app.brain, turns: app.turns });
    if (payload.length <= LIMITS.htmlBytes + LIMITS.stateBytes) window.localStorage.setItem(STORAGE_KEY, payload);
  } catch { /* storage unavailable — session-only mode */ }
}

export function restore(): Pick<AdlibApp, 'title' | 'html' | 'state' | 'brain' | 'turns'> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.html !== 'string' || typeof parsed.title !== 'string') return null;
    const brain = parsed.brain === 'webmcp' || parsed.brain === 'proxy' || parsed.brain === 'script' ? parsed.brain : null;
    return { title: parsed.title.slice(0, LIMITS.title), html: parsed.html, state: parsed.state ?? null, brain, turns: Number(parsed.turns) || 0 };
  } catch {
    return null;
  }
}

export function clearPersisted() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
