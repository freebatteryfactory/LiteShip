import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', '..', '..', 'package.json'), 'utf8'),
) as {
  scripts: Record<string, string>;
};

describe('gauntlet ordering', () => {
  test('full gauntlet uses the orchestrator (the single canonical executor)', () => {
    expect(packageJson.scripts['gauntlet:full']).toBe('tsx scripts/gauntlet.ts');
    // CUT D8: gauntlet:serial (a hand-maintained, drifted && shell-chain copy that
    // nothing executed) was deleted — gauntlet:full is the one serial executor.
    expect(packageJson.scripts['gauntlet:serial']).toBeUndefined();
  });

  test('feedback verifier is available as a root script', () => {
    expect(packageJson.scripts['feedback:verify']).toBe('pnpm exec tsx scripts/feedback-verify.ts');
    expect(packageJson.scripts['runtime:gate']).toBe('pnpm exec tsx scripts/runtime-gate.ts');
  });

  test('flex:verify roll-up acceptance script is available as a root script', () => {
    expect(packageJson.scripts['flex:verify']).toBe('pnpm exec tsx scripts/flex-verify.ts');
  });

  test('flake, reality, and satellite scan lanes are available as root scripts', () => {
    expect(packageJson.scripts['test:flake']).toBe('pnpm exec tsx scripts/test-flake.ts');
    expect(packageJson.scripts['bench:reality']).toBe('pnpm run build && tsx scripts/bench-reality.ts');
    expect(packageJson.scripts['report:satellite-scan']).toBe('pnpm exec tsx scripts/report-satellite-scan.ts');
  });
});
