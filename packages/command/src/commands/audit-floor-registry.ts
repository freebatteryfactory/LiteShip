/**
 * The audit-floor ledger (relocated from `scripts/lib/audit-floor.ts` when the
 * gate became the `audit-floor` command). PURE — no Node, no `@liteship/audit` — so
 * it lives in the pure registry entry. The HEAVY half (`collectWarningInventory`,
 * which runs the `@liteship/audit` three-pass engine) stays on the CLI adapter where
 * `runAuditFloor` is provisioned; only the floor data + the diff are pure and
 * belong here.
 *
 * `AUDIT_WARNING_FLOOR` is the sorted multiset of `rule@file` keys for pinned
 * advisory warnings; `diffInventories` reports drift against it. A new warning is
 * a regression against the floor (zero since the 0.1.5 advisory-cleanup wave).
 *
 * @module
 */

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

/** Diff two sorted multisets — `added` are in `actual` only, `removed` in `expected` only. */
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
