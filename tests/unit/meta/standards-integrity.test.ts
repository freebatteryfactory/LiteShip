/**
 * The AGENT-SAFETY META-GAUNTLET (the "raccoon rule"), phase A — the standards
 * backstop's BITE proofs + the committed-snapshot drift gate.
 *
 * "The repairman may be a raccoon with commit access." This suite proves the
 * UNCONDITIONAL COMMIT BACKSTOP actually has teeth:
 *
 *  1. DRIFT — the committed `traceability/standards-snapshot.json` matches the LIVE
 *     standards surface (every change is reviewed; an accidental weakening cannot
 *     pass silently). Regenerate intentionally with `CZAP_UPDATE_STANDARDS_SNAPSHOT=1`.
 *  2. REAL-REPO GREEN — the live standards have NOT been weakened: zero unsigned
 *     weakenings, and the `standardsIntegrityGate` does not block.
 *  3. BITE — a simulated weakening of EACH class (a removed gate, a removed red
 *     fixture, a lowered mutation-score floor, a lowered assurance level, a new
 *     unsigned waiver, a removed invariant) is a blocking unsigned weakening; a
 *     SIGNED one passes; a STRENGTHEN does not block; an always-blocking weakening
 *     can NEVER be signed (forbidden).
 *
 * The simulations mutate an IN-MEMORY copy of the live surface (NEVER the real
 * config), so the proofs are hermetic.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { scaledTimeout } from '../../../vitest.shared.js';
import {
  diffStandardsSurface,
  applyStandardsWaivers,
  ALWAYS_BLOCKING_RULES,
  ASSURANCE_LEVELS,
  standardsIntegrityGate,
  runGates,
  memoryContext,
  type StandardsElement,
  type StandardsWaiver,
} from '@czap/gauntlet';
import {
  readLiveStandardsSurface,
  readCommittedSnapshot,
  serializeStandardsSurface,
  writeCommittedSnapshot,
  buildStandardsIntegrityFacts,
} from '../../../packages/cli/src/lib/standards-surface.js';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
/** A fixed reference date — the proofKind classification is stable regardless of `now`. */
const NOW = new Date('2026-06-22T00:00:00.000Z');
const ALWAYS_BLOCKING = new Set(ALWAYS_BLOCKING_RULES);

/** Apply a mutation to a copy of the live elements, diff vs committed, partition by sign-offs. */
function simulate(
  mutate: (els: StandardsElement[]) => StandardsElement[],
  signoffs: readonly StandardsWaiver[] = [],
): ReturnType<typeof applyStandardsWaivers> {
  const committed = readCommittedSnapshot(REPO_ROOT);
  const live = readLiveStandardsSurface(REPO_ROOT, NOW);
  const weakened = mutate([...live.elements]);
  const changes = diffStandardsSurface(committed.elements, weakened);
  return applyStandardsWaivers(changes, signoffs, NOW, ALWAYS_BLOCKING);
}

describe('standards-snapshot drift gate', () => {
  test('the committed snapshot matches the live standards surface (regenerate with CZAP_UPDATE_STANDARDS_SNAPSHOT=1)', { timeout: scaledTimeout(30_000) }, () => {
    const live = readLiveStandardsSurface(REPO_ROOT, NOW);
    const serialized = serializeStandardsSurface(live);
    if (process.env.CZAP_UPDATE_STANDARDS_SNAPSHOT === '1') {
      writeCommittedSnapshot(REPO_ROOT, live);
      return;
    }
    const committed = serializeStandardsSurface(readCommittedSnapshot(REPO_ROOT));
    expect(
      serialized === committed,
      'The live standards surface drifted from the committed snapshot. If this is an intended change, regenerate it (CZAP_UPDATE_STANDARDS_SNAPSHOT=1) and review the diff — an accidental WEAKENING must never pass silently (the raccoon rule).',
    ).toBe(true);
  });

  test('the live surface address is byte-deterministic (twice → identical)', () => {
    const a = serializeStandardsSurface(readLiveStandardsSurface(REPO_ROOT, NOW));
    const b = serializeStandardsSurface(readLiveStandardsSurface(REPO_ROOT, NOW));
    expect(a).toBe(b);
  });

  test('the diff\'s level ladder matches the canonical ASSURANCE_LEVELS (no drifted private copy)', () => {
    // standards-facts.ts carries a closed LEVEL_LADDER constant (the lean module must
    // not import the engine\'s rank helper into a value position). Pin it to the source
    // of truth so a future level added to ASSURANCE_LEVELS forces the ladder updated.
    expect([...ASSURANCE_LEVELS]).toEqual(['L0', 'L1', 'L2', 'L3', 'L4']);
  });
});

describe('the standards backstop is GREEN on the real repo (the live standards are not weakened)', () => {
  test('zero unsigned weakenings + the committed/live addresses match', () => {
    const facts = buildStandardsIntegrityFacts(REPO_ROOT, NOW);
    expect(facts.unsignedWeakenings).toEqual([]);
    expect(facts.forbiddenSignoffs).toEqual([]);
    expect(facts.expiredSignoffs).toEqual([]);
    expect(facts.committedAddress).toBe(facts.liveAddress);
  });

  test('the standardsIntegrityGate does not block over the real facts', () => {
    const facts = buildStandardsIntegrityFacts(REPO_ROOT, NOW);
    const ctx = { ...memoryContext({}), standards: facts };
    const result = runGates([standardsIntegrityGate], ctx, { now: NOW });
    expect(result.blocked).toBe(false);
  });
});

