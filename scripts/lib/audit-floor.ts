/**
 * Audit floor inventory — artifact-independent three-pass engine floor.
 *
 * @module
 */

import { runStructureAudit, runIntegrityAudit, runSurfaceAudit } from '@czap/audit';
import type { AuditFinding } from '@czap/audit';

/**
 * Sorted multiset of `rule@file` keys for pinned advisory warnings.
 *
 * Empty since the 0.1.5 advisory-cleanup wave (ROADMAP epic #2): the doctor
 * fallback paths were reworked to surface read/parse failures as structured
 * check details, ship.ts's emit-then-return-1 exit-code contract is cleared
 * by the detector's error-binding rule, and the two deliberate fail-closed
 * defaults (html-trust CSP fallback, doctor --fix workspace guard) carry
 * allowlist reasons and classify as suppressed. Any new warning is a
 * regression against a zero floor.
 */
export const AUDIT_WARNING_FLOOR: readonly string[] = [];

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
