/**
 * Gauntlet argv parsing — Tier 6 parallel selectors.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { parseGauntletArgv } from '../../../packages/cli/src/gauntlet-argv.js';

describe('parseGauntletArgv', () => {
  it('accepts --profile and --skip-build', () => {
    const parsed = parseGauntletArgv(['--profile', 'ci-parallel-bench', '--skip-build']);
    expect(parsed.unexpected).toEqual([]);
    expect(parsed.profile).toBe('ci-parallel-bench');
    expect(parsed.skipBuild).toBe(true);
  });

  it('accepts --only and --skip as comma lists', () => {
    const parsed = parseGauntletArgv(['--only=bench,bench:gate', '--skip', 'build,flex:verify']);
    expect(parsed.only).toEqual(['bench', 'bench:gate']);
    expect(parsed.skip).toEqual(['build', 'flex:verify']);
  });

  it('rejects unknown flags', () => {
    const parsed = parseGauntletArgv(['--wat']);
    expect(parsed.unexpected).toEqual(['--wat']);
  });

  it('does not swallow a following flag when --profile has no value', () => {
    const parsed = parseGauntletArgv(['--profile', '--skip-build']);
    expect(parsed.unexpected).toEqual(['--profile']);
    expect(parsed.skipBuild).toBe(true);
  });
});
