/**
 * Unit tests for `schemaToJsonSchema` — the PRODUCTION deriver that walks an
 * Effect Schema AST and produces the JSON-Schema object a command descriptor's
 * `inputSchema` / `outputSchema` carries. The keystone of the single-source-of-
 * truth migration (model I/O as ONE Effect Schema → derive BOTH the TS type and
 * the JSON-Schema, killing the hand-maintained-JSON-Schema-beside-the-type
 * drift).
 *
 * Four pillars:
 *  1. GOLDEN — known schemas → EXACT JSON-Schema objects. Pins the LAW
 *     (structure), not an implementation detail; golden values were taken from
 *     REAL deriver output then frozen (no invented values).
 *  2. CROSS-DERIVATION ORACLE — the high-value triangulation property:
 *     `validateStructural(schemaToJsonSchema(s), <value from schemaToArbitrary(s)>)`
 *     returns ZERO errors. Two INDEPENDENT derivations of the same schema (one
 *     to a JSON-Schema, one to a fast-check arbitrary) must agree: the schema
 *     ACCEPTS exactly what the arbitrary GENERATES. Deterministic seed → never
 *     flaky.
 *  3. TEETH — unsupported nodes throw `UnsupportedError`; a wrong/missing field
 *     is rejected by `validateStructural` against the derived schema.
 *  4. REPRODUCTION PROOF — model the real plumb + check command payloads as
 *     Effect Schemas, derive, and prove `validateStructural(derived, <the
 *     existing sample payload>) === []` — so the upcoming command migration
 *     swaps the hand-written schemas for derived ones with conformance intact.
 *
 * `schemaToArbitrary` is imported from the harness sub-path (it carries
 * fast-check); `schemaToJsonSchema` from the MAIN barrel (it must NOT). This
 * test is the only place the two meet — the oracle.
 */
import { describe, expect, it } from 'vitest';
import { Schema } from 'effect';
import * as fc from 'fast-check';
import { hasTag } from '@czap/error';
import { schemaToJsonSchema } from '@czap/core';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { validateStructural, type StructuralSchema } from '../support/structural-schema.js';

// ── 1. GOLDEN: known schema → EXACT derived JSON-Schema ──────────────────────
// Values frozen from real `schemaToJsonSchema` output. Each pins a LAW.
describe('schemaToJsonSchema — golden derivations (the structure LAW)', () => {
  it('scalars → type-only fragments; required lists every non-optional key in source order', () => {
    const schema = Schema.Struct({
      s: Schema.String,
      n: Schema.Number,
      b: Schema.Boolean,
    });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        s: { type: 'string' },
        n: { type: 'number' },
        b: { type: 'boolean' },
      },
      required: ['s', 'n', 'b'],
    });
  });

  it('a singleton Literal → { const } ; a Union of literals → { enum }', () => {
    const schema = Schema.Struct({
      tag: Schema.Literal('fixed'),
      status: Schema.Union([Schema.Literal('a'), Schema.Literal('b'), Schema.Literal('c')]),
    });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        tag: { const: 'fixed' },
        status: { enum: ['a', 'b', 'c'] },
      },
      required: ['tag', 'status'],
    });
  });

  it('Schema.Array(T) → { type:"array", items: <derived element> }', () => {
    const schema = Schema.Struct({
      xs: Schema.Array(Schema.String),
      pairs: Schema.Array(Schema.Struct({ k: Schema.Number })),
    });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        xs: { type: 'array', items: { type: 'string' } },
        pairs: {
          type: 'array',
          items: { type: 'object', properties: { k: { type: 'number' } }, required: ['k'] },
        },
      },
      required: ['xs', 'pairs'],
    });
  });

  it('Schema.optional(T) → field present in properties but EXCLUDED from required', () => {
    const schema = Schema.Struct({
      name: Schema.String,
      age: Schema.optional(Schema.Number),
    });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name'],
    });
  });

  it('an all-optional struct omits `required` entirely (matches hand-written outputSchemas)', () => {
    const schema = Schema.Struct({ a: Schema.optional(Schema.String) });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
    });
  });

  it('NullOr(T) → the member type widened to allow "null" (constraint never dropped)', () => {
    const schema = Schema.Struct({
      maybe: Schema.NullOr(Schema.String),
    });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: { maybe: { type: ['string', 'null'] } },
      required: ['maybe'],
    });
  });

  it('Schema.Unknown → {} (the empty schema; what Array(Unknown) payloads use)', () => {
    const schema = Schema.Struct({ findings: Schema.Array(Schema.Unknown) });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: { findings: { type: 'array', items: {} } },
      required: ['findings'],
    });
  });

  it('nested structs recurse to nested object fragments', () => {
    const schema = Schema.Struct({
      outer: Schema.Struct({ inner: Schema.Boolean }),
    });
    expect(schemaToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        outer: { type: 'object', properties: { inner: { type: 'boolean' } }, required: ['inner'] },
      },
      required: ['outer'],
    });
  });
});

