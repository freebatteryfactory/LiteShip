/**
 * check (CLI adapter) — thin projection over `@czap/command`'s check command
 * (the PURE gauntlet engine fold). The pass/fail decision lives in
 * `@czap/command`; this adapter provisions the `runGauntlet` capability via the
 * shared host context (which runs `litelaunchGauntlet` in-process with a
 * WALL-CLOCK `now` for waiver expiry), emits the structured receipt, and prints
 * a concise findings summary to stderr. Exit 0 ok, 1 blocked.
 *
 * This is NOT `czap gauntlet` — that command spawns the 28-phase `gauntlet:full`
 * orchestrator and streams it to the terminal. `czap check` is the in-process,
 * fixture-qualified gate fold that returns a Finding[] work-list.
 *
 * @module
 */
import { checkCommand, type CheckPayload } from '@czap/command';
import { createNodeCommandContext } from '@czap/command/host';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `czap check`. */
export interface CheckReceipt extends CheckPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'check';
  readonly timestamp: WallClockTimestamp;
}

/** Execute `czap check` — run the pure gauntlet gate fold in-process; emit the verdict + Finding[]. */
export async function check(opts: { cwd?: string; pretty?: boolean } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context = createNodeCommandContext({ cwd });

  const result = await checkCommand.handler({ name: 'check', args: {} }, context);
  const payload = result.payload as CheckPayload;

  const receipt: CheckReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'check',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human findings summary on stderr — the work-list a developer reads.
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty && payload.findingCount > 0) {
    process.stderr.write(
      `${payload.blocked ? 'CHECK BLOCKED' : 'CHECK (advisory)'} — ${payload.findingCount} finding(s) from the gauntlet gate fold:\n`,
    );
    for (const f of payload.findings) {
      const where = f.location ? ` (${f.location.file}${f.location.line !== undefined ? `:${f.location.line}` : ''})` : '';
      process.stderr.write(`  [${f.severity}] ${f.ruleId}: ${f.title}${where}\n`);
    }
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.blocked ? 1 : 0;
}
