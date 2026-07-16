/**
 * Schema-kernel decode laws — strict AND lenient, per constructor.
 *
 * Strict decode is FAIL-CLOSED: it returns a path-tagged issue list, never
 * throws on bad input, never mutates a prototype. Lenient decode is
 * COERCE-OR-NULL/PRUNE (the kv-cache policy): a malformed required leaf collapses
 * its container to `null`; a malformed record/array leaf is pruned; a poison key
 * is dropped. Both paths are prototype-poison-safe. These tests pin the issue
 * shapes, the prune/null policy, the brand-ValidationError fold, the hole block,
 * and determinism — the L4 fail-closed / never-crash / never-pollute contract.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@czap/error';
import { S } from '../../../../packages/core/src/schema/constructors.js';
import { decode, decodeLenient, parseErrorFromIssues } from '../../../../packages/core/src/schema/decode.js';
import type { DecodeIssue, DecodeResult } from '../../../../packages/core/src/schema/decode.js';
import { ContentAddress } from '../../../../packages/core/src/brands.js';

function issuesOf(result: DecodeResult<unknown>): readonly DecodeIssue[] {
  if (result.ok) throw new Error('expected a failed decode');
  return result.error;
}
function valueOf<A>(result: DecodeResult<A>): A {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe('strict decode — scalars', () => {
  it('accepts matching primitives and reports the value verbatim', () => {
    expect(valueOf(decode(S.string, 'hi'))).toBe('hi');
    expect(valueOf(decode(S.number, 42))).toBe(42);
    expect(valueOf(decode(S.boolean, false))).toBe(false);
    // NaN is a number: S.number accepts it (finiteness is a brand concern).
    expect(Number.isNaN(valueOf<number>(decode(S.number, Number.NaN)))).toBe(true);
  });

  it('rejects a type mismatch with a schema/type issue at the root path', () => {
    const issues = issuesOf(decode(S.number, 'not-a-number'));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('schema/type');
    expect(issues[0]?.path).toEqual([]);
  });

  it('pins a literal by identity', () => {
    expect(valueOf(decode(S.literal('go'), 'go'))).toBe('go');
    const issues = issuesOf(decode(S.literal('go'), 'stop'));
    expect(issues[0]?.code).toBe('schema/literal');
  });

  it('unknown and any accept anything', () => {
    const wild = { a: [1, null, 'x'] };
    expect(valueOf(decode(S.unknown, wild))).toBe(wild);
    expect(valueOf(decode(S.any, wild))).toBe(wild);
    expect(valueOf(decode(S.unknown, undefined))).toBe(undefined);
  });
});

describe('strict decode — union', () => {
  const u = S.union(S.literal('a'), S.literal('b'), S.number);

  it('accepts the first matching member', () => {
    expect(valueOf(decode(u, 'b'))).toBe('b');
    expect(valueOf(decode(u, 7))).toBe(7);
  });

  it('emits one schema/union issue when no member matches', () => {
    const issues = issuesOf(decode(u, 'c'));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('schema/union');
    expect(issues[0]?.path).toEqual([]);
  });
});

describe('strict decode — struct', () => {
  const point = S.struct({ x: S.number, y: S.number, label: S.optional(S.string) });

  it('decodes required fields and omits an absent optional', () => {
    expect(valueOf(decode(point, { x: 1, y: 2 }))).toEqual({ x: 1, y: 2 });
    expect(valueOf(decode(point, { x: 1, y: 2, label: 'p' }))).toEqual({ x: 1, y: 2, label: 'p' });
  });

  it('reports a missing required field as schema/missing at the field path', () => {
    const issues = issuesOf(decode(point, { x: 1 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('schema/missing');
    expect(issues[0]?.path).toEqual(['y']);
  });

  it('accumulates every field issue in schema order', () => {
    const issues = issuesOf(decode(point, { x: 'no', y: false }));
    expect(issues.map((i) => i.path)).toEqual([['x'], ['y']]);
    expect(issues.every((i) => i.code === 'schema/type')).toBe(true);
  });

  it('nests the path through composed structs', () => {
    const outer = S.struct({ inner: point });
    const issues = issuesOf(decode(outer, { inner: { x: 1, y: 'bad' } }));
    expect(issues[0]?.path).toEqual(['inner', 'y']);
  });

  it('reads OWN data properties only — an inherited field counts as missing', () => {
    const proto = { x: 1, y: 2 };
    const obj = Object.create(proto) as Record<string, unknown>;
    const issues = issuesOf(decode(point, obj));
    expect(issues.map((i) => i.code)).toEqual(['schema/missing', 'schema/missing']);
  });

  it('rejects a non-object with a root schema/type issue', () => {
    const issues = issuesOf(decode(point, 42));
    expect(issues[0]?.code).toBe('schema/type');
    expect(issues[0]?.path).toEqual([]);
  });
});

describe('strict decode — array & record', () => {
  it('array: prunes nothing, reports the failing index', () => {
    expect(valueOf(decode(S.array(S.number), [1, 2, 3]))).toEqual([1, 2, 3]);
    const issues = issuesOf(decode(S.array(S.number), [1, 'x', 3]));
    expect(issues[0]?.path).toEqual([1]);
    expect(issues[0]?.code).toBe('schema/type');
  });

  it('array: a non-array is a root schema/type issue', () => {
    expect(issuesOf(decode(S.array(S.number), { length: 0 }))[0]?.code).toBe('schema/type');
  });

  it('record: decodes string-keyed values', () => {
    expect(valueOf(decode(S.record(S.number), { a: 1, b: 2 }))).toEqual({ a: 1, b: 2 });
  });
});

describe('strict decode — brand', () => {
  const addr = S.brand(S.string, ContentAddress);

  it('runs the smart constructor and returns the branded value', () => {
    expect(valueOf(decode(addr, 'fnv1a:0a1b2c3d'))).toBe('fnv1a:0a1b2c3d');
  });

  it('folds a thrown ValidationError into a schema/brand issue carrying the cause', () => {
    const issues = issuesOf(decode(addr, 'not-a-digest'));
    expect(issues[0]?.code).toBe('schema/brand');
    expect(hasTag(issues[0]?.cause, 'ValidationError')).toBe(true);
  });

  it('propagates a base-type issue before the refinement runs', () => {
    const issues = issuesOf(decode(addr, 123));
    expect(issues[0]?.code).toBe('schema/type');
  });
});

describe('strict decode — bytes', () => {
  const bytes = S.bytes(Uint8Array);

  it('accepts an instance of the carrier', () => {
    const b = new Uint8Array([1, 2, 3]);
    expect(valueOf(decode(bytes, b))).toBe(b);
  });

  it('rejects a non-instance with schema/type', () => {
    expect(issuesOf(decode(bytes, [1, 2, 3]))[0]?.code).toBe('schema/type');
  });
});

describe('strict decode — hole always blocks', () => {
  const withHole = S.struct({ ready: S.boolean, todo: S.hole<{ shape: string }>('todo') });

  it('emits a blocking schema/hole issue and never passes data', () => {
    const issues = issuesOf(decode(withHole, { ready: true, todo: { shape: 'x' } }));
    expect(issues.some((i) => i.code === 'schema/hole' && i.path[0] === 'todo')).toBe(true);
  });
});

describe('prototype-poison safety', () => {
  it('strict record: a __proto__ key is a schema/poison-key issue, prototype untouched', () => {
    const poisoned = JSON.parse('{"__proto__": {"polluted": true}, "a": 5}') as unknown;
    const issues = issuesOf(decode(S.record(S.number), poisoned));
    expect(issues.some((i) => i.code === 'schema/poison-key' && i.path[0] === '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strict record: constructor and prototype keys are poison too', () => {
    const codes = (s: string): readonly string[] =>
      issuesOf(decode(S.record(S.number), JSON.parse(s) as unknown)).map((i) => i.code);
    expect(codes('{"constructor": 1}')).toContain('schema/poison-key');
    expect(codes('{"prototype": 1}')).toContain('schema/poison-key');
  });

  it('lenient record: poison keys are pruned, real leaves survive, no pollution', () => {
    const poisoned = JSON.parse('{"__proto__": {"polluted": true}, "a": 5, "b": "drop"}') as unknown;
    const out = decodeLenient(S.record(S.number), poisoned);
    expect(out).toEqual({ a: 5 });
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('lenient decode — coerce-or-null / prune', () => {
  it('scalars: value-or-null, never throwing', () => {
    expect(decodeLenient(S.string, 'ok')).toBe('ok');
    expect(decodeLenient(S.string, 5)).toBeNull();
    expect(decodeLenient(S.number, 'x')).toBeNull();
  });

  it('struct: a malformed required leaf collapses the struct to null', () => {
    const point = S.struct({ x: S.number, y: S.number });
    expect(decodeLenient(point, { x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
    expect(decodeLenient(point, { x: 1, y: 'bad' })).toBeNull();
    expect(decodeLenient(point, { x: 1 })).toBeNull();
  });

  it('struct: a malformed optional leaf is omitted, not fatal', () => {
    const s = S.struct({ x: S.number, note: S.optional(S.string) });
    expect(decodeLenient(s, { x: 1, note: 99 })).toEqual({ x: 1 });
    expect(decodeLenient(s, { x: 1, note: 'k' })).toEqual({ x: 1, note: 'k' });
  });

  it('array: malformed items are pruned', () => {
    expect(decodeLenient(S.array(S.number), [1, 'x', 3, null])).toEqual([1, 3]);
    expect(decodeLenient(S.array(S.number), 'not-array')).toBeNull();
  });

  it('record: malformed leaves are pruned to a plain object', () => {
    expect(decodeLenient(S.record(S.number), { a: 1, b: 'x', c: 3 })).toEqual({ a: 1, c: 3 });
  });

  it('brand: an invalid value coerces to null', () => {
    const addr = S.brand(S.string, ContentAddress);
    expect(decodeLenient(addr, 'fnv1a:0a1b2c3d')).toBe('fnv1a:0a1b2c3d');
    expect(decodeLenient(addr, 'nope')).toBeNull();
  });

  it('hole never passes data, even leniently', () => {
    expect(decodeLenient(S.hole('todo'), { anything: 1 })).toBeNull();
  });

  it('unknown leniently keeps a genuine null leaf inside a record', () => {
    expect(decodeLenient(S.record(S.unknown), { a: null, b: 1 })).toEqual({ a: null, b: 1 });
  });
});

describe('determinism', () => {
  it('produces byte-identical issues across repeated strict decodes', () => {
    const schema = S.struct({ a: S.number, b: S.array(S.string) });
    const input = { a: 'bad', b: [1, 'ok'] };
    const first = issuesOf(decode(schema, input));
    const second = issuesOf(decode(schema, input));
    expect(second).toEqual(first);
  });

  it('round-trips generated valid struct values (seeded)', () => {
    const schema = S.struct({ a: S.string, b: S.optional(S.number), tags: S.array(S.string) });
    const arb = fc.record(
      { a: fc.string(), b: fc.option(fc.integer(), { nil: undefined }), tags: fc.array(fc.string()) },
      { requiredKeys: ['a', 'tags'] },
    );
    fc.assert(
      fc.property(arb, (sample) => {
        const withoutUndefined = sample.b === undefined ? { a: sample.a, tags: sample.tags } : sample;
        const result = decode(schema, withoutUndefined);
        expect(result.ok).toBe(true);
        expect(valueOf(result)).toEqual(withoutUndefined);
      }),
      { seed: 42, numRuns: 100 },
    );
  });
});

describe('parseErrorFromIssues', () => {
  it('folds an issue list into a tagged ParseError carrying the first code', () => {
    const issues = issuesOf(decode(S.struct({ a: S.number }), { a: 'x' }));
    const error = parseErrorFromIssues(issues, 'MyContract');
    expect(hasTag(error, 'ParseError')).toBe(true);
    expect(error.code).toBe('schema/type');
    expect(error.source).toBe('MyContract');
  });
});
