/**
 * Dogfood — the three Slice-A hygiene gates, run on the REAL repo.
 *
 * Like {@link ../gauntlet/dogfood.test.ts} for `noBareThrowGate`, this points each
 * new gate at the live `packages/&#42;/src` tree through {@link nodeContext} and PINS
 * the exact current finding set (sorted `file:line`). Unlike the bare-throw gate,
 * these three are NOT yet at a zero floor — they surface a real curing backlog,
 * and pinning it makes that backlog executable: any NEW violation (a regression)
 * breaks the pin and lists every finding so the drift is immediately visible, and
 * any CURED violation also breaks the pin (a healthy push — update the pin down).
 *
 * Curing the surfaced findings is the OWNER's call; this file only surfaces + pins.
 * Each gate self-proves separately (see foundations / gates self-proof test); here
 * we assert their value on the actual repo.
 *
 * Current backlog (the executable curing list), per gate:
 *
 *  gauntlet/no-ts-ignore (L1): 0 findings — ZERO real @ts-ignore / @ts-nocheck in
 *    product code (a clean floor; the only textual mentions are this gate family's
 *    own prose, which the strings-blanked + directive-form scan correctly ignores).
 *
 *  gauntlet/no-nondeterminism (L3): 32 RAW findings — every Date.now() /
 *    Math.random() / argless `new Date()` in packages/&#42;/src, UNSCOPED by
 *    assurance level. The deterministic RUNTIME spine that used to dominate this
 *    list is now CURED: core signal/zap/gen-frame/speculative/token-buffer/boundary/
 *    hlc, quantizer, web stream, worker, astro runtime, and the cli/command
 *    dispatch+ship+gauntlet receipts all thread the @czap/core clock/rng substrate
 *    (`systemClock` monotonic / `wallClock` epoch / `systemRng`). What REMAINS raw
 *    is (a) the 3 declared substrate BOUNDARIES (the single sanctioned reads,
 *    waived) and (b) ~29 L1/L2 command-surface receipt timestamps + the fast-check
 *    seed + core/diagnostics — all below the L3 determinism floor. Pinning all 32
 *    here is the HONEST raw snapshot + a regression guard. The level-scoped test
 *    below pins raw 32 → 3 L3 findings (the 29-finding gap is the noise the map
 *    removes), and the 3 are exactly the substrate boundaries — the proof the cure
 *    landed. This gate earns blocking authority only once level-scoped.
 *
 *  gauntlet/no-silent-catch (L2): 10 findings — empty `catch { }` blocks (a
 *    comment-only body still counts: the caught error is neither rethrown, logged,
 *    nor used). Concentrated in command/host/spawn.ts (×4 process-kill / cleanup
 *    swallows), plus cli doctor + ship, astro wgpu, vite wasm-resolve, mcp
 *    server-info, web resumption-pure. The exact set is the pin below.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  noTsIgnoreGate,
  noNondeterminismGate,
  noSilentCatchGate,
  verifyGate,
  nodeContext,
  runGates,
  LITESHIP_ASSURANCE_MAP,
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

/** The pinned, sorted `file:line` backlog each gate currently surfaces on the repo. */
const EXPECTED: Readonly<Record<string, readonly string[]>> = {
  // ZERO real @ts-ignore / @ts-nocheck directives in product code (a clean floor).
  'gauntlet/no-ts-ignore': [],
  // 32 RAW ambient-nondeterminism sources, UNSCOPED by assurance level (see the
  // module doc) — the honest snapshot + regression guard. The deterministic
  // RUNTIME spine that used to dominate this list (core signal/zap/gen-frame/
  // speculative/token-buffer/boundary/hlc, quantizer, web stream, worker, astro
  // runtime, + the cli/command dispatch/ship/gauntlet receipts) is now CURED —
  // every read threads the @czap/core clock/rng substrate. What REMAINS raw is:
  // (a) the 3 declared substrate BOUNDARIES (clock×2 + rng — the single sanctioned
  // reads, waived), and (b) ~26 L1/L2 command-surface receipt timestamps + the
  // fast-check seed + core/diagnostics — all BELOW the L3 determinism floor, so
  // level-scoping drops them (they never reach the gate's blocking authority).
  'gauntlet/no-nondeterminism': [
    'packages/cli/src/gauntlet-argv.ts:39',
    'packages/cli/src/receipts.ts:116',
    'packages/command/src/commands/asset.ts:122',
    'packages/command/src/commands/asset.ts:137',
    'packages/command/src/commands/asset.ts:25',
    'packages/command/src/commands/asset.ts:67',
    'packages/command/src/commands/asset.ts:90',
    'packages/command/src/commands/audit.ts:91',
    'packages/command/src/commands/capsule.ts:103',
    'packages/command/src/commands/capsule.ts:14',
    'packages/command/src/commands/capsule.ts:42',
    'packages/command/src/commands/capsule.ts:70',
    'packages/command/src/commands/glossary.ts:244',
    'packages/command/src/commands/manifest.ts:63',
    'packages/command/src/commands/scene.ts:126',
    'packages/command/src/commands/scene.ts:135',
    'packages/command/src/commands/scene.ts:139',
    'packages/command/src/commands/scene.ts:15',
    'packages/command/src/commands/scene.ts:199',
    'packages/command/src/commands/scene.ts:246',
    'packages/command/src/commands/scene.ts:97',
    'packages/command/src/commands/verify.ts:41',
    'packages/command/src/commands/verify.ts:49',
    'packages/command/src/commands/version.ts:43',
    'packages/command/src/host/ffmpeg.ts:121',
    'packages/command/src/host/ffmpeg.ts:35',
    'packages/command/src/registry.ts:209',
    'packages/core/src/clock.ts:61', // substrate boundary — systemClock fallback (waived)
    'packages/core/src/clock.ts:78', // substrate boundary — wallClock epoch read (waived)
    'packages/core/src/diagnostics.ts:93',
    'packages/core/src/harness/arbitrary-from-schema.ts:218',
    'packages/core/src/rng.ts:39', // substrate boundary — systemRng (waived)
  ],
  // 10 silent catches (an empty catch body — comment-only counts, the error is
  // still swallowed) — the L2 swallowed-fault backlog.
  'gauntlet/no-silent-catch': [
    'packages/astro/src/runtime/wgpu.ts:287',
    'packages/cli/src/commands/doctor.ts:390',
    'packages/cli/src/commands/ship.ts:169',
    'packages/command/src/host/spawn.ts:248',
    'packages/command/src/host/spawn.ts:255',
    'packages/command/src/host/spawn.ts:369',
    'packages/command/src/host/spawn.ts:397',
    'packages/mcp-server/src/server-info.ts:28',
    'packages/vite/src/wasm-package-resolve.ts:39',
    'packages/web/src/stream/resumption-pure.ts:29',
  ],
};

