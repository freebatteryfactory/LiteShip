/**
 * Assurance-level edge propagation (Slice B, B3.4) — the `assurance-map.ts:70`
 * RESERVED deliverable: "AUTHORITY decides assurance, not folder names" made real
 * via the import graph. `propagateAssuranceLevels` is the fixpoint that flows an
 * importer's level DOWN to its dependencies, so a file pulled into an L4 path
 * inherits >= L4 regardless of its glob folder.
 *
 * These pins are the contract the engine's --ir scoping + finding-elevation depend
 * on: direct inheritance, TRANSITIVE inheritance, cycle convergence, the no-high-
 * importer floor, rise-only monotonicity, and determinism. Property-based where the
 * LAW (every file's effective >= its base) generalizes.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  propagateAssuranceLevels,
  makeRepoIR,
  rankOf,
  type AssuranceLevel,
  type FileId,
  type FileNode,
  type ImportEdge,
  type RepoIR,
} from '@czap/gauntlet';

// ── small in-memory IR builders ──────────────────────────────────────────────

/** A file node with an inert placeholder digest (propagation never reads it). */
function file(id: FileId): FileNode {
  return { id, contentDigest: 'placeholder:test', packageName: null };
}

/** A resolved INTERNAL edge: `from` imports `to` (from DEPENDS ON to). */
function edge(from: FileId, to: FileId): ImportEdge {
  return { fromFile: from, specifier: `./${to}`, kind: 'relative', targetFile: to };
}

/** An EXTERNAL edge (no targetFile) — must NOT propagate. */
function externalEdge(from: FileId, pkg: string): ImportEdge {
  return { fromFile: from, specifier: pkg, kind: 'external', targetPackage: pkg };
}

/** Build an IR from a file-id list + edge list (all files seeded). */
function ir(ids: readonly FileId[], edges: readonly ImportEdge[] = []): RepoIR {
  return makeRepoIR({ files: ids.map(file), imports: edges });
}

/** A base-level stub from an explicit `file → level` table (default L1). */
function baseFrom(table: Readonly<Record<string, AssuranceLevel>>): (f: FileId) => AssuranceLevel {
  return (f: FileId): AssuranceLevel => table[f] ?? 'L1';
}

// ── direct inheritance ───────────────────────────────────────────────────────

