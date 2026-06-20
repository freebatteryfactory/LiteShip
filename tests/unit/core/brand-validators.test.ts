/**
 * Validating smart-constructor LAWS for the branded types.
 *
 * Each brand constructor is parse-don't-validate: it returns the value when it
 * satisfies the brand's REAL runtime invariant and throws a `ValidationError`
 * (house pattern — sync factories throw, asserted via `hasTag`) otherwise.
 *
 * These tests pin the LAW (the invariant), not the implementation: the regexes
 * and numeric guards may change, but a value that genuinely lives in the brand's
 * domain must always be accepted and one outside it must always throw.
 *
 * ContentAddress / IntegrityDigest are duplicated across `@czap/core`,
 * `@czap/canonical`, and `@czap/genui` (each validates locally to avoid a
 * dependency cycle); the parity tests below pin that the three agree.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@czap/error';
import {
  SignalInput,
  ThresholdValue,
  StateName,
  ContentAddress,
  IntegrityDigest,
  TokenRef,
  Millis,
} from '@czap/core';
import {
  isContentAddress as coreIsContentAddress,
  isIntegrityDigest as coreIsIntegrityDigest,
} from '../../../packages/core/src/brands.js';
import { ContentAddress as CanonAddr, IntegrityDigest as CanonDigest } from '@czap/canonical';
import { ContentAddress as GenuiAddr } from '@czap/genui';

/** Assert that running `fn` throws a `ValidationError` from `@czap/error`. */
function expectValidationError(fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(hasTag(caught, 'ValidationError')).toBe(true);
}

const hex8 = fc.stringMatching(/^[0-9a-f]{8}$/);
const hex64 = fc.stringMatching(/^[0-9a-f]{64}$/);

// ===========================================================================
// ContentAddress — fnv1a: + exactly 8 lowercase hex
// ===========================================================================
describe('ContentAddress', () => {
  test('accepts fnv1a:<8 lowercase hex> (every real FNV-1a output)', () => {
    fc.assert(
      fc.property(hex8, (h) => {
        expect(ContentAddress(`fnv1a:${h}`)).toBe(`fnv1a:${h}`);
      }),
    );
  });

  test('rejects wrong prefix, wrong width, and uppercase hex', () => {
    for (const bad of [
      'fnv1a:short',
      'fnv1a:0123456', // 7 hex
      'fnv1a:0123456789', // 10 hex
      'fnv1a:ABCDEF01', // uppercase
      'fnv1a:g0000000', // non-hex
      'sha256:00000000',
      'deadbeef',
      'fnv1a:',
      '',
    ]) {
      expectValidationError(() => ContentAddress(bad));
    }
  });

  test('isContentAddress predicate agrees with the constructor', () => {
    expect(coreIsContentAddress('fnv1a:deadbeef')).toBe(true);
    expect(coreIsContentAddress('fnv1a:DEADBEEF')).toBe(false);
    expect(coreIsContentAddress('nope')).toBe(false);
  });
});

// ===========================================================================
// IntegrityDigest — (sha256|blake3): + exactly 64 lowercase hex (ADR-0011)
// ===========================================================================
describe('IntegrityDigest', () => {
  test('accepts sha256:/blake3: + 64 lowercase hex', () => {
    fc.assert(
      fc.property(hex64, fc.constantFrom('sha256', 'blake3'), (h, algo) => {
        expect(IntegrityDigest(`${algo}:${h}`)).toBe(`${algo}:${h}`);
      }),
    );
  });

  test('rejects unsanctioned algorithms, wrong width, uppercase hex', () => {
    for (const bad of [
      `sha512:${'a'.repeat(64)}`,
      `sha1:${'a'.repeat(64)}`,
      `md5:${'a'.repeat(64)}`,
      `sha256:${'a'.repeat(63)}`, // 63 hex
      `sha256:${'a'.repeat(65)}`, // 65 hex
      `sha256:${'A'.repeat(64)}`, // uppercase
      'fnv1a:deadbeef',
      `${'a'.repeat(64)}`,
      '',
    ]) {
      expectValidationError(() => IntegrityDigest(bad));
    }
  });

  test('isIntegrityDigest predicate agrees with the constructor', () => {
    expect(coreIsIntegrityDigest(`sha256:${'f'.repeat(64)}`)).toBe(true);
    expect(coreIsIntegrityDigest(`blake3:${'0'.repeat(64)}`)).toBe(true);
    expect(coreIsIntegrityDigest(`sha512:${'0'.repeat(64)}`)).toBe(false);
  });
});

