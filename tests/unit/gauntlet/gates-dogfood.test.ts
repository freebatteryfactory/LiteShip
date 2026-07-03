/**
 * Dogfood — the built-in hygiene gates, run on the REAL repo.
 *
 * Like {@link ../gauntlet/dogfood.test.ts} for `noBareThrowGate`, this points each
 * gate at the live `packages/&#42;/src` tree through {@link nodeContext} and asserts
 * its value on the actual repo. Two kinds of pin live here, and the choice of pin
 * is itself the discipline:
 *
 *  ZERO-FLOOR gates (`no-ts-ignore`, `no-skipped-test`, `no-placeholder`) — these
 *    are clean on product source, so the pin is ZERO. A single regression reds the
 *    test and lists the offending `file:line`. `no-skipped-test` + `no-placeholder`
 *    are the two ALWAYS-BLOCKING rules (their ids are reserved in
 *    ALWAYS_BLOCKING_RULES): a skip or a placeholder directive can NEVER be waived,
 *    so a zero floor is the only acceptable state.
 *
 *  LAW-PINNED gates (`no-nondeterminism`, `no-silent-catch`) — these carry a real,
 *    actively-cured L1/L2 backlog (command-surface receipt timestamps; best-effort
 *    catches) that OTHER slices are paying down. Pinning the brittle raw line list
 *    would flap on every unrelated cure, so instead we pin the LAW: the
 *    LEVEL-SCOPED set (computed through the engine with the assurance map), which is
 *    what actually decides blocking authority. After the clock/rng substrate cure
 *    the L3 no-nondeterminism set is EXACTLY the three declared entropy boundaries
 *    (`systemClock` monotonic / `wallClock` epoch / `systemRng`, each waived), and
 *    the L3 no-silent-catch set is EXACTLY the four declared-benign catches (each
 *    waived). That collapse is the proof the cure landed.
 *
 * A dedicated `it` also guards the gate-extension: the no-nondeterminism gate must
 * detect ambient `performance.now()` (the monotonic-clock read), not just Date.now.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  noTsIgnoreGate,
  noNondeterminismGate,
  noSilentCatchGate,
  noSkippedTestGate,
  noPlaceholderGate,
  verifyGate,
  nodeContext,
  runGates,
  LITESHIP_ASSURANCE_MAP,
  memoryContext,
  type Gate,
} from '@czap/gauntlet';

// Resolve the repo root from THIS file's location (tests/unit/gauntlet/…), so
// the run is independent of the process cwd — deterministic by construction.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

// The scope: every package's TypeScript source.
const GLOBS = ['packages/*/src/**/*.ts'] as const;

/** Render a finding as a stable `file:line` token (for the diff + the listing). */
function locOf(file: string | undefined, line: number | undefined): string {
  return `${file ?? '<no-file>'}:${line ?? 0}`;
}

/**
 * The pinned, sorted `file:line` backlog each gate surfaces on the repo —
 * ZERO-floor gates only. A zero-floor gate has a STABLE pin (zero is zero); a gate
 * with a non-empty, actively-being-cured raw backlog (no-nondeterminism,
 * no-silent-catch) is pinned by its LAW (the level-scoped set), not by a brittle
 * raw line list that drifts every time another slice cures one (see the dedicated
 * `it`s below). Hardcoding a volatile raw list would make this test flap on every
 * unrelated cure — the source of truth is the LEVEL-SCOPED set, computed through
 * the engine, which is what actually decides blocking authority.
 */
const ZERO_FLOOR_GATES: ReadonlyArray<readonly [string, Gate]> = [
  // ZERO real @ts-ignore / @ts-nocheck directives in product code (a clean floor).
  ['gauntlet/no-ts-ignore', noTsIgnoreGate],
  // ZERO real skipped tests (.skip / .todo / x-prefixed CALLS) in packages/*/src —
  // every test runs; the only textual mentions are the harness's own anti-skip
  // prose, which the codeOnly scan correctly ignores. Always-blocking, so a single
  // skip slipping into product source must red this immediately.
  ['gauntlet/no-skipped-test', noSkippedTestGate],
  // ZERO placeholder DIRECTIVE comments (leading TODO/FIXME/XXX/HACK) in
  // packages/*/src — mid-sentence prose mentions are correctly not flagged.
  // Always-blocking.
  ['gauntlet/no-placeholder', noPlaceholderGate],
];

/**
 * The five built-in gates this file covers — for the self-proof + determinism
 * assertions. (`no-bare-throw` has its own dedicated dogfood at
 * {@link ../gauntlet/dogfood.test.ts}.)
 */
