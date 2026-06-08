/**
 * Audit floor gate — fails fast when the artifact-independent warning inventory drifts.
 *
 * @module
 */

import { runStructureAudit, runIntegrityAudit, runSurfaceAudit } from '@czap/audit';
import { isDirectExecution } from './audit/shared.js';
import {
  AUDIT_WARNING_FLOOR,
  collectWarningInventory,
  diffInventories,
} from './lib/audit-floor.js';

function main(): void {
  const structure = runStructureAudit();
  const integrity = runIntegrityAudit();
  const surface = runSurfaceAudit();
  const all = [...structure.findings, ...integrity.findings, ...surface.findings];
  const actual = all
    .filter((f) => f.severity === 'warning')
    .map((f) => `${f.rule}@${f.location?.file ?? 'unknown'}`)
    .sort();
  const errors = all.filter((f) => f.severity === 'error').length;

  const delta = diffInventories(AUDIT_WARNING_FLOOR, actual);
  const drift = delta.added.length > 0 || delta.removed.length > 0 || errors > 0;

  if (drift) {
    const receipt = {
      status: 'failed',
      command: 'audit-floor',
      timestamp: new Date().toISOString(),
      expectedWarnings: AUDIT_WARNING_FLOOR.length,
      actualWarnings: actual.length,
      errorCount: errors,
      delta,
      inventory: actual,
    };
    process.stderr.write(JSON.stringify(receipt) + '\n');
    process.exit(1);
  }

  const receipt = {
    status: 'ok',
    command: 'audit-floor',
    timestamp: new Date().toISOString(),
    expectedWarnings: AUDIT_WARNING_FLOOR.length,
    actualWarnings: actual.length,
    errorCount: 0,
    inventory: actual,
  };
  process.stdout.write(JSON.stringify(receipt) + '\n');
}

if (isDirectExecution(import.meta.url)) {
  main();
}

// Exported for tests that want collectWarningInventory without re-running in main
export { collectWarningInventory, AUDIT_WARNING_FLOOR, diffInventories };
