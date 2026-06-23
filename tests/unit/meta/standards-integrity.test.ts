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
  resolveStandardsBaseRef,
  readBaseSnapshot,
  STANDARDS_BASE_REF_ENV,
  STANDARDS_DEFAULT_BASE_REF,
  type GitShowReader,
} from '../../../packages/cli/src/lib/standards-surface.js';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
/** A fixed reference date — the proofKind classification is stable regardless of `now`. */
const NOW = new Date('2026-06-22T00:00:00.000Z');
const ALWAYS_BLOCKING = new Set(ALWAYS_BLOCKING_RULES);

/**
 * The PRIOR-baseline ground truth the real-repo green path is reviewed AGAINST: the
 * committed working-tree snapshot. On a clean tree the live surface equals it, so a
 * gitShow stub returning these bytes models "the base where the standards were
 * unweakened" — the honest baseline for the green-on-real-repo proofs (the default
 * `main` base may not yet carry the snapshot pre-merge; the backstop fails CLOSED there,
 * which the dedicated fail-closed test covers).
 */
const committedBaseGitShow: GitShowReader = () =>
  serializeStandardsSurface(readCommittedSnapshot(REPO_ROOT));
const BASE_OPTS = { gitShow: committedBaseGitShow } as const;

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
  test('zero unsigned weakenings + the base/live addresses match', () => {
    const facts = buildStandardsIntegrityFacts(REPO_ROOT, NOW, BASE_OPTS);
    expect(facts.unsignedWeakenings).toEqual([]);
    expect(facts.forbiddenSignoffs).toEqual([]);
    expect(facts.expiredSignoffs).toEqual([]);
    expect(facts.committedAddress).toBe(facts.liveAddress);
  });

  test('the standardsIntegrityGate does not block over the real facts', () => {
    const facts = buildStandardsIntegrityFacts(REPO_ROOT, NOW, BASE_OPTS);
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

  test('a NEW sanctioned skip (more is skipped — the always-blocking no-skipped-test floor relaxed)', () => {
    const part = simulate((els) => [
      ...els,
      {
        _tag: 'skip-allowlist',
        file: 'tests/unit/fake/unsanctioned.test.ts',
        site: "it.skip('fake', () => {});",
        capability: 'ffmpeg-absent',
      },
    ]);
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
  });

  test('a skip-allowlist add can NEVER be signed (it relaxes the always-blocking no-skipped-test floor)', () => {
    const signoff: StandardsWaiver = {
      elementKey: "skip-allowlist::tests/unit/fake/unsanctioned.test.ts::it.skip('fake', () => {});",
      weakening: 'skip-allowlist-added',
      owner: 'raccoon',
      justification: 'trust me, this skip is fine',
      expiry: '2999-01-01',
    };
    const part = simulate(
      (els) => [
        ...els,
        {
          _tag: 'skip-allowlist',
          file: 'tests/unit/fake/unsanctioned.test.ts',
          site: "it.skip('fake', () => {});",
          capability: 'ffmpeg-absent',
        },
      ],
      [signoff],
    );
    // The sign-off is VOID: the weakening stays unsigned (blocking) AND a forbidden
    // sign-off is recorded — you cannot sign away a lie, even a skip-shaped one.
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
    expect(part.forbiddenSignoffs.length).toBeGreaterThan(0);
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

// ───────────────────────── the base-ref resolution (deterministic) ────────────
describe('the base ref is resolved deterministically (CI override → PR base → main)', () => {
  test('CZAP_STANDARDS_BASE_REF wins (the explicit override has highest authority)', () => {
    expect(
      resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: 'origin/release-1.2', GITHUB_BASE_REF: 'develop' }),
    ).toBe('origin/release-1.2');
  });

  test('GITHUB_BASE_REF is read as origin/<branch> (the GitHub Actions pull_request base)', () => {
    expect(resolveStandardsBaseRef({ GITHUB_BASE_REF: 'develop' })).toBe('origin/develop');
  });

  test('falls back to the integration default (main) for a local / feature-branch run', () => {
    expect(resolveStandardsBaseRef({})).toBe(STANDARDS_DEFAULT_BASE_REF);
    expect(STANDARDS_DEFAULT_BASE_REF).toBe('main');
  });

  test('a blank/whitespace override is ignored (not treated as a real ref)', () => {
    expect(resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: '   ' })).toBe(STANDARDS_DEFAULT_BASE_REF);
  });
});

// ───────────────────────── the FAIL-CLOSED base read ──────────────────────────
describe('the base snapshot read is FAIL-CLOSED (refuse, never fall back to the working snapshot)', () => {
  test('an unresolvable base (the snapshot absent at the ref) THROWS rather than passing', () => {
    // gitShow returns undefined ⇒ the snapshot does not exist at the base ref. The
    // backstop MUST refuse (the whole point: a same-commit weakening must not be able to
    // make the gate fall back to the working snapshot and pass).
    const absentBase: GitShowReader = () => undefined;
    expect(() => readBaseSnapshot(REPO_ROOT, 'origin/does-not-exist', absentBase)).toThrow();
  });

  test('buildStandardsIntegrityFacts fails closed when the base ref carries no snapshot', () => {
    const absentBase: GitShowReader = () => undefined;
    expect(() => buildStandardsIntegrityFacts(REPO_ROOT, NOW, { gitShow: absentBase })).toThrow();
  });
});

