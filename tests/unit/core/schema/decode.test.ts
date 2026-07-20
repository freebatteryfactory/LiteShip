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
import { hasTag } from '@liteship/error';
import { schema } from '../../../../packages/core/src/schema/constructors.js';
import { decode, decodeLenient, parseErrorFromIssues } from '../../../../packages/core/src/schema/decode.js';
import type { DecodeIssue, DecodeResult } from '../../../../packages/core/src/schema/decode.js';
import { ContentAddress } from '../../../../packages/core/src/schema/brands.js';

function issuesOf(result: DecodeResult<unknown>): readonly DecodeIssue[] {
  if (result.ok) throw new Error('expected a failed decode');
  return result.error;
}
function valueOf<A>(result: DecodeResult<A>): A {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe('literal construction — non-finite numbers rejected', () => {
  it('schema.literal(NaN) throws at construction (=== matching can never decode NaN)', () => {
    expect(() => schema.literal(NaN)).toThrow(/finite/);
  });
  it('schema.literal(±Infinity) throws (they serialize to null in the generated JSON Schema)', () => {
    expect(() => schema.literal(Infinity)).toThrow(/finite/);
    expect(() => schema.literal(-Infinity)).toThrow(/finite/);
  });
  it('a finite numeric literal still constructs and decodes', () => {
    const sch = schema.literal(42);
    expect(valueOf(decode(sch, 42))).toBe(42);
    expect(issuesOf(decode(sch, 43)).length).toBeGreaterThan(0);
  });
});

describe('strict decode — scalars', () => {
  it('accepts matching primitives and reports the value verbatim', () => {
    expect(valueOf(decode(schema.string, 'hi'))).toBe('hi');
    expect(valueOf(decode(schema.number, 42))).toBe(42);
    expect(valueOf(decode(schema.boolean, false))).toBe(false);
    // NaN is a number: schema.number accepts it (finiteness is a brand concern).
    expect(Number.isNaN(valueOf<number>(decode(schema.number, Number.NaN)))).toBe(true);
  });

  it('rejects a type mismatch with a schema/type issue at the root path', () => {
    const issues = issuesOf(decode(schema.number, 'not-a-number'));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('schema/type');
    expect(issues[0]?.path).toEqual([]);
  });

  it('pins a literal by identity', () => {
    expect(valueOf(decode(schema.literal('go'), 'go'))).toBe('go');
    const issues = issuesOf(decode(schema.literal('go'), 'stop'));
    expect(issues[0]?.code).toBe('schema/literal');
  });

  it('unknown and any accept anything', () => {
    const wild = { a: [1, null, 'x'] };
    expect(valueOf(decode(schema.unknown, wild))).toBe(wild);
    expect(valueOf(decode(schema.any, wild))).toBe(wild);
    expect(valueOf(decode(schema.unknown, undefined))).toBe(undefined);
  });
});

describe('strict decode — union', () => {
  const u = schema.union(schema.literal('a'), schema.literal('b'), schema.number);

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
  const point = schema.struct({ x: schema.number, y: schema.number, label: schema.optional(schema.string) });

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
    const outer = schema.struct({ inner: point });
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
    expect(valueOf(decode(schema.array(schema.number), [1, 2, 3]))).toEqual([1, 2, 3]);
    const issues = issuesOf(decode(schema.array(schema.number), [1, 'x', 3]));
    expect(issues[0]?.path).toEqual([1]);
    expect(issues[0]?.code).toBe('schema/type');
  });

  it('array: a non-array is a root schema/type issue', () => {
    expect(issuesOf(decode(schema.array(schema.number), { length: 0 }))[0]?.code).toBe('schema/type');
  });

  it('array/tuple: NEVER invokes an element getter — own-data read, not input[i] (round-11)', () => {
    // An untrusted array whose index is an ACCESSOR: a direct `input[i]` would invoke the getter,
    // violating the never-throw / never-invoke-getters contract (a side-effecting or throwing
    // getter would run during validation). The own-data-descriptor read treats the accessor slot
    // as absent (undefined), so decode reports a clean issue and never touches the getter.
    let invoked = 0;
    const evil: unknown[] = [1];
    Object.defineProperty(evil, 1, {
      enumerable: true,
      configurable: true,
      get() {
        invoked++;
        throw new Error('element getter must not run during decode');
      },
    });
    // strict array: slot 1 reads `undefined` → a clean per-element type issue, never a throw.
    expect(() => decode(schema.array(schema.number), evil)).not.toThrow();
    expect(decode(schema.array(schema.number), evil).ok).toBe(false);
    // lenient array: the accessor slot prunes (undefined ≠ number), never invoking the getter.
    expect(() => decodeLenient(schema.array(schema.number), evil)).not.toThrow();
    // strict + lenient tuple: same own-data read on the fixed positions.
    const pair = schema.tuple(schema.number, schema.number);
    expect(() => decode(pair, evil)).not.toThrow();
    expect(decode(pair, evil).ok).toBe(false);
    expect(decodeLenient(pair, evil)).toBeNull();
    expect(invoked).toBe(0);
  });

  it('record: an enumerable accessor slot is INVISIBLE — never invoked, never materialized (round-12)', () => {
    // `Object.keys` includes an enumerable accessor, but `ownData` reports it absent — decode must
    // SKIP it, never invoke its getter, and never materialize a fabricated `undefined` (which would
    // also spuriously fail a narrower value schema).
    let invoked = 0;
    const rec: Record<string, unknown> = { a: 1 };
    Object.defineProperty(rec, 'evil', {
      enumerable: true,
      configurable: true,
      get() {
        invoked++;
        throw new Error('record value getter must not run during decode');
      },
    });
    const strict = decode(schema.record(schema.number), rec);
    expect(strict.ok).toBe(true); // 'evil' skipped, not a bogus type error
    expect(valueOf(strict)).toEqual({ a: 1 });
    expect(Object.prototype.hasOwnProperty.call(valueOf(strict), 'evil')).toBe(false);
    expect(decodeLenient(schema.record(schema.number), rec)).toEqual({ a: 1 });
    expect(invoked).toBe(0);
  });

  it('record: decodes string-keyed values', () => {
    expect(valueOf(decode(schema.record(schema.number), { a: 1, b: 2 }))).toEqual({ a: 1, b: 2 });
  });
});

