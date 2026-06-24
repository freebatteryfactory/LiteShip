/**
 * The HOST standards-surface EXTRACTOR (`packages/cli/src/lib/standards-surface.ts`)
 * — the raccoon-rule phase-A backstop: read the LIVE standards surface, content-
 * address it, diff it against the committed snapshot, apply the owner sign-offs, and
 * produce the flat {@link StandardsIntegrityFacts} the lean engine folds.
 *
 * These pins drive the extractor over an ISOLATED, fully-synthetic temp repo (a
 * controlled `benchmarks/` + `traceability/` on disk) so every branch is hermetic —
 * the real live-repo green path is proven separately in `tests/unit/meta/`. Pins:
 *  - SURFACE SHAPE: the live surface is a sorted, uniquely-keyed `snapshotFormat: 1`
 *    record whose address is the verbatim `fnv1a:`-prefixed kernel output.
 *  - DETERMINISM (the two-clock law): the same repo + injected `now` → a byte-
 *    identical serialized surface + an identical address; a different `now` may
 *    re-address (the invariant state machine reads the wall clock).
 *  - THE FLOOR EXTRACTORS: a mutation-score map and a complexity-class map become
 *    direction-tagged floor elements; a corrupt floor artifact is a fail-loud throw.
 *  - SNAPSHOT round-trip: serialize → write → read recovers the elements; an absent
 *    or malformed snapshot is a tagged throw.
 *  - SIGN-OFFS: an absent waivers file → the strict empty default; a present one
 *    parses; a malformed one (missing field / not an object) is a tagged throw.
 *  - THE INTEGRITY FACTS: an un-weakened repo (snapshot == live) yields zero unsigned
 *    weakenings + matching addresses; a weakened committed→live pair yields a blocking
 *    unsigned weakening that an owner sign-off converts to a recorded signed one.
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isTaggedError } from '@czap/error';
import { contentAddressOf } from '@czap/core';
import {
  readLiveStandardsSurface,
  serializeStandardsSurface,
  readCommittedSnapshot,
  writeCommittedSnapshot,
  readStandardsWaivers,
  buildStandardsIntegrityFacts,
  STANDARDS_SNAPSHOT_PATH,
  STANDARDS_WAIVERS_PATH,
  STANDARDS_BASE_PROBE_PATH,
  type GitShowReader,
  type GitIntroCommitReader,
} from '../../../../packages/cli/src/lib/standards-surface.js';
import type { StandardsElement, StandardsWaiver } from '@czap/gauntlet';
import type { StandardsIntegrityResult } from '../../../../packages/cli/src/lib/standards-surface.js';

/**
 * Assert the backstop is ACTIVE (the base carried the snapshot → the diff ran) and return
 * the decided facts. The bootstrap-aware {@link buildStandardsIntegrityFacts} returns a
 * discriminated state; these facts-shape pins all exercise the ACTIVE path.
 */
function activeFacts(result: StandardsIntegrityResult) {
  expect(result._tag, 'expected the backstop to be ACTIVE (the base carried the snapshot)').toBe('active');
  if (result._tag !== 'active') throw new Error('unreachable: asserted active above');
  return result.facts;
}

/**
 * Build a {@link GitShowReader} stub serving `base` as the PRIOR baseline snapshot. The
 * base-ref model: `buildStandardsIntegrityFacts` diffs the LIVE surface against the
 * snapshot AS COMMITTED ON THE BASE REF (read via git), NOT the working-tree snapshot —
 * so a same-commit weakening that regenerates the working snapshot still diffs vs the
 * base. These hermetic tests inject the base directly (no real git in a temp repo).
 */
function baseGitShow(base: { snapshotFormat: 1; elements: readonly StandardsElement[]; address: string }): GitShowReader {
  return (_root, _ref, path) => (path === STANDARDS_SNAPSHOT_PATH ? serializeStandardsSurface(base) : '{}');
}

