/**
 * Gauntlet argv parsing — rejects pasted garbage before any phase runs.
 *
 * @module
 */

import { wallClock } from '@czap/core';

/** Parsed gauntlet CLI argv. */
export interface GauntletArgv {
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly profile?: string;
  readonly only?: readonly string[];
  readonly skip?: readonly string[];
  readonly skipBuild: boolean;
  readonly unexpected: readonly string[];
}

function splitCsvList(value: string): readonly string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function takeFlagValue(argv: readonly string[], index: number, flag: string, unexpected: string[]): string | undefined {
  const value = argv[index + 1];
  if (value === undefined || value.length === 0 || value.startsWith('--')) {
    unexpected.push(flag);
    return undefined;
  }
  return value;
}

/**
 * Allow `--dry-run`, `--help`, and Tier 6 parallel selectors (`--profile`,
 * `--only`, `--skip`, `--skip-build`). Everything else is unexpected.
 */
export function parseGauntletArgv(argv: readonly string[]): GauntletArgv {
  let dryRun = false;
  let help = false;
  let profile: string | undefined;
  let only: readonly string[] | undefined;
  let skip: readonly string[] | undefined;
  let skipBuild = false;
  const unexpected: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--') {
      // pnpm/npm pass a bare `--` separator through to the script; ignore it.
      continue;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--skip-build') {
      skipBuild = true;
    } else if (arg === '--profile') {
      const value = takeFlagValue(argv, i, arg, unexpected);
      if (value !== undefined) {
        profile = value;
        i++;
      }
    } else if (arg.startsWith('--profile=')) {
      const value = arg.slice('--profile='.length);
      if (value.length === 0) unexpected.push(arg);
      else profile = value;
    } else if (arg === '--only') {
      const value = takeFlagValue(argv, i, arg, unexpected);
      if (value !== undefined) {
        only = splitCsvList(value);
        i++;
      }
    } else if (arg.startsWith('--only=')) {
      only = splitCsvList(arg.slice('--only='.length));
    } else if (arg === '--skip') {
      const value = takeFlagValue(argv, i, arg, unexpected);
      if (value !== undefined) {
        skip = splitCsvList(value);
        i++;
      }
    } else if (arg.startsWith('--skip=')) {
      skip = splitCsvList(arg.slice('--skip='.length));
    } else {
      unexpected.push(arg);
    }
  }

  return { dryRun, help, profile, only, skip, skipBuild, unexpected };
}

/** JSON receipt line for unexpected argv (stderr). */
export function formatUnexpectedArgvReceipt(argv: readonly string[]): string {
  return (
    JSON.stringify({
      status: 'failed',
      command: 'gauntlet',
      error: 'unexpected_argv',
      argv,
      timestamp: new Date(wallClock.now()).toISOString(),
      hint: 'Gauntlet takes no positional bearings. Paste one command per line.',
    }) + '\n'
  );
}
