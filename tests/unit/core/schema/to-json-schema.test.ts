/**
 * Unit tests for the KERNEL `toJsonSchema` deriver — walks a frozen plain-data
 * {@link SchemaNode} value into the `CommandJsonSchema` / `validateStructural`
 * dialect.
 *
 * Pillars (mirroring the Effect deriver's law suite so the swap is byte-safe):
 *  1. GOLDEN — known `S.*` schema → EXACT JSON-Schema objects (the structure LAW).
 *  2. TEETH — unsupported nodes throw a tagged `UnsupportedError`; a derived
 *     schema REJECTS a missing/wrong value under `validateStructural`.
 *  3. REPRODUCTION — real command-payload-shaped structs derive to objects that
 *     accept the existing sample payloads (the migration safety net).
 *
 * Schemas are built with the real kernel `S.*` constructors. The cross-derivation
 * oracle (deriver ⟂ arbitrary) is deferred until the kernel arbitrary deriver
 * (harness/arbitrary-from-schema rewrite) lands.
 */
import { describe, expect, it } from 'vitest';
import { hasTag } from '@liteship/error';
import type { UnsupportedError } from '@liteship/error';
import { schema } from '../../../../packages/core/src/schema/constructors.js';
import { toJsonSchema } from '../../../../packages/core/src/schema/to-json-schema.js';
import { validateStructural } from '../../../support/structural-schema.js';

// The `subject` a thrown UnsupportedError names (the offending node kind). The
// generic `hasTag` narrows only to the tagged-error contract, so read the
// variant field through its exported interface.
const subjectOf = (err: unknown): string | undefined =>
  hasTag(err, 'UnsupportedError') ? (err as UnsupportedError).subject : undefined;

// ── 1. GOLDEN ────────────────────────────────────────────────────────────────
describe('toJsonSchema — golden derivations (the structure LAW)', () => {
  it('scalars → type-only fragments; required lists every non-optional key in source order', () => {
    expect(toJsonSchema(schema.struct({ s: schema.string, n: schema.number, b: schema.boolean }))).toEqual({
      type: 'object',
      properties: { s: { type: 'string' }, n: { type: 'number' }, b: { type: 'boolean' } },
      required: ['s', 'n', 'b'],
    });
  });

  it('a singleton literal → { const }; a union of literals → { enum }', () => {
    expect(
      toJsonSchema(schema.struct({ tag: schema.literal('fixed'), status: schema.union(schema.literal('a'), schema.literal('b'), schema.literal('c')) })),
    ).toEqual({
      type: 'object',
      properties: { tag: { const: 'fixed' }, status: { enum: ['a', 'b', 'c'] } },
      required: ['tag', 'status'],
    });
  });

  it('array(T) → { type:"array", items: <derived element> }', () => {
    expect(toJsonSchema(schema.struct({ xs: schema.array(schema.string), pairs: schema.array(schema.struct({ k: schema.number })) }))).toEqual({
      type: 'object',
      properties: {
        xs: { type: 'array', items: { type: 'string' } },
        pairs: { type: 'array', items: { type: 'object', properties: { k: { type: 'number' } }, required: ['k'] } },
      },
      required: ['xs', 'pairs'],
    });
  });

  it('an optional field is present in properties but EXCLUDED from required', () => {
    expect(toJsonSchema(schema.struct({ name: schema.string, age: schema.optional(schema.number) }))).toEqual({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name'],
    });
  });

  it('an all-optional struct omits `required` entirely', () => {
    expect(toJsonSchema(schema.struct({ a: schema.optional(schema.string) }))).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
    });
  });

  it('nullable (T | null) → the member type widened to allow "null" (constraint never dropped)', () => {
    expect(toJsonSchema(schema.struct({ maybe: schema.union(schema.string, schema.literal(null)) }))).toEqual({
      type: 'object',
      properties: { maybe: { type: ['string', 'null'] } },
      required: ['maybe'],
    });
  });

  it('a literal-union that INCLUDES null keeps null in the enum set', () => {
    expect(toJsonSchema(schema.struct({ x: schema.union(schema.literal('a'), schema.literal(null)) }))).toEqual({
      type: 'object',
      properties: { x: { enum: ['a', null] } },
      required: ['x'],
    });
  });

  it('unknown/any → {} (the empty schema); array(unknown) → { type:"array", items:{} }', () => {
    expect(toJsonSchema(schema.struct({ u: schema.unknown, a: schema.any, xs: schema.array(schema.unknown) }))).toEqual({
      type: 'object',
      properties: { u: {}, a: {}, xs: { type: 'array', items: {} } },
      required: ['u', 'a', 'xs'],
    });
  });

  it('a brand derives its BASE shape (the refinement has no JSON-Schema image beyond base)', () => {
    const sch = schema.struct({
      age: schema.brand(schema.number, (n) => n, 'Age'),
      id: schema.brand(schema.string, (s) => s, 'Id'),
    });
    expect(toJsonSchema(sch)).toEqual({
      type: 'object',
      properties: { age: { type: 'number' }, id: { type: 'string' } },
      required: ['age', 'id'],
    });
  });

  it('a TOP-LEVEL brand is followed to its base struct', () => {
    expect(toJsonSchema(schema.brand(schema.struct({ inner: schema.boolean }), (x) => x, 'Wrapped'))).toEqual({
      type: 'object',
      properties: { inner: { type: 'boolean' } },
      required: ['inner'],
    });
  });

  it('nested structs recurse to nested object fragments', () => {
    expect(toJsonSchema(schema.struct({ outer: schema.struct({ inner: schema.boolean }) }))).toEqual({
      type: 'object',
      properties: { outer: { type: 'object', properties: { inner: { type: 'boolean' } }, required: ['inner'] } },
      required: ['outer'],
    });
  });
});