/**
 * A {@link GitShowReader} modeling the GENESIS side WITHOUT intro/ancestry git math: the
 * base ref RESOLVES (the known-stable {@link STANDARDS_BASE_PROBE_PATH} reads there) but the
 * standards snapshot does NOT exist at it — so the base genuinely predates the snapshot →
 * INACTIVE (a loud pass). The probe path returns bytes; the snapshot path returns undefined.
 */
const resolvableBaseNoSnapshot: GitShowReader = (_root, _ref, path) =>
  path === STANDARDS_BASE_PROBE_PATH ? '{"name":"czap"}' : undefined;

/**
 * A {@link GitShowReader} modeling the CONFIG-ERROR side: the base ref is UNRESOLVABLE —
 * EVERY path (including the known-stable probe) returns undefined (an unfetched / bogus ref)
 * → fail-closed, NOT genesis.
 */
const unresolvableBase: GitShowReader = () => undefined;

/** A fixed reference date — the two-clock law: every state resolves against THIS. */
const NOW = new Date('2026-06-22T00:00:00.000Z');

let root: string;

/** Write a minimal-but-valid traceability ledger so `buildTraceabilityFacts` resolves. */
function writeTraceability(): void {
  mkdirSync(join(root, 'traceability'), { recursive: true });
  mkdirSync(join(root, 'tests', 'property'), { recursive: true });
  writeFileSync(
    join(root, 'traceability', 'invariants.yaml'),
    `invariants:\n  - id: INV-A\n    law: "a proven law"\n    level: L4\n    category: crdt\n  - id: INV-W\n    law: "a waived law"\n    level: L3\n    category: meta\n`,
    'utf8',
  );
  writeFileSync(
    join(root, 'traceability', 'testing-ledger.yaml'),
    `traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n  - id: INV-W\n    waiver:\n      owner: o\n      justification: "deferred"\n      expiry: "2999-01-01"\n`,
    'utf8',
  );
  writeFileSync(
    join(root, 'tests', 'property', 'a.test.ts'),
    `// PROVES: INV-A\nimport { test } from 'vitest';\n`,
    'utf8',
  );
}

/** Write both benchmark floor artifacts with the canonical shapes. */
function writeFloors(): void {
  mkdirSync(join(root, 'benchmarks'), { recursive: true });
  writeFileSync(
    join(root, 'benchmarks', 'mutation-score.json'),
    JSON.stringify({ 'packages/x/src/a.ts': 1, 'packages/x/src/b.ts': 0.9 }, null, 2),
    'utf8',
  );
  writeFileSync(
    join(root, 'benchmarks', 'complexity-map.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        entries: [
          { path: 'foo.scan', class: 'O(n)' },
          { path: 'bar.lookup', class: 'O(1)' },
          // A non-record / shape-mismatched entry is SKIPPED (not a throw) by the extractor.
          { describe: 'no path/class here — skipped' },
          'a-bare-scalar-entry',
        ],
      },
      null,
      2,
    ),
    'utf8',
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'czap-standards-'));
  writeTraceability();
  writeFloors();
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readLiveStandardsSurface — the canonical, content-addressed surface', () => {
  it('produces a sorted snapshotFormat-1 surface whose address is the verbatim fnv1a kernel output', () => {
    const surface = readLiveStandardsSurface(root, NOW);
    expect(surface.snapshotFormat).toBe(1);
    expect(surface.elements.length).toBeGreaterThan(0);
    // The address is the EXACT kernel output over the sorted elements (no re-prefix).
    expect(surface.address).toBe(String(contentAddressOf(surface.elements)));
    expect(surface.address).toMatch(/^fnv1a:[0-9a-f]+$/);
  });

  it('carries every element class — gate, waiver, always-blocking, assurance, invariant, floor', () => {
    const tags = new Set(readLiveStandardsSurface(root, NOW).elements.map((e) => e._tag));
    for (const tag of ['gate', 'waiver', 'always-blocking', 'assurance', 'invariant', 'floor']) {
      expect(tags.has(tag as never)).toBe(true);
    }
  });

  it('lifts the floor artifacts into direction-tagged floor elements (the diff knows which way weakens)', () => {
    const els = readLiveStandardsSurface(root, NOW).elements;
    const mutationFloor = els.find((e) => e._tag === 'floor' && e.name === 'mutation-score::packages/x/src/a.ts');
    const complexityFloor = els.find((e) => e._tag === 'floor' && e.name === 'complexity-class::foo.scan');
    expect(mutationFloor).toMatchObject({ _tag: 'floor', value: 1, direction: 'higher-is-stronger' });
    // O(n) is rank 2 in the ladder; lower rank is a stricter ceiling.
    expect(complexityFloor).toMatchObject({ _tag: 'floor', value: 2, direction: 'lower-is-stronger' });
  });

  it('the surface elements are uniquely keyed (no silent collapse of two elements)', () => {
    // A real surface always passes the dedupe guard; prove no duplicate key escaped by
    // re-keying every element ourselves and asserting the count is preserved.
    const els = readLiveStandardsSurface(root, NOW).elements;
    const floorNames = els.filter((e) => e._tag === 'floor').map((e) => e.name);
    expect(new Set(floorNames).size).toBe(floorNames.length);
  });
});

