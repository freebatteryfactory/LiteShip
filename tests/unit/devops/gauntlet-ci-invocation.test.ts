/**
 * CI gauntlet invocation audit — every `pnpm run gauntlet:full` line in ci.yml must
 * parse cleanly after pnpm forwards the `--` separator (the parallel-lane red CI
 * failure mode: unexpected_argv on bare `--`).
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGauntletArgv } from '../../../packages/cli/src/gauntlet-argv.js';

const CI_YML = resolve(import.meta.dirname, '../../../.github/workflows/ci.yml');

/** Simulate argv `tsx scripts/gauntlet.ts` receives from a ci.yml shell line. */
function argvFromCiLine(line: string): readonly string[] {
  const match = line.match(/pnpm run gauntlet:full(?:\s+(.*))?$/);
  expect(match, `not a gauntlet:full invocation: ${line}`).not.toBeNull();
  const tail = match![1]?.trim() ?? '';
  if (tail.length === 0) return [];
  return tail.split(/\s+/);
}

describe('ci.yml gauntlet:full invocations parse cleanly', () => {
  const gauntletLines = readFileSync(CI_YML, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('pnpm run gauntlet:full') && !line.startsWith('#'));

  it('finds at least one gauntlet:full invocation in ci.yml', () => {
    expect(gauntletLines.length).toBeGreaterThan(0);
  });

  it.each(gauntletLines)('%s', (line) => {
    const parsed = parseGauntletArgv(argvFromCiLine(line));
    expect(parsed.unexpected, `unexpected argv in ${line}`).toEqual([]);
  });
});