// ── 2. TEETH ─────────────────────────────────────────────────────────────────
describe('toJsonSchema — teeth (unsupported throws; derived schema rejects bad values)', () => {
  const catchOf = (fn: () => unknown): unknown => {
    try {
      fn();
    } catch (err) {
      return err;
    }
    return undefined;
  };

  it('throws UnsupportedError when the top-level schema is NOT an object', () => {
    const caught = catchOf(() => toJsonSchema(schema.string));
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(subjectOf(caught)).toBe('string');
  });

  it('throws UnsupportedError for a heterogeneous non-literal union (no anyOf/oneOf in the dialect)', () => {
    const caught = catchOf(() => toJsonSchema(schema.struct({ mixed: schema.union(schema.string, schema.number) })));
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(subjectOf(caught)).toBe('union');
  });

  it('throws UnsupportedError for an open record (index signature — no additionalProperties)', () => {
    const caught = catchOf(() => toJsonSchema(schema.struct({ m: schema.record(schema.number) })));
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(subjectOf(caught)).toBe('record');
  });

  it('throws UnsupportedError for a bytes declaration node (opaque foreign carrier)', () => {
    const caught = catchOf(() => toJsonSchema(schema.struct({ blob: schema.bytes(Uint8Array) })));
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(subjectOf(caught)).toBe('bytes');
  });

  it('throws UnsupportedError for a hole node (decode-blocking, never emitted)', () => {
    const caught = catchOf(() => toJsonSchema(schema.struct({ todo: schema.hole('Pending') })));
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(subjectOf(caught)).toBe('hole');
  });

  it('throws UnsupportedError for a tuple node (no prefixItems/items:false/minItems in the dialect)', () => {
    const caught = catchOf(() => toJsonSchema(schema.struct({ edge: schema.tuple(schema.number, schema.number) })));
    expect(hasTag(caught, 'UnsupportedError')).toBe(true);
    expect(subjectOf(caught)).toBe('tuple');
  });

  it('the derived schema REJECTS a missing required field and a wrong type', () => {
    const derived = toJsonSchema(schema.struct({ assetId: schema.string, markerCount: schema.number, cached: schema.boolean }));
    expect(validateStructural(derived, { assetId: 'x', cached: false }).length).toBeGreaterThan(0);
    expect(validateStructural(derived, { assetId: 'x', markerCount: 'nope', cached: false }).length).toBeGreaterThan(0);
    expect(validateStructural(derived, { assetId: 'x', markerCount: 3, cached: false })).toEqual([]);
  });

  it('the derived enum REJECTS a value outside the literal set', () => {
    const derived = toJsonSchema(schema.struct({ projection: schema.union(schema.literal('beat'), schema.literal('amplitude')) }));
    expect(validateStructural(derived, { projection: 'tempo' }).length).toBeGreaterThan(0);
    expect(validateStructural(derived, { projection: 'beat' })).toEqual([]);
  });
});

// ── 3. REPRODUCTION — real command-payload shapes ────────────────────────────
describe('toJsonSchema — reproduction proof (real plumb/check payloads conform)', () => {
  // PlumbPayload (packages/command/src/commands/plumb.ts).
  const plumbSchema = schema.struct({
    ok: schema.boolean,
    skips: schema.array(schema.struct({ file: schema.string, kind: schema.string, message: schema.string })),
    unclassified: schema.array(schema.string),
    generatedPresent: schema.boolean,
    generatedCorpusMessage: schema.union(schema.string, schema.literal(null)),
  });
  // CheckPayload (packages/command/src/commands/check.ts) — findings: Array(Unknown).
  const checkSchema = schema.struct({
    ok: schema.boolean,
    blocked: schema.boolean,
    findingCount: schema.number,
    findings: schema.array(schema.unknown),
  });

  const plumbSample = {
    ok: false,
    skips: [{ file: 'tests/generated/x.test.ts', kind: 'it.skip', message: 'unwired' }],
    unclassified: ['@liteship/mystery'],
    generatedPresent: true,
    generatedCorpusMessage: null,
  };
  const checkSample = {
    ok: false,
    blocked: true,
    findingCount: 1,
    findings: [{ ruleId: 'gauntlet/no-bare-throw', severity: 'error' }],
  };

  it('the derived plumb schema is type:object with the documented properties + required', () => {
    const derived = toJsonSchema(plumbSchema);
    expect(derived.type).toBe('object');
    expect(Object.keys(derived.properties).sort()).toEqual(
      ['generatedCorpusMessage', 'generatedPresent', 'ok', 'skips', 'unclassified'].sort(),
    );
    expect([...(derived.required ?? [])].sort()).toEqual(
      ['generatedCorpusMessage', 'generatedPresent', 'ok', 'skips', 'unclassified'].sort(),
    );
  });

  it('the derived plumb schema ACCEPTS the real plumb sample payload (zero errors)', () => {
    expect(validateStructural(toJsonSchema(plumbSchema), plumbSample)).toEqual([]);
  });

  it('the derived check schema ACCEPTS the real check sample payload (zero errors)', () => {
    expect(validateStructural(toJsonSchema(checkSchema), checkSample)).toEqual([]);
  });

  it('teeth against the real payload: dropping a required field is rejected', () => {
    const derived = toJsonSchema(plumbSchema);
    const { ok: _dropped, ...withoutOk } = plumbSample;
    void _dropped;
    expect(validateStructural(derived, withoutOk).length).toBeGreaterThan(0);
  });
});
