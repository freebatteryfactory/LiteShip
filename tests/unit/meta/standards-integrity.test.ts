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
  siteCarriesPlaceholderMarker,
  sanctionedSkipFor,
  PLACEHOLDER_SKIP_MARKERS,
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
  readStandardsWaivers,
  defaultGitShow,
  STANDARDS_BASE_PROBE_PATH,
  STANDARDS_BASE_REF_ENV,
  STANDARDS_DEFAULT_BASE_REF,
  STANDARDS_SNAPSHOT_PATH,
  type GitShowReader,
  type GitIntroCommitReader,
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

  test('buildStandardsIntegrityFacts is INACTIVE ONLY when the snapshot has NO intro commit anywhere (the never-committed edge)', () => {
    // FINDING 3: the base resolves but lacks the snapshot AND the snapshot has NO introduction
    // commit reachable from HEAD (the injected reader returns undefined — genuinely never
    // committed). ONLY then is the backstop INACTIVE — a loud pass, not a throw, not a green.
    // (Without the explicit gitIntroCommit override, the REAL repo WOULD resolve the birth
    // commit and run ACTIVE — proven in the next test.)
    const resolvableBaseNoSnapshot: GitShowReader = (_root, _ref, path) =>
      path === STANDARDS_BASE_PROBE_PATH ? '{"name":"czap"}' : undefined;
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
      gitShow: resolvableBaseNoSnapshot,
      gitIntroCommit: () => undefined,
    });
    expect(result._tag).toBe('inactive');
    if (result._tag !== 'inactive') throw new Error('unreachable');
    expect(result.message).toContain('INACTIVE');
    expect(result.message).toContain('never committed');
  });

  test('REAL-GIT BOOTSTRAP: the live repo + the REAL git seams against origin/main → ACTIVE (diffs vs the snapshot BIRTH), 17 signed', () => {
    // THE CUT-UNBLOCKER, over the REAL repo with the REAL default git seams: the snapshot was
    // BORN on this feature branch, so it does NOT exist on origin/main — but origin/main
    // RESOLVES (its package.json reads) AND the snapshot's BIRTH (introduction) commit is
    // reachable from HEAD (under fetch-depth:0). FINDING 3 makes the backstop ACTIVE (diffing
    // vs the birth snapshot), NOT inactive — and the committed 17 owner sign-offs convert every
    // branch-local weakening to signed, so the gate does NOT block. Skips cleanly if origin/main
    // is unfetched, the base already carries the snapshot (post-merge), or the birth commit is
    // unreachable in this checkout (the hermetic birth-baseline tests prove the classification).
    const probe = defaultGitShow(REPO_ROOT, 'origin/main', STANDARDS_BASE_PROBE_PATH);
    const snapAtBase = defaultGitShow(REPO_ROOT, 'origin/main', STANDARDS_SNAPSHOT_PATH);
    if (probe === undefined || snapAtBase !== undefined) return;
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
      env: { [STANDARDS_BASE_REF_ENV]: 'origin/main' },
      gitShow: defaultGitShow,
    });
    // If the birth commit is not reachable here, the result is inactive (the never-committed
    // edge) — accept that environment; otherwise it MUST be ACTIVE with zero unsigned (17 signed).
    if (result._tag === 'inactive') {
      expect(result.message).toContain('INACTIVE');
      return;
    }
    expect(result._tag).toBe('active');
    expect(result.facts.unsignedWeakenings).toEqual([]);
    expect(result.facts.forbiddenSignoffs).toEqual([]);
    expect(result.facts.expiredSignoffs).toEqual([]);
    // The 17 committed sign-offs are exactly the live-vs-birth weakenings.
    expect(result.facts.signedWeakenings.length).toBe(readStandardsWaivers(REPO_ROOT).length);
    const ctx = { ...memoryContext({}), standards: result.facts };
    expect(runGates([standardsIntegrityGate], ctx, { now: NOW }).blocked).toBe(false);
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
  // A FAKE, UNSIGNED capability-gate skip the attack ADDS to live — NOT one of the committed
  // owner sign-offs (so the END-TO-END path, which reads the real sign-offs off disk, still
  // sees it as UNSIGNED). It names a capability (no placeholder marker), so it is owner-
  // signABLE in general; signable ≠ auto-allowed — without a sign-off it blocks.
  const ATTACK_SKIP: StandardsElement = {
    _tag: 'skip-allowlist',
    file: 'tests/unit/fake/drill-sergeant-attack.test.ts',
    site: "it.skip('ffmpeg render probe failed — codec absent', () => {});",
    capability: 'ffmpeg-absent',
  };

  // Build the attack from the REAL live surface. The BASE (prior, unweakened) LACKS the fake
  // attack skip; the LIVE surface (and the regenerated WORKING snapshot that matches it) BOTH
  // carry it — so versus the base it is a `skip-allowlist-added` weakening, UNSIGNED here.
  function attackSurfaces(): {
    base: StandardsElement[];
    workingSnapshot: StandardsElement[];
    live: StandardsElement[];
  } {
    const realLive = [...readLiveStandardsSurface(REPO_ROOT, NOW).elements];
    // The PRIOR base is the real surface WITHOUT the fake attack skip (the unweakened baseline).
    const base = realLive;
    // The weakened live carries the fake unsigned skip.
    const live = [...realLive, ATTACK_SKIP];
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
    // The extractor reads the REAL live surface off disk; we cannot inject a fake into it, so
    // the weakening is modelled in the BASE: a STRONGER mutation-score floor at the base than
    // live carries → the real live is a `floor-lowered` weakening vs the base, UNSIGNED (no
    // committed sign-off covers an artificially-raised floor). The WORKING snapshot on disk is
    // irrelevant — the backstop reads the base ref, not the working file. Caught + blocking.
    const live = readLiveStandardsSurface(REPO_ROOT, NOW);
    const aFloor = live.elements.find((e) => e._tag === 'floor');
    expect(aFloor, 'the live surface must carry a floor for this drill').toBeDefined();
    const strongerBase = live.elements.map((e) =>
      e._tag === 'floor' && aFloor !== undefined && e.name === aFloor.name
        ? { ...e, value: e.direction === 'higher-is-stronger' ? e.value + 0.5 : e.value - 1 }
        : e,
    );
    const baseGitShow: GitShowReader = () =>
      serializeStandardsSurface({ snapshotFormat: 1, elements: strongerBase, address: '' });
    const facts = activeFacts(buildStandardsIntegrityFacts(REPO_ROOT, NOW, { gitShow: baseGitShow }));
    expect(facts.unsignedWeakenings.some((c) => c.weakening === 'floor-lowered')).toBe(true);
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

// ───────────── FINDING 2 — a PLACEHOLDER skip can NEVER be sign-sanctioned ─────────
//
// THE ATTACK (codex round-5): the sanction is keyed by exact (file, site) with NO check
// that the site is a REAL capability gate, so `it.skip("TODO: not implemented", () => {})`
// + a sign-off partitioned as a SIGNED weakening (the hole). The legit sanctioned skips are
// runtime-gated (the conditionality lives in an enclosing `if` / `skipIf` / `cap ? it :
// it.skip`, NOT in the skip CALL), so a "require conditionality" check would FALSELY reject
// them. The CORRECT floor: reject any signable skip whose SITE/TITLE carries a PLACEHOLDER
// MARKER (TODO / FIXME / XXX / HACK / "not implemented" / unimplemented / stub / placeholder
// / wip). A genuine capability-gate skip names a CAPABILITY, never a placeholder tell.
describe('FINDING 2 — a placeholder-marker skip is NON-sanctionable + NON-signable (the lie can never be signed away)', () => {
  test('the marker vocabulary covers the no-placeholder family + the prose tells', () => {
    // The vocabulary is the always-blocking no-placeholder family (TODO/FIXME/XXX/HACK)
    // WIDENED with the skip-title prose tells. Pinned so a future narrowing is caught.
    for (const m of ['TODO', 'FIXME', 'XXX', 'HACK', 'not implemented', 'unimplemented', 'stub', 'placeholder', 'wip']) {
      expect(PLACEHOLDER_SKIP_MARKERS).toContain(m);
    }
  });

  test('siteCarriesPlaceholderMarker fires on every placeholder tell (case-insensitive)', () => {
    expect(siteCarriesPlaceholderMarker("it.skip('TODO: not implemented', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('fixme later', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('XXX broken', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('a HACK for now', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('stub', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('placeholder body', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('WIP — coming soon', () => {})")).toBe(true);
    expect(siteCarriesPlaceholderMarker("it.skip('unimplemented path', () => {})")).toBe(true);
  });

  test('a genuine capability-gate site (named by capability) NEVER trips the marker (no false reject)', () => {
    // The legit forms: a skipIf guard, a `cap ? it : it.skip` alias, a runIf, a
    // capability-named title. None carry a placeholder tell — the floor must not bite them.
    const legit = [
      "describe.skipIf(!canUseSAB)('browser SPSCRing with real SharedArrayBuffer and Atomics', () => {",
      'const renderIt = FFMPEG_RENDER_CAPABLE ? it : it.skip;',
      "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});",
      "it.skip('ffmpeg+libx264 render (skipped — codec not on PATH)', () => {",
      "describe.skipIf(!wasmPresent)('WASM/TS kernel parity (czap-compute vs fallbackKernels)', () => {",
    ];
    for (const s of legit) expect(siteCarriesPlaceholderMarker(s)).toBe(false);
    // The whole-word floor: a banned token EMBEDDED in an identifier never false-trips.
    expect(siteCarriesPlaceholderMarker("it('a swipe gesture stubbornly resists todos-list', () => {")).toBe(false);
  });

  test('EVERY enumerated SANCTIONED skip is marker-free (none of the 15 is mis-shaped as a placeholder)', () => {
    // The live extractor's sanctioned skips must all pass the floor — else the floor would
    // false-reject a real capability gate. Re-derive from the live surface.
    const skips = readLiveStandardsSurface(REPO_ROOT, NOW).elements.filter((e) => e._tag === 'skip-allowlist');
    expect(skips.length).toBeGreaterThan(0);
    for (const s of skips) {
      if (s._tag !== 'skip-allowlist') continue;
      expect(siteCarriesPlaceholderMarker(s.site), `sanctioned site must be marker-free: ${s.site}`).toBe(false);
    }
  });

  test('sanctioning path: a marker-bearing site is NON-sanctionable even if it were enumerated', () => {
    // `sanctionedSkipFor` rejects a placeholder site outright — a hand-edited SANCTIONED_SKIPS
    // entry carrying a TODO can never be sanctioned past the always-blocking no-placeholder
    // floor. (We can't add to the closed SANCTIONED_SKIPS here; the rejection is unconditional
    // on the SITE, so a placeholder site returns undefined regardless of the file.)
    expect(sanctionedSkipFor('tests/unit/fake/x.test.ts', "it.skip('TODO: not implemented', () => {})")).toBeUndefined();
  });

  test('RED→GREEN partition: a placeholder skip-allowlist-add + a sign-off stays BLOCKING (the marker rejection)', () => {
    // RED (the OLD hole): a placeholder skip + a matching sign-off would partition as a SIGNED
    // weakening. NEW: the standards weakening partition rejects a skip-allowlist-add whose SITE
    // carries a placeholder marker — it stays in unsignedWeakenings (blocking), never signed,
    // AND the sign-off that tried to cover it is recorded as a forbidden (void) sign-off.
    const file = 'tests/unit/fake/placeholder.test.ts';
    const site = "it.skip('TODO: not implemented', () => {});";
    const placeholderEl: StandardsElement = { _tag: 'skip-allowlist', file, site, capability: 'ffmpeg-absent' };
    const elementKey = `skip-allowlist::${file}::${site}`;
    const signoff: StandardsWaiver = {
      elementKey,
      weakening: 'skip-allowlist-added',
      owner: 'raccoon',
      justification: 'pretend this is a capability gate',
      expiry: '2999-01-01',
    };
    const part = simulate((els) => [...els, placeholderEl], [signoff]);
    // STILL blocking — the placeholder marker makes it non-signable; the sign-off is VOID.
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
    expect(part.signedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(false);
    expect(part.forbiddenSignoffs.some((f) => f.elementKey === elementKey)).toBe(true);
  });

  test('GREEN: a capability-named skip-allowlist-add + a sign-off IS signed (legit, no marker)', () => {
    // The flip: a genuine capability-gate skip (named by capability, no placeholder tell) + a
    // matching sign-off partitions as a SIGNED weakening — the honest, reviewable escape.
    const file = 'tests/unit/fake/ffmpeg.test.ts';
    const site = "it.skip('ffmpeg probe failed — codec not on PATH', () => {});";
    const legitEl: StandardsElement = { _tag: 'skip-allowlist', file, site, capability: 'ffmpeg-absent' };
    const elementKey = `skip-allowlist::${file}::${site}`;
    const signoff: StandardsWaiver = {
      elementKey,
      weakening: 'skip-allowlist-added',
      owner: 'heyoub',
      justification: 'genuine ffmpeg capability gate',
      expiry: '2999-01-01',
    };
    const part = simulate((els) => [...els, legitEl], [signoff]);
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(false);
    expect(part.signedWeakenings.some((c) => c.weakening === 'skip-allowlist-added' && c.owner === 'heyoub')).toBe(true);
    expect(part.forbiddenSignoffs).toEqual([]);
  });
});

// ───────────── FINDING 3 — the BIRTH BASELINE (genesis resolves to the intro commit) ─────
//
// THE ATTACK (codex round-5): CI sets CZAP_STANDARDS_BASE_REF=origin/main; origin/main
// predates the snapshot (born on the branch), so the OLD bootstrap path went INACTIVE and
// the script passed WITHOUT diffing — a window where a branch-local weakening was unguarded.
// THE FIX: when the base resolves but lacks the snapshot, diff vs the snapshot's BIRTH
// (introduction) commit, reachable from HEAD — NOT inactive. `inactive` now applies ONLY if
// the snapshot exists NOWHERE in HEAD's history (no intro commit). NO ancestry math.
describe('FINDING 3 — the bootstrap base resolves to the snapshot BIRTH commit (ACTIVE, not inactive)', () => {
  /** A gitShow that has the probe but NOT the snapshot at the base, and serves `birth` at the intro commit. */
  function bootstrapGitShow(introCommit: string, birthBytes: string): GitShowReader {
    return (_root, ref, path) => {
      if (path === STANDARDS_SNAPSHOT_PATH) {
        // The base lacks the snapshot; ONLY the intro commit serves it.
        return ref === introCommit ? birthBytes : undefined;
      }
      // The known-stable probe reads at the base (the base resolves).
      if (path === STANDARDS_BASE_PROBE_PATH) return '{"name":"czap"}';
      return undefined;
    };
  }

  test('base RESOLVES but lacks the snapshot + an intro commit IS reachable → ACTIVE (diffs vs birth, NOT inactive)', () => {
    // The bootstrap-PR shape: origin/main resolves (probe reads) but predates the snapshot,
    // and the snapshot's birth commit is reachable from HEAD. The backstop is ACTIVE and
    // diffs vs the birth snapshot — guarding any branch-local weakening landed after birth.
    const INTRO = 'a'.repeat(40);
    const birthBytes = serializeStandardsSurface(readLiveStandardsSurface(REPO_ROOT, NOW));
    const introReader: GitIntroCommitReader = () => INTRO;
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
      env: { [STANDARDS_BASE_REF_ENV]: 'origin/main' },
      gitShow: bootstrapGitShow(INTRO, birthBytes),
      gitIntroCommit: introReader,
    });
    // ACTIVE — NOT inactive. (live == birth here → a clean diff; the point is it RAN.)
    expect(result._tag).toBe('active');
    if (result._tag !== 'active') throw new Error('unreachable');
    expect(result.facts.unsignedWeakenings).toEqual([]);
  });

  test('a branch-local WEAKENING after birth is CAUGHT vs the birth baseline (the unguarded window is closed)', () => {
    // The birth snapshot is the REAL live surface; the branch then ADDS a FAKE, UNSIGNED
    // capability-gate skip AFTER birth (not one of the committed 17 sign-offs). Diffing live
    // vs birth surfaces it as an unsigned skip-allowlist-added weakening → BLOCKING. The OLD
    // inactive path would have MISSED it (the window the fix closes). The fake skip names a
    // capability (no placeholder marker), so it would be signABLE — but it is unsigned here.
    const INTRO = 'b'.repeat(40);
    const birthElements = [...readLiveStandardsSurface(REPO_ROOT, NOW).elements];
    const fakeSkip: StandardsElement = {
      _tag: 'skip-allowlist',
      file: 'tests/unit/fake/post-birth-weakening.test.ts',
      site: "it.skip('wasm parity — artifact absent', () => {});",
      capability: 'wasm-absent',
    };
    const birthBytes = serializeStandardsSurface({ snapshotFormat: 1, elements: birthElements, address: '' });
    // The LIVE surface the extractor reads off disk does NOT carry the fake skip; to model the
    // post-birth add we diff a LIVE that has it. We exercise the FULL extractor path by making
    // the BIRTH baseline the live-minus-fake and verifying the extractor's live (== birth here)
    // is clean, THEN prove the catch with an explicit live+fake diff against the same birth.
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
      env: { [STANDARDS_BASE_REF_ENV]: 'origin/main' },
      gitShow: bootstrapGitShow(INTRO, birthBytes),
      gitIntroCommit: () => INTRO,
    });
    expect(result._tag).toBe('active'); // it RAN vs birth (live == birth → clean)
    if (result._tag !== 'active') throw new Error('unreachable');
    expect(result.facts.unsignedWeakenings).toEqual([]);
    // Now the post-birth weakening: diff birth vs (live + the fake unsigned skip). It is caught
    // as a blocking unsigned weakening — the unguarded bootstrap window is closed.
    const changes = diffStandardsSurface(birthElements, [...birthElements, fakeSkip]);
    const part = applyStandardsWaivers(changes, readStandardsWaivers(REPO_ROOT), NOW, ALWAYS_BLOCKING);
    expect(part.unsignedWeakenings.some((c) => c.weakening === 'skip-allowlist-added')).toBe(true);
    const ctx = { ...memoryContext({}), standards: { ...part, committedAddress: 'x', liveAddress: 'y' } };
    expect(runGates([standardsIntegrityGate], ctx, { now: NOW }).blocked).toBe(true);
  });

  test('INACTIVE only when the snapshot exists NOWHERE in HEAD history (no intro commit) — the unreachable-in-practice edge', () => {
    // The genuinely-never-committed edge: the base resolves but lacks the snapshot AND the
    // intro-commit reader returns undefined (the file was never committed anywhere). ONLY then
    // is the backstop inactive — a loud pass. In practice (any branch carrying the snapshot)
    // this never fires; the birth baseline applies.
    const result = buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
      env: { [STANDARDS_BASE_REF_ENV]: 'origin/main' },
      gitShow: (_root, _ref, path) => (path === STANDARDS_BASE_PROBE_PATH ? '{"name":"czap"}' : undefined),
      gitIntroCommit: () => undefined,
    });
    expect(result._tag).toBe('inactive');
    if (result._tag !== 'inactive') throw new Error('unreachable');
    expect(result.message).toContain('INACTIVE');
    expect(result.message).toContain('never committed');
  });

  test('a CONFIG ERROR (base UNRESOLVABLE — even the probe absent) still FAILS CLOSED (not birth, not inactive)', () => {
    // The intro-commit path must NOT mask a config error: if even the probe is undefined, the
    // base ref does not resolve at all → fail-closed, regardless of the intro reader.
    expect(() =>
      buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
        gitShow: () => undefined,
        gitIntroCommit: () => 'c'.repeat(40),
      }),
    ).toThrow();
  });

  test('an intro commit that resolves but whose snapshot is unreadable AT it FAILS CLOSED (no baseline-less pass)', () => {
    // A git inconsistency: the intro commit resolves, but `git show <intro>:<snapshot>` is
    // empty. The backstop must refuse rather than pass without a baseline.
    expect(() =>
      buildStandardsIntegrityFacts(REPO_ROOT, NOW, {
        env: { [STANDARDS_BASE_REF_ENV]: 'origin/main' },
        gitShow: (_root, _ref, path) => (path === STANDARDS_BASE_PROBE_PATH ? '{"name":"czap"}' : undefined),
        gitIntroCommit: () => 'd'.repeat(40),
      }),
    ).toThrow();
  });
});

