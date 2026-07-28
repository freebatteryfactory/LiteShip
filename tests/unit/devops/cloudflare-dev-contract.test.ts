import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { resolveSameOriginHttpReference } from '../../../scripts/lib/cloudflare-dev-contract.js';

describe('Cloudflare dev asset-reference admission', () => {
  const base = new URL('http://127.0.0.1:4321/page');

  test.each([
    ['/asset.js', 'http://127.0.0.1:4321/asset.js'],
    ['./asset.css', 'http://127.0.0.1:4321/asset.css'],
    ['https://example.test/a.js', null],
    ['javascript:alert(1)', null],
    ['JaVaScRiPt:alert(1)', null],
    ['vbscript:msgbox(1)', null],
    ['data:text/plain,nope', null],
    ['file:///tmp/nope', null],
    ['blob:http://127.0.0.1:4321/id', null],
    ['http://[', null],
  ] as const)('admits only same-origin HTTP(S): %s', (source, expected) => {
    expect(resolveSameOriginHttpReference(base, source)?.href ?? null).toBe(expected);
  });

  test('all non-http schemes are refused regardless of casing', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('javascript', 'vbscript', 'data', 'file', 'blob', 'mailto'),
        fc.boolean(),
        (scheme, upper) => {
          const spelling = upper ? scheme.toUpperCase() : scheme;
          expect(resolveSameOriginHttpReference(base, `${spelling}:payload`)).toBeNull();
        },
      ),
      { seed: 0xcfde, numRuns: 64 },
    );
  });
});