const GATES: ReadonlyArray<readonly [string, Gate]> = [
  ['gauntlet/no-ts-ignore', noTsIgnoreGate],
  ['gauntlet/no-nondeterminism', noNondeterminismGate],
  ['gauntlet/no-silent-catch', noSilentCatchGate],
];

/**
 * The TRUE L3 nondeterminism backlog — the raw 32 NARROWED through the assurance
 * map to only L3+ files. After the determinism cure this collapses to exactly the
 * THREE declared entropy boundaries of the @czap/core clock/rng substrate: the
 * `systemClock` Date.now fallback + the `wallClock` epoch read + the `systemRng`
 * Math.random. Every other runtime read now threads an injected clock/rng
 * defaulting to these, so the spine is deterministic-under-test; these three are
 * the sole sanctioned ambient reads, each WAIVED in `waivers.ts`.
 *
 * The 29 that drop out are all L1/L2 command-surface receipt timestamps + the
 * fast-check seed + core/diagnostics — below the L3 determinism floor.
 *
 * raw 32 (unscoped) → 3 (level-scoped). That the L3 backlog is now ONLY the
 * substrate boundaries is the proof the cure landed: undifferentiated red is gone.
 */
const EXPECTED_NONDETERMINISM_L3: readonly string[] = [
  'packages/core/src/clock.ts:61', // systemClock — monotonic boundary (Date.now fallback)
  'packages/core/src/clock.ts:78', // wallClock — epoch boundary
  'packages/core/src/rng.ts:39', // systemRng — randomness boundary
];

describe('dogfood — the three hygiene gates over the real packages/*/src tree', () => {
  for (const [id, gate] of GATES) {
    it(`${id} surfaces exactly its pinned backlog (lists any drift)`, () => {
      const ctx = nodeContext(REPO_ROOT, [...GLOBS]);

      // Sanity: the glob actually matched real source (a zero-file context would
      // make any pin a hollow pass).
      expect(ctx.files().length).toBeGreaterThan(0);

      const findings = gate.run(ctx);
      const seen = findings.map((f) => locOf(f.location?.file, f.location?.line)).sort();
      const expected = [...(EXPECTED[id] ?? [])].sort();

      const message = [
        `${id} over ${GLOBS.join(', ')} found ${findings.length} finding(s) — pinned ${expected.length}.`,
        'A NEW finding is a regression to cure; a MISSING one is a cure to celebrate (update the pin):',
        ...seen.map((s) => `  + ${s}`),
      ].join('\n');

      expect(seen, message).toEqual(expected);
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

  it('no-nondeterminism: raw 32 → LEVEL-SCOPED to the true L3 backlog via the assurance map', () => {
    const ctx = nodeContext(REPO_ROOT, [...GLOBS]);
    expect(ctx.files().length).toBeGreaterThan(0);

    // RAW (unscoped) — the honest snapshot the existing pin tracks.
    const raw = noNondeterminismGate.run(ctx);
    const rawSeen = raw.map((f) => locOf(f.location?.file, f.location?.line)).sort();
    expect(rawSeen.length, 'raw/unscoped count drifted from the pinned 32').toBe(32);

    // LEVEL-SCOPED — run through the engine WITH the assurance map. The gate is
    // L3, so it only sees L3+ files; the CLI/command/tooling (L1) drops out. We
    // read the SCOPED findings off the gate's outcome (post-scope, pre-waiver).
    const result = runGates([noNondeterminismGate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    const outcome = result.outcomes.find((o) => o.gateId === 'gauntlet/no-nondeterminism');
    expect(outcome, 'the no-nondeterminism gate must have an outcome').toBeDefined();
    const scopedSeen = (outcome?.findings ?? [])
      .map((f) => locOf(f.location?.file, f.location?.line))
      .sort();

    const expected = [...EXPECTED_NONDETERMINISM_L3].sort();
    const message = [
      `no-nondeterminism: raw ${rawSeen.length} (unscoped) → ${scopedSeen.length} (L3-scoped). Pinned ${expected.length}.`,
      'The level-scoped set is the TRUE L3 backlog (the deterministic spine); CLI/command/tooling correctly drop out.',
      'A NEW L3 finding is a regression; a CURED one is a win (update the pin):',
      ...scopedSeen.map((s) => `  + ${s}`),
    ].join('\n');

    expect(scopedSeen, message).toEqual(expected);
    // The 29-finding gap is the L1/L2 tooling noise the assurance map removes.
    expect(rawSeen.length - scopedSeen.length).toBe(29);
  });
});