// ───────────── FINDING 3 — the LIVE 17 sign-offs convert vs the snapshot birth ───────────
//
// The ground-truth proof: diffing the LIVE surface vs the snapshot's REAL birth commit
// (the intro commit, resolved by the REAL git seam) yields EXACTLY 17 weakenings, and the
// committed 17 owner sign-offs convert ALL of them to signed (zero unsigned). An 18th,
// unsigned fake skip BLOCKS. This is the real-repo cut-gate proof, not a hermetic stub.
describe('FINDING 3 — the committed 17 sign-offs are EXACTLY the live-vs-birth weakenings (and an 18th blocks)', () => {
  /**
   * Resolve the snapshot's real introduction commit over the LIVE git history (via the
   * canonical spawn helper — no `node:child_process` import), then read the birth snapshot's
   * elements at it. Returns undefined if the birth commit is not reachable in this checkout.
   */
  async function realBirthElements(): Promise<readonly StandardsElement[] | undefined> {
    // A SHALLOW checkout (the platform smoke runners use a default depth-1 clone) cannot
    // reach the snapshot's real introduction commit: `git log --diff-filter=A` mis-reports
    // the shallow BOUNDARY commit as the "birth" (git cannot see before the boundary, so the
    // file looks newly-added there) — a wrong, recent baseline, not undefined. This real-repo
    // invariant is OS-independent, so it runs authoritatively on the full-history runner
    // (truth-linux, fetch-depth:0) and skips cleanly when the clone is shallow.
    const shallow = await spawnArgvCapture('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: REPO_ROOT,
    });
    if (shallow.exitCode !== 0 || shallow.stdout.trim() === 'true') return undefined;
    const res = await spawnArgvCapture(
      'git',
      ['log', '--diff-filter=A', '--format=%H', '--reverse', '--', STANDARDS_SNAPSHOT_PATH],
      { cwd: REPO_ROOT },
    );
    if (res.exitCode !== 0) return undefined;
    const introCommit = res.stdout.split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
    if (introCommit === '') return undefined;
    const birthRaw = defaultGitShow(REPO_ROOT, introCommit, STANDARDS_SNAPSHOT_PATH);
    if (birthRaw === undefined) return undefined;
    return JSON.parse(birthRaw).elements as readonly StandardsElement[];
  }

  test('the 17 committed sign-offs convert every live-vs-birth weakening to signed (zero unsigned)', async () => {
    const birth = await realBirthElements();
    if (birth === undefined) return; // the birth commit is not reachable in this checkout
    const live = readLiveStandardsSurface(REPO_ROOT, NOW);
    const signoffs = readStandardsWaivers(REPO_ROOT);
    const changes = diffStandardsSurface(birth, live.elements);
    const part = applyStandardsWaivers(changes, signoffs, NOW, new Set(ALWAYS_BLOCKING_RULES));
    expect(part.unsignedWeakenings).toEqual([]);
    expect(part.forbiddenSignoffs).toEqual([]);
    expect(part.expiredSignoffs).toEqual([]);
    // Every committed sign-off is load-bearing: the live-vs-birth diff produces exactly the
    // signed set (no orphan sign-off, no unsigned weakening).
    expect(part.signedWeakenings.length).toBe(signoffs.length);
  });

  test('an 18th UNSIGNED fake skip (a probe) BLOCKS vs the birth baseline (the no-grandfather floor)', async () => {
    const birth = await realBirthElements();
    if (birth === undefined) return;
    const live = [...readLiveStandardsSurface(REPO_ROOT, NOW).elements];
    const fake18th: StandardsElement = {
      _tag: 'skip-allowlist',
      file: 'tests/unit/fake/an-eighteenth-unsigned-skip.test.ts',
      site: "it.skip('an unsigned capability gate probe', () => {});",
      capability: 'ffmpeg-absent',
    };
    const signoffs = readStandardsWaivers(REPO_ROOT); // the committed 17 — NOT covering the 18th.
    const changes = diffStandardsSurface(birth, [...live, fake18th]);
    const part = applyStandardsWaivers(changes, signoffs, NOW, new Set(ALWAYS_BLOCKING_RULES));
    // The 18th is unsigned → blocking; the original 17 are still signed.
    expect(part.unsignedWeakenings.some((c) => c.elementKey.includes('an-eighteenth-unsigned-skip'))).toBe(true);
    const ctx = { ...memoryContext({}), standards: { ...part, committedAddress: 'x', liveAddress: 'y' } };
    expect(runGates([standardsIntegrityGate], ctx, { now: NOW }).blocked).toBe(true);
  });
});
