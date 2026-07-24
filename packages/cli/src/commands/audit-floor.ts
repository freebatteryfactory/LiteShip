/**
 * audit-floor (CLI adapter, CUT A4) — thin projection over `@liteship/command`'s
 * audit-floor handler (the warning-floor gate, migrated from
 * `scripts/audit-floor.ts`). The pass/fail decision lives in `@liteship/command`;
 * the CLI is the ONLY adapter that wires the heavy `runAuditFloor` capability: it
 * imports `@liteship/audit` (the three-pass engine), collects the `rule@file` warning
 * inventory, and diffs it against the pinned `AUDIT_WARNING_FLOOR` (re-exported
 * from `@liteship/command`). `@liteship/command` and `@liteship/mcp-server` never see the
 * engine. Exit 0 ok, 1 gate failed (drift or any error).
 *
 * @module
 */
import { auditFloorCommand, type AuditFloorPayload, type AuditFloorSummary } from '@liteship/command';
import { AUDIT_WARNING_FLOOR, diffInventories } from '@liteship/command';
import type { CommandContext } from '@liteship/command';
import { runStructureAudit, runIntegrityAudit, runSurfaceAudit } from '@liteship/audit';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `liteship audit-floor`. */
export interface AuditFloorReceipt extends AuditFloorPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'audit-floor';
  readonly timestamp: WallClockTimestamp;
}

/**
 * Injectable three-pass engine seam for the CLI-only warning-floor scan. Every
 * field defaults (via {@link defaultAuditFloorDeps}) to the real `@liteship/audit`
 * pass, so production `liteship audit-floor` runs the real repo-wide audit
 * unchanged; tests pass scripted passes to pin the adapter's warning
 * filter/sort/diff + receipt projection over synthetic findings without
 * re-running the heavy engine. Kept unexported so the api-surface is unchanged.
 */
interface AuditFloorDeps {
  readonly runStructureAudit: typeof runStructureAudit;
  readonly runIntegrityAudit: typeof runIntegrityAudit;
  readonly runSurfaceAudit: typeof runSurfaceAudit;
}

const defaultAuditFloorDeps: AuditFloorDeps = { runStructureAudit, runIntegrityAudit, runSurfaceAudit };

/**
 * Collect the sorted `rule@file` warning inventory from the artifact-independent
 * three-pass `@liteship/audit` engine (the heavy half of the deleted
 * `scripts/lib/audit-floor.ts`). Exported so meta-tests can assert the live repo
 * inventory matches the pinned floor without re-running the whole gate.
 */
export function collectWarningInventory(deps: AuditFloorDeps = defaultAuditFloorDeps): readonly string[] {
  const all = [
    ...deps.runStructureAudit().findings,
    ...deps.runIntegrityAudit().findings,
    ...deps.runSurfaceAudit().findings,
  ];
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
function runAuditFloorScan(deps: AuditFloorDeps = defaultAuditFloorDeps): AuditFloorSummary {
  const structure = deps.runStructureAudit();
  const integrity = deps.runIntegrityAudit();
  const surface = deps.runSurfaceAudit();
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

/** Execute `liteship audit-floor` — run the three-pass engine, diff the warning inventory; emit a verdict. */
export async function auditFloor(
  opts: { cwd?: string; pretty?: boolean } = {},
  deps: AuditFloorDeps = defaultAuditFloorDeps,
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context: CommandContext = { cwd, runAuditFloor: async () => runAuditFloorScan(deps) };

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