// ── 2. CROSS-DERIVATION ORACLE (triangulation) ───────────────────────────────
// For a representative schema, the JSON-Schema derivation ACCEPTS exactly what
// the arbitrary derivation GENERATES. Two independent walks of the same AST must
// agree. Deterministic seed → not flaky.
describe('schemaToJsonSchema ⟂ schemaToArbitrary — the cross-derivation oracle', () => {
  /**
   * Build both derivations of `schema`, then assert every arbitrary sample is
   * accepted by the derived JSON-Schema with ZERO structural errors.
   *
   * The oracle compares over the JSON-SERIALIZED projection of each sample
   * (`JSON.parse(JSON.stringify(...))`), because a command's `outputSchema`
   * describes a JSON payload — the exact value that crosses the CLI receipt /
   * MCP `structuredContent` wire. This is faithful, not a workaround: the
   * arbitrary derivation admits a `Schema.optional(T)` field PRESENT with value
   * `undefined` (that IS in the schema's domain), but `undefined` is not a JSON
   * value — `JSON.stringify` drops such a key, which is precisely how the field
   * reaches a consumer. Comparing the JSON projection is comparing the two
   * derivations on the domain the JSON-Schema actually governs.
   */
  function expectAgreement<T>(schema: Schema.Schema<T>, numRuns = 200): void {
    const jsonSchema = schemaToJsonSchema(schema) as StructuralSchema;
    const arb = schemaToArbitrary(schema);
    fc.assert(
      fc.property(arb, (sample) => {
        const onWire: unknown = JSON.parse(JSON.stringify(sample));
        const errors = validateStructural(jsonSchema, onWire);
        return errors.length === 0;
      }),
      // Fixed seed → the same sequence every run; the oracle is a LAW, never a
      // dice roll. A failure is a real divergence, reproducible by seed.
      { numRuns, seed: 0x5eed, verbose: true },
    );
  }

  it('scalars + literals + literal-union', () => {
    expectAgreement(
      Schema.Struct({
        s: Schema.String,
        n: Schema.Number,
        b: Schema.Boolean,
        tag: Schema.Literal('only'),
        status: Schema.Union([Schema.Literal('open'), Schema.Literal('closed')]),
      }),
    );
  });

  it('arrays (scalar elements + struct elements)', () => {
    expectAgreement(
      Schema.Struct({
        names: Schema.Array(Schema.String),
        counts: Schema.Array(Schema.Number),
        rows: Schema.Array(Schema.Struct({ id: Schema.String, n: Schema.Number })),
      }),
    );
  });

  it('optional fields (present-or-absent both accepted)', () => {
    expectAgreement(
      Schema.Struct({
        required: Schema.String,
        maybe: Schema.optional(Schema.Number),
        maybeArr: Schema.optional(Schema.Array(Schema.Boolean)),
      }),
    );
  });

  it('nullable fields', () => {
    expectAgreement(
      Schema.Struct({
        maybeNull: Schema.NullOr(Schema.String),
        maybeNullNum: Schema.NullOr(Schema.Number),
      }),
    );
  });

  it('deeply nested structs + arrays of structs', () => {
    expectAgreement(
      Schema.Struct({
        meta: Schema.Struct({
          name: Schema.String,
          tags: Schema.Array(Schema.String),
          flags: Schema.Struct({ a: Schema.Boolean, b: Schema.optional(Schema.Boolean) }),
        }),
        items: Schema.Array(
          Schema.Struct({ kind: Schema.Union([Schema.Literal('x'), Schema.Literal('y')]), n: Schema.Number }),
        ),
      }),
    );
  });

  it('a command-payload-shaped schema (plumb) agrees end to end', () => {
    expectAgreement(
      Schema.Struct({
        ok: Schema.Boolean,
        skips: Schema.Array(Schema.Struct({ file: Schema.String, kind: Schema.String, message: Schema.String })),
        unclassified: Schema.Array(Schema.String),
        generatedPresent: Schema.Boolean,
      }),
    );
  });
});

