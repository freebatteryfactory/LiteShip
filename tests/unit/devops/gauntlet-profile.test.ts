/**
 * CUT D8 — the canonical gauntlet phase profile is the ONE source of truth.
 *
 * Pins the 41-phase order to the executor's real run-order (no drift), proves the
 * executor + CLI both DERIVE from this list (no hand-maintained copies left), and
 * preserves the coverage:browser watchdog options across the migration.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  gauntletPhases,
  gauntletPhaseLabels,
  gauntletPhaseProfiles,
  CI_PARALLEL_PREFLIGHT_LABELS,
  CI_PARALLEL_INTEGRATION_LABELS,
  CI_PARALLEL_BENCH_LABELS,
  CI_PARALLEL_MUTATING_LABELS,
  CI_PARALLEL_COVERAGE_LABELS,
  CI_PARALLEL_FINAL_LABELS,
  CI_PARALLEL_SHARDED_TEST_LABEL,
} from '../../../packages/cli/src/gauntlet-phases.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

/** The canonical 41 phases, transcribed verbatim from the executor's HEAD run-order. */
const EXPECTED: ReadonlyArray<{ label: string; command: string }> = [
  { label: 'rig-check', command: 'pnpm run doctor -- --preflight --ci' },
  { label: 'build', command: 'pnpm run build' },
  { label: 'capsule:compile', command: 'pnpm run capsule:compile' },
  { label: 'typecheck', command: 'pnpm run typecheck' },
  { label: 'lint', command: 'pnpm run lint' },
  { label: 'lint:structural', command: 'pnpm run lint:structural' },
  { label: 'docs:check', command: 'pnpm run docs:check' },
  { label: 'invariants', command: 'pnpm exec tsx packages/cli/src/bin.ts check-invariants' },
  { label: 'check:gates', command: 'pnpm run check:gates' },
  { label: 'audit:floor', command: 'pnpm run audit:floor' },
  { label: 'test (unit + component + property + integration)', command: 'pnpm test' },
  { label: 'test:vite', command: 'pnpm run test:vite' },
  { label: 'test:astro', command: 'pnpm run test:astro' },
  { label: 'test:cloudflare', command: 'pnpm run test:cloudflare' },
  { label: 'test:cloudflare-dev', command: 'pnpm run test:cloudflare-dev' },
  { label: 'test:tailwind', command: 'pnpm run test:tailwind' },
  { label: 'test:e2e', command: 'pnpm run test:e2e' },
  { label: 'test:e2e:stress', command: 'pnpm run test:e2e:stress' },
  { label: 'test:e2e:stream-stress', command: 'pnpm run test:e2e:stream-stress' },
  { label: 'test:flake', command: 'pnpm run test:flake' },
  { label: 'test:redteam', command: 'pnpm run test:redteam' },
  { label: 'bench', command: 'pnpm run bench' },
  { label: 'bench:gate', command: 'pnpm run bench:gate' },
  { label: 'bench:trend', command: 'BENCH_TREND_STRICT=1 pnpm run bench:trend' },
  { label: 'bench:reality', command: 'pnpm run bench:reality' },
  { label: 'package:smoke', command: 'pnpm run package:smoke' },
  { label: 'coverage:wipe-subprocess', command: 'rimraf coverage/subprocess-raw' },
  { label: 'coverage:node:tracked', command: 'pnpm run coverage:node:tracked' },
  { label: 'coverage:browser', command: 'pnpm run coverage:browser' },
  { label: 'merge-subprocess-v8', command: 'tsx scripts/merge-subprocess-v8.ts' },
  { label: 'coverage:merge', command: 'tsx scripts/merge-coverage.ts' },
  { label: 'report:runtime-seams', command: 'pnpm run report:runtime-seams' },
  { label: 'audit', command: 'pnpm run audit' },
  { label: 'report:satellite-scan', command: 'pnpm run report:satellite-scan' },
  { label: 'feedback:verify', command: 'pnpm run feedback:verify' },
  { label: 'runtime:gate', command: 'pnpm run runtime:gate' },
  { label: 'standards:gate', command: 'pnpm run standards:gate' },
  { label: 'capability:gate', command: 'pnpm run capability:gate' },
  { label: 'plumb:gate', command: 'pnpm run plumb:gate' },
  { label: 'capsule:verify', command: 'pnpm run capsule:verify' },
  { label: 'flex:verify', command: 'pnpm run flex:verify' },
];

