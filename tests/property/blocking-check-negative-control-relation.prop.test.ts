// PROVES: INV-CHECK-NEGATIVE-CONTROL
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CHECK_REGISTRY, type CheckDefinition, type CheckPlan, type PlannedCheck } from '@liteship/command';
import { createCheckPlanRunner, invokedScriptName } from '../../packages/cli/src/commands/check.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SHARED_EXTERNAL_AUTHORITY = 'shared:external-authority-red-fixtures';

type BlockingCheck = Extract<CheckDefinition, { readonly authority: 'blocking' }>;
type ExpectedControl = readonly [id: string, command: string, path: string, controlAuthority: string];

/**
 * Independent evidence specification. The registry owns what runs; this table
 * owns the exact falsification relation that must remain true when it changes.
 * A shared path is deliberate only when every row names the same shared
 * authority. Otherwise a convenient unrelated test cannot masquerade as proof.
 */
const EXPECTED_CONTROLS: readonly ExpectedControl[] = [
  [
    'check/format',
    'pnpm run format:check',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/lint-structural',
    'pnpm run lint:structural',
    'tests/unit/devops/lint-structural-negative-control.test.ts',
    'check/lint-structural',
  ],
  [
    'check/lint',
    'pnpm run lint',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  ['check/typecheck', 'pnpm run typecheck', 'tests/unit/devops/gate-canaries.test.ts', 'check/typecheck'],
  [
    'check/docs-fast',
    'pnpm run docs:check:fast',
    'tests/unit/devops/typedoc-input-fingerprint.test.ts',
    'check/docs-fast',
  ],
  [
    'check/docs',
    'pnpm run docs:check',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/assurance-density',
    'pnpm run assurance:gate',
    'tests/unit/devops/assurance-inventory.test.ts',
    'check/assurance-density',
  ],
  [
    'check/test-constitution',
    'pnpm run test:constitution',
    'tests/unit/devops/test-constitution.test.ts',
    'check/test-constitution',
  ],
  ['check/gates', 'pnpm run check:gates', 'tests/unit/cli/lib/repo-ir-gauntlet.test.ts', 'check/gates'],
  ['check/audit-floor', 'pnpm run audit:floor', 'tests/unit/cli/commands/audit-floor.test.ts', 'check/audit-floor'],
  ['check/test', 'pnpm test', 'tests/unit/devops/test-aggregate-negative-control.test.ts', 'check/test'],
  [
    'check/test-redteam',
    'pnpm run test:redteam',
    'tests/unit/devops/test-redteam-negative-control.test.ts',
    'check/test-redteam',
  ],
  [
    'check/runtime-gate',
    'pnpm run runtime:gate',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/standards-gate',
    'pnpm run standards:gate',
    'tests/unit/meta/standards-integrity.test.ts',
    'check/standards-gate',
  ],
  [
    'check/capability-gate',
    'pnpm run capability:gate',
    'tests/unit/gauntlet/capability-gate-link.test.ts',
    'check/capability-gate',
  ],
  [
    'check/spine-relation-gate',
    'pnpm run spine-relation:gate',
    'tests/unit/audit/spine-relation.test.ts',
    'check/spine-relation-gate',
  ],
  [
    'check/transition-gate',
    'pnpm run transition:gate',
    'tests/unit/gauntlet/transition-conformance-gate.test.ts',
    'check/transition-gate',
  ],
  ['check/plumb-gate', 'pnpm run plumb:gate', 'tests/unit/devops/plumb-gate.test.ts', 'check/plumb-gate'],
  [
    'check/feedback-verify',
    'pnpm run feedback:verify',
    'tests/unit/meta/feedback-integrity.test.ts',
    'check/feedback-verify',
  ],
  [
    'check/flex-verify',
    'pnpm run flex:verify',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/devx',
    'pnpm run devx:check',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/capsule-verify',
    'pnpm run capsule:verify',
    'tests/integration/capsule-verify.test.ts',
    'check/capsule-verify',
  ],
  ['check/test-vite', 'pnpm run test:vite', 'tests/unit/devops/test-vite-negative-control.test.ts', 'check/test-vite'],
  [
    'check/test-astro',
    'pnpm run test:astro',
    'tests/unit/devops/test-astro-negative-control.test.ts',
    'check/test-astro',
  ],
  [
    'check/test-cloudflare',
    'pnpm run test:cloudflare',
    'tests/unit/devops/test-cloudflare-negative-control.test.ts',
    'check/test-cloudflare',
  ],
  [
    'check/test-cloudflare-dev',
    'pnpm run test:cloudflare-dev',
    'tests/unit/devops/test-cloudflare-dev-negative-control.test.ts',
    'check/test-cloudflare-dev',
  ],
  [
    'check/test-tailwind',
    'pnpm run test:tailwind',
    'tests/unit/devops/test-tailwind-negative-control.test.ts',
    'check/test-tailwind',
  ],
  ['check/test-e2e', 'pnpm run test:e2e', 'tests/unit/devops/test-e2e-negative-control.test.ts', 'check/test-e2e'],
  [
    'check/test-e2e-stress',
    'pnpm run test:e2e:stress',
    'tests/unit/devops/test-e2e-stress-negative-control.test.ts',
    'check/test-e2e-stress',
  ],
  [
    'check/test-e2e-stream-stress',
    'pnpm run test:e2e:stream-stress',
    'tests/unit/devops/test-e2e-stream-stress-negative-control.test.ts',
    'check/test-e2e-stream-stress',
  ],
  ['check/bench-gate', 'pnpm run bench:gate', 'tests/unit/meta/bench-gate.test.ts', 'check/bench-gate'],
  [
    'check/bench-contracts',
    'pnpm run bench:contracts',
    'tests/unit/meta/bench-contracts.test.ts',
    'check/bench-contracts',
  ],
  [
    'check/bench-trend',
    'pnpm run bench:trend -- --strict',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/bench-reality',
    'pnpm run bench:reality',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/bench-alloc',
    'pnpm run bench:alloc',
    'tests/unit/devops/bench-alloc-negative-control.test.ts',
    'check/bench-alloc',
  ],
  [
    'check/coverage',
    'pnpm run coverage',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/package-smoke',
    'pnpm run package:smoke',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  ['check/doctor', 'pnpm run doctor -- --preflight --ci', 'tests/unit/cli/commands/doctor.test.ts', 'check/doctor'],
  ['check/journey', 'pnpm run test:journey', 'tests/unit/devops/journey-negative-control.test.ts', 'check/journey'],
  [
    'check/hermetic',
    'pnpm run package:smoke:hermetic',
    'tests/unit/devops/blocking-check-negative-controls.test.ts',
    SHARED_EXTERNAL_AUTHORITY,
  ],
  [
    'check/devcontainer-pins',
    'pnpm run test:devcontainer',
    'tests/unit/meta/devcontainer-pins.test.ts',
    'check/devcontainer-pins',
  ],
  ['check/app-build', 'liteship build', 'tests/unit/cli/commands/build.test.ts', 'check/app-build'],
] as const;

const BLOCKING_CHECKS = CHECK_REGISTRY.filter((check): check is BlockingCheck => check.authority === 'blocking');
const EXPECTED_BY_ID = new Map(EXPECTED_CONTROLS.map((row) => [row[0], row]));
let fixtureRoot = '';

function planned(check: BlockingCheck): PlannedCheck {
  return {
    id: check.id,
    title: check.title,
    claim: check.claim,
    owner: check.owner,
    command: check.command,
    ...(check.execution === undefined ? {} : { execution: check.execution }),
    context: check.contexts[0]!,
    authority: check.authority,
    cache: check.cache,
    cacheable: check.cache === 'content-addressed',
    timeoutMs: check.timeoutMs,
    inputs: check.inputs,
    remediation: check.remediation,
  };
}

function planFor(check: BlockingCheck): CheckPlan {
  return {
    profile: check.profiles[0]!,
    platform: 'linux',
    context: check.contexts[0]!,
    checks: [planned(check)],
    estimatedMs: check.timeoutMs,
    skipped: [],
  };
}

function expectedSpawnCommand(check: BlockingCheck): string {
  return check.execution === undefined ? check.command : 'pnpm exec liteship build';
}

function execute(
  check: BlockingCheck,
  status: number,
): { readonly calls: readonly string[]; readonly ok: boolean; readonly blocked: boolean; readonly verdict: string } {
  const calls: string[] = [];
  const report = createCheckPlanRunner({
    spawn: (command) => {
      calls.push(command);
      return { status, signal: null, stdout: '', stderr: status === 0 ? '' : `planted ${check.id} failure` };
    },
    now: () => 7,
    env: { node: 'negative-control', platform: 'linux' },
  })(planFor(check), fixtureRoot, { noCache: true });
  return { calls, ok: report.ok, blocked: report.blocked, verdict: report.results[0]!.verdict };
}

function canonicalRelation(rows: readonly BlockingCheck[]): string {
  return rows
    .map((row) => `${row.id}\0${row.command}\0${row.negativeControl}`)
    .sort((a, b) => a.localeCompare(b))
    .join('\n');
}

function relationProblems(rows: readonly BlockingCheck[]): readonly string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();
  const byPath = new Map<string, BlockingCheck[]>();
  for (const row of rows) {
    const expected = EXPECTED_BY_ID.get(row.id);
    if (seenIds.has(row.id)) problems.push(`duplicate id: ${row.id}`);
    seenIds.add(row.id);
    if (expected === undefined) {
      problems.push(`unexpected blocker: ${row.id}`);
      continue;
    }
    if (row.command !== expected[1]) problems.push(`command mismatch: ${row.id}`);
    if (row.negativeControl !== expected[2]) problems.push(`control mismatch: ${row.id}`);
    if (!existsSync(resolve(ROOT, row.negativeControl))) problems.push(`missing control: ${row.id}`);
    const group = byPath.get(row.negativeControl) ?? [];
    group.push(row);
    byPath.set(row.negativeControl, group);
  }
  for (const id of EXPECTED_BY_ID.keys()) if (!seenIds.has(id)) problems.push(`missing blocker: ${id}`);
  for (const [path, group] of byPath) {
    if (group.length < 2) continue;
    const authorities = new Set(group.map((row) => EXPECTED_BY_ID.get(row.id)?.[3]));
    if (authorities.size !== 1 || !authorities.has(SHARED_EXTERNAL_AUTHORITY)) {
      problems.push(`unrelated authorities share ${path}`);
    }
  }
  return problems.sort((a, b) => a.localeCompare(b));
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'liteship-control-relation-'));
  const scripts = Object.fromEntries(
    BLOCKING_CHECKS.flatMap((check) => {
      const script = invokedScriptName(check.command);
      return script === null ? [] : [[script, 'fixture-authority']];
    }),
  );
  writeFileSync(
    join(fixtureRoot, 'package.json'),
    JSON.stringify({ private: true, packageManager: 'pnpm@10.26.2', scripts }),
  );
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('blocking-check negative-control relation properties', () => {
  it('pins all 42 blockers to explicit commands and existing exact control paths', () => {
    expect(BLOCKING_CHECKS).toHaveLength(42);
    expect(EXPECTED_CONTROLS).toHaveLength(42);
    expect(relationProblems(BLOCKING_CHECKS)).toEqual([]);
  });

  it('production execution binds every exact id and command to red/nonzero and green/zero', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BLOCKING_CHECKS), fc.integer({ min: 1, max: 255 }), (check, nonzero) => {
        const red = execute(check, nonzero);
        expect(red.calls).toEqual([expectedSpawnCommand(check)]);
        expect(red).toMatchObject({ ok: false, blocked: true, verdict: 'fail' });
        const green = execute(check, 0);
        expect(green.calls).toEqual([expectedSpawnCommand(check)]);
        expect(green).toMatchObject({ ok: true, blocked: false, verdict: 'pass' });
      }),
      { seed: 0xb10c, numRuns: 84 },
    );
  });

  it('keeps pnpm test distinct from pnpm run and preserves quoted/forwarded command text', () => {
    expect(invokedScriptName('pnpm test')).toBe('test');
    expect(invokedScriptName('pnpm run test')).toBe('test');
    expect(invokedScriptName('pnpm run bench:trend -- --strict')).toBe('bench:trend');
    const synthetic = { ...BLOCKING_CHECKS[0]!, id: 'check/quoted', command: 'pnpm run lint -- --label "two words"' };
    expect(execute(synthetic, 0).calls).toEqual(['pnpm run lint -- --label "two words"']);
  });

  it('rejects an unrelated existing control path instead of accepting file existence as proof', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BLOCKING_CHECKS.length - 1 }),
        fc.integer({ min: 1, max: BLOCKING_CHECKS.length - 1 }),
        (sourceIndex, distance) => {
          const targetIndex = (sourceIndex + distance) % BLOCKING_CHECKS.length;
          const source = BLOCKING_CHECKS[sourceIndex]!;
          const target = BLOCKING_CHECKS[targetIndex]!;
          fc.pre(source.negativeControl !== target.negativeControl);
          const mutated = BLOCKING_CHECKS.map((row) =>
            row.id === source.id ? { ...row, negativeControl: target.negativeControl } : row,
          );
          expect(relationProblems(mutated)).toContain(`control mismatch: ${source.id}`);
        },
      ),
      { seed: 0xc0117, numRuns: 100 },
    );
  });

  it('rejects duplicate paths unless their exact evidence rows declare one shared authority', () => {
    const unique = BLOCKING_CHECKS.find((check) => check.id === 'check/typecheck')!;
    const foreign = BLOCKING_CHECKS.find((check) => check.id === 'check/docs-fast')!;
    const duplicated = BLOCKING_CHECKS.map((row) =>
      row.id === foreign.id ? { ...row, negativeControl: unique.negativeControl } : row,
    );
    expect(relationProblems(duplicated)).toEqual(
      expect.arrayContaining([
        `control mismatch: ${foreign.id}`,
        `unrelated authorities share ${unique.negativeControl}`,
      ]),
    );
  });

  it('is deterministic under every generated registry permutation', () => {
    const expected = canonicalRelation(BLOCKING_CHECKS);
    fc.assert(
      fc.property(
        fc.shuffledSubarray(BLOCKING_CHECKS, {
          minLength: BLOCKING_CHECKS.length,
          maxLength: BLOCKING_CHECKS.length,
        }),
        (permutation) => {
          expect(canonicalRelation(permutation)).toBe(expected);
          expect(relationProblems(permutation)).toEqual([]);
        },
      ),
      { seed: 0x42c0de, numRuns: 100 },
    );
  });
});