const GATES: ReadonlyArray<readonly [string, Gate]> = [
  ['gauntlet/no-ts-ignore', noTsIgnoreGate],
  ['gauntlet/no-nondeterminism', noNondeterminismGate],
  ['gauntlet/no-silent-catch', noSilentCatchGate],
  ['gauntlet/no-skipped-test', noSkippedTestGate],
  ['gauntlet/no-placeholder', noPlaceholderGate],
];

/**
 * The TRUE L3 nondeterminism backlog — the raw unscoped set NARROWED through the
 * assurance map to only L3+ files. After the determinism cure this collapses to
 * exactly the THREE declared entropy boundaries of the @czap/core clock/rng
 * substrate: the `systemClock` monotonic read (performance.now, with the flagged
 * Date.now fallback) + the `wallClock` epoch read + the `systemRng` Math.random.
 * Every other runtime read now threads an injected clock/rng defaulting to these,
 * so the spine is deterministic-under-test; these three are the sole sanctioned
 * ambient reads, each WAIVED in `waivers.ts`.
 *
 * What drops out under level-scoping is all the L1/L2 command-surface receipt
 * timestamps + the fast-check seed — below the L3 determinism floor. The raw count
 * is NOT pinned (it is an actively-cured L1/L2 backlog); the L3 set IS, because it
 * is the LAW that decides blocking authority. That the L3 backlog is now ONLY the
 * substrate boundaries is the proof the cure landed: undifferentiated red is gone.
 */
const EXPECTED_NONDETERMINISM_L3: readonly string[] = [
  'packages/core/src/clock.ts:60', // systemClock — monotonic boundary (performance.now / Date.now fallback)
  'packages/core/src/clock.ts:77', // wallClock — epoch boundary
  'packages/core/src/rng.ts:39', // systemRng — randomness boundary
];

