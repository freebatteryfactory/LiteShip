// @vitest-environment jsdom
/**
 * CUT D5 — view-side bridge proven against a MOCK HOST (jsdom).
 *
 * The widget HTML LiteShip ships embeds a view-side bridge script. Here we mount
 * that script in jsdom, play the HOST role (capture its postMessage output, drive
 * its message handler), run the `ui/initialize` handshake, then inject
 * `ui/notifications/tool-result` payloads and assert the DOM reflects them. This
 * proves the widget is genuinely interactive — not a metadata-only "bridge."
 *
 * @module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readAppResource } from '../../../packages/mcp-server/src/app-resources.js';

const APP_URI = 'ui://liteship/app/capsule-inspect';

function widgetParts(html = readAppResource(APP_URI).contents[0]!.text): { markup: string; script: string } {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const scriptElement = parsed.body.querySelector('script');
  if (scriptElement === null) throw new Error('widget resource has no bridge script');
  const script = scriptElement.textContent ?? '';
  for (const element of parsed.body.querySelectorAll('script')) element.remove();
  return { markup: parsed.body.innerHTML, script };
}

let posted: Array<Record<string, unknown>>;
// The bridge registers a real DOM `message` listener, so the capture holds the
// DOM type. A bespoke `(event: { data; source }) => void` alias is not what
// `addEventListener` yields, and asserting between the two is how a fixture
// ends up delivering a plain object that no browser could ever dispatch.
let handler: EventListener | undefined;
let originalPostMessage: typeof window.postMessage;
let originalAdd: typeof window.addEventListener;

/** Mount the widget: install the DOM, capture postMessage output + the message handler, run the script. */
function mount(): void {
  const { markup, script } = widgetParts();
  document.body.innerHTML = markup;
  posted = [];
  // window.parent === window in jsdom → parent.postMessage is window.postMessage.
  window.postMessage = ((msg: unknown) => posted.push(msg as Record<string, unknown>)) as typeof window.postMessage;
  originalAdd = window.addEventListener.bind(window);
  window.addEventListener = ((
    type: string,
    h: EventListenerOrEventListenerObject,
    opts?: boolean | AddEventListenerOptions,
  ) => {
    // `addEventListener` admits both a function and a `handleEvent` object;
    // normalise rather than assert the object arm away.
    if (type === 'message') handler = typeof h === 'function' ? h : (event: Event) => h.handleEvent(event);
    originalAdd(type, h, opts);
  }) as typeof window.addEventListener;
  new Function(script)();
  window.addEventListener = originalAdd; // restore; keep the captured handler
}

/** Play the host: deliver a JSON-RPC message to the view's handler (source = parent, so it's trusted). */
function host(data: unknown): void {
  handler!(new MessageEvent('message', { data, source: window.parent }));
}

/**
 * Play a FOREIGN frame: a real, truthy `MessageEvent.source` that is not the
 * parent. The bridge's guard is `if (event.source && event.source !== window.parent) return`,
 * so `source: null` would be falsy and sail straight past it — the negative
 * control needs a genuine other window, which an iframe supplies.
 */
function spoof(data: unknown): void {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const foreign = frame.contentWindow;
  expect(foreign, 'jsdom produced no contentWindow for the spoofing frame').not.toBeNull();
  handler!(new MessageEvent('message', { data, source: foreign }));
  frame.remove();
}

function toolResult(capsule: unknown): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-result',
    params: { content: [{ type: 'text', text: 'mirror' }], structuredContent: { capsule } },
  };
}

beforeEach(() => {
  originalPostMessage = window.postMessage;
  handler = undefined;
  mount();
});
afterEach(() => {
  if (handler) window.removeEventListener('message', handler);
  window.postMessage = originalPostMessage;
});

describe('D5 host-bridge — handshake', () => {
  it('the view posts ui/initialize on load with the 2026-01-26 protocol version', () => {
    const init = posted.find((m) => m.method === 'ui/initialize') as
      { params: { protocolVersion: string } } | undefined;
    expect(init).toBeDefined();
    expect(init!.params.protocolVersion).toBe('2026-01-26');
  });

  it('on the host McpUiInitializeResult, the view posts ui/notifications/initialized', () => {
    host({
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: '2026-01-26', hostInfo: {}, hostCapabilities: {}, hostContext: {} },
    });
    expect(posted.some((m) => m.method === 'ui/notifications/initialized')).toBe(true);
  });
});

describe('D5 host-bridge — tool-result injection renders the payload', () => {
  beforeEach(() => {
    // complete the handshake before injecting results
    host({
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: '2026-01-26', hostInfo: {}, hostCapabilities: {}, hostContext: {} },
    });
  });

  it('renders payload A into the DOM', () => {
    host(toolResult({ name: 'alpha', kind: 'pureTransform' }));
    expect(document.getElementById('capsule-name')!.textContent).toBe('alpha');
    expect(document.getElementById('capsule-kind')!.textContent).toBe('pureTransform');
    expect(document.getElementById('detail')!.hasAttribute('hidden')).toBe(false);
  });

  it('payload B produces DIFFERENT DOM than payload A (render is payload-driven, not constant)', () => {
    host(toolResult({ name: 'alpha', kind: 'pureTransform' }));
    const a = document.getElementById('capsule-name')!.textContent;
    host(toolResult({ name: 'beta', kind: 'siteAdapter' }));
    const b = document.getElementById('capsule-name')!.textContent;
    expect(a).toBe('alpha');
    expect(b).toBe('beta');
    expect(a).not.toBe(b);
  });

  it('a malformed payload (no capsule) renders the safe fallback, not a crash', () => {
    host({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { content: [], structuredContent: {} } });
    expect(document.getElementById('status')!.textContent).toBe('Unable to render result.');
  });
});

describe('D5 host-bridge — trust + no network', () => {
  it('extracts and removes uppercase or mixed-case script elements through the DOM grammar', () => {
    const parts = widgetParts('<DIV id="content">safe</DIV><SCRIPT>window.__bridge = true;</SCRIPT>');
    expect(parts.script).toContain('window.__bridge = true');
    expect(parts.markup).toContain('id="content"');
    expect(parts.markup.toLowerCase()).not.toContain('<script');
  });

  it('the view ignores messages whose source is not the parent host', () => {
    spoof(toolResult({ name: 'spoof', kind: 'x' }));
    expect(document.getElementById('capsule-name')!.textContent).toBe('');
  });

  it('the embedded script performs no network I/O', () => {
    const { script } = widgetParts();
    for (const banned of ['fetch(', 'XMLHttpRequest', 'http://', 'https://', 'import(']) {
      expect(script).not.toContain(banned);
    }
  });
});
