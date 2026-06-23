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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaledTimeout } from '../../../vitest.shared.js';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
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
  defaultGitShow,
  STANDARDS_BASE_PROBE_PATH,
  STANDARDS_BASE_REF_ENV,
  STANDARDS_DEFAULT_BASE_REF,
  STANDARDS_SNAPSHOT_PATH,
  type GitShowReader,
  type StandardsIntegrityResult,
} from '../../../packages/cli/src/lib/standards-surface.js';

/** Assert the backstop ran (ACTIVE — the base carried the snapshot) and return the facts. */
function activeFacts(result: StandardsIntegrityResult) {
  expect(result._tag, 'expected the backstop to be ACTIVE').toBe('active');
  if (result._tag !== 'active') throw new Error('unreachable: asserted active above');
  return result.facts;
}

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
const committedBaseGitShow: GitShowReader = (_root, _ref, path) =>
  path === STANDARDS_SNAPSHOT_PATH ? serializeStandardsSurface(readCommittedSnapshot(REPO_ROOT)) : '{}';
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
    const facts = activeFacts(buildStandardsIntegrityFacts(REPO_ROOT, NOW, BASE_OPTS));
    expect(facts.unsignedWeakenings).toEqual([]);
    expect(facts.forbiddenSignoffs).toEqual([]);
    expect(facts.expiredSignoffs).toEqual([]);
    expect(facts.committedAddress).toBe(facts.liveAddress);
  });

  test('the standardsIntegrityGate does not block over the real facts', () => {
    const facts = activeFacts(buildStandardsIntegrityFacts(REPO_ROOT, NOW, BASE_OPTS));
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

  test('an UNSIGNED skip-allowlist add still BLOCKS (signable ≠ auto-allowed)', () => {
    // REFINEMENT 2: a capability-gate skip is owner-SIGNABLE, but signable is NOT
    // auto-allowed — WITHOUT a matching sign-off it still blocks as an unsigned weakening.
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
    expect(part.forbiddenSignoffs).toEqual([]); // signable → never a forbidden sign-off.
  });

  test('a skip-allowlist add WITH a matching owner sign-off is SIGNED + recorded (capability-gate skips are owner-signable)', () => {
    // REFINEMENT 2 (the flip): a capability-gate skip is CONDITIONAL (the test runs when the
    // capability is present) + enumerated with an environmental reason — a legitimate,
    // owner-REVIEWABLE weakening. `skip-allowlist-added` was MOVED OUT of
    // NEVER_SIGNABLE_WEAKENINGS, so a matching, in-date sign-off converts it from a blocking
    // unsigned weakening into a recorded signed one (the owner sign-off IS the review gate).
    const signoff: StandardsWaiver = {
      elementKey: "skip-allowlist::tests/unit/fake/ffmpeg-gated.test.ts::it.skip('encode', () => {});",
      weakening: 'skip-allowlist-added',
      owner: 'heyoub',
      justification: 'genuine ffmpeg capability gate — the test runs when ffmpeg is present',
      expiry: '2999-01-01',
    };
    const part = simulate(
      (els) => [
        ...els,
        {
          _tag: 'skip-allowlist',
          file: 'tests/unit/fake/ffmpeg-gated.test.ts',
          site: "it.skip('encode', () => {});",
          capability: 'ffmpeg-absent',
        },
      ],
      [signoff],
    );
    // SIGNED — not unsigned, not forbidden: the honest, reviewed capability-gate escape.
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(false);
    expect(part.forbiddenSignoffs).toEqual([]);
    expect(
      part.signedWeakenings.some((c) => c.weakening === 'skip-allowlist-added' && c.owner === 'heyoub'),
    ).toBe(true);
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

  test('a real before-SHA override (github.event.before for a push) is used verbatim (the whole pushed range)', () => {
    // The push base is the SHA the ref pointed at BEFORE the push — covering the ENTIRE
    // pushed range, not just HEAD~1. The resolver passes a real SHA straight through.
    const beforeSha = 'dbba725a9f6b61fbf1f36ef0db08c5f638b82b60';
    expect(resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: beforeSha })).toBe(beforeSha);
  });

  test('the all-zeros before-SHA (brand-new-branch bootstrap sentinel) is IGNORED → falls through to main', () => {
    // GitHub puts the all-zeros "null commit" in github.event.before for the first push of
    // a brand-new branch (no prior tip). It is NOT a resolvable ref, so the resolver must
    // NOT hand it to `git show` — it falls through to the integration baseline (main),
    // where readBaseSnapshot then fails CLOSED if main lacks the snapshot (never a pass).
    const zero = '0000000000000000000000000000000000000000';
    expect(resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: zero })).toBe(STANDARDS_DEFAULT_BASE_REF);
    // Defense-in-depth: even with a GITHUB_BASE_REF present, the zero-SHA override is
    // dropped and the pull_request-style fall-through applies (origin/<branch>), never the
    // zero ref. (A push run does not set GITHUB_BASE_REF, but the precedence must be exact.)
    expect(
      resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: zero, GITHUB_BASE_REF: 'main' }),
    ).toBe('origin/main');
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

  test('buildStandardsIntegrityFacts fails closed on a CONFIG ERROR (the base ref is UNRESOLVABLE — even the probe is absent)', () => {
    // The CONFIG-ERROR side of bootstrap-aware activation: the base ref does not resolve at
    // all — EVERY path (including the known-stable probe) returns undefined (unfetched / a
    // bogus ref). That must FAIL CLOSED — never fall back to the working snapshot, never be
    // mis-read as genesis.
    const unresolvableBase: GitShowReader = () => undefined;
    expect(() => buildStandardsIntegrityFacts(REPO_ROOT, NOW, { gitShow: unresolvableBase })).toThrow();
  });

  test('buildStandardsIntegrityFacts is INACTIVE (a loud pass) on GENESIS (the base RESOLVES but lacks the snapshot)', () => {
    // The GENESIS side: the base does not carry the snapshot, but the known-stable probe file
    // DOES read at the base → the base commit exists and predates the snapshot (the bootstrap
    // PR vs main). No prior baseline exists → INACTIVE, not a throw, not a green. No intro /
    // ancestry git math — just the second `git show` of the probe.
    const resolvableBaseNoSnapshot: GitShowReader = (_root, _ref, path) =>
      path === STANDARDS_BASE_PROBE_PATH ? '{"name":"czap"}' : undefined;
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, { gitShow: resolvableBaseNoSnapshot });
    expect(result._tag).toBe('inactive');
    if (result._tag !== 'inactive') throw new Error('unreachable');
    expect(result.message).toContain('INACTIVE');
  });

  test('REAL-GIT BOOTSTRAP: the live repo + the REAL defaultGitShow against origin/main → INACTIVE (the bootstrap-PR genesis)', () => {
    // The actual cut-unblocker, over the REAL repo with the REAL default git seam: the
    // snapshot was BORN on this feature branch, so it does NOT exist on origin/main — but
    // origin/main RESOLVES (its package.json reads). The robust probe distinguishes that
    // (genesis → INACTIVE) from a config error using ONLY `git show` — no intro/ancestry git
    // math that the PR merge-checkout cannot satisfy. Skips cleanly if origin/main is not
    // fetched in this environment (then the genuine fail-closed path applies, covered above).
    const probe = defaultGitShow(REPO_ROOT, 'origin/main', STANDARDS_BASE_PROBE_PATH);
    const snapAtBase = defaultGitShow(REPO_ROOT, 'origin/main', STANDARDS_SNAPSHOT_PATH);
    if (probe === undefined || snapAtBase !== undefined) {
      // Environment does not present the bootstrap shape (origin/main unfetched, or it
      // already carries the snapshot post-merge). The hermetic GENESIS test above proves the
      // classification; nothing to assert against an absent/post-merge base here.
      return;
    }
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
      env: { [STANDARDS_BASE_REF_ENV]: 'origin/main' },
      gitShow: defaultGitShow,
    });
    expect(result._tag).toBe('inactive');
    if (result._tag !== 'inactive') throw new Error('unreachable');
    expect(result.baseRef).toBe('origin/main');
    expect(result.message).toContain('INACTIVE');
    expect(result.message).toContain(STANDARDS_BASE_PROBE_PATH);
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

  test('GREEN (the NEW behavior — diff vs the PRIOR BASE ref — CATCHES it as an UNSIGNED weakening)', () => {
    const { base, live } = attackSurfaces();
    // The fix: diff the live surface against the PRIOR, INDEPENDENT base ref (NOT the
    // working snapshot). The skip-allowlist-add surfaces as a weakening versus the base —
    // and it is UNSIGNED here (no sign-off supplied), so it BLOCKS. (It is owner-signABLE in
    // general, but signable ≠ auto-allowed — without a sign-off it still blocks.)
    const newChanges = diffStandardsSurface(base, live);
    const newPart = applyStandardsWaivers(newChanges, [], NOW, ALWAYS_BLOCKING);
    expect(newPart.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
  });

  test('END-TO-END: buildStandardsIntegrityFacts (base-ref sourced) catches the same-commit weakening', () => {
    const { base } = attackSurfaces();
    // Inject the base snapshot via the gitShow seam (the prior, unweakened baseline). The
    // WORKING snapshot on disk is irrelevant to the verdict now — the backstop reads the
    // base ref, not the working file. The unsigned weakening is caught + blocking.
    const baseGitShow: GitShowReader = () =>
      serializeStandardsSurface({ snapshotFormat: 1, elements: base, address: '' });
    const facts = activeFacts(buildStandardsIntegrityFacts(REPO_ROOT, NOW, { gitShow: baseGitShow }));
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

// ──────────────── THE MULTI-COMMIT PUSH GAP — HEAD~1 misses earlier weakenings ──
//
// THE FINDING (codex round-4): the push path set CZAP_STANDARDS_BASE_REF=HEAD~1, which
// only diffs the LAST commit of a push. When a branch is pushed with N commits, a
// weakening introduced in an EARLIER commit is ALREADY PRESENT at HEAD~1 — so the diff
// live-vs-HEAD~1 sees no change and the weakening sails through. The base for a push must
// be `github.event.before` (the SHA the ref pointed at BEFORE the push), which covers the
// WHOLE pushed range. This drill builds a REAL git repo over a real multi-commit push and
// proves RED-before (HEAD~1 misses) / GREEN-after (the before-SHA catches), using the REAL
// `defaultGitShow` (`git show <ref>:…`) — not a hermetic stub.
describe('MULTI-COMMIT PUSH GAP — the push base must be github.event.before, not HEAD~1', () => {
  /** A minimal, valid standards snapshot carrying one `floor` element at a given value. */
  function snapshotWithFloor(value: number): string {
    const elements: StandardsElement[] = [
      { _tag: 'floor', name: 'mutation-score::pkg/a.ts', value, direction: 'higher-is-stronger' },
    ];
    return serializeStandardsSurface({ snapshotFormat: 1, elements, address: '' });
  }

  /** Run a git argv in `repo` via the canonical spawn helper; assert clean exit; return stdout. */
  async function git(repo: string, args: readonly string[]): Promise<string> {
    const res = await spawnArgvCapture('git', args, { cwd: repo });
    expect(res.exitCode, `git ${args.join(' ')} failed: ${res.stderr}`).toBe(0);
    return res.stdout;
  }

  /** Initialize a temp repo with a deterministic, in-repo git identity (no ambient env). */
  async function initRepo(branch: string): Promise<string> {
    const repo = mkdtempSync(join(tmpdir(), 'czap-mc-'));
    mkdirSync(join(repo, 'traceability'), { recursive: true });
    await git(repo, ['init', '-q', '-b', branch]);
    await git(repo, ['config', 'user.name', 't']);
    await git(repo, ['config', 'user.email', 't@t']);
    return repo;
  }

  /** Commit the snapshot bytes at `repo`; return the new HEAD SHA. */
  async function commitSnapshot(repo: string, bytes: string, message: string): Promise<string> {
    writeFileSync(join(repo, STANDARDS_SNAPSHOT_PATH), bytes);
    await git(repo, ['add', STANDARDS_SNAPSHOT_PATH]);
    await git(repo, ['commit', '-q', '-m', message]);
    return (await git(repo, ['rev-parse', 'HEAD'])).trim();
  }

  test('RED: diff vs HEAD~1 MISSES a weakening introduced 2 commits back; GREEN: diff vs the before-SHA CATCHES it', async () => {
    const repo = await initRepo('main');
    try {
      // The PRE-PUSH tip (`before`): the STRONG floor (value 100). This is the SHA the ref
      // pointed at before the push — the true range base.
      const beforeSha = await commitSnapshot(repo, snapshotWithFloor(100), 'c0: strong floor (pre-push tip)');

      // The push delivers TWO commits:
      //   c1 — the WEAKENING: the floor is lowered 100 → 50 (a real erosion).
      //   c2 — an innocuous follow-up that does NOT touch the standards snapshot.
      await commitSnapshot(repo, snapshotWithFloor(50), 'c1: LOWER the floor (the weakening, 2 commits back)');
      writeFileSync(join(repo, 'unrelated.txt'), 'a follow-up commit that does not touch standards\n');
      await git(repo, ['add', 'unrelated.txt']);
      await git(repo, ['commit', '-q', '-m', 'c2: unrelated follow-up']);

      // The LIVE surface at the pushed HEAD already carries the weakened (50) floor.
      const live = readBaseSnapshot(repo, 'HEAD', defaultGitShow);
      expect(live.elements.find((e) => e._tag === 'floor')).toMatchObject({ value: 50 });

      // ── RED (the OLD push base): diff live vs HEAD~1 ──────────────────────────────
      // HEAD~1 is c1 — which ALREADY contains the lowered floor (50). So live (50) vs
      // HEAD~1 (50) shows NO change. The weakening — landed 2 commits back — sails through.
      const head1 = readBaseSnapshot(repo, 'HEAD~1', defaultGitShow);
      expect(head1.elements.find((e) => e._tag === 'floor')).toMatchObject({ value: 50 });
      const oldChanges = diffStandardsSurface(head1.elements, live.elements);
      const oldPart = applyStandardsWaivers(oldChanges, [], NOW, ALWAYS_BLOCKING);
      expect(oldPart.unsignedWeakenings).toEqual([]); // BYPASS: HEAD~1 missed it.

      // ── GREEN (the NEW push base): diff live vs the before-SHA (the whole pushed range) ─
      // `before` is c0 — the STRONG floor (100). live (50) vs before (100) IS a weakening.
      // The resolver passes the real before-SHA straight through (highest authority).
      expect(resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: beforeSha })).toBe(beforeSha);
      const before = readBaseSnapshot(repo, beforeSha, defaultGitShow);
      expect(before.elements.find((e) => e._tag === 'floor')).toMatchObject({ value: 100 });
      const newChanges = diffStandardsSurface(before.elements, live.elements);
      const newPart = applyStandardsWaivers(newChanges, [], NOW, ALWAYS_BLOCKING);
      expect(newPart.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(true); // CAUGHT.
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test('BOOTSTRAP: an all-zeros before-SHA falls through to main (fail-closed if main lacks the snapshot)', async () => {
    // The brand-new-branch first push: github.event.before is the all-zeros sentinel. The
    // resolver must NOT pass it to git — it falls through to main. In a temp repo with no
    // `main` snapshot reachable, the base read FAILS CLOSED (refuse), never a silent pass.
    const repo = await initRepo('feature');
    try {
      await commitSnapshot(repo, snapshotWithFloor(100), 'only commit on a brand-new branch');
      const zero = '0000000000000000000000000000000000000000';
      // The zero-SHA is dropped → resolves to `main`. `main` does not exist here → the base
      // read throws (fail-closed), never falls back to the working snapshot.
      const resolved = resolveStandardsBaseRef({ [STANDARDS_BASE_REF_ENV]: zero });
      expect(resolved).toBe(STANDARDS_DEFAULT_BASE_REF);
      expect(() => readBaseSnapshot(repo, resolved, defaultGitShow)).toThrow();
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
