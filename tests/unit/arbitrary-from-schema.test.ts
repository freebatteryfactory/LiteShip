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
import { hasTag, ValidationError } from '@liteship/error';
import { decode, schema } from '../../packages/core/src/schema/index.js';
import type { Schema } from '../../packages/core/src/schema/index.js';
import {
  schemaToArbitrary,
  withArbitrary,
  ArbitraryAnnotationId,
} from '../../packages/core/src/harness/arbitrary-from-schema.js';

/** One fixed seed → every property run below is reproducible across machines. */
const SEED = 0x5eed;

/** Drive an arbitrary into the kernel STRICT decoder; assert every sample decodes ok. */
function expectAllDecode<A, I>(sch: Schema<A, I>, arb: fc.Arbitrary<A>, numRuns = 50): void {
  fc.assert(
    fc.property(arb, (sample) => decode(sch, sample as unknown).ok),
    { numRuns, seed: SEED },
  );
}

describe('schemaToArbitrary — round-trip over the kernel AST', () => {
  it('handles schema.string', () => {
    const sch = schema.string;
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles schema.number (as integer)', () => {
    const sch = schema.number;
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles schema.boolean', () => {
    const sch = schema.boolean;
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles schema.literal', () => {
    const sch = schema.literal('active');
    const arb = schemaToArbitrary(sch);
    fc.assert(
      fc.property(arb, (v) => v === 'active'),
      { numRuns: 20, seed: SEED },
    );
  });

  it('handles schema.literal(null)', () => {
    const sch = schema.literal(null);
    const arb = schemaToArbitrary(sch);
    fc.assert(
      fc.property(arb, (v) => v === null),
      { numRuns: 5, seed: SEED },
    );
  });

  it('handles a union of literals', () => {
    const sch = schema.union(schema.literal('a'), schema.literal('b'), schema.literal('c'));
    const arb = schemaToArbitrary(sch);
    fc.assert(
      fc.property(arb, (v) => v === 'a' || v === 'b' || v === 'c'),
      { numRuns: 50, seed: SEED },
    );
    // And every sample still decodes cleanly through the union.
    expectAllDecode(sch, arb);
  });

  it('handles a struct with required fields', () => {
    const sch = schema.struct({
      name: schema.string,
      age: schema.number,
      active: schema.boolean,
    });
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles schema.array(T)', () => {
    const sch = schema.array(schema.string);
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles schema.tuple (fixed arity, per-position types)', () => {
    const sch = schema.tuple(schema.number, schema.string);
    const arb = schemaToArbitrary(sch);
    // Every sample is exactly a 2-tuple [number, string] AND strict-decodes cleanly
    // (a wrong-arity sample would fail the tuple decoder).
    fc.assert(
      fc.property(arb, (v) => Array.isArray(v) && v.length === 2 && decode(sch, v as unknown).ok),
      { numRuns: 50, seed: SEED },
    );
  });

  it('handles schema.record(V) with poison-safe keys', () => {
    const sch = schema.record(schema.number);
    const arb = schemaToArbitrary(sch);
    // Every sample decodes AND never carries a prototype-poisoning key (which the
    // strict decoder would reject with schema/poison-key).
    fc.assert(
      fc.property(arb, (rec) => {
        if (typeof rec !== 'object' || rec === null) return false;
        for (const key of Object.keys(rec)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') return false;
        }
        return decode(sch, rec as unknown).ok;
      }),
      { numRuns: 50, seed: SEED },
    );
  });

  it('handles schema.unknown (accepts everything)', () => {
    const sch = schema.unknown;
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles schema.any (accepts everything)', () => {
    const sch = schema.any;
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles a tagged union of structs (TokenEvent shape)', () => {
    const sch = schema.union(
      schema.struct({ _tag: schema.literal('push'), token: schema.string }),
      schema.struct({ _tag: schema.literal('flush') }),
      schema.struct({ _tag: schema.literal('reset') }),
    );
    expectAllDecode(sch, schemaToArbitrary(sch));
  });

  it('handles a struct with an optional field (present and absent both decode)', () => {
    const sch = schema.struct({
      name: schema.string,
      age: schema.optional(schema.number),
    });
    const arb = schemaToArbitrary(sch);
    let sawWith = false;
    let sawWithout = false;
    fc.assert(
      fc.property(arb, (rec) => {
        if (typeof rec !== 'object' || rec === null) return false;
        const r = rec as Record<string, unknown>;
        if ('age' in r) sawWith = true;
        else sawWithout = true;
        return decode(sch, rec as unknown).ok;
      }),
      { numRuns: 100, seed: SEED },
    );
    // The seeded run hits both branches — documents the optional-key sampling.
    expect(sawWith).toBe(true);
    expect(sawWithout).toBe(true);
  });

  it('handles a nested struct + array', () => {
    const sch = schema.struct({
      id: schema.string,
      tags: schema.array(schema.string),
      meta: schema.struct({ count: schema.number, live: schema.boolean }),
    });
    expectAllDecode(sch, schemaToArbitrary(sch));
  });
});

