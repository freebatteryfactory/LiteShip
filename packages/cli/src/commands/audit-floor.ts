/**
 * audit-floor (CLI adapter, CUT A4) — thin projection over `@czap/command`'s
 * audit-floor handler (the warning-floor gate, migrated from
 * `scripts/audit-floor.ts`). The pass/fail decision lives in `@czap/command`;
 * the CLI is the ONLY adapter that wires the heavy `runAuditFloor` capability: it
 * imports `@czap/audit` (the three-pass engine), collects the `rule@file` warning
 * inventory, and diffs it against the pinned `AUDIT_WARNING_FLOOR` (re-exported
 * from `@czap/command`). `@czap/command` and `@czap/mcp-server` never see the
 * engine. Exit 0 ok, 1 gate failed (drift or any error).
 *
 * @module
 */
import { auditFloorCommand, type AuditFloorPayload, type AuditFloorSummary } from '@czap/command';
import { AUDIT_WARNING_FLOOR, diffInventories } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { runStructureAudit, runIntegrityAudit, runSurfaceAudit } from '@czap/audit';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `czap audit-floor`. */
export interface AuditFloorReceipt extends AuditFloorPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'audit-floor';
  readonly timestamp: WallClockTimestamp;
}

/**
 * Collect the sorted `rule@file` warning inventory from the artifact-independent
 * three-pass `@czap/audit` engine (the heavy half of the deleted
 * `scripts/lib/audit-floor.ts`). Exported so meta-tests can assert the live repo
 * inventory matches the pinned floor without re-running the whole gate.
 */
export function collectWarningInventory(): readonly string[] {
  const all = [...runStructureAudit().findings, ...runIntegrityAudit().findings, ...runSurfaceAudit().findings];
  return all
    .filter((f) => f.severity === 'warning')
    .map((f) => `${f.rule}@${f.location?.file ?? 'unknown'}`)
    .sort();
}

/**
 * The CLI-only `runAuditFloor` capability: collect the warning inventory + error
 * count from the three-pass engine and diff against the pinned floor. Ported
 * verbatim from the deleted `scripts/audit-floor.ts` + `scripts/lib/audit-floor.ts`.
 */
function runAuditFloorScan(): AuditFloorSummary {
  const structure = runStructureAudit();
  const integrity = runIntegrityAudit();
  const surface = runSurfaceAudit();
  const all = [...structure.findings, ...integrity.findings, ...surface.findings];
  const inventory = all
    .filter((f) => f.severity === 'warning')
    .map((f) => `${f.rule}@${f.location?.file ?? 'unknown'}`)
    .sort();
  const errorCount = all.filter((f) => f.severity === 'error').length;

  const delta = diffInventories(AUDIT_WARNING_FLOOR, inventory);
  const ok = delta.added.length === 0 && delta.removed.length === 0 && errorCount === 0;

  return {
    ok,
    expectedWarnings: AUDIT_WARNING_FLOOR.length,
    actualWarnings: inventory.length,
    errorCount,
    delta,
    inventory,
  };
}

/** Execute `czap audit-floor` — run the three-pass engine, diff the warning inventory; emit a verdict. */
export async function auditFloor(opts: { cwd?: string; pretty?: boolean } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context: CommandContext = { cwd, runAuditFloor: async () => runAuditFloorScan() };

  const result = await auditFloorCommand.handler({ name: 'audit-floor', args: {} }, context);
  const payload = result.payload as AuditFloorPayload;

  const receipt: AuditFloorReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'audit-floor',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human drift report on stderr (preserves the deleted script's diagnostic output).
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (!payload.ok && wantPretty) {
    process.stderr.write(
      `AUDIT-FLOOR GATE FAILED — warning inventory drift (expected ${payload.expectedWarnings}, ` +
        `actual ${payload.actualWarnings}; ${payload.errorCount} error(s)):\n`,
    );
    for (const key of payload.delta.added) process.stderr.write(`  + ${key}\n`);
    for (const key of payload.delta.removed) process.stderr.write(`  - ${key}\n`);
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.ok ? 0 : 1;
}
