/**
 * Audit floor inventory — artifact-independent three-pass engine floor.
 *
 * @module
 */

import { runStructureAudit, runIntegrityAudit, runSurfaceAudit } from '@czap/audit';
import type { AuditFinding } from '@czap/audit';

/** Sorted multiset of `rule@file` keys for pinned fallback-laundering warnings. */
export const AUDIT_WARNING_FLOOR: readonly string[] = [
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/doctor.ts',
  'fallback-laundering@packages/cli/src/commands/ship.ts',
  'fallback-laundering@packages/cli/src/commands/ship.ts',
  'fallback-laundering@packages/web/src/security/html-trust.ts',
].sort();

/** Collect warning inventory keys from the three engine passes. */
export function collectWarningInventory(): readonly string[] {
  const all: AuditFinding[] = [
    ...runStructureAudit().findings,
    ...runIntegrityAudit().findings,
    ...runSurfaceAudit().findings,
  ];
  return all
    .filter((f) => f.severity === 'warning')
    .map((f) => `${f.rule}@${f.location?.file ?? 'unknown'}`)
    .sort();
}

/** Diff two sorted multisets. */
export function diffInventories(
  expected: readonly string[],
  actual: readonly string[],
): { added: string[]; removed: string[] } {
  const exp = [...expected];
  const act = [...actual];
  const added: string[] = [];
  const removed: string[] = [];
  let ei = 0;
  let ai = 0;
  while (ei < exp.length && ai < act.length) {
    const e = exp[ei]!;
    const a = act[ai]!;
    if (e === a) {
      ei++;
      ai++;
    } else if (e < a) {
      removed.push(e);
      ei++;
    } else {
      added.push(a);
      ai++;
    }
  }
  while (ei < exp.length) removed.push(exp[ei++]!);
  while (ai < act.length) added.push(act[ai++]!);
  return { added, removed };
}