describe('dogfood — the hygiene gates over the real packages/*/src tree', () => {
  for (const [id, gate] of ZERO_FLOOR_GATES) {
    it(`${id} is at a ZERO floor on packages/*/src (lists any regression)`, () => {
      const ctx = nodeContext(REPO_ROOT, [...GLOBS]);

      // Sanity: the glob actually matched real source (a zero-file context would
      // make "zero findings" a hollow pass).
      expect(ctx.files().length).toBeGreaterThan(0);

      const findings = gate.run(ctx);
      const seen = findings.map((f) => locOf(f.location?.file, f.location?.line)).sort();

      const message = [
        `${id} over ${GLOBS.join(', ')} found ${findings.length} finding(s) — the floor is ZERO.`,
        'Each line below is a regression to cure (or honestly remove):',
        ...seen.map((s) => `  + ${s}`),
      ].join('\n');

      expect(seen, message).toEqual([]);
    });
  }

  it('each gate self-proves (red caught, green clean, mutation killed)', () => {
    for (const [, gate] of GATES) {
      expect(verifyGate(gate).selfProven, `${gate.id} must self-prove`).toBe(true);
    }
  });

  it('each gate is deterministic — the same repo state yields the same findings twice', () => {
    for (const [, gate] of GATES) {
      const run = (): readonly string[] =>
        gate.run(nodeContext(REPO_ROOT, [...GLOBS])).map((f) => locOf(f.location?.file, f.location?.line));
      expect(run()).toEqual(run());
    }
  });

  it('no-nondeterminism: the L3-scoped backlog is EXACTLY the three substrate boundaries', () => {
    const ctx = nodeContext(REPO_ROOT, [...GLOBS]);
    expect(ctx.files().length).toBeGreaterThan(0);

    // The LAW (not a brittle raw-line pin): run through the engine WITH the
    // assurance map so the gate (L3) sees only L3+ files; the L1/L2 command-surface
    // receipt timestamps drop out. After the determinism cure the L3 set collapses
    // to exactly the THREE declared entropy boundaries — every other deterministic
    // read threads the @czap/core clock/rng substrate. This is what decides the
    // gate's blocking authority, so it is the set worth pinning. The raw/unscoped
    // count is deliberately NOT pinned here: it is an L1/L2 backlog other slices
    // are actively curing, and pinning it would flap on every unrelated cure.
    const result = runGates([noNondeterminismGate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    const outcome = result.outcomes.find((o) => o.gateId === 'gauntlet/no-nondeterminism');
    expect(outcome, 'the no-nondeterminism gate must have an outcome').toBeDefined();
    const scopedSeen = (outcome?.findings ?? []).map((f) => locOf(f.location?.file, f.location?.line)).sort();

    const expected = [...EXPECTED_NONDETERMINISM_L3].sort();
    const message = [
      `no-nondeterminism L3-scoped found ${scopedSeen.length} finding(s); pinned ${expected.length} (the substrate boundaries).`,
      'A NEW L3 finding is a determinism regression; a CURED boundary is a win (update the pin):',
      ...scopedSeen.map((s) => `  + ${s}`),
    ].join('\n');
    expect(scopedSeen, message).toEqual(expected);

    // The raw/unscoped run over the REAL repo no longer EXCEEDS the L3 set — and
    // that is a WIN, not a regression: the B3.4 determinism cure routed every
    // L1/L2 receipt timestamp through the @czap/core wallClock boundary, so the
    // whole tree's nondeterminism reads are now exactly the three substrate
    // boundaries. raw == scoped is the cured, cleaner state (the L1/L2 backlog this
    // used to filter is gone). Scoping never ADDS, so the floor invariant holds:
    const rawSeen = noNondeterminismGate.run(ctx).map((f) => locOf(f.location?.file, f.location?.line));
    expect(rawSeen.length).toBeGreaterThanOrEqual(scopedSeen.length);

    // The level-scoping STILL does real work — proven over a FIXTURE so it holds
    // regardless of how clean the real repo is: a non-L3 file's nondeterminism read
    // is filtered out of the L3 gate's scope; an L3 file's is kept.
    const fixtureCtx = memoryContext({
      'packages/quantizer/src/scope-fixture.ts': 'export const t = new Date();\n', // L3 glob → kept
      'packages/command/src/commands/scope-fixture.ts': 'export const t = new Date();\n', // default L1 → dropped
    });
    const fixtureRaw = noNondeterminismGate.run(fixtureCtx).length;
    const fixtureScoped =
      runGates([noNondeterminismGate], fixtureCtx, { assuranceMap: LITESHIP_ASSURANCE_MAP }).outcomes.find(
        (o) => o.gateId === 'gauntlet/no-nondeterminism',
      )?.findings.length ?? -1;
    expect(fixtureRaw, 'both fixture files carry an ambient new Date()').toBe(2);
    expect(fixtureScoped, 'only the L3-globbed file survives the L3 scope').toBe(1);
  });

  it('no-nondeterminism: DETECTS ambient `performance.now()` (the monotonic-clock read), not just Date.now', () => {
    // Drift guard for the gate-extension: the monotonic ambient read is as
    // non-reproducible as a Date.now timestamp and MUST be caught. Source of truth
    // is the gate itself over a known-bad in-memory file — never the repo (which is
    // cured of ambient performance.now via the clock substrate, so the repo cannot
    // prove the branch). A regex that silently drops the performance.now alternative
    // would let a monotonic-into-duration regression slip past green; this reds it.
    const perfRed = memoryContext({
      'bad.ts': 'export function elapsed() {\n  return performance.now();\n}\n',
    });
    const hits = noNondeterminismGate.run(perfRed).map((f) => f.location?.line);
    expect(hits, 'the gate must flag an ambient performance.now() call').toEqual([2]);

    // And the injected-clock form is clean (no false positive on `clock.now()`).
    const perfGreen = memoryContext({
      'good.ts': 'export function elapsed(clock: { now(): number }) {\n  return clock.now();\n}\n',
    });
    expect(noNondeterminismGate.run(perfGreen)).toEqual([]);
  });

  it('no-silent-catch: the L3-scoped backlog is EXACTLY the four declared-benign catches (all waived)', () => {
    // The LAW: under level-scoping the L2 silent-catch gate sees only L2+ files, so
    // the L1 best-effort catches (spawn/server-info/vite) drop out, leaving exactly
    // the four L3-scoped catches — each of which has a committed waiver in
    // waivers.ts. Computed through the engine (source of truth), not a hardcoded
    // raw list that drifts as L1 catches are cured elsewhere.
    //
    // The WGSL shader-fetch catch (formerly the fifth entry, wgpu.ts) DROPPED OFF
    // when the shader content-integrity feature landed: that catch is now
    // DISCRIMINATED (it binds the network error and emits its own
    // `wgsl-fetch-fallback-builtin` warnOnce before keeping the built-in shader),
    // so the gate no longer flags it and its waiver was removed. The backlog is
    // exactly the four genuinely-benign best-effort catches.
    const ctx = nodeContext(REPO_ROOT, [...GLOBS]);
    const result = runGates([noSilentCatchGate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    const outcome = result.outcomes.find((o) => o.gateId === 'gauntlet/no-silent-catch');
    const scopedSeen = (outcome?.findings ?? []).map((f) => locOf(f.location?.file, f.location?.line)).sort();
    expect(scopedSeen).toEqual([
      'packages/cli/src/commands/doctor/probes-workspace.ts:250',
      'packages/cli/src/commands/ship.ts:185',
      'packages/cli/src/commands/version.ts:47',
      'packages/web/src/stream/resumption-pure.ts:29',
    ]);
  });
});
