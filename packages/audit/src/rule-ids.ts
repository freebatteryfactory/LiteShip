/**
 * Audit rule identity — the runtime roster derived from the canonical
 * diagnostic registry, and the slug→code projection. Split from `types.ts`
 * so the type surface stays fully erasable (types-file-purity).
 *
 * @module
 */
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '@liteship/error';
import type { AuditRuleId } from './types.js';

/** Exact audit-rule projection derived from the one diagnostic registry owner. */
export const AUDIT_RULE_IDS = Object.freeze(
  Object.keys(DIAGNOSTIC_REGISTRY)
    .filter((code): code is Extract<DiagnosticCode, `audit/${string}`> => code.startsWith('audit/'))
    .map((code) => code.slice('audit/'.length) as AuditRuleId)
    .sort((left, right) => left.localeCompare(right)),
);

/** Project an audit rule slug onto its stable diagnostic identity. */
export function auditDiagnosticCode(rule: AuditRuleId): Extract<DiagnosticCode, `audit/${string}`> {
  return `audit/${rule}` as Extract<DiagnosticCode, `audit/${string}`>;
}