// ──────────────────── THE DRILL SERGEANT — the same-commit bypass is CLOSED ────
//
// THE ATTACK (the finding, tip 69261df8): a raccoon weakens a standard AND
// regenerates+commits the working snapshot to MATCH the weakened live surface, in the
// SAME commit. The OLD backstop diffed live vs the COMMITTED WORKING snapshot → live ==
// working ⇒ NO weakening seen (the bypass). The NEW backstop diffs live vs the PRIOR,
// INDEPENDENT BASE ref → the weakening STILL surfaces even though the working snapshot
// was regenerated to hide it. You cannot sign away a lie by shipping the lie and its
// cover-up together.
describe('DRILL SERGEANT — the same-commit code+snapshot bypass is CLOSED', () => {
  // Build the attack from the REAL live surface. The BASE (prior, unweakened) omits ONE
  // real sanctioned-skip element; the LIVE surface (and the regenerated WORKING snapshot
  // that matches it) BOTH carry it — so versus the base it is a `skip-allowlist-added`
  // weakening, which is NEVER signable (the meta-analogue of "you cannot waive a lie").
  function attackSurfaces(): {
    base: StandardsElement[];
    workingSnapshot: StandardsElement[];
    live: StandardsElement[];
  } {
    const live = [...readLiveStandardsSurface(REPO_ROOT, NOW).elements];
    const skip = live.find((e) => e._tag === 'skip-allowlist');
    expect(skip, 'the live surface must carry at least one sanctioned skip for this drill').toBeDefined();
    // The PRIOR base did NOT have this sanctioned skip (the unweakened baseline).
    const base = live.filter((e) => e !== skip);
    // The cover-up: the WORKING snapshot was regenerated to MATCH the weakened live (so it
    // ALSO carries the new skip). live == workingSnapshot — the same-commit attack.
    const workingSnapshot = [...live];
    return { base, workingSnapshot, live };
  }

  test('RED (the OLD behavior — diff vs the WORKING snapshot — BYPASSES the weakening)', () => {
    const { workingSnapshot, live } = attackSurfaces();
    // Reproduce the OLD `buildStandardsIntegrityFacts`: diff the live surface against the
    // just-committed WORKING snapshot. Because the cover-up made working == live, the diff
    // is EMPTY → no weakening → the raccoon walked. THIS is the bug the fix closes.
    const oldChanges = diffStandardsSurface(workingSnapshot, live);
    const oldPart = applyStandardsWaivers(oldChanges, [], NOW, ALWAYS_BLOCKING);
    expect(oldPart.unsignedWeakenings).toEqual([]); // BYPASS: the lie passed.
  });

  test('GREEN (the NEW behavior — diff vs the PRIOR BASE ref — CATCHES it as never-signable)', () => {
    const { base, live } = attackSurfaces();
    // The fix: diff the live surface against the PRIOR, INDEPENDENT base ref (NOT the
    // working snapshot). The skip-allowlist-add surfaces as a weakening versus the base —
    // and it is NEVER signable (it relaxes the always-blocking no-skipped-test floor).
    const newChanges = diffStandardsSurface(base, live);
    const newPart = applyStandardsWaivers(newChanges, [], NOW, ALWAYS_BLOCKING);
    expect(newPart.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
  });

  test('END-TO-END: buildStandardsIntegrityFacts (base-ref sourced) catches the same-commit weakening', () => {
    const { base } = attackSurfaces();
    // Inject the base snapshot via the gitShow seam (the prior, unweakened baseline). The
    // WORKING snapshot on disk is irrelevant to the verdict now — the backstop reads the
    // base ref, not the working file. The never-signable weakening is caught + blocking.
    const baseGitShow: GitShowReader = () =>
      serializeStandardsSurface({ snapshotFormat: 1, elements: base, address: '' });
    const facts = buildStandardsIntegrityFacts(REPO_ROOT, NOW, { gitShow: baseGitShow });
    expect(facts.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
    const ctx = { ...memoryContext({}), standards: facts };
    expect(runGates([standardsIntegrityGate], ctx, { now: NOW }).blocked).toBe(true);
  });

  test('a same-commit STRENGTHEN (legit regeneration) is NOT a false weakening', () => {
    // The legitimate path preserved: an intentional STRENGTHENING committed together with
    // its regenerated snapshot. The base lacks a NEW gate; live (and the regenerated
    // working snapshot) carry it → versus the base it is a strengthen, never blocking.
    const live = [...readLiveStandardsSurface(REPO_ROOT, NOW).elements];
    const extraGate: StandardsElement = {
      _tag: 'gate',
      ruleId: 'gauntlet/new-stricter-gate',
      set: 'LITESHIP_IR_GATES',
      level: 'L4',
      redFixtureCount: 1,
      greenFixtureCount: 1,
      mutationFixtureCount: 1,
    };
    const liveStrengthened = [...live, extraGate];
    // The base is the prior surface WITHOUT the new gate.
    const baseGitShow: GitShowReader = () =>
      serializeStandardsSurface({ snapshotFormat: 1, elements: live, address: '' });
    // Diff the strengthened live against the prior base → a strengthen, not a weakening.
    const changes = diffStandardsSurface(
      JSON.parse(baseGitShow(REPO_ROOT, 'base', 'p')!).elements as StandardsElement[],
      liveStrengthened,
    );
    const part = applyStandardsWaivers(changes, [], NOW, ALWAYS_BLOCKING);
    expect(part.unsignedWeakenings).toEqual([]);
    expect(part.unregeneratedStrengthens.some((c) => c.changeClass === 'strengthen')).toBe(true);
  });
});
