/**
 * Unit tests for the `~standard` (Standard Schema V1) bridge over kernel schemas.
 *
 * Two surfaces:
 *  1. `standardResultOf` — the pure mapping from a kernel decode result to a
 *     Standard Schema validate result: success → `{ value }`; failure →
 *     `{ issues }` with each decode path lowered to Standard `PathSegment`s and
 *     the issue `code` surfaced as the message.
 *  2. `toStandardSchema` — the bridge object: `~standard` carries `version:1`,
 *     `vendor:'liteship'`, a `validate` that runs the injected decoder + lowers
 *     its result. JSON hooks appear only with explicit encoded-input and
 *     decoded-output schema evidence.
 *
 * The decoder is passed in (the kernel `decode` lands in a sibling slice), so the
 * bridge is exercised with a deterministic stub decoder — no clock, no ambient
 * state.
 */
import { describe, expect, it } from 'vitest';
import {
  toStandardSchema,
  standardResultOf,
  VENDOR,
  type KernelDecodeResult,
} from '../../../../packages/core/src/schema/standard.js';
import { toJsonSchema } from '../../../../packages/core/src/schema/to-json-schema.js';
import { schema } from '../../../../packages/core/src/schema/constructors.js';
import type { Infer } from '../../../../packages/core/src/schema/infer.js';

const nameAge = schema.struct({ name: schema.string, age: schema.number });
type NameAge = Infer<typeof nameAge>;

// A deterministic stub decoder mirroring `decode`'s (schema, value) → Result
// shape: it accepts a well-shaped object, else fails closed with a path-tagged
// issue (code + path only — the subset the bridge reads).
const decodeNameAge = (_schema: typeof nameAge, value: unknown): KernelDecodeResult<NameAge> => {
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.name === 'string' && typeof v.age === 'number') {
      return { ok: true, value: { name: v.name, age: v.age } };
    }
    return { ok: false, error: [{ code: 'schema/type', path: ['name'] }] };
  }
  return { ok: false, error: [{ code: 'schema/type', path: [] }] };
};

// ── 1. standardResultOf — the pure mapping ───────────────────────────────────
describe('standardResultOf — kernel decode result → Standard validate result', () => {
  it('a success carries { value } and NO issues', () => {
    const mapped = standardResultOf<NameAge>({ ok: true, value: { name: 'a', age: 1 } });
    expect(mapped).toEqual({ value: { name: 'a', age: 1 } });
    expect(mapped.issues).toBeUndefined();
  });

  it('a failure lowers each decode path to { key } segments and surfaces the code as the message', () => {
    const mapped = standardResultOf<NameAge>({
      ok: false,
      error: [{ code: 'schema/type', path: ['skips', 0, 'file'] }],
    });
    expect(mapped.issues).toEqual([{ message: 'schema/type', path: [{ key: 'skips' }, { key: 0 }, { key: 'file' }] }]);
  });

  it('a root-level failure lowers to an empty path segment list', () => {
    const mapped = standardResultOf<NameAge>({ ok: false, error: [{ code: 'schema/missing', path: [] }] });
    expect(mapped.issues).toEqual([{ message: 'schema/missing', path: [] }]);
  });

  it('multiple issues are preserved in order', () => {
    const mapped = standardResultOf<NameAge>({
      ok: false,
      error: [
        { code: 'schema/type', path: ['a'] },
        { code: 'schema/missing', path: ['b', 'c'] },
      ],
    });
    expect(mapped.issues).toEqual([
      { message: 'schema/type', path: [{ key: 'a' }] },
      { message: 'schema/missing', path: [{ key: 'b' }, { key: 'c' }] },
    ]);
  });
});

// ── 2. toStandardSchema — the bridge object ──────────────────────────────────
describe('toStandardSchema — the ~standard bridge', () => {
  it('exposes ~standard with version:1 and vendor "liteship"', () => {
    const bridged = toStandardSchema(nameAge, decodeNameAge);
    expect(bridged['~standard'].version).toBe(1);
    expect(bridged['~standard'].vendor).toBe(VENDOR);
    expect(bridged['~standard'].vendor).toBe('liteship');
  });

  it('validate returns { value } (synchronously) for a conforming input', () => {
    const bridged = toStandardSchema(nameAge, decodeNameAge);
    const result = bridged['~standard'].validate({ name: 'x', age: 7 });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual({ value: { name: 'x', age: 7 } });
  });

  it('validate returns { issues } with path segments for a non-conforming input', () => {
    const bridged = toStandardSchema(nameAge, decodeNameAge);
    const result = bridged['~standard'].validate({ name: 42, age: 7 });
    expect(result).toEqual({ issues: [{ message: 'schema/type', path: [{ key: 'name' }] }] });
  });

  it('validate never throws on hostile input — it fails closed through the decoder', () => {
    const bridged = toStandardSchema(nameAge, decodeNameAge);
    const result = bridged['~standard'].validate(null);
    expect(result).toEqual({ issues: [{ message: 'schema/type', path: [] }] });
  });

  it('jsonSchema.input/output derive the same JSON-Schema the kernel deriver produces', () => {
    const bridged = toStandardSchema(nameAge, decodeNameAge, { input: nameAge, output: nameAge });
    const expected = toJsonSchema(nameAge);
    expect(bridged['~standard'].jsonSchema.input({ target: 'draft-2020-12' })).toEqual(expected);
    expect(bridged['~standard'].jsonSchema.output({ target: 'draft-2020-12' })).toEqual(expected);
    expect(bridged['~standard'].jsonSchema.input({ target: 'draft-07' })).toEqual({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name', 'age'],
    });
  });

  it('does not advertise JSON hooks without separate projection evidence', () => {
    const bridged = toStandardSchema(nameAge, decodeNameAge);
    expect(typeof bridged['~standard'].validate).toBe('function');
    expect('jsonSchema' in bridged['~standard']).toBe(false);
  });

  it('keeps encoded input and representation-changing decoded output distinct', () => {
    const encoded = schema.struct({ value: schema.string });
    const decoded = schema.struct({ value: schema.number });
    const changing = schema.brand(encoded, (value) => ({ value: value.value.length }), 'string-length');
    const bridged = toStandardSchema(
      changing,
      (_schema, value) =>
        typeof value === 'object' && value !== null && typeof (value as { value?: unknown }).value === 'string'
          ? { ok: true, value: { value: (value as { value: string }).value.length } }
          : { ok: false, error: [{ code: 'schema/type', path: ['value'] }] },
      { input: encoded, output: decoded },
    );
    expect(bridged['~standard'].jsonSchema.input({ target: 'draft-2020-12' })).toEqual(toJsonSchema(encoded));
    expect(bridged['~standard'].jsonSchema.output({ target: 'draft-2020-12' })).toEqual(toJsonSchema(decoded));
  });

  it('a non-derivable schema remains a valid validator and cannot advertise a delayed throwing hook', () => {
    const union = schema.union(schema.string, schema.number);
    const bridged = toStandardSchema(union, (_schema, value) =>
      typeof value === 'string' || typeof value === 'number'
        ? { ok: true, value }
        : { ok: false, error: [{ code: 'schema/type', path: [] }] },
    );
    expect('jsonSchema' in bridged['~standard']).toBe(false);
    expect(() => toStandardSchema(union, () => ({ ok: true, value: '' }), { input: union, output: union })).toThrow(
      /cannot be derived/u,
    );
  });
});
