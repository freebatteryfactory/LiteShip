/**
 * Executed negative controls for blocking checks that are backed by external
 * tools or runner families rather than a self-proving LiteShip gate. Each
 * fixture is deliberately bad and the real authority must return red/non-zero.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { check as prettierCheck } from 'prettier';
import { ESLint } from 'eslint';
import { CHECK_REGISTRY } from '@liteship/command';
import { spawnArgvCapture, type SpawnCaptureResult } from '../../../scripts/lib/spawn.js';
import { runRuntimeGate } from '../../../scripts/runtime-gate.js';
import { measureLiveBytesPerOp } from '../../../scripts/alloc-gate.js';
import { runBenchReality } from '../../../scripts/bench-reality.js';
import { runPackageSmokeScan } from '../../../packages/cli/src/commands/package-smoke.js';
import { journeysPassed, type JourneyResult } from '../../journey/harness.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const FIXTURES = resolve(ROOT, 'tests', 'fixtures', 'check-negative-controls');
const CONTROL_PATH = 'tests/unit/devops/blocking-check-negative-controls.test.ts';
const require = createRequire(import.meta.url);
const scratch: string[] = [];

function tempDir(label: string): string {
  const safeLabel = label.replace(/[^a-z0-9-]+/gi, '-');
  const dir = mkdtempSync(join(tmpdir(), `liteship-${safeLabel}-`));
  scratch.push(dir);
  return dir;
}

function pnpm(args: readonly string[], cwd = ROOT): Promise<SpawnCaptureResult> {
  return spawnArgvCapture('pnpm', args, { cwd, captureBytes: 256 * 1024, timeoutMs: scaledTimeout(60_000) });
}

function tsxScript(script: string, cwd: string): Promise<SpawnCaptureResult> {
  return spawnArgvCapture(process.execPath, [require.resolve('tsx/cli'), resolve(ROOT, script)], {
    cwd,
    captureBytes: 256 * 1024,
    timeoutMs: scaledTimeout(60_000),
  });
}

function expectRed(result: SpawnCaptureResult): void {
  expect(result.timedOut, `${result.stdout}\n${result.stderr}`).not.toBe(true);
  expect(result.exitCode, `${result.stdout}\n${result.stderr}`).not.toBe(0);
}

afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
});

const GROUPED_IDS = [
  'check/format',
  'check/lint-structural',
  'check/lint',
  'check/docs',
  'check/test',
  'check/test-redteam',
  'check/runtime-gate',
  'check/flex-verify',
  'check/devx',
  'check/test-vite',
  'check/test-astro',
  'check/test-cloudflare',
  'check/test-cloudflare-dev',
  'check/test-tailwind',
  'check/test-e2e',
  'check/test-e2e-stress',
  'check/test-e2e-stream-stress',
  'check/bench-trend',
  'check/bench-reality',
  'check/bench-alloc',
  'check/coverage',
  'check/package-smoke',
  'check/journey',
  'check/hermetic',
] as const;

describe('blocking check negative controls execute their authorities', () => {
  it('the grouped harness enrollment is exact (no blocker can inherit a decorative path)', () => {
    const actual = CHECK_REGISTRY.filter(
      (check) => check.authority === 'blocking' && check.negativeControl === CONTROL_PATH,
    )
      .map((check) => check.id)
      .sort();
    expect(actual).toEqual([...GROUPED_IDS].sort());
  });

  it('Prettier rejects a one-file formatting violation', async () => {
    expect(await prettierCheck('export const bad={value:1}\n', { parser: 'typescript' })).toBe(false);
  });

  it('ast-grep rejects a planted banned structural pattern', async () => {
    const root = tempDir('ast-grep-red');
    const planted = join(root, 'internal-mock.ts');
    writeFileSync(planted, "vi.mock('@liteship/core');\n");
    expectRed(await pnpm(['exec', 'ast-grep', 'scan', '--rule', resolve(FIXTURES, 'ast-grep-rule.yml'), planted]));
  });

  it('ESLint rejects a one-file semantic lint violation', async () => {
    const [result] = await new ESLint({ cwd: ROOT }).lintText('export const bad: any = 1;\n', {
      filePath: resolve(ROOT, 'packages/core/src/negative-control.ts'),
    });
    expect(result?.errorCount).toBeGreaterThan(0);
  });

  it('Vitest rejects a deliberately failing micro-suite (unit, aggregate, red-team, and integration runner family)', async () => {
    expectRed(await pnpm(['exec', 'vitest', 'run', '--config', resolve(FIXTURES, 'vitest.config.ts')]));
  });

  it('Playwright rejects a deliberately failing micro-suite (all e2e profiles)', async () => {
    expectRed(await pnpm(['exec', 'playwright', 'test', '--config', resolve(FIXTURES, 'playwright.config.ts')]));
  });

  it('docs:check rejects a checkout with no committed generated API tree', async () => {
    expectRed(await tsxScript('scripts/docs-check.ts', tempDir('docs-red')));
  });

  it('runtime gate rejects missing feedback evidence', () => {
    expect(() => runRuntimeGate(tempDir('runtime-red'))).toThrow(/runtime seams artifact|Runtime gate failed/);
  });

  it('flex authority rejects a root without its policy inputs', async () => {
    const root = tempDir('policy-red');
    expectRed(await tsxScript('scripts/flex-verify.ts', root));
  });

  it('DevX authority rejects a root without its policy inputs', async () => {
    const root = tempDir('devx-red');
    expectRed(await tsxScript('scripts/devx-check.ts', root));
  });

  it('bench trend rejects a deterministic sustained regression', async () => {
    const root = tempDir('trend-red');
    const history = join(root, 'history.jsonl');
    const values = [100, 100, 100, 200];
    writeFileSync(
      history,
      values
        .map((value, index) =>
          JSON.stringify({
            schemaVersion: 1,
            generatedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
            gauntletRunId: `run-${index}`,
            sourceFingerprint: `source-${index}`,
            environmentFingerprint: 'env',
            replicateSource: 'fresh',
            canaries: [{ name: 'planted-regression', medianMeanNs: value, medianP99Ns: value }],
            pairs: [],
          }),
        )
        .join('\n'),
    );
    const script = pathToFileURL(resolve(ROOT, 'scripts/bench-trend.ts')).href;
    const evaluation = `process.env.LITESHIP_BENCH_TREND_HISTORY_PATH=${JSON.stringify(history)}; await import(${JSON.stringify(script)});`;
    expectRed(await pnpm(['exec', 'tsx', '--eval', evaluation, '--strict']));
  });

  it('allocation authority refuses to measure without the required exposed GC', () => {
    expect(() => measureLiveBytesPerOp('red', 1, 1, 0, () => undefined)).toThrow('global.gc');
  });

  it('bench-reality authority rejects a root without its prerequisite evidence', async () => {
    await expect(runBenchReality(tempDir('bench-reality-red'))).rejects.toThrow();
  });

  it('coverage authority rejects a below-floor synthetic coverage artifact', async () => {
    const root = tempDir('coverage-red');
    const nodeDir = join(root, 'node');
    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(nodeDir, 'coverage-final.json'), '{}');
    const script = pathToFileURL(resolve(ROOT, 'scripts/merge-coverage.ts')).href;
    const evaluation = `process.env.LITESHIP_COVERAGE_ROOT=${JSON.stringify(root)}; await import(${JSON.stringify(script)});`;
    expectRed(await pnpm(['exec', 'tsx', '--eval', evaluation]));
  });

  it('package-smoke and hermetic authority fail on a root with no package artifacts', async () => {
    const result = await runPackageSmokeScan(tempDir('package-smoke-red'), { hermetic: true });
    expect(result.ok).toBe(false);
    expect(result.failedStep).not.toBeNull();
  });

  it('journey aggregation refuses failed, gated, and empty evidence', () => {
    const result = (status: JourneyResult['status']): JourneyResult => ({
      name: 'planted',
      status,
      detail: 'fixture',
      notes: [],
    });
    expect(journeysPassed([result('fail')])).toBe(false);
    expect(journeysPassed([result('gated')])).toBe(false);
    expect(journeysPassed([])).toBe(false);
    expect(journeysPassed([result('pass')])).toBe(true);
  });
});