// ── 3. TEETH ─────────────────────────────────────────────────────────────────
describe('schemaToJsonSchema — teeth (unsupported throws; derived schema rejects bad values)', () => {
  it('throws UnsupportedError when the top-level schema is NOT an object', () => {
    let caught: unknown;
    try {
      schemaToJsonSchema(Schema.String);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(hasTag(caught, 'UnsupportedError') && caught.subject).toBe('String');
  });

  it('throws UnsupportedError for a heterogeneous non-literal union (no anyOf/oneOf in the dialect)', () => {
    const schema = Schema.Struct({
      mixed: Schema.Union([Schema.String, Schema.Number]),
    });
    let caught: unknown;
    try {
      schemaToJsonSchema(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(hasTag(caught, 'UnsupportedError') && caught.subject).toBe('Union');
  });

  it('throws UnsupportedError for an index-signature (open record) struct', () => {
    const schema = Schema.Record(Schema.String, Schema.Number);
    let caught: unknown;
    try {
      schemaToJsonSchema(schema as unknown as Schema.Schema<unknown>);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
  });

  it('throws UnsupportedError for a bigint literal (no JSON-Schema representation)', () => {
    const schema = Schema.Struct({ big: Schema.Literal(10n) });
    let caught: unknown;
    try {
      schemaToJsonSchema(schema);
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(hasTag(caught, 'UnsupportedError') && caught.subject).toBe('Literal');
  });

  it('the derived schema REJECTS a missing required field and a wrong type', () => {
    const schema = Schema.Struct({
      assetId: Schema.String,
      markerCount: Schema.Number,
      cached: Schema.Boolean,
    });
    const derived = schemaToJsonSchema(schema) as StructuralSchema;
    // missing markerCount
    expect(validateStructural(derived, { assetId: 'x', cached: false }).length).toBeGreaterThan(0);
    // markerCount wrong type
    expect(validateStructural(derived, { assetId: 'x', markerCount: 'nope', cached: false }).length).toBeGreaterThan(0);
    // a fully-conforming value passes
    expect(validateStructural(derived, { assetId: 'x', markerCount: 3, cached: false })).toEqual([]);
  });

  it('the derived enum REJECTS a value outside the literal set', () => {
    const schema = Schema.Struct({
      projection: Schema.Union([Schema.Literal('beat'), Schema.Literal('amplitude')]),
    });
    const derived = schemaToJsonSchema(schema) as StructuralSchema;
    expect(validateStructural(derived, { projection: 'tempo' }).length).toBeGreaterThan(0);
    expect(validateStructural(derived, { projection: 'beat' })).toEqual([]);
  });
});

// ── 4. REPRODUCTION PROOF — real command payloads ────────────────────────────
// Model the existing plumb + check command payloads as Effect Schemas, derive,
// and prove the derived schema accepts the EXACT sample payloads the existing
// output-schema-law test asserts conformance for. This is the migration
// safety net: swapping the hand-written outputSchema for the derived one keeps
// conformance.
describe('schemaToJsonSchema — reproduction proof (real plumb/check payloads conform)', () => {
  // PlumbPayload (packages/command/src/commands/plumb.ts). `skips` is a
  // PlumbSkip[]; the structural validator does not inspect array elements, so a
  // faithful element schema is harmless and TIGHTER than the hand-written
  // `{ type:'array' }`.
  const PlumbPayloadSchema = Schema.Struct({
    ok: Schema.Boolean,
    skips: Schema.Array(Schema.Struct({ file: Schema.String, kind: Schema.String, message: Schema.String })),
    unclassified: Schema.Array(Schema.String),
    generatedPresent: Schema.Boolean,
    generatedCorpusMessage: Schema.NullOr(Schema.String),
  });

  // CheckPayload (packages/command/src/commands/check.ts). `findings` is a
  // Finding[]; modelled as Array(Unknown) → derives to { type:'array', items:{} },
  // equivalent to the hand-written { type:'array' }.
  const CheckPayloadSchema = Schema.Struct({
    ok: Schema.Boolean,
    blocked: Schema.Boolean,
    findingCount: Schema.Number,
    findings: Schema.Array(Schema.Unknown),
  });

  // The SAME sample payloads asserted in tests/unit/command/output-schema-law.test.ts.
  const plumbSample = {
    ok: false,
    skips: [{ file: 'tests/generated/x.test.ts', kind: 'it.skip', message: 'unwired' }],
    unclassified: ['@czap/mystery'],
    generatedPresent: true,
    generatedCorpusMessage: null,
  };
  const checkSample = {
    ok: false,
    blocked: true,
    findingCount: 1,
    findings: [
      {
        ruleId: 'gauntlet/no-bare-throw',
        severity: 'error',
        level: 'L3',
        title: 'bare throw',
        detail: 'throw a tagged @czap/error, not a bare value',
        location: { file: 'packages/x/src/y.ts', line: 12 },
      },
    ],
  };

  it('the derived plumb schema is type:object with the documented properties + required', () => {
    const derived = schemaToJsonSchema(PlumbPayloadSchema);
    expect(derived.type).toBe('object');
    expect(Object.keys(derived.properties).sort()).toEqual(
      ['generatedCorpusMessage', 'generatedPresent', 'ok', 'skips', 'unclassified'].sort(),
    );
    expect([...(derived.required ?? [])].sort()).toEqual(
      ['generatedCorpusMessage', 'generatedPresent', 'ok', 'skips', 'unclassified'].sort(),
    );
  });

  it('the derived plumb schema ACCEPTS the real plumb sample payload (zero errors)', () => {
    const derived = schemaToJsonSchema(PlumbPayloadSchema) as StructuralSchema;
    expect(validateStructural(derived, plumbSample)).toEqual([]);
  });

  it('the derived check schema ACCEPTS the real check sample payload (zero errors)', () => {
    const derived = schemaToJsonSchema(CheckPayloadSchema) as StructuralSchema;
    expect(validateStructural(derived, checkSample)).toEqual([]);
  });

  it('the derived schemas have teeth against the real payloads too (drop a required field → error)', () => {
    const derivedPlumb = schemaToJsonSchema(PlumbPayloadSchema) as StructuralSchema;
    const { ok: _dropped, ...withoutOk } = plumbSample;
    void _dropped;
    expect(validateStructural(derivedPlumb, withoutOk).length).toBeGreaterThan(0);
  });

  it('cross-check: the derived plumb schema also accepts what the plumb ARBITRARY generates', () => {
    const derived = schemaToJsonSchema(PlumbPayloadSchema) as StructuralSchema;
    const arb = schemaToArbitrary(PlumbPayloadSchema);
    fc.assert(
      fc.property(arb, (sample) => validateStructural(derived, sample).length === 0),
      { numRuns: 100, seed: 0x1, verbose: true },
    );
  });

  it('the decoded TS type and the JSON-Schema come from ONE source (round-trip: a decoded value conforms)', () => {
    // The migration claim: Schema.Type and outputSchema derive from the SAME
    // schema. Decode a value through the schema, then validate it against the
    // derived JSON-Schema — both views agree on the same value.
    const derived = schemaToJsonSchema(PlumbPayloadSchema) as StructuralSchema;
    const decoded = Schema.decodeUnknownSync(PlumbPayloadSchema)(plumbSample);
    expect(validateStructural(derived, decoded)).toEqual([]);
  });
});
