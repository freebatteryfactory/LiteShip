/**
 * Property test (L4) — the formal CRDT / linearizability laws of the HLC.
 *
 * The HLC (`packages/core/src/hlc.ts`) is half of the causal trust spine: if its
 * ordering or merge lies, every downstream consumer trusts a bad happened-before.
 * The sibling `hlc.prop.test.ts` already pins monotonicity, wall-max-on-merge,
 * node-id preservation, compare antisymmetry/reflexivity and successive-increment
 * strict-increase. This file adds the MISSING formal laws — the join-semilattice
 * laws (idempotence / commutativity / associativity) and the total-order laws
 * (transitivity / totality) that an avionics-grade causal clock must satisfy.
 *
 * A NON-OBVIOUS, LOAD-BEARING RESULT pinned here (investigated, not assumed):
 *
 *   `HLC.merge` is NOT an idempotent/associative semilattice JOIN, and it must
 *   not be tested as one. It is a Lamport-style CLOCK ADVANCE: least-upper-bound
 *   of (local, remote, now) followed by a STRICT counter increment, so a freshly
 *   merged clock is strictly LATER than both inputs (it has to be — that is how a
 *   receive event preserves happened-before). Re-merging therefore advances the
 *   clock again: `merge(a, merge(a, b, now), now)` is strictly greater than
 *   `merge(a, b, now)`, NOT equal. Likewise the +1 makes the full merge
 *   non-associative (the grouping changes how many increments land). This is the
 *   CORRECT HLC contract, not a bug — pinning literal merge-idempotence would be
 *   a FALSE law.
 *
 *   The genuine CRDT semilattice the HLC carries lives ONE LAYER DOWN: the pure
 *   JOIN = the `compare`-max (the least upper bound WITHOUT the advance). That
 *   join IS idempotent, commutative and associative (proven below), and the total
 *   order induced by `compare` is transitive and total. So the substrate is a
 *   sound join-semilattice; `merge` is the monotone clock-tick that rides on it.
 *
 * Deterministic: a fixed fast-check seed (`0x5eed`) so a failure is reproducible
 * and the suite never flakes. The arbitraries deliberately use a TINY node-id and
 * value space so collisions/ties (the interesting cases for tie-break laws) are
 * dense.
 *
 * @module
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { HLC } from '@czap/core';

const SEED = 0x5eed;
const RUNS = 2000;

// ---------------------------------------------------------------------------
// Arbitraries (extend the sibling `arbHLC`: tiny spaces so ties are frequent)
// ---------------------------------------------------------------------------

/** A node id from a 3-element alphabet — forces frequent node_id ties (the tie-break axis). */
const arbNodeId = fc.constantFrom('a', 'b', 'c');

/** An HLC value: small wall + counter so equal-wall ties (the merge counter law) are dense. */
const arbHLC = fc.record({
  wall_ms: fc.integer({ min: 0, max: 1000 }),
  counter: fc.integer({ min: 0, max: 1000 }),
  node_id: arbNodeId,
});

/** A `now` in the same range as the wall, so all three (local/remote/now)-max arms are exercised. */
const arbNow = fc.integer({ min: 0, max: 1000 });

// ---------------------------------------------------------------------------
// Projections + the pure join — the lattice the HLC actually carries
// ---------------------------------------------------------------------------

/**
 * The (wall_ms, counter) projection comparison, IGNORING node_id. `merge` agrees
 * on this projection regardless of arg order (node_id is always the LOCAL arg's),
 * so the commutativity/dominance laws are stated on the projection, with the
 * node_id contract pinned separately.
 */
function projCompare(a: HLC.Shape, b: HLC.Shape): -1 | 0 | 1 {
  if (a.wall_ms < b.wall_ms) return -1;
  if (a.wall_ms > b.wall_ms) return 1;
  if (a.counter < b.counter) return -1;
  if (a.counter > b.counter) return 1;
  return 0;
}