// ===========================================================================
// Cross-package parity: the duplicated checks must agree on every input.
// ===========================================================================
describe('ContentAddress/IntegrityDigest cross-package parity', () => {
  test('core, canonical, genui ContentAddress agree (accept + reject)', () => {
    fc.assert(
      fc.property(fc.oneof(hex8.map((h) => `fnv1a:${h}`), fc.string()), (v) => {
        const results = [
          () => ContentAddress(v),
          () => CanonAddr(v),
          () => GenuiAddr(v),
        ].map((f) => {
          try {
            f();
            return 'ok';
          } catch {
            return 'throw';
          }
        });
        expect(new Set(results).size).toBe(1);
      }),
    );
  });

  test('core and canonical IntegrityDigest agree (accept + reject)', () => {
    fc.assert(
      fc.property(
        fc.oneof(hex64.map((h) => `sha256:${h}`), fc.string()),
        (v) => {
          const a = (() => {
            try {
              IntegrityDigest(v);
              return 'ok';
            } catch {
              return 'throw';
            }
          })();
          const b = (() => {
            try {
              CanonDigest(v);
              return 'ok';
            } catch {
              return 'throw';
            }
          })();
          expect(a).toBe(b);
        },
      ),
    );
  });
});

// ===========================================================================
// Millis — finite, non-negative (a duration cannot run backwards or be NaN)
// ===========================================================================
describe('Millis', () => {
  test('accepts any finite non-negative number, including fractional and 0', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e12, noNaN: true, noDefaultInfinity: true }), (n) => {
        expect(Millis(n)).toBe(n);
      }),
    );
    expect(Millis(0)).toBe(0);
    expect(Millis(0.5)).toBe(0.5);
  });

  test('rejects negative, NaN, and Infinity', () => {
    for (const bad of [-1, -0.0001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expectValidationError(() => Millis(bad));
    }
  });
});

// ===========================================================================
// ThresholdValue — finite (NaN/Infinity break ordered boundary comparison)
// ===========================================================================
describe('ThresholdValue', () => {
  test('accepts any finite number, including negative and fractional', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        expect(ThresholdValue(n)).toBe(n);
      }),
    );
    expect(ThresholdValue(-273.15)).toBe(-273.15);
  });

  test('rejects NaN and Infinity', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expectValidationError(() => ThresholdValue(bad));
    }
  });
});

// ===========================================================================
// StateName — non-empty token, no whitespace (serialized state token/selector)
// ===========================================================================
describe('StateName', () => {
  test('accepts every real state name', () => {
    for (const name of ['mobile', 'tablet', 'desktop', 'sm', 'md', 'lg', 'expanded', 'a']) {
      expect(StateName(name)).toBe(name);
    }
  });

  test('rejects empty and whitespace-bearing names', () => {
    for (const bad of ['', ' ', 'has space', 'tab\tname', 'new\nline', 'trailing ']) {
      expectValidationError(() => StateName(bad));
    }
  });

  test('LAW: a non-empty whitespace-free string is always accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !/\s/.test(s)),
        (s) => {
          expect(StateName(s)).toBe(s);
        },
      ),
    );
  });
});

// ===========================================================================
// TokenRef — non-empty token, no whitespace (emitted as CSS custom-property)
// ===========================================================================
describe('TokenRef', () => {
  test('accepts every real token ref', () => {
    for (const ref of ['primary', 'secondary', 'color-surface', 'font-size-lg', 'gap-md', 'x']) {
      expect(TokenRef(ref)).toBe(ref);
    }
  });

  test('rejects empty and whitespace-bearing refs', () => {
    for (const bad of ['', '  ', 'font size', 'gap\tmd']) {
      expectValidationError(() => TokenRef(bad));
    }
  });
});

// ===========================================================================
// SignalInput — DELIBERATELY lenient free-form; only invariant is non-empty.
// Real values carry spaces/parens (media:(min-width: 600px)) so any
// character-grammar would reject genuine inputs.
// ===========================================================================
describe('SignalInput', () => {
  test('accepts canonical dotted, hyphenated, and free-form colon payloads', () => {
    for (const v of [
      'viewport.width',
      'scroll.progress',
      'prefers-color-scheme',
      'audio.amplitude',
      'media:(min-width: 600px)', // spaces + parens are real
      'custom:my.signal.id',
      'b',
    ]) {
      expect(SignalInput(v)).toBe(v);
    }
  });

  test('rejects only the empty string (a signal must name something)', () => {
    expectValidationError(() => SignalInput(''));
  });

  test('LAW: any non-empty string is a valid SignalInput', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (s) => {
        expect(SignalInput(s)).toBe(s);
      }),
    );
  });
});
