/**
 * Unit tests for `schemaToArbitrary` — the KERNEL-AST walker.
 *
 * The core law is a ROUND-TRIP property: for every `S.*` constructor the walker
 * supports, every sample it produces must STRICT-DECODE cleanly back through the
 * same kernel schema (`decode(schema, sample).ok === true`). fast-check is SEEDED
 * so the property runs are deterministic.
 *
 * The two remaining surfaces: the explicit `withArbitrary` override (honoured
 * ahead of structural derivation — the sanctioned path for opaque `bytes` and
 * narrow `brand` domains), and the `UnsupportedError` refusals (un-annotated
 * `bytes`/`brand` and `hole`) the harness reports as honest skips.
 */
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { hasTag, ValidationError } from '@czap/error';
import { S, decode } from '../../packages/core/src/schema/index.js';
import type { Schema } from '../../packages/core/src/schema/index.js';
import {
  schemaToArbitrary,
  withArbitrary,
  ArbitraryAnnotationId,
} from '../../packages/core/src/harness/arbitrary-from-schema.js';

/** One fixed seed → every property run below is reproducible across machines. */
const SEED = 0x5eed;

/** Drive an arbitrary into the kernel STRICT decoder; assert every sample decodes ok. */
function expectAllDecode<A, I>(schema: Schema<A, I>, arb: fc.Arbitrary<A>, numRuns = 50): void {
  fc.assert(
    fc.property(arb, (sample) => decode(schema, sample as unknown).ok),
    { numRuns, seed: SEED },
  );
}

describe('schemaToArbitrary — round-trip over the kernel AST', () => {
  it('handles S.string', () => {
    const schema = S.string;
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles S.number (as integer)', () => {
    const schema = S.number;
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles S.boolean', () => {
    const schema = S.boolean;
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles S.literal', () => {
    const schema = S.literal('active');
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v === 'active'),
      { numRuns: 20, seed: SEED },
    );
  });

  it('handles S.literal(null)', () => {
    const schema = S.literal(null);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v === null),
      { numRuns: 5, seed: SEED },
    );
  });

  it('handles a union of literals', () => {
    const schema = S.union(S.literal('a'), S.literal('b'), S.literal('c'));
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v === 'a' || v === 'b' || v === 'c'),
      { numRuns: 50, seed: SEED },
    );
    // And every sample still decodes cleanly through the union.
    expectAllDecode(schema, arb);
  });

  it('handles a struct with required fields', () => {
    const schema = S.struct({
      name: S.string,
      age: S.number,
      active: S.boolean,
    });
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles S.array(T)', () => {
    const schema = S.array(S.string);
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles S.tuple (fixed arity, per-position types)', () => {
    const schema = S.tuple(S.number, S.string);
    const arb = schemaToArbitrary(schema);
    // Every sample is exactly a 2-tuple [number, string] AND strict-decodes cleanly
    // (a wrong-arity sample would fail the tuple decoder).
    fc.assert(
      fc.property(arb, (v) => Array.isArray(v) && v.length === 2 && decode(schema, v as unknown).ok),
      { numRuns: 50, seed: SEED },
    );
  });

  it('handles S.record(V) with poison-safe keys', () => {
    const schema = S.record(S.number);
    const arb = schemaToArbitrary(schema);
    // Every sample decodes AND never carries a prototype-poisoning key (which the
    // strict decoder would reject with schema/poison-key).
    fc.assert(
      fc.property(arb, (rec) => {
        if (typeof rec !== 'object' || rec === null) return false;
        for (const key of Object.keys(rec)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') return false;
        }
        return decode(schema, rec as unknown).ok;
      }),
      { numRuns: 50, seed: SEED },
    );
  });

  it('handles S.unknown (accepts everything)', () => {
    const schema = S.unknown;
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles S.any (accepts everything)', () => {
    const schema = S.any;
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles a tagged union of structs (TokenEvent shape)', () => {
    const schema = S.union(
      S.struct({ _tag: S.literal('push'), token: S.string }),
      S.struct({ _tag: S.literal('flush') }),
      S.struct({ _tag: S.literal('reset') }),
    );
    expectAllDecode(schema, schemaToArbitrary(schema));
  });

  it('handles a struct with an optional field (present and absent both decode)', () => {
    const schema = S.struct({
      name: S.string,
      age: S.optional(S.number),
    });
    const arb = schemaToArbitrary(schema);
    let sawWith = false;
    let sawWithout = false;
    fc.assert(
      fc.property(arb, (rec) => {
        if (typeof rec !== 'object' || rec === null) return false;
        const r = rec as Record<string, unknown>;
        if ('age' in r) sawWith = true;
        else sawWithout = true;
        return decode(schema, rec as unknown).ok;
      }),
      { numRuns: 100, seed: SEED },
    );
    // The seeded run hits both branches — documents the optional-key sampling.
    expect(sawWith).toBe(true);
    expect(sawWithout).toBe(true);
  });

  it('handles a nested struct + array', () => {
    const schema = S.struct({
      id: S.string,
      tags: S.array(S.string),
      meta: S.struct({ count: S.number, live: S.boolean }),
    });
    expectAllDecode(schema, schemaToArbitrary(schema));
  });
});

