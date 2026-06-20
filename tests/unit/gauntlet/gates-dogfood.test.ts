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
 *  gauntlet/no-nondeterminism (L3): 58 RAW findings — every Date.now() /
 *    Math.random() / argless `new Date()` in packages/&#42;/src, UNSCOPED by
 *    assurance level. This is NOT 58-things-to-cure: a non-determinism source is
 *    only a VIOLATION on an L3 path (the deterministic cast / projection / cache
 *    spine). Many of the 58 are legitimate and stay: CLI/command receipt + report
 *    timestamps (tooling, L1), fast-check seeds in the test harness, and the HLC's
 *    by-design wall-clock read (its injection point). The real L3 cure-target is
 *    the runtime subset (astro runtime, web stream, worker, core signal/zap/
 *    gen-frame/speculative/token-buffer, quantizer). Pinning all 58 here is the
 *    HONEST raw snapshot + a regression guard; narrowing it to the true L3 backlog
 *    is the next foundation this gate just proved is load-bearing: per-file
 *    ASSURANCE-LEVEL scoping (a gate runs only at its level) + waivers-with-teeth
 *    for the legit sites. Undifferentiated red is itself a failure — this gate
 *    earns blocking authority only once it is level-scoped.
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
  // 58 RAW ambient-nondeterminism sources, UNSCOPED by assurance level (see the
  // module doc) — the honest snapshot + regression guard, NOT 58 things to cure.
  // The true L3 cure-target is the runtime subset; level-scoping + waivers narrow
  // this. Legit sites (tooling timestamps, fast-check seeds, HLC clock) stay.
  'gauntlet/no-nondeterminism': [
    'packages/astro/src/runtime/boundary.ts:248',
    'packages/astro/src/runtime/stream.ts:130',
    'packages/cli/src/commands/gauntlet.ts:51',
    'packages/cli/src/commands/gauntlet.ts:66',
    'packages/cli/src/commands/gauntlet.ts:68',
    'packages/cli/src/commands/gauntlet.ts:83',
    'packages/cli/src/commands/scene-dev.ts:59',
    'packages/cli/src/commands/ship.ts:293',
    'packages/cli/src/commands/ship.ts:388',
    'packages/cli/src/commands/ship.ts:414',
    'packages/cli/src/commands/ship.ts:455',
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
    'packages/command/src/dispatcher.ts:58',
    'packages/command/src/dispatcher.ts:78',
    'packages/command/src/host/ffmpeg.ts:121',
    'packages/command/src/host/ffmpeg.ts:35',
    'packages/command/src/registry.ts:209',
    'packages/core/src/boundary.ts:400',
    'packages/core/src/diagnostics.ts:93',
    'packages/core/src/gen-frame.ts:165',
    'packages/core/src/harness/arbitrary-from-schema.ts:218',
    'packages/core/src/hlc.ts:194',
    'packages/core/src/hlc.ts:207',
    'packages/core/src/signal.ts:192',
    'packages/core/src/signal.ts:195',
    'packages/core/src/signal.ts:202',
    'packages/core/src/signal.ts:95',
    'packages/core/src/speculative.ts:106',
    'packages/core/src/token-buffer.ts:46',
    'packages/core/src/zap.ts:202',
    'packages/quantizer/src/animated-quantizer.ts:75',
    'packages/quantizer/src/quantizer.ts:492',
    'packages/web/src/stream/resumption.ts:93',
    'packages/web/src/stream/sse-pure.ts:91',
    'packages/worker/src/compositor-startup.ts:45',
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
});
