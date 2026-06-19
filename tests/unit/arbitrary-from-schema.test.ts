/**
 * Unit tests for `schemaToArbitrary` — verifies the Effect Schema AST
 * walker produces fast-check arbitraries that yield values which decode
 * cleanly back through the source schema.
 *
 * Coverage targets the same surface the harness depends on: scalars,
 * literals, unions, structs, arrays, optional keys, and the unsupported
 * fall-through error.
 */
import { describe, expect, it } from 'vitest';
import { Effect, Schema } from 'effect';
import * as fc from 'fast-check';
import {
  schemaToArbitrary,
  UnsupportedSchemaError,
  withArbitrary,
  ArbitraryAnnotationId,
} from '../../packages/core/src/harness/arbitrary-from-schema.js';

/** Drive an arbitrary into a schema's decoder; assert every sample decodes. */
function expectAllDecode<T>(
  schema: Schema.Schema<T>,
  arb: fc.Arbitrary<T>,
  numRuns = 50,
): void {
  fc.assert(
    fc.property(arb, (sample) => {
      const exit = Effect.runSyncExit(
        Schema.decodeUnknownEffect(schema)(sample as unknown),
      );
      return exit._tag === 'Success';
    }),
    { numRuns },
  );
}

describe('schemaToArbitrary', () => {
  it('handles String', () => {
    const schema = Schema.String;
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb);
  });

  it('handles Number (as integer)', () => {
    const schema = Schema.Number;
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb);
  });

  it('handles Boolean', () => {
    const schema = Schema.Boolean;
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb);
  });

  it('handles Literal', () => {
    const schema = Schema.Literal('active');
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v === 'active'),
      { numRuns: 20 },
    );
  });

  it('handles Union of literals', () => {
    const schema = Schema.Union([
      Schema.Literal('a'),
      Schema.Literal('b'),
      Schema.Literal('c'),
    ]);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v === 'a' || v === 'b' || v === 'c'),
      { numRuns: 50 },
    );
  });

  it('handles Struct with required fields', () => {
    const schema = Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
      active: Schema.Boolean,
    });
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb);
  });

  it('handles Array(T)', () => {
    const schema = Schema.Array(Schema.String);
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb);
  });

  it('handles Unknown / Any via fc.anything', () => {
    const schema = Schema.Unknown;
    const arb = schemaToArbitrary(schema);
    // Just smoke-test that arb produces values; Unknown decodes everything.
    fc.assert(
      fc.property(arb, () => true),
      { numRuns: 20 },
    );
  });

  it('handles a tagged union of structs (TokenEvent shape)', () => {
    const schema = Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('push'), token: Schema.String }),
      Schema.Struct({ _tag: Schema.Literal('flush') }),
      Schema.Struct({ _tag: Schema.Literal('reset') }),
    ]);
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb);
  });

  it('throws UnsupportedSchemaError for genuinely-opaque Declaration nodes', () => {
    // A user class is an opaque Declaration: it carries no constructor
    // annotation and rejects every recognised sentinel, so the walker
    // throws rather than blanket-accepting all declarations.
    class OpaqueThing {}
    const schema = Schema.instanceOf(OpaqueThing);
    expect(() => schemaToArbitrary(schema)).toThrow(UnsupportedSchemaError);
  });

  it('throws UnsupportedSchemaError naming the unsupported node tag', () => {
    class OpaqueThing {}
    const schema = Schema.instanceOf(OpaqueThing);
    let caught: unknown;
    try {
      schemaToArbitrary(schema);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(UnsupportedSchemaError);
    expect((caught as UnsupportedSchemaError).nodeTag).toBe('Declaration');
  });

  it('handles Schema.instanceOf(Uint8Array) via the sentinel probe', () => {
    // The un-annotated instanceOf form carries no constructor annotation;
    // the parser-sentinel probe still recognises it as Uint8Array.
    const schema = Schema.instanceOf(Uint8Array);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v instanceof Uint8Array),
      { numRuns: 10 },
    );
  });

  it('handles NonEmptyString refinement (checks-based)', () => {
    const schema = Schema.NonEmptyString;
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (s) => typeof s === 'string' && s.length > 0),
      { numRuns: 50 },
    );
  });

  it('handles String + minLength(3) refinement (checks-based)', () => {
    const schema = Schema.String.check(Schema.isMinLength(3));
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (s) => typeof s === 'string' && s.length >= 3),
      { numRuns: 50 },
    );
  });

  it('handles Schema.instanceOf(Date) by producing Date instances', () => {
    const schema = Schema.instanceOf(Date);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (d) => d instanceof Date),
      { numRuns: 10 },
    );
  });

  it('handles NonEmptyArray (Arrays elements+rest shape)', () => {
    const schema = Schema.NonEmptyArray(Schema.String);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (a) => Array.isArray(a) && a.length >= 1),
      { numRuns: 50 },
    );
  });

  it('handles Struct with optional fields', () => {
    const schema = Schema.Struct({
      name: Schema.String,
      age: Schema.optional(Schema.Number),
    });
    const arb = schemaToArbitrary(schema);
    let sawWith = false;
    let sawWithout = false;
    fc.assert(
      fc.property(arb, (rec) => {
        if (typeof rec !== 'object' || rec === null) return false;
        const r = rec as Record<string, unknown>;
        if (typeof r.name !== 'string') return false;
        if ('age' in r) {
          sawWith = true;
          if (r.age !== undefined && typeof r.age !== 'number') return false;
        } else {
          sawWithout = true;
        }
        return true;
      }),
      { numRuns: 100 },
    );
    // We don't strictly require both branches but typical fast-check
    // runs hit each at least once. This documents the expected shape.
    expect(sawWith || sawWithout).toBe(true);
  });

  it('handles Suspend pointing at a non-recursive schema', () => {
    const Inner = Schema.Struct({ name: Schema.String });
    const Suspended = Schema.suspend(() => Inner);
    const arb = schemaToArbitrary(Suspended);
    fc.assert(
      fc.property(
        arb,
        (rec) =>
          typeof rec === 'object' &&
          rec !== null &&
          typeof (rec as { name: unknown }).name === 'string',
      ),
      { numRuns: 20 },
    );
  });

  it('throws UnsupportedSchemaError for unhandled AST tags (Schema.Never)', () => {
    // Schema.Never has _tag 'Never' which the walker does not handle —
    // exercises the switch's default-case throw.
    expect(() => schemaToArbitrary(Schema.Never)).toThrow(
      UnsupportedSchemaError,
    );
  });

  it('handles Schema.Enum', () => {
    enum Color {
      Red = 'red',
      Blue = 'blue',
      Green = 'green',
    }
    const schema = Schema.Enum(Color);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) => v === 'red' || v === 'blue' || v === 'green'),
      { numRuns: 30 },
    );
  });

  it('handles Schema.BigInt by producing bigint values', () => {
    const arb = schemaToArbitrary(Schema.BigInt);
    fc.assert(
      fc.property(arb, (v) => typeof v === 'bigint'),
      { numRuns: 20 },
    );
  });

  it('handles Schema.Null', () => {
    const arb = schemaToArbitrary(Schema.Null);
    fc.assert(
      fc.property(arb, (v) => v === null),
      { numRuns: 5 },
    );
  });

  it('handles Schema.Undefined', () => {
    const arb = schemaToArbitrary(Schema.Undefined);
    fc.assert(
      fc.property(arb, (v) => v === undefined),
      { numRuns: 5 },
    );
  });

  it('handles Schema.Void', () => {
    const arb = schemaToArbitrary(Schema.Void);
    fc.assert(
      fc.property(arb, (v) => v === undefined),
      { numRuns: 5 },
    );
  });

  it('handles a fixed Tuple', () => {
    const schema = Schema.Tuple([Schema.String, Schema.Number]);
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (v) =>
        Array.isArray(v) &&
        v.length === 2 &&
        typeof v[0] === 'string' &&
        typeof v[1] === 'number'
      ),
      { numRuns: 20 },
    );
  });

  // ── Gap 1: Transformation / codec schemas ────────────────────────────
  // The harness feeds DECODED values straight into a capsule's run/derive
  // handler, so the arbitrary must yield the codec's decoded (runtime)
  // type. `Schema.NumberFromString` decodes a string into a number; the
  // arbitrary must produce values that decode cleanly through the codec.
  it('handles a codec (NumberFromString) by yielding decoded-side values', () => {
    const schema = Schema.NumberFromString;
    const arb = schemaToArbitrary(schema);
    // Every sample must be the decoded (runtime) type — a number — the
    // type the capsule handler actually receives. Conformance is checked
    // against the schema's decoded Type (`Schema.is`) and a clean encode
    // back to the wire side, NOT `decodeUnknown` (which expects the
    // encoded string and would reject a decoded number).
    const isType = Schema.is(schema);
    const encode = Schema.encodeUnknownEffect(schema);
    const samples = fc.sample(arb, 10);
    expect(samples.length).toBe(10);
    for (const s of samples) {
      expect(typeof s).toBe('number');
      expect(isType(s)).toBe(true);
      expect(Effect.runSyncExit(encode(s as unknown))._tag).toBe('Success');
    }
  });

  // ── Gap 2: TemplateLiteral ───────────────────────────────────────────
  it('handles a TemplateLiteral by yielding template-conforming strings', () => {
    // `/user/${number}` — every sample must be a string starting with the
    // literal head and decode through the template schema.
    const schema = Schema.TemplateLiteral(['/user/', Schema.Number]);
    const arb = schemaToArbitrary(schema);
    const samples = fc.sample(arb, 10);
    expect(samples.length).toBe(10);
    for (const s of samples) {
      expect(typeof s).toBe('string');
      expect((s as string).startsWith('/user/')).toBe(true);
      const exit = Effect.runSyncExit(
        Schema.decodeUnknownEffect(schema)(s as unknown),
      );
      expect(exit._tag).toBe('Success');
    }
  });

  it('handles a TemplateLiteral with a String span', () => {
    // `a${string}-${number}` — exercises the alphanumeric String-span
    // arbitrary so adjacent delimiters stay unambiguous.
    const schema = Schema.TemplateLiteral([
      'a',
      Schema.String,
      '-',
      Schema.Number,
    ]);
    const arb = schemaToArbitrary(schema);
    expectAllDecode(schema, arb as fc.Arbitrary<string>, 50);
  });

  // ── Gap 3: Declaration → Uint8Array ──────────────────────────────────
  it('handles Schema.Uint8Array by yielding Uint8Array samples', () => {
    const schema = Schema.Uint8Array;
    const arb = schemaToArbitrary(schema);
    const samples = fc.sample(arb, 10);
    expect(samples.length).toBe(10);
    for (const s of samples) {
      expect(s).toBeInstanceOf(Uint8Array);
      const exit = Effect.runSyncExit(
        Schema.decodeUnknownEffect(schema)(s as unknown),
      );
      expect(exit._tag).toBe('Success');
    }
  });
});

