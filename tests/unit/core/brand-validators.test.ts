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
 * ContentAddress / IntegrityDigest live in THREE intentional homes across
 * `@czap/core`, `@czap/canonical`, and `@czap/genui` — a deliberate layering
 * (ADR-0012), NOT accidental duplication. The three-home parity drift-guard
 * below pins that they agree at runtime so the divergence can't be naively
 * "unified" away; see the long comment above that `describe` block for the
 * rationale (spine = strict symbol-brand apex; core/genui re-anchor; canonical
 * = zero-dep template literal) before touching it.
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
  fnv1a as coreFnv1a,
  fnv1aBytes as coreFnv1aBytes,
} from '@czap/core';
import {
  isContentAddress as coreIsContentAddress,
  isIntegrityDigest as coreIsIntegrityDigest,
} from '../../../packages/core/src/brands.js';
import {
  ContentAddress as CanonAddr,
  IntegrityDigest as CanonDigest,
  fnv1a as canonFnv1a,
  fnv1aBytes as canonFnv1aBytes,
} from '@czap/canonical';
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
// Cross-package parity drift-guard — THE THREE-HOME INVARIANT (ADR-0012).
//
// `ContentAddress` has THREE intentional homes that must NOT be merged:
//   • `@czap/_spine` — the APEX brand: `string & { [ContentAddressBrand]: true }`
//     (symbol-branded; strictest — a raw `fnv1a:...` string cannot be typed as
//     ContentAddress without going through a validating constructor).
//   • `@czap/core` / `@czap/genui` — RE-ANCHOR the spine brand
//     (`export type ContentAddress = _ContentAddress`) with validating
//     constructors (isContentAddress, then a checked cast).
//   • `@czap/canonical` — intentionally ZERO-DEP (only `@czap/error`); uses a
//     `` `fnv1a:${string}` `` template-literal brand whose constructor returns the
//     validated string cast-free.
//
// The divergence is DELIBERATE: merging the homes would either break canonical's
// zero-dep property (the bytes kernel must carry no spine peer-dependency) or
// weaken the apex symbol-brand down to a template literal. They are kept honest
// SOLELY by this drift-guard, which pins three LAWS at RUNTIME — do NOT "unify"
// the homes to silence it.
//   (a) ACCEPT parity   — all three accept every valid fnv1a:<8 hex> and return
//                         the BYTE-IDENTICAL string.
//   (b) REJECT parity   — all three reject every malformed input identically
//                         (generator covers the near-miss malformed space).
//   (c) PRODUCER parity — core's fnv1a/fnv1aBytes (which WRAP canonical's) return
//                         byte-identical addresses to canonical's, pinning the
//                         wrap stays faithful; golden vectors are pinned in
//                         tests/unit/canonical/golden-vectors.test.ts (referenced,
//                         not re-owned here).
// ===========================================================================

/** The three ContentAddress smart-constructors under parity (core / canonical / genui). */
const contentAddressHomes = [ContentAddress, CanonAddr, GenuiAddr] as const;

/**
 * Malformed-ContentAddress generator. `fc.string()` almost never produces the
 * NEAR-MISS shapes that actually exercise the validators (uppercase hex, 7/9-hex
 * widths, wrong prefix), so we hand-build the malformed space and union it with
 * arbitrary strings as a backstop. Every branch here is NOT `fnv1a:<8 lowercase
 * hex>`, so every home must reject it.
 */
const malformedAddress: fc.Arbitrary<string> = fc.oneof(
  // wrong prefix, otherwise-valid 8 hex body
  fc.tuple(fc.constantFrom('sha256', 'blake3', 'fnv1', 'fnv1a2', '', 'FNV1A'), hex8).map(
    ([p, h]) => `${p}:${h}`,
  ),
  // right prefix, wrong hex width (anything but 8)
  fc
    .tuple(fc.integer({ min: 0, max: 16 }).filter((n) => n !== 8), fc.constantFrom('0', 'a', 'f'))
    .map(([n, c]) => `fnv1a:${c.repeat(n)}`),
  // right prefix + width, but uppercase / non-hex characters in the body
  fc.stringMatching(/^[0-9A-Fg-z]{8}$/).filter((s) => /[A-Fg-z]/.test(s)).map((b) => `fnv1a:${b}`),
  // structural degenerates
  fc.constantFrom('', 'fnv1a:', 'fnv1a', 'fnv1a:deadbeef ', ' fnv1a:deadbeef', 'deadbeef'),
  // arbitrary-string backstop (filtered so a fluke valid address can't sneak in)
  fc.string().filter((s) => !/^fnv1a:[0-9a-f]{8}$/.test(s)),
);

