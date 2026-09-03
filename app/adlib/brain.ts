// Brains that can improvise the next UI. All speak the same BrainRequest/
// BrainResponse contract; the host neither knows nor cares which one answered.

import { wrapUntrusted, type AdlibEvent, type Brain, type BrainRequest, type BrainResponse } from './protocol';

export class BrainError extends Error {
  constructor(message: string, public readonly kind: 'unavailable' | 'invalid' | 'network') {
    super(message);
  }
}

// ---------------------------------------------------------------- Mode B ----
// Direct API brain: POST the request to our edge proxy, which holds the key.
// Human-entered text is wrapped in untrusted-data delimiters right before it
// leaves for an LLM brain, so field values can never masquerade as instructions.
function markUntrusted(request: BrainRequest): BrainRequest {
  const events: AdlibEvent[] = request.events.map((event) => ({
    ...event,
    target: { ...event.target, text: wrapUntrusted(event.target.text), value: wrapUntrusted(event.target.value) },
    ...(event.formData ? { formData: Object.fromEntries(Object.entries(event.formData).map(([key, value]) => [key, wrapUntrusted(value)])) } : {}),
  }));
  return { ...request, instruction: request.instruction === null ? null : wrapUntrusted(request.instruction), events };
}

export class ProxyBrain implements Brain {
  kind = 'proxy' as const;

  async improvise(request: BrainRequest): Promise<BrainResponse> {
    let response: Response;
    try {
      response = await fetch('/api/improv', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(markUntrusted(request)),
      });
    } catch {
      throw new BrainError('network_error', 'network');
    }
    if (response.status === 503) throw new BrainError('proxy_not_configured', 'unavailable');
    if (!response.ok) throw new BrainError(`proxy_${response.status}`, 'invalid');
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.html !== 'string') throw new BrainError('proxy_bad_payload', 'invalid');
    return { html: payload.html, title: typeof payload.title === 'string' ? payload.title : undefined, state: payload.state };
  }
}

export async function probeProxy(): Promise<boolean> {
  try {
    const response = await fetch('/api/improv', { method: 'GET' });
    if (!response.ok) return false;
    const payload = (await response.json()) as { configured?: boolean };
    return payload.configured === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- Script ----
// Deterministic demo brain: no network, no keys. Powers the keyless demo and
// the Playwright E2E. It follows the same improv loop shape as a real brain.
type WarikanState = { total: number; people: number; paid: Record<string, number> };

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function warikanHtml(state: WarikanState, ja: boolean) {
  const per = state.people > 0 ? Math.ceil(state.total / state.people) : 0;
  const names = Object.entries(state.paid);
  return `
<h1>${ja ? '割り勘スタジオ' : 'Split the Bill'}</h1>
<p class="muted">${ja ? '合計と人数を変えると、その場で再計算されます。' : 'Change the total or the party size and it recalculates.'}</p>
<div class="grid">
  <div class="card"><small>${ja ? '合計金額' : 'Total'}</small><div class="big">${state.total.toLocaleString()}</div></div>
  <div class="card"><small>${ja ? '人数' : 'People'}</small><div class="big">${state.people}</div></div>
  <div class="card"><small>${ja ? '1人あたり' : 'Each pays'}</small><div class="big accent">${per.toLocaleString()}</div></div>
</div>
<form data-action="update-bill" class="card">
  <label>${ja ? '合計金額' : 'Total amount'}</label>
  <input name="total" type="number" min="0" value="${state.total}">
  <label>${ja ? '人数' : 'Number of people'}</label>
  <input name="people" type="number" min="1" value="${state.people}">
  <label>${ja ? '立て替えた人（任意）' : 'Someone who already paid (optional)'}</label>
  <div class="row"><input name="payer" placeholder="${ja ? '例：うえの' : 'e.g. Alex'}"><input name="amount" type="number" min="0" placeholder="${ja ? '金額' : 'Amount'}"></div>
  <p><button type="submit">${ja ? '再計算する' : 'Recalculate'}</button></p>
</form>
${names.length ? `<div class="card"><h2>${ja ? '精算' : 'Settlement'}</h2><table><thead><tr><th>${ja ? '名前' : 'Name'}</th><th>${ja ? '立替' : 'Paid'}</th><th>${ja ? '過不足' : 'Balance'}</th></tr></thead><tbody>${names.map(([name, paid]) => { const diff = paid - per; return `<tr><td>${esc(name)}</td><td>${paid.toLocaleString()}</td><td class="${diff >= 0 ? 'good' : 'warn'}">${diff >= 0 ? '+' : ''}${diff.toLocaleString()}</td></tr>`; }).join('')}</tbody></table></div>` : ''}`;
}

function counterHtml(count: number, label: string, ja: boolean) {
  return `
<h1>${esc(label || (ja ? 'ミニカウンター' : 'Mini Counter'))}</h1>
<div class="card" style="text-align:center"><div class="big">${count}</div>
<div class="row" style="justify-content:center"><button data-action="decrement" class="quiet">-1</button><button data-action="increment">+1</button><button data-action="reset-count" class="quiet">${ja ? 'リセット' : 'Reset'}</button></div></div>
<p class="muted">${ja ? '台本デモの頭脳が応答しています。APIキーかWebMCPエージェントを繋ぐと、どんなアプリでも即興生成されます。' : 'The scripted demo brain is responding. Connect an API key or a WebMCP agent to improvise any app.'}</p>`;
}

export class ScriptedBrain implements Brain {
  kind = 'script' as const;

  async improvise(request: BrainRequest): Promise<BrainResponse> {
    const ja = request.locale === 'ja';
    const previous = (request.app ? safeParse(request.app.state_summary) : null) as Record<string, unknown> | null;
    const scenario = String(previous?.scenario ?? '');
    const event = request.events[0];

    if (request.instruction !== null || !scenario) {
      const instruction = request.instruction ?? '';
      if (/割り勘|割勘|split|warikan|精算/i.test(instruction)) {
        const state: WarikanState = { total: 12000, people: 4, paid: {} };
        return { title: ja ? '割り勘スタジオ' : 'Split the Bill', html: warikanHtml(state, ja), state: { scenario: 'warikan', ...state } };
      }
      return { title: ja ? 'ミニカウンター' : 'Mini Counter', html: counterHtml(0, instruction.slice(0, 40), ja), state: { scenario: 'counter', count: 0, label: instruction.slice(0, 40) } };
    }

    if (scenario === 'warikan') {
      const state: WarikanState = {
        total: Number(previous?.total) || 0,
        people: Math.max(1, Number(previous?.people) || 1),
        paid: (previous?.paid && typeof previous.paid === 'object' ? previous.paid : {}) as Record<string, number>,
      };
      if (event?.type === 'submit' && event.action === 'update-bill' && event.formData) {
        state.total = Math.max(0, Number(event.formData.total) || state.total);
        state.people = Math.max(1, Number(event.formData.people) || state.people);
        const payer = (event.formData.payer ?? '').trim().slice(0, 20);
        const amount = Number(event.formData.amount) || 0;
        if (payer && amount > 0) state.paid = { ...state.paid, [payer]: (state.paid[payer] ?? 0) + amount };
      }
      return { html: warikanHtml(state, ja), state: { scenario: 'warikan', ...state } };
    }

    const count = Number(previous?.count) || 0;
    const label = String(previous?.label ?? '');
    const next = event?.action === 'increment' ? count + 1 : event?.action === 'decrement' ? count - 1 : event?.action === 'reset-count' ? 0 : count;
    return { html: counterHtml(next, label, ja), state: { scenario: 'counter', count: next, label } };
  }
}

function safeParse(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}
