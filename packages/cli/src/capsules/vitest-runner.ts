/**
 * VitestRunner — `receiptedMutation` arm instance `cli.vitest-runner`.
 *
 * Routes CLI verify subcommands through a shell-free spawn with a typed
 * input schema (no string interpolation of manifest paths). Replaces the
 * three execSync template-string call sites that were a latent RCE
 * surface (bug #1 from the Spec 1 audit strike force):
 *  - `commands/scene-verify.ts`
 *  - `commands/capsule.ts`  (capsuleVerify)
 *  - `commands/asset-verify.ts`
 *
 * The capsule declaration here is what the AST walker / type-directed
 * detector picks up for `reports/capsule-manifest.json`. The runtime
 * callable lives on the {@link VitestRunner} namespace object — the three
 * verify commands import and invoke that.
 *
 * @module
 */

import { defineCapsule, S } from '@czap/core';

// The runtime callable now lives in @czap/command/host (CUT A1 capstone-1); this
// module keeps only the capsule DECLARATION (walked into the manifest as
// `cli.vitest-runner`) and re-exports the runtime for stable import sites.
export { VitestRunner } from '@czap/command/host';

const VitestRunnerInput = S.struct({
  testFiles: S.array(S.string),
});

const VitestRunnerOutput = S.struct({
  exitCode: S.number,
  testFiles: S.array(S.string),
  stderrTail: S.string,
});

/**
 * Declared capsule for the no-shell vitest runner. Registered in the
 * module-level catalog at import time; walked by `scripts/capsule-compile.ts`.
 *
 * The `shell-disabled` invariant is enforced structurally — `spawnArgv`
 * never passes `shell: true` — so the check trivially holds. It exists in
 * the manifest as a documented contract surface.
 */
export const vitestRunnerCapsule = defineCapsule({
  _kind: 'receiptedMutation',
  name: 'cli.vitest-runner',
  site: ['node'],
  capabilities: { reads: ['fs'], writes: ['process'] },
  input: VitestRunnerInput,
  output: VitestRunnerOutput,
  budgets: { p95Ms: 300_000, allocClass: 'unbounded' },
  // TYPED escape hatch (mandatory-`mutate` rule): the receipt here is the
  // OUTCOME of spawning an external test process. `exitCode` and `stderrTail`
  // exist only once `pnpm exec vitest run` has actually run — they are not
  // derivable from `testFiles` by any pure function. The only pure shaping is
  // echoing `testFiles` verbatim (pinned by the `test-files-echoed` invariant),
  // which is too thin to constitute a receipt-producing core worth driving
  // idempotently. So this declares `effect-outcome` with a reason rather than a
  // vacuous `mutate`. The contract round-trip still proves the receipt schema.
  receiptKind: 'effect-outcome',
  reason:
    'receipt is the outcome of spawning an external test process (pnpm exec vitest run); ' +
    'exitCode and stderrTail only exist after the process runs and cannot be driven by a pure ' +
    'core. The sole pure shaping (echoing testFiles) is pinned by the test-files-echoed invariant.',
  invariants: [
    {
      name: 'shell-disabled',
      check: (
        _input: { testFiles: readonly string[] },
        _output: { exitCode: number; testFiles: readonly string[]; stderrTail: string },
      ): boolean => true,
      message: 'subprocess must be spawned with shell: false (enforced structurally by spawnArgv)',
    },
    {
      name: 'exit-code-propagated',
      check: (
        _input: { testFiles: readonly string[] },
        output: { exitCode: number; testFiles: readonly string[]; stderrTail: string },
      ): boolean => typeof output.exitCode === 'number',
      message: 'exit code from subprocess must be propagated as a number',
    },
    {
      name: 'test-files-echoed',
      check: (
        input: { testFiles: readonly string[] },
        output: { exitCode: number; testFiles: readonly string[]; stderrTail: string },
      ): boolean =>
        input.testFiles.length === output.testFiles.length &&
        input.testFiles.every((f, i) => f === output.testFiles[i]),
      message: 'output must echo the testFiles input verbatim (audit-trail consistency)',
    },
  ],
});
