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
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--skip-build') {
      skipBuild = true;
    } else if (arg === '--profile') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) {
        unexpected.push(arg);
      } else {
        profile = value;
      }
    } else if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length);
    } else if (arg === '--only') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) {
        unexpected.push(arg);
      } else {
        only = splitCsvList(value);
      }
    } else if (arg.startsWith('--only=')) {
      only = splitCsvList(arg.slice('--only='.length));
    } else if (arg === '--skip') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) {
        unexpected.push(arg);
      } else {
        skip = splitCsvList(value);
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