describe('BITE — each weakening class is caught as a blocking unsigned weakening', () => {
  test('a removed gate', () => {
    const part = simulate((els) =>
      els.filter((e) => !(e._tag === 'gate' && e.ruleId === 'gauntlet/crdt-laws-pinned' && e.set === 'LITESHIP_IR_GATES')),
    );
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'gate-removed')).toBe(true);
  });

  test('a removed red fixture (a gate that no longer self-proves)', () => {
    const part = simulate((els) =>
      els.map((e) =>
        e._tag === 'gate' && e.ruleId === 'gauntlet/no-placeholder' && e.set === 'LITESHIP_GATES'
          ? { ...e, redFixtureCount: 0 }
          : e,
      ),
    );
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'fixture-reduced')).toBe(true);
  });

  test('a lowered mutation-score floor', () => {
    const part = simulate((els) =>
      els.map((e) => (e._tag === 'floor' && e.name.startsWith('mutation-score::') ? { ...e, value: e.value - 0.5 } : e)),
    );
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(true);
  });

  test('a lowered assurance level (an L4 path demoted)', () => {
    const part = simulate((els) =>
      els.map((e) => (e._tag === 'assurance' && e.glob === 'packages/canonical/src/**' ? { ...e, level: 'L2' } : e)),
    );
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'assurance-level-lowered')).toBe(true);
  });

  test('a new unsigned waiver (more is waived)', () => {
    const part = simulate((els) => [
      ...els,
      { _tag: 'waiver', key: 'fake/rule|x|1', ruleId: 'fake/rule', expiry: '2999-01-01' },
    ]);
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'waiver-added')).toBe(true);
  });

  test('a removed invariant', () => {
    const part = simulate((els) => {
      const inv = els.find((e) => e._tag === 'invariant');
      return els.filter((e) => e !== inv);
    });
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'invariant-removed')).toBe(true);
  });
});

describe('BITE — the owner sign-off is the only honest escape (with teeth, never covering a lie)', () => {
  test('a SIGNED removed gate passes (signed + recorded, NOT unsigned)', () => {
    const signoff: StandardsWaiver = {
      elementKey: 'gate::LITESHIP_IR_GATES::gauntlet/crdt-laws-pinned',
      weakening: 'gate-removed',
      owner: 'heyoub',
      justification: 'intentional gate consolidation',
      expiry: '2999-01-01',
    };
    const part = simulate(
      (els) =>
        els.filter(
          (e) => !(e._tag === 'gate' && e.ruleId === 'gauntlet/crdt-laws-pinned' && e.set === 'LITESHIP_IR_GATES'),
        ),
      [signoff],
    );
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'gate-removed')).toBe(false);
    expect(part.signedWeakenings.some((c) => c.weakening === 'gate-removed' && c.owner === 'heyoub')).toBe(true);
  });

  test('an EXPIRED sign-off re-reds (blocks again)', () => {
    const signoff: StandardsWaiver = {
      elementKey: 'gate::LITESHIP_IR_GATES::gauntlet/crdt-laws-pinned',
      weakening: 'gate-removed',
      owner: 'heyoub',
      justification: 'a sign-off that lapsed',
      expiry: '2000-01-01',
    };
    const part = simulate(
      (els) =>
        els.filter(
          (e) => !(e._tag === 'gate' && e.ruleId === 'gauntlet/crdt-laws-pinned' && e.set === 'LITESHIP_IR_GATES'),
        ),
      [signoff],
    );
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'gate-removed')).toBe(true);
    expect(part.expiredSignoffs.length).toBe(1);
  });

  test('an always-blocking weakening can NEVER be signed (the sign-off is VOID)', () => {
    const signoff: StandardsWaiver = {
      elementKey: 'always-blocking::gauntlet/no-placeholder',
      weakening: 'always-blocking-removed',
      owner: 'raccoon',
      justification: 'trust me',
      expiry: '2999-01-01',
    };
    const part = simulate(
      (els) => els.filter((e) => !(e._tag === 'always-blocking' && e.ruleId === 'gauntlet/no-placeholder')),
      [signoff],
    );
    // Still unsigned (blocking) AND a forbidden-sign-off finding was raised.
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'always-blocking-removed')).toBe(true);
    expect(part.forbiddenSignoffs.length).toBe(1);
    expect(part.signedWeakenings).toEqual([]);
  });
});

describe('BITE — a STRENGTHEN never blocks', () => {
  test('an added gate is a strengthen (stale-snapshot warning), not an unsigned weakening', () => {
    const part = simulate((els) => [
      ...els,
      {
        _tag: 'gate',
        ruleId: 'gauntlet/new-extra',
        set: 'LITESHIP_IR_GATES',
        level: 'L3',
        redFixtureCount: 1,
        greenFixtureCount: 1,
        mutationFixtureCount: 1,
      },
    ]);
    expect(part.unsignedWeakenings).toEqual([]);
    expect(part.unregeneratedStrengthens.some((c) => c.changeClass === 'strengthen')).toBe(true);
  });
});