describe('strict decode — tuple (fixed arity)', () => {
  const pair = schema.tuple(schema.number, schema.number);

  it('decodes an exact-arity tuple, preserving positions', () => {
    expect(valueOf(decode(pair, [1, 2]))).toEqual([1, 2]);
  });

  it('rejects a wrong-arity array with a root schema/type issue (arity is part of the type)', () => {
    // RED-first cage: a shorter OR longer array must FAIL decode — an `schema.array`
    // would have accepted both, so this is exactly the fidelity the tuple restores.
    const short = issuesOf(decode(pair, [1]));
    expect(short).toHaveLength(1);
    expect(short[0]?.code).toBe('schema/type');
    expect(short[0]?.path).toEqual([]);
    const long = issuesOf(decode(pair, [1, 2, 3]));
    expect(long).toHaveLength(1);
    expect(long[0]?.code).toBe('schema/type');
    expect(long[0]?.path).toEqual([]);
  });

  it('rejects a non-array with a root schema/type issue', () => {
    expect(issuesOf(decode(pair, { 0: 1, 1: 2 }))[0]?.code).toBe('schema/type');
  });

  it('reports the failing position at its index path; decodes mixed element types', () => {
    const mixed = schema.tuple(schema.string, schema.number);
    expect(valueOf(decode(mixed, ['a', 1]))).toEqual(['a', 1]);
    const issues = issuesOf(decode(mixed, ['a', 'no']));
    expect(issues[0]?.path).toEqual([1]);
    expect(issues[0]?.code).toBe('schema/type');
  });

  it('nests the path through a tuple inside a struct', () => {
    const sch = schema.struct({ edge: schema.tuple(schema.number, schema.number) });
    const issues = issuesOf(decode(sch, { edge: [1, 'no'] }));
    expect(issues[0]?.path).toEqual(['edge', 1]);
  });
});

describe('strict decode — brand', () => {
  const addr = schema.brand(schema.string, ContentAddress);

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
  const bytes = schema.bytes(Uint8Array);

  it('accepts an instance of the carrier', () => {
    const b = new Uint8Array([1, 2, 3]);
    expect(valueOf(decode(bytes, b))).toBe(b);
  });

  it('rejects a non-instance with schema/type', () => {
    expect(issuesOf(decode(bytes, [1, 2, 3]))[0]?.code).toBe('schema/type');
  });
});

describe('strict decode — hole always blocks', () => {
  const withHole = schema.struct({ ready: schema.boolean, todo: schema.hole<{ shape: string }>('todo') });

  it('emits a blocking schema/hole issue and never passes data', () => {
    const issues = issuesOf(decode(withHole, { ready: true, todo: { shape: 'x' } }));
    expect(issues.some((i) => i.code === 'schema/hole' && i.path[0] === 'todo')).toBe(true);
  });
});