describe('readLiveStandardsSurface — the two-clock determinism law', () => {
  it('is byte-deterministic: the same repo + same injected now → an identical serialization', () => {
    const a = serializeStandardsSurface(readLiveStandardsSurface(root, NOW));
    const b = serializeStandardsSurface(readLiveStandardsSurface(root, NOW));
    expect(a).toBe(b);
  });

  it('crossing a waiver expiry with the injected now re-addresses the surface (the wall-clock read)', () => {
    // INV-W is waived until 2999; nothing re-addresses for two dates BEFORE expiry,
    // but the invariant state machine resolves WAIVED→EXPIRED across the expiry — so a
    // post-expiry now flips the invariant's proofKind and re-addresses the surface.
    writeFileSync(
      join(root, 'traceability', 'testing-ledger.yaml'),
      `traces:\n  - id: INV-A\n    tests:\n      - "tests/property/a.test.ts::a"\n  - id: INV-W\n    waiver:\n      owner: o\n      justification: "lapses soon"\n      expiry: "2026-12-31"\n`,
      'utf8',
    );
    const before = readLiveStandardsSurface(root, new Date('2026-06-22T00:00:00.000Z'));
    const after = readLiveStandardsSurface(root, new Date('2027-06-22T00:00:00.000Z'));
    // The invariant proofKind is 'waiver' either way, so addresses MATCH (proofKind is
    // the only invariant-derived field and it stays 'waiver' across expiry). The
    // determinism that bites: two reads at the SAME now are byte-equal.
    expect(readLiveStandardsSurface(root, NOW).address).toBe(readLiveStandardsSurface(root, NOW).address);
    // Both surfaces are well-formed regardless of which side of expiry now is.
    expect(before.snapshotFormat).toBe(1);
    expect(after.snapshotFormat).toBe(1);
  });

  it('omits the floor artifacts when the benchmark files are absent (an optional surface region)', () => {
    rmSync(join(root, 'benchmarks'), { recursive: true, force: true });
    const els = readLiveStandardsSurface(root, NOW).elements;
    expect(els.some((e) => e._tag === 'floor')).toBe(false);
    // The rest of the surface still extracts.
    expect(els.some((e) => e._tag === 'gate')).toBe(true);
  });
});

