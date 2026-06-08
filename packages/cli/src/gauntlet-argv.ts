/**
 * Gauntlet argv parsing — rejects pasted garbage before any phase runs.
 *
 * @module
 */

/** Parsed gauntlet CLI argv. */
export interface GauntletArgv {
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly unexpected: readonly string[];
}

/** Allow only `--dry-run` and `--help` / `-h`; everything else is unexpected. */
export function parseGauntletArgv(argv: readonly string[]): GauntletArgv {
  let dryRun = false;
  let help = false;
  const unexpected: string[] = [];
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else {
      unexpected.push(arg);
    }
  }
  return { dryRun, help, unexpected };
}

/** JSON receipt line for unexpected argv (stderr). */
export function formatUnexpectedArgvReceipt(argv: readonly string[]): string {
  return (
    JSON.stringify({
      status: 'failed',
      command: 'gauntlet',
      error: 'unexpected_argv',
      argv,
      timestamp: new Date().toISOString(),
      hint: 'Gauntlet takes no positional bearings. Paste one command per line.',
    }) + '\n'
  );
}
