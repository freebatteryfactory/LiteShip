/**
 * check-invariants (CLI adapter) — thin projection over `@czap/command`'s
 * check-invariants command (the fast-lane invariant gate, migrated from
 * `scripts/check-invariants.ts`). The pass/fail decision lives in `@czap/command`;
 * this adapter provides the `runCheckInvariants` capability via the shared host
 * scan (`runCheckInvariantsScan` over `cwd`), emits the structured receipt, and
 * prints the violation work-list to stderr when the gate fails. Exit 0 ok, 1
 * gate failed.
 *
 * @module
 */
import { checkInvariantsCommand, type CheckInvariantsPayload } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { runCheckInvariantsScan } from '@czap/command/host';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `czap check-invariants`. */
export interface CheckInvariantsReceipt extends CheckInvariantsPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'check-invariants';
  readonly timestamp: WallClockTimestamp;
}

/** Execute `czap check-invariants` — scan source for banned patterns + line-ending policy; emit a verdict. */
export async function checkInvariants(opts: { cwd?: string; pretty?: boolean } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context: CommandContext = {
    cwd,
    runCheckInvariants: async () => runCheckInvariantsScan(cwd),
  };

  const result = await checkInvariantsCommand.handler({ name: 'check-invariants', args: {} }, context);
  const payload = result.payload as CheckInvariantsPayload;

  const receipt: CheckInvariantsReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'check-invariants',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human work-list on stderr (preserves the deleted script's diagnostic output).
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (!payload.ok && wantPretty) {
    for (const group of payload.groups) {
      process.stderr.write(`\n[INVARIANT VIOLATION] ${group.name}: ${group.message}\n`);
      for (const v of group.violations) process.stderr.write(`${v.file}:${v.line}: ${v.content}\n`);
    }
    if (payload.lineEndings.length > 0) {
      process.stderr.write(
        '\n[INVARIANT VIOLATION] LINE_ENDINGS: Text files must match .gitattributes eol policy.\n',
      );
      for (const v of payload.lineEndings) process.stderr.write(`${v}\n`);
    }
    process.stderr.write('\nInvariant check failed.\n');
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.ok ? 0 : 1;
}