describe('prototype-poison safety', () => {
  it('strict record: a __proto__ key is a schema/poison-key issue, prototype untouched', () => {
    const poisoned = JSON.parse('{"__proto__": {"polluted": true}, "a": 5}') as unknown;
    const issues = issuesOf(decode(schema.record(schema.number), poisoned));
    expect(issues.some((i) => i.code === 'schema/poison-key' && i.path[0] === '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strict record: constructor and prototype keys are poison too', () => {
    const codes = (s: string): readonly string[] =>
      issuesOf(decode(schema.record(schema.number), JSON.parse(s) as unknown)).map((i) => i.code);
    expect(codes('{"constructor": 1}')).toContain('schema/poison-key');
    expect(codes('{"prototype": 1}')).toContain('schema/poison-key');
  });

  it('lenient record: poison keys are pruned, real leaves survive, no pollution', () => {
    const poisoned = JSON.parse('{"__proto__": {"polluted": true}, "a": 5, "b": "drop"}') as unknown;
    const out = decodeLenient(schema.record(schema.number), poisoned);
    expect(out).toEqual({ a: 5 });
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('lenient decode — coerce-or-null / prune', () => {
  it('scalars: value-or-null, never throwing', () => {
    expect(decodeLenient(schema.string, 'ok')).toBe('ok');
    expect(decodeLenient(schema.string, 5)).toBeNull();
    expect(decodeLenient(schema.number, 'x')).toBeNull();
  });

  it('struct: a malformed required leaf collapses the struct to null', () => {
    const point = schema.struct({ x: schema.number, y: schema.number });
    expect(decodeLenient(point, { x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
    expect(decodeLenient(point, { x: 1, y: 'bad' })).toBeNull();
    expect(decodeLenient(point, { x: 1 })).toBeNull();
  });

  it('struct: a malformed optional leaf is omitted, not fatal', () => {
    const s = schema.struct({ x: schema.number, note: schema.optional(schema.string) });
    expect(decodeLenient(s, { x: 1, note: 99 })).toEqual({ x: 1 });
    expect(decodeLenient(s, { x: 1, note: 'k' })).toEqual({ x: 1, note: 'k' });
  });

  it('array: malformed items are pruned', () => {
    expect(decodeLenient(schema.array(schema.number), [1, 'x', 3, null])).toEqual([1, 3]);
    expect(decodeLenient(schema.array(schema.number), 'not-array')).toBeNull();
  });

  it('tuple: wrong arity or any malformed position collapses to null (never pruned like an array)', () => {
    const pair = schema.tuple(schema.number, schema.number);
    expect(decodeLenient(pair, [1, 2])).toEqual([1, 2]);
    expect(decodeLenient(pair, [1])).toBeNull(); // short → null
    expect(decodeLenient(pair, [1, 2, 3])).toBeNull(); // long → null
    // A bad element collapses the whole tuple — it is NOT pruned to `[1]` (that
    // would break arity and lie about the type).
    expect(decodeLenient(pair, [1, 'bad'])).toBeNull();
    expect(decodeLenient(pair, 'not-array')).toBeNull();
  });

  it('record: malformed leaves are pruned to a plain object', () => {
    expect(decodeLenient(schema.record(schema.number), { a: 1, b: 'x', c: 3 })).toEqual({ a: 1, c: 3 });
  });

  it('brand: an invalid value coerces to null', () => {
    const addr = schema.brand(schema.string, ContentAddress);
    expect(decodeLenient(addr, 'fnv1a:0a1b2c3d')).toBe('fnv1a:0a1b2c3d');
    expect(decodeLenient(addr, 'nope')).toBeNull();
  });

  it('hole never passes data, even leniently', () => {
    expect(decodeLenient(schema.hole('todo'), { anything: 1 })).toBeNull();
  });

  it('unknown leniently keeps a genuine null leaf inside a record', () => {
    expect(decodeLenient(schema.record(schema.unknown), { a: null, b: 1 })).toEqual({ a: null, b: 1 });
  });
});

describe('determinism', () => {
  it('produces byte-identical issues across repeated strict decodes', () => {
    const sch = schema.struct({ a: schema.number, b: schema.array(schema.string) });
    const input = { a: 'bad', b: [1, 'ok'] };
    const first = issuesOf(decode(sch, input));
    const second = issuesOf(decode(sch, input));
    expect(second).toEqual(first);
  });

  it('round-trips generated valid struct values (seeded)', () => {
    const sch = schema.struct({ a: schema.string, b: schema.optional(schema.number), tags: schema.array(schema.string) });
    const arb = fc.record(
      { a: fc.string(), b: fc.option(fc.integer(), { nil: undefined }), tags: fc.array(fc.string()) },
      { requiredKeys: ['a', 'tags'] },
    );
    fc.assert(
      fc.property(arb, (sample) => {
        const withoutUndefined = sample.b === undefined ? { a: sample.a, tags: sample.tags } : sample;
        const result = decode(sch, withoutUndefined);
        expect(result.ok).toBe(true);
        expect(valueOf(result)).toEqual(withoutUndefined);
      }),
      { seed: 42, numRuns: 100 },
    );
  });
});

describe('parseErrorFromIssues', () => {
  it('folds an issue list into a tagged ParseError carrying the first code', () => {
    const issues = issuesOf(decode(schema.struct({ a: schema.number }), { a: 'x' }));
    const error = parseErrorFromIssues(issues, 'MyContract');
    expect(hasTag(error, 'ParseError')).toBe(true);
    expect(error.code).toBe('schema/type');
    expect(error.source).toBe('MyContract');
  });
});
