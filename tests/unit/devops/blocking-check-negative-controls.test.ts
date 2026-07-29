// PROVES: INV-CHECK-NEGATIVE-CONTROL
/**
 * Executed negative controls for blocking checks that are backed by external
 * tools or runner families rather than a self-proving LiteShip gate. Each
 * fixture is deliberately bad and the real authority must return red/non-zero.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { check as prettierCheck } from 'prettier';
import { ESLint } from 'eslint';
import { CHECK_REGISTRY } from '@liteship/command';
import { spawnArgvCapture, type SpawnCaptureResult } from '../../../scripts/lib/spawn.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const CONTROL_PATH = 'tests/unit/devops/blocking-check-negative-controls.test.ts';
const scratch: string[] = [];

function tempDir(label: string): string {
  const safeLabel = label.replace(/[^a-z0-9-]+/gi, '-');
  const dir = mkdtempSync(join(tmpdir(), `liteship-${safeLabel}-`));
  scratch.push(dir);
  return dir;
}

function pnpm(args: readonly string[]): Promise<SpawnCaptureResult> {
  return spawnArgvCapture('pnpm', args, {
    cwd: ROOT,
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

const GROUPED_IDS = ['check/format', 'check/lint', 'check/bench-trend', 'check/coverage'] as const;

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

  it('ESLint rejects a one-file semantic lint violation', async () => {
    const [result] = await new ESLint({ cwd: ROOT }).lintText('export const bad: any = 1;\n', {
      filePath: resolve(ROOT, 'packages/core/src/negative-control.ts'),
    });
    expect(result?.errorCount).toBeGreaterThan(0);
  });

  it('ESLint rejects dynamic code construction by the named rule (SECURITY.md discipline)', async () => {
    // Untrusted text must never become executable JavaScript at runtime. Each
    // fixture must red under the SPECIFIC rule so the control cannot pass off a
    // coincidental other error as the discipline being enforced.
    const cases: readonly [source: string, ruleId: string][] = [
      ['export const out = eval("1");\n', 'no-eval'],
      ['export const out = new Function("return 1");\n', 'no-new-func'],
      ['setTimeout("globalThis.pwned = 1", 10);\n', 'no-implied-eval'],
    ];
    for (const [source, ruleId] of cases) {
      const [result] = await new ESLint({ cwd: ROOT }).lintText(source, {
        filePath: resolve(ROOT, 'packages/core/src/negative-control.ts'),
      });
      const ruleIds = (result?.messages ?? []).map((message) => message.ruleId);
      expect(ruleIds, `${ruleId} must fire for: ${source.trim()}`).toContain(ruleId);
    }
  });

  it('the sanctioned script-execution harnesses stay exempt from no-new-func only', async () => {
    // The exceptions exist so tests can EXECUTE compiled script text they are
    // proving things about — they must not widen to eval.
    const harness = 'tests/support/compositor-script-harness.ts';
    const eslint = new ESLint({ cwd: ROOT });
    const [allowed] = await eslint.lintText('export const run = new Function("self", "return 1");\n', {
      filePath: resolve(ROOT, harness),
    });
    expect((allowed?.messages ?? []).map((message) => message.ruleId)).not.toContain('no-new-func');
    const [rejected] = await eslint.lintText('export const out = eval("1");\n', {
      filePath: resolve(ROOT, harness),
    });
    expect((rejected?.messages ?? []).map((message) => message.ruleId)).toContain('no-eval');
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

  it('coverage authority rejects a below-floor synthetic coverage artifact', async () => {
    const root = tempDir('coverage-red');
    const nodeDir = join(root, 'node');
    mkdirSync(nodeDir, { recursive: true });
    writeFileSync(join(nodeDir, 'coverage-final.json'), '{}');
    const script = pathToFileURL(resolve(ROOT, 'scripts/merge-coverage.ts')).href;
    const evaluation = `process.env.LITESHIP_COVERAGE_ROOT=${JSON.stringify(root)}; await import(${JSON.stringify(script)});`;
    expectRed(await pnpm(['exec', 'tsx', '--eval', evaluation]));
  });
});