describe('schemaToArbitrary — withArbitrary override (opaque + narrow domains)', () => {
  it('honours the annotated thunk on a bytes carrier, ahead of structural refusal', () => {
    // `schema.bytes(Uint8Array)` alone is REFUSED structurally (see below); the
    // annotation supplies the generator, and the walker honours it.
    const sentinel = new Uint8Array([1, 2, 3]);
    const sch = withArbitrary(schema.bytes(Uint8Array), () => fc.constant(sentinel));
    const arb = schemaToArbitrary(sch);
    for (const s of fc.sample(arb, { numRuns: 20, seed: SEED })) expect(s).toBe(sentinel);
    // And the sampled bytes still strict-decode through the carrier.
    expectAllDecode(sch, arb, 20);
  });

  it('honours the annotated thunk on a brand — the narrow-valid-subset case', () => {
    // A brand narrows to a valid SUBSET (positive integers); sampling the wider
    // base would be silent widening, so the author attaches a generator.
    const PositiveInt = schema.brand(
      schema.number,
      (n) => {
        if (n <= 0) throw ValidationError('PositiveInt', 'must be positive');
        return n;
      },
      'PositiveInt',
    );
    const sch = withArbitrary(PositiveInt, () => fc.integer({ min: 1, max: 1_000 }));
    const arb = schemaToArbitrary(sch);
    fc.assert(
      fc.property(arb, (v) => typeof v === 'number' && v > 0 && decode(sch, v as unknown).ok),
      { numRuns: 50, seed: SEED },
    );
  });

  it('builds the arbitrary lazily — the thunk runs at walk time, not at annotate time', () => {
    let built = 0;
    const sch = withArbitrary(schema.string, () => {
      built++;
      return fc.constant('x');
    });
    // Annotating must NOT have invoked the thunk yet.
    expect(built).toBe(0);
    schemaToArbitrary(sch);
    expect(built).toBe(1);
  });

  it('surfaces the annotation under ArbitraryAnnotationId on the AST node', () => {
    const sch = withArbitrary(schema.number, () => fc.constant(7));
    const annotations = sch.ast.annotations;
    expect(annotations).toBeDefined();
    expect(typeof annotations?.[ArbitraryAnnotationId]).toBe('function');
  });

  it('throws UnsupportedError when the thunk does not return a fast-check arbitrary', () => {
    const sch = withArbitrary(schema.string, () => 'not-an-arbitrary');
    let caught: unknown;
    try {
      schemaToArbitrary(sch);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
  });
});

describe('schemaToArbitrary — UnsupportedError refusals (honest skips)', () => {
  it('refuses an un-annotated bytes carrier, naming subject "bytes"', () => {
    const sch = schema.bytes(Uint8Array);
    let caught: unknown;
    try {
      schemaToArbitrary(sch);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'bytes' });
  });

  it('refuses an un-annotated brand, naming subject "brand"', () => {
    const sch = schema.brand(schema.string, (s) => s, 'Tag');
    let caught: unknown;
    try {
      schemaToArbitrary(sch);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'brand' });
  });

  it('refuses a typed hole, naming subject "hole"', () => {
    const sch = schema.hole('unfinished');
    let caught: unknown;
    try {
      schemaToArbitrary(sch);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'hole' });
  });

  it('propagates the refusal out of a nested struct (a bytes field refuses the whole schema)', () => {
    const sch = schema.struct({ id: schema.string, payload: schema.bytes(Uint8Array) });
    let caught: unknown;
    try {
      schemaToArbitrary(sch);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(caught).toMatchObject({ _tag: 'UnsupportedError', subject: 'bytes' });
  });
});
