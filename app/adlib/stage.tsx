'use client';

// The Stage: a sandboxed iframe (opaque origin, forms + our fixed runtime only)
// that renders sanitized brain HTML and reports normalized human interactions.
// Generated markup never contains scripts; the only script inside the frame is
// the reviewed runtime below plus the vendored idiomorph library.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import idiomorphSource from 'idiomorph/dist/idiomorph.min.js?raw';
import { LIMITS, type AdlibEvent, type AdlibEventType } from './protocol';

export type StageHandle = {
  apply: (html: string, mode: 'replace' | 'morph') => void;
};

type StageProps = {
  onEvent: (event: Omit<AdlibEvent, 'seq' | 'ts'>) => void;
  busy: boolean;
  busyLabel: string;
  emptyLabel: string;
};

// Design tokens injected into the frame. Brains style with bare elements plus
// the utility classes documented in the brain contract (row/grid/card/big/muted/accent).
const STAGE_CSS = `
:root { --ink:#15223a; --muted:#5e6f88; --line:#dce3ee; --soft:#f2f6fb; --accent:#175fd4; --accent-soft:#e8f0ff; --warn:#a96a00; --good:#177a53; }
* { box-sizing: border-box; }
body { background:#fffdfa; color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif; line-height:1.7; margin:0; padding:clamp(18px,4vw,36px); }
h1 { font-size:clamp(24px,4.5vw,34px); letter-spacing:-.03em; line-height:1.2; margin:0 0 8px; }
h2 { font-size:18px; margin:22px 0 10px; }
h3 { font-size:15px; margin:16px 0 8px; }
p { margin:8px 0; } small { color:var(--muted); }
button { background:var(--accent); border:0; border-radius:999px; color:#fff; cursor:pointer; font:inherit; font-size:14px; font-weight:700; min-height:42px; padding:9px 18px; }
button:active { transform:translateY(1px); }
button.quiet, button[data-variant=quiet] { background:var(--soft); border:1px solid var(--line); color:var(--ink); }
input, select, textarea { background:#fff; border:1px solid var(--line); border-radius:10px; color:var(--ink); font:inherit; min-height:42px; outline:0; padding:8px 12px; width:100%; }
input:focus, select:focus, textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
input[type=checkbox], input[type=radio] { accent-color:var(--accent); height:18px; min-height:0; width:18px; }
input[type=range] { border:0; box-shadow:none; padding:0; }
label { color:var(--muted); display:block; font-size:12px; font-weight:700; margin:10px 0 4px; }
form { margin:12px 0; }
table { border-collapse:collapse; margin:12px 0; width:100%; }
th, td { border-bottom:1px solid var(--line); font-size:14px; padding:8px 10px; text-align:left; }
th { color:var(--muted); font-size:11px; letter-spacing:.06em; text-transform:uppercase; }
ul, ol { margin:8px 0; padding-left:1.3em; }
li { margin:4px 0; }
hr { border:0; border-top:1px solid var(--line); margin:18px 0; }
progress { accent-color:var(--accent); height:12px; width:100%; }
.card { background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 8px 26px rgba(21,34,58,.06); margin:10px 0; padding:16px 18px; }
.row { align-items:center; display:flex; flex-wrap:wrap; gap:10px; }
.grid { display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
.big { font-size:clamp(26px,6vw,40px); font-variant-numeric:tabular-nums; font-weight:800; letter-spacing:-.02em; }
.muted { color:var(--muted); } .accent { color:var(--accent); } .good { color:var(--good); } .warn { color:var(--warn); }
.pill { background:var(--accent-soft); border-radius:999px; color:var(--accent); display:inline-block; font-size:11px; font-weight:800; padding:3px 10px; }
`;

// Fixed runtime: applies parent-sanitized HTML and reports interactions.
const STAGE_RUNTIME = `
(function () {
  'use strict';
  var root = document.getElementById('root');
  var debounces = new Map();
  function post(payload) { parent.postMessage(payload, '*'); }
  function height() { post({ t: 'height', px: Math.min(6000, document.documentElement.scrollHeight) }); }
  function describe(el) {
    return {
      tag: (el.tagName || '').toLowerCase(),
      text: String(el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
      name: String(el.getAttribute && el.getAttribute('name') || '').slice(0, 60),
      value: 'value' in el ? String(el.value == null ? '' : el.value).slice(0, ${LIMITS.formValueChars}) : '',
    };
  }
  function actionOf(el) {
    var node = el;
    while (node && node !== root) {
      var action = node.getAttribute && node.getAttribute('data-action');
      if (action) return action;
      node = node.parentElement;
    }
    return '';
  }
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data) return;
    if (data.t === 'ping') { post({ t: 'ready' }); return; }
    if (data.t !== 'apply' || typeof data.html !== 'string') return;
    if (data.mode === 'morph' && window.Idiomorph) {
      window.Idiomorph.morph(root, data.html, { morphStyle: 'innerHTML' });
    } else {
      root.innerHTML = data.html;
    }
    height();
  });
  root.addEventListener('click', function (event) {
    var el = event.target && event.target.closest ? event.target.closest('button,[data-action]') : null;
    if (!el || el.tagName === 'FORM') return;
    if (el.tagName === 'BUTTON' && el.type === 'submit') return; // handled by submit
    post({ t: 'event', type: 'click', action: actionOf(el), target: describe(el) });
  });
  root.addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    var data = {};
    var count = 0;
    try {
      var fd = new FormData(form);
      fd.forEach(function (value, key) {
        if (count >= ${LIMITS.formFields} || typeof value !== 'string') return;
        data[String(key).slice(0, 60)] = value.slice(0, ${LIMITS.formValueChars});
        count += 1;
      });
    } catch (err) { /* ignore malformed forms */ }
    post({ t: 'event', type: 'submit', action: actionOf(form), target: describe(form), formData: data });
  });
  root.addEventListener('change', function (event) {
    var el = event.target;
    if (!el || !/^(SELECT|INPUT)$/.test(el.tagName)) return;
    var type = (el.getAttribute('type') || '').toLowerCase();
    if (el.tagName === 'INPUT' && type !== 'checkbox' && type !== 'radio' && type !== 'range' && type !== 'date' && type !== 'time' && type !== 'color') return;
    post({ t: 'event', type: 'change', action: actionOf(el), target: describe(el) });
  });
  root.addEventListener('input', function (event) {
    var el = event.target;
    if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
    var key = el.name || el.id || 'field';
    clearTimeout(debounces.get(key));
    debounces.set(key, setTimeout(function () {
      post({ t: 'event', type: 'input', action: actionOf(el), target: describe(el) });
    }, 300));
  });
  new ResizeObserver(height).observe(document.documentElement);
  post({ t: 'ready' });
})();
`;

