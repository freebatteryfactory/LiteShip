/**
 * ClientHints -- Client Hints header parsing tests.
 */

import { describe, test, expect } from 'vitest';
import { ClientHints } from '@liteship/edge';

describe('ClientHints', () => {
  test('parseClientHints is the values-only projection of the canonical evidence parse', () => {
    const headers = {
      'sec-ch-device-memory': '8',
      'sec-ch-prefers-reduced-motion': 'reduce',
    };
    const parsed = ClientHints.parseEvidence(headers);
    expect(ClientHints.parseClientHints(headers)).toEqual(parsed.capabilities);
    expect(parsed.inputEvidence.memory).toEqual({
      input: 'memory',
      support: 'observed',
      source: 'sec-ch-device-memory',
    });
    expect(parsed.inputEvidence.gpu.support).toBe('inferred');
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.capabilities)).toBe(true);
  });

  test('malformed or absent hints remain inferred rather than claiming observation', () => {
    const parsed = ClientHints.parseEvidence({
      'sec-ch-device-memory': 'not-a-number',
      'sec-ch-prefers-reduced-motion': 'maybe',
    });
    expect(parsed.capabilities.memory).toBe(4);
    expect(parsed.capabilities.prefersReducedMotion).toBe(false);
    expect(parsed.inputEvidence.memory.support).toBe('inferred');
    expect(parsed.inputEvidence.prefersReducedMotion.support).toBe('inferred');
  });

  test('a non-positive memory hint remains inferred instead of laundering its fallback', () => {
    for (const raw of ['0', '-1']) {
      const parsed = ClientHints.parseEvidence({ 'sec-ch-device-memory': raw });
      expect(parsed.capabilities.memory).toBe(4);
      expect(parsed.inputEvidence.memory).toMatchObject({
        support: 'inferred',
        source: 'four-gib-fallback',
      });
    }
  });

  test('parseClientHints returns conservative defaults for empty headers', () => {
    const caps = ClientHints.parseClientHints({});
    expect(caps.memory).toBe(4);
    expect(caps.devicePixelRatio).toBe(1);
    expect(caps.viewportWidth).toBe(1920);
    expect(caps.viewportHeight).toBe(1080);
    expect(caps.prefersReducedMotion).toBe(false);
    expect(caps.prefersColorScheme).toBe('light');
    expect(caps.touchPrimary).toBe(false);
    expect(caps.webgpu).toBe(false);
    expect(caps.cores).toBe(4);
    expect(caps.gpu).toBe(1);
    expect(caps.connection?.effectiveType).toBe('4g');
    expect(caps.connection?.saveData).toBe(false);
  });

  test('parseClientHints reads memory hint and clamps to valid bucket', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-device-memory': '3',
    });
    // 3 is closest to 2 or 4 — equidistant, 4 wins in the loop
    expect([2, 4]).toContain(caps.memory);
  });

  test('parseClientHints reads exact memory bucket', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-device-memory': '8',
    });
    expect(caps.memory).toBe(8);
  });

  test('parseClientHints reads DPR', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-dpr': '2.5',
    });
    expect(caps.devicePixelRatio).toBe(2.5);
  });

  test('parseClientHints reads viewport dimensions', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-viewport-width': '768',
      'sec-ch-viewport-height': '1024',
    });
    expect(caps.viewportWidth).toBe(768);
    expect(caps.viewportHeight).toBe(1024);
  });

  test('parseClientHints reads reduced motion preference', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-prefers-reduced-motion': 'reduce',
    });
    expect(caps.prefersReducedMotion).toBe(true);
  });

  test('parseClientHints reads quoted reduced motion preference', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-prefers-reduced-motion': '"reduce"',
    });
    expect(caps.prefersReducedMotion).toBe(true);
  });

  test('parseClientHints reads dark color scheme', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-prefers-color-scheme': 'dark',
    });
    expect(caps.prefersColorScheme).toBe('dark');
  });

  test('parseClientHints reads mobile hint', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-ua-mobile': '?1',
    });
    expect(caps.touchPrimary).toBe(true);
  });

  test('parseClientHints reads save-data', () => {
    const caps = ClientHints.parseClientHints({
      'save-data': 'on',
    });
    expect(caps.connection?.saveData).toBe(true);
  });

  test('parseClientHints reads downlink and ect', () => {
    const caps = ClientHints.parseClientHints({
      downlink: '1.5',
      ect: '3g',
    });
    expect(caps.connection?.downlink).toBe(1.5);
    expect(caps.connection?.effectiveType).toBe('3g');
  });

  test('parseClientHints handles malformed numeric headers', () => {
    const caps = ClientHints.parseClientHints({
      'sec-ch-dpr': 'not-a-number',
      'sec-ch-viewport-width': '',
    });
    expect(caps.devicePixelRatio).toBe(1); // default
    expect(caps.viewportWidth).toBe(1920); // default
  });

  test('parseClientHints works with Headers-like object', () => {
    const headers = new Headers();
    headers.set('sec-ch-dpr', '3');
    headers.set('sec-ch-viewport-width', '414');
    const caps = ClientHints.parseClientHints(headers);
    expect(caps.devicePixelRatio).toBe(3);
    expect(caps.viewportWidth).toBe(414);
  });

  test('acceptCHHeader returns comma-separated hint names', () => {
    const header = ClientHints.acceptCHHeader();
    expect(header).toContain('Sec-CH-Device-Memory');
    expect(header).toContain('Sec-CH-DPR');
    expect(header).toContain('ECT');
  });

  test('Vary names only response-shaping inputs and is not the Accept-CH request list', () => {
    const accept = ClientHints.acceptCHHeader();
    const vary = ClientHints.varyCHHeader();
    expect(vary).not.toBe(accept);
    expect(vary).toContain('User-Agent');
    expect(vary).toContain('Sec-CH-Device-Memory');
    expect(vary).not.toContain('RTT');
    expect(vary).not.toContain('Sec-CH-UA-Platform');
    expect(vary.split(', ')).not.toContain('Sec-CH-UA');
  });

  test('criticalCHHeader returns subset of hints', () => {
    const header = ClientHints.criticalCHHeader();
    expect(header).toContain('Sec-CH-Prefers-Reduced-Motion');
    expect(header).toContain('Sec-CH-Device-Memory');
    // ECT is not critical
    expect(header).not.toContain('ECT');
  });

  test('GPU tier heuristic returns 0 for feature phones', () => {
    const caps = ClientHints.parseClientHints({
      'user-agent': 'Mozilla/5.0 (Mobile; Nokia 8110; KaiOS/2.5)',
    });
    expect(caps.gpu).toBe(0);
  });

  test('GPU tier heuristic returns 2 for high-end desktop', () => {
    const caps = ClientHints.parseClientHints({
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    expect(caps.gpu).toBe(2);
  });

  test('covers getter-based inputs, high-end mobile heuristics, and invalid ECT fallbacks', () => {
    const getterOnly = {
      get(name: string) {
        const table: Record<string, string> = {
          'sec-ch-dpr': '2',
          ect: 'wifi',
          'user-agent': 'Mozilla/5.0 (iPhone 15; CPU iPhone OS 18_0 like Mac OS X)',
        };
        return table[name.toLowerCase()] ?? null;
      },
    } as Headers;

    const caps = ClientHints.parseClientHints(getterOnly);
    expect(caps.devicePixelRatio).toBe(2);
    expect(caps.connection?.effectiveType).toBe('4g');
    expect(caps.gpu).toBe(2);
  });

  test('normalizes object maps with undefined entries and covers samsung plus desktop gpu heuristics', () => {
    // A request map arrives in whatever casing the client sent, and the
    // object-map path lowercases every key before lookup. `ClientHintsHeaders`
    // names the canonical lowercase spellings, so the mixed-case fixture that
    // PROVES that normalisation is typed as the raw header map it really is.
    const mixedCaseHeaders: Readonly<Record<string, string | undefined>> = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S24 Ultra)',
      'sec-ch-dpr': undefined,
      ECT: '5g',
    };
    const mobileCaps = ClientHints.parseClientHints(mixedCaseHeaders);
    expect(mobileCaps.gpu).toBe(2);
    expect(mobileCaps.devicePixelRatio).toBe(1);
    expect(mobileCaps.connection?.effectiveType).toBe('4g');

    const desktopCaps = ClientHints.parseClientHints({
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4)',
    });
    expect(desktopCaps.gpu).toBe(2);
  });

  test('GPU tier heuristic falls back to low-mid for ordinary desktop user agents without premium hints', () => {
    const caps = ClientHints.parseClientHints({
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    });
    expect(caps.gpu).toBe(1);
  });

  test('responsiveMediaCapabilities derives Save-Data + DPR from Client Hints (#125)', () => {
    const caps = ClientHints.responsiveMediaCapabilities({
      'sec-ch-dpr': '2.5',
      'save-data': 'on',
    });
    expect(caps.devicePixelRatio).toBe(2.5);
    expect(caps.saveData).toBe(true);
    expect(ClientHints.responsiveMediaVaryHeader()).toContain('Sec-CH-DPR');
    expect(ClientHints.responsiveMediaVaryHeader()).toContain('Save-Data');
  });
});