describe('D8 — canonical gauntlet phase profile', () => {
  it('has exactly 41 phases', () => {
    expect(gauntletPhases.length).toBe(41);
    expect(gauntletPhaseLabels().length).toBe(41);
  });

  it('matches the executor HEAD run-order, label + command, in sequence (no drift)', () => {
    expect(gauntletPhases.map((p) => ({ label: p.label, command: p.command }))).toEqual(EXPECTED);
  });

  it('phase labels are unique (no dup-rename drift)', () => {
    const labels = gauntletPhaseLabels();
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('rig-check is the entry phase', () => {
    expect(gauntletPhases[0]!.label).toBe('rig-check');
  });

  it('preserves the coverage:browser watchdog options', () => {
    const browser = gauntletPhases.find((p) => p.label === 'coverage:browser');
    expect(browser?.doneMarker?.source).toBe('Coverage report from v8');
    expect(browser?.gracePeriodMs).toBe(90_000);
    // Every other phase has no watchdog (the marker is unique to coverage:browser).
    expect(gauntletPhases.filter((p) => p.doneMarker).map((p) => p.label)).toEqual(['coverage:browser']);
  });

  it('flex:verify is the terminal phase', () => {
    expect(gauntletPhases[gauntletPhases.length - 1]!.label).toBe('flex:verify');
  });
});

describe('D8 — every projection derives from the canonical list (no copies remain)', () => {
  it('the executor imports the canonical phases and loops the selected subset — no inline phase literals', () => {
    const src = readFileSync(resolve(REPO, 'scripts/gauntlet.ts'), 'utf8');
    expect(src).toContain("import { selectGauntletPhases } from '../packages/cli/src/gauntlet-phases.js'");
    expect(src).toContain('for (const phase of phases)');
    // The inline `await run('build', …)` phase sequence must be gone.
    expect(src).not.toMatch(/await run\('build'/);
    expect(src).not.toMatch(/await run\('flex:verify'/);
  });

  it('the CLI command declares no private PHASES array — it projects the canonical labels', () => {
    const src = readFileSync(resolve(REPO, 'packages/cli/src/commands/gauntlet.ts'), 'utf8');
    expect(src).toContain('gauntletPhaseLabels');
    expect(src).not.toMatch(/const PHASES\s*=\s*\[/);
  });
});

describe('Tier 6 — ci-parallel profile partitioning', () => {
  const dedicatedProfiles = [
    CI_PARALLEL_PREFLIGHT_LABELS,
    CI_PARALLEL_INTEGRATION_LABELS,
    CI_PARALLEL_BENCH_LABELS,
    CI_PARALLEL_MUTATING_LABELS,
    CI_PARALLEL_COVERAGE_LABELS,
    CI_PARALLEL_FINAL_LABELS,
    [CI_PARALLEL_SHARDED_TEST_LABEL],
  ] as const;

  it('ci-parallel-mid does not duplicate preflight, integration, or other dedicated lanes', () => {
    const mid = new Set(gauntletPhaseProfiles['ci-parallel-mid']);
    expect(mid.has('rig-check'), 'rig-check runs only on serial truth-linux / setup').toBe(false);
    for (const labels of dedicatedProfiles) {
      for (const label of labels) {
        expect(mid.has(label), `mid must not re-run dedicated phase ${label}`).toBe(false);
      }
    }
  });

  it('dedicated parallel profiles do not overlap each other', () => {
    const seen = new Set<string>();
    for (const labels of dedicatedProfiles) {
      for (const label of labels) {
        expect(seen.has(label), `duplicate dedicated phase ${label}`).toBe(false);
        seen.add(label);
      }
    }
  });
});