/** Run `ctor` on `v`; report whether it accepted (and what it returned) or threw. */
function verdictOf(
  ctor: (v: string) => string,
  v: string,
): { kind: 'ok'; value: string } | { kind: 'throw' } {
  try {
    return { kind: 'ok', value: ctor(v) };
  } catch {
    return { kind: 'throw' };
  }
}

describe('ContentAddress three-home parity drift-guard (ADR-0012)', () => {
  test('(a) ACCEPT parity: all three accept fnv1a:<8 hex> and return byte-identical strings', () => {
    fc.assert(
      fc.property(hex8, (h) => {
        const input = `fnv1a:${h}`;
        const outputs = contentAddressHomes.map((home) => home(input));
        // Every home returns, and returns the exact same string bytes as the input.
        for (const out of outputs) expect(out).toBe(input);
        // Byte-identical across homes (redundant with the above, but pins the LAW directly).
        expect(new Set(outputs).size).toBe(1);
      }),
    );
  });

  test('(b) REJECT parity: all three reject every malformed input identically', () => {
    fc.assert(
      fc.property(malformedAddress, (bad) => {
        const verdicts = contentAddressHomes.map((home) => verdictOf(home, bad));
        // All three must throw on malformed input — no home may be more permissive.
        for (const verdict of verdicts) {
          expect(verdict.kind).toBe('throw');
        }
      }),
    );
  });

  test('(b′) ACCEPT/REJECT verdict parity over the whole input space (valid ∪ malformed)', () => {
    fc.assert(
      fc.property(fc.oneof(hex8.map((h) => `fnv1a:${h}`), malformedAddress), (v) => {
        const verdicts = contentAddressHomes.map((home) => verdictOf(home, v));
        // Identical accept/reject verdict...
        const kinds = new Set(verdicts.map((r) => r.kind));
        expect(kinds.size).toBe(1);
        // ...and when accepted, identical returned bytes.
        const accepted = verdicts.filter(
          (r): r is { kind: 'ok'; value: string } => r.kind === 'ok',
        );
        if (accepted.length > 0) {
          expect(new Set(accepted.map((r) => r.value)).size).toBe(1);
        }
      }),
    );
  });

  test('(c) PRODUCER parity: core fnv1a/fnv1aBytes wrap canonical faithfully (byte-identical)', () => {
    // String producer.
    fc.assert(
      fc.property(fc.string(), (s) => {
        const core = coreFnv1a(s);
        const canon = canonFnv1a(s);
        expect(core).toBe(canon);
        // The producer output must itself satisfy every home's constructor.
        for (const home of contentAddressHomes) expect(home(core)).toBe(core);
      }),
    );
    // Bytes producer.
    fc.assert(
      fc.property(fc.uint8Array(), (bytes) => {
        const core = coreFnv1aBytes(bytes);
        const canon = canonFnv1aBytes(bytes);
        expect(core).toBe(canon);
        for (const home of contentAddressHomes) expect(home(core)).toBe(core);
      }),
    );
  });
});

// ===========================================================================
// IntegrityDigest cross-package parity (core ↔ canonical re-anchor agreement).
// ===========================================================================
describe('IntegrityDigest cross-package parity', () => {
  /**
   * Malformed-IntegrityDigest generator (near-miss space): unsanctioned algos,
   * wrong hex width, uppercase. Every branch is NOT `(sha256|blake3):<64 hex>`.
   */
  const malformedDigest: fc.Arbitrary<string> = fc.oneof(
    fc.tuple(fc.constantFrom('sha512', 'sha1', 'md5', 'blake2', '', 'SHA256'), hex64).map(
      ([algo, h]) => `${algo}:${h}`,
    ),
    fc
      .tuple(
        fc.constantFrom('sha256', 'blake3'),
        fc.integer({ min: 0, max: 80 }).filter((n) => n !== 64),
      )
      .map(([algo, n]) => `${algo}:${'a'.repeat(n)}`),
    fc.stringMatching(/^[0-9A-F]{64}$/).map((b) => `sha256:${b}`),
    fc.constantFrom('', 'sha256:', 'fnv1a:deadbeef'),
    fc.string().filter((s) => !/^(?:sha256|blake3):[0-9a-f]{64}$/.test(s)),
  );

  test('core and canonical IntegrityDigest agree (accept + reject + identical bytes)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          hex64.map((h) => `sha256:${h}`),
          hex64.map((h) => `blake3:${h}`),
          malformedDigest,
        ),
        (v) => {
          const a = verdictOf(IntegrityDigest as (s: string) => string, v);
          const b = verdictOf(CanonDigest as (s: string) => string, v);
          expect(a.kind).toBe(b.kind);
          if (a.kind === 'ok' && b.kind === 'ok') {
            expect(a.value).toBe(b.value);
            expect(a.value).toBe(v);
          }
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
