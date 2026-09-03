// Fail-closed sanitizer for brain-generated HTML (client-side only).
// The stage never receives markup that has not passed through here.

import DOMPurify from 'dompurify';
import { DATA_ACTION_PATTERN, LIMITS } from './protocol';

const ALLOWED_TAGS = [
  'div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'em', 'b', 'i', 'small', 'mark',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'code', 'pre', 'hr', 'br',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'form', 'fieldset', 'legend', 'label', 'button', 'input', 'select', 'option', 'optgroup', 'textarea',
  'progress', 'meter', 'output', 'figure', 'figcaption', 'details', 'summary',
];

const ALLOWED_ATTR = [
  'class', 'id', 'type', 'name', 'value', 'placeholder', 'min', 'max', 'step',
  'rows', 'cols', 'maxlength', 'checked', 'selected', 'disabled', 'readonly',
  'for', 'colspan', 'rowspan', 'title', 'role', 'data-action', 'autocomplete',
  'aria-label', 'aria-hidden', 'aria-live', 'aria-current', 'aria-expanded',
];

export type SanitizeResult =
  | { ok: true; html: string; warnings: string[] }
  | { ok: false; error: string; warnings: string[] };

let hooked = false;

function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return;
    const action = node.getAttribute('data-action');
    if (action !== null && !DATA_ACTION_PATTERN.test(action)) node.removeAttribute('data-action');
    // Inputs may only be plain data types — nothing that navigates or uploads.
    if (node.tagName === 'INPUT') {
      const type = (node.getAttribute('type') ?? 'text').toLowerCase();
      const allowed = ['text', 'number', 'checkbox', 'radio', 'range', 'date', 'time', 'color', 'hidden'];
      if (!allowed.includes(type)) node.setAttribute('type', 'text');
    }
    if (node.tagName === 'BUTTON') {
      const type = (node.getAttribute('type') ?? '').toLowerCase();
      if (type !== 'submit' && type !== 'button') node.setAttribute('type', 'button');
    }
  });
}

export function sanitizeStageHtml(raw: unknown): SanitizeResult {
  const warnings: string[] = [];
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'html must be a non-empty string', warnings };
  if (raw.length > LIMITS.htmlBytes) return { ok: false, error: `html exceeds ${LIMITS.htmlBytes} characters`, warnings };
  if (typeof window === 'undefined') return { ok: false, error: 'sanitizer runs in the browser only', warnings };
  ensureHooks();
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
  });
  const parserArtifacts = new Set(['body', 'html', 'head']); // DOMPurify's own document wrapper, not brain output
  for (const removed of DOMPurify.removed.slice(0, 8)) {
    const entry = removed as { element?: Element; attribute?: Attr; from?: Element };
    const tag = entry.element?.tagName?.toLowerCase?.();
    if (tag && !parserArtifacts.has(tag)) warnings.push(`removed <${tag}>`);
    else if (entry.attribute) warnings.push(`removed attribute ${entry.attribute.name} from <${entry.from?.tagName?.toLowerCase?.() ?? '?'}>`);
  }
  const probe = document.createElement('div');
  probe.innerHTML = clean;
  if (!probe.querySelector('*')) return { ok: false, error: 'no allowed elements remained after sanitizing', warnings };
  return { ok: true, html: clean, warnings };
}

// Compact structural outline of the CURRENT sanitized UI — what a brain reads
// instead of the full HTML. Headings, interactive elements, and their actions.
export function buildOutline(html: string): string {
  if (typeof window === 'undefined') return '';
  const root = document.createElement('div');
  root.innerHTML = html;
  const lines: string[] = [];
  const walk = (element: Element, depth: number) => {
    for (const child of Array.from(element.children)) {
      const tag = child.tagName.toLowerCase();
      const action = child.getAttribute('data-action');
      const name = child.getAttribute('name');
      const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (/^h[1-6]$/.test(tag)) lines.push(`${'  '.repeat(depth)}${tag}: ${text}`);
      else if (tag === 'button') lines.push(`${'  '.repeat(depth)}button[data-action=${action ?? '-'}]: ${text}`);
      else if (tag === 'form') lines.push(`${'  '.repeat(depth)}form[data-action=${action ?? '-'}]`);
      else if (tag === 'input' || tag === 'select' || tag === 'textarea') lines.push(`${'  '.repeat(depth)}${tag}[name=${name ?? '-'}] ${child.getAttribute('type') ?? ''}`.trim());
      else if (tag === 'table') lines.push(`${'  '.repeat(depth)}table (${child.querySelectorAll('tr').length} rows)`);
      if (lines.length >= 60) return;
      walk(child, Math.min(depth + 1, 5));
    }
  };
  walk(root, 0);
  return lines.join('\n').slice(0, LIMITS.outlineChars);
}