describe('schemaToArbitrary — withArbitrary override (opaque + narrow domains)', () => {
  it('honours the annotated thunk on a bytes carrier, ahead of structural refusal', () => {
    // `S.bytes(Uint8Array)` alone is REFUSED structurally (see below); the
    // annotation supplies the generator, and the walker honours it.
    const sentinel = new Uint8Array([1, 2, 3]);
    const schema = withArbitrary(S.bytes(Uint8Array), () => fc.constant(sentinel));
    const arb = schemaToArbitrary(schema);
    for (const s of fc.sample(arb, { numRuns: 20, seed: SEED })) expect(s).toBe(sentinel);
    // And the sampled bytes still strict-decode through the carrier.
    expectAllDecode(schema, arb, 20);
  });

  it('honours the annotated thunk on a brand — the narrow-valid-subset case', () => {
    // A brand narrows to a valid SUBSET (positive integers); sampling the wider
    // base would be silent widening, so the author attaches a generator.
    const PositiveInt = S.brand(
      S.number,
      (n) => {
        if (n <= 0) throw ValidationError('PositiveInt', 'must be positive');
        return n;
      },
      'PositiveInt',
    );
    const schema = withArbitrary(PositiveInt, () => fc.integer({ min: 1, max: 1_000 }));
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => typeof v === 'number' && v > 0 && decode(schema, v as unknown).ok),
      { numRuns: 50, seed: SEED },
    );
  });

  it('builds the arbitrary lazily — the thunk runs at walk time, not at annotate time', () => {
    let built = 0;
    const schema = withArbitrary(S.string, () => {
      built++;
      return fc.constant('x');
    });
    // Annotating must NOT have invoked the thunk yet.
    expect(built).toBe(0);
    schemaToArbitrary(schema);
    expect(built).toBe(1);
  });

  it('surfaces the annotation under ArbitraryAnnotationId on the AST node', () => {
    const schema = withArbitrary(S.number, () => fc.constant(7));
    const annotations = schema.ast.annotations;
    expect(annotations).toBeDefined();
    expect(typeof annotations?.[ArbitraryAnnotationId]).toBe('function');
  });

  it('throws UnsupportedError when the thunk does not return a fast-check arbitrary', () => {
    const schema = withArbitrary(S.string, () => 'not-an-arbitrary');
    let caught: unknown;
    try {
      schemaToArbitrary(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
  });
});

describe('schemaToArbitrary — UnsupportedError refusals (honest skips)', () => {
  it('refuses an un-annotated bytes carrier, naming subject "bytes"', () => {
    const schema = S.bytes(Uint8Array);
    let caught: unknown;
    try {
      schemaToArbitrary(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'bytes' });
  });

  it('refuses an un-annotated brand, naming subject "brand"', () => {
    const schema = S.brand(S.string, (s) => s, 'Tag');
    let caught: unknown;
    try {
      schemaToArbitrary(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'brand' });
  });

  it('refuses a typed hole, naming subject "hole"', () => {
    const schema = S.hole('unfinished');
    let caught: unknown;
    try {
      schemaToArbitrary(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'hole' });
  });

  it('propagates the refusal out of a nested struct (a bytes field refuses the whole schema)', () => {
    const schema = S.struct({ id: S.string, payload: S.bytes(Uint8Array) });
    let caught: unknown;
    try {
      schemaToArbitrary(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'bytes' });
  });
});