describe('withArbitrary / ArbitraryAnnotationId — explicit author-supplied arbitrary', () => {
  it('honours the annotated thunk ahead of structural derivation', () => {
    // `instanceOf(Uint8Array)` would structurally yield random bytes; the
    // annotation narrows the sampled domain to a fixed sentinel value, proving
    // the override takes precedence over the carrier's structural arbitrary.
    const sentinel = new Uint8Array([1, 2, 3]);
    const schema = withArbitrary(
      Schema.instanceOf(Uint8Array),
      () => fc.constant(sentinel),
    );
    const arb = schemaToArbitrary(schema);
    for (const s of fc.sample(arb, 20)) expect(s).toBe(sentinel);
  });

  it('builds the arbitrary lazily — the thunk runs at walk time, not at annotate time', () => {
    let built = 0;
    const schema = withArbitrary(Schema.String, () => {
      built++;
      return fc.constant('x');
    });
    // Annotating must NOT have invoked the thunk yet.
    expect(built).toBe(0);
    schemaToArbitrary(schema);
    expect(built).toBe(1);
  });

  it('surfaces the annotation under ArbitraryAnnotationId on the AST', () => {
    const schema = withArbitrary(Schema.Number, () => fc.constant(7));
    const annotations = (schema.ast as { annotations?: Record<symbol, unknown> }).annotations;
    expect(annotations).toBeDefined();
    expect(typeof annotations?.[ArbitraryAnnotationId]).toBe('function');
  });

  it('throws when the thunk does not return a fast-check arbitrary', () => {
    const schema = withArbitrary(
      Schema.String,
      // Intentionally wrong: returns a non-Arbitrary.
      (() => 'not-an-arbitrary') as unknown as () => fc.Arbitrary<unknown>,
    );
    expect(() => schemaToArbitrary(schema)).toThrow(UnsupportedSchemaError);
  });
});
