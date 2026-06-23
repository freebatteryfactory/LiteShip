/**
 * doctor/types — the leaf vocabulary's runtime surface. types.ts is NOT a
 * pure type-declaration module (unlike scene/contract.ts): it carries four
 * runtime exports the whole probe graph leans on — `unreadable`,
 * `parseEngineMajor`, `parseMajor`, and the `DOCTOR_PROBE_TIMEOUT_MS`
 * constant. These tests pin the LAWS of those parsers, not their churn.
 *
 * THE LAWS:
 *  - unreadable: an Error becomes its `.message`; anything else stringifies
 *    (never throws, never loses the diagnosis).
 *  - parseEngineMajor: extracts the first integer run from a range spec
 *    (`>=22`, `^10.1`), null on undefined / no-digit input.
 *  - parseMajor: tolerant of a leading `v` and surrounding whitespace,
 *    returns null on a non-numeric major (never NaN leaks out).
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  DOCTOR_PROBE_TIMEOUT_MS,
  parseEngineMajor,
  parseMajor,
  unreadable,
} from '../../../../../packages/cli/src/commands/doctor/types.js';

describe('doctor/types — unreadable()', () => {
  it('extracts the message from an Error instance', () => {
    expect(unreadable(new Error('boom'))).toEqual({ kind: 'unreadable', detail: 'boom' });
  });

  it('stringifies a non-Error value (no message to read)', () => {
    expect(unreadable('plain string')).toEqual({ kind: 'unreadable', detail: 'plain string' });
    expect(unreadable(42)).toEqual({ kind: 'unreadable', detail: '42' });
    expect(unreadable(null)).toEqual({ kind: 'unreadable', detail: 'null' });
  });

  it('tags `unreadable` with a string detail for any realistic thrown value', () => {
    // unreadable() is only ever fed a caught exception — a real Error, or a
    // thrown primitive/plain-object. (It is NOT contracted to survive an
    // exotic null-prototype object whose String() coercion itself throws; no
    // caller produces one.) The LAW: a string `detail`, always tagged.
    const thrown = fc.oneof(
      fc.string().map((m) => new Error(m)),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
    );
    fc.assert(
      fc.property(thrown, (x) => {
        const r = unreadable(x);
        expect(r.kind).toBe('unreadable');
        expect(typeof r.detail).toBe('string');
      }),
    );
  });

  it('subclassed Error still yields its message (instanceof Error branch)', () => {
    class CustomError extends Error {}
    expect(unreadable(new CustomError('custom')).detail).toBe('custom');
  });
});

describe('doctor/types — parseEngineMajor()', () => {
  it('returns null for an undefined engine spec', () => {
    expect(parseEngineMajor(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseEngineMajor('')).toBeNull();
  });

  it('returns null when there is no digit run', () => {
    expect(parseEngineMajor('latest')).toBeNull();
  });

  it('extracts the first integer from a range spec', () => {
    expect(parseEngineMajor('>=22')).toBe(22);
    expect(parseEngineMajor('^10.1.0')).toBe(10);
    expect(parseEngineMajor('22.4.0')).toBe(22);
    expect(parseEngineMajor('>=20.0.0')).toBe(20);
  });

  it('the first digit run wins for any non-empty integer prefix', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), fc.constantFrom('>=', '^', '~', ''), (n, prefix) => {
        expect(parseEngineMajor(`${prefix}${n}.0.0`)).toBe(n);
      }),
    );
  });
});

describe('doctor/types — parseMajor()', () => {
  it('parses a plain semver major', () => {
    expect(parseMajor('6.0.5')).toBe(6);
    expect(parseMajor('13.0.0')).toBe(13);
  });

  it('tolerates a leading v', () => {
    expect(parseMajor('v22.4.0')).toBe(22);
  });

  it('trims surrounding whitespace (CLI --version output often has trailing newline)', () => {
    expect(parseMajor('  4.0.0\n')).toBe(4);
    expect(parseMajor('v10.1.2  ')).toBe(10);
  });

  it('returns null (never NaN) on a non-numeric major', () => {
    expect(parseMajor('unknown')).toBeNull();
    expect(parseMajor('vX.Y.Z')).toBeNull();
    expect(parseMajor('beta')).toBeNull();
  });

  it('an empty string parses to 0 (Number("") === 0), not null', () => {
    // Documents the actual boundary: split('.')[0] is '' and Number('') is 0,
    // which is finite — so the guard returns 0, not null. Callers (the version
    // probes) only reach parseMajor on a non-empty version string.
    expect(parseMajor('')).toBe(0);
  });

  it('round-trips any non-negative integer major regardless of v-prefix/whitespace', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.constantFrom('', 'v'),
        fc.constantFrom('', ' ', '\n', '  '),
        (maj, v, ws) => {
          expect(parseMajor(`${ws}${v}${maj}.2.3${ws}`)).toBe(maj);
        },
      ),
    );
  });
});

describe('doctor/types — constants', () => {
  it('DOCTOR_PROBE_TIMEOUT_MS is a positive finite bound', () => {
    expect(DOCTOR_PROBE_TIMEOUT_MS).toBe(4_000);
    expect(Number.isFinite(DOCTOR_PROBE_TIMEOUT_MS)).toBe(true);
    expect(DOCTOR_PROBE_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
