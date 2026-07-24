/**
 * plumb (CLI adapter) — thin projection over `@liteship/command`'s plumb command
 * (the plumb-completeness gate, migrated from `scripts/plumb-gate.ts`). The
 * pass/fail decision lives in `@liteship/command`; this adapter provides the
 * `runPlumb` capability via the shared host scan (`runPlumbScan` over `cwd`),
 * emits the structured receipt, and prints the work-list to stderr when the gate
 * fails. Exit 0 ok, 1 gate failed.
 *
 * @module
 */
import { plumbCommand, type PlumbPayload } from '@liteship/command';
import type { CommandContext } from '@liteship/command';
import { runPlumbScan } from '@liteship/command/host';
import { detectSkipsAST } from '@liteship/audit';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `liteship plumb`. */
export interface PlumbReceipt extends PlumbPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'plumb';
  readonly timestamp: WallClockTimestamp;
}

/**
 * Injectable scan seam for {@link plumb}. `runPlumbScan` DEFAULTS (via the
 * null-coalesce at its call site) to the real `@liteship/command/host` scan, so
 * production `liteship plumb` is byte-identical; tests pass a scripted scan to pin
 * the CLI adapter's receipt + work-list projection without walking a real
 * `tests/generated/` tree. Unexported + off the public barrel, so the api-surface
 * snapshot is unchanged.
 */
interface PlumbDeps {
  readonly runPlumbScan?: typeof runPlumbScan;
}

/** Execute `liteship plumb` — scan tests/generated/ + the published-package set; emit a verdict. */
export async function plumb(opts: { cwd?: string; pretty?: boolean } = {}, deps: PlumbDeps = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  // Inject the SOUND AST skip detector (the CLI host deps `@liteship/audit`) so a generated multi-line /
  // ASI / inner-describe skip the token scanner would miss is caught in the plumb scan too. The lean
  // `@liteship/command/host` keeps the dependency-free token `detectSkips` as its fallback.
  const scan = deps.runPlumbScan ?? runPlumbScan;
  const context: CommandContext = { cwd, runPlumb: async () => scan(cwd, detectSkipsAST) };

  const result = await plumbCommand.handler({ name: 'plumb', args: {} }, context);
  const payload = result.payload as PlumbPayload;

  const receipt: PlumbReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'plumb',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human work-list on stderr (preserves the deleted script's diagnostic output).
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (!payload.ok && wantPretty) {
    if (payload.skips.length > 0) {
      process.stderr.write(
        `PLUMB GATE FAILED — ${payload.skips.length} placeholder skip(s) in tests/generated/ ` +
          '(a skipped generated test is unwired work shipping green — WIRE the binding so the ' +
          'test is REAL, or remove a check that cannot apply to that capsule kind):\n',
      );
      for (const s of payload.skips) process.stderr.write(`  ${s.file}  ${s.kind}('${s.message}')\n`);
    }
    if (payload.unclassified.length > 0) {
      process.stderr.write(
        'PLUMB GATE FAILED — published packages missing a PACKAGE_PLUMB classification ' +
          '(runtime | tooling | deferred):\n',
      );
      for (const name of payload.unclassified) process.stderr.write(`  ? ${name}\n`);
    }
    if (payload.generatedCorpusMessage !== null) {
      process.stderr.write(`PLUMB GATE FAILED — ${payload.generatedCorpusMessage}\n`);
    }
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.ok ? 0 : 1;
}