function isValidEventPayload(value: unknown): value is { t: 'event'; type: AdlibEventType; action: string; target: AdlibEvent['target']; formData?: Record<string, string> } {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (data.t !== 'event') return false;
  if (!['click', 'input', 'submit', 'change'].includes(String(data.type))) return false;
  if (typeof data.action !== 'string' || data.action.length > 64) return false;
  const target = data.target as Record<string, unknown> | undefined;
  if (!target || typeof target.tag !== 'string') return false;
  if (data.formData !== undefined) {
    if (typeof data.formData !== 'object' || data.formData === null || Array.isArray(data.formData)) return false;
    if (!Object.values(data.formData).every((entry) => typeof entry === 'string')) return false;
  }
  return true;
}

export const Stage = forwardRef<StageHandle, StageProps>(function Stage({ onEvent, busy, busyLabel, emptyLabel }, ref) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ html: string; mode: 'replace' | 'morph' } | null>(null);
  const hasContentRef = useRef(false);

  const srcdoc = useMemo(() => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; form-action 'none'">
<style>${STAGE_CSS}</style></head><body><div id="root"></div>
<script>${idiomorphSource}</script>
<script>${STAGE_RUNTIME}</script></body></html>`, []);

  const send = useCallback((html: string, mode: 'replace' | 'morph') => {
    const frame = frameRef.current;
    if (!frame?.contentWindow || !readyRef.current) { pendingRef.current = { html, mode }; return; }
    hasContentRef.current = true;
    frame.contentWindow.postMessage({ t: 'apply', html, mode }, '*');
  }, []);

  useImperativeHandle(ref, () => ({ apply: send }), [send]);

  useEffect(() => {
    const markReady = () => {
      readyRef.current = true;
      if (pendingRef.current) { send(pendingRef.current.html, pendingRef.current.mode); pendingRef.current = null; }
    };
    const listener = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data as Record<string, unknown> | null;
      if (data?.t === 'ready') {
        markReady();
        return;
      }
      if (data?.t === 'height' && typeof data.px === 'number' && Number.isFinite(data.px)) {
        frame.style.height = `${Math.max(320, Math.min(6000, data.px))}px`;
        return;
      }
      if (isValidEventPayload(data)) {
        // Defense in depth: re-cap sizes host-side even though the frame runtime caps them too.
        const formData = data.formData
          ? Object.fromEntries(Object.entries(data.formData).slice(0, LIMITS.formFields).map(([key, value]) => [key.slice(0, 60), value.slice(0, LIMITS.formValueChars)]))
          : undefined;
        onEvent({ type: data.type, action: data.action, target: {
          tag: String(data.target.tag).slice(0, 20),
          text: String(data.target.text ?? '').slice(0, 60),
          name: String(data.target.name ?? '').slice(0, 60),
          value: String(data.target.value ?? '').slice(0, LIMITS.formValueChars),
        }, ...(formData ? { formData } : {}) });
      }
    };
    window.addEventListener('message', listener);
    // The iframe boots from SSR HTML before hydration attaches this listener,
    // so its initial 'ready' can be missed — ping until the handshake lands.
    const ping = () => { if (!readyRef.current) frameRef.current?.contentWindow?.postMessage({ t: 'ping' }, '*'); };
    ping();
    const pinger = window.setInterval(() => { if (readyRef.current) window.clearInterval(pinger); else ping(); }, 250);
    return () => { window.removeEventListener('message', listener); window.clearInterval(pinger); };
  }, [onEvent, send]);

  return (
    <div className={`adlib-stage ${busy ? 'busy' : ''}`}>
      <iframe ref={frameRef} sandbox="allow-scripts allow-forms" srcDoc={srcdoc} title="Adlib stage" />
      {!hasContentRef.current && !busy && <div className="adlib-stage-empty" aria-hidden="true"><span>✦</span><p>{emptyLabel}</p></div>}
      {busy && <div className="adlib-stage-busy" role="status"><i /><i /><i /><p>{busyLabel}</p></div>}
    </div>
  );
});
