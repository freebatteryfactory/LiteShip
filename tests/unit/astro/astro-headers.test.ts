import { describe, expect, test } from 'vitest';
import {
  applyCzapHeaders,
  CLIENT_HINTS_HEADERS,
  CROSS_ORIGIN_HEADERS,
  getCzapHeaderEntries,
  mergeVaryHeader,
} from '../../../packages/astro/src/headers.js';

describe('astro header helpers', () => {
  test('omits empty client hint override values while preserving worker headers', () => {
    const entries = getCzapHeaderEntries({
      detectEnabled: true,
      workersEnabled: true,
      acceptCH: '',
      criticalCH: '',
    });

    expect(entries).toEqual(Object.entries(CROSS_ORIGIN_HEADERS));
  });

  test('uses default client hint headers when detection is enabled without overrides', () => {
    const entries = getCzapHeaderEntries({
      detectEnabled: true,
      workersEnabled: false,
    });

    expect(entries).toEqual([
      ['Accept-CH', CLIENT_HINTS_HEADERS['Accept-CH']!],
      ['Critical-CH', CLIENT_HINTS_HEADERS['Critical-CH']!],
      ['Vary', CLIENT_HINTS_HEADERS['Vary']!],
    ]);
  });

  test('applyCzapHeaders mutates and returns the provided Headers instance', () => {
    const headers = new Headers({ 'x-test': 'keep' });
    const result = applyCzapHeaders(headers, {
      detectEnabled: false,
      workersEnabled: true,
    });

    expect(result).toBe(headers);
    expect(headers.get('x-test')).toBe('keep');
    expect(headers.get('Accept-CH')).toBeNull();
    expect(headers.get('Critical-CH')).toBeNull();
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe(CROSS_ORIGIN_HEADERS['Cross-Origin-Opener-Policy']);
    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe(CROSS_ORIGIN_HEADERS['Cross-Origin-Embedder-Policy']);
  });

  test('coep option selects the embedder policy value', () => {
    const entries = getCzapHeaderEntries({
      detectEnabled: false,
      workersEnabled: true,
      coep: 'credentialless',
    });

    expect(entries).toEqual([
      ['Cross-Origin-Opener-Policy', 'same-origin'],
      ['Cross-Origin-Embedder-Policy', 'credentialless'],
    ]);
  });

  test('applyCzapHeaders leaves pre-existing COOP/COEP untouched but always owns client hints', () => {
    const headers = new Headers({
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Accept-CH': 'Stale-Hint',
    });

    applyCzapHeaders(headers, {
      detectEnabled: true,
      workersEnabled: true,
    });

    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Accept-CH')).toBe(CLIENT_HINTS_HEADERS['Accept-CH']);
  });

  // F-RM-2: Vary is an additive token-list header (RFC 9110 §12.5.5). czap must UNION
  // its client-hint tokens with any pre-existing Vary (Cookie / Accept-Encoding / app
  // cache axes), never headers.set()-clobber them — clobbering silently drops a
  // consumer's or compression layer's cache axes and can poison a CDN.
  test('applyCzapHeaders merges Vary with pre-existing tokens instead of clobbering them', () => {
    const headers = new Headers({ Vary: 'Cookie, Accept-Encoding' });

    applyCzapHeaders(headers, { detectEnabled: true, workersEnabled: false });

    const vary = headers.get('Vary') ?? '';
    const tokens = vary.split(',').map((t) => t.trim().toLowerCase());
    // pre-existing content-negotiation / cookie cache axes survive
    expect(tokens).toContain('cookie');
    expect(tokens).toContain('accept-encoding');
    // czap's client-hint tokens are also present
    for (const chToken of CLIENT_HINTS_HEADERS['Vary']!.split(',').map((t) => t.trim().toLowerCase())) {
      expect(tokens).toContain(chToken);
    }
    // no token is duplicated by the merge
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  describe('mergeVaryHeader', () => {
    test('returns incoming tokens verbatim when no existing Vary', () => {
      expect(mergeVaryHeader(null, 'Sec-CH-DPR, Save-Data')).toBe('Sec-CH-DPR, Save-Data');
      expect(mergeVaryHeader(undefined, 'Sec-CH-DPR')).toBe('Sec-CH-DPR');
      expect(mergeVaryHeader('   ', 'Sec-CH-DPR')).toBe('Sec-CH-DPR');
    });

    test('preserves existing tokens (order + casing) and appends new ones', () => {
      expect(mergeVaryHeader('Cookie, Accept-Encoding', 'Sec-CH-DPR, Save-Data')).toBe(
        'Cookie, Accept-Encoding, Sec-CH-DPR, Save-Data',
      );
    });

    test('dedupes case-insensitively without dropping the existing spelling', () => {
      // field names are case-insensitive; keep the consumer's casing, drop the dup
      expect(mergeVaryHeader('cookie, sec-ch-dpr', 'Sec-CH-DPR, Save-Data')).toBe(
        'cookie, sec-ch-dpr, Save-Data',
      );
    });

    test('a literal * on either side absorbs the merge', () => {
      expect(mergeVaryHeader('*', 'Sec-CH-DPR')).toBe('*');
      expect(mergeVaryHeader('Cookie', '*')).toBe('*');
    });

    test('tolerates messy whitespace and empty tokens', () => {
      expect(mergeVaryHeader('Cookie,  ,Accept-Encoding', '  Sec-CH-DPR ,')).toBe(
        'Cookie, Accept-Encoding, Sec-CH-DPR',
      );
    });
  });
});
