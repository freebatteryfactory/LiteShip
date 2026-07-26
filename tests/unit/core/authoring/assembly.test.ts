import { describe, it, expect, beforeEach } from 'vitest';
import { Diagnostics, defineCapsule, defineCapsuleCatalog, schema } from '@liteship/core';

describe('defineCapsule', () => {
  beforeEach(() => {
    Diagnostics.reset();
  });

  it('defines an immutable pureTransform capsule and computes a content address', () => {
    const cap = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.square',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    expect(cap._kind).toBe('pureTransform');
    expect(cap.id).toMatch(/^fnv1a:[0-9a-f]+$/);
    expect(cap.name).toBe('demo.square');
    expect(Object.isFrozen(cap)).toBe(true);
  });

  it('emits the registered diagnostic when invariants have no runtime transform', () => {
    const captured = Diagnostics.createBufferSink();
    Diagnostics.setSink(captured.sink);
    defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.unbacked-invariant',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [{ name: 'identity', check: (input, output) => input === output, message: 'identity' }],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    expect(captured.events.map((event) => event.code)).toContain('core/assembly/pure_transform_missing_run');
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
      input: schema.struct({ items: schema.array(schema.string) }),
      output: schema.struct({ count: schema.number }),
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

  it('composes an immutable catalog in deterministic name order', () => {
    const square = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.z-square',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    const identity = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.a-identity',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    const catalog = defineCapsuleCatalog([square, identity]);
    expect(catalog.map((capsule) => capsule.name)).toEqual(['demo.a-identity', 'demo.z-square']);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(defineCapsuleCatalog([identity, square])).toEqual(catalog);
  });

  it('does not accumulate declarations across repeated composition (HMR/import-repeat control)', () => {
    const capsule = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.repeat',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    expect(defineCapsuleCatalog([capsule])).toEqual(defineCapsuleCatalog([capsule]));
    expect(defineCapsuleCatalog([])).toEqual([]);
  });

  it('refuses duplicate names and duplicate identities', () => {
    const one = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.duplicate',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });
    const two = defineCapsule({
      _kind: 'pureTransform',
      name: 'demo.duplicate',
      input: schema.number,
      output: schema.number,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 2 },
      site: ['node'],
    });
    expect(() => defineCapsuleCatalog([one, two])).toThrow(/duplicate capsule name/u);
    const forgedIdentityTwin = { ...two, name: 'demo.other', id: one.id };
    expect(() => defineCapsuleCatalog([one, forgedIdentityTwin])).toThrow(/duplicate capsule identity/u);
  });

  it('snapshots caller-owned declaration data before hashing and storage', () => {
    const site = ['node'] as ('node' | 'browser')[];
    const reads = ['clock.read'];
    const budgets = { p95Ms: 1 };
    const initialState = { count: 0, history: ['created'] };
    const cap = defineCapsule({
      _kind: 'stateMachine',
      name: 'demo.owned',
      input: schema.number,
      output: schema.struct({ count: schema.number, history: schema.array(schema.string) }),
      capabilities: { reads, writes: [] },
      invariants: [],
      budgets,
      site,
      initialState,
      step: (state, event) => ({ count: state.count + event, history: [...state.history, String(event)] }),
    });
    const id = cap.id;
    site.push('browser');
    reads.push('fs.read');
    budgets.p95Ms = 99;
    initialState.count = 99;
    initialState.history.push('mutated');

    expect(cap.id).toBe(id);
    expect(cap.site).toEqual(['node']);
    expect(cap.capabilities.reads).toEqual(['clock.read']);
    expect(cap.budgets.p95Ms).toBe(1);
    expect(cap.initialState).toEqual({ count: 0, history: ['created'] });
    expect(Object.isFrozen(cap.initialState)).toBe(true);
  });
});