describe('propagateAssuranceLevels — direct import inheritance', () => {
  it('a file imported by an L4 file inherits L4 (the helper joins the safety case)', () => {
    // a (L4) imports b (glob L1). b is pulled into the L4 path → b becomes L4.
    const r = ir(['a.ts', 'b.ts'], [edge('a.ts', 'b.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'a.ts': 'L4' }));
    expect(levels.get('a.ts')).toBe('L4');
    expect(levels.get('b.ts')).toBe('L4'); // raised from its L1 floor
  });

  it('every file in the IR has an entry (the floor when no high importer)', () => {
    const r = ir(['a.ts', 'b.ts', 'c.ts'], [edge('a.ts', 'b.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'a.ts': 'L3' }));
    expect(levels.size).toBe(3);
    expect(levels.get('c.ts')).toBe('L1'); // unconnected → its base
  });
});

// ── transitive inheritance ───────────────────────────────────────────────────

describe('propagateAssuranceLevels — transitive propagation (the fixpoint)', () => {
  it('A(L4) → B → C raises BOTH B and C to L4 (level flows the whole chain)', () => {
    const r = ir(['A.ts', 'B.ts', 'C.ts'], [edge('A.ts', 'B.ts'), edge('B.ts', 'C.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'A.ts': 'L4' }));
    expect(levels.get('A.ts')).toBe('L4');
    expect(levels.get('B.ts')).toBe('L4');
    expect(levels.get('C.ts')).toBe('L4'); // the fixpoint: B's RAISED level flows on
  });

  it('a diamond raises the shared leaf once, to the highest path level', () => {
    // top(L4) → left, right; left → leaf, right → leaf. leaf inherits L4.
    const r = ir(
      ['top.ts', 'left.ts', 'right.ts', 'leaf.ts'],
      [edge('top.ts', 'left.ts'), edge('top.ts', 'right.ts'), edge('left.ts', 'leaf.ts'), edge('right.ts', 'leaf.ts')],
    );
    const levels = propagateAssuranceLevels(r, baseFrom({ 'top.ts': 'L4' }));
    expect(levels.get('leaf.ts')).toBe('L4');
  });

  it('the HIGHEST of multiple importers wins (max over importers)', () => {
    // shared imported by an L2 file AND an L4 file → it inherits L4.
    const r = ir(
      ['hi.ts', 'lo.ts', 'shared.ts'],
      [edge('hi.ts', 'shared.ts'), edge('lo.ts', 'shared.ts')],
    );
    const levels = propagateAssuranceLevels(r, baseFrom({ 'hi.ts': 'L4', 'lo.ts': 'L2' }));
    expect(levels.get('shared.ts')).toBe('L4');
  });
});

// ── cycles converge ──────────────────────────────────────────────────────────

describe('propagateAssuranceLevels — cycles converge (no infinite loop)', () => {
  it('a 2-cycle a<->b with one L4 end lifts both, then stops', () => {
    const r = ir(['a.ts', 'b.ts'], [edge('a.ts', 'b.ts'), edge('b.ts', 'a.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'a.ts': 'L4' }));
    expect(levels.get('a.ts')).toBe('L4');
    expect(levels.get('b.ts')).toBe('L4');
  });

  it('a 3-cycle reached from an L4 file lifts the whole SCC to L4', () => {
    // entry(L4) → x; x → y → z → x (a cycle). All of x,y,z become L4.
    const r = ir(
      ['entry.ts', 'x.ts', 'y.ts', 'z.ts'],
      [edge('entry.ts', 'x.ts'), edge('x.ts', 'y.ts'), edge('y.ts', 'z.ts'), edge('z.ts', 'x.ts')],
    );
    const levels = propagateAssuranceLevels(r, baseFrom({ 'entry.ts': 'L4' }));
    expect(levels.get('x.ts')).toBe('L4');
    expect(levels.get('y.ts')).toBe('L4');
    expect(levels.get('z.ts')).toBe('L4');
  });

  it('a self-loop is harmless (a file importing itself)', () => {
    const r = ir(['s.ts'], [edge('s.ts', 's.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 's.ts': 'L3' }));
    expect(levels.get('s.ts')).toBe('L3');
  });
});

// ── floor + rise-only ────────────────────────────────────────────────────────

describe('propagateAssuranceLevels — levels only RISE, never fall', () => {
  it('a file with no high importer keeps its base glob level', () => {
    const r = ir(['a.ts', 'b.ts'], [edge('a.ts', 'b.ts')]);
    // a is L1; importing b (also L1) propagates nothing.
    const levels = propagateAssuranceLevels(r, baseFrom({}));
    expect(levels.get('a.ts')).toBe('L1');
    expect(levels.get('b.ts')).toBe('L1');
  });

  it('an L4 file importing an L1-glob file raises the L1 file, NEVER the reverse', () => {
    // a (L4) imports b (L1). b rises to L4; a stays L4 — the dependency does NOT
    // pull the importer DOWN to L1.
    const r = ir(['a.ts', 'b.ts'], [edge('a.ts', 'b.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'a.ts': 'L4', 'b.ts': 'L1' }));
    expect(levels.get('a.ts')).toBe('L4'); // unchanged — never lowered
    expect(levels.get('b.ts')).toBe('L4'); // raised
  });

  it('an L1 file importing an L4 file does NOT lower the L4 dependency', () => {
    // direction matters: importer→dependency. An L1 importer of an L4 file leaves
    // the L4 file at L4 (and the L1 importer stays L1 — nothing imports IT high).
    const r = ir(['lo.ts', 'hi.ts'], [edge('lo.ts', 'hi.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'lo.ts': 'L1', 'hi.ts': 'L4' }));
    expect(levels.get('lo.ts')).toBe('L1');
    expect(levels.get('hi.ts')).toBe('L4');
  });
});

// ── external edges are skipped ───────────────────────────────────────────────

describe('propagateAssuranceLevels — external edges do not propagate', () => {
  it('an external edge (no targetFile) carries no level (the target is not ours)', () => {
    const r = ir(['a.ts'], [externalEdge('a.ts', '@czap/core'), edge('a.ts', 'a.ts')]);
    const levels = propagateAssuranceLevels(r, baseFrom({ 'a.ts': 'L4' }));
    expect(levels.size).toBe(1);
    expect(levels.get('a.ts')).toBe('L4');
  });
});

// ── determinism + monotonicity (property-based) ──────────────────────────────

describe('propagateAssuranceLevels — determinism + monotonicity LAWS', () => {
  it('determinism: computing twice yields an identical map', () => {
    const r = ir(
      ['A.ts', 'B.ts', 'C.ts', 'D.ts'],
      [edge('A.ts', 'B.ts'), edge('B.ts', 'C.ts'), edge('C.ts', 'D.ts'), edge('D.ts', 'B.ts')],
    );
    const base = baseFrom({ 'A.ts': 'L4', 'C.ts': 'L2' });
    const a = propagateAssuranceLevels(r, base);
    const b = propagateAssuranceLevels(r, base);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  const LEVELS: readonly AssuranceLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4'];

  it('LAW: every file effective >= its base (propagation only raises) — over random DAGs+cycles', () => {
    const arb = fc
      .integer({ min: 1, max: 8 })
      .chain((n) => {
        const ids = Array.from({ length: n }, (_, i) => `f${i}.ts`);
        const baseArb = fc.array(fc.constantFrom(...LEVELS), { minLength: n, maxLength: n });
        // Random edges over the id set — may form DAGs, cycles, or self-loops.
        const edgeArb = fc.array(
          fc.tuple(fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 0, max: n - 1 })),
          { maxLength: n * 2 },
        );
        return fc.tuple(fc.constant(ids), baseArb, edgeArb);
      });

    fc.assert(
      fc.property(arb, ([ids, bases, edgePairs]) => {
        const baseTable: Record<string, AssuranceLevel> = {};
        ids.forEach((id, i) => {
          baseTable[id] = bases[i] ?? 'L1';
        });
        const edges = edgePairs.map(([f, t]) => edge(ids[f] ?? ids[0]!, ids[t] ?? ids[0]!));
        const r = ir(ids, edges);
        const base = baseFrom(baseTable);
        const levels = propagateAssuranceLevels(r, base);
        // (1) every file present; (2) effective >= base for every file.
        for (const id of ids) {
          const eff = levels.get(id);
          expect(eff).toBeDefined();
          expect(rankOf(eff!)).toBeGreaterThanOrEqual(rankOf(base(id)));
        }
        // (3) every dependency >= the max of its importers' effective levels (the
        // fixpoint property — no edge is under-propagated).
        for (const [f, t] of edgePairs) {
          const src = levels.get(ids[f] ?? ids[0]!)!;
          const tgt = levels.get(ids[t] ?? ids[0]!)!;
          expect(rankOf(tgt)).toBeGreaterThanOrEqual(rankOf(src));
        }
      }),
      { numRuns: 200 },
    );
  });
});