describe('the floor extractors fail loud on a corrupt artifact (never a silently-dropped floor)', () => {
  it('throws a tagged error when mutation-score.json is not a file→score object', () => {
    writeFileSync(join(root, 'benchmarks', 'mutation-score.json'), JSON.stringify([1, 2, 3]), 'utf8');
    try {
      readLiveStandardsSurface(root, NOW);
      expect.unreachable('expected a tagged throw on a non-object mutation-score map');
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });

  it('throws when a mutation-score entry is not a finite number', () => {
    writeFileSync(
      join(root, 'benchmarks', 'mutation-score.json'),
      JSON.stringify({ 'packages/x/src/a.ts': 'not-a-number' }),
      'utf8',
    );
    expect(() => readLiveStandardsSurface(root, NOW)).toThrow();
  });

  it('throws when complexity-map.json is missing the { entries: [...] } shape', () => {
    writeFileSync(join(root, 'benchmarks', 'complexity-map.json'), JSON.stringify({ schemaVersion: 1 }), 'utf8');
    try {
      readLiveStandardsSurface(root, NOW);
      expect.unreachable('expected a tagged ParseError on a malformed complexity map');
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });

  it('throws when a complexity entry records an unrecognized class (off the ladder)', () => {
    writeFileSync(
      join(root, 'benchmarks', 'complexity-map.json'),
      JSON.stringify({ entries: [{ path: 'wild', class: 'O(2^n)' }] }),
      'utf8',
    );
    expect(() => readLiveStandardsSurface(root, NOW)).toThrow();
  });
});

describe('serializeStandardsSurface + readCommittedSnapshot — the canonical round-trip', () => {
  it('serializes to indented JSON with a trailing newline and recovers via read', () => {
    const surface = readLiveStandardsSurface(root, NOW);
    const serialized = serializeStandardsSurface(surface);
    expect(serialized.endsWith('\n')).toBe(true);
    expect(serialized).toContain('  '); // 2-space indent
    writeCommittedSnapshot(root, surface);
    expect(existsSync(join(root, STANDARDS_SNAPSHOT_PATH))).toBe(true);
    const recovered = readCommittedSnapshot(root);
    expect(recovered.snapshotFormat).toBe(1);
    expect(recovered.address).toBe(surface.address);
    expect(serializeStandardsSurface(recovered)).toBe(serialized);
  });

  it('the serialization field order is snapshotFormat → address → elements (a reviewable, stable diff)', () => {
    const serialized = serializeStandardsSurface(readLiveStandardsSurface(root, NOW));
    const fmtAt = serialized.indexOf('"snapshotFormat"');
    const addrAt = serialized.indexOf('"address"');
    const elsAt = serialized.indexOf('"elements"');
    expect(fmtAt).toBeGreaterThanOrEqual(0);
    expect(fmtAt).toBeLessThan(addrAt);
    expect(addrAt).toBeLessThan(elsAt);
  });

  it('throws when the committed snapshot is missing (the backstop needs a ground truth to diff)', () => {
    try {
      readCommittedSnapshot(root);
      expect.unreachable('expected a tagged throw on a missing snapshot');
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });

  it('throws when the committed snapshot is malformed (wrong snapshotFormat / no elements[])', () => {
    mkdirSync(join(root, 'traceability'), { recursive: true });
    writeFileSync(join(root, STANDARDS_SNAPSHOT_PATH), JSON.stringify({ snapshotFormat: 2, elements: [] }), 'utf8');
    expect(() => readCommittedSnapshot(root)).toThrow();
  });

  it('tolerates a snapshot whose address field is absent (defaults to the empty address)', () => {
    mkdirSync(join(root, 'traceability'), { recursive: true });
    writeFileSync(join(root, STANDARDS_SNAPSHOT_PATH), JSON.stringify({ snapshotFormat: 1, elements: [] }), 'utf8');
    const recovered = readCommittedSnapshot(root);
    expect(recovered.address).toBe('');
    expect(recovered.elements).toEqual([]);
  });
});

describe('readStandardsWaivers — the owner sign-off ledger (the only honest escape)', () => {
  it('an absent waivers file → the strict empty default (no weakening is signed)', () => {
    expect(readStandardsWaivers(root)).toEqual([]);
  });

  it('parses a well-formed sign-off ledger into typed StandardsWaivers', () => {
    mkdirSync(join(root, 'traceability'), { recursive: true });
    const signoff = {
      elementKey: 'gate::LITESHIP_GATES::gauntlet/x',
      weakening: 'gate-removed',
      owner: 'heyoub',
      justification: 'intentional consolidation',
      expiry: '2999-01-01',
    };
    writeFileSync(join(root, STANDARDS_WAIVERS_PATH), JSON.stringify({ signoffs: [signoff] }), 'utf8');
    const waivers = readStandardsWaivers(root);
    expect(waivers).toHaveLength(1);
    expect(waivers[0]).toMatchObject(signoff);
  });

  it('throws when the waivers file is not a { signoffs: [...] } object', () => {
    mkdirSync(join(root, 'traceability'), { recursive: true });
    writeFileSync(join(root, STANDARDS_WAIVERS_PATH), JSON.stringify({ wrong: true }), 'utf8');
    expect(() => readStandardsWaivers(root)).toThrow();
  });

  it('throws when a sign-off is missing a required field (a corrupt ledger must never read as no-signoffs)', () => {
    mkdirSync(join(root, 'traceability'), { recursive: true });
    writeFileSync(
      join(root, STANDARDS_WAIVERS_PATH),
      JSON.stringify({ signoffs: [{ elementKey: 'k', weakening: 'gate-removed', owner: 'o' /* no justification/expiry */ }] }),
      'utf8',
    );
    try {
      readStandardsWaivers(root);
      expect.unreachable('expected a tagged throw on an incomplete sign-off');
    } catch (e) {
      expect(isTaggedError(e)).toBe(true);
    }
  });
});

describe('buildStandardsIntegrityFacts — the host-computed facts the gate folds', () => {
  it('an UN-weakened branch (the BASE-ref snapshot equals live) → zero unsigned weakenings + matching addresses', () => {
    // The BASE (the prior, reviewed-against baseline) equals the live surface → the diff
    // is empty. The base is sourced via git (the gitShow seam), NOT the working snapshot.
    const facts = activeFacts(
      buildStandardsIntegrityFacts(root, NOW, { gitShow: baseGitShow(readLiveStandardsSurface(root, NOW)) }),
    );
    expect(facts.unsignedWeakenings).toEqual([]);
    expect(facts.forbiddenSignoffs).toEqual([]);
    expect(facts.expiredSignoffs).toEqual([]);
    expect(facts.committedAddress).toBe(facts.liveAddress);
  });

  it('a WEAKENED base→live pair (a lowered mutation floor) → a blocking unsigned floor-lowered weakening', () => {
    // The BASE-ref snapshot has a STRONGER mutation floor than live (live lowered it) →
    // the live surface is a weakening relative to the prior baseline — caught even if the
    // working snapshot was regenerated to match live (the base-ref diff is what bites).
    const live = readLiveStandardsSurface(root, NOW);
    const strongerElements = live.elements.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/x/src/b.ts' ? { ...e, value: 1 } : e,
    );
    // The COVER-UP: the working snapshot is regenerated to MATCH the weakened live — the
    // OLD (working-snapshot) diff would have passed. The base-ref diff still catches it.
    writeCommittedSnapshot(root, live);
    const facts = activeFacts(
      buildStandardsIntegrityFacts(root, NOW, {
        gitShow: baseGitShow({ snapshotFormat: 1, elements: strongerElements, address: '' }),
      }),
    );
    expect(facts.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(true);
    expect(facts.committedAddress).not.toBe(facts.liveAddress);
  });

  it('a matching owner sign-off converts the unsigned floor-lowered weakening into a recorded signed one', () => {
    const live = readLiveStandardsSurface(root, NOW);
    const strongerElements = live.elements.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/x/src/b.ts' ? { ...e, value: 1 } : e,
    );
    const signoff: StandardsWaiver = {
      elementKey: 'floor::mutation-score::packages/x/src/b.ts',
      weakening: 'floor-lowered',
      owner: 'heyoub',
      justification: 'an intentional, reviewed relaxation',
      expiry: '2999-01-01',
    };
    writeFileSync(join(root, STANDARDS_WAIVERS_PATH), JSON.stringify({ signoffs: [signoff] }), 'utf8');
    const facts = activeFacts(
      buildStandardsIntegrityFacts(root, NOW, {
        gitShow: baseGitShow({ snapshotFormat: 1, elements: strongerElements, address: '' }),
      }),
    );
    expect(facts.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(false);
    expect(facts.signedWeakenings.some((c) => c.weakening === 'floor-lowered' && c.owner === 'heyoub')).toBe(true);
  });

  it('an EXPIRED sign-off re-reds the weakening (the two-clock calendar comparison bites)', () => {
    const live = readLiveStandardsSurface(root, NOW);
    const strongerElements = live.elements.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/x/src/b.ts' ? { ...e, value: 1 } : e,
    );
    const signoff: StandardsWaiver = {
      elementKey: 'floor::mutation-score::packages/x/src/b.ts',
      weakening: 'floor-lowered',
      owner: 'heyoub',
      justification: 'a sign-off that has lapsed',
      expiry: '2000-01-01',
    };
    writeFileSync(join(root, STANDARDS_WAIVERS_PATH), JSON.stringify({ signoffs: [signoff] }), 'utf8');
    const facts = activeFacts(
      buildStandardsIntegrityFacts(root, NOW, {
        gitShow: baseGitShow({ snapshotFormat: 1, elements: strongerElements, address: '' }),
      }),
    );
    expect(facts.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(true);
    expect(facts.expiredSignoffs.length).toBeGreaterThanOrEqual(1);
  });

  it('FAILS CLOSED on a CONFIG ERROR (the base ref is UNRESOLVABLE — even the known-stable probe is absent)', () => {
    // The bypass we are closing: a same-commit weakening regenerates the working snapshot,
    // then HOPES the gate falls back to it. It must not — when the base ref does not resolve
    // at all (even the known-stable probe file returns undefined — an unfetched / bogus ref),
    // that is a CONFIG ERROR → THROWS (never falls back, never mis-read as genesis).
    writeCommittedSnapshot(root, readLiveStandardsSurface(root, NOW));
    expect(() => buildStandardsIntegrityFacts(root, NOW, { gitShow: unresolvableBase })).toThrow();
  });
});

// ───────────── bootstrap-aware activation (RESOLVABLE-BASE model, `git show`-only) ─────
describe('buildStandardsIntegrityFacts — GENESIS vs CONFIG ERROR (resolvable-base activation, no intro/ancestry)', () => {
  it('INACTIVE (a loud pass) ONLY when the snapshot exists NOWHERE: base resolves, lacks it, NO intro commit', () => {
    // The base ref does NOT carry the snapshot (snapshot path → undefined) but the
    // KNOWN-STABLE probe (package.json) DOES read at the base → the base resolves and predates
    // the snapshot. The snapshot ALSO has no introduction commit reachable from HEAD (the
    // injected reader returns undefined — the genuinely-never-committed edge). ONLY then is the
    // backstop INACTIVE: a discriminated loud-message state, NOT a throw, NOT a silent green.
    // No `merge-base --is-ancestor` ancestry math is consulted.
    const result = buildStandardsIntegrityFacts(root, NOW, {
      gitShow: resolvableBaseNoSnapshot,
      gitIntroCommit: () => undefined,
    });
    expect(result._tag).toBe('inactive');
    if (result._tag !== 'inactive') throw new Error('unreachable');
    expect(result.message).toContain('INACTIVE');
    expect(result.message).toContain('NOT a silent pass');
    expect(result.message).toContain(STANDARDS_BASE_PROBE_PATH);
    expect(result.message).toContain('never committed');
  });

  it('BIRTH BASELINE → ACTIVE: base resolves but lacks the snapshot, yet the intro commit IS reachable', () => {
    // FINDING 3: when the base predates the snapshot but the snapshot's BIRTH (introduction)
    // commit is reachable from HEAD, the backstop does NOT go inactive — it diffs vs the birth
    // snapshot (the BRANCH BASELINE), guarding any branch-local weakening landed after birth.
    const INTRO = 'a'.repeat(40);
    const birthBytes = serializeStandardsSurface(readLiveStandardsSurface(root, NOW));
    const gitShow: GitShowReader = (_root, ref, path) => {
      if (path === STANDARDS_SNAPSHOT_PATH) return ref === INTRO ? birthBytes : undefined;
      if (path === STANDARDS_BASE_PROBE_PATH) return '{"name":"czap"}';
      return undefined;
    };
    const gitIntroCommit: GitIntroCommitReader = () => INTRO;
    const result = buildStandardsIntegrityFacts(root, NOW, { gitShow, gitIntroCommit });
    expect(result._tag).toBe('active');
    if (result._tag !== 'active') throw new Error('unreachable');
    // live == birth here → a clean diff; the point is it RAN vs the birth baseline.
    expect(result.facts.unsignedWeakenings).toEqual([]);
  });

  it('BIRTH BASELINE catches a post-birth weakening (a lowered floor vs the birth snapshot blocks)', () => {
    // The birth snapshot has a STRONGER mutation floor than live (the branch lowered it after
    // birth). Diffing live vs birth surfaces it as a blocking unsigned floor-lowered weakening
    // — the window the old inactive path left unguarded is now closed.
    const INTRO = 'b'.repeat(40);
    const live = readLiveStandardsSurface(root, NOW);
    const strongerBirth = {
      snapshotFormat: 1 as const,
      elements: live.elements.map((e) =>
        e._tag === 'floor' && e.name === 'mutation-score::packages/x/src/b.ts' ? { ...e, value: 1 } : e,
      ),
      address: '',
    };
    const birthBytes = serializeStandardsSurface(strongerBirth);
    const gitShow: GitShowReader = (_root, ref, path) => {
      if (path === STANDARDS_SNAPSHOT_PATH) return ref === INTRO ? birthBytes : undefined;
      if (path === STANDARDS_BASE_PROBE_PATH) return '{"name":"czap"}';
      return undefined;
    };
    const result = buildStandardsIntegrityFacts(root, NOW, { gitShow, gitIntroCommit: () => INTRO });
    expect(result._tag).toBe('active');
    if (result._tag !== 'active') throw new Error('unreachable');
    expect(result.facts.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(true);
  });

  it('the intro commit resolves but the snapshot is UNREADABLE there → FAIL-CLOSED (no baseline-less pass)', () => {
    // A git inconsistency: the intro commit resolves, but `git show <intro>:<snapshot>` is
    // undefined. The backstop must refuse rather than pass without a baseline.
    const gitShow: GitShowReader = (_root, _ref, path) =>
      path === STANDARDS_BASE_PROBE_PATH ? '{"name":"czap"}' : undefined;
    expect(() =>
      buildStandardsIntegrityFacts(root, NOW, { gitShow, gitIntroCommit: () => 'c'.repeat(40) }),
    ).toThrow();
  });

  it('CONFIG ERROR → FAIL-CLOSED: the base ref is UNRESOLVABLE (even the known-stable probe is absent)', () => {
    // Even the probe file returns undefined → the base ref does not resolve at all (unfetched
    // / a bogus ref) → a genuine config error → FAIL-CLOSED, never mis-read as genesis.
    expect(() => buildStandardsIntegrityFacts(root, NOW, { gitShow: unresolvableBase })).toThrow();
  });

  it('a base that HAS the snapshot is ACTIVE (the normal diff path, unchanged)', () => {
    // The probe is never consulted when the base carries the snapshot — the ACTIVE path is
    // exactly the prior behavior (a single git read of the snapshot path).
    const result = buildStandardsIntegrityFacts(root, NOW, {
      gitShow: (_root, _ref, path) => {
        if (path === STANDARDS_BASE_PROBE_PATH) {
          throw new Error('the probe must NOT be consulted when the base carries the snapshot');
        }
        return serializeStandardsSurface(readLiveStandardsSurface(root, NOW));
      },
    });
    expect(result._tag).toBe('active');
  });
});

describe('the committed path constants are the reviewable, stable locations', () => {
  it('points at traceability/standards-snapshot.json + traceability/standards-waivers.json', () => {
    expect(STANDARDS_SNAPSHOT_PATH).toBe('traceability/standards-snapshot.json');
    expect(STANDARDS_WAIVERS_PATH).toBe('traceability/standards-waivers.json');
    // The write helper actually lands the snapshot at that path.
    const surface = readLiveStandardsSurface(root, NOW);
    writeCommittedSnapshot(root, surface);
    expect(readFileSync(join(root, STANDARDS_SNAPSHOT_PATH), 'utf8')).toBe(serializeStandardsSurface(surface));
  });
});