/**
 * The pure JOIN — the `compare`-max (least upper bound in the HLC total order),
 * WITHOUT the merge's clock-advance increment. THIS is the genuine CRDT
 * semilattice operator; `HLC.merge` = this join (over local/remote/now) plus a
 * strict counter tick. Stated via `HLC.compare` only (no re-derivation of order).
 */
function join(a: HLC.Shape, b: HLC.Shape): HLC.Shape {
  return HLC.compare(a, b) >= 0 ? a : b;
}

// ---------------------------------------------------------------------------
// LAW GROUP 1 — `compare` is a genuine TOTAL ORDER (the linearizability spine)
// ---------------------------------------------------------------------------

describe('HLC.compare — total-order laws (the linearization order)', () => {
  test('TOTALITY: exactly one of compare<0, ===0, compare>0 holds for every pair', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, (a, b) => {
        const c = HLC.compare(a, b);
        // The codomain is literally {-1, 0, 1}; totality = it is always defined + trichotomous.
        return c === -1 || c === 0 || c === 1;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('ANTISYMMETRY (identity of indiscernibles): compare(a,b)===0 ⟹ a and b are field-equal', () => {
    // compare's full key is (wall_ms, counter, node_id); ===0 ⟺ all three agree. So
    // equal HLCs are genuinely the SAME timestamp (no two distinct values tie) — the
    // order is a true linearization, not a preorder with non-trivial equivalence classes.
    fc.assert(
      fc.property(arbHLC, arbHLC, (a, b) => {
        if (HLC.compare(a, b) !== 0) return true;
        return a.wall_ms === b.wall_ms && a.counter === b.counter && a.node_id === b.node_id;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('TRANSITIVITY of happens-before: compare(a,b)<0 && compare(b,c)<0 ⟹ compare(a,c)<0', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, arbHLC, (a, b, c) => {
        if (HLC.compare(a, b) < 0 && HLC.compare(b, c) < 0) {
          return HLC.compare(a, c) < 0;
        }
        return true; // vacuously true when the antecedent does not hold
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('TRANSITIVITY of ≤ (the reflexive closure): a≤b && b≤c ⟹ a≤c', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, arbHLC, (a, b, c) => {
        if (HLC.compare(a, b) <= 0 && HLC.compare(b, c) <= 0) {
          return HLC.compare(a, c) <= 0;
        }
        return true;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('STRICT IRREFLEXIVITY: compare(a,a) is never < 0 and never > 0 (no element precedes itself)', () => {
    fc.assert(
      fc.property(arbHLC, (a) => HLC.compare(a, a) === 0),
      { seed: SEED, numRuns: RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// LAW GROUP 2 — the pure JOIN (compare-max) is a genuine JOIN-SEMILATTICE
// (idempotent + commutative + associative). This IS the CRDT lattice the HLC
// carries; `merge` is the clock-advance that rides on it (Group 3).
// ---------------------------------------------------------------------------

describe('HLC join (compare-max, the LUB without the clock tick) — semilattice laws', () => {
  test('IDEMPOTENCE: join(a, a) ≡ a', () => {
    fc.assert(
      fc.property(arbHLC, (a) => HLC.compare(join(a, a), a) === 0),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('COMMUTATIVITY: join(a, b) ≡ join(b, a)', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, (a, b) => HLC.compare(join(a, b), join(b, a)) === 0),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('ASSOCIATIVITY: join(join(a, b), c) ≡ join(a, join(b, c))', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, arbHLC, (a, b, c) => {
        const left = join(join(a, b), c);
        const right = join(a, join(b, c));
        return HLC.compare(left, right) === 0;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('UPPER BOUND: join(a, b) ≥ a AND join(a, b) ≥ b (it is an upper bound of both)', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, (a, b) => {
        const j = join(a, b);
        return HLC.compare(j, a) >= 0 && HLC.compare(j, b) >= 0;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('LEAST upper bound: join(a, b) equals a or b — never invents a third value', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, (a, b) => {
        const j = join(a, b);
        return HLC.compare(j, a) === 0 || HLC.compare(j, b) === 0;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// LAW GROUP 3 — `HLC.merge` is the Lamport CLOCK-ADVANCE (LUB + strict tick).
// The ACTUAL guaranteed contract — NOT literal join idempotence/associativity.
// ---------------------------------------------------------------------------

describe('HLC.merge — the clock-advance contract (LUB + strict increment, NOT a semilattice join)', () => {
  test('DOMINANCE: merge(local, remote, now) is ≥ BOTH inputs on (wall, counter)', () => {
    // The merged clock is an upper bound of local and remote (modulo node_id) — the
    // receive event can never go backward relative to either side. (node_id is local's,
    // so the dominance is stated on the wall+counter projection.)
    fc.assert(
      fc.property(arbHLC, arbHLC, arbNow, (local, remote, now) => {
        const m = HLC.merge(local, remote, now);
        return projCompare(m, local) >= 0 && projCompare(m, remote) >= 0;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('STRICT ADVANCE: merge advances STRICTLY past the local clock (the +1 tick) — this is WHY it is not idempotent', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, arbNow, (local, remote, now) => {
        const m = HLC.merge(local, remote, now);
        // Strictly later than local on (wall, counter): a receive is a NEW event.
        return projCompare(m, local) > 0;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('WALL ≥ now: merge never lands before the supplied physical time', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, arbNow, (local, remote, now) => {
        const m = HLC.merge(local, remote, now);
        return m.wall_ms >= now;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('COMMUTATIVITY (the ACTUAL contract): merge(a,b,now) and merge(b,a,now) agree on (wall, counter); node_id is the LOCAL arg\'s', () => {
    // The literal `compare(merge(a,b), merge(b,a)) === 0` is FALSE whenever a.node_id ≠
    // b.node_id, because merge preserves the LOCAL node_id (so merge(a,b) carries a's,
    // merge(b,a) carries b's — they tie-break apart). That is the documented contract,
    // not a bug. The order-INDEPENDENT part — the part a CRDT needs — is the (wall,
    // counter) pair: pin EXACTLY that, plus the node_id-is-local fact.
    fc.assert(
      fc.property(arbHLC, arbHLC, arbNow, (a, b, now) => {
        const ab = HLC.merge(a, b, now);
        const ba = HLC.merge(b, a, now);
        const wallCounterAgree = ab.wall_ms === ba.wall_ms && ab.counter === ba.counter;
        const nodeIdIsLocal = ab.node_id === a.node_id && ba.node_id === b.node_id;
        return wallCounterAgree && nodeIdIsLocal;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('NON-IDEMPOTENCE (pinned as a LAW, the inverse of CRDT idempotence): re-merging STRICTLY advances when the merge ties on wall', () => {
    // merge(a, merge(a, b, now), now) is the clock receiving its own just-advanced value
    // again: it ticks ONCE MORE. We pin the precise guaranteed direction: the re-merge is
    // never EARLIER than the first merge, and is STRICTLY later whenever wall does not move
    // (the equal-wall arm always +1's). This is the formal statement of "merge is a clock
    // tick, not a join" — the law that would be VIOLATED if someone 'optimized' merge to be
    // idempotent and thereby broke happened-before.
    fc.assert(
      fc.property(arbHLC, arbHLC, arbNow, (a, b, now) => {
        const first = HLC.merge(a, b, now);
        const again = HLC.merge(a, first, now);
        // Never earlier than the first merge (monotone under re-receive).
        if (projCompare(again, first) < 0) return false;
        // When the second merge does not advance the wall, the counter MUST strictly rise.
        const wallStaysSame = again.wall_ms === first.wall_ms;
        return wallStaysSame ? again.counter > first.counter : true;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('NODE-ID PRESERVATION holds under nesting: a chain of merges keeps the original local node_id', () => {
    fc.assert(
      fc.property(arbHLC, arbHLC, arbHLC, arbNow, (a, b, c, now) => {
        const chained = HLC.merge(HLC.merge(a, b, now), c, now);
        return chained.node_id === a.node_id;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});
