// Adlib shared protocol: the single Tool Contract every brain speaks
// (WebMCP agent, edge-proxy LLM, or the scripted demo brain).

export const LIMITS = {
  htmlBytes: 64_000,
  stateBytes: 32_000,
  stateSummaryBytes: 4_000,
  outlineChars: 2_000,
  instruction: 420,
  title: 80,
  eventsSentToBrain: 6,
  eventQueue: 40,
  snapshots: 12,
  formFields: 20,
  formValueChars: 200,
  repairRetries: 2,
} as const;

export type AdlibEventType = 'click' | 'input' | 'submit' | 'change';

export type AdlibEvent = {
  seq: number;
  ts: number;
  type: AdlibEventType;
  action: string;
  target: { tag: string; text: string; name: string; value: string };
  formData?: Record<string, string>;
};

export type AppSnapshot = { title: string; html: string; state: unknown };

export type BrainRequest = {
  locale: 'ja' | 'en';
  instruction: string | null;
  app: { title: string; outline: string; state_summary: string } | null;
  events: AdlibEvent[];
  repair?: string; // set when the previous brain output failed sanitizing — fix and retry
};

export type BrainResponse = {
  title?: string;
  html: string;
  state?: unknown;
};

export type BrainKind = 'webmcp' | 'proxy' | 'script';

export interface Brain {
  kind: BrainKind;
  improvise(request: BrainRequest): Promise<BrainResponse>;
}

export const DATA_ACTION_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const UNTRUSTED_OPEN = '[UNTRUSTED_INPUT_START]';
export const UNTRUSTED_CLOSE = '[UNTRUSTED_INPUT_END]';

// Wrap human-entered text so a brain never mistakes it for instructions.
// The markers themselves are stripped from the payload first so user text
// cannot fake a boundary.
export function wrapUntrusted(value: string) {
  const cleaned = value.replaceAll(UNTRUSTED_OPEN, '').replaceAll(UNTRUSTED_CLOSE, '');
  return `${UNTRUSTED_OPEN}${cleaned}${UNTRUSTED_CLOSE}`;
}

export function capJson(value: unknown, maxBytes: number): string {
  let text: string;
  try {
    text = JSON.stringify(value ?? null) ?? 'null';
  } catch {
    return 'null';
  }
  if (text.length <= maxBytes) return text;
  return `${text.slice(0, maxBytes)}…(truncated)`;
}
