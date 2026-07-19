import { describe, it, expect, beforeEach } from 'vitest';
import { defineCapsule, getCapsuleCatalog, S } from '@liteship/core';
import { resetCapsuleCatalog } from '@liteship/core/testing';

describe('defineCapsule', () => {
  beforeEach(() => resetCapsuleCatalog());

  it('registers a pureTransform capsule and computes a content address', () => {
    const cap = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.square',
      input: S.number,
      output: S.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    expect(cap._kind).toBe('pureTransform');
    expect(cap.id).toMatch(/^fnv1a:[0-9a-f]+$/);
    expect(cap.name).toBe('demo.square');
  });

  it('derives In/Out from the schema VALUES so handlers are contextually typed (no `o as T`)', () => {
    // Generic-inference pin. `input`/`output` are kernel schema VALUES; In/Out
    // are derived via `Infer`, so `run`'s parameter and the invariant's
    // (input, output) are contextually typed with NO annotation and NO cast.
    // If assembly.ts regressed to weak inference (the `SchemaPort<In> |
    // DeclarationSchema<In>` union defeating inference), `input.items` /
    // `output.count` would be `unknown` and these reads would not typecheck —
    // this test is the compile-time gate the tsc probe verifies.
    const cap = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.lengths',
      input: S.struct({ items: S.array(S.string) }),
      output: S.struct({ count: S.number }),
      capabilities: { reads: [], writes: [] },
      invariants: [
        {
          name: 'count-matches-item-count',
          check: (input, output) => output.count === input.items.length,
          message: 'count equals the number of items',
        },
      ],
      budgets: { p95Ms: 1 },
      site: ['node'],
      run: (input) => ({ count: input.items.length }),
    });
    expect(cap.run?.({ items: ['a', 'b', 'c'] })).toEqual({ count: 3 });
    const invariant = cap.invariants[0];
    if (invariant === undefined) throw new Error('expected one invariant');
    expect(invariant.check({ items: ['a'] }, { count: 1 })).toBe(true);
    expect(invariant.check({ items: ['a'] }, { count: 2 })).toBe(false);
  });

  it('catalog contains every defined capsule', () => {
    defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.square',
      input: S.number,
      output: S.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    const catalog = getCapsuleCatalog();
    expect(catalog.some((c) => c.name === 'demo.square')).toBe(true);
  });

  it('resetCapsuleCatalog clears the registry', () => {
    defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.a',
      input: S.number,
      output: S.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    resetCapsuleCatalog();
    expect(getCapsuleCatalog().length).toBe(0);
  });
});
